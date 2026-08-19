/**
 * global-references — curadoria GLOBAL de referências visuais (owner only).
 *
 * As referências ficam com company_id = NULL: são as MESMAS pra todos os
 * clientes (garantem um bom design), enquanto componentes e DNA da marca é que
 * personalizam. Clientes leem (RLS já libera company_id null) mas não editam;
 * só o owner adiciona/remove aqui (service role, checando role='owner').
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!, anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? anonKey
    const bearer = req.headers.get('Authorization') ?? ''
    if (!bearer) return json({ error: 'Unauthorized' }, 401)
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: bearer } } })
    const { data: { user }, error: uErr } = await userClient.auth.getUser()
    if (uErr || !user) return json({ error: 'Unauthorized' }, 401)

    const admin = createClient(supabaseUrl, serviceKey)
    const { data: roleRow } = await admin.from('user_roles').select('role').eq('email', user.email!).maybeSingle()
    if (roleRow?.role !== 'owner') return json({ error: 'Forbidden' }, 403)

    const body = await req.json().catch(() => ({})) as { action?: string; title?: string; content?: string; image_url?: string; tags?: string[]; meta?: Record<string, unknown>; id?: string; path?: string }

    if (body.action === 'add') {
      if (!body.title || !body.image_url) return json({ error: 'title e image_url são obrigatórios' }, 400)
      const { error } = await admin.from('marketing_ai_knowledge').insert({
        company_id: null, module: 'visual', kind: 'layout',
        title: body.title, content: body.content ?? null, tags: body.tags ?? [], image_url: body.image_url,
        meta: { ...(body.meta ?? {}), scope: 'global' },
      })
      if (error) return json({ error: error.message }, 500)
      return json({ ok: true })
    }

    if (body.action === 'delete') {
      if (!body.id) return json({ error: 'id obrigatório' }, 400)
      if (body.path) await admin.storage.from('post-images').remove([body.path]).catch(() => {})
      const { error } = await admin.from('marketing_ai_knowledge').delete().eq('id', body.id).is('company_id', null)
      if (error) return json({ error: error.message }, 500)
      return json({ ok: true })
    }

    return json({ error: "action inválida (use 'add' ou 'delete')" }, 400)
  } catch (err) {
    console.error('global-references error:', err)
    return json({ error: err instanceof Error ? err.message : String(err) }, 500)
  }
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
}
