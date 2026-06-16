import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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
      .select('id, name')
      .eq('owner_id', user.id)
      .single()

    if (restErr || !restaurant) return json({ error: `Restaurante não encontrado: ${restErr?.message}` }, 404)

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!anthropicKey) return json({ error: 'ANTHROPIC_API_KEY não configurada' }, 500)

    // Determine current period (YYYY-MM)
    const now = new Date()
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const periodLabel = now.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })

    // Idempotency: return existing report if already generated this month
    const { data: existing } = await supabase
      .from('reports')
      .select('id, health_score')
      .eq('restaurant_id', restaurant.id)
      .eq('period', period)
      .single()

    if (existing) {
      return json({ report_id: existing.id, period, health_score: existing.health_score, cached: true })
    }

    // Gather all data for this restaurant
    const [reviewsRes, competitorsRes] = await Promise.all([
      supabase
        .from('reviews')
        .select('rating, sentiment, themes, text, author, review_date')
        .eq('restaurant_id', restaurant.id)
        .order('review_date', { ascending: false })
        .limit(100),
      supabase
        .from('competitors')
        .select('name, rating, review_count, distance_m, price_level')
        .eq('restaurant_id', restaurant.id)
        .order('distance_m', { ascending: true })
        .limit(10),
    ])

    const reviews = reviewsRes.data ?? []
    const competitors = competitorsRes.data ?? []

    if (reviews.length === 0) {
      return json({ error: 'Importe reviews antes de gerar o relatório' }, 400)
    }

    // Compute basic stats
    const avgRating = (reviews.reduce((s, r) => s + (r.rating ?? 0), 0) / reviews.length).toFixed(1)
    const positiveCount = reviews.filter(r => r.sentiment === 'positive').length
    const negativeCount = reviews.filter(r => r.sentiment === 'negative').length

    // Theme frequency
    const themeCounts: Record<string, { total: number; pos: number; neg: number }> = {}
    for (const r of reviews) {
      for (const t of (r.themes ?? [])) {
        if (!themeCounts[t]) themeCounts[t] = { total: 0, pos: 0, neg: 0 }
        themeCounts[t].total++
        if (r.sentiment === 'positive') themeCounts[t].pos++
        if (r.sentiment === 'negative') themeCounts[t].neg++
      }
    }

    // Sample reviews for Claude (top 20)
    const reviewSamples = reviews.slice(0, 20).map(r =>
      `(${r.rating}★ ${r.sentiment}) ${r.text}`
    ).join('\n')

    const competitorSummary = competitors.length > 0
      ? competitors.map(c =>
        `- ${c.name}: ${c.rating}★ (${c.review_count} reviews), ${c.distance_m}m de distância, nível de preço: ${'$'.repeat(c.price_level ?? 2)}`
      ).join('\n')
      : 'Nenhum concorrente mapeado ainda.'

    const themesSummary = Object.entries(themeCounts)
      .sort((a, b) => b[1].total - a[1].total)
      .map(([t, c]) => `- ${t}: ${c.total} menções (${c.pos} positivas, ${c.neg} negativas)`)
      .join('\n')

    // Call Claude to generate insights
    const prompt = `Você é um consultor especialista em restaurantes. Analise os dados abaixo e gere um relatório mensal completo para o restaurante "${restaurant.name}".

## Dados do período (${periodLabel})

**Avaliações:** ${reviews.length} reviews | Nota média: ${avgRating}★ | ${positiveCount} positivas | ${negativeCount} negativas

**Temas mais citados:**
${themesSummary}

**Amostra de avaliações recentes:**
${reviewSamples}

**Concorrentes mapeados:**
${competitorSummary}

---

Gere um relatório JSON com EXATAMENTE esta estrutura:
{
  "health_score": <número 0-100 baseado nos dados>,
  "executive_summary": "<1 parágrafo executivo em PT-BR>",
  "strengths": [
    {"title": "<ponto forte>", "action": "<como usar no marketing>"},
    {"title": "<ponto forte>", "action": "<como usar no marketing>"}
  ],
  "complaints": [
    {"title": "<reclamação>", "action": "<ação corretiva concreta>", "urgency": "high|medium|low"},
    {"title": "<reclamação>", "action": "<ação corretiva concreta>", "urgency": "high|medium|low"}
  ],
  "pricing_recommendation": "<recomendação de posicionamento de preço vs concorrentes>",
  "actions": [
    {"priority": 1, "title": "<ação>", "description": "<detalhes>", "impact": "Muito alto|Alto|Médio"},
    {"priority": 2, "title": "<ação>", "description": "<detalhes>", "impact": "Muito alto|Alto|Médio"},
    {"priority": 3, "title": "<ação>", "description": "<detalhes>", "impact": "Muito alto|Alto|Médio"}
  ]
}

Responda SOMENTE com o JSON, sem texto adicional. As ações devem ser específicas, concretas e implementáveis amanhã.`

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!claudeRes.ok) {
      const err = await claudeRes.text()
      return json({ error: `Claude API error: ${err}` }, 500)
    }

    const claudeData = await claudeRes.json()
    const rawText = claudeData.content?.[0]?.text ?? '{}'

    let reportData: ReportData
    try {
      reportData = JSON.parse(rawText)
    } catch {
      return json({ error: 'Claude retornou JSON inválido', raw: rawText }, 500)
    }

    // Save report to database
    const { data: reportRow, error: reportErr } = await supabase
      .from('reports')
      .insert({
        restaurant_id: restaurant.id,
        period,
        health_score: reportData.health_score,
        summary_json: reportData,
      })
      .select('id')
      .single()

    if (reportErr) return json({ error: reportErr.message }, 500)

    // Save 3 actions
    const actionRows = reportData.actions.map((a) => ({
      report_id: reportRow.id,
      title: a.title,
      description: a.description,
      priority: a.priority,
      status: 'pending',
    }))

    await supabase.from('actions').insert(actionRows)

    return json({
      report_id: reportRow.id,
      period,
      health_score: reportData.health_score,
      data: reportData,
    })

  } catch (err) {
    return json({ error: String(err) }, 500)
  }
})

interface ReportData {
  health_score: number
  executive_summary: string
  strengths: Array<{ title: string; action: string }>
  complaints: Array<{ title: string; action: string; urgency: string }>
  pricing_recommendation: string
  actions: Array<{ priority: number; title: string; description: string; impact: string }>
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
