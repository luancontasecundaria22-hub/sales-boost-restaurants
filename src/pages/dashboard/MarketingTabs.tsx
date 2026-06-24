import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'

const ORANGE = '#FF6D29'
const CARD = '#150E08'
const MUTED = '#BABABA'
const D = "'Bricolage Grotesque', system-ui, sans-serif"
const BORDER = 'rgba(255,255,255,0.06)'
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string

// ── Shared helper ──────────────────────────────────────────────

async function callContentIntelligence(token: string, body: Record<string, unknown>) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/content-intelligence`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error)
  return data
}

// ── Viral Trends ───────────────────────────────────────────────

interface Trend {
  topic: string
  reason: string
  hook: string
  format: string
}

interface TrendsData {
  trends: Trend[]
  hashtags: string[]
  best_format: string
  best_times: string[]
}

export function ViralTrendsTab() {
  const { session } = useAuth()
  const [data, setData] = useState<TrendsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const generate = async () => {
    if (!session) return
    setLoading(true)
    setError('')
    try {
      const result = await callContentIntelligence(session.access_token, { type: 'trends' })
      setData(result)
    } catch {
      setError('Não foi possível gerar as tendências agora. Tente novamente.')
    }
    setLoading(false)
  }

  if (!data && !loading) {
    return (
      <div style={{ padding: '24px 32px' }}>
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '60px', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '16px' }}>🔥</div>
          <div style={{ fontFamily: D, fontSize: '1.2rem', fontWeight: 700, color: 'white', marginBottom: '8px' }}>Tendências virais para o seu negócio</div>
          <p style={{ color: MUTED, fontSize: '13px', maxWidth: '420px', margin: '0 auto 24px', lineHeight: 1.7 }}>
            O Agente de Marketing analisa seu perfil e identifica o que está bombando no Instagram e WhatsApp agora — com hooks prontos para usar.
          </p>
          {error && <p style={{ color: '#f87171', fontSize: '13px', marginBottom: '16px' }}>{error}</p>}
          <button onClick={generate} style={{ padding: '11px 28px', background: ORANGE, color: '#000', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: D }}>
            Gerar tendências agora
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ padding: '24px 32px' }}>
        <div style={{ background: CARD, border: `1px solid rgba(255,109,41,0.15)`, borderRadius: '16px', padding: '60px', textAlign: 'center' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: `2px solid rgba(255,109,41,0.3)`, borderTopColor: ORANGE, margin: '0 auto 16px', animation: 'spin 0.8s linear infinite' }} />
          <div style={{ color: MUTED, fontSize: '13px' }}>Agente de Marketing identificando as tendências do seu segmento...</div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ padding: '24px 32px' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ fontFamily: D, fontWeight: 700, color: 'white', fontSize: '1rem' }}>Tendências desta semana</div>
        <button onClick={generate} disabled={loading} style={{ padding: '7px 14px', background: 'rgba(255,109,41,0.1)', color: ORANGE, border: '1px solid rgba(255,109,41,0.25)', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: D }}>
          Atualizar
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
        {data!.trends?.map((t, i) => (
          <div key={i} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '14px', padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
              <span style={{ padding: '3px 10px', borderRadius: '99px', background: 'rgba(255,109,41,0.1)', border: '1px solid rgba(255,109,41,0.2)', color: ORANGE, fontSize: '11px', fontWeight: 700 }}>
                {t.format}
              </span>
              <div style={{ fontFamily: D, fontWeight: 700, color: 'white', fontSize: '14px' }}>{t.topic}</div>
            </div>
            <p style={{ color: MUTED, fontSize: '12.5px', marginBottom: '12px', lineHeight: 1.6 }}>{t.reason}</p>
            <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}`, borderRadius: '8px', padding: '10px 14px' }}>
              <div style={{ fontSize: '10px', color: MUTED, textTransform: 'uppercase' as const, letterSpacing: '0.07em', marginBottom: '5px' }}>Hook sugerido</div>
              <div style={{ color: 'white', fontSize: '13px', fontStyle: 'italic' }}>"{t.hook}"</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '14px', padding: '20px' }}>
          <div style={{ fontSize: '10px', color: MUTED, textTransform: 'uppercase' as const, letterSpacing: '0.07em', marginBottom: '12px' }}>Hashtags em alta</div>
          <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '6px' }}>
            {data!.hashtags?.map((h, i) => (
              <span key={i} style={{ padding: '4px 10px', borderRadius: '99px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`, color: MUTED, fontSize: '12px' }}>{h}</span>
            ))}
          </div>
        </div>
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '14px', padding: '20px' }}>
          <div style={{ fontSize: '10px', color: MUTED, textTransform: 'uppercase' as const, letterSpacing: '0.07em', marginBottom: '8px' }}>Melhor formato agora</div>
          <p style={{ color: 'white', fontSize: '13px', lineHeight: 1.6, marginBottom: '14px' }}>{data!.best_format}</p>
          <div style={{ fontSize: '10px', color: MUTED, textTransform: 'uppercase' as const, letterSpacing: '0.07em', marginBottom: '6px' }}>Melhores horários</div>
          <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '5px' }}>
            {data!.best_times?.map((t, i) => (
              <span key={i} style={{ padding: '3px 9px', borderRadius: '6px', background: 'rgba(255,109,41,0.08)', color: ORANGE, fontSize: '11px', fontWeight: 600 }}>{t}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Campanhas ──────────────────────────────────────────────────

interface CampaignPost {
  day: number
  day_name: string
  theme: string
  caption_hook: string
  format: string
  channel: string
  best_time: string
}

interface CampaignPlan {
  brief: string
  posts: CampaignPost[]
}

const CHANNEL_COLORS: Record<string, string> = {
  Instagram: '#E1306C',
  WhatsApp: '#25D366',
}

export function CampanhasTab() {
  const { session } = useAuth()
  const [plan, setPlan] = useState<CampaignPlan | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [goal, setGoal] = useState('')
  const [duration, setDuration] = useState('7')

  const create = async () => {
    if (!session || !name.trim() || !goal.trim()) return
    setLoading(true)
    setError('')
    try {
      const result = await callContentIntelligence(session.access_token, {
        type: 'campaign',
        name: name.trim(),
        goal: goal.trim(),
        duration_days: Number(duration),
        channels: ['Instagram', 'WhatsApp'],
      })
      setPlan(result)
    } catch {
      setError('Não foi possível criar o plano agora. Tente novamente.')
    }
    setLoading(false)
  }

  if (plan) {
    return (
      <div style={{ padding: '24px 32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <div style={{ fontFamily: D, fontWeight: 700, color: 'white', fontSize: '1rem' }}>{name}</div>
            <p style={{ color: MUTED, fontSize: '13px', marginTop: '4px', lineHeight: 1.6, maxWidth: '560px' }}>{plan.brief}</p>
          </div>
          <button onClick={() => { setPlan(null); setName(''); setGoal(''); setDuration('7') }} style={{ padding: '7px 14px', background: 'transparent', color: MUTED, border: `1px solid ${BORDER}`, borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontFamily: D, flexShrink: 0 }}>
            Nova campanha
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '10px' }}>
          {plan.posts?.map((p, i) => (
            <div key={i} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '14px', padding: '16px 20px', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              <div style={{ flexShrink: 0, textAlign: 'center', minWidth: '52px' }}>
                <div style={{ fontFamily: D, fontWeight: 900, color: ORANGE, fontSize: '1.5rem', lineHeight: 1 }}>D{p.day}</div>
                <div style={{ fontSize: '10px', color: MUTED, marginTop: '2px' }}>{p.day_name}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' as const }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 9px', borderRadius: '6px', background: `${CHANNEL_COLORS[p.channel] ?? ORANGE}22`, color: CHANNEL_COLORS[p.channel] ?? ORANGE }}>
                    {p.channel}
                  </span>
                  <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 9px', borderRadius: '6px', background: 'rgba(255,255,255,0.04)', color: MUTED }}>{p.format}</span>
                  <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 9px', borderRadius: '6px', background: 'rgba(255,255,255,0.04)', color: MUTED }}>{p.best_time}</span>
                </div>
                <div style={{ fontFamily: D, fontWeight: 600, color: 'white', fontSize: '13.5px', marginBottom: '5px' }}>{p.theme}</div>
                <div style={{ color: MUTED, fontSize: '12.5px', fontStyle: 'italic' }}>"{p.caption_hook}"</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '24px 32px' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ maxWidth: '560px' }}>
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '28px' }}>
          <div style={{ fontFamily: D, fontSize: '1.1rem', fontWeight: 700, color: 'white', marginBottom: '4px' }}>Nova campanha</div>
          <p style={{ color: MUTED, fontSize: '13px', marginBottom: '24px', lineHeight: 1.6 }}>
            O Agente de Marketing cria um calendário de conteúdo completo para Instagram e WhatsApp baseado no seu objetivo.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '16px' }}>
            <div>
              <label style={{ fontSize: '11px', color: MUTED, textTransform: 'uppercase' as const, letterSpacing: '0.07em', display: 'block', marginBottom: '6px' }}>Nome da campanha</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ex: Semana do Aniversário, Volta às Aulas..."
                style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`, borderRadius: '9px', padding: '10px 14px', color: 'white', fontSize: '13px', fontFamily: D, boxSizing: 'border-box' as const, outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', color: MUTED, textTransform: 'uppercase' as const, letterSpacing: '0.07em', display: 'block', marginBottom: '6px' }}>Objetivo</label>
              <input
                value={goal}
                onChange={e => setGoal(e.target.value)}
                placeholder="Ex: Aumentar vendas, lançar produto, ganhar seguidores..."
                style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`, borderRadius: '9px', padding: '10px 14px', color: 'white', fontSize: '13px', fontFamily: D, boxSizing: 'border-box' as const, outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', color: MUTED, textTransform: 'uppercase' as const, letterSpacing: '0.07em', display: 'block', marginBottom: '8px' }}>Duração</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[['7', '1 semana'], ['14', '2 semanas'], ['30', '1 mês']].map(([val, label]) => (
                  <button key={val} onClick={() => setDuration(val)}
                    style={{ flex: 1, padding: '9px', borderRadius: '8px', border: `1px solid ${duration === val ? ORANGE : BORDER}`, background: duration === val ? 'rgba(255,109,41,0.1)' : 'transparent', color: duration === val ? ORANGE : MUTED, fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: D }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {error && <p style={{ marginTop: '12px', fontSize: '12px', color: '#f87171' }}>{error}</p>}

          <button
            onClick={create}
            disabled={loading || !name.trim() || !goal.trim()}
            style={{ marginTop: '20px', width: '100%', padding: '12px', background: name.trim() && goal.trim() ? ORANGE : 'rgba(255,109,41,0.3)', color: '#000', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '13px', cursor: name.trim() && goal.trim() && !loading ? 'pointer' : 'not-allowed', fontFamily: D, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            {loading
              ? <><div style={{ width: '14px', height: '14px', borderRadius: '50%', border: '2px solid rgba(0,0,0,0.3)', borderTopColor: '#000', animation: 'spin 0.8s linear infinite' }} /> Criando plano...</>
              : 'Criar plano de campanha'}
          </button>
        </div>
      </div>
    </div>
  )
}
