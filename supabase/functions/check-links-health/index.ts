import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface LinkCheck {
  key: string
  label: string
  configured: boolean
  url: string | null
  status: 'ok' | 'broken' | 'not_configured'
  http_status: number | null
  error_reason: string | null
}

const CHANNELS: Array<{ key: string; label: string }> = [
  { key: 'website_url', label: 'Site' },
  { key: 'instagram_url', label: 'Instagram' },
  { key: 'facebook_url', label: 'Facebook' },
  { key: 'tiktok_url', label: 'TikTok' },
  { key: 'google_maps_url', label: 'Google Maps' },
  { key: 'tripadvisor_url', label: 'TripAdvisor' },
  { key: 'reclame_aqui_url', label: 'Reclame Aqui' },
  { key: 'ifood_url', label: 'iFood' },
]

async function checkUrl(rawUrl: string): Promise<{ status: 'ok' | 'broken'; http_status: number | null; error_reason: string | null }> {
  const url = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)
  try {
    // Most social platforms reject HEAD requests from server-side clients,
    // so a GET (without reading the body) is the more reliable check.
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SalesBoostHealthCheck/1.0)' },
    })
    clearTimeout(timeout)
    // Some platforms (e.g. Instagram) return 405/999 to bots but the domain
    // is clearly alive — only flag hard failures (4xx/5xx besides those) as broken.
    const softStatuses = [405, 999]
    if (res.ok || softStatuses.includes(res.status)) {
      return { status: 'ok', http_status: res.status, error_reason: null }
    }
    const reason = res.status === 404
      ? 'Página não encontrada (erro 404) — o link pode estar errado ou o conteúdo foi removido'
      : res.status === 403
        ? 'Acesso negado (erro 403) — o site está bloqueando o acesso'
        : res.status >= 500
          ? `O servidor do site está com problema (erro ${res.status})`
          : `O link retornou um erro (${res.status})`
    return { status: 'broken', http_status: res.status, error_reason: reason }
  } catch (err) {
    clearTimeout(timeout)
    const isTimeout = err instanceof Error && err.name === 'AbortError'
    return {
      status: 'broken',
      http_status: null,
      error_reason: isTimeout ? 'O site demorou demais para responder (timeout)' : 'Não foi possível conectar a esse endereço — confira se o link está digitado corretamente',
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Unauthorized' }, 401)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? supabaseAnonKey

    const userClient = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } })
    const { data: { user }, error: userErr } = await userClient.auth.getUser()
    if (userErr || !user) return json({ error: 'Unauthorized' }, 401)

    const admin = createClient(supabaseUrl, serviceKey)
    const { data: company } = await admin
      .from('companies')
      .select('website_url, instagram_url, facebook_url, tiktok_url, google_maps_url, tripadvisor_url, reclame_aqui_url, ifood_url')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!company) return json({ error: 'Empresa não encontrada.' }, 404)

    const results: LinkCheck[] = await Promise.all(
      CHANNELS.map(async (ch) => {
        const url = (company as Record<string, string | null>)[ch.key]
        if (!url) return { key: ch.key, label: ch.label, configured: false, url: null, status: 'not_configured', http_status: null, error_reason: null }
        const { status, http_status, error_reason } = await checkUrl(url)
        return { key: ch.key, label: ch.label, configured: true, url, status, http_status, error_reason }
      })
    )

    return json({ links: results, checked_at: new Date().toISOString() })
  } catch (err) {
    return json({ error: String(err) }, 500)
  }
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}
