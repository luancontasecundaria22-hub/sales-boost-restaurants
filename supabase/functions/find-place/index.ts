import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { query, lat, lng } = await req.json()

    const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY')
    if (!apiKey) return json({ error: 'GOOGLE_PLACES_API_KEY não configurada' }, 500)

    // Use Find Place From Text API to get the Place ID
    const input = query ?? `${lat},${lng}`
    const url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(input)}&inputtype=textquery&fields=place_id,name,formatted_address&locationbias=point:${lat},${lng}&key=${apiKey}`

    const res = await fetch(url)
    const data = await res.json()

    if (data.status !== 'OK' || !data.candidates?.length) {
      return json({ error: `Nenhum lugar encontrado: ${data.status}` }, 404)
    }

    return json({ candidates: data.candidates })

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
