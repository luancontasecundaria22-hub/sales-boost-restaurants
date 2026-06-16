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
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: userErr } = await userClient.auth.getUser()
    if (userErr || !user) return json({ error: 'Unauthorized' }, 401)

    const { diagnostic_id } = await req.json()
    if (!diagnostic_id) return json({ error: 'diagnostic_id required' }, 400)

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey)

    // Load the diagnostic
    const { data: diag, error: diagErr } = await serviceClient
      .from('diagnostics')
      .select('*')
      .eq('id', diagnostic_id)
      .is('company_id', null) // only claim unclaimed diagnostics
      .single()

    if (diagErr || !diag) return json({ error: 'Diagnóstico não encontrado ou já vinculado' }, 404)

    // Check if user already has a company
    const { data: existingCompany } = await serviceClient
      .from('companies')
      .select('id')
      .eq('user_id', user.id)
      .single()

    let companyId: string

    if (existingCompany) {
      companyId = existingCompany.id
    } else {
      // Create companies record from diagnostic data
      const { data: company, error: companyErr } = await serviceClient
        .from('companies')
        .insert({
          user_id: user.id,
          business_name: diag.business_name,
          business_type: diag.business_type,
          city: diag.city,
          website_url: diag.website_url,
          instagram_url: diag.instagram_url,
          facebook_url: diag.facebook_url,
          tiktok_url: diag.tiktok_url,
          google_maps_url: diag.google_maps_url,
          phone: diag.phone,
          contact_email: diag.contact_email,
          goal: diag.goal,
          plan: 'free',
        })
        .select('id')
        .single()

      if (companyErr || !company) return json({ error: companyErr?.message ?? 'Erro ao criar empresa' }, 500)
      companyId = company.id
    }

    // Link diagnostic to company and user
    await serviceClient
      .from('diagnostics')
      .update({ company_id: companyId, user_id: user.id })
      .eq('id', diagnostic_id)

    return json({ company_id: companyId, diagnostic_id })

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
