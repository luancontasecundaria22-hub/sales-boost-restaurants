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

interface ApifyXPost {
  id?: string
  url?: string
  text?: string
  createdAt?: string
  author?: { userName?: string; name?: string }
}

interface JobStep {
  key: string
  label: string
  status: 'pending' | 'running' | 'done' | 'error'
  message?: string
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
      .select('id, instagram_url, google_place_id, business_name, facebook_url, tripadvisor_url, reclame_aqui_url, ifood_url, website_url, lat, lng')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!company) return json({ error: 'Empresa não encontrada.' }, 404)

    // Build the step list up front from whichever channels are configured,
    // so the frontend can render a real progress bar (X of N done).
    const steps: JobStep[] = []
    if (company.instagram_url) steps.push({ key: 'instagram', label: 'Instagram', status: 'pending' })
    if (company.google_place_id) steps.push({ key: 'google_reviews', label: 'Avaliações do Google', status: 'pending' })
    if (company.facebook_url) steps.push({ key: 'facebook', label: 'Avaliações do Facebook', status: 'pending' })
    if (company.tripadvisor_url) steps.push({ key: 'tripadvisor', label: 'TripAdvisor', status: 'pending' })
    if (company.reclame_aqui_url) steps.push({ key: 'reclame_aqui', label: 'Reclame Aqui', status: 'pending' })
    if (company.ifood_url) steps.push({ key: 'ifood', label: 'iFood', status: 'pending' })
    if (company.instagram_url) steps.push({ key: 'instagram_comments', label: 'Comentários do Instagram', status: 'pending' })
    // Buscam menções ao nome do negócio na internet (não um perfil próprio) —
    // por isso o gatilho é ter business_name, não um campo de URL específico.
    if (company.business_name) steps.push({ key: 'x_mentions', label: 'Menções no X', status: 'pending' })
    steps.push({ key: 'analyze_reviews', label: 'Classificação de sentimento', status: 'pending' })
    if (company.google_place_id) steps.push({ key: 'competitors', label: 'Concorrentes', status: 'pending' })
    steps.push({ key: 'opportunities', label: 'Oportunidades', status: 'pending' })
    steps.push({ key: 'draft_replies', label: 'Rascunhos de resposta', status: 'pending' })
    // Always refreshed — Campanhas, Viral Trends and o gerador de posts usam esse
    // perfil, e antes ele só era reconstruído (sem esperar) dentro do generate-posts,
    // então essas abas mostravam dados de um negócio antigo até alguém gerar posts de novo.
    steps.push({ key: 'profile', label: 'Perfil da IA', status: 'pending' })
    if (company.website_url) steps.push({ key: 'diagnostics', label: 'Diagnóstico do site', status: 'pending' })

    if (steps.length === 0) return json({ error: 'Nenhum canal configurado para sincronizar.' }, 400)

    const { data: job, error: jobErr } = await admin
      .from('sync_jobs')
      .insert({ company_id: company.id, status: 'running', steps })
      .select('id')
      .single()
    if (jobErr || !job) return json({ error: jobErr?.message ?? 'Erro ao iniciar sincronização.' }, 500)

    const jobId = job.id as string

    // Everything below runs as a background task via EdgeRuntime.waitUntil —
    // it keeps executing on Supabase's infra after the response is sent,
    // independent of whether the browser tab that triggered it is still open.
    const runSync = async () => {
      const liveSteps = steps.map(s => ({ ...s }))
      const setStep = async (key: string, status: JobStep['status'], message?: string) => {
        const idx = liveSteps.findIndex(s => s.key === key)
        if (idx >= 0) liveSteps[idx] = { ...liveSteps[idx], status, message }
        await admin.from('sync_jobs').update({ steps: liveSteps, updated_at: new Date().toISOString() }).eq('id', jobId)
      }

      const results: Record<string, unknown> = {}
      const syncedAt = new Date().toISOString()
      let igPostUrls: string[] = []

      // ── Instagram sync ──────────────────────────────────────────
      if (company.instagram_url) {
        await setStep('instagram', 'running')
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
          await setStep('instagram', 'done', profile ? `@${profile.username ?? ''}` : 'sem dados')
        } catch (e) {
          results.instagram_error = String(e)
          await setStep('instagram', 'error', String(e))
        }
      }

      // ── Google Maps reviews sync ─────────────────────────────────
      if (company.google_place_id) {
        await setStep('google_reviews', 'running')
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

          let synced = 0
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

            synced = reviewRows.length
            results.reviews = { synced }
          }
          await setStep('google_reviews', 'done', `${synced} avaliações`)
        } catch (e) {
          results.reviews_error = String(e)
          await setStep('google_reviews', 'error', String(e))
        }
      }

      // ── Facebook reviews sync ─────────────────────────────────────
      if (company.facebook_url) {
        await setStep('facebook', 'running')
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
          await setStep('facebook', 'done', `${rows.length} avaliações`)
        } catch (e) {
          results.facebook_reviews_error = String(e)
          await setStep('facebook', 'error', String(e))
        }
      }

      // ── TripAdvisor reviews sync ──────────────────────────────────
      if (company.tripadvisor_url) {
        await setStep('tripadvisor', 'running')
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
          await setStep('tripadvisor', 'done', `${rows.length} avaliações`)
        } catch (e) {
          results.tripadvisor_reviews_error = String(e)
          await setStep('tripadvisor', 'error', String(e))
        }
      }

      // ── Reclame Aqui sync ──────────────────────────────────────────
      if (company.reclame_aqui_url) {
        await setStep('reclame_aqui', 'running')
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
            await setStep('reclame_aqui', 'done', `${rows.length} avaliações`)
          } else {
            results.reclame_aqui_reviews_error = 'Não foi possível identificar o slug da empresa na URL do Reclame Aqui.'
            await setStep('reclame_aqui', 'error', 'URL inválida')
          }
        } catch (e) {
          results.reclame_aqui_reviews_error = String(e)
          await setStep('reclame_aqui', 'error', String(e))
        }
      }

      // ── iFood reviews sync ───────────────────────────────────────
      if (company.ifood_url) {
        await setStep('ifood', 'running')
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
            await setStep('ifood', 'done', `${rows.length} avaliações`)
          } else {
            results.ifood_reviews_error = 'Não foi possível extrair o ID da loja a partir do link do iFood, ou localização (lat/lng) não configurada.'
            await setStep('ifood', 'error', 'link ou localização inválidos')
          }
        } catch (e) {
          results.ifood_reviews_error = String(e)
          await setStep('ifood', 'error', String(e))
        }
      }

      // ── Instagram comments sync (reaproveita posts já buscados acima) ──
      if (company.instagram_url) {
        await setStep('instagram_comments', 'running')
        try {
          if (igPostUrls.length > 0) {
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
            await setStep('instagram_comments', 'done', `${rows.length} comentários`)
          } else {
            await setStep('instagram_comments', 'done', 'sem posts para checar')
          }
        } catch (e) {
          results.instagram_comments_error = String(e)
          await setStep('instagram_comments', 'error', String(e))
        }
      }

      // ── Menções no X (busca por nome do negócio, não um perfil próprio) ──
      if (company.business_name) {
        await setStep('x_mentions', 'running')
        try {
          const items = await runApifyActor(
            apifyToken,
            'apidojo~tweet-scraper',
            { searchTerms: [company.business_name], maxItems: 20, sort: 'Latest' },
            90,
          ) as ApifyXPost[]

          const rows = items.map(t => ({
            company_id: company.id,
            source: 'x',
            external_id: String(t.id ?? fallbackId(t.author?.userName, t.createdAt, t.text?.slice(0, 40))),
            author: t.author?.name ?? t.author?.userName ?? 'Anônimo',
            rating: null,
            text: t.text ?? null,
            review_date: t.createdAt ? new Date(t.createdAt).toISOString().slice(0, 10) : null,
            raw_data: { url: t.url ?? null, username: t.author?.userName ?? null },
          }))

          if (rows.length > 0) {
            await admin.from('reviews').upsert(rows, { onConflict: 'company_id,source,external_id', ignoreDuplicates: false })
          }
          results.x_mentions = { synced: rows.length }
          await setStep('x_mentions', 'done', `${rows.length} menções`)
        } catch (e) {
          results.x_mentions_error = String(e)
          await setStep('x_mentions', 'error', String(e))
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

      // ── Sentiment classification (delegates to analyze-reviews) ──
      // Negative reviews only show up as "negativa" once sentiment is set —
      // apify-sync used to just insert raw reviews and leave this null forever.
      // analyze-reviews only classifies up to 50 reviews per call, so loop it.
      await setStep('analyze_reviews', 'running')
      try {
        let totalAnalyzed = 0
        let lastNote = ''
        for (let i = 0; i < 10; i++) {
          const res = await fetch(`${supabaseUrl}/functions/v1/analyze-reviews`, {
            method: 'POST',
            headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
          })
          const data = await res.json()
          if (!res.ok) throw new Error(data.error ?? 'Erro ao classificar avaliações')
          totalAnalyzed += data.analyzed ?? 0
          // A single malformed AI reply shouldn't fail the whole sync — analyze-reviews
          // returns analyzed:0 with an `error` note in that case instead of a hard error,
          // so we just stop the loop here and surface the note instead of throwing.
          if (!data.analyzed) { lastNote = data.error ?? ''; break }
        }
        await setStep('analyze_reviews', 'done', `${totalAnalyzed} avaliações classificadas${lastNote ? ` (${lastNote})` : ''}`)
      } catch (e) {
        await setStep('analyze_reviews', 'error', String(e))
      }

      // ── Competitors (delegates to map-competitors, same user auth) ──
      if (company.google_place_id) {
        await setStep('competitors', 'running')
        try {
          const res = await fetch(`${supabaseUrl}/functions/v1/map-competitors`, {
            method: 'POST',
            headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
          })
          const data = await res.json()
          if (!res.ok) throw new Error(data.error ?? 'Erro ao mapear concorrentes')
          await setStep('competitors', 'done', `${data.mapped ?? 0} concorrentes`)
        } catch (e) {
          await setStep('competitors', 'error', String(e))
        }
      }

      // ── Opportunities (delegates to detect-opportunities, same user auth) ──
      await setStep('opportunities', 'running')
      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/detect-opportunities`, {
          method: 'POST',
          headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Erro ao detectar oportunidades')
        await setStep('opportunities', 'done', `${data.total ?? 0} abertas`)
      } catch (e) {
        await setStep('opportunities', 'error', String(e))
      }

      // ── Draft replies (delegates to draft-reply, one call per pending review) ──
      // Without this, opportunities sit "open" with no ai_draft — and Aprovações
      // only shows review-reply opportunities that already have a draft, so
      // nothing would ever show up there even though reviews got synced.
      await setStep('draft_replies', 'running')
      try {
        const { data: pending } = await admin
          .from('opportunities')
          .select('id')
          .eq('company_id', company.id)
          .eq('ref_type', 'review')
          .eq('status', 'open')
          .is('ai_draft', null)
          .limit(30)

        let drafted = 0
        for (const opp of pending ?? []) {
          try {
            const res = await fetch(`${supabaseUrl}/functions/v1/draft-reply`, {
              method: 'POST',
              headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
              body: JSON.stringify({ opportunity_id: opp.id }),
            })
            if (res.ok) drafted++
          } catch { /* keep going — one failed draft shouldn't block the rest */ }
        }
        await setStep('draft_replies', 'done', `${drafted} rascunhos prontos`)
      } catch (e) {
        await setStep('draft_replies', 'error', String(e))
      }

      // ── AI profile rebuild (delegates to update-company-profile) ──
      // Runs last so it picks up the freshly-synced reviews/competitors/sentiment
      // above. Campanhas, Viral Trends and post generation all read this cached
      // text instead of querying live — without this refresh they kept showing
      // whatever business was linked the last time a profile happened to be built.
      await setStep('profile', 'running')
      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/update-company-profile`, {
          method: 'POST',
          headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Erro ao atualizar perfil')
        await setStep('profile', 'done', 'atualizado')
      } catch (e) {
        await setStep('profile', 'error', String(e))
      }

      // ── Site diagnostics (delegates to site-diagnosis, only if outdated) ──
      // Skips the (slower) PageSpeed run entirely when the last diagnostic
      // already matches the current website_url — "não precisa refazer, só
      // atualizar o que tem de novo".
      if (company.website_url) {
        await setStep('diagnostics', 'running')
        try {
          const { data: lastDiag } = await admin
            .from('diagnostics')
            .select('website_url')
            .eq('company_id', company.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          if (lastDiag?.website_url === company.website_url) {
            await setStep('diagnostics', 'done', 'já atualizado')
          } else {
            const res = await fetch(`${supabaseUrl}/functions/v1/site-diagnosis`, {
              method: 'POST',
              headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
              body: JSON.stringify({}),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error ?? 'Erro ao rodar diagnóstico')
            await setStep('diagnostics', 'done', 'novo diagnóstico gerado')
          }
        } catch (e) {
          await setStep('diagnostics', 'error', String(e))
        }
      }

      // Passos de "menção na web" (busca o nome do negócio em redes abertas) são
      // enriquecimento opcional e às vezes dependem de scrapers de terceiros que
      // saem do ar — se só eles falharem, a sincronização não deve parecer que
      // "deu erro", porque tudo que importa (avaliações, concorrentes, perfil,
      // diagnóstico) foi atualizado. O erro do passo continua registrado no job.
      const OPTIONAL_STEPS = new Set(['x_mentions'])
      const hasError = liveSteps.some(s => s.status === 'error' && !OPTIONAL_STEPS.has(s.key))
      await admin.from('sync_jobs').update({
        status: hasError ? 'error' : 'done',
        updated_at: new Date().toISOString(),
      }).eq('id', jobId)
    }

    // @ts-ignore — EdgeRuntime is a Supabase Edge Functions global for background tasks
    EdgeRuntime.waitUntil(runSync())

    return json({ job_id: jobId, steps })
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
