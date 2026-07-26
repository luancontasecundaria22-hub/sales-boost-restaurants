import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Mesmo texto usado no Worker marketing-bot — centralizado aqui pra que toda
// chamada (com ou sem Telegram conectado) grave a mesma mensagem legível na
// aba Atividades, e não só quando o envio ao Telegram tiver sucesso.
function buildNotificationText(eventType: string, data?: Record<string, unknown>, fallback?: string): string {
  switch (eventType) {
    case 'NEW_COMPETITOR':
      return `🧭 Novo concorrente!\n${(data?.count as number) ?? 1} concorrente(s) detectado(s)\nUse /concorrentes para ver detalhes.`
    case 'NEW_LEAD':
      return `📥 Novo lead!\n${(data?.lead as string) ?? 'Novo lead entrou no funil'}`
    case 'POST_APPROVED':
      return `✅ Post aprovado!\n${(data?.title as string) ?? 'Novo conteúdo disponível'}\nAcompanhe em Posts.`
    case 'NEGATIVE_REVIEW':
      return `⚠️ Nova avaliação negativa!\n⭐ ${(data?.rating as string) ?? ''} | ${(data?.source as string) ?? ''}\n${(data?.excerpt as string) ?? ''}`
    case 'OPPORTUNITY_DETECTED':
      return `💰 Oportunidade detectada!\n${(data?.description as string) ?? 'Nova oportunidade encontrada'}\nUse /relatorio para mais detalhes.`
    case 'CYCLE_SUMMARY': {
      const openCount = (data?.openCount as number) ?? 0
      const newCount = (data?.newCount as number) ?? 0
      const suggestions = (data?.suggestions as string[]) ?? []
      if (openCount === 0) return '✅ Tudo em dia! Nenhuma oportunidade pendente no momento.'
      const list = suggestions.map(s => `• ${s}`).join('\n')
      const novidade = newCount > 0 ? `${newCount} nova(s) desta vez.\n` : ''
      return `📋 Resumo do Agente de Marketing\n${openCount} oportunidade(s) aberta(s) aguardando você:\n${list}\n${novidade}Use /relatorio para mais detalhes.`
    }
    case 'REPORT_READY':
      return `📊 Relatório disponível!\nPeríodo: ${(data?.period as string) ?? ''}\nScore: ${(data?.health_score as number) ?? ''}\nUse /relatorio para acessar.`
    case 'AGENT_ACTION': {
      const action = (data?.action as string) ?? ''
      const count = (data?.count as number) ?? 0
      const reason = (data?.reason as string) ?? ''
      const sample = (data?.sample as string) ?? ''
      if (action === 'posts_created') {
        const preview = sample ? `\n\nExemplo: "${sample.slice(0, 140)}${sample.length > 140 ? '…' : ''}"` : ''
        return `📝 O agente criou ${count} post(s) novo(s)\nMotivo: ${reason}${preview}\n\nAprove em Posts.`
      }
      if (action === 'replies_drafted') {
        return `💬 O agente rascunhou ${count} resposta(s) de avaliação\nMotivo: ${reason}\n\nAprove em Oportunidades.`
      }
      if (action === 'leads_actioned') {
        return `📇 O agente agiu em ${count} lead(s)/oportunidade(s)\nMotivo: ${reason}`
      }
      return `🤖 O agente executou uma ação${reason ? `: ${reason}` : ''}.`
    }
    default:
      return fallback ?? 'Nova atualização do Sales Boost.'
  }
}

async function sendTelegramMessage(token: string, chatId: number, text: string): Promise<boolean> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    })
    return res.ok
  } catch {
    return false
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { secret, bot_name, event_type, message, telegram_chat_id, company_id, data } = await req.json()

    const expectedSecret = Deno.env.get('BOT_WEBHOOK_SECRET')
    if (expectedSecret && secret !== expectedSecret) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Sempre grava na aba Atividades, mesmo sem Telegram conectado — o envio
    // ao Telegram abaixo é só um bônus quando existe telegram_chat_id. Se
    // `message` já vier pronto (ex: telegram-webhook manda texto fixo de
    // comandos), usa ele direto; senão monta a partir de event_type + data.
    const finalMessage: string = message || buildNotificationText(event_type ?? 'message', data, message)

    const { error } = await supabase.from('bot_notifications').insert({
      bot_name: bot_name ?? 'unknown',
      event_type: event_type ?? 'message',
      message: finalMessage,
      telegram_chat_id: telegram_chat_id ?? null,
      company_id: company_id ?? null,
    })

    if (error) throw error

    let telegramSent = false
    const chatId = telegram_chat_id ? Number(telegram_chat_id) : null
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
    if (chatId && botToken) {
      telegramSent = await sendTelegramMessage(botToken, chatId, finalMessage)
    }

    return new Response(JSON.stringify({ ok: true, telegram_sent: telegramSent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error'
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
