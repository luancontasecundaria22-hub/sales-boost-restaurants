/**
 * whatsapp-embedded-signup — finaliza o WhatsApp Embedded Signup do cliente.
 *
 * Diferente dos outros logins (Instagram, Meta Business), esse não é um
 * redirect — o front chama FB.login() com um config_id (janela popup) e
 * recebe um "code" + o waba_id/phone_number_id escolhidos. Esta função
 * troca o code por um token, inscreve o app no WABA (pra receber webhook
 * das mensagens desse número específico) e salva tudo na empresa.
 *
 * POST autenticado (JWT do próprio cliente) — body: { code, waba_id, phone_number_id }
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const FB_VERSION = 'v21.0'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Unauthorized' }, 401)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const appId = Deno.env.get('FACEBOOK_APP_ID')
    const appSecret = Deno.env.get('FACEBOOK_APP_SECRET')
    if (!appId || !appSecret) return json({ error: 'FACEBOOK_APP_ID/FACEBOOK_APP_SECRET não configurados' }, 500)

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } })
    const { data: { user }, error: userErr } = await userClient.auth.getUser()
    if (userErr || !user) return json({ error: 'Unauthorized' }, 401)

    const body = await req.json() as { code?: string; waba_id?: string; phone_number_id?: string }
    const { code, waba_id: wabaId, phone_number_id: phoneNumberId } = body
    if (!code || !wabaId || !phoneNumberId) return json({ error: 'code, waba_id e phone_number_id são obrigatórios' }, 400)

    const admin = createClient(supabaseUrl, serviceKey)
    const { data: company } = await admin.from('companies').select('id').eq('user_id', user.id).maybeSingle()
    if (!company) return json({ error: 'Empresa não encontrada' }, 404)

    // 1. code → token (sem redirect_uri — fluxo de popup, não de redirect)
    const tokenRes = await fetch(`https://graph.facebook.com/${FB_VERSION}/oauth/access_token?` + new URLSearchParams({
      client_id: appId, client_secret: appSecret, code,
    }))
    if (!tokenRes.ok) return json({ error: `Falha ao trocar o código: ${await tokenRes.text()}` }, 502)
    const tokenJson = await tokenRes.json() as { access_token?: string }
    const accessToken = tokenJson.access_token
    if (!accessToken) return json({ error: 'Resposta sem access_token' }, 502)

    // 2. inscreve o app no WABA — sem isso, as mensagens desse número não chegam no webhook
    const subRes = await fetch(`https://graph.facebook.com/${FB_VERSION}/${wabaId}/subscribed_apps`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token: accessToken }),
    })
    if (!subRes.ok) console.error('whatsapp-embedded-signup: falha ao inscrever app no WABA:', await subRes.text())

    // 3. detalhes do número, só pra exibir bonito no painel
    const phoneRes = await fetch(`https://graph.facebook.com/${FB_VERSION}/${phoneNumberId}?` + new URLSearchParams({
      fields: 'verified_name,display_phone_number', access_token: accessToken,
    }))
    const phoneJson = phoneRes.ok ? await phoneRes.json() as { verified_name?: string; display_phone_number?: string } : {}

    const { error: updateErr } = await admin.from('companies').update({
      whatsapp_business_account_id: wabaId,
      whatsapp_phone_number_id: phoneNumberId,
      whatsapp_access_token: accessToken,
      whatsapp_verified_name: phoneJson.verified_name ?? null,
      whatsapp_number: phoneJson.display_phone_number ?? null,
      whatsapp_connected_at: new Date().toISOString(),
    }).eq('id', company.id)
    if (updateErr) return json({ error: updateErr.message }, 500)

    return json({ ok: true, verified_name: phoneJson.verified_name ?? null, display_phone_number: phoneJson.display_phone_number ?? null })
  } catch (err) {
    console.error('whatsapp-embedded-signup error:', err)
    return json({ error: String(err) }, 500)
  }
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
}
