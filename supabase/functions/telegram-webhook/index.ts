/**
 * telegram-webhook — recebe as mensagens do bot de Telegram (marketing)
 * diretamente do Telegram, substituindo o Cloudflare Worker `marketing-bot`
 * nesse papel. Isso tira uma camada que não dava pra debugar (não tínhamos
 * acesso aos logs do Worker) e deixa tudo visível nos logs do Supabase.
 *
 * O Worker `marketing-bot` continua existindo só para servir o site — este
 * endpoint é quem passa a receber o webhook do Telegram de verdade. Depois de
 * publicar, é preciso repontar o webhook do bot pra esta URL (ver instruções).
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const BOT_USERNAME = 'luansoaresribeirobot'
type SupaClient = ReturnType<typeof createClient>

interface TelegramChat { id: number; type: string }
interface TelegramMessage { chat: TelegramChat; text?: string }
interface TelegramUpdate { message?: TelegramMessage; edited_message?: TelegramMessage }

async function sendMessage(token: string, chatId: number, text: string): Promise<void> {
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  })
  if (!res.ok) console.error('Telegram sendMessage failed:', res.status, await res.text().catch(() => ''))
}

async function logEvent(admin: SupaClient, eventType: string, message: string, chatId: number, companyId?: string | null): Promise<void> {
  await admin.from('bot_notifications').insert({
    bot_name: 'marketing', event_type: eventType, message, telegram_chat_id: chatId, company_id: companyId ?? null,
  }).then(({ error }) => { if (error) console.error('logEvent error:', error.message) })
}

async function handleConectar(admin: SupaClient, token: string, chatId: number, code: string, supabaseUrl: string, webhookSecret: string): Promise<void> {
  if (!code) {
    await sendMessage(token, chatId, '⚠️ Use: /conectar CÓDIGO\n\nGere seu código em: Dashboard → Configurações → Telegram')
    return
  }
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/telegram-connect`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-webhook-secret': webhookSecret },
      body: JSON.stringify({ code, chat_id: chatId, bot_type: 'marketing' }),
    })
    const data = await res.json() as { ok?: boolean; error?: string }
    if (data.ok) {
      await sendMessage(token, chatId, '✅ Conta conectada com sucesso!\n\nVocê vai receber os avisos e sugestões aqui mesmo, direto nesta conversa. Use /start para ver os comandos disponíveis.')
      await logEvent(admin, 'conectar_ok', '✅ Conta conectada ao Telegram via código', chatId)
    } else {
      await sendMessage(token, chatId, `❌ ${data.error ?? 'Código inválido ou já utilizado.'}\n\nGere um novo código no dashboard.`)
    }
  } catch (err) {
    await sendMessage(token, chatId, `❌ Falha ao conectar: ${err instanceof Error ? err.message : 'erro desconhecido'}`)
  }
}

async function handleStart(admin: SupaClient, token: string, chatId: number, args: string, supabaseUrl: string, webhookSecret: string): Promise<void> {
  const codeMatch = args.trim().match(/^[A-Z2-9]{8}$/i)
  if (codeMatch) {
    await handleConectar(admin, token, chatId, args.trim(), supabaseUrl, webhookSecret)
    return
  }
  await sendMessage(token, chatId,
    'Olá! Eu sou o assistente Sales Boost 🚀\n\n' +
    'Comandos disponíveis:\n' +
    '/diagnostico — diagnóstico do site\n' +
    '/concorrentes — análise de concorrentes\n' +
    '/relatorio — relatório mensal\n\n' +
    'Para conectar sua conta, acesse o dashboard e clique em "Conectar Telegram".')
  await logEvent(admin, 'start', '👋 Novo usuário iniciou o bot de marketing', chatId)
}

async function handleFreeText(admin: SupaClient, token: string, chatId: number, text: string, supabaseUrl: string, webhookSecret: string): Promise<void> {
  try {
    // Volta pro telegram-chat (Claude direto) — o Hermes (hermes-proxy) está
    // instável no momento (a VPS que hospeda o HERMES_URL vem falhando), e o
    // Telegram é o canal principal com clientes reais, então não pode ficar
    // refém disso. Reavaliar a troca pro Hermes quando ele estiver estável.
    const res = await fetch(`${supabaseUrl}/functions/v1/telegram-chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-webhook-secret': webhookSecret },
      body: JSON.stringify({ chat_id: chatId, message: text, bot_type: 'marketing' }),
    })
    const data = await res.json() as { reply?: string; error?: string; ok?: boolean }
    // telegram-chat já envia a resposta pro Telegram sozinho quando dá certo —
    // só precisamos tratar o caso de erro explícito aqui.
    if (!res.ok || data.error) {
      await sendMessage(token, chatId, `❌ Erro ao processar mensagem: ${data.error ?? res.status}`)
      return
    }
    if (data.reply) await logEvent(admin, 'chat_response', `💬 Resposta automática enviada: ${text.slice(0, 50)}`, chatId)
  } catch (err) {
    await sendMessage(token, chatId, `❌ Falha ao processar: ${err instanceof Error ? err.message : 'erro desconhecido'}`)
  }
}

const COMMANDS = new Set(['/start', '/conectar', '/diagnostico', '/diagnostico_site', '/concorrentes', '/relatorio', 'report'])

async function routeMessage(admin: SupaClient, token: string, chatId: number, chatType: string, text: string, supabaseUrl: string, webhookSecret: string): Promise<void> {
  const [rawCommand, ...rest] = text.trim().split(/\s+/)
  const args = rest.join(' ')

  // Em grupos, só responde a comandos ou quando mencionado — igual ao comportamento anterior.
  let command = rawCommand.toLowerCase()
  if (chatType === 'group' || chatType === 'supergroup') {
    const mentioned = text.includes(`@${BOT_USERNAME}`)
    if (!mentioned && !command.startsWith('/')) return
    command = command.replace(new RegExp(`@${BOT_USERNAME}$`, 'i'), '')
  }

  if (!COMMANDS.has(command)) {
    if (command.startsWith('/')) {
      await sendMessage(token, chatId, 'Comando não reconhecido. Use /start para ver os comandos disponíveis.')
      return
    }
    await handleFreeText(admin, token, chatId, text, supabaseUrl, webhookSecret)
    return
  }

  if (command === '/start') return handleStart(admin, token, chatId, args, supabaseUrl, webhookSecret)
  if (command === '/conectar') return handleConectar(admin, token, chatId, args.trim(), supabaseUrl, webhookSecret)

  if (command === '/diagnostico' || command === '/diagnostico_site') {
    await sendMessage(token, chatId, '🔍 Gerando diagnóstico do seu site... isso pode levar até 1 minuto.')
    await logEvent(admin, 'diagnostico', '🔍 Diagnóstico de site solicitado via Telegram', chatId)
    await sendMessage(token, chatId, 'Esse comando ainda depende de estar logado no site — acesse o dashboard para gerar o diagnóstico por enquanto.')
    return
  }

  if (command === '/concorrentes') {
    await logEvent(admin, 'concorrentes', '🗺 Mapeamento de concorrentes solicitado via Telegram', chatId)
    await sendMessage(token, chatId, 'Esse comando ainda depende de estar logado no site — acesse o dashboard → Concorrentes por enquanto.')
    return
  }

  if (command === '/relatorio' || command === 'report') {
    await logEvent(admin, 'relatorio', '📊 Relatório mensal solicitado via Telegram', chatId)
    await sendMessage(token, chatId, 'Esse comando ainda depende de estar logado no site — acesse o dashboard → Relatório por enquanto.')
    return
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const token = Deno.env.get('TELEGRAM_BOT_TOKEN')
    const webhookSecret = Deno.env.get('TELEGRAM_WEBHOOK_SECRET') ?? ''
    if (!token) return json({ error: 'TELEGRAM_BOT_TOKEN nao configurado' }, 500)

    const admin = createClient(supabaseUrl, serviceKey)
    const update = await req.json().catch(() => ({})) as TelegramUpdate
    const message = update.message ?? update.edited_message
    if (!message?.text) return json({ ok: true })

    await routeMessage(admin, token, message.chat.id, message.chat.type, message.text, supabaseUrl, webhookSecret)
    return json({ ok: true })
  } catch (err) {
    console.error('telegram-webhook error:', err)
    return json({ ok: false, error: String(err) }, 500)
  }
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
}
