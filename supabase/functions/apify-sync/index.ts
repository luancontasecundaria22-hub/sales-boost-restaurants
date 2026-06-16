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
      .select('id, instagram_url, google_place_id, business_name')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!company) return json({ error: 'Empresa não encontrada.' }, 404)

    const results: Record<string, unknown> = {}
    const syncedAt = new Date().toISOString()

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
            language: 'pt',
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
