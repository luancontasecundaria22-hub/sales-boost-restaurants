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
      .select('id, name, address, ifood_url, tripadvisor_url')
      .eq('owner_id', user.id)
      .single()

    if (restErr || !restaurant) return json({ error: 'Restaurante não encontrado. Configure o nome nas configurações primeiro.' }, 404)
    if (!restaurant.name) return json({ error: 'Preencha o nome do restaurante nas configurações.' }, 400)

    const apifyToken = Deno.env.get('APIFY_TOKEN')
    if (!apifyToken) return json({ error: 'APIFY_TOKEN não configurado nos secrets do Supabase.' }, 500)

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey)

    const allReviews: ReviewRow[] = []

    // ── 1. Google Maps reviews (via Apify) ──────────────────────────────────
    const googleQuery = restaurant.address
      ? `${restaurant.name}, ${restaurant.address}`
      : `${restaurant.name} Rio de Janeiro`

    const googleRes = await fetch(
      `https://api.apify.com/v2/acts/compass~google-maps-reviews-scraper/run-sync-get-dataset-items?token=${apifyToken}&timeout=120`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchStringsArray: [googleQuery],
          maxReviews: 50,
          language: 'pt',
          maxCrawledPlacesPerSearch: 1,
          reviewsSort: 'newest',
        }),
      }
    )

    if (googleRes.ok) {
      const places = await googleRes.json()
      const place = Array.isArray(places) ? places[0] : null
      const reviews: ApifyReview[] = place?.reviews ?? []
      for (const r of reviews) {
        if (r.text?.trim()) {
          allReviews.push({
            restaurant_id: restaurant.id,
            source: 'google',
            author: r.name ?? 'Anônimo',
            rating: r.stars ?? null,
            text: r.text,
            review_date: r.publishedAtDate ?? r.publishAt?.split('T')[0] ?? new Date().toISOString().split('T')[0],
            raw_data: r,
          })
        }
      }
    }

    // ── 2. iFood reviews (se URL configurada) ────────────────────────────────
    if (restaurant.ifood_url) {
      const ifoodRes = await fetch(
        `https://api.apify.com/v2/acts/epctex~ifood-scraper/run-sync-get-dataset-items?token=${apifyToken}&timeout=120`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            startUrls: [{ url: restaurant.ifood_url }],
            maxReviews: 50,
          }),
        }
      )
      if (ifoodRes.ok) {
        const ifoodData = await ifoodRes.json()
        const reviews: IfoodReview[] = ifoodData?.[0]?.reviews ?? []
        for (const r of reviews) {
          if (r.text?.trim()) {
            allReviews.push({
              restaurant_id: restaurant.id,
              source: 'ifood',
              author: r.userName ?? 'Anônimo',
              rating: r.rating ?? null,
              text: r.text,
              review_date: r.createdAt?.split('T')[0] ?? new Date().toISOString().split('T')[0],
              raw_data: r,
            })
          }
        }
      }
    }

    // ── 3. TripAdvisor reviews (se URL configurada) ──────────────────────────
    if (restaurant.tripadvisor_url) {
      const taRes = await fetch(
        `https://api.apify.com/v2/acts/maxcopell~tripadvisor/run-sync-get-dataset-items?token=${apifyToken}&timeout=120`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            startUrls: [{ url: restaurant.tripadvisor_url }],
            maxReviews: 50,
          }),
        }
      )
      if (taRes.ok) {
        const taData = await taRes.json()
        const reviews: TripAdvisorReview[] = taData?.[0]?.reviews ?? []
        for (const r of reviews) {
          if (r.text?.trim()) {
            allReviews.push({
              restaurant_id: restaurant.id,
              source: 'tripadvisor',
              author: r.username ?? 'Anônimo',
              rating: r.rating ?? null,
              text: r.text,
              review_date: r.publishedDate?.split('T')[0] ?? new Date().toISOString().split('T')[0],
              raw_data: r,
            })
          }
        }
      }
    }

    if (allReviews.length === 0) {
      return json({ error: 'Nenhuma review encontrada. Verifique o nome do restaurante e tente novamente.' }, 404)
    }

    // Deduplicate against existing reviews
    const { data: existing } = await serviceClient
      .from('reviews')
      .select('author, review_date, source')
      .eq('restaurant_id', restaurant.id)

    const existingKeys = new Set(
      (existing ?? []).map((e: { author: string; review_date: string; source: string }) => `${e.source}|${e.author}|${e.review_date}`)
    )

    const newRows = allReviews.filter(
      (r) => !existingKeys.has(`${r.source}|${r.author}|${r.review_date}`)
    )

    if (newRows.length === 0) {
      return json({ imported: 0, message: 'Todas as reviews já foram importadas anteriormente.' })
    }

    const { error: insertErr } = await serviceClient.from('reviews').insert(newRows)
    if (insertErr) return json({ error: insertErr.message }, 500)

    const bySource = newRows.reduce((acc, r) => {
      acc[r.source] = (acc[r.source] ?? 0) + 1
      return acc
    }, {} as Record<string, number>)

    return json({ imported: newRows.length, total: allReviews.length, by_source: bySource })

  } catch (err) {
    return json({ error: String(err) }, 500)
  }
})

interface ReviewRow {
  restaurant_id: string
  source: string
  author: string
  rating: number | null
  text: string
  review_date: string
  raw_data: unknown
}

interface ApifyReview {
  name?: string
  stars?: number
  text?: string
  publishAt?: string
  publishedAtDate?: string
}

interface IfoodReview {
  userName?: string
  rating?: number
  text?: string
  createdAt?: string
}

interface TripAdvisorReview {
  username?: string
  rating?: number
  text?: string
  publishedDate?: string
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
