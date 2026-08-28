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
      discovery_id?: string
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

    // ── list_discoveries ─────────────────────────────────────────────────────
    // Detecta descobertas REAIS (idempotente) e devolve pendentes + reveladas.
    if (body.action === 'list_discoveries') {
      await detectDiscoveries(admin, companyId)
      const { data: rows } = await admin.from('progress_discoveries')
        .select('*').eq('company_id', companyId).order('created_at', { ascending: false }).limit(40)
      const all = rows ?? []
      return json({ ok: true, pending: all.filter((d: { status: string }) => d.status === 'pending'), revealed: all.filter((d: { status: string }) => d.status === 'revealed') })
    }

    // ── reveal_discovery — credita XP só ao abrir ─────────────────────────────
    if (body.action === 'reveal_discovery') {
      const did = body.discovery_id
      if (!did) return json({ error: 'discovery_id obrigatório' }, 400)
      const { data: disc } = await admin.from('progress_discoveries').select('*').eq('id', did).eq('company_id', companyId).maybeSingle()
      if (!disc) return json({ error: 'Descoberta não encontrada' }, 404)
      if (disc.status !== 'revealed') {
        await admin.from('progress_discoveries').update({ status: 'revealed', revealed_at: new Date().toISOString() }).eq('id', did)
        // XP só agora (idempotente via dedupe).
        if (disc.xp > 0) {
          await admin.from('progress_events').insert({
            company_id: companyId, event_type: 'discovery_revealed', entity_id: String(did), source: 'progress_game', gp: disc.xp,
            meta: { title: disc.title, achievement: disc.achievement }, dedupe_key: `discovery_revealed:${did}`,
          }).then(() => {}, () => {})
        }
      }
      return json({ ok: true, discovery: { ...disc, status: 'revealed' } })
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

// Detecta descobertas GENUÍNAS a partir de dados reais. Cada uma é rastreável
// (entity_id + meta com before/after) e idempotente (dedupe_key). Se nada for
// notável, nada é criado — nunca fabrica nem esconde o comum pra criar curiosidade.
// deno-lint-ignore no-explicit-any
async function detectDiscoveries(admin: any, companyId: string) {
  const insert = async (d: Record<string, unknown>, dedupe: string) => {
    await admin.from('progress_discoveries').insert({ company_id: companyId, dedupe_key: dedupe, status: 'pending', ...d })
      .then(() => {}, () => {}) // erro de unique = já existe, ignora
  }

  // 1) Post que superou MUITO o próprio benchmark (Instagram real).
  try {
    const { data: posts } = await admin.from('instagram_posts')
      .select('id, likes_count, comments_count, caption, posted_at')
      .eq('company_id', companyId).order('posted_at', { ascending: false }).limit(40)
    if (posts && posts.length >= 6) {
      const eng = (p: { likes_count?: number; comments_count?: number }) => (p.likes_count ?? 0) + (p.comments_count ?? 0)
      const avg = posts.reduce((s: number, p: unknown) => s + eng(p as never), 0) / posts.length
      if (avg >= 5) {
        const star = posts.slice(0, 10).find((p: unknown) => eng(p as never) >= avg * 2.5 && eng(p as never) >= avg + 10)
        if (star) {
          const ratio = (eng(star) / avg).toFixed(1)
          await insert({
            kind: 'post_outperform', source: 'instagram', entity_id: String(star.id), xp: 250,
            title: 'Um post estourou o seu alcance',
            detail: `Sua publicação recente teve ${ratio}× o engajamento médio das suas últimas ${posts.length} publicações.`,
            reason: `Engajamento ${ratio}× acima da sua própria média — a IA classificou como um evento de expansão de audiência.`,
            achievement: 'Audience Breakthrough',
            meta: { avg_engagement: Math.round(avg), post_engagement: eng(star), ratio },
          }, `post_outperform:${star.id}`)
        }
      }
    }
  } catch { /* sem IG sincronizado — sem descoberta, tudo bem */ }

  // 2) Oportunidade de alto valor identificada pela IA.
  try {
    const { data: opps } = await admin.from('opportunities')
      .select('id, title, value_estimate, status').eq('company_id', companyId)
      .order('value_estimate', { ascending: false }).limit(1)
    const opp = opps?.[0]
    if (opp && (opp.value_estimate ?? 0) >= 500 && opp.status !== 'resolvido' && opp.status !== 'resolved') {
      await insert({
        kind: 'opportunity_insight', source: 'opportunities', entity_id: String(opp.id), xp: 120,
        title: 'A IA encontrou uma oportunidade valiosa',
        detail: `${opp.title} — receita estimada de R$ ${Number(opp.value_estimate).toLocaleString('pt-BR')} parada na mesa.`,
        reason: `Oportunidade acima de R$ 500 detectada nos seus dados e ainda não resolvida.`,
        achievement: 'Growth Insight',
        meta: { value_estimate: opp.value_estimate },
      }, `opportunity_insight:${opp.id}`)
    }
  } catch { /* opcional */ }

  // 3) Marco de conteúdo (posts publicados cruzando um número redondo).
  try {
    const { count } = await admin.from('posts').select('id', { count: 'exact', head: true })
      .eq('company_id', companyId).eq('status', 'publicado')
    const published = count ?? 0
    const crossed = [100, 50, 25, 10].find(t => published >= t)
    if (crossed) {
      await insert({
        kind: 'content_milestone', source: 'posts', entity_id: String(crossed), xp: 100,
        title: `${crossed} conteúdos publicados`,
        detail: `Seu negócio já publicou ${published} conteúdos com o SalesBoost.`,
        reason: `Marco de ${crossed} publicações alcançado — consistência de conteúdo é o que constrói audiência.`,
        achievement: 'Content Machine',
        meta: { published, milestone: crossed },
      }, `content_milestone:${crossed}`)
    }
  } catch { /* opcional */ }
}
