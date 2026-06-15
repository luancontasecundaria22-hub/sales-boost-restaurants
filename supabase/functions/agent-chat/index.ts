import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const tools = [
  {
    name: 'create_post',
    description: 'Cria um rascunho de post para aprovação do dono. NUNCA publica diretamente.',
    input_schema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'Texto completo do post' },
        platform: {
          type: 'string',
          enum: ['instagram', 'whatsapp', 'email'],
          description: 'Canal de publicação',
        },
        image_suggestion: {
          type: 'string',
          description: 'Descrição da imagem ou visual ideal para acompanhar o post (opcional)',
        },
        best_time: {
          type: 'string',
          description: 'Melhor dia/horário para publicar, ex: "Segunda às 12h" (opcional)',
        },
      },
      required: ['content', 'platform'],
    },
  },
  {
    name: 'create_multiple_posts',
    description: 'Cria vários rascunhos de posts de uma vez. Use quando pedirem uma semana de conteúdo.',
    input_schema: {
      type: 'object',
      properties: {
        posts: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              content: { type: 'string' },
              platform: { type: 'string', enum: ['instagram', 'whatsapp', 'email'] },
              image_suggestion: { type: 'string' },
              best_time: { type: 'string' },
            },
            required: ['content', 'platform'],
          },
        },
      },
      required: ['posts'],
    },
  },
]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Unauthorized' }, 401)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? supabaseAnonKey
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')

    if (!anthropicKey) {
      return json({
        ok: true,
        reply: 'Agente não configurado. Configure ANTHROPIC_API_KEY no projeto Supabase.',
        postsCreated: 0,
      })
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: userErr } = await userClient.auth.getUser()
    if (userErr || !user) return json({ error: 'Unauthorized' }, 401)

    const { message, history } = await req.json()
    if (!message) return json({ error: 'message é obrigatório' }, 400)

    const admin = createClient(supabaseUrl, serviceKey)

    const { data: company } = await admin
      .from('companies')
      .select('id, business_name, business_type, city, website_url, instagram_url, goal')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!company) {
      return json({ error: 'Empresa não encontrada. Complete o onboarding primeiro.' }, 404)
    }

    const systemPrompt = `Você é o agente pessoal de crescimento do negócio "${company.business_name}".

Contexto:
- Tipo: ${company.business_type ?? 'não informado'}
- Cidade: ${company.city ?? 'não informada'}
- Site: ${company.website_url ?? 'não informado'}
- Instagram: ${company.instagram_url ?? 'não informado'}
- Objetivo: ${company.goal ?? 'não informado'}

REGRAS:
- NUNCA publique nada diretamente — sempre crie rascunhos via ferramentas.
- Todo conteúdo precisa de aprovação do dono antes de ir ao ar.
- Escreva sempre em português brasileiro.
- Adapte o tom ao tipo de negócio (${company.business_type ?? 'estabelecimento'}).
- Seja direto e prático — o dono tem pouco tempo.
- Para "posts da semana" ou "conteúdo semanal": use create_multiple_posts com 5 posts variados.
- Para um post específico: use create_post.
- Após criar posts, mencione que eles aparecem na aba Posts para aprovação.`

    const messages = [
      ...(history ?? []),
      { role: 'user', content: message },
    ]

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        system: systemPrompt,
        tools,
        messages,
      }),
    })

    if (!claudeRes.ok) {
      const err = await claudeRes.text()
      return json({ error: `Claude API error: ${err}` }, 502)
    }

    const claudeData = await claudeRes.json()
    let postsCreated = 0

    for (const block of claudeData.content ?? []) {
      if (block.type !== 'tool_use') continue

      if (block.name === 'create_post') {
        const input = block.input
        await admin.from('posts').insert({
          company_id: company.id,
          content: input.content,
          platform: input.platform ?? 'instagram',
          image_suggestion: input.image_suggestion ?? null,
          best_time: input.best_time ?? null,
          status: 'rascunho',
        })
        postsCreated++
      }

      if (block.name === 'create_multiple_posts') {
        for (const post of block.input.posts ?? []) {
          await admin.from('posts').insert({
            company_id: company.id,
            content: post.content,
            platform: post.platform ?? 'instagram',
            image_suggestion: post.image_suggestion ?? null,
            best_time: post.best_time ?? null,
            status: 'rascunho',
          })
          postsCreated++
        }
      }
    }

    const replyText = claudeData.content
      ?.filter((b: { type: string }) => b.type === 'text')
      .map((b: { text: string }) => b.text)
      .join('\n') ?? ''

    const reply = replyText ||
      (postsCreated > 0
        ? `Criei ${postsCreated} rascunho(s) para sua aprovação na aba Posts.`
        : 'Feito!')

    await admin.from('agent_messages').insert([
      { company_id: company.id, role: 'user', content: message },
      { company_id: company.id, role: 'assistant', content: reply },
    ])

    return json({ ok: true, reply, postsCreated })
  } catch (err) {
    return json({ error: String(err) }, 500)
  }
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
