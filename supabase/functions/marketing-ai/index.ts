/**
 * marketing-ai
 * Sistema 100% independente do módulo "Agentes" (hermes-proxy) — por decisão
 * explícita do dono. Não importa, não chama e não compartilha tabelas com
 * generate-posts / content-intelligence / map-competitors / hermes-proxy.
 * Tudo aqui é próprio: dados, prompts, lógica.
 *
 * Quatro pilares, cada um uma função própria abaixo:
 *   - Tracking Intelligence   → runTracking()
 *   - Content Intelligence    → runContent()
 *   - Competitor Intelligence → runCompetitors()
 *   - Strategy Intelligence   → runStrategy()  (o "cérebro" que lê os outros três)
 *
 * Regra que NÃO muda mesmo sendo um sistema independente: nunca publica
 * sozinho. marketing_ai_content nunca sai do status 'draft'/'approved' por
 * conta própria — publicar de verdade no Instagram é uma integração que
 * ainda não existe de forma segura na plataforma (ver auditoria do
 * Executor). "approval_workflow: auto_publish" no config fica registrado
 * pra quando essa integração existir de verdade, mas hoje não tem efeito.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type SupaClient = ReturnType<typeof createClient>

interface Company {
  id: string; business_name: string; business_type: string | null; city: string | null
  instagram_url: string | null; goal: string | null
}

interface MarketingAiConfig {
  business_objectives: string | null; brand_voice: string | null; tone: string | null
  posting_frequency: string; preferred_content_types: string[]
  automatic_publishing: boolean; approval_workflow: string
  competitors: string[]; brand_colors: string[]; brand_assets: Record<string, unknown>
  target_audience: string | null; content_pillars: string[]; marketing_goals: string | null
  agent_name: string
}

async function getConfig(admin: SupaClient, companyId: string): Promise<MarketingAiConfig | null> {
  const { data } = await admin.from('marketing_ai_config').select('*').eq('company_id', companyId).maybeSingle()
  return data as MarketingAiConfig | null
}

// Identidade única do agente — usada tanto pelos quatro pilares (cron) quanto
// pelo chat interativo, pra sempre soar como o mesmo "alguém", não quatro
// scripts desconectados.
function composeMarketingAgentPreamble(config: MarketingAiConfig, company: Company): string {
  const name = config.agent_name?.trim() || 'Agente de Marketing'
  return `Você é ${name}, o agente de marketing dedicado de "${company.business_name}" (${company.business_type ?? 'negócio'} em ${company.city ?? 'Brasil'}).
Voz da marca: ${config.brand_voice ?? 'não definida ainda'}. Tom: ${config.tone ?? 'não definido ainda'}.
Público-alvo: ${config.target_audience ?? 'não definido ainda'}.
Pilares de conteúdo: ${config.content_pillars.join(', ') || 'não definidos ainda'}.
Objetivos: ${config.marketing_goals ?? config.business_objectives ?? 'crescer e engajar mais'}.

Você é um sistema 100% independente do "Agente Geral" do dashboard — não compartilha dados, posts nem histórico com ele. Você enxerga só o que suas próprias quatro inteligências coletaram: Tracking (métricas reais do Instagram), Content (ideias e legendas), Competitor (concorrentes configurados) e Strategy (recomendações com o porquê).
Regra permanente: você nunca publica nada sozinho — todo conteúdo que você cria fica como rascunho esperando aprovação. Nunca invente número que não veio de uma coleta real.`
}

async function logActivity(admin: SupaClient, companyId: string, pillar: string, action: string, reasoning?: string) {
  await admin.from('marketing_ai_activity_log').insert({ company_id: companyId, pillar, action, reasoning: reasoning ?? null })
}

async function callClaude(anthropicKey: string, prompt: string, maxTokens = 1200): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: maxTokens, messages: [{ role: 'user', content: prompt }] }),
  })
  if (!res.ok) throw new Error(`Claude error: ${await res.text()}`)
  const data = await res.json()
  return (data.content?.[0]?.text ?? '').replace(/```(?:json)?\n?/g, '').trim()
}

function parseJsonArray<T>(raw: string): T[] {
  try { const p = JSON.parse(raw); return Array.isArray(p) ? p : [] } catch { /* fall through */ }
  const match = raw.match(/\[[\s\S]*\]/)
  if (match) { try { return JSON.parse(match[0]) } catch { /* give up */ } }
  return []
}

async function runApifyActor(token: string, actorId: string, input: Record<string, unknown>, timeoutSecs = 90): Promise<unknown[]> {
  const url = `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${token}&timeout=${timeoutSecs}&memory=256`
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) })
  if (!res.ok) throw new Error(`Apify error (${actorId}): ${await res.text()}`)
  return res.json()
}

// ── 1. Tracking Intelligence ───────────────────────────────────────────────
// Coleta métricas reais do Instagram (própria chamada Apify — não usa
// apify-sync) e detecta padrões comparando com o histórico já coletado.
// Nunca inventa número que não veio do Apify.
interface ApifyIgPost { likesCount?: number; commentsCount?: number; timestamp?: string }
interface ApifyIgProfile { followersCount?: number; postsCount?: number; latestPosts?: ApifyIgPost[] }

async function runTracking(admin: SupaClient, company: Company, config: MarketingAiConfig, apifyToken: string, anthropicKey: string): Promise<{ insights: number; error?: string }> {
  if (!company.instagram_url) return { insights: 0, error: 'Instagram não configurado pra esta empresa.' }

  const items = await runApifyActor(apifyToken, 'apify~instagram-scraper', {
    directUrls: [company.instagram_url.replace(/\/$/, '')], resultsType: 'details', resultsLimit: 12,
  }) as ApifyIgProfile[]
  const profile = items[0]
  if (!profile) return { insights: 0, error: 'Perfil do Instagram não encontrado.' }

  const posts = profile.latestPosts ?? []
  const avgLikes = posts.length ? posts.reduce((s, p) => s + (p.likesCount ?? 0), 0) / posts.length : null
  const avgComments = posts.length ? posts.reduce((s, p) => s + (p.commentsCount ?? 0), 0) / posts.length : null
  const engagementRate = (avgLikes != null && avgComments != null && profile.followersCount)
    ? Number((((avgLikes + avgComments) / profile.followersCount) * 100).toFixed(2)) : null
  const hours = posts.map(p => p.timestamp ? new Date(p.timestamp).getUTCHours() : null).filter((h): h is number => h !== null)
  const bestHour = hours.length ? hours.sort((a, b) => hours.filter(h => h === a).length - hours.filter(h => h === b).length).pop() ?? null : null

  await admin.from('marketing_ai_tracking_snapshots').insert({
    company_id: company.id, source: 'instagram',
    followers: profile.followersCount ?? null, posts_count: profile.postsCount ?? null,
    avg_likes: avgLikes, avg_comments: avgComments, engagement_rate: engagementRate, best_posting_hour: bestHour,
    raw: profile,
  })

  const { data: history } = await admin.from('marketing_ai_tracking_snapshots')
    .select('followers, avg_likes, avg_comments, engagement_rate, best_posting_hour, collected_at')
    .eq('company_id', company.id).order('collected_at', { ascending: false }).limit(10)

  if (!history || history.length < 2) {
    return { insights: 0 } // primeira coleta — nada pra comparar ainda, não inventa tendência
  }

  const prompt = `${composeMarketingAgentPreamble(config, company)}

Agora você está atuando como Tracking Intelligence. Analise SÓ os dados reais abaixo (nunca invente número que não está aqui) e identifique padrões reais no histórico de métricas — mais recente primeiro:

${JSON.stringify(history, null, 2)}

Retorne APENAS um JSON array de até 3 insights, cada um: {"title": "frase curta", "description": "explicação com o dado real que sustenta", "impact": "high"|"medium"|"low"}. Se não houver padrão claro nos dados, retorne um array vazio [] — não force um insight.`

  const raw = await callClaude(anthropicKey, prompt, 800)
  const insights = parseJsonArray<{ title: string; description: string; impact: string }>(raw)
  for (const ins of insights) {
    await admin.from('marketing_ai_insights').insert({ company_id: company.id, pillar: 'tracking', title: ins.title, description: ins.description, impact: ins.impact })
  }
  if (insights.length > 0) await logActivity(admin, company.id, 'tracking', `${insights.length} padrão(ões) detectado(s)`, insights[0]?.description)
  return { insights: insights.length }
}

// ── 2. Competitor Intelligence ─────────────────────────────────────────────
// Os concorrentes são configurados pelo dono (marketing_ai_config.competitors
// — lista de URLs de Instagram), não descobertos automaticamente — evita
// duplicar a busca do Google Places que já existe no módulo Agentes.
async function runCompetitors(admin: SupaClient, company: Company, config: MarketingAiConfig, apifyToken: string, anthropicKey: string): Promise<{ insights: number; scanned: number }> {
  const urls = (config.competitors ?? []).filter(u => u.trim())
  if (urls.length === 0) return { insights: 0, scanned: 0 }

  let scanned = 0
  const summaries: Record<string, unknown>[] = []

  for (const url of urls.slice(0, 8)) {
    try {
      const items = await runApifyActor(apifyToken, 'apify~instagram-scraper', { directUrls: [url.replace(/\/$/, '')], resultsType: 'details', resultsLimit: 12 }) as ApifyIgProfile[]
      const profile = items[0]
      if (!profile) continue
      const posts = profile.latestPosts ?? []
      const avgEngagement = posts.length ? posts.reduce((s, p) => s + (p.likesCount ?? 0) + (p.commentsCount ?? 0), 0) / posts.length : null
      const dates = posts.map(p => p.timestamp ? new Date(p.timestamp).getTime() : null).filter((t): t is number => t !== null).sort((a, b) => b - a)
      const freqDays = dates.length >= 2 ? Number((((dates[0] - dates[dates.length - 1]) / (1000 * 60 * 60 * 24)) / (dates.length - 1)).toFixed(1)) : null

      const { data: existing } = await admin.from('marketing_ai_competitors').select('id').eq('company_id', company.id).eq('instagram_url', url).maybeSingle()
      const row = { company_id: company.id, name: profile.followersCount ? url.split('/').filter(Boolean).pop() ?? url : url, instagram_url: url, posting_frequency_days: freqDays, avg_engagement: avgEngagement, followers: profile.followersCount ?? null, last_analyzed_at: new Date().toISOString() }
      let competitorId: string
      if (existing) {
        await admin.from('marketing_ai_competitors').update(row).eq('id', existing.id)
        competitorId = existing.id as string
      } else {
        const { data: inserted } = await admin.from('marketing_ai_competitors').insert(row).select('id').single()
        competitorId = inserted!.id as string
      }
      await admin.from('marketing_ai_competitor_snapshots').insert({ competitor_id: competitorId, followers: profile.followersCount ?? null, posts_count: profile.postsCount ?? null, avg_engagement: avgEngagement })
      summaries.push({ url, followers: profile.followersCount, avg_engagement: avgEngagement, posting_frequency_days: freqDays })
      scanned++
    } catch (e) {
      console.error(`runCompetitors: ${url} error:`, e)
    }
  }

  if (summaries.length === 0) return { insights: 0, scanned: 0 }

  const prompt = `${composeMarketingAgentPreamble(config, company)}

Agora você está atuando como Competitor Intelligence. Dados reais coletados agora dos concorrentes configurados:

${JSON.stringify(summaries, null, 2)}

O objetivo NÃO é copiar concorrente, é achar oportunidade real. Retorne APENAS um JSON array de até 3 insights: {"title": "...", "description": "...", "impact": "high"|"medium"|"low"}. Baseie-se só nos dados acima.`

  const raw = await callClaude(anthropicKey, prompt, 800)
  const insights = parseJsonArray<{ title: string; description: string; impact: string }>(raw)
  for (const ins of insights) {
    await admin.from('marketing_ai_insights').insert({ company_id: company.id, pillar: 'competitor', title: ins.title, description: ins.description, impact: ins.impact })
  }
  if (scanned > 0) await logActivity(admin, company.id, 'competitor', `${scanned} concorrente(s) analisado(s)`, insights[0]?.description)
  return { insights: insights.length, scanned }
}

// ── 3. Content Intelligence ────────────────────────────────────────────────
// Gera ideias/legendas com base no config + insights recentes das outras
// duas inteligências. Sempre entra como 'draft' — nunca publica sozinho.
async function runContent(admin: SupaClient, company: Company, config: MarketingAiConfig, anthropicKey: string, replicateKey: string | null): Promise<{ created: number }> {
  const { count: pendingCount } = await admin.from('marketing_ai_content').select('id', { count: 'exact', head: true }).eq('company_id', company.id).in('status', ['idea', 'draft'])
  if ((pendingCount ?? 0) >= 10) return { created: 0 } // já tem ideia parada esperando revisão — não empilha mais

  const { data: recentInsights } = await admin.from('marketing_ai_insights').select('pillar, title, description').eq('company_id', company.id).eq('status', 'open').order('created_at', { ascending: false }).limit(6)

  const prompt = `${composeMarketingAgentPreamble(config, company)}

Agora você está atuando como Content Intelligence — sua tarefa é gerar ideias de conteúdo.
${recentInsights?.length ? `\nInsights recentes de Tracking/Competitor pra considerar:\n${recentInsights.map(i => `- [${i.pillar}] ${i.title}: ${i.description}`).join('\n')}` : ''}

Gere 2 ideias de conteúdo alinhadas com a estratégia acima. Retorne APENAS um JSON array:
[{"idea": "resumo curto", "caption": "legenda completa pronta pra publicar", "hashtags": "#tag1 #tag2 #tag3", "format": "reel"|"carrossel"|"story"|"foto", "reasoning": "por que essa ideia faz sentido agora, citando os insights se houver"}]`

  const raw = await callClaude(anthropicKey, prompt, 1500)
  const ideas = parseJsonArray<{ idea: string; caption: string; hashtags: string; format: string; reasoning: string }>(raw)
  let created = 0
  for (const idea of ideas) {
    const { data: row } = await admin.from('marketing_ai_content').insert({
      company_id: company.id, idea: idea.idea, caption: idea.caption, hashtags: idea.hashtags,
      format: idea.format, reasoning: idea.reasoning, status: 'draft',
    }).select('id').single()
    created++

    if (replicateKey && row) {
      try {
        const imgPrompt = `Professional social media photo for a Brazilian small business (${company.business_type ?? 'negócio'}). Commercial photography, warm lighting, no people, no text, no logos. Evokes: ${idea.idea}`
        const repRes = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions', {
          method: 'POST', headers: { Authorization: `Bearer ${replicateKey}`, 'Content-Type': 'application/json', Prefer: 'wait' },
          body: JSON.stringify({ input: { prompt: imgPrompt, num_outputs: 1, aspect_ratio: '1:1', output_format: 'webp', output_quality: 85 } }),
        })
        if (repRes.ok) {
          const pred = await repRes.json() as { status?: string; output?: string[] }
          const url = pred.status === 'succeeded' ? pred.output?.[0] : null
          if (url) await admin.from('marketing_ai_content').update({ image_url: url }).eq('id', row.id)
        }
      } catch (e) { console.error('runContent image error:', e) }
    }
  }
  if (created > 0) await logActivity(admin, company.id, 'content', `${created} ideia(s) de conteúdo criada(s)`, ideas[0]?.reasoning)
  return { created }
}

// ── 4. Strategy Intelligence ───────────────────────────────────────────────
// O cérebro — lê o que as outras três inteligências já descobriram +
// memória de aprendizado + config, e recomenda o próximo passo, sempre com
// o porquê. Nunca executa nada sozinho — só registra recomendação.
async function runStrategy(admin: SupaClient, company: Company, config: MarketingAiConfig, anthropicKey: string): Promise<{ recommendations: number }> {
  const [{ data: insights }, { data: memory }, { data: recentContent }] = await Promise.all([
    admin.from('marketing_ai_insights').select('pillar, title, description, impact').eq('company_id', company.id).eq('status', 'open').order('created_at', { ascending: false }).limit(10),
    admin.from('marketing_ai_memory').select('key, learning, confidence').eq('company_id', company.id),
    admin.from('marketing_ai_content').select('status, format, performance').eq('company_id', company.id).order('created_at', { ascending: false }).limit(10),
  ])

  const prompt = `${composeMarketingAgentPreamble(config, company)}

Agora você está atuando como Strategy Intelligence — o cérebro que decide o que fazer a seguir.
Frequência de postagem configurada: ${config.posting_frequency}.

Insights abertos (Tracking + Competitor):
${insights?.length ? insights.map(i => `- [${i.pillar}/${i.impact}] ${i.title}: ${i.description}`).join('\n') : 'nenhum ainda.'}

Aprendizados acumulados:
${memory?.length ? memory.map(m => `- ${m.learning} (confiança: ${m.confidence})`).join('\n') : 'nenhum ainda — sistema recém-começou.'}

Conteúdo recente (status/formato):
${recentContent?.length ? recentContent.map(c => `- ${c.status} · ${c.format ?? '?'}`).join('\n') : 'nenhum ainda.'}

Responda com o que fazer a seguir. Retorne APENAS um JSON array de até 3 recomendações: {"recommendation": "ação concreta", "reasoning": "por que, citando os dados acima"}. Se não houver dado suficiente pra recomendar algo com confiança, diga isso numa única recomendação pedindo mais coleta de dados — não invente justificativa.`

  const raw = await callClaude(anthropicKey, prompt, 1000)
  const recs = parseJsonArray<{ recommendation: string; reasoning: string }>(raw)
  for (const r of recs) {
    await admin.from('marketing_ai_strategy_log').insert({ company_id: company.id, recommendation: r.recommendation, reasoning: r.reasoning })
  }
  if (recs.length > 0) await logActivity(admin, company.id, 'strategy', recs[0].recommendation, recs[0].reasoning)
  return { recommendations: recs.length }
}

// ── Chat (o agente conversando de verdade) ─────────────────────────────────
// Primeira versão: uma chamada só (sem tool-calling ainda) — o contexto das
// quatro inteligências é injetado direto no prompt. Escopo 100% próprio:
// nunca lê agent_messages/posts do módulo Agentes, só as tabelas
// marketing_ai_*. Histórico persistido em marketing_ai_messages.
async function runChat(admin: SupaClient, company: Company, config: MarketingAiConfig, anthropicKey: string, message: string): Promise<{ reply: string }> {
  const [{ data: history }, { data: insights }, { data: content }, { data: competitors }, { data: strategyLog }] = await Promise.all([
    admin.from('marketing_ai_messages').select('role, content').eq('company_id', company.id).order('created_at', { ascending: false }).limit(20),
    admin.from('marketing_ai_insights').select('pillar, title, description, impact, status').eq('company_id', company.id).order('created_at', { ascending: false }).limit(10),
    admin.from('marketing_ai_content').select('idea, status, format').eq('company_id', company.id).order('created_at', { ascending: false }).limit(10),
    admin.from('marketing_ai_competitors').select('name, followers, avg_engagement').eq('company_id', company.id),
    admin.from('marketing_ai_strategy_log').select('recommendation, status').eq('company_id', company.id).order('created_at', { ascending: false }).limit(5),
  ])

  await admin.from('marketing_ai_messages').insert({ company_id: company.id, role: 'user', content: message })

  const contextBlock = `Insights recentes: ${insights?.length ? insights.map(i => `[${i.pillar}/${i.status}] ${i.title}`).join('; ') : 'nenhum ainda'}.
Conteúdo recente: ${content?.length ? content.map(c => `${c.idea ?? '(sem título)'} (${c.status})`).join('; ') : 'nenhum ainda'}.
Concorrentes monitorados: ${competitors?.length ? competitors.map(c => `${c.name} (${c.followers ?? '?'} seguidores)`).join('; ') : 'nenhum ainda'}.
Recomendações recentes: ${strategyLog?.length ? strategyLog.map(s => `${s.recommendation} (${s.status})`).join('; ') : 'nenhuma ainda'}.`

  const systemPrompt = `${composeMarketingAgentPreamble(config, company)}

Você está conversando diretamente com o dono do negócio. Responda em texto corrido, sem markdown (sem **, ##, listas com marcadores). Seja direto e específico, citando os dados reais abaixo quando fizer sentido — nunca invente número que não esteja neles.

Dados reais que você tem agora:
${contextBlock}`

  const recentHistory = (history ?? []).slice().reverse().slice(-10)
  const messages = [...recentHistory.map(h => ({ role: h.role, content: h.content })), { role: 'user', content: message }]

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 800, system: systemPrompt, messages }),
  })
  if (!res.ok) throw new Error(`Claude error: ${await res.text()}`)
  const data = await res.json()
  const reply = data.content?.[0]?.text ?? ''

  await admin.from('marketing_ai_messages').insert({ company_id: company.id, role: 'assistant', content: reply })
  return { reply }
}

// ── Decision Pipeline (modo cron) ──────────────────────────────────────────
// 1 Tracking → 2 Competitors → 3 Strategy → 4 Content (só se fizer sentido).
// Só roda pra empresas que têm marketing_ai_config (opt-in explícito nas
// Configurações do Marketing AI — nunca liga sozinho pra ninguém).
async function runPipelineForCompany(admin: SupaClient, company: Company, apifyToken: string | null, anthropicKey: string, replicateKey: string | null): Promise<void> {
  const config = await getConfig(admin, company.id)
  if (!config) return // não fez onboarding do Marketing AI ainda

  if (apifyToken) {
    await runTracking(admin, company, config, apifyToken, anthropicKey).catch(e => console.error('pipeline tracking error:', e))
    await runCompetitors(admin, company, config, apifyToken, anthropicKey).catch(e => console.error('pipeline competitor error:', e))
  }
  await runStrategy(admin, company, config, anthropicKey).catch(e => console.error('pipeline strategy error:', e))
  if (config.content_pillars.length > 0) {
    await runContent(admin, company, config, anthropicKey, replicateKey).catch(e => console.error('pipeline content error:', e))
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? anonKey
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')
    const apifyToken = Deno.env.get('APIFY_TOKEN') ?? null
    const replicateKey = Deno.env.get('REPLICATE_API_KEY') ?? null
    const cronSecretEnv = Deno.env.get('CRON_SECRET')
    if (!anthropicKey) return json({ error: 'ANTHROPIC_API_KEY não configurada.' }, 503)

    const admin = createClient(supabaseUrl, serviceKey)
    const body = await req.json().catch(() => ({})) as Record<string, unknown>
    const isCron = cronSecretEnv && body.cron_secret === cronSecretEnv

    if (isCron) {
      const { data: companies } = await admin.from('companies').select('id, business_name, business_type, city, instagram_url, goal').eq('active', true)
      let processed = 0
      for (const company of (companies ?? []) as Company[]) {
        try {
          await runPipelineForCompany(admin, company, apifyToken, anthropicKey, replicateKey)
          processed++
        } catch (e) {
          console.error(`marketing-ai cron: company ${company.id} error:`, e)
        }
      }
      return json({ ok: true, cron: true, processed })
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Unauthorized' }, 401)
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } })
    const { data: { user }, error: userErr } = await userClient.auth.getUser()
    if (userErr || !user) return json({ error: 'Unauthorized' }, 401)

    const { data: company } = await admin.from('companies').select('id, business_name, business_type, city, instagram_url, goal').eq('user_id', user.id).maybeSingle()
    if (!company) return json({ error: 'Empresa não encontrada.' }, 404)

    const action = body.action as string
    const config = await getConfig(admin, company.id)
    if (!config) return json({ error: 'Configure o Marketing AI primeiro (aba Configurações).' }, 400)

    if (action === 'run_tracking') {
      if (!apifyToken) return json({ error: 'APIFY_TOKEN não configurado.' }, 503)
      const r = await runTracking(admin, company as Company, config, apifyToken, anthropicKey)
      return json({ ok: true, ...r })
    }
    if (action === 'run_competitors') {
      if (!apifyToken) return json({ error: 'APIFY_TOKEN não configurado.' }, 503)
      const r = await runCompetitors(admin, company as Company, config, apifyToken, anthropicKey)
      return json({ ok: true, ...r })
    }
    if (action === 'run_content') {
      const r = await runContent(admin, company as Company, config, anthropicKey, replicateKey)
      return json({ ok: true, ...r })
    }
    if (action === 'run_strategy') {
      const r = await runStrategy(admin, company as Company, config, anthropicKey)
      return json({ ok: true, ...r })
    }
    if (action === 'chat') {
      const message = String(body.message ?? '').trim()
      if (!message) return json({ error: 'message é obrigatório' }, 400)
      const r = await runChat(admin, company as Company, config, anthropicKey, message)
      return json({ ok: true, ...r })
    }

    return json({ error: 'action inválida. Use run_tracking, run_competitors, run_content, run_strategy ou chat.' }, 400)
  } catch (err) {
    console.error('marketing-ai error:', err)
    return json({ error: String(err) }, 500)
  }
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
}
