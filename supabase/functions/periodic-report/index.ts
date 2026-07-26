/**
 * periodic-report
 * Relatório executivo semanal/mensal/anual — mesma ideia do enzo-daily-report
 * (agrega a atividade real do período e escreve um resumo com a Claude),
 * só que com a janela de tempo maior e frequência configurável.
 *
 * Body: { cron_secret, period: 'weekly' | 'monthly' | 'annual', company_id? }
 *
 * Dois portões, sempre os dois: (1) o interruptor geral da plataforma
 * (report_config.<period>_enabled, o dono liga no Agents Control Center) e
 * (2) o interruptor da própria empresa (companies.notification_prefs.
 * <period>_report, em Configurações > Notificações). Se qualquer um dos
 * dois estiver desligado, essa empresa não recebe nada naquele ciclo.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type Period = 'weekly' | 'monthly' | 'annual'

const PERIOD_DAYS: Record<Period, number> = { weekly: 7, monthly: 30, annual: 365 }
const PERIOD_LABEL: Record<Period, string> = { weekly: 'Semanal', monthly: 'Mensal', annual: 'Anual' }
const PREF_KEY: Record<Period, string> = { weekly: 'weekly_report', monthly: 'monthly_report', annual: 'annual_report' }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const cronSecretEnv = Deno.env.get('CRON_SECRET')
    const admin = createClient(supabaseUrl, serviceKey)

    const body = await req.json().catch(() => ({})) as { cron_secret?: string; period?: Period; company_id?: string }
    if (!cronSecretEnv || body.cron_secret !== cronSecretEnv) return json({ error: 'Unauthorized' }, 401)

    const period = body.period
    if (!period || !PERIOD_DAYS[period]) return json({ error: 'period deve ser weekly, monthly ou annual' }, 400)

    const { data: reportConfig } = await admin.from('report_config').select('*').eq('id', true).maybeSingle()
    const enabledKey = `${period}_enabled` as 'weekly_enabled' | 'monthly_enabled' | 'annual_enabled'
    if (reportConfig && reportConfig[enabledKey] === false) {
      return json({ ok: true, skipped: true, reason: `Relatório ${PERIOD_LABEL[period]} está desligado no Agents Control Center.` })
    }

    let query = admin.from('companies').select('id, business_name, business_type, city, goal, telegram_chat_id, notification_prefs')
    if (body.company_id) query = query.eq('id', body.company_id)
    else query = query.eq('active', true)
    const { data: companies } = await query
    if (!companies || companies.length === 0) return json({ ok: true, processed: 0 })

    const windowStart = new Date(Date.now() - PERIOD_DAYS[period] * 24 * 60 * 60 * 1000).toISOString()
    const results: { company_id: string; ok: boolean; skipped?: boolean; error?: string }[] = []

    for (const company of companies) {
      try {
        const prefs = (company.notification_prefs as Record<string, boolean> | null) ?? {}
        if (prefs[PREF_KEY[period]] === false) {
          results.push({ company_id: company.id, ok: true, skipped: true })
          continue
        }
        await generateReport(company, period, windowStart, admin, supabaseUrl)
        results.push({ company_id: company.id, ok: true })
      } catch (err) {
        results.push({ company_id: company.id, ok: false, error: String(err) })
      }
    }

    return json({ ok: true, period, processed: results.length, results })
  } catch (err) {
    console.error('periodic-report error:', err)
    return json({ error: String(err) }, 500)
  }
})

async function generateReport(company: Record<string, unknown>, period: Period, windowStart: string, admin: ReturnType<typeof createClient>, supabaseUrl: string) {
  const companyId = company.id as string
  const name = company.business_name as string
  const type = (company.business_type as string | null) ?? 'negócio'
  const city = (company.city as string | null) ?? 'Brasil'
  const goal = (company.goal as string | null) ?? 'crescer'

  const [postsRes, reviewsRes, oppsRes, agentActionsRes] = await Promise.all([
    admin.from('posts').select('status, platform, created_at').eq('company_id', companyId).gte('created_at', windowStart),
    admin.from('reviews').select('rating, sentiment, source, review_date').eq('company_id', companyId).gte('review_date', windowStart),
    admin.from('opportunities').select('type, title, value_estimate, status').eq('company_id', companyId).eq('status', 'open'),
    admin.from('agent_messages').select('content, agent_role, created_at').eq('company_id', companyId).eq('role', 'assistant').gte('created_at', windowStart),
  ])

  const posts = postsRes.data ?? []
  const reviews = reviewsRes.data ?? []
  const opportunities = oppsRes.data ?? []
  const agentActions = agentActionsRes.data ?? []

  const postsPublished = posts.filter(p => p.status === 'publicado').length
  const avgRating = reviews.length ? (reviews.reduce((s, r) => s + (r.rating ?? 0), 0) / reviews.length).toFixed(1) : null
  const negativeReviews = reviews.filter(r => (r.rating ?? 5) <= 2).length

  const periodLabelPt: Record<Period, string> = { weekly: 'da última semana', monthly: 'do último mês', annual: 'do último ano' }
  const today = new Date()
  const dateStr = today.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })

  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')!
  const systemPrompt = `Você é o Agente Secretário do ${name} (${type} em ${city}). Objetivo do negócio: ${goal}.
Você escreve relatórios executivos periódicos, olhando pro panorama do período (não o dia a dia), pro dono do negócio.`

  const userPrompt = `# Relatório ${PERIOD_LABEL[period]} — ${dateStr}

Dados reais ${periodLabelPt[period]}:
- Posts publicados: ${postsPublished} (de ${posts.length} criados no total)
- Avaliações recebidas: ${reviews.length}${avgRating ? ` (nota média ${avgRating})` : ''}, sendo ${negativeReviews} negativas
- Oportunidades em aberto agora: ${opportunities.length}
- Ações dos agentes registradas: ${agentActions.length}

# Sua tarefa:
Escreva um relatório executivo ${PERIOD_LABEL[period].toLowerCase()} CONCISO (máximo 6 parágrafos curtos), só com base nos dados reais acima — nunca invente número que não está aqui. Tom: direto, orientado a resultado.
Inclua:
1. Resumo do período (1-2 frases)
2. Principais números e o que eles significam
3. O que precisa de atenção
4. Uma recomendação concreta pro próximo período
5. Assinatura: "— Agente Secretário 🤖"`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 900, system: systemPrompt, messages: [{ role: 'user', content: userPrompt }] }),
  })
  if (!res.ok) throw new Error(`Claude error: ${await res.text()}`)
  const data = await res.json()
  const report = data.content?.[0]?.text ?? ''

  await admin.from('agent_messages').insert({
    company_id: companyId, role: 'assistant', agent_role: 'ceo',
    content: `[Agente Secretário • Relatório ${PERIOD_LABEL[period]} • ${dateStr}]\n\n${report}`,
  })

  const chatId = company.telegram_chat_id as number | null
  if (chatId) {
    const secret = Deno.env.get('BOT_WEBHOOK_SECRET')
    fetch(`${supabaseUrl}/functions/v1/log-bot-event`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        secret: secret ?? '', bot_name: 'marketing', event_type: `${period.toUpperCase()}_REPORT`, company_id: companyId, telegram_chat_id: chatId,
        message: `📋 Relatório ${PERIOD_LABEL[period]} • ${dateStr}\n\n${report}`,
      }),
    }).catch(() => { /* non-fatal */ })
  }
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
}
