/**
 * business-progress — backend do Business Progress Game.
 *
 * Camada de eventos/recompensa por cima dos dados reais (não duplica clientes).
 * Ações:
 *   - activate_reward: ativa um boost/reward de forma IDEMPOTENTE (não permite
 *     ativar duplicado enquanto ainda ativo). Registra unlock + activation com
 *     expiração e credita um progress_event.
 *   - record_event: registra um evento de progresso creditando GP conforme a
 *     regra do banco (progress_gp_rules), com dedupe_key p/ anti-abuso.
 *   - get: marca a última visita e devolve o estado (GP, level, ativações).
 *
 * As regras (GP, níveis, pins, rewards) vivem no banco — nunca hardcoded.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? anonKey
    const bearer = req.headers.get('Authorization') ?? ''
    if (!bearer) return json({ error: 'Unauthorized' }, 401)

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: bearer } } })
    const { data: { user }, error: uErr } = await userClient.auth.getUser()
    if (uErr || !user) return json({ error: 'Unauthorized' }, 401)

    const admin = createClient(supabaseUrl, serviceKey)
    const body = await req.json().catch(() => ({})) as {
      action?: string; company_id?: string; reward_key?: string; agent?: string
      event_type?: string; entity_id?: string; source?: string; dedupe_key?: string; meta?: Record<string, unknown>
    }
    const companyId = body.company_id
    if (!companyId) return json({ error: 'company_id obrigatório' }, 400)

    // Ownership: a empresa precisa ser do usuário autenticado.
    const { data: comp } = await admin.from('companies').select('id, user_id').eq('id', companyId).maybeSingle()
    if (!comp || comp.user_id !== user.id) return json({ error: 'Forbidden' }, 403)

    // ── activate_reward ──────────────────────────────────────────────────────
    if (body.action === 'activate_reward') {
      const rewardKey = body.reward_key
      if (!rewardKey) return json({ error: 'reward_key obrigatório' }, 400)
      const { data: reward } = await admin.from('progress_rewards').select('*').eq('key', rewardKey).eq('active', true).maybeSingle()
      if (!reward) return json({ error: 'Reward inválido' }, 400)

      // Idempotência: se for boost temporário e já tiver ativação vigente, não duplica.
      if (reward.duration_hours) {
        const { data: activeRows } = await admin.from('progress_reward_activations')
          .select('id, expires_at').eq('company_id', companyId).eq('reward_key', rewardKey)
          .gt('expires_at', new Date().toISOString()).limit(1)
        if (activeRows && activeRows.length > 0) {
          return json({ ok: true, already: true, name: reward.name, duration_hours: reward.duration_hours, expires_at: activeRows[0].expires_at })
        }
      }

      const now = new Date()
      const expiresAt = reward.duration_hours ? new Date(now.getTime() + reward.duration_hours * 3600_000).toISOString() : null

      // Registra desbloqueio (idempotente) + ativação.
      await admin.from('progress_unlocks').upsert(
        { company_id: companyId, kind: 'reward', key: rewardKey },
        { onConflict: 'company_id,kind,key', ignoreDuplicates: true },
      )
      const { error: actErr } = await admin.from('progress_reward_activations').insert({
        company_id: companyId, reward_key: rewardKey, expires_at: expiresAt,
        source: body.agent ? 'pin' : 'admin', agent: body.agent ?? null, activated_by: user.id,
      })
      if (actErr) return json({ error: actErr.message }, 500)

      // Credita um evento (auditável).
      await admin.from('progress_events').insert({
        company_id: companyId, event_type: 'reward_activated', entity_id: rewardKey, source: 'progress_game', gp: 0,
        meta: { reward: reward.name, agent: body.agent ?? null },
        dedupe_key: `reward_activated:${rewardKey}:${now.toISOString().slice(0, 13)}`,
      }).then(() => {}, () => {})

      return json({ ok: true, name: reward.name, duration_hours: reward.duration_hours, expires_at: expiresAt })
    }

    // ── record_event ─────────────────────────────────────────────────────────
    if (body.action === 'record_event') {
      const eventType = body.event_type
      if (!eventType) return json({ error: 'event_type obrigatório' }, 400)
      const { data: rule } = await admin.from('progress_gp_rules').select('gp, active').eq('event_type', eventType).maybeSingle()
      if (!rule || !rule.active) return json({ ok: true, skipped: 'evento sem regra ativa' })

      const { error: evErr } = await admin.from('progress_events').insert({
        company_id: companyId, event_type: eventType, entity_id: body.entity_id ?? null,
        source: body.source ?? 'api', gp: rule.gp, meta: body.meta ?? {},
        dedupe_key: body.dedupe_key ?? null,
      })
      // Erro de unique (dedupe) = já contabilizado, não é falha.
      if (evErr && !/duplicate key/i.test(evErr.message)) return json({ error: evErr.message }, 500)
      return json({ ok: true, gp: evErr ? 0 : rule.gp, deduped: !!evErr })
    }

    // ── get (default) ────────────────────────────────────────────────────────
    const { data: prevState } = await admin.from('progress_state').select('last_visit_at').eq('company_id', companyId).maybeSingle()
    await admin.from('progress_state').upsert(
      { company_id: companyId, last_visit_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { onConflict: 'company_id' },
    )
    const { data: gpAgg } = await admin.from('progress_events').select('gp').eq('company_id', companyId)
    const totalGp = (gpAgg ?? []).reduce((s: number, r: { gp: number }) => s + (r.gp ?? 0), 0)
    const { data: activations } = await admin.from('progress_reward_activations')
      .select('reward_key, expires_at').eq('company_id', companyId).gt('expires_at', new Date().toISOString())

    return json({ ok: true, total_gp: totalGp, last_visit_at: prevState?.last_visit_at ?? null, active_rewards: activations ?? [] })
  } catch (err) {
    console.error('business-progress error:', err)
    return json({ error: err instanceof Error ? err.message : String(err) }, 500)
  }
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
}
