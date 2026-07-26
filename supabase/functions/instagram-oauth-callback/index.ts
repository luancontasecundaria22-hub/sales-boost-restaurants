/**
 * instagram-oauth-callback
 * Handles the Facebook OAuth callback, exchanges code for token,
 * finds the linked Instagram Business Account, and stores everything.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const META_API = 'https://graph.facebook.com/v21.0'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const errorMsg = url.searchParams.get('error_description')

  if (errorMsg) return htmlRedirect(`/dashboard/settings?tab=integracoes&error=${encodeURIComponent(errorMsg)}`)
  if (!code || !state) return htmlRedirect('/dashboard/settings?tab=integracoes&error=missing_params')

  let companyId: string
  try {
    const parsed = JSON.parse(atob(state))
    companyId = parsed.company_id
  } catch {
    return htmlRedirect('/dashboard/settings?tab=integracoes&error=invalid_state')
  }

  const appId = Deno.env.get('META_APP_ID')!
  const appSecret = Deno.env.get('META_APP_SECRET')!
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const redirectUri = `${supabaseUrl}/functions/v1/instagram-oauth-callback`

  try {
    // 1. Exchange code for short-lived token
    const tokenRes = await fetch(`${META_API}/oauth/access_token?` + new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      redirect_uri: redirectUri,
      code,
    }))
    if (!tokenRes.ok) throw new Error(`Token exchange failed: ${await tokenRes.text()}`)
    const { access_token: shortToken } = await tokenRes.json()

    // 2. Exchange for long-lived token (60 days)
    const llRes = await fetch(`${META_API}/oauth/access_token?` + new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: appId,
      client_secret: appSecret,
      fb_exchange_token: shortToken,
    }))
    if (!llRes.ok) throw new Error(`Long-lived token failed: ${await llRes.text()}`)
    const { access_token: longToken, expires_in } = await llRes.json()

    // 3. Get Facebook Pages
    const pagesRes = await fetch(`${META_API}/me/accounts?access_token=${longToken}`)
    if (!pagesRes.ok) throw new Error('Failed to fetch pages')
    const pagesData = await pagesRes.json()
    const pages: { id: string; access_token: string }[] = pagesData.data ?? []
    if (pages.length === 0) throw new Error('No Facebook Pages found. Connect a Page to your Facebook account first.')

    // 4. Find Instagram Business Account linked to any of the pages
    let igUserId: string | null = null
    let pageToken: string | null = null
    for (const page of pages) {
      const igRes = await fetch(`${META_API}/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`)
      if (!igRes.ok) continue
      const igData = await igRes.json()
      if (igData.instagram_business_account?.id) {
        igUserId = igData.instagram_business_account.id
        pageToken = page.access_token
        break
      }
    }

    if (!igUserId || !pageToken) {
      throw new Error('No Instagram Business Account found. Connect your Instagram to a Facebook Page in Meta Business Suite.')
    }

    // 5. Store in Supabase
    const expiresAt = new Date(Date.now() + (expires_in ?? 5184000) * 1000).toISOString()
    const admin = createClient(supabaseUrl, serviceKey)
    const { error: updateErr } = await admin
      .from('companies')
      .update({
        instagram_user_id: igUserId,
        instagram_access_token: pageToken,
        instagram_token_expires_at: expiresAt,
      })
      .eq('id', companyId)

    if (updateErr) throw new Error(updateErr.message)

    return htmlRedirect('/dashboard/settings?tab=integracoes&instagram=connected')
  } catch (err) {
    console.error('Instagram OAuth error:', err)
    return htmlRedirect(`/dashboard/settings?tab=integracoes&error=${encodeURIComponent(String(err))}`)
  }
})

function htmlRedirect(path: string) {
  const appUrl = Deno.env.get('APP_URL') ?? 'https://sales-boost-restaurants.luancontasecundaria22.workers.dev'
  return Response.redirect(`${appUrl}${path}`, 302)
}
