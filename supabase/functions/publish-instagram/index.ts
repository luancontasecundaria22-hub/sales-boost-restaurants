/**
 * publish-instagram
 * Generates content + image, then publishes directly to Instagram.
 * Can be called manually (by owner) or by run-agents (autonomously).
 *
 * Body: { company_id, caption?, image_prompt?, auto_generate? }
 * - caption: use provided text (skip AI generation)
 * - image_prompt: use provided prompt for image generation
 * - auto_generate: true = let agent generate caption + image prompt autonomously
 *
 * Publica via Instagram Business Login (API with Instagram Login): o token é da
 * própria conta do Instagram, então as chamadas de mídia vão para
 * graph.instagram.com (não graph.facebook.com / Página).
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const IG_API = 'https://graph.instagram.com/v21.0'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const admin = createClient(supabaseUrl, serviceKey)

    const body = await req.json()
    const { company_id, caption: providedCaption, image_prompt: providedPrompt, auto_generate } = body
    if (!company_id) return json({ error: 'company_id is required' }, 400)

    // Fetch company
    const { data: company, error: compErr } = await admin
      .from('companies')
      .select('id, business_name, business_type, city, goal, instagram_user_id, instagram_access_token, instagram_token_expires_at, instagram_auto_post, instagram_post_style')
      .eq('id', company_id)
      .single()

    if (compErr || !company) return json({ error: 'Company not found' }, 404)
    if (!company.instagram_user_id || !company.instagram_access_token) {
      return json({ error: 'Instagram not connected. Go to Integrations to connect.' }, 400)
    }

    // Check token expiry
    if (company.instagram_token_expires_at) {
      const expiresAt = new Date(company.instagram_token_expires_at)
      const daysLeft = (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      if (daysLeft < 0) return json({ error: 'Instagram token expired. Reconnect in Integrations.' }, 401)
      if (daysLeft < 7) await refreshToken(company.id, company.instagram_access_token, admin)
    }

    // Generate caption + image prompt if needed
    let caption = providedCaption
    let imagePrompt = providedPrompt

    if (auto_generate || !caption) {
      const generated = await generateContent(company, admin)
      caption = caption ?? generated.caption
      imagePrompt = imagePrompt ?? generated.imagePrompt

      if (generated.reasoning) {
        await admin.from('agent_messages').insert({
          company_id: company.id,
          role: 'assistant',
          agent_role: 'cmo',
          content: `[Agente de Marketing • Raciocínio] ${generated.reasoning}`,
        })
      }
    }

    // Get image URL
    const imageUrl = await getImageUrl(imagePrompt ?? `${company.business_type ?? 'business'} ${company.business_name}`)

    // Publish to Instagram
    const mediaId = await createMediaContainer(company.instagram_user_id, company.instagram_access_token, imageUrl, caption)
    await publishMedia(company.instagram_user_id, company.instagram_access_token, mediaId)

    // Log in instagram_posts table
    await admin.from('instagram_posts').insert({
      company_id: company.id,
      instagram_media_id: mediaId,
      caption,
      image_url: imageUrl,
      status: 'published',
      posted_at: new Date().toISOString(),
    })

    // Log in agent_messages
    await admin.from('agent_messages').insert({
      company_id: company.id,
      role: 'assistant',
      agent_role: 'cmo',
      content: `[Publicado automaticamente no Instagram] ${caption.slice(0, 120)}...`,
    })

    return json({ ok: true, media_id: mediaId, caption, image_url: imageUrl })
  } catch (err) {
    console.error('publish-instagram error:', err)
    return json({ error: String(err) }, 500)
  }
})

// ── Autonomous content generation ──────────────────────────────────────────
async function generateContent(company: Record<string, unknown>, admin: ReturnType<typeof createClient>) {
  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')!
  const companyId = company.id as string
  const name = company.business_name as string
  const type = (company.business_type as string | null) ?? 'negócio'
  const city = (company.city as string | null) ?? 'Brasil'
  const goal = (company.goal as string | null) ?? 'crescer'

  const [reviewsRes, postsRes, messagesRes] = await Promise.all([
    admin.from('reviews').select('rating, text, review_date, sentiment').eq('company_id', companyId).order('review_date', { ascending: false }).limit(8),
    admin.from('instagram_posts').select('caption, posted_at, likes_count').eq('company_id', companyId).order('posted_at', { ascending: false }).limit(5),
    admin.from('agent_messages').select('content').eq('company_id', companyId).eq('agent_role', 'cmo').order('created_at', { ascending: false }).limit(3),
  ])

  const reviews = reviewsRes.data ?? []
  const pastPosts = postsRes.data ?? []
  const pastReasoning = messagesRes.data ?? []

  const today = new Date()
  const dateStr = today.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
  const month = today.getMonth() + 1

  const seasonHints: Record<number, string> = {
    1: 'Janeiro: Réveillon acabou, época de verão, festas de início de ano',
    2: 'Fevereiro: Carnaval se aproxima, calor intenso, festas temáticas',
    3: 'Março: Pós-Carnaval, início do outono, Dia Internacional da Mulher (8/3)',
    4: 'Abril: Páscoa, Tiradentes, início de temporada mais fria',
    5: 'Maio: Dia das Mães (segunda sexta), Dia do Trabalho (1/5)',
    6: 'Junho: Festas Juninas, São João, comidas típicas, inverno',
    7: 'Julho: Férias escolares, inverno, festas de inverno, viagens',
    8: 'Agosto: Dia dos Pais (segunda), Festa do Peão de Barretos',
    9: 'Setembro: Independência (7/9), início de primavera',
    10: 'Outubro: Outubro Rosa, Halloween, Dia das Crianças (12/10)',
    11: 'Novembro: Black Friday, Dia de Finados, Proclamação da República (15/11)',
    12: 'Dezembro: Natal, Réveillon, festas de fim de ano, alta temporada',
  }

  const reviewSummary = reviews.length > 0
    ? reviews.map(r => `[${r.rating}★] "${r.text?.slice(0, 100) ?? ''}"`).join('\n')
    : 'Nenhuma avaliação recente disponível.'

  const postHistory = pastPosts.length > 0
    ? pastPosts.map(p => `- "${p.caption?.slice(0, 80) ?? ''}" (${p.posted_at?.split('T')[0] ?? ''}${p.likes_count ? `, ${p.likes_count} curtidas` : ''})`).join('\n')
    : 'Nenhum post anterior registrado.'

  const previousReasoning = pastReasoning.length > 0
    ? pastReasoning.map(m => m.content).join('\n').slice(0, 400)
    : ''

  const systemPrompt = `Você é o Agente de Marketing autônomo e estratégico do ${name} (${type} em ${city}).
Seu objetivo: ${goal}.

Você trabalha 24/7 de forma autônoma. Antes de criar qualquer conteúdo, você ANALISA o contexto real do negócio e toma decisões estratégicas.`

  const userPrompt = `# Contexto do dia: ${dateStr}
${seasonHints[month] ?? ''}

# Avaliações recentes dos clientes:
${reviewSummary}

# Últimos posts publicados:
${postHistory}

${previousReasoning ? `# Raciocínio anterior do Agente de Marketing:\n${previousReasoning}\n` : ''}

# Sua tarefa:
Analise tudo acima e decida o post mais estratégico para publicar HOJE no Instagram.

Responda em JSON válido:
{
  "reasoning": "Seu raciocínio em 2-3 frases: o que você observou nos dados e por que escolheu esse tema",
  "caption": "Legenda completa do post com emojis e hashtags (max 2200 chars)",
  "image_prompt": "Descrição em inglês detalhada para gerar imagem fotorrealista e profissional"
}`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1200,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  })

  if (!res.ok) throw new Error(`Claude error: ${await res.text()}`)
  const data = await res.json()
  const text = data.content?.[0]?.text ?? '{}'
  const match = text.match(/\{[\s\S]*\}/)
  const parsed = JSON.parse(match ? match[0] : text)

  return {
    caption: parsed.caption ?? '',
    imagePrompt: parsed.image_prompt ?? type,
    reasoning: parsed.reasoning ?? '',
  }
}

// ── Get image URL (DALL-E or Unsplash fallback) ─────────────────────────────
async function getImageUrl(prompt: string): Promise<string> {
  const openaiKey = Deno.env.get('OPENAI_API_KEY')
  if (openaiKey) {
    try {
      const res = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: { Authorization: `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'dall-e-3', prompt, n: 1, size: '1024x1024', quality: 'standard' }),
      })
      if (res.ok) {
        const d = await res.json()
        return d.data[0].url
      }
    } catch { /* fall through */ }
  }

  const unsplashKey = Deno.env.get('UNSPLASH_ACCESS_KEY')
  if (unsplashKey) {
    const query = prompt.split(' ').slice(0, 4).join('+')
    const res = await fetch(`https://api.unsplash.com/photos/random?query=${query}&orientation=squarish&content_filter=high`, {
      headers: { Authorization: `Client-ID ${unsplashKey}` },
    })
    if (res.ok) {
      const d = await res.json()
      return d.urls.regular
    }
  }

  throw new Error('No image source configured. Add OPENAI_API_KEY or UNSPLASH_ACCESS_KEY to Supabase secrets.')
}

// ── Instagram Graph API helpers (graph.instagram.com — Instagram Login) ──────
async function createMediaContainer(igUserId: string, token: string, imageUrl: string, caption: string): Promise<string> {
  const res = await fetch(`${IG_API}/${igUserId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_url: imageUrl, caption, access_token: token }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(`Instagram media container failed: ${err.error?.message ?? JSON.stringify(err)}`)
  }
  const d = await res.json()
  return d.id
}

async function publishMedia(igUserId: string, token: string, creationId: string): Promise<void> {
  const res = await fetch(`${IG_API}/${igUserId}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creation_id: creationId, access_token: token }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(`Instagram publish failed: ${err.error?.message ?? JSON.stringify(err)}`)
  }
}

async function refreshToken(companyId: string, currentToken: string, admin: ReturnType<typeof createClient>) {
  try {
    const res = await fetch(`https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${currentToken}`)
    if (!res.ok) return
    const { access_token, expires_in } = await res.json()
    const expiresAt = new Date(Date.now() + (expires_in ?? 5184000) * 1000).toISOString()
    await admin.from('companies').update({ instagram_access_token: access_token, instagram_token_expires_at: expiresAt }).eq('id', companyId)
  } catch { /* silent */ }
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
}
