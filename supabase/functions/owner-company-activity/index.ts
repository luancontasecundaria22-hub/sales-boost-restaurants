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

    // Owner role check — user_roles não tem coluna user_id, só email (ver
    // owner-companies, que já usava o padrão certo).
    const { data: roleRow } = await admin.from('user_roles').select('role').eq('email', user.email!).maybeSingle()
    if (roleRow?.role !== 'owner') return json({ error: 'Forbidden' }, 403)

    const body = await req.json() as { company_id: string; limit?: number; action?: string; updates?: Record<string, unknown>; marketing_ai?: Record<string, unknown> }
    const { company_id, limit = 10, action, updates } = body

    if (!company_id) return json({ error: 'company_id é obrigatório' }, 400)

    // Update company settings (owner edit)
    if (action === 'update' && updates) {
      const allowed = ['business_name', 'business_type', 'city', 'goal', 'plan', 'business_dna', 'jarvis_enabled', 'agent_enabled']
      const safe: Record<string, unknown> = {}
      for (const key of allowed) {
        if (key in updates) safe[key] = updates[key]
      }
      await admin.from('companies').update(safe).eq('id', company_id)
      return json({ ok: true })
    }

    // Update Marketing AI config (owner edit, per empresa). O owner não pode
    // gravar marketing_ai_config direto (RLS restringe ao user_id da empresa),
    // então passa por aqui com service role. Só campos OPERACIONAIS vêm da UI —
    // voz da marca e público-alvo são derivados do Business DNA (fonte única),
    // pra não pedir a mesma informação duas vezes.
    if (action === 'update_marketing_ai' && body.marketing_ai) {
      const m = body.marketing_ai
      const { data: comp } = await admin.from('companies').select('business_dna').eq('id', company_id).single()
      const dna = (comp?.business_dna ?? {}) as { brand_voice?: string; target_audience?: string }
      const agentName = typeof m.agent_name === 'string' && m.agent_name.trim() ? m.agent_name.trim() : 'Agente de Marketing'
      const payload = {
        company_id,
        agent_name: agentName,
        posting_frequency: typeof m.posting_frequency === 'string' && m.posting_frequency ? m.posting_frequency : '3x por semana',
        preferred_content_types: Array.isArray(m.preferred_content_types) ? m.preferred_content_types : [],
        content_pillars: Array.isArray(m.content_pillars) ? m.content_pillars : [],
        marketing_goals: (m.marketing_goals as string) || null,
        competitors: Array.isArray(m.competitors) ? m.competitors : [],
        brand_voice: dna.brand_voice ?? null,
        target_audience: dna.target_audience ?? null,
        updated_at: new Date().toISOString(),
      }
      const { error } = await admin.from('marketing_ai_config').upsert(payload)
      if (error) return json({ error: error.message }, 500)
      return json({ ok: true })
    }

    // Fetch company detail + agent messages + telegram conversations + marketing AI config
    const [companyRes, messagesRes, telegramRes, marketingAiRes] = await Promise.all([
      admin.from('companies')
        .select('id, business_name, business_type, city, goal, plan, instagram_url, website_url, google_rating, google_review_count, telegram_chat_id, business_dna, jarvis_enabled, agent_enabled, created_at')
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
      admin.from('marketing_ai_config').select('*').eq('company_id', company_id).maybeSingle(),
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
      marketing_ai: marketingAiRes.data ?? null,
    })
  } catch (err) {
    return json({ error: String(err) }, 500)
  }
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
}
