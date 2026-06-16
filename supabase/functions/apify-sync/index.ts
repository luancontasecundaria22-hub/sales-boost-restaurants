import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ApifyPost {
  caption?: string
  likesCount?: number
  commentsCount?: number
  timestamp?: string
  url?: string
  type?: string
}

interface ApifyProfile {
  username?: string
  fullName?: string
  biography?: string
  followersCount?: number
  followsCount?: number
  postsCount?: number
  latestPosts?: ApifyPost[]
}

interface ApifyReview {
  reviewId?: string
  name?: string
  stars?: number
  text?: string
  publishedAtDate?: string
  responseFromOwnerText?: string
}

interface ApifyFacebookReview {
  id?: string
  reviewId?: string
  user?: { name?: string }
  isRecommended?: boolean
  text?: string
  date?: string
}

interface ApifyTripAdvisorReview {
  id?: string | number
  text?: string
  rating?: number
  publishedDate?: string
  user?: { username?: string }
  ownerResponse?: { text?: string } | string
}

interface ApifyReclameAquiComplaint {
  id?: string | number
  author?: string
  rating?: number
  description?: string
  title?: string
  created_at?: string
  company_response?: string
}

interface ApifyIfoodReview {
  id?: string | number
  customer_name?: string
  rating?: number
  comment?: string
  comment_date?: string
}

interface ApifyInstagramComment {
  id?: string
  text?: string
  ownerUsername?: string
  timestamp?: string
}

function fallbackId(...parts: (string | number | undefined | null)[]): string {
  return parts.filter(p => p !== undefined && p !== null && p !== '').join('|').slice(0, 180)
}

async function runApifyActor(
  token: string,
  actorId: string,
  input: Record<string, unknown>,
  timeoutSecs = 60,
): Promise<unknown[]> {
  const url = `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${token}&timeout=${timeoutSecs}&memory=256`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Apify error (${actorId}): ${err}`)
  }
  return res.json()
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Unauthorized' }, 401)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? supabaseAnonKey
    const apifyToken = Deno.env.get('APIFY_TOKEN')

    if (!apifyToken) return json({ error: 'APIFY_TOKEN não configurado.' }, 503)

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: userErr } = await userClient.auth.getUser()
    if (userErr || !user) return json({ error: 'Unauthorized' }, 401)

    const admin = createClient(supabaseUrl, serviceKey)

    const { data: company } = await admin
      .from('companies')
      .select('id, instagram_url, google_place_id, business_name, facebook_url, tripadvisor_url, reclame_aqui_url, ifood_url, lat, lng')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!company) return json({ error: 'Empresa não encontrada.' }, 404)

    const results: Record<string, unknown> = {}
    const syncedAt = new Date().toISOString()
    let igPostUrls: string[] = []

    // ── Instagram sync ──────────────────────────────────────────
    if (company.instagram_url) {
      try {
        const igUrl = company.instagram_url.replace(/\/$/, '')
        const items = await runApifyActor(
          apifyToken,
          'apify~instagram-scraper',
          {
            directUrls: [igUrl],
            resultsType: 'details',
            resultsLimit: 12,
          },
          90,
        ) as ApifyProfile[]

        const profile = items[0]
        if (profile) {
          const posts = profile.latestPosts ?? []
          igPostUrls = posts.map(p => p.url).filter((u): u is string => !!u).slice(0, 5)
          const totalLikes = posts.reduce((s: number, p: ApifyPost) => s + (p.likesCount ?? 0), 0)
          const totalComments = posts.reduce((s: number, p: ApifyPost) => s + (p.commentsCount ?? 0), 0)
          const avgLikes = posts.length ? Math.round(totalLikes / posts.length) : 0
          const avgComments = posts.length ? Math.round(totalComments / posts.length) : 0

          results.instagram = {
            username: profile.username,
            full_name: profile.fullName,
            bio: profile.biography,
            followers: profile.followersCount ?? 0,
            following: profile.followsCount ?? 0,
            posts_count: profile.postsCount ?? 0,
            avg_likes: avgLikes,
            avg_comments: avgComments,
            engagement_rate: profile.followersCount
              ? parseFloat(((avgLikes + avgComments) / profile.followersCount * 100).toFixed(2))
              : 0,
            recent_posts: posts.slice(0, 6).map((p: ApifyPost) => ({
              caption: p.caption?.slice(0, 200),
              likes: p.likesCount ?? 0,
              comments: p.commentsCount ?? 0,
              timestamp: p.timestamp,
              url: p.url,
            })),
            synced_at: syncedAt,
          }
        }
      } catch (e) {
        results.instagram_error = String(e)
      }
    }

    // ── Google Maps reviews sync ─────────────────────────────────
    if (company.google_place_id) {
      try {
        const items = await runApifyActor(
          apifyToken,
          'compass~google-maps-reviews-scraper',
          {
            placeIds: [company.google_place_id],
            maxReviews: 50,
            reviewsSort: 'newest',
            language: 'pt-BR',
          },
          90,
        ) as ApifyReview[]

        if (items.length > 0) {
          const reviewRows = items
            .filter((r: ApifyReview) => r.reviewId)
            .map((r: ApifyReview) => ({
              company_id: company.id,
              source: 'google',
              google_review_id: r.reviewId!,
              author: r.name ?? 'Anônimo',
              rating: r.stars ?? null,
              text: r.text ?? null,
              review_date: r.publishedAtDate ? r.publishedAtDate.slice(0, 10) : null,
              owner_reply: r.responseFromOwnerText ?? null,
            }))

          if (reviewRows.length > 0) {
            await admin.from('reviews').upsert(reviewRows, {
              onConflict: 'company_id,google_review_id',
              ignoreDuplicates: false,
            })
          }

          results.reviews = { synced: reviewRows.length }
        }
      } catch (e) {
        results.reviews_error = String(e)
      }
    }

    // ── Facebook reviews sync ─────────────────────────────────────
    if (company.facebook_url) {
      try {
        const fbBase = company.facebook_url.replace(/\/$/, '')
        const items = await runApifyActor(
          apifyToken,
          'apify~facebook-reviews-scraper',
          { startUrls: [{ url: `${fbBase}/reviews` }], resultsLimit: 50 },
          90,
        ) as ApifyFacebookReview[]

        const rows = items.map(r => ({
          company_id: company.id,
          source: 'facebook',
          external_id: String(r.id ?? r.reviewId ?? fallbackId(r.user?.name, r.date, r.text?.slice(0, 40))),
          author: r.user?.name ?? 'Anônimo',
          rating: r.isRecommended === false ? 2 : 5,
          text: r.text ?? null,
          review_date: r.date ? r.date.slice(0, 10) : null,
        }))

        if (rows.length > 0) {
          await admin.from('reviews').upsert(rows, { onConflict: 'company_id,source,external_id', ignoreDuplicates: false })
        }
        results.facebook_reviews = { synced: rows.length }
      } catch (e) {
        results.facebook_reviews_error = String(e)
      }
    }

    // ── TripAdvisor reviews sync ──────────────────────────────────
    if (company.tripadvisor_url) {
      try {
        const items = await runApifyActor(
          apifyToken,
          'maxcopell~tripadvisor-reviews',
          { startUrls: [{ url: company.tripadvisor_url }], maxItemsPerQuery: 50 },
          90,
        ) as ApifyTripAdvisorReview[]

        const rows = items.map(r => ({
          company_id: company.id,
          source: 'tripadvisor',
          external_id: String(r.id ?? fallbackId(r.user?.username, r.publishedDate, r.text?.slice(0, 40))),
          author: r.user?.username ?? 'Anônimo',
          rating: r.rating ?? null,
          text: r.text ?? null,
          review_date: r.publishedDate ? r.publishedDate.slice(0, 10) : null,
          owner_reply: typeof r.ownerResponse === 'string' ? r.ownerResponse : r.ownerResponse?.text ?? null,
        }))

        if (rows.length > 0) {
          await admin.from('reviews').upsert(rows, { onConflict: 'company_id,source,external_id', ignoreDuplicates: false })
        }
        results.tripadvisor_reviews = { synced: rows.length }
      } catch (e) {
        results.tripadvisor_reviews_error = String(e)
      }
    }

    // ── Reclame Aqui sync ──────────────────────────────────────────
    if (company.reclame_aqui_url) {
      try {
        const slugMatch = company.reclame_aqui_url.match(/reclameaqui\.com\.br\/(?:empresa\/)?([^/?#]+)/i)
        const slug = slugMatch?.[1]
        if (slug) {
          const items = await runApifyActor(
            apifyToken,
            'viralanalyzer~reclameaqui-scraper',
            { companies: [slug], maxComplaints: 50 },
            90,
          ) as ApifyReclameAquiComplaint[]

          const rows = items.map(r => ({
            company_id: company.id,
            source: 'reclame_aqui',
            external_id: String(r.id ?? fallbackId(r.author, r.created_at, (r.title ?? r.description)?.slice(0, 40))),
            author: r.author ?? 'Anônimo',
            rating: r.rating ?? null,
            text: r.description ?? r.title ?? null,
            review_date: r.created_at ? r.created_at.slice(0, 10) : null,
            owner_reply: r.company_response ?? null,
          }))

          if (rows.length > 0) {
            await admin.from('reviews').upsert(rows, { onConflict: 'company_id,source,external_id', ignoreDuplicates: false })
          }
          results.reclame_aqui_reviews = { synced: rows.length }
        } else {
          results.reclame_aqui_reviews_error = 'Não foi possível identificar o slug da empresa na URL do Reclame Aqui.'
        }
      } catch (e) {
        results.reclame_aqui_reviews_error = String(e)
      }
    }

    // ── iFood reviews sync ───────────────────────────────────────
    if (company.ifood_url) {
      try {
        const storeIdMatch = company.ifood_url.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i)
        const storeId = storeIdMatch?.[1]
        if (storeId && company.lat != null && company.lng != null) {
          const items = await runApifyActor(
            apifyToken,
            'yasmany.casanova~ifood-scraper',
            { mode: 'reviews', latitude: company.lat, longitude: company.lng, store_id: storeId },
            90,
          ) as ApifyIfoodReview[]

          const rows = items.map(r => ({
            company_id: company.id,
            source: 'ifood',
            external_id: String(r.id ?? fallbackId(r.customer_name, r.comment_date, r.comment?.slice(0, 40))),
            author: r.customer_name ?? 'Anônimo',
            rating: r.rating ?? null,
            text: r.comment ?? null,
            review_date: r.comment_date ? r.comment_date.slice(0, 10) : null,
          }))

          if (rows.length > 0) {
            await admin.from('reviews').upsert(rows, { onConflict: 'company_id,source,external_id', ignoreDuplicates: false })
          }
          results.ifood_reviews = { synced: rows.length }
        } else {
          results.ifood_reviews_error = 'Não foi possível extrair o ID da loja a partir do link do iFood, ou localização (lat/lng) não configurada.'
        }
      } catch (e) {
        results.ifood_reviews_error = String(e)
      }
    }

    // ── Instagram comments sync (reaproveita posts já buscados acima) ──
    if (igPostUrls.length > 0) {
      try {
        const items = await runApifyActor(
          apifyToken,
          'apify~instagram-comment-scraper',
          { directUrls: igPostUrls, resultsLimit: 30 },
          90,
        ) as ApifyInstagramComment[]

        const rows = items.map(c => ({
          company_id: company.id,
          source: 'instagram_comment',
          external_id: String(c.id ?? fallbackId(c.ownerUsername, c.timestamp, c.text?.slice(0, 40))),
          author: c.ownerUsername ?? 'Anônimo',
          rating: null,
          text: c.text ?? null,
          review_date: c.timestamp ? c.timestamp.slice(0, 10) : null,
        }))

        if (rows.length > 0) {
          await admin.from('reviews').upsert(rows, { onConflict: 'company_id,source,external_id', ignoreDuplicates: false })
        }
        results.instagram_comments = { synced: rows.length }
      } catch (e) {
        results.instagram_comments_error = String(e)
      }
    }

    // Save social_data to company
    const currentSocialData = (await admin
      .from('companies')
      .select('social_data')
      .eq('id', company.id)
      .single()).data?.social_data ?? {}

    await admin.from('companies').update({
      social_data: { ...currentSocialData, ...results },
      social_scraped_at: syncedAt,
    }).eq('id', company.id)

    return json({ ok: true, synced: Object.keys(results), syncedAt })
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
