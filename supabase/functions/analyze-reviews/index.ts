import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const THEMES = ['atendimento', 'comida', 'preço', 'ambiente', 'tempo de espera', 'limpeza', 'localização', 'valor']

async function analyzeForCompany(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  anthropicKey: string,
): Promise<{ analyzed: number; total: number; error?: string }> {
  const { data: reviews } = await supabase
    .from('reviews')
    .select('id, text, rating')
    .eq('company_id', companyId)
    .is('sentiment', null)
    .not('text', 'is', null)
    .limit(50)

  if (!reviews || reviews.length === 0) return { analyzed: 0, total: 0 }

  const reviewsList = reviews.map((r, i) =>
    `[${i + 1}] (${r.rating ?? '—'}★) "${r.text}"`
  ).join('\n')

  const prompt = `Você é um analista de avaliações de negócios. Analise cada avaliação abaixo e retorne um JSON array.

Avaliações:
${reviewsList}

Para cada avaliação retorne:
- "id": o índice [1, 2, 3...]
- "sentiment": "positive", "neutral" ou "negative"
- "themes": array com os temas relevantes apenas dentre estes: ${THEMES.join(', ')}

Responda SOMENTE com o JSON array, sem texto adicional. Exemplo:
[{"id":1,"sentiment":"positive","themes":["comida","atendimento"]},{"id":2,"sentiment":"negative","themes":["tempo de espera"]}]`

  const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': anthropicKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!claudeRes.ok) {
    const err = await claudeRes.text()
    return { analyzed: 0, total: reviews.length, error: `Claude API error: ${err}` }
  }

  const claudeData = await claudeRes.json()
  const rawText = (claudeData.content?.[0]?.text ?? '[]').replace(/```(?:json)?\n?/g, '').trim()

  let analysisResults: Array<{ id: number; sentiment: string; themes: string[] }> | null = null
  try {
    analysisResults = JSON.parse(rawText)
  } catch {
    // Claude occasionally wraps the array in prose or gets cut off mid-array
    // when the batch is large — salvage whatever complete objects parse fine
    // instead of failing the whole batch of up to 50 reviews over one bad reply.
    const match = rawText.match(/\{[^{}]*"id"\s*:\s*\d+[^{}]*\}/g)
    if (match) {
      analysisResults = match
        .map((chunk: string) => { try { return JSON.parse(chunk) } catch { return null } })
        .filter((r): r is { id: number; sentiment: string; themes: string[] } => r !== null)
    }
  }

  if (!analysisResults || analysisResults.length === 0) {
    return { analyzed: 0, total: reviews.length, error: 'Claude retornou JSON inválido e nada pôde ser recuperado.' }
  }

  let updatedCount = 0
  for (const result of analysisResults) {
    const review = reviews[result.id - 1]
    if (!review) continue

    await supabase
      .from('reviews')
      .update({ sentiment: result.sentiment, themes: result.themes })
      .eq('id', review.id)

    updatedCount++
  }

  return { analyzed: updatedCount, total: reviews.length }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? supabaseAnonKey
    const cronSecretEnv = Deno.env.get('CRON_SECRET')
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')

    if (!anthropicKey) return json({ error: 'ANTHROPIC_API_KEY não configurada' }, 500)

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const body = await req.json().catch(() => ({})) as Record<string, unknown>
    const isCron = cronSecretEnv && body.cron_secret === cronSecretEnv

    // Modo cron: classifica avaliações pendentes de todas as empresas ativas —
    // usado pelo monitor-web-mentions (e por qualquer outra sincronização
    // automática) pra não deixar reviews sem sentimento até alguém logar.
    if (isCron) {
      const { data: companies } = await supabase.from('companies').select('id').eq('active', true)
      let totalAnalyzed = 0, totalPending = 0
      for (const c of companies ?? []) {
        try {
          const r = await analyzeForCompany(supabase, c.id, anthropicKey)
          totalAnalyzed += r.analyzed
          totalPending += r.total
        } catch (e) {
          console.error(`analyze-reviews cron: company ${c.id} error:`, e)
        }
      }
      return json({ ok: true, cron: true, analyzed: totalAnalyzed, total: totalPending })
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Unauthorized' }, 401)

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: userErr } = await userClient.auth.getUser()
    if (userErr || !user) return json({ error: 'Unauthorized' }, 401)

    const { data: company, error: companyErr } = await userClient
      .from('companies')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (companyErr || !company) return json({ error: `Empresa não encontrada: ${companyErr?.message}` }, 404)

    const result = await analyzeForCompany(supabase, company.id, anthropicKey)
    if (result.total === 0) return json({ analyzed: 0, message: 'Nenhuma review para analisar' })
    if (result.error && result.analyzed === 0) return json({ analyzed: 0, error: result.error, total: result.total }, 200)

    return json({ analyzed: result.analyzed, total: result.total })

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
