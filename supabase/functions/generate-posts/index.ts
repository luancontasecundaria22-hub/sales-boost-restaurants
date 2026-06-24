import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PostDraft {
  legenda: string
  hashtags: string
  image_suggestion: string
  best_time: string
  platform: string
  type: string
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
      headers: {
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 6000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (res.ok) {
      const data = await res.json()
      return (data.content?.[0]?.text ?? '').replace(/```(?:json)?\n?/g, '').trim()
    }

    lastError = await res.text()
    // 5xx (overload/bad gateway) e 429 (rate limit) são transitórios — vale tentar de novo
    const retryable = res.status >= 500 || res.status === 429
    if (!retryable || attempt === 3) {
      throw new Error(`Claude API (${res.status}): ${lastError}`)
    }
    await new Promise(r => setTimeout(r, attempt * 800))
  }
  throw new Error(`Claude API: ${lastError}`)
}

async function generateForCompany(
  db: ReturnType<typeof createClient>,
  companyId: string,
  aiProfile: string,
  anthropicKey: string,
  supabaseUrl: string,
): Promise<number> {

  const MARKETING_NOTIFY_URL = Deno.env.get('MARKETING_BOT_NOTIFY_URL')
  const TELEGRAM_WEBHOOK_SECRET = Deno.env.get('TELEGRAM_WEBHOOK_SECRET')

  async function notifyMarketing(event: string, data?: Record<string, unknown>) {
    if (!MARKETING_NOTIFY_URL || !TELEGRAM_WEBHOOK_SECRET) return
    const { data: chat } = await db
      .from('telegram_conversations')
      .select('telegram_chat_id')
      .eq('customer_id', companyId)
      .eq('bot_type', 'marketing')
      .limit(1)
      .maybeSingle()
    if (!chat?.telegram_chat_id) return
    try {
      await fetch(MARKETING_NOTIFY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-webhook-secret': TELEGRAM_WEBHOOK_SECRET },
        body: JSON.stringify({ event, bot_type: 'marketing', chat_id: chat.telegram_chat_id, company_id: companyId, data }),
      })
    } catch { /* fire-and-forget */ }
  }

  const prompt = `Você é um especialista em marketing digital para pequenos negócios brasileiros.

Abaixo está o perfil completo da empresa. Use TODOS os dados disponíveis para criar conteúdo específico e personalizado — nunca genérico.

---
${aiProfile}
---

Crie exatamente 4 posts para Instagram com legendas completas e prontas para copiar e publicar.

Retorne APENAS um array JSON válido, sem markdown, sem explicação:
[
  {
    "type": "educativo",
    "legenda": "legenda completa com emojis e quebras de linha naturais, pronta para publicar",
    "hashtags": "#tag1 #tag2 #tag3 #tag4 #tag5 #tag6",
    "image_suggestion": "descrição concreta e específica da foto ou vídeo ideal (ex: foto do [prato X] em close, fundo desfocado, luz natural da tarde)",
    "best_time": "ex: Segunda-feira às 19h",
    "platform": "instagram"
  },
  {
    "type": "bastidores",
    ...
  },
  {
    "type": "promocional",
    ...
  },
  {
    "type": "engajamento",
    ...
  }
]

Regras obrigatórias:
1. LEGENDA pronta — quem leu pode copiar e publicar agora. Não escreva templates com [colchetes].
2. Use informações reais do perfil: nome do negócio, cidade, pontos fortes, objetivo.
3. Se tiver dados de avaliações, cite temas que os clientes amam (nunca os negativos).
4. Varie o tipo: 1 educativo (dica do seu segmento), 1 bastidores (humaniza a marca), 1 promocional (oferta ou diferencial), 1 engajamento (pergunta que gera comentário).
5. Tom natural para o segmento. Sem clichês.
6. CTA em cada post alinhado ao objetivo da empresa.
7. Máximo 2.200 caracteres por legenda. Mínimo 5, máximo 8 hashtags específicas.`

  let posts: PostDraft[] | undefined
  let parseError = ''
  for (let attempt = 1; attempt <= 2 && !posts; attempt++) {
    const raw = await callClaude(prompt, anthropicKey)
    try {
      posts = JSON.parse(raw)
    } catch {
      const match = raw.match(/\[\s*\{[\s\S]*?\}\s*\]/)
      if (match) {
        try { posts = JSON.parse(match[0]) } catch { /* try again below */ }
      }
    }
    if (!posts) parseError = `Claude retornou JSON inválido (tentativa ${attempt})`
  }

  if (!posts || !Array.isArray(posts) || posts.length === 0) throw new Error(parseError || 'Nenhum post gerado')

  const rows = posts.map((p: PostDraft) => ({
    company_id: companyId,
    content: `${p.legenda}\n\n${p.hashtags}`.trim(),
    image_suggestion: p.image_suggestion ?? null,
    best_time: p.best_time ?? null,
    platform: p.platform ?? 'instagram',
    status: 'rascunho',
  }))

  const { error } = await db.from('posts').insert(rows)
  if (error) throw error

  notifyMarketing(db, companyId, 'POST_APPROVED', {
    title: `${rows.length} novo(s) post(s) gerado(s)`,
    count: rows.length,
  })

  return rows.length
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey    = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!anthropicKey) return json({ error: 'ANTHROPIC_API_KEY não configurada' }, 500)

    const authHeader = req.headers.get('Authorization')
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {}
    const cronSecret = (body as Record<string,string>)?.cron_secret
    const isCron = cronSecret && cronSecret === Deno.env.get('CRON_SECRET')

    const db = createClient(supabaseUrl, serviceKey)
    let companyIds: string[] = []

    if (isCron) {
      const { data: companies } = await db
        .from('companies')
        .select('id')
        .not('ai_profile', 'is', null)
      companyIds = (companies ?? []).map((c: { id: string }) => c.id)
    } else {
      if (!authHeader) return json({ error: 'Unauthorized' }, 401)
      const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } })
      const { data: { user }, error: authErr } = await userClient.auth.getUser()
      if (authErr || !user) return json({ error: 'Unauthorized' }, 401)

      const { data: company } = await db
        .from('companies')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()
      if (!company) return json({ error: 'Empresa não encontrada' }, 404)

      // Sempre reconstrói o perfil antes de gerar posts
      await buildProfile(db, authHeader, supabaseUrl)

      companyIds = [company.id]
    }

    if (companyIds.length === 0) return json({ generated: 0, message: 'Nenhuma empresa encontrada' })

    let totalGenerated = 0
    const errors: string[] = []

    for (const cid of companyIds) {
      try {
        const { data: co } = await db.from('companies').select('ai_profile').eq('id', cid).single()
        if (!co?.ai_profile) {
          errors.push(`${cid}: perfil vazio após atualização`)
          continue
        }
        const count = await generateForCompany(db, cid, co.ai_profile, anthropicKey, supabaseUrl)
        totalGenerated += count
      } catch (e) {
        console.error(`generate-posts: falha para empresa ${cid}:`, e)
        errors.push(`${cid}: ${String(e)}`)
      }
    }

    return json({
      generated: totalGenerated,
      companies: companyIds.length,
      errors: errors.length > 0 ? errors : undefined,
      message: totalGenerated === 0 ? (errors[0] ?? 'Não foi possível gerar posts.') : undefined,
    })

  } catch (err) {
    console.error('generate-posts error:', err)
    return json({ error: String(err) }, 500)
  }
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
}
