import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCompany } from '../../../contexts/CompanyContext'
import { supabase } from '../../../lib/supabase'
import { D } from './shared'
import { buildProgress, choosePopup, type ProgressData, type PopupVariant, type RealSignals } from './progressGame'

const ORANGE = '#FF6D29'
const GREEN = '#4ade80'
const MUTED = '#BABABA'
const LS_SHOWN = 'sb_popup_last_shown'
const LS_LEAGUE = 'sb_seen_league'
const LS_STREAK = 'sb_seen_streak'

const today = () => new Date().toISOString().slice(0, 10)

async function count(table: string, companyId: string, filter?: [string, string]): Promise<number> {
  let q = supabase.from(table).select('id', { count: 'exact', head: true }).eq('company_id', companyId)
  if (filter) q = q.eq(filter[0], filter[1])
  const { count } = await q
  return count ?? 0
}

// Popup inteligente: NUNCA pede trabalho. Revela o que a IA já fez e onde o
// negócio está. Aparece 1x/dia ao abrir a plataforma; escolhe a variante mais
// relevante pelos dados reais.
export default function ProgressPopup() {
  const { company } = useCompany()
  const navigate = useNavigate()
  const [data, setData] = useState<ProgressData | null>(null)
  const [variant, setVariant] = useState<PopupVariant>('status')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!company?.id) return
    let lastShown: string | null = null
    try { lastShown = localStorage.getItem(LS_SHOWN) } catch { /* ignore */ }
    if (lastShown === today()) return // já mostrou hoje

    let alive = true
    ;(async () => {
      const cid = company.id
      const [posts, postsPublished, opportunities, reviewsReplied, campaigns] = await Promise.all([
        count('posts', cid), count('posts', cid, ['status', 'publicado']),
        count('opportunities', cid), count('reviews', cid),
        count('campaigns', cid),
      ])
      const daysSinceVisit = lastShown ? Math.max(1, Math.round((Date.now() - new Date(lastShown).getTime()) / 86400000)) : 1
      const real: RealSignals = { posts, postsPublished, opportunities, reviewsReplied, campaigns, activitySinceVisit: 0, daysSinceVisit }
      const d = buildProgress({ id: cid, business_name: company.business_name ?? '' }, real)

      let lastSeenLeague: string | null = null, lastStreakSeen = 0
      try { lastSeenLeague = localStorage.getItem(LS_LEAGUE); lastStreakSeen = Number(localStorage.getItem(LS_STREAK) ?? '0') } catch { /* ignore */ }
      const v = choosePopup(d, { daysSinceVisit, lastSeenLeague, lastStreakSeen })

      if (!alive) return
      setData(d); setVariant(v); setOpen(true)
    })()
    return () => { alive = false }
  }, [company?.id, company?.business_name])

  const dismiss = (go?: boolean) => {
    try {
      localStorage.setItem(LS_SHOWN, today())
      if (data) { localStorage.setItem(LS_LEAGUE, data.level.key); localStorage.setItem(LS_STREAK, String(data.streak)) }
    } catch { /* ignore */ }
    setOpen(false)
    if (go) navigate('/dashboard/progresso')
  }

  if (!open || !data) return null
  const d = data
  const c = d.level.color
  const xp = (n: number) => n.toLocaleString('pt-BR')

  const Bar = ({ pct, color }: { pct: number; color: string }) => (
    <div style={{ height: '12px', background: 'rgba(255,255,255,0.09)', borderRadius: '99px', overflow: 'hidden', margin: '4px 0 8px' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: `linear-gradient(90deg, ${color}, #ffffff88)`, borderRadius: '99px' }} />
    </div>
  )
  const Metric = ({ icon, label, value, color }: { icon: string; label: string; value: string; color?: string }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <span style={{ fontSize: '13px', color: MUTED }}>{icon} {label}</span>
      <span style={{ fontSize: '15px', fontWeight: 800, color: color ?? 'white' }}>{value}</span>
    </div>
  )
  const CTA = ({ label }: { label: string }) => (
    <button onClick={() => dismiss(true)} style={{ width: '100%', marginTop: '18px', padding: '13px', background: ORANGE, color: '#000', fontWeight: 800, fontSize: '13.5px', border: 'none', borderRadius: '11px', cursor: 'pointer', fontFamily: D, letterSpacing: '0.02em' }}>{label}</button>
  )

  const nextName = d.nextLevel?.name ?? 'Master'

  const body = () => {
    switch (variant) {
      case 'results': return (<>
        <Title emoji="🚀" text="BOM DIA, CONSTRUTOR DE NEGÓCIO" />
        <Sub>Seu negócio avançou enquanto você estava fora.</Sub>
        <div style={{ margin: '14px 0' }}>
          <Metric icon="📈" label="Alcance" value={`+${d.reachPct}%`} color={GREEN} />
          <Metric icon="❤️" label="Engajamento" value={`${d.engagementPct >= 0 ? '+' : ''}${d.engagementPct}%`} color={d.engagementPct >= 0 ? GREEN : '#f87171'} />
          <Metric icon="🤖" label="Ações da IA" value={String(d.actionsCount)} />
          <Metric icon="🟢" label="XP ganhos" value={`+${xp(d.gpEarnedSinceVisit)}`} color={c} />
        </div>
        <LeagueLine d={d} c={c} />
        <Bar pct={d.levelPct} color={c} />
        <div style={{ fontSize: '12.5px', color: 'white' }}>Você está chegando perto da <strong>{nextName} League</strong>.</div>
        <div style={{ fontSize: '12px', color: MUTED, marginTop: '4px' }}>🔓 Algo novo está te esperando…</div>
        <CTA label="VER MEU PROGRESSO →" />
      </>)
      case 'status': return (<>
        <Title emoji="🏆" text="SEU STATUS DE NEGÓCIO" />
        <div style={{ textAlign: 'center', margin: '10px 0 14px' }}>
          <div style={{ fontSize: '46px', lineHeight: 1 }}>{d.level.icon}</div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: c, marginTop: '6px' }}>{d.level.name.toUpperCase()} BUSINESS</div>
          <div style={{ fontSize: '12px', color: MUTED }}>{d.level.identity}</div>
        </div>
        <Bar pct={d.levelPct} color={c} />
        <div style={{ textAlign: 'center', fontSize: '18px', fontWeight: 900, color: 'white' }}>{xp(d.totalGp)} XP</div>
        <div style={{ textAlign: 'center', fontSize: '12.5px', color: MUTED, marginTop: '6px' }}>Você chegou à <strong style={{ color: c }}>{d.level.name} League</strong>. Está ganhando tração.</div>
        <div style={{ textAlign: 'center', fontSize: '13px', color: ORANGE, fontWeight: 700, marginTop: '10px' }}>🔥 {d.streak} dias de Business Streak</div>
        <CTA label="VER O BUSINESS GAME →" />
      </>)
      case 'almost': return (<>
        <Title emoji="👀" text="VOCÊ ESTÁ QUASE LÁ…" />
        <div style={{ textAlign: 'center', fontSize: '20px', fontWeight: 900, color: 'white', margin: '10px 0 2px' }}>{nextName} League</div>
        <Bar pct={d.levelPct} color={c} />
        <div style={{ textAlign: 'center', fontSize: '14px', color: 'white', fontWeight: 700 }}>Só {xp(d.gpToNext)} XP para chegar.</div>
        <div style={{ textAlign: 'center', fontSize: '12.5px', color: MUTED, marginTop: '10px' }}>🔓 Algo novo desbloqueia na <strong style={{ color: c }}>{nextName} League</strong></div>
        <div style={{ textAlign: 'center', fontSize: '12.5px', color: 'white', marginTop: '4px' }}>Consegue adivinhar o que é? 👀</div>
        <CTA label="VER MINHA JORNADA →" />
      </>)
      case 'levelup': return (<>
        <Title emoji="🎉" text="SUBIU DE LIGA!" />
        <div style={{ textAlign: 'center', margin: '12px 0' }}>
          <div style={{ fontSize: '40px' }}>{d.level.icon}</div>
          <div style={{ fontSize: '22px', fontWeight: 900, color: c, marginTop: '6px' }}>{d.level.name.toUpperCase()} BUSINESS</div>
        </div>
        <div style={{ textAlign: 'center', fontSize: '12.5px', color: MUTED }}>Seu negócio atingiu um novo marco.</div>
        {d.newAchievement && <div style={{ textAlign: 'center', fontSize: '14px', fontWeight: 800, color: 'white', marginTop: '10px' }}>🏆 Nova conquista: {d.newAchievement}</div>}
        <div style={{ textAlign: 'center', fontSize: '12.5px', color: GREEN, marginTop: '6px' }}>🔓 Nova capacidade desbloqueada</div>
        <CTA label="VER O QUE DESBLOQUEEI →" />
      </>)
      case 'streak': return (<>
        <Title emoji="🔥" text="SEU BUSINESS STREAK" />
        <div style={{ textAlign: 'center', fontSize: '46px', fontWeight: 900, color: ORANGE, margin: '10px 0 4px' }}>{d.streak} DIAS</div>
        <div style={{ textAlign: 'center', fontSize: '12.5px', color: MUTED, lineHeight: 1.6 }}>Seu negócio evoluiu por {d.streak} dias seguidos. Sua IA continuou trabalhando. Seu negócio continuou se movendo.</div>
        <div style={{ textAlign: 'center', fontSize: '13px', fontWeight: 800, color: 'white', marginTop: '10px' }}>Não quebre o streak.</div>
        <div style={{ textAlign: 'center', fontSize: '13px', fontWeight: 800, color: GREEN, marginTop: '6px' }}>🟢 +100 XP</div>
        <CTA label="CONTINUAR →" />
      </>)
      case 'while_away': return (<>
        <Title emoji="👀" text="ENQUANTO VOCÊ ESTAVA FORA…" />
        <Sub>Sua IA continuou trabalhando.</Sub>
        <div style={{ margin: '14px 0' }}>
          <Metric icon="🤖" label="Ações concluídas" value={String(d.actionsCount)} />
          <Metric icon="📝" label="Conteúdos criados" value={String(d.contentCreated)} />
          <Metric icon="📈" label="Alcance" value={`+${d.reachPct}%`} color={GREEN} />
          <Metric icon="❤️" label="Engajamento" value={`${d.engagementPct >= 0 ? '+' : ''}${d.engagementPct}%`} color={d.engagementPct >= 0 ? GREEN : '#f87171'} />
          {d.newAchievement && <Metric icon="🏆" label="Nova conquista" value={d.newAchievement} />}
          <Metric icon="🟢" label="XP ganhos" value={`+${xp(d.gpEarnedSinceVisit)}`} color={c} />
        </div>
        <div style={{ fontSize: '13px', color: 'white', fontWeight: 700 }}>Seu negócio está na <strong style={{ color: c }}>{d.level.name} League</strong>.</div>
        <CTA label="VER TUDO →" />
      </>)
    }
  }

  return (
    <div onClick={() => dismiss(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: D, animation: 'sbfade 0.25s ease' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '420px', background: 'linear-gradient(180deg, #1A1008, #120c07)', border: `1px solid ${c}44`, borderRadius: '20px', padding: '26px 26px 24px', position: 'relative', boxShadow: `0 24px 80px rgba(0,0,0,0.6), 0 0 60px ${c}18`, animation: 'sbpop 0.3s cubic-bezier(0.34,1.56,0.64,1)' }}>
        <button onClick={() => dismiss(false)} style={{ position: 'absolute', top: '14px', right: '16px', background: 'transparent', border: 'none', color: MUTED, fontSize: '18px', cursor: 'pointer', lineHeight: 1 }}>×</button>
        {body()}
      </div>
      <style>{`@keyframes sbfade{from{opacity:0}to{opacity:1}}@keyframes sbpop{from{opacity:0;transform:scale(0.9) translateY(10px)}to{opacity:1;transform:none}}`}</style>
    </div>
  )
}

function Title({ emoji, text }: { emoji: string; text: string }) {
  return <div style={{ fontSize: '18px', fontWeight: 900, color: 'white', letterSpacing: '-0.01em', lineHeight: 1.2, paddingRight: '20px' }}>{emoji} {text}</div>
}
function Sub({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: '13px', color: MUTED, marginTop: '6px', lineHeight: 1.5 }}>{children}</div>
}
function LeagueLine({ d, c }: { d: ProgressData; c: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '6px 0' }}>
      <span style={{ fontSize: '18px' }}>{d.level.icon}</span>
      <span style={{ fontSize: '14px', fontWeight: 800, color: c }}>{d.level.name.toUpperCase()} BUSINESS</span>
      <span style={{ fontSize: '11px', color: MUTED, marginLeft: 'auto' }}>{d.levelPct}%</span>
    </div>
  )
}
