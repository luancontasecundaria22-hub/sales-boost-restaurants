/**
 * partnership-opportunities — extensão da Inteligência de Mercado.
 *
 * Analisa o contexto real da empresa (nicho, público, local, produtos,
 * posicionamento, concorrentes, presença social, objetivos, orçamento) e
 * recomenda PARCERIAS ESTRATÉGICAS ranqueadas por um score de valor
 * (fit estratégico, sobreposição de público, alcance, qualidade de
 * engajamento, potencial de negócio, custo, dificuldade, probabilidade).
 *
 * Prioriza relevância e qualidade de audiência sobre número de seguidores.
 * Não inventa métricas: usa faixas/estimativas claramente rotuladas. Grava em
 * marketing_ai_partnerships (substitui o scan anterior). Nada é executado
 * sozinho — é recomendação pro dono agir.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function parseJsonArray<T>(raw: string): T[] {
  try { const p = JSON.parse(raw); return Array.isArray(p) ? p : [] } catch { /* */ }
  const m = raw.match(/\[[\s\S]*\]/)
  if (m) { try { return JSON.parse(m[0]) } catch { /* */ } }
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

    const admin = createClient(supabaseUrl, serviceKey)
    const bearer = req.headers.get('Authorization') ?? ''
    if (!bearer) return json({ error: 'Unauthorized' }, 401)
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: bearer } } })
    const { data: { user } } = await userClient.auth.getUser()
    if (!user) return json({ error: 'Unauthorized' }, 401)

    const { data: companyRow } = await admin.from('companies')
      .select('id, business_name, business_type, city, goal, instagram_url').eq('user_id', user.id).maybeSingle()
    const company = companyRow as { id: string; business_name: string; business_type: string | null; city: string | null; goal: string | null; instagram_url: string | null } | null
    if (!company) return json({ error: 'Empresa não encontrada.' }, 404)

    const [{ data: cfg }, { data: comps }] = await Promise.all([
      admin.from('marketing_ai_config').select('target_audience, marketing_goals, content_pillars, brand_voice, competitors, campaign_preferences').eq('company_id', company.id).maybeSingle(),
      admin.from('marketing_ai_competitors').select('name').eq('company_id', company.id).limit(12),
    ])
    const c = (cfg ?? {}) as { target_audience?: string; marketing_goals?: string; content_pillars?: string[]; brand_voice?: string; competitors?: string[]; campaign_preferences?: Record<string, unknown> }
    const competitorNames = [...new Set([...(comps ?? []).map((x: { name: string }) => x.name), ...(c.competitors ?? [])])].filter(Boolean)
    const budget = c.campaign_preferences?.budget ?? c.campaign_preferences?.monthly_budget ?? null

    const prompt = `Você é o agente de Inteligência de Mercado de "${company.business_name}" (${company.business_type ?? 'negócio'} em ${company.city ?? 'Brasil'}).

Sua tarefa: encontrar as MELHORES OPORTUNIDADES DE PARCERIA ESTRATÉGICA pra esse negócio.

Contexto real da empresa:
- Nicho/tipo: ${company.business_type ?? 'não definido'}
- Localização: ${company.city ?? 'Brasil'}
- Objetivo de crescimento: ${company.goal ?? c.marketing_goals ?? 'crescer e atrair clientes'}
- Público-alvo/ICP: ${c.target_audience ?? 'não definido'}
- Pilares de conteúdo: ${(c.content_pillars ?? []).join(', ') || 'não definidos'}
- Voz da marca: ${c.brand_voice ?? 'não definida'}
- Instagram: ${company.instagram_url ?? 'não informado'}
- Concorrentes conhecidos: ${competitorNames.join(', ') || 'não informados'}
- Orçamento disponível: ${budget ? String(budget) : 'não informado — sugira opções de custos variados, incluindo permuta'}

Considere estes tipos de parceria: influenciadores e criadores (micro e médios), negócios complementares, negócios locais, podcasts, newsletters, eventos, comunidades, associações do setor, co-marketing, colaborações estratégicas de marca, criadores e organizações locais.

Regras:
- PRIORIZE relevância e qualidade de audiência sobre número de seguidores.
- NUNCA invente métricas exatas. Use faixas/estimativas claramente rotuladas (ex: "~5k-20k (estimativa)"). Se citar um nome específico, marque "(a validar)".
- Ranqueie por um score de 0-100 combinando: fit estratégico, sobreposição de público, alcance potencial, qualidade de engajamento, potencial de negócio, custo, dificuldade e probabilidade de dar certo. Do maior score pro menor.

Gere de 6 a 10 oportunidades. Retorne APENAS um JSON array:
[{"name":"nome ou perfil sugerido","kind":"influencer|complementary|local|podcast|newsletter|event|community|association|comarketing|collab","score":0,"niche":"","location":"","audience_profile":"","audience_size":"faixa estimada rotulada","engagement_quality":"alta|média|baixa|a validar","why_match":"por que combina","collaboration_type":"permuta|pago|afiliado|indicação|sorteio|co-criação|evento|embaixador|cross-promotion","difficulty":"baixa|média|alta","cost":"estimativa ou 'permuta'","offer":"o que a empresa pode oferecer","ask":"o que pedir","outreach":"como abordar (1-2 frases)","format":"formato sugerido de colaboração","benefit":"benefício de negócio esperado","effort":"baixo|médio|alto","priority":"high|medium|low"}]`

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 3500, messages: [{ role: 'user', content: prompt }] }),
    })
    if (!res.ok) return json({ error: `Claude ${res.status}: ${(await res.text()).slice(0, 200)}` }, 502)
    const data = await res.json()
    const raw = (data.content?.[0]?.text ?? '').replace(/```(?:json)?\n?/g, '').trim()
    const items = parseJsonArray<Record<string, unknown>>(raw)
    if (items.length === 0) return json({ error: 'A IA não retornou oportunidades. Tente de novo.' }, 502)

    // Substitui o scan anterior pelo novo (a lista sempre reflete a última análise).
    await admin.from('marketing_ai_partnerships').delete().eq('company_id', company.id)
    const rows = items.slice(0, 12).map(it => {
      const score = Math.max(0, Math.min(100, Math.round(Number(it.score) || 0)))
      const { name, kind, score: _s, ...details } = it
      return { company_id: company.id, name: String(name ?? 'Parceria'), kind: String(kind ?? 'collab'), score, details }
    }).sort((a, b) => b.score - a.score)
    const { error: insErr } = await admin.from('marketing_ai_partnerships').insert(rows)
    if (insErr) return json({ error: insErr.message }, 500)

    return json({ ok: true, count: rows.length })
  } catch (err) {
    console.error('partnership-opportunities error:', err)
    return json({ error: err instanceof Error ? err.message : String(err) }, 500)
  }
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
}
