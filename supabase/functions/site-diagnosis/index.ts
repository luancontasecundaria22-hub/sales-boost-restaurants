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
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? supabaseAnonKey
    const pagespeedKey = Deno.env.get('PAGESPEED_API_KEY') ?? ''

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: userErr } = await userClient.auth.getUser()
    if (userErr || !user) return json({ error: 'Unauthorized' }, 401)

    const admin = createClient(supabaseUrl, serviceKey)

    const { data: company } = await admin
      .from('companies')
      .select('id, website_url, business_name, business_type, city, contact_email, goal')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!company) return json({ error: 'Configure seu perfil nas Configurações primeiro.' }, 404)
    if (!company.website_url) return json({ error: 'URL do site não configurada. Adicione nas Configurações.' }, 400)

    let websiteUrl = company.website_url.trim()
    if (!websiteUrl.startsWith('http')) websiteUrl = `https://${websiteUrl}`

    // Insert processing row linked to this company
    const { data: row, error: insertErr } = await admin
      .from('diagnostics')
      .insert({
        company_id: company.id,
        business_name: company.business_name,
        business_type: company.business_type,
        city: company.city,
        website_url: websiteUrl,
        contact_email: company.contact_email ?? '',
        goal: company.goal ?? '',
        status: 'processing',
      })
      .select('id')
      .single()

    if (insertErr || !row) return json({ error: insertErr?.message ?? 'Erro ao criar diagnóstico' }, 500)

    const diagnosticId = row.id

    // PageSpeed mobile + desktop in parallel
    const cats = ['PERFORMANCE', 'SEO', 'ACCESSIBILITY', 'BEST_PRACTICES'].map(c => `category=${c}`).join('&')
    const keyParam = pagespeedKey ? `&key=${pagespeedKey}` : ''
    const psBase = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(websiteUrl)}&${cats}${keyParam}`

    const [mobileRes, desktopRes] = await Promise.allSettled([
      fetch(`${psBase}&strategy=mobile`),
      fetch(`${psBase}&strategy=desktop`),
    ])

    const parse = async (res: PromiseSettledResult<Response>) => {
      if (res.status !== 'fulfilled' || !res.value.ok) return null
      try {
        const raw = await res.value.json()
        const lr = raw?.lighthouseResult ?? {}
        const audits = lr?.audits ?? {}
        const categories = lr?.categories ?? {}
        const score = (k: string) => Math.round((categories[k]?.score ?? 0) * 100)
        const ms = (k: string): number | undefined => {
          const v = audits[k]?.numericValue
          return v != null ? Math.round(v) : undefined
        }
        const opps = Object.entries(audits as Record<string, { score?: number; displayValue?: string; title?: string }>)
          .filter(([, v]) => typeof v.score === 'number' && v.score < 0.9 && v.displayValue)
          .slice(0, 6)
          .map(([k, v]) => ({ id: k, title: v.title ?? k, displayValue: v.displayValue! }))
        return {
          performance: score('performance'),
          seo: score('seo'),
          accessibility: score('accessibility'),
          best_practices: score('best-practices'),
          lcp: ms('largest-contentful-paint'),
          fcp: ms('first-contentful-paint'),
          si: ms('speed-index'),
          tbt: ms('total-blocking-time'),
          cls: audits['cumulative-layout-shift']?.numericValue != null
            ? Number(Number(audits['cumulative-layout-shift'].numericValue).toFixed(3)) : undefined,
          opportunities: opps,
        }
      } catch { return null }
    }

    const [mobile, desktop] = await Promise.all([parse(mobileRes), parse(desktopRes)])
    const hasData = !!(mobile || desktop)

    await admin.from('diagnostics').update({
      pagespeed_mobile: mobile,
      pagespeed_desktop: desktop,
      status: hasData ? 'complete' : 'partial',
    }).eq('id', diagnosticId)

    return json({ ok: true, id: diagnosticId, status: hasData ? 'complete' : 'partial' })

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
