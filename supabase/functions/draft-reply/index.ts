import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function buildReviewReplyPrompt(company: { business_name: string; business_type: string | null; city: string | null }, review: { author: string; rating: number; text: string | null; review_date: string }): string {
  return `Você é o gerente de ${company.business_name} (${company.business_type ?? 'estabelecimento'} em ${company.city ?? 'Brasil'}).

Escreva uma resposta profissional, humana e cordial para esta avaliação no Google:

**Avaliador:** ${review.author}
**Nota:** ${review.rating}/5 estrelas
**Comentário:** ${review.text ?? '(sem comentário)'}
**Data:** ${review.review_date}

Regras:
- Máximo 4 frases
- Comece agradecendo pelo feedback, mesmo que negativo
- Se a nota for baixa (1-2): reconheça o problema, peça desculpas e convide para nova visita
- Se a nota for alta (4-5): reforce o que fizeram bem e convide para voltar
- Tom profissional mas humano, em português brasileiro
- Não use emojis excessivos
- Assine como "Equipe ${company.business_name}"

Escreva APENAS o texto da resposta, sem explicações adicionais.`
}

async function callClaude(anthropicKey: string, prompt: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 512, messages: [{ role: 'user', content: prompt }] }),
  })
  if (!res.ok) throw new Error(`Claude error: ${await res.text()}`)
  const data = await res.json()
  return data.content?.[0]?.text ?? ''
}

type SupaClient = ReturnType<typeof createClient>

async function draftPendingReviewReplies(admin: SupaClient, anthropicKey: string, companyId: string): Promise<number> {
  const { data: opps } = await admin
    .from('opportunities')
    .select('id, ref_id')
    .eq('company_id', companyId)
    .eq('ref_type', 'review')
    .eq('status', 'open')
    .is('ai_draft', null)

  let drafted = 0
  for (const opp of opps ?? []) {
    if (!opp.ref_id) continue
    try {
      const { data: company } = await admin.from('companies').select('business_name, business_type, city').eq('id', companyId).single()
      const { data: review } = await admin.from('reviews').select('author, rating, text, review_date').eq('id', opp.ref_id).single()
      if (!company || !review) continue
      const draft = await callClaude(anthropicKey, buildReviewReplyPrompt(company, review))
      await admin.from('opportunities').update({ ai_draft: draft }).eq('id', opp.id)
      drafted++
    } catch (e) {
      console.error(`draft-reply cron: opportunity ${opp.id} error:`, e)
    }
  }
  return drafted
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? supabaseAnonKey
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')
    const cronSecretEnv = Deno.env.get('CRON_SECRET')

    if (!anthropicKey) return json({ error: 'ANTHROPIC_API_KEY não configurado.' }, 503)

    const admin = createClient(supabaseUrl, serviceKey)

    // Cron mode: auto-draft replies for every open review-type opportunity, across all active companies
    const bodyForCron = req.method === 'POST' ? await req.json().catch(() => ({})) as Record<string, unknown> : {}
    if (cronSecretEnv && bodyForCron.cron_secret === cronSecretEnv) {
      const { data: companies } = await admin.from('companies').select('id').eq('active', true)
      let total = 0
      for (const c of companies ?? []) {
        total += await draftPendingReviewReplies(admin, anthropicKey, c.id)
      }
      return json({ ok: true, cron: true, companies: companies?.length ?? 0, drafted: total })
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Unauthorized' }, 401)

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: userErr } = await userClient.auth.getUser()
    if (userErr || !user) return json({ error: 'Unauthorized' }, 401)

    const { opportunity_id } = bodyForCron as { opportunity_id?: string }
    if (!opportunity_id) return json({ error: 'opportunity_id é obrigatório' }, 400)

    // Get company
    const { data: company } = await admin
      .from('companies')
      .select('id, business_name, business_type, city')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!company) return json({ error: 'Empresa não encontrada.' }, 404)

    // Get opportunity
    const { data: opp } = await admin
      .from('opportunities')
      .select('*')
      .eq('id', opportunity_id)
      .eq('company_id', company.id)
      .maybeSingle()

    if (!opp) return json({ error: 'Oportunidade não encontrada.' }, 404)

    // If draft already exists, return it
    if (opp.ai_draft) return json({ ok: true, draft: opp.ai_draft })

    let prompt = ''

    if (opp.ref_type === 'review' && opp.ref_id) {
      const { data: review } = await admin
        .from('reviews')
        .select('author, rating, text, review_date, source')
        .eq('id', opp.ref_id)
        .single()

      if (!review) return json({ error: 'Review não encontrada.' }, 404)

      prompt = buildReviewReplyPrompt(company, review)
    } else if (opp.type === 'low_engagement') {
      prompt = `Você é consultor de marketing digital para ${company.business_name}.

O engajamento no Instagram está abaixo do ideal (${opp.description}).

Escreva 3 sugestões práticas e específicas para aumentar o engajamento, considerando o tipo de negócio: ${company.business_type ?? 'estabelecimento'}.

Formato: lista numerada, máximo 2 linhas por sugestão. Em português brasileiro.`
    } else {
      prompt = `Para o negócio ${company.business_name}, sugira uma ação concreta para resolver esta situação: ${opp.title}. ${opp.description ?? ''}

Seja direto e prático. Máximo 3 frases. Em português brasileiro.`
    }

    let draft: string
    try {
      draft = await callClaude(anthropicKey, prompt)
    } catch (e) {
      return json({ error: String(e) }, 502)
    }

    // Save draft to opportunity
    await admin.from('opportunities').update({ ai_draft: draft }).eq('id', opportunity_id)

    return json({ ok: true, draft })
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
