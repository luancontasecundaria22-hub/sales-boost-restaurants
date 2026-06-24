import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
}

const MAX_HISTORY = 10

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const secret = req.headers.get('x-webhook-secret')
    const envSecret = Deno.env.get('TELEGRAM_WEBHOOK_SECRET')
    if (!envSecret || secret !== envSecret) return json({ error: 'Unauthorized' }, 401)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')!
    const admin = createClient(supabaseUrl, serviceKey)

    const body = await req.json() as { chat_id: number; message: string; bot_type?: string }
    const { chat_id, message, bot_type = 'marketing' } = body

    if (!chat_id || !message) return json({ error: 'chat_id e message são obrigatórios' }, 400)

    // Find company by telegram_chat_id
    const { data: company } = await admin.from('companies')
      .select('id, business_name, business_type, city, goal, ai_profile')
      .eq('telegram_chat_id', chat_id)
      .single()

    if (!company) {
      return json({ reply: 'Para usar o chat, primeiro conecte sua conta com /conectar CÓDIGO.\nGere seu código em: https://sales-boost-restaurants.luancontasecundaria22.workers.dev/dashboard/configuracoes' })
    }

    // Get or create conversation
    let { data: conv } = await admin.from('telegram_conversations')
      .select('id')
      .eq('telegram_chat_id', String(chat_id))
      .eq('bot_type', bot_type)
      .single()

    if (!conv) {
      const { data: newConv } = await admin.from('telegram_conversations').insert({
        customer_id: company.id,
        bot_type,
        telegram_chat_id: String(chat_id),
        status: 'active',
        context: {},
      }).select('id').single()
      conv = newConv
    }

    // Load recent history
    const { data: history } = await admin.from('telegram_messages')
      .select('role, content')
      .eq('conversation_id', conv!.id)
      .order('created_at', { ascending: false })
      .limit(MAX_HISTORY)

    const historyMessages = (history ?? []).reverse().map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))

    // Build system prompt
    const systemPrompt = [
      `Você é o assistente de marketing da empresa "${company.business_name}"`,
      company.business_type ? `Tipo de negócio: ${company.business_type}` : '',
      company.city ? `Cidade: ${company.city}` : '',
      company.goal ? `Objetivo: ${company.goal}` : '',
      company.ai_profile ? `Perfil da empresa: ${company.ai_profile}` : '',
      '',
      'Responda de forma direta e útil via Telegram. Seja conciso (máximo 3 parágrafos).',
      'Você pode ajudar com marketing, posts, avaliações, concorrentes e estratégias de crescimento.',
    ].filter(Boolean).join('\n')

    // Call Claude
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        system: systemPrompt,
        messages: [...historyMessages, { role: 'user', content: message }],
      }),
    })

    if (!claudeRes.ok) {
      console.error('Claude error', await claudeRes.text())
      return json({ reply: 'Desculpe, tive um problema ao processar sua mensagem. Tente novamente.' })
    }

    const claudeData = await claudeRes.json()
    const reply = claudeData.content?.[0]?.text ?? 'Não consegui gerar uma resposta.'

    // Save messages to DB
    if (conv) {
      await admin.from('telegram_messages').insert([
        { conversation_id: conv.id, role: 'user', content: message },
        { conversation_id: conv.id, role: 'assistant', content: reply },
      ])
    }

    return json({ reply })
  } catch (err) {
    return json({ error: String(err) }, 500)
  }
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
}
