/**
 * whatsapp-webhook — recebe o webhook oficial do WhatsApp Cloud API (Meta).
 *
 * Dois papéis, exigidos pelo próprio Meta:
 *   GET  — desafio de verificação (obrigatório pra cadastrar o endereço no
 *          painel do app: confere hub.verify_token e devolve hub.challenge).
 *   POST — mensagens/eventos reais chegando; por enquanto só grava o bruto
 *          em whatsapp_messages (auditoria) — ainda não vincula a uma
 *          empresa/lead nem responde sozinho (isso depende de decidir como
 *          várias empresas vão dividir o mesmo número, ver nota no código).
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WhatsAppMessage {
  from?: string
  id?: string
  type?: string
  text?: { body?: string }
  [key: string]: unknown
}
interface WhatsAppContact { profile?: { name?: string }; wa_id?: string }
interface WhatsAppChangeValue {
  metadata?: { phone_number_id?: string }
  contacts?: WhatsAppContact[]
  messages?: WhatsAppMessage[]
}
interface WhatsAppWebhookBody {
  entry?: { changes?: { value?: WhatsAppChangeValue; field?: string }[] }[]
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const url = new URL(req.url)

  // Desafio de verificação do Meta (GET) — obrigatório antes do painel deles
  // deixar salvar esse endereço como Callback URL.
  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode')
    const token = url.searchParams.get('hub.verify_token')
    const challenge = url.searchParams.get('hub.challenge')
    const expectedToken = Deno.env.get('WHATSAPP_VERIFY_TOKEN')

    if (mode === 'subscribe' && expectedToken && token === expectedToken && challenge) {
      return new Response(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } })
    }
    return new Response('Forbidden', { status: 403 })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const admin = createClient(supabaseUrl, serviceKey)

    const body = await req.json().catch(() => ({})) as WhatsAppWebhookBody
    const rows: Record<string, unknown>[] = []

    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value = change.value
        if (!value?.messages?.length) continue
        const phoneNumberId = value.metadata?.phone_number_id ?? null
        const contact = value.contacts?.[0]
        for (const msg of value.messages) {
          rows.push({
            phone_number_id: phoneNumberId,
            from_number: msg.from ?? contact?.wa_id ?? null,
            contact_name: contact?.profile?.name ?? null,
            message_type: msg.type ?? 'unknown',
            content: msg.text?.body ?? null,
            raw: msg,
          })
        }
      }
    }

    if (rows.length > 0) await admin.from('whatsapp_messages').insert(rows)

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } })
  } catch (err) {
    console.error('whatsapp-webhook error:', err)
    // Sempre responde 200 pro Meta não ficar reenviando o mesmo evento em loop.
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } })
  }
})
