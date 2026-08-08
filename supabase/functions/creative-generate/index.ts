/**
 * creative-generate — Fase 2: Diretor Criativo + Personalidades + Biblioteca.
 *
 * Gera um post de teste como uma agência de verdade, em dois passos:
 *   1) Diretor Criativo decide o BRIEF (objetivo, formato, sistema visual,
 *      ângulo de hook, CTA, oferta) e escolhe a PERSONALIDADE certa, olhando a
 *      Inteligência (insights) e os recursos disponíveis na Biblioteca.
 *   2) A personalidade EXECUTA o brief, consultando a Biblioteca (o framework/
 *      hook/sistema visual escolhidos) e escreve o post.
 *
 * Grava isolado em marketing_ai_test_content (com o brief) — cai no mesmo QC
 * (content-test: score/regenerate/vault). Nada publica sozinho.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
type SupaClient = ReturnType<typeof createClient>

interface Company { id: string; business_name: string; business_type: string | null; city: string | null; goal: string | null }
interface Config { agent_name: string; brand_voice: string | null; tone: string | null; target_audience: string | null; content_pillars: string[]; marketing_goals: string | null; business_objectives: string | null }
interface Know { kind: string; title: string; content: string; module?: string }

function preamble(config: Config, company: Company): string {
  const name = config.agent_name?.trim() || 'Agente de Marketing'
  return `Você é ${name}, o agente de marketing de "${company.business_name}" (${company.business_type ?? 'negócio'} em ${company.city ?? 'Brasil'}).
Voz da marca: ${config.brand_voice ?? 'não definida'}. Tom: ${config.tone ?? 'não definido'}.
Público-alvo: ${config.target_audience ?? 'não definido'}.
Pilares: ${config.content_pillars.join(', ') || 'não definidos'}.
Objetivos: ${config.marketing_goals ?? config.business_objectives ?? 'crescer e engajar'}.`
}

function defaultConfig(company: Company): Config {
  return { agent_name: 'Agente de Conteúdo', brand_voice: null, tone: null, target_audience: null, content_pillars: ['bastidores', 'novidades', 'depoimentos'], marketing_goals: company.goal ?? null, business_objectives: company.goal ?? null }
}

async function callClaude(anthropicKey: string, prompt: string, maxTokens = 1400): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: maxTokens, messages: [{ role: 'user', content: prompt }] }),
  })
  if (!res.ok) throw new Error(`Claude error: ${await res.text()}`)
  const data = await res.json()
  return (data.content?.[0]?.text ?? '').replace(/```(?:json)?\n?/g, '').trim()
}

function parseObj(raw: string): Record<string, unknown> {
  try { return JSON.parse(raw) } catch { /* */ }
  const m = raw.match(/\{[\s\S]*\}/)
  if (m) { try { return JSON.parse(m[0]) } catch { /* */ } }
  return {}
}

// Extrai um post do texto da IA de forma tolerante: aceita array, objeto único,
// ou JSON cercado de texto. Devolve null só se realmente não houver post.
function extractOne(raw: string): Record<string, unknown> | null {
  const tryParse = (s: string): unknown => { try { return JSON.parse(s) } catch { return null } }
  let v: unknown = tryParse(raw)
  if (!v) { const a = raw.match(/\[[\s\S]*\]/); if (a) v = tryParse(a[0]) }
  if (!v) { const o = raw.match(/\{[\s\S]*\}/); if (o) v = tryParse(o[0]) }
  if (Array.isArray(v)) v = v[0]
  if (v && typeof v === 'object' && ((v as Record<string, unknown>).caption || (v as Record<string, unknown>).idea)) return v as Record<string, unknown>
  return null
}

async function generateImage(businessType: string | null, idea: string, visualSystem?: string): Promise<string | null> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY')
  if (!supabaseUrl || !serviceKey) return null
  try {
    const prompt = `Professional social media photo for a Brazilian small business (${businessType ?? 'negócio'}).${visualSystem ? ` Visual style: ${visualSystem}.` : ''} Commercial photography, warm natural lighting, appetizing and inviting, no people, no text, no logos, no watermark. Evokes: ${idea}`
    const res = await fetch(`${supabaseUrl}/functions/v1/generate-image`, {
      method: 'POST', headers: { Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, size: '1024x1024' }),
    })
    const data = await res.json().catch(() => ({})) as { url?: string }
    return res.ok && data.url ? data.url : null
  } catch (e) { console.error('generateImage error:', e); return null }
}

function listByKind(lib: Know[], kind: string): string {
  return lib.filter(k => k.kind === kind).map(k => `- ${k.title}: ${k.content}`).join('\n') || '(nenhum)'
}
function findContent(lib: Know[], kind: string, title: string | undefined): string {
  if (!title) return ''
  const e = lib.find(k => k.kind === kind && k.title.toLowerCase() === String(title).toLowerCase())
  return e ? `${e.title}: ${e.content}` : ''
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
    const body = await req.json().catch(() => ({})) as Record<string, unknown>
    const bearer = req.headers.get('Authorization') ?? ''
    if (!bearer) return json({ error: 'Unauthorized' }, 401)
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: bearer } } })
    const { data: { user } } = await userClient.auth.getUser()
    if (!user) return json({ error: 'Unauthorized' }, 401)

    const { data: companyRow } = await admin.from('companies').select('id, business_name, business_type, city, goal').eq('user_id', user.id).maybeSingle()
    const company = companyRow as Company | null
    if (!company) return json({ error: 'Empresa não encontrada.' }, 404)

    const kind = ['organico', 'stories', 'campanhas'].includes(String(body.kind)) ? String(body.kind) : 'organico'

    const [{ data: cfgRow }, { data: insRows }, { data: libRows }] = await Promise.all([
      admin.from('marketing_ai_config').select('agent_name, brand_voice, tone, target_audience, content_pillars, marketing_goals, business_objectives').eq('company_id', company.id).maybeSingle(),
      admin.from('marketing_ai_insights').select('pillar, title, description').eq('company_id', company.id).eq('status', 'open').order('created_at', { ascending: false }).limit(6),
      admin.from('marketing_ai_knowledge').select('kind, title, content, module').or(`company_id.is.null,company_id.eq.${company.id}`).in('module', ['core', kind]),
    ])
    const config = (cfgRow as Config | null) ?? defaultConfig(company)
    const insights = (insRows ?? []) as { pillar: string; title: string; description: string }[]
    const lib = (libRows ?? []) as Know[]
    // Conhecimento especializado do módulo que está sendo gerado (Orgânico/Stories/Campanhas).
    const moduleKnow = lib.filter(k => k.module === kind).map(k => `- ${k.title}: ${k.content}`).join('\n') || '(sem específicos ainda)'
    const MOD_LABEL: Record<string, string> = { organico: 'Post Orgânico', stories: 'Stories', campanhas: 'Campanha (mídia paga)' }
    const modLabel = MOD_LABEL[kind] ?? kind

    // ── Passo 1: Diretor Criativo → BRIEF ────────────────────────────────
    const directorPrompt = `${preamble(config, company)}

Você é o DIRETOR CRIATIVO de uma agência. Vai criar um conteúdo do tipo "${modLabel}". Decida o brief usando os insights reais e as boas práticas ESPECÍFICAS desse formato (não use regra genérica).
${insights.length ? `\nInsights abertos:\n${insights.map(i => `- [${i.pillar}] ${i.title}: ${i.description}`).join('\n')}` : ''}

Boas práticas do formato ${modLabel}:\n${moduleKnow}

Personalidades disponíveis:\n${listByKind(lib, 'personality')}
Frameworks de copy:\n${listByKind(lib, 'framework')}
Sistemas visuais:\n${listByKind(lib, 'visual_system')}
Hooks de referência:\n${listByKind(lib, 'hook')}

Decida o brief. Retorne APENAS um JSON:
{"objective":"awareness|engagement|conversion","format":"reel|carrossel|story|foto","visual_system":"<título exato da biblioteca>","personality":"<título exato da biblioteca>","framework":"<título exato da biblioteca>","hook_angle":"ângulo do gancho em 1 frase","cta":"chamada pra ação","offer":"oferta/valor em 1 frase (ou vazio)","reasoning":"por que essas escolhas, citando o insight"}`

    const brief = parseObj(await callClaude(anthropicKey, directorPrompt, 900))
    const personality = String(brief.personality ?? 'Copywriter')

    // ── Passo 2: a personalidade EXECUTA, consultando a biblioteca ───────
    const personaContent = findContent(lib, 'personality', personality) || 'Copywriter: texto claro e persuasivo.'
    const frameworkContent = findContent(lib, 'framework', brief.framework as string | undefined)
    const visualContent = findContent(lib, 'visual_system', brief.visual_system as string | undefined)

    const execPrompt = `${preamble(config, company)}

Você agora EXECUTA como esta personalidade: ${personaContent}

Siga fielmente o brief do Diretor Criativo:
- Objetivo: ${brief.objective ?? '—'}
- Formato: ${brief.format ?? 'foto'}
- Ângulo do hook: ${brief.hook_angle ?? '—'}
- CTA desejado: ${brief.cta ?? '—'}
- Oferta: ${brief.offer ?? '—'}
${frameworkContent ? `\nUse este framework de copy:\n${frameworkContent}` : ''}
${visualContent ? `\nConceito visual a evocar:\n${visualContent}` : ''}

Boas práticas do formato ${modLabel} (siga-as):\n${moduleKnow}

Escreva o post pronto pra publicar. Regras importantes:
- "caption" é APENAS a legenda que vai no Instagram (texto pro público). NUNCA coloque nela instruções de imagem, descrição de foto nem "Slide 1/2/3".
- Se o formato for CARROSSEL, preencha "slides": um array de 3 a 6 slides, cada um {"text": texto curto que aparece no slide, "image": descrição visual da imagem daquele slide em inglês (sem pessoas, sem texto na imagem)}.
- Se for vídeo/reel/story, preencha "video_script" (roteiro de como gravar). Caso contrário, deixe vazio.
Retorne APENAS um JSON array:
[{"idea":"resumo curto do post","caption":"só a legenda do Instagram, texto pro público","hashtags":"#tag1 #tag2 #tag3","cta":"chamada pra ação final","format":"${brief.format ?? 'foto'}","video_script":"","slides":[{"text":"","image":""}]}]`

    const execRaw = await callClaude(anthropicKey, execPrompt, 2000)
    let post = extractOne(execRaw)
    if (!post) {
      // Fallback: uma tentativa direta e simples, garante que o dono sempre recebe um post.
      const fbRaw = await callClaude(anthropicKey, `${preamble(config, company)}

Escreva 1 post de Instagram pronto pra publicar sobre o negócio (formato ${brief.format ?? 'foto'}). Responda SOMENTE com um JSON array, sem nenhum texto antes ou depois:
[{"idea":"resumo curto","caption":"legenda completa","hashtags":"#a #b #c","cta":"chamada pra ação","format":"${brief.format ?? 'foto'}"}]`, 1500)
      post = extractOne(fbRaw)
      if (!post) {
        console.error('creative-generate: parse falhou. exec:', execRaw.slice(0, 300), '| fb:', fbRaw.slice(0, 300))
        return json({ error: 'A IA não retornou um post válido. Tente de novo.' }, 502)
      }
    }

    const fmt = String(post.format ?? brief.format ?? 'foto')
    const idea = post.idea ? String(post.idea) : null
    const caption = post.caption ? String(post.caption) : null

    const { data: inserted, error: insErr } = await admin.from('marketing_ai_test_content').insert({
      company_id: company.id, kind, idea, caption,
      hashtags: post.hashtags ? String(post.hashtags) : null,
      cta: post.cta ? String(post.cta) : (brief.cta as string ?? null),
      format: fmt, reasoning: brief.reasoning as string ?? null,
      video_script: post.video_script ? String(post.video_script) : null, brief, personality,
    }).select('id').single()
    if (insErr) return json({ error: insErr.message }, 500)

    // Imagens: carrossel gera 1 imagem por slide (paralelo, até 6); demais, 1 imagem.
    const visual = brief.visual_system as string | undefined
    const rawSlides = Array.isArray(post.slides) ? (post.slides as { text?: string; image?: string }[]).slice(0, 6) : []
    let mainImage: string | null = null
    let slides: { text: string; image_prompt: string; image_url: string | null }[] | null = null
    if (fmt === 'carrossel' && rawSlides.length > 0) {
      const urls = await Promise.all(rawSlides.map(s => generateImage(company.business_type, String(s.image ?? s.text ?? idea ?? ''), visual)))
      slides = rawSlides.map((s, i) => ({ text: String(s.text ?? ''), image_prompt: String(s.image ?? ''), image_url: urls[i] }))
      mainImage = slides.find(s => s.image_url)?.image_url ?? null
    } else {
      mainImage = await generateImage(company.business_type, String(idea ?? caption ?? ''), visual)
    }
    await admin.from('marketing_ai_test_content').update({ image_url: mainImage, slides }).eq('id', inserted.id)

    return json({ ok: true, id: inserted.id, image_generated: !!mainImage, slides: slides?.length ?? 0, personality, brief })
  } catch (err) {
    console.error('creative-generate error:', err)
    return json({ error: err instanceof Error ? err.message : String(err) }, 500)
  }
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
}
