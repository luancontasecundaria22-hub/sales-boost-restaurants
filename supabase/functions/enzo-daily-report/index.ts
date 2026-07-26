/**
 * enzo-daily-report
 * Enzo (CEO) aggregates the full day and writes an executive report.
 * Called by pg_cron at 22:00 UTC (19:00 BRT) or manually.
 *
 * Body: { company_id? }  — omit to run for all active companies
 *
 * Alem de salvar o relatorio em agent_messages (mostrado no dashboard), manda
 * um resumo pelo Telegram pra quem tiver conectado e nao tiver desligado essa
 * categoria em Configuracoes > Notificacoes (notification_prefs.daily_report).
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const admin = createClient(supabaseUrl, serviceKey)

    const body = await req.json().catch(() => ({}))
    const targetCompanyId: string | undefined = body.company_id

    // Interruptor geral do dono (Agents Control Center) — por cima do
    // interruptor de cada cliente em Configurações > Notificações.
    const { data: reportConfig } = await admin.from('report_config').select('daily_enabled').eq('id', true).maybeSingle()
    if (reportConfig && reportConfig.daily_enabled === false) {
      return json({ ok: true, skipped: true, reason: 'Relatório Diário está desligado no Agents Control Center.' })
    }

    // Fetch companies to report on
    let query = admin.from('companies').select('id, business_name, business_type, city, goal, telegram_chat_id, notification_prefs')
    if (targetCompanyId) {
      query = query.eq('id', targetCompanyId)
    } else {
      query = query.eq('active', true)
    }
    const { data: companies, error } = await query
    if (error) return json({ error: error.message }, 500)
    if (!companies || companies.length === 0) return json({ ok: true, processed: 0 })

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayISO = todayStart.toISOString()

    const results: { company_id: string; ok: boolean; error?: string }[] = []

    for (const company of companies) {
      try {
        await generateReport(company, todayISO, admin, supabaseUrl)
        results.push({ company_id: company.id, ok: true })
      } catch (err) {
        results.push({ company_id: company.id, ok: false, error: String(err) })
      }
    }

    return json({ ok: true, processed: results.length, results })
  } catch (err) {
    console.error('enzo-daily-report error:', err)
    return json({ error: String(err) }, 500)
  }
})

async function generateReport(company: Record<string, unknown>, todayISO: string, admin: ReturnType<typeof createClient>, supabaseUrl: string) {
  const companyId = company.id as string
  const name = company.business_name as string
  const type = (company.business_type as string | null) ?? 'negócio'
  const city = (company.city as string | null) ?? 'Brasil'
  const goal = (company.goal as string | null) ?? 'crescer'

  // ── Aggregate all activity from today ────────────────────────────────────────────────────────────────────────
  const [igPostsRes, reviewsRes, oppsRes, agentActionsRes] = await Promise.all([
    // Instagram posts published today
    admin.from('instagram_posts')
      .select('caption, posted_at, likes_count, status')
      .eq('company_id', companyId)
      .gte('posted_at', todayISO),

    // New reviews received today
    admin.from('reviews')
      .select('rating, text, sentiment, source')
      .eq('company_id', companyId)
      .gte('review_date', todayISO),

    // Open opportunities
    admin.from('opportunities')
      .select('type, title, value_estimate, status')
      .eq('company_id', companyId)
      .eq('status', 'open'),

    // Agent actions from today
    admin.from('agent_messages')
      .select('content, agent_role, created_at')
      .eq('company_id', companyId)
      .eq('role', 'assistant')
      .gte('created_at', todayISO)
      .order('created_at', { ascending: true }),
  ])

  const igPosts = igPostsRes.data ?? []
  const reviews = reviewsRes.data ?? []
  const opportunities = oppsRes.data ?? []
  const agentActions = agentActionsRes.data ?? []

  // ── Build briefing for Claude ────────────────────────────────────────────────────────────────────────────
  const today = new Date()
  const dateStr = today.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const igSummary = igPosts.length > 0
    ? igPosts.map(p => `  • "${String(p.caption ?? '').slice(0, 60)}..." (${p.likes_count ?? 0} curtidas)`).join('\n')
    : '  Nenhum post publicado hoje.'

  const reviewSummary = reviews.length > 0
    ? reviews.map(r => `  • [${r.rating}★ · ${r.sentiment ?? '?'} · ${r.source}] "${String(r.text ?? '').slice(0, 80)}"`).join('\n')
    : '  Nenhuma avaliação recebida hoje.'

  const oppSummary = opportunities.length > 0
    ? opportunities.map(o => `  • ${o.type}: ${o.title} (valor estimado: R$${o.value_estimate ?? '?'})`).join('\n')
    : '  Nenhuma oportunidade em aberto.'

  const agentSummary = agentActions.length > 0
    ? agentActions.map(a => `  [${a.agent_role ?? 'agente'}] ${String(a.content ?? '').slice(0, 100)}`).join('\n')
    : '  Nenhuma ação dos agentes hoje.'

  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')!

  const systemPrompt = `Você é o Agente Secretário do ${name} (${type} em ${city}).
Seu objetivo: ${goal}.

Você recebe um briefing diário com tudo que aconteceu no negócio e escreve um relatório executivo conciso e orientado a ação para o dono do negócio.`

  const userPrompt = `# Relatório do dia: ${dateStr}

## Posts no Instagram publicados hoje:
${igSummary}

## Avaliações recebidas hoje:
${reviewSummary}

## Oportunidades em aberto:
${oppSummary}

## O que os agentes fizeram hoje:
${agentSummary}

# Sua tarefa:
Escreva um relatório executivo CONCISO (máximo 5 parágrafos curtos) para o dono do ${name}.
Tom: direto, positivo, orientado a resultados.
Inclua:
1. Resumo do dia (1 frase)
2. O que foi bem
3. O que precisa de atenção
4. Uma recomendação de ação para amanhã
5. Assinatura: "— Agente Secretário 🤖"`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  })

  if (!res.ok) throw new Error(`Claude error: ${await res.text()}`)
  const data = await res.json()
  const report = data.content?.[0]?.text ?? ''

  // ── Save report in agent_messages ────────────────────────────────────────────────────────────────────────────────
  await admin.from('agent_messages').insert({
    company_id: companyId,
    role: 'assistant',
    agent_role: 'ceo',
    content: `[Agente Secretário • Relatório Diário • ${dateStr}]\n\n${report}`,
  })

  // ── Manda o resumo pelo Telegram ────────────────────────────────────────
  // So quando o dono conectou o Telegram e nao desligou essa categoria em
  // Configuracoes > Notificacoes. Reusa log-bot-event — a mesma funcao que
  // grava a aba Atividades e envia de verdade, ja usada por hermes-proxy.
  const chatId = company.telegram_chat_id as number | null
  const prefs = (company.notification_prefs as Record<string, boolean> | null) ?? {}
  if (chatId && prefs.daily_report !== false) {
    const secret = Deno.env.get('BOT_WEBHOOK_SECRET')
    fetch(`${supabaseUrl}/functions/v1/log-bot-event`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        secret: secret ?? '',
        bot_name: 'marketing',
        event_type: 'DAILY_REPORT',
        company_id: companyId,
        telegram_chat_id: chatId,
        message: `📋 Relatório Diário • ${dateStr}\n\n${report}`,
      }),
    }).catch(() => { /* non-fatal — relatorio ja foi salvo, o envio ao Telegram e so um bonus */ })
  }
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
}
