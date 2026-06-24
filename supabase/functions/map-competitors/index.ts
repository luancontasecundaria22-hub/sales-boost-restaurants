import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const BT_TO_TYPE: Record<string, string> = {
  'Restaurante / Food': 'restaurant',
  'Varejo / E-commerce': 'store',
  'Beleza & Estética': 'beauty_salon',
  'Saúde & Bem-estar': 'health',
  'Serviços': 'establishment',
}

const MARKETING_NOTIFY_URL = Deno.env.get('MARKETING_BOT_NOTIFY_URL')
const TELEGRAM_WEBHOOK_SECRET = Deno.env.get('TELEGRAM_WEBHOOK_SECRET')

async function notifyMarketing(adminDb: ReturnType<typeof createClient>, companyId: string, event: string, data?: Record<string, unknown>) {
  if (!MARKETING_NOTIFY_URL || !TELEGRAM_WEBHOOK_SECRET) return
  const { data: chat } = await adminDb
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Unauthorized' }, 401)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? supabaseAnonKey
    const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY')

    if (!apiKey) return json({ error: 'GOOGLE_PLACES_API_KEY não configurada no servidor.' }, 503)

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: userErr } = await userClient.auth.getUser()
    if (userErr || !user) return json({ error: 'Unauthorized' }, 401)

    const admin = createClient(supabaseUrl, serviceKey)

    const { data: company } = await admin
      .from('companies')
      .select('id, business_name, business_type, google_place_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!company) return json({ error: 'Empresa não encontrada.' }, 404)
    if (!company.google_place_id) {
      return json({ error: 'Vincule seu negócio ao Google nas Configurações primeiro.' }, 400)
    }

    // Get lat/lng from Place Details API
    const detailsRes = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${company.google_place_id}&fields=geometry&key=${apiKey}`
    )
    const details = await detailsRes.json()
    if (details.status !== 'OK') {
      return json({ error: `Google Places error: ${details.status}` }, 400)
    }

    const { lat, lng } = details.result.geometry.location
    const placeType = BT_TO_TYPE[company.business_type ?? ''] ?? 'establishment'

    // Nearby search in 2km radius
    const nearbyUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=2000&type=${placeType}&language=pt-BR&key=${apiKey}`
    const nearbyRes = await fetch(nearbyUrl)
    const nearbyData = await nearbyRes.json()

    if (nearbyData.status !== 'OK' && nearbyData.status !== 'ZERO_RESULTS') {
      return json({ error: `Google Places nearby error: ${nearbyData.status}` }, 400)
    }

    const places: GooglePlace[] = (nearbyData.results ?? [])
      .filter((p: GooglePlace) => p.place_id !== company.google_place_id)
      .slice(0, 10)

    if (places.length === 0) return json({ mapped: 0 })

    const rows = places.map((p: GooglePlace) => ({
      company_id: company.id,
      google_place_id: p.place_id,
      name: p.name,
      rating: p.rating ?? null,
      review_count: p.user_ratings_total ?? 0,
      distance_m: Math.round(haversine(lat, lng, p.geometry.location.lat, p.geometry.location.lng)),
      price_level: p.price_level ?? null,
    }))

    // Replace all: delete then insert fresh
    await admin.from('competitors').delete().eq('company_id', company.id)
    await admin.from('competitors').insert(rows)

    if (rows.length > 0) {
      notifyMarketing(admin, company.id, 'NEW_COMPETITOR', {
        count: rows.length,
        competitors: rows.map((r: { name: string }) => r.name),
      })
    }

    return json({ mapped: rows.length })

  } catch (err) {
    return json({ error: String(err) }, 500)
  }
})

interface GooglePlace {
  place_id: string
  name: string
  rating?: number
  user_ratings_total?: number
  price_level?: number
  geometry: { location: { lat: number; lng: number } }
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
