import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ApifyXPost {
  id?: string
  url?: string
  text?: string
  createdAt?: string
  author?: { userName?: string; name?: string }
}

function fallbackId(...parts: (string | number | undefined | null)[]): string {
  return parts.filter(p => p !== undefined && p !== null && p !== '').join('|').slice(0, 180)
}

async function runApifyActor(token: string, actorId: string, input: Record<string, unknown>, timeoutSecs = 90): Promise<unknown[]> {
  const url = `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${token}&timeout=${timeoutSecs}&memory=256`
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) })
  if (!res.ok) throw new Error(`Apify error (${actorId}): ${await res.text()}`)
  return res.json()
}

async function syncMentions(
  admin: ReturnType<typeof createClient>,
  apifyToken: string,
  companyId: string,
  businessName: string,
): Promise<number> {
  let total = 0

  try {
    const items = await runApifyActor(
      apifyToken, 'apidojo~tweet-scraper',
      { searchTerms: [businessName], maxItems: 20, sort: 'Latest' },
    ) as ApifyXPost[]

    const rows = items.map(t => ({
      company_id: companyId,
      source: 'x',
      external_id: String(t.id ?? fallbackId(t.author?.userName, t.createdAt, t.text?.slice(0, 40))),
      author: t.author?.name ?? t.author?.userName ?? 'Anônimo',
      rating: null,
      text: t.text ?? null,
      review_date: t.createdAt ? new Date(t.createdAt).toISOString().slice(0, 10) : null,
      raw_data: { url: t.url ?? null, username: t.author?.userName ?? null },
    }))

    if (rows.length > 0) {
      await admin.from('reviews').upsert(rows, { onConflict: 'company_id,source,external_id', ignoreDuplicates: false })
    }
    total += rows.length
  } catch (e) {
    console.error(`monitor-web-mentions: X sync error for company ${companyId}:`, e)
  }

  return total
}

// Só roda em modo cron — a busca manual (clique em "Analisar redes sociais")
// já é coberta pelo apify-sync, que faz isso junto com todo o resto. Esta
// função é só o gatilho automático (1x por semana por empresa, sem clique).
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const apifyToken = Deno.env.get('APIFY_TOKEN')
    const cronSecretEnv = Deno.env.get('CRON_SECRET')

    const body = await req.json().catch(() => ({})) as Record<string, unknown>
    const isCron = cronSecretEnv && body.cron_secret === cronSecretEnv
    if (!isCron) return json({ error: 'Somente modo cron.' }, 403)
    if (!apifyToken) return json({ error: 'APIFY_TOKEN não configurado.' }, 503)

    const admin = createClient(supabaseUrl, serviceKey)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    const { data: companies } = await admin
      .from('companies')
      .select('id, business_name')
      .eq('active', true)
      .not('business_name', 'is', null)

    let scanned = 0, skipped = 0, mentionsFound = 0
    for (const company of companies ?? []) {
      try {
        const { data: recent } = await admin
          .from('reviews')
          .select('created_at')
          .eq('company_id', company.id)
          .in('source', ['x', 'reddit'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (recent?.created_at && recent.created_at > sevenDaysAgo) { skipped++; continue }

        mentionsFound += await syncMentions(admin, apifyToken, company.id, company.business_name as string)
        scanned++
      } catch (e) {
        console.error(`monitor-web-mentions: company ${company.id} error:`, e)
      }
    }

    // Classifica sentimento das menções recém-inseridas (mesma função usada
    // pelo apify-sync, agora em modo cron pra cobrir todas as empresas de uma vez).
    if (mentionsFound > 0) {
      try {
        await fetch(`${supabaseUrl}/functions/v1/analyze-reviews`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cron_secret: cronSecretEnv }),
        })
      } catch (e) {
        console.error('monitor-web-mentions: analyze-reviews trigger failed:', e)
      }
    }

    return json({ ok: true, cron: true, scanned, skipped, mentions_found: mentionsFound })
  } catch (err) {
    return json({ error: String(err) }, 500)
  }
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}
