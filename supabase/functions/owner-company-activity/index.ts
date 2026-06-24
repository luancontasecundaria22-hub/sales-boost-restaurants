import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Unauthorized' }, 401)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey    = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? anonKey

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: userErr } = await userClient.auth.getUser()
    if (userErr || !user) return json({ error: 'Unauthorized' }, 401)

    const admin = createClient(supabaseUrl, serviceKey)

    // Owner role check
    const { data: roleRow } = await admin.from('user_roles').select('role').eq('user_id', user.id).maybeSingle()
    if (roleRow?.role !== 'owner') return json({ error: 'Forbidden' }, 403)

    const body = await req.json() as { company_id: string; limit?: number; action?: string; updates?: Record<string, unknown> }
    const { company_id, limit = 10, action, updates } = body

    if (!company_id) return json({ error: 'company_id é obrigatório' }, 400)

    // Update company settings (owner edit)
    if (action === 'update' && updates) {
      const allowed = ['business_name', 'business_type', 'city', 'goal', 'plan']
      const safe: Record<string, unknown> = {}
      for (const key of allowed) {
        if (key in updates) safe[key] = updates[key]
      }
      await admin.from('companies').update(safe).eq('id', company_id)
      return json({ ok: true })
    }

    // Fetch company detail + agent messages + telegram conversations
    const [companyRes, messagesRes, telegramRes] = await Promise.all([
      admin.from('companies')
        .select('id, business_name, business_type, city, goal, plan, instagram_url, website_url, google_rating, google_review_count, telegram_chat_id, created_at')
        .eq('id', company_id)
        .single(),
      admin.from('agent_messages')
        .select('id, role, content, agent_role, created_at')
        .eq('company_id', company_id)
        .order('created_at', { ascending: false })
        .limit(limit),
      admin.from('telegram_conversations')
        .select('id, bot_type, telegram_chat_id, status, created_at')
        .eq('customer_id', company_id)
        .order('created_at', { ascending: false }),
    ])

    // Fetch last messages for each telegram conversation
    const convs = telegramRes.data ?? []
    const telegramMessages = convs.length > 0
      ? await Promise.all(convs.map(async (conv) => {
          const { data: msgs } = await admin.from('telegram_messages')
            .select('id, role, content, created_at')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(10)
          return { ...conv, messages: msgs ?? [] }
        }))
      : []

    return json({
      ok: true,
      company: companyRes.data,
      messages: messagesRes.data ?? [],
      telegram: telegramMessages,
    })
  } catch (err) {
    return json({ error: String(err) }, 500)
  }
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
}
