/**
 * creative-ideas — Creative Agent: gera IDEIAS de post (não o post final).
 *
 * Olha a marca, os insights abertos, a biblioteca e os formatos disponíveis e
 * devolve ~6 conceitos de post (gancho + ângulo + formato + módulo sugerido).
 * Cada ideia vira card no dashboard; o dono manda a que quiser pro
 * creative-generate (idea seed) pra virar um post de teste. Nada publica.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Company { id: string; business_name: string; business_type: string | null; city: string | null; goal: string | null }

async function callClaude(anthropicKey: string, prompt: string, maxTokens = 1600): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: maxTokens, messages: [{ role: 'user', content: prompt }] }),
  })
  if (!res.ok) throw new Error(`Claude error: ${await res.text()}`)
  const data = await res.json()
  return (data.content?.[0]?.text ?? '').replace(/```(?:json)?\n?/g, '').trim()
}

function parseArr(raw: string): Record<string, unknown>[] {
  const tryParse = (s: string): unknown => { try { return JSON.parse(s) } catch { return null } }
  let v: unknown = tryParse(raw)
  if (!v) { const a = raw.match(/\[[\s\S]*\]/); if (a) v = tryParse(a[0]) }
  if (Array.isArray(v)) return v as Record<string, unknown>[]
  if (v && typeof v === 'object') return [v as Record<string, unknown>]
  return []
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? anonKey
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!anthropicKey) return json({ error: 'ANTHROPIC_API_KEY não configurada.' }, 503)

    const bearer = req.headers.get('Authorization') ?? ''
    if (!bearer) return json({ error: 'Unauthorized' }, 401)
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: bearer } } })
    const { data: { user } } = await userClient.auth.getUser()
    if (!user) return json({ error: 'Unauthorized' }, 401)

    const admin = createClient(supabaseUrl, serviceKey)
    const { data: companyRow } = await admin.from('companies').select('id, business_name, business_type, city, goal').eq('user_id', user.id).maybeSingle()
    const company = companyRow as Company | null
    if (!company) return json({ error: 'Empresa não encontrada.' }, 404)

    const [{ data: cfgRow }, { data: insRows }, { data: libRows }, { data: fmtRows }] = await Promise.all([
      admin.from('marketing_ai_config').select('brand_voice, tone, target_audience, content_pillars, marketing_goals').eq('company_id', company.id).maybeSingle(),
      admin.from('marketing_ai_insights').select('pillar, title, description').eq('company_id', company.id).eq('status', 'open').order('created_at', { ascending: false }).limit(8),
      admin.from('marketing_ai_knowledge').select('kind, title').or(`company_id.is.null,company_id.eq.${company.id}`).in('module', ['core', 'organico', 'stories', 'campanhas']).limit(40),
      admin.from('marketing_ai_knowledge').select('title, content').eq('company_id', company.id).eq('module', 'formato').limit(12),
    ])
    const cfg = (cfgRow ?? {}) as { brand_voice?: string; tone?: string; target_audience?: string; content_pillars?: string[]; marketing_goals?: string }
    const insights = (insRows ?? []) as { pillar: string; title: string; description: string }[]
    const lib = (libRows ?? []) as { kind: string; title: string }[]
    const formats = (fmtRows ?? []) as { title: string; content: string | null }[]

    const prompt = `Você é o CREATIVE AGENT (diretor de ideias) da agência de "${company.business_name}" (${company.business_type ?? 'negócio'} em ${company.city ?? 'Brasil'}).
Voz da marca: ${cfg.brand_voice ?? 'não definida'}. Tom: ${cfg.tone ?? 'não definido'}. Público: ${cfg.target_audience ?? 'não definido'}.
Pilares: ${(cfg.content_pillars ?? []).join(', ') || 'não definidos'}. Objetivo: ${cfg.marketing_goals ?? company.goal ?? 'crescer e engajar'}.
${insights.length ? `\nInsights reais abertos (use-os como gatilho das ideias):\n${insights.map(i => `- [${i.pillar}] ${i.title}: ${i.description}`).join('\n')}` : ''}
${formats.length ? `\nFormatos disponíveis (prefira sugerir um destes quando encaixar):\n${formats.map(f => `- ${f.title}${f.content ? `: ${f.content}` : ''}`).join('\n')}` : ''}
${lib.length ? `\nRecursos na biblioteca (hooks/frameworks já cadastrados): ${lib.map(l => l.title).slice(0, 20).join(', ')}` : ''}

Gere 6 IDEIAS de post FORTES e específicas desse negócio (nada genérico). Cada ideia deve poder virar um post real.
"module" é onde a ideia se encaixa: "organico" (feed), "stories" ou "campanhas" (mídia paga).
"format" é o formato sugerido (ex: carrossel, reel, foto, story, tweet, infográfico...).
Retorne APENAS um JSON array, sem texto antes ou depois:
[{"title":"título curto da ideia","hook":"o gancho/primeira frase que prende","angle":"o ângulo em 1 frase","format":"carrossel","module":"organico","rationale":"por que essa ideia faz sentido agora, citando o insight/pilar"}]`

    const ideas = parseArr(await callClaude(anthropicKey, prompt)).slice(0, 6)
    if (ideas.length === 0) return json({ error: 'A IA não retornou ideias. Tente de novo.' }, 502)

    const MODS = ['organico', 'stories', 'campanhas']
    const rows = ideas.map(i => ({
      company_id: company.id,
      title: String(i.title ?? 'Ideia').slice(0, 160),
      hook: i.hook ? String(i.hook) : null,
      angle: i.angle ? String(i.angle) : null,
      format: i.format ? String(i.format) : null,
      module: MODS.includes(String(i.module)) ? String(i.module) : 'organico',
      rationale: i.rationale ? String(i.rationale) : null,
      status: 'new',
    }))
    const { data: inserted, error } = await admin.from('marketing_ai_ideas').insert(rows).select('*')
    if (error) return json({ error: error.message }, 500)

    return json({ ok: true, ideas: inserted ?? [] })
  } catch (err) {
    console.error('creative-ideas error:', err)
    return json({ error: err instanceof Error ? err.message : String(err) }, 500)
  }
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
}
