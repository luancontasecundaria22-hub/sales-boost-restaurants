import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const THEMES = ['atendimento', 'comida', 'preço', 'ambiente', 'tempo de espera', 'limpeza', 'localização', 'valor']

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Unauthorized' }, 401)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? supabaseAnonKey

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: userErr } = await userClient.auth.getUser()
    if (userErr || !user) return json({ error: 'Unauthorized' }, 401)

    const { data: restaurant, error: restErr } = await userClient
      .from('restaurants')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (restErr || !restaurant) return json({ error: `Restaurante não encontrado: ${restErr?.message}` }, 404)

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get reviews that haven't been analyzed yet
    const { data: reviews } = await supabase
      .from('reviews')
      .select('id, text, rating')
      .eq('restaurant_id', restaurant.id)
      .is('sentiment', null)
      .not('text', 'is', null)
      .limit(50)

    if (!reviews || reviews.length === 0) {
      return json({ analyzed: 0, message: 'Nenhuma review para analisar' })
    }

    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!anthropicKey) return json({ error: 'ANTHROPIC_API_KEY não configurada' }, 500)

    // Build prompt with all reviews for batch analysis
    const reviewsList = reviews.map((r, i) =>
      `[${i + 1}] (${r.rating}★) "${r.text}"`
    ).join('\n')

    const prompt = `Você é um analista de restaurantes. Analise cada avaliação abaixo e retorne um JSON array.

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
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!claudeRes.ok) {
      const err = await claudeRes.text()
      return json({ error: `Claude API error: ${err}` }, 500)
    }

    const claudeData = await claudeRes.json()
    const rawText = claudeData.content?.[0]?.text ?? '[]'

    let analysisResults: Array<{ id: number; sentiment: string; themes: string[] }>
    try {
      analysisResults = JSON.parse(rawText)
    } catch {
      return json({ error: 'Claude retornou JSON inválido', raw: rawText }, 500)
    }

    // Update each review with analysis
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

    return json({ analyzed: updatedCount, total: reviews.length })

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
