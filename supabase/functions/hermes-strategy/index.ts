/**
 * hermes-strategy
 * "Fase 2" do Hermes Control Center — o dono conversa em linguagem natural
 * sobre COMO o Hermes deve se comportar ("seja mais agressivo buscando
 * leads") e o Hermes traduz isso em mudanças concretas de configuração.
 *
 * Regra de segurança que vale mais que tudo aqui: esta função NUNCA escreve
 * em hermes_config. Ela só propõe (via tool propose_changes) — quem aplica
 * de verdade é sempre o dono, clicando em "Aplicar" na tela, que faz um
 * update comum na tabela (mesmo caminho do resto do Control Center). Um
 * agente com permissão de escrever na própria configuração merece esse
 * cuidado a mais: propor, nunca se reconfigurar sozinho no meio da conversa.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const CONFIGURABLE_FIELDS = [
  'mission', 'personality', 'priorities', 'routines', 'global_objectives',
  'kpis_monitored', 'max_daily_cost_usd', 'max_claude_calls_daily', 'max_active_agents',
  'approvals', 'policies',
]

const PROPOSE_TOOL = {
  name: 'propose_changes',
  description: 'ÚNICA forma de sugerir uma mudança na configuração do Hermes. Isso NUNCA aplica a mudança de verdade — só registra a proposta. O dono vê a prévia na tela e decide se aplica ou descarta.',
  input_schema: {
    type: 'object',
    properties: {
      summary: { type: 'string', description: 'Resumo em 1-2 frases, em português simples, do que essas mudanças fazem.' },
      changes: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            field: { type: 'string', enum: CONFIGURABLE_FIELDS },
            new_value: {
              description: 'Para priorities/routines/kpis_monitored/approvals: só as CHAVES que estão mudando (não o objeto inteiro). Para os demais campos: o valor novo completo.',
            },
            reasoning: { type: 'string', description: 'Por que essa mudança específica atende ao que o dono pediu.' },
          },
          required: ['field', 'new_value', 'reasoning'],
        },
      },
    },
    required: ['changes', 'summary'],
  },
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? anonKey
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!anthropicKey) return json({ error: 'ANTHROPIC_API_KEY não configurada.' }, 503)

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Unauthorized' }, 401)
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } })
    const { data: { user }, error: userErr } = await userClient.auth.getUser()
    if (userErr || !user) return json({ error: 'Unauthorized' }, 401)

    const admin = createClient(supabaseUrl, serviceKey)
    const { data: roleRow } = await admin.from('user_roles').select('role').eq('email', user.email!).maybeSingle()
    if (roleRow?.role !== 'owner') return json({ error: 'Forbidden' }, 403)

    const { message, history } = await req.json().catch(() => ({})) as { message?: string; history?: { role: string; content: string }[] }
    if (!message?.trim()) return json({ error: 'message é obrigatório' }, 400)

    const { data: config } = await admin.from('hermes_config').select('*').eq('id', true).maybeSingle()
    if (!config) return json({ error: 'hermes_config não encontrado — aplique as migrations do Hermes Control Center primeiro.' }, 500)

    const systemPrompt = `Você é o Hermes conversando com o dono da plataforma Sales Boost sobre a SUA PRÓPRIA configuração — não sobre o negócio de nenhum cliente específico.

CONFIGURAÇÃO ATUAL:
${JSON.stringify(config, null, 2)}

O dono vai descrever, em linguagem natural, como quer que você se comporte daqui pra frente (ex: "quero que você seja mais agressivo buscando novos clientes"). Sua tarefa:
1. Interprete a intenção de verdade — não invente mudança que ele não pediu.
2. Traduza em mudanças concretas de configuração, usando a ferramenta propose_changes.
3. Explique cada mudança em português simples, sem jargão técnico.

REGRAS IMPORTANTES:
- Você NUNCA aplica a mudança você mesmo — só propõe via propose_changes. Quem aplica de verdade é o dono, clicando em "Aplicar" na tela.
- Para os campos priorities, routines, kpis_monitored e approvals, o new_value deve conter só as CHAVES que estão mudando — o resto continua exatamente como está.
- Seja conservador: proponha só o que atende ao pedido, não aproveite pra mexer em outra coisa.
- Se o que o dono pediu já é exatamente o que a configuração atual faz, diga isso e não proponha nada (não chame propose_changes).
- Se o pedido for vago, faça 1 pergunta de esclarecimento em vez de chutar uma mudança.`

    const messages: unknown[] = [
      ...((history ?? []).map(h => ({ role: h.role, content: h.content }))),
      { role: 'user', content: message },
    ]

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 1500, system: systemPrompt, tools: [PROPOSE_TOOL], messages }),
    })
    if (!claudeRes.ok) return json({ error: `Erro da IA: ${await claudeRes.text()}` }, 502)

    const data = await claudeRes.json()
    const blocks = (data.content ?? []) as { type: string; text?: string; name?: string; input?: Record<string, unknown> }[]
    const textReply = blocks.filter(b => b.type === 'text').map(b => b.text ?? '').join('\n').trim()
    const toolUse = blocks.find(b => b.type === 'tool_use' && b.name === 'propose_changes')

    const proposedChanges = (toolUse?.input?.changes as unknown[] | undefined ?? [])
      .filter((c): c is { field: string; new_value: unknown; reasoning: string } =>
        !!c && typeof c === 'object' && CONFIGURABLE_FIELDS.includes((c as Record<string, unknown>).field as string))

    return json({
      ok: true,
      reply: textReply || (toolUse?.input?.summary as string | undefined) || 'Não entendi direito o pedido — pode reformular?',
      proposed_changes: proposedChanges,
    })
  } catch (err) {
    console.error('hermes-strategy error:', err)
    return json({ error: String(err) }, 500)
  }
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
}
