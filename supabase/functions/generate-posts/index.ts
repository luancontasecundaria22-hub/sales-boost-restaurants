import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PLAN_LIMITS: Record<string, number> = {
  free: 5, basic: 15, pro: 35, ultra: 50,
}

interface PostDraft {
  legenda: string; hashtags: string; image_suggestion: string
  best_time: string; platform: string; type: string; reasoning: string
}

interface ImageResult {
  post_id: string
  step: string
  error: string | null
  url: string | null
}

async function buildProfile(db: ReturnType<typeof createClient>, authHeader: string, supabaseUrl: string): Promise<void> {
  await fetch(`${supabaseUrl}/functions/v1/update-company-profile`, {
    method: 'POST',
    headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
  })
}

async function callClaude(prompt: string, anthropicKey: string): Promise<string> {
  let lastError = ''
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 6000, messages: [{ role: 'user', content: prompt }] }),
    })
    if (res.ok) {
      const data = await res.json()
      return (data.content?.[0]?.text ?? '').replace(/```(?:json)?\n?/g, '').trim()
    }
    lastError = await res.text()
    const retryable = res.status >= 500 || res.status === 429
    if (!retryable || attempt === 3) throw new Error(`Claude API (${res.status}): ${lastError}`)
    await new Promise(r => setTimeout(r, attempt * 800))
  }
  throw new Error(`Claude API: ${lastError}`)
}

async function generateAndStoreImage(
  imageSuggestion: string,
  openaiKey: string,
  supabaseUrl: string,
  serviceKey: string
): Promise<{ url: string | null; step: string; error: string | null }> {
  try {
    const dallePrompt = [
      'Professional Instagram marketing photo for a Brazilian small business.',
      'Commercial photography style, high quality, warm lighting, vibrant colors, clean composition.',
      'Absolutely NO people, NO faces, NO children in the image.',
      'Focus only on objects, props, scenery, and atmosphere that evoke:', imageSuggestion,
      'No text overlays. No logos. Square format.',
    ].join(' ')

    const dalleRes = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'dall-e-3', prompt: dallePrompt, n: 1, size: '1024x1024', quality: 'standard', response_format: 'url' }),
    })
    if (!dalleRes.ok) {
      const errText = await dalleRes.text()
      console.error('DALL-E error:', dalleRes.status, errText)
      return { url: null, step: 'dalle_call', error: `DALL-E ${dalleRes.status}: ${errText.slice(0, 300)}` }
    }

    const dalleData = await dalleRes.json()
    const tempUrl = dalleData.data?.[0]?.url
    if (!tempUrl) {
      console.error('DALL-E: no URL in response', JSON.stringify(dalleData).slice(0, 200))
      return { url: null, step: 'dalle_parse', error: 'No URL in DALL-E response' }
    }

    const imgRes = await fetch(tempUrl)
    if (!imgRes.ok) {
      console.error('Image download failed:', imgRes.status)
      return { url: null, step: 'img_download', error: `Download failed: ${imgRes.status}` }
    }
    const imgBuffer = await imgRes.arrayBuffer()

    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.png`
    const uploadUrl = `${supabaseUrl}/storage/v1/object/post-images/${fileName}`
    const uploadRes = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'image/png',
        'x-upsert': 'true',
      },
      body: imgBuffer,
    })
    if (!uploadRes.ok) {
      const errText = await uploadRes.text()
      console.error('Storage upload error:', uploadRes.status, errText)
      return { url: null, step: 'storage_upload', error: `Storage ${uploadRes.status}: ${errText.slice(0, 300)}` }
    }

    const publicUrl = `${supabaseUrl}/storage/v1/object/public/post-images/${fileName}`
    return { url: publicUrl, step: 'done', error: null }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('generateAndStoreImage exception:', msg)
    return { url: null, step: 'exception', error: msg.slice(0, 300) }
  }
}

async function countMonthlyPosts(db: ReturnType<typeof createClient>, companyId: string): Promise<number> {
  const now = new Date()
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
  const { count } = await db.from('posts').select('id', { count: 'exact', head: true })
    .eq('company_id', companyId).gte('created_at', start)
  return count ?? 0
}

async function runForCompany(
  db: ReturnType<typeof createClient>,
  companyId: string,
  anthropicKey: string,
  openaiKey: string | null,
  supabaseUrl: string,
  serviceKey: string
): Promise<{ generated: number; quota_reached: boolean; monthly_count: number; limit: number; image_results?: ImageResult[] }> {
  const { data: co } = await db.from('companies').select('ai_profile, plan').eq('id', companyId).single()
  if (!co?.ai_profile) throw new Error('Perfil vazio')

  const plan = (co.plan ?? 'free') as string
  const limit = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free
  const monthlyCount = await countMonthlyPosts(db, companyId)
  const remaining = Math.max(0, limit - monthlyCount)

  if (remaining === 0) return { generated: 0, quota_reached: true, monthly_count: monthlyCount, limit }

  const toGenerate = Math.min(4, remaining)

  const prompt = `Você é o Agente de Marketing especialista em marketing digital para pequenos negócios brasileiros.

Abaixo está o perfil completo da empresa. Use TODOS os dados disponíveis para criar conteúdo específico e personalizado — nunca genérico.

---
${co.ai_profile}
---

Crie exatamente ${toGenerate} post${toGenerate > 1 ? 's' : ''} para Instagram com legendas completas e prontas para copiar e publicar.

Retorne APENAS um array JSON válido, sem markdown:
[
  {
    "type": "educativo",
    "legenda": "legenda completa com emojis, pronta para publicar",
    "hashtags": "#tag1 #tag2 #tag3 #tag4 #tag5",
    "image_suggestion": "image description in English, ONLY objects and scenery, NO people or children",
    "best_time": "Segunda-feira às 19h",
    "platform": "instagram",
    "reasoning": "por que este post é estratégico"
  }
]
Regras: legenda pronta (sem colchetes), dados reais, tom natural, CTA alinhado, image_suggestion SEMPRE em inglês e NUNCA com pessoas.`

  let posts: PostDraft[] | undefined
  for (let attempt = 1; attempt <= 2 && !posts; attempt++) {
    const raw = await callClaude(prompt, anthropicKey)
    try { posts = JSON.parse(raw) } catch {
      const match = raw.match(/\[\s*\{[\s\S]*?\}\s*\]/)
      if (match) try { posts = JSON.parse(match[0]) } catch { /* retry */ }
    }
  }
  if (!posts || !Array.isArray(posts) || posts.length === 0) throw new Error('Claude não gerou posts')
  posts = posts.slice(0, toGenerate)

  const rows = posts.map((p: PostDraft) => ({
    company_id: companyId,
    content: `${p.legenda}\n\n${p.hashtags}`.trim(),
    image_suggestion: p.image_suggestion ?? null,
    image_url: null,
    best_time: p.best_time ?? null,
    platform: p.platform ?? 'instagram',
    status: 'rascunho',
    agent_notes: p.reasoning ?? null,
  }))

  const { data: inserted, error: insertError } = await db.from('posts').insert(rows).select('id, image_suggestion')
  if (insertError) throw new Error(`DB: ${insertError.message}`)

  const imageResults: ImageResult[] = []

  if (openaiKey && inserted && inserted.length > 0) {
    const settled = await Promise.allSettled(
      inserted.map(async (row: { id: string; image_suggestion: string | null }) => {
        if (!row.image_suggestion) {
          imageResults.push({ post_id: row.id, step: 'skipped', error: 'no image_suggestion', url: null })
          return
        }
        const result = await generateAndStoreImage(row.image_suggestion, openaiKey, supabaseUrl, serviceKey)
        imageResults.push({ post_id: row.id, ...result })
        if (!result.url) return
        const { error: updErr } = await db.from('posts').update({ image_url: result.url }).eq('id', row.id)
        if (updErr) {
          console.error('update image_url:', updErr.message)
          imageResults[imageResults.length - 1].error = `DB update: ${updErr.message}`
        }
      })
    )
    settled.forEach((r, i) => {
      if (r.status === 'rejected') {
        imageResults[i] = imageResults[i] ?? { post_id: inserted[i]?.id, step: 'promise_rejected', error: String(r.reason), url: null }
      }
    })
  } else if (!openaiKey) {
    imageResults.push({ post_id: '', step: 'skipped', error: 'OPENAI_API_KEY not set', url: null })
  }

  return { generated: rows.length, quota_reached: false, monthly_count: monthlyCount + rows.length, limit, image_results: imageResults }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey    = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')
    const openaiKey = Deno.env.get('OPENAI_API_KEY') ?? null
    const cronSecretEnv = Deno.env.get('CRON_SECRET')

    if (!anthropicKey) return json({ error: 'Serviço indisponível.', generated: 0 }, 200)

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {}
    const isCron = cronSecretEnv && (body as Record<string, string>)?.cron_secret === cronSecretEnv

    const db = createClient(supabaseUrl, serviceKey)

    if (isCron) {
      const { data: companies } = await db.from('companies').select('id').not('ai_profile', 'is', null)
      let total = 0, skipped = 0
      for (const c of (companies ?? [])) {
        try {
          const r = await runForCompany(db, c.id, anthropicKey, openaiKey, supabaseUrl, serviceKey)
          total += r.generated
          if (r.quota_reached) skipped++
        } catch (e) { console.error('cron company error:', e) }
      }
      return json({ generated: total, quota_reached_count: skipped })
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Não autorizado', generated: 0 }, 401)
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } })
    const { data: { user }, error: authErr } = await userClient.auth.getUser()
    if (authErr || !user) return json({ error: 'Não autorizado', generated: 0 }, 401)

    const { data: company } = await db.from('companies').select('id, ai_profile, plan').eq('user_id', user.id).maybeSingle()
    if (!company) return json({ error: 'Empresa não encontrada', generated: 0 }, 404)

    if (!company.ai_profile) {
      await buildProfile(db, authHeader, supabaseUrl)
      const { data: co2 } = await db.from('companies').select('ai_profile').eq('id', company.id).single()
      if (!co2?.ai_profile) return json({ generated: 0, message: 'Perfil incompleto. Preencha as Configurações.' })
    } else {
      buildProfile(db, authHeader, supabaseUrl)
    }

    const result = await runForCompany(db, company.id, anthropicKey, openaiKey, supabaseUrl, serviceKey)
    return json({ ...result, openai_configured: openaiKey !== null })

  } catch (err) {
    console.error('top-level error:', err)
    return json({ error: friendlyError(err), generated: 0 }, 200)
  }
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
}

function friendlyError(e: unknown): string {
  const msg = (e instanceof Error ? e.message : String(e)).toLowerCase()
  if (msg.includes('credit') || msg.includes('balance')) return 'Agente de Marketing temporariamente indisponível. Tente novamente.'
  if (msg.includes('rate') || msg.includes('429') || msg.includes('overload')) return 'Agente de Marketing muito ocupado. Tente em alguns minutos.'
  return 'Agente de Marketing não conseguiu gerar posts agora. Tente novamente.'
}
