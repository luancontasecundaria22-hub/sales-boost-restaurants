/**
 * instagram-oauth-callback — Instagram Business Login (API with Instagram Login).
 *
 * Recebe o code do login do INSTAGRAM, troca por token e salva na empresa.
 * Fluxo (diferente do Facebook Login):
 *   1. code → short-lived token  (POST api.instagram.com/oauth/access_token)
 *   2. short → long-lived token  (GET graph.instagram.com/access_token, 60 dias)
 *   3. salva instagram_user_id + token + expiração em companies
 *
 * Usa INSTAGRAM_APP_ID / INSTAGRAM_APP_SECRET (produto Instagram), não os do
 * Facebook. Não precisa de Página do Facebook.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const errorMsg = url.searchParams.get('error_description') || url.searchParams.get('error')

  if (errorMsg) return htmlRedirect(`/dashboard/marketing-ai/conexoes?error=${encodeURIComponent(errorMsg)}`)
  if (!code || !state) return htmlRedirect('/dashboard/marketing-ai/conexoes?error=missing_params')

  let companyId: string
  try {
    companyId = JSON.parse(atob(state)).company_id
  } catch {
    return htmlRedirect('/dashboard/marketing-ai/conexoes?error=invalid_state')
  }

  const appId = Deno.env.get('INSTAGRAM_APP_ID')
  const appSecret = Deno.env.get('INSTAGRAM_APP_SECRET')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  if (!appId || !appSecret) return htmlRedirect('/dashboard/marketing-ai/conexoes?error=instagram_not_configured')

  const redirectUri = `${supabaseUrl}/functions/v1/instagram-oauth-callback`
  // O Instagram às vezes acrescenta "#_" no fim do code — remove.
  const cleanCode = code.replace(/#_$/, '')

  try {
    // 1. code → short-lived token (form-urlencoded)
    const form = new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code: cleanCode,
    })
    const shortRes = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    })
    if (!shortRes.ok) throw new Error(`Short token failed: ${await shortRes.text()}`)
    const shortJson = await shortRes.json() as { access_token: string; user_id?: number | string; permissions?: string }
    const shortToken = shortJson.access_token
    let igUserId = shortJson.user_id != null ? String(shortJson.user_id) : ''

    // 2. short → long-lived token (60 dias)
    const llRes = await fetch(`https://graph.instagram.com/access_token?` + new URLSearchParams({
      grant_type: 'ig_exchange_token',
      client_secret: appSecret,
      access_token: shortToken,
    }))
    const llJson = llRes.ok ? await llRes.json() as { access_token?: string; expires_in?: number } : {}
    const longToken = llJson.access_token ?? shortToken
    const expiresIn = llJson.expires_in ?? 5184000 // 60 dias padrão
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()

    // 3. (fallback) garante o user id via /me se não veio no passo 1
    if (!igUserId) {
      const meRes = await fetch(`https://graph.instagram.com/me?` + new URLSearchParams({ fields: 'user_id,username', access_token: longToken }))
      if (meRes.ok) {
        const me = await meRes.json() as { user_id?: string; id?: string }
        igUserId = String(me.user_id ?? me.id ?? '')
      }
    }
    if (!igUserId) throw new Error('Não foi possível obter o ID da conta do Instagram.')

    const admin = createClient(supabaseUrl, serviceKey)
    const { error: updateErr } = await admin
      .from('companies')
      .update({
        instagram_user_id: igUserId,
        instagram_access_token: longToken,
        instagram_token_expires_at: expiresAt,
      })
      .eq('id', companyId)
    if (updateErr) throw new Error(updateErr.message)

    return htmlRedirect('/dashboard/marketing-ai/conexoes?instagram=connected')
  } catch (err) {
    console.error('Instagram OAuth error:', err)
    return htmlRedirect(`/dashboard/marketing-ai/conexoes?error=${encodeURIComponent(String(err))}`)
  }
})

function htmlRedirect(path: string) {
  const appUrl = Deno.env.get('APP_URL') ?? 'https://sales-boost-restaurants.luancontasecundaria22.workers.dev'
  return Response.redirect(`${appUrl}${path}`, 302)
}
