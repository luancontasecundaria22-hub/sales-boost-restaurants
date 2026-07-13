import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type Company = {
  id: string
  business_name: string
  social_data: Record<string, unknown> | null
  telegram_chat_id?: number | null
}

async function notifyMarketing(chatId: number | null | undefined, event: string, data?: Record<string, unknown>) {
  if (!chatId) return
  const url = Deno.env.get('MARKETING_BOT_NOTIFY_URL')
  const secret = Deno.env.get('TELEGRAM_WEBHOOK_SECRET')
  if (!url) return
  fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-webhook-secret': secret ?? '' },
    body: JSON.stringify({ event, chat_id: chatId, data }),
  }).catch(() => {})
}

async function detectForCompany(company: Company, admin: ReturnType<typeof createClient>) {
  const now = new Date()
  const day60ago = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString()
  const day14ago = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString()
  const day3ago  = new Date(now.getTime() -  3 * 24 * 60 * 60 * 1000).toISOString()
  const day7ago  = new Date(now.getTime() -  7 * 24 * 60 * 60 * 1000).toISOString()

  const toUpsert: Record<string, unknown>[] = []

  // 1. Reviews negativos sem resposta (rating ≤ 2, últimos 60 dias)
  const { data: negativeReviews } = await admin
    .from('reviews')
    .select('id, author, rating, text, review_date')
    .eq('company_id', company.id)
    .lte('rating', 2)
    .is('owner_reply', null)
    .gte('review_date', day60ago.slice(0, 10))
    .order('review_date', { ascending: false })

  for (const r of negativeReviews ?? []) {
    toUpsert.push({
      company_id: company.id,
      type: 'negative_review',
      title: `Review ${r.rating}⭐ de ${r.author} sem resposta`,
      description: r.text ? `"${r.text.slice(0, 120)}..."` : 'Review negativa sem comentário.',
      estimated_impact: 'Responder reviews negativos pode aumentar a nota em até 0.3 pontos.',
      estimated_value: 150,
      status: 'open',
      ref_id: r.id,
      ref_type: 'review',
    })
  }

  // 2. Reviews sem resposta há mais de 14 dias (qualquer nota)
  const { data: unansweredReviews } = await admin
    .from('reviews')
    .select('id, author, rating, text, review_date')
    .eq('company_id', company.id)
    .is('owner_reply', null)
    .gt('rating', 2)
    .lte('review_date', day14ago.slice(0, 10))
    .order('review_date', { ascending: false })
    .limit(10)

  for (const r of unansweredReviews ?? []) {
    toUpsert.push({
      company_id: company.id,
      type: 'unanswered_review',
      title: `Review de ${r.author} sem resposta há +14 dias`,
      description: r.text ? `"${r.text.slice(0, 120)}..."` : 'Review sem comentário.',
      estimated_impact: 'Responder todas as avaliações aumenta confiança e melhora o ranking no Google.',
      estimated_value: 80,
      status: 'open',
      ref_id: r.id,
      ref_type: 'review',
    })
  }

  // 3. Rascunhos de posts parados há mais de 3 dias
  const { data: staleDrafts } = await admin
    .from('posts')
    .select('id, content, platform, created_at')
    .eq('company_id', company.id)
    .eq('status', 'rascunho')
    .lte('created_at', day3ago)
    .order('created_at', { ascending: false })

  if ((staleDrafts ?? []).length > 0) {
    toUpsert.push({
      company_id: company.id,
      type: 'stale_draft',
      title: `${staleDrafts!.length} rascunho(s) aguardando aprovação há +3 dias`,
      description: 'Posts prontos que ainda não foram aprovados ou publicados.',
      estimated_impact: 'Publicar conteúdo regularmente aumenta o alcance orgânico.',
      estimated_value: 50 * staleDrafts!.length,
      status: 'open',
      ref_id: null,
      ref_type: 'post',
    })
  }

  // 4. Sem posts publicados nos últimos 7 dias
  // Check updated_at (when marked as published), not created_at (when draft was created)
  // Also check instagram_posts table for auto-published content
  const [{ data: recentPublished }, { data: recentIgPosts }] = await Promise.all([
    admin.from('posts')
      .select('id')
      .eq('company_id', company.id)
      .eq('status', 'publicado')
      .gte('updated_at', day7ago)
      .limit(1),
    admin.from('instagram_posts')
      .select('id')
      .eq('company_id', company.id)
      .gte('posted_at', day7ago)
      .limit(1),
  ])

  const hasRecentContent = (recentPublished ?? []).length > 0 || (recentIgPosts ?? []).length > 0

  if (hasRecentContent) {
    // Posts published recently — resolve the no_content opportunity if it exists
    await admin.from('opportunities')
      .update({ status: 'resolved' })
      .eq('company_id', company.id)
      .eq('type', 'no_content')
      .eq('status', 'open')
  } else {
    toUpsert.push({
      company_id: company.id,
      type: 'no_content',
      title: 'Nenhum post publicado nos últimos 7 dias',
      description: 'A ausência de conteúdo reduz o alcance e o engajamento do seu perfil.',
      estimated_impact: 'Contas que postam 3–5x/semana crescem 2x mais rápido.',
      estimated_value: 300,
      status: 'open',
      ref_id: null,
      ref_type: null,
    })
  }

  // 5. Baixo engajamento no Instagram
  const ig = (company.social_data as Record<string, unknown> | null)?.instagram as Record<string, unknown> | undefined
  if (ig && typeof ig.engagement_rate === 'number' && ig.engagement_rate < 1) {
    toUpsert.push({
      company_id: company.id,
      type: 'low_engagement',
      title: `Engajamento no Instagram baixo: ${ig.engagement_rate}%`,
      description: `Média do setor é 1–3%. Seus posts têm em média ${ig.avg_likes ?? 0} curtidas e ${ig.avg_comments ?? 0} comentários.`,
      estimated_impact: 'Melhorar engajamento aumenta o alcance orgânico sem gastar em anúncios.',
      estimated_value: 200,
      status: 'open',
      ref_id: null,
      ref_type: null,
    })
  }

  if (toUpsert.length > 0) {
    await admin.from('opportunities').upsert(toUpsert, {
      onConflict: 'company_id,type,ref_id',
      ignoreDuplicates: true,
    })
  }

  return toUpsert.length
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? supabaseAnonKey
    const cronSecretEnv = Deno.env.get('CRON_SECRET')

    const body = await req.json().catch(() => ({})) as Record<string, unknown>
    const isCron = cronSecretEnv && body.cron_secret === cronSecretEnv

    const admin = createClient(supabaseUrl, serviceKey)

    // Cron mode: run for all active companies without user auth
    if (isCron) {
      const { data: companies } = await admin
        .from('companies')
        .select('id, business_name, social_data, telegram_chat_id')
        .eq('active', true)

      let total = 0
      for (const company of companies ?? []) {
        try {
          const count = await detectForCompany(company as Company, admin)
          total += count

          // Sempre manda um resumo com sugestões, mesmo sem nada novo — nunca fica em silêncio.
          const [{ count: openCount }, { data: topOpps }] = await Promise.all([
            admin.from('opportunities').select('id', { count: 'exact', head: true }).eq('company_id', company.id).eq('status', 'open'),
            admin.from('opportunities').select('title').eq('company_id', company.id).eq('status', 'open').order('created_at', { ascending: false }).limit(5),
          ])
          notifyMarketing((company as Company).telegram_chat_id, 'CYCLE_SUMMARY', {
            newCount: count,
            openCount: openCount ?? 0,
            suggestions: (topOpps ?? []).map(o => o.title),
          })
        } catch (e) {
          console.error(`detect-opportunities: company ${company.id} error:`, e)
        }
      }
      return json({ ok: true, cron: true, companies: companies?.length ?? 0, opportunities_found: total })
    }

    // Normal user mode: validate auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Unauthorized' }, 401)

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: userErr } = await userClient.auth.getUser()
    if (userErr || !user) return json({ error: 'Unauthorized' }, 401)

    const { data: company } = await admin
      .from('companies')
      .select('id, business_name, social_data, telegram_chat_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!company) return json({ error: 'Empresa não encontrada.' }, 404)

    const newCount = await detectForCompany(company as Company, admin)
    if (newCount > 0) notifyMarketing((company as Company).telegram_chat_id, 'OPPORTUNITY_DETECTED', { description: `${newCount} nova(s) oportunidade(s) detectada(s)` })

    // Return all open opportunities sorted by priority
    const { data: allOpen } = await admin
      .from('opportunities')
      .select('*')
      .eq('company_id', company.id)
      .eq('status', 'open')
      .order('created_at', { ascending: false })

    const priorityOrder = ['negative_review', 'unanswered_review', 'stale_draft', 'low_engagement', 'no_content']
    const sorted = (allOpen ?? []).sort((a: { type: string }, b: { type: string }) =>
      priorityOrder.indexOf(a.type) - priorityOrder.indexOf(b.type)
    )

    if (sorted.length > 0) {
      notifyMarketing((company as Company).telegram_chat_id, 'OPPORTUNITY_DETECTED', {
        description: `${sorted.length} oportunidades detectadas`,
        opportunities: sorted.map(o => ({ type: o.type, title: o.title })),
      })

      const negativeTypes = new Set(['negative_review', 'unanswered_review'])
      for (const o of sorted) {
        if (negativeTypes.has(o.type)) {
          notifyMarketing((company as Company).telegram_chat_id, 'NEGATIVE_REVIEW', {
            rating: o.ref_type === 'review' ? 'nova' : undefined,
            source: o.ref_type,
            excerpt: o.title,
          })
        }
      }
    }

    return json({ ok: true, opportunities: sorted, total: sorted.length })
  } catch (err) {
    return json({ error: String(err) }, 500)
  }
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
