import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ApifyPost {
  timestamp?: string
}

interface ApifyProfile {
  followersCount?: number
  postsCount?: number
  latestPosts?: ApifyPost[]
}

async function notifyMarketing(chatId: number | null | undefined, companyId: string, event: string, data?: Record<string, unknown>) {
  // Sempre grava na aba Atividades, mesmo sem Telegram conectado — o envio
  // ao Telegram (dentro de log-bot-event) é só um bônus quando existe chatId.
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const secret = Deno.env.get('BOT_WEBHOOK_SECRET')
  if (!supabaseUrl) return
  fetch(`${supabaseUrl}/functions/v1/log-bot-event`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ secret: secret ?? '', bot_name: 'marketing', event_type: event, company_id: companyId, telegram_chat_id: chatId ?? null, data }),
  }).catch(() => {})
}

async function runApifyActor(token: string, actorId: string, input: Record<string, unknown>, timeoutSecs = 60): Promise<unknown[]> {
  const url = `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${token}&timeout=${timeoutSecs}&memory=256`
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) })
  if (!res.ok) throw new Error(`Apify error (${actorId}): ${await res.text()}`)
  return res.json()
}

function postingFrequencyDays(posts: ApifyPost[]): number | null {
  const dates = posts.map(p => p.timestamp ? new Date(p.timestamp).getTime() : null).filter((t): t is number => t !== null).sort((a, b) => b - a)
  if (dates.length < 2) return null
  const spanDays = (dates[0] - dates[dates.length - 1]) / (1000 * 60 * 60 * 24)
  return Math.round((spanDays / (dates.length - 1)) * 10) / 10
}

async function monitorCompanyCompetitors(
  admin: ReturnType<typeof createClient>,
  apifyToken: string,
  companyId: string,
): Promise<{ monitored: number; total: number; results: Array<{ name: string; ok: boolean; error?: string }> }> {
  const { data: competitors } = await admin
    .from('competitors')
    .select('id, name, instagram_url')
    .eq('company_id', companyId)
    .not('instagram_url', 'is', null)
    .limit(10) // bound cost — each one is a real Apify run

  if (!competitors || competitors.length === 0) return { monitored: 0, total: 0, results: [] }

  const results: Array<{ name: string; ok: boolean; error?: string }> = []

  for (const comp of competitors) {
    try {
      const igUrl = (comp.instagram_url as string).replace(/\/$/, '')
      const items = await runApifyActor(apifyToken, 'apify~instagram-scraper', {
        directUrls: [igUrl], resultsType: 'details', resultsLimit: 12,
      }, 90) as ApifyProfile[]

      const profile = items[0]
      if (!profile) { results.push({ name: comp.name, ok: false, error: 'perfil não encontrado' }); continue }

      await admin.from('competitor_snapshots').insert({
        competitor_id: comp.id,
        instagram_followers: profile.followersCount ?? null,
        instagram_posts_count: profile.postsCount ?? null,
        instagram_posting_freq_days: postingFrequencyDays(profile.latestPosts ?? []),
      })
      results.push({ name: comp.name, ok: true })
    } catch (e) {
      results.push({ name: comp.name, ok: false, error: String(e) })
    }
  }

  return { monitored: results.filter(r => r.ok).length, total: competitors.length, results }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? supabaseAnonKey
    const apifyToken = Deno.env.get('APIFY_TOKEN')
    const cronSecretEnv = Deno.env.get('CRON_SECRET')
    if (!apifyToken) return json({ error: 'APIFY_TOKEN não configurado.' }, 503)

    const admin = createClient(supabaseUrl, serviceKey)

    const rawBody = req.method === 'POST' ? await req.json().catch(() => ({})) as Record<string, unknown> : {}
    const isCron = cronSecretEnv && rawBody.cron_secret === cronSecretEnv

    // Modo cron: só reprocessa concorrentes cujas redes sociais não foram
    // checadas nos últimos 7 dias — cada checagem é uma chamada real ao Apify,
    // então não faz sentido repetir isso a cada 30 minutos.
    if (isCron) {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const { data: companies } = await admin
        .from('companies')
        .select('id, telegram_chat_id, notification_prefs')
        .eq('active', true)

      let scanned = 0, skipped = 0
      for (const company of companies ?? []) {
        try {
          const { data: recentSnap } = await admin
            .from('competitor_snapshots')
            .select('collected_at, competitors!inner(company_id)')
            .eq('competitors.company_id', company.id)
            .not('instagram_followers', 'is', null)
            .order('collected_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          if (recentSnap?.collected_at && recentSnap.collected_at > sevenDaysAgo) { skipped++; continue }

          const r = await monitorCompanyCompetitors(admin, apifyToken, company.id)
          if (r.monitored > 0) {
            scanned++
            const prefs = (company.notification_prefs as Record<string, boolean> | null) ?? {}
            if (prefs.agent_actions !== false) {
              notifyMarketing(company.telegram_chat_id as number | null, company.id, 'AGENT_ACTION', {
                action: 'competitor_social_checked',
                count: r.monitored,
                reason: 'Verificação periódica de redes sociais dos concorrentes mapeados (a cada 7 dias)',
              })
            }
          }
        } catch (e) {
          console.error(`monitor-competitor-social cron: company ${company.id} error:`, e)
        }
      }
      return json({ ok: true, cron: true, scanned, skipped })
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Unauthorized' }, 401)

    const userClient = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } })
    const { data: { user }, error: userErr } = await userClient.auth.getUser()
    if (userErr || !user) return json({ error: 'Unauthorized' }, 401)

    const { data: company } = await admin.from('companies').select('id').eq('user_id', user.id).maybeSingle()
    if (!company) return json({ error: 'Empresa não encontrada.' }, 404)

    const result = await monitorCompanyCompetitors(admin, apifyToken, company.id)
    if (result.total === 0) {
      return json({ monitored: 0, message: 'Nenhum concorrente com Instagram identificado ainda. Rode "Mapear concorrentes" primeiro.' })
    }

    return json({ monitored: result.monitored, total: result.total, results: result.results })
  } catch (err) {
    return json({ error: String(err) }, 500)
  }
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}
