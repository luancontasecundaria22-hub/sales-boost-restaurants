import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { useNavigate } from 'react-router-dom'

const ORANGE = '#FF6D29'
const CARD = '#150E08'
const MUTED = '#BABABA'
const D = "'Bricolage Grotesque', system-ui, sans-serif"
const BORDER = 'rgba(255,255,255,0.06)'

interface Review {
  id: string
  author: string | null
  rating: number | null
  text: string | null
  review_date: string | null
  sentiment: string | null
  themes: string[] | null
}

interface ThemeStat {
  theme: string
  total: number
  pos: number
  neg: number
}

const sentimentColor = (s: string | null) =>
  s === 'positive' ? '#4ade80' : s === 'negative' ? '#f87171' : '#FBBF24'
const sentimentBg = (s: string | null) =>
  s === 'positive' ? 'rgba(74,222,128,0.1)' : s === 'negative' ? 'rgba(248,113,113,0.1)' : 'rgba(251,191,36,0.1)'

export default function ReviewsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'positive' | 'negative' | 'neutral'>('all')
  const [themeStats, setThemeStats] = useState<ThemeStat[]>([])

  useEffect(() => {
    if (!user) return
    loadReviews()
  }, [user])

  const loadReviews = async () => {
    setLoading(true)
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('id')
      .eq('owner_id', user!.id)
      .single()

    if (!restaurant) { setLoading(false); return }

    const { data } = await supabase
      .from('reviews')
      .select('id, author, rating, text, review_date, sentiment, themes')
      .eq('restaurant_id', restaurant.id)
      .order('review_date', { ascending: false })
      .limit(100)

    const rows = data ?? []
    setReviews(rows)

    // Compute theme stats
    const counts: Record<string, { total: number; pos: number; neg: number }> = {}
    for (const r of rows) {
      for (const t of (r.themes ?? [])) {
        if (!counts[t]) counts[t] = { total: 0, pos: 0, neg: 0 }
        counts[t].total++
        if (r.sentiment === 'positive') counts[t].pos++
        if (r.sentiment === 'negative') counts[t].neg++
      }
    }
    const stats = Object.entries(counts)
      .map(([theme, c]) => ({ theme, ...c }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6)
    setThemeStats(stats)
    setLoading(false)
  }

  const filtered = filter === 'all' ? reviews : reviews.filter(r => r.sentiment === filter)
  const maxThemeCount = themeStats[0]?.total ?? 1

  const isEmpty = !loading && reviews.length === 0

  return (
    <div>
      <div style={{ padding: '28px 32px 24px', borderBottom: `1px solid ${BORDER}` }}>
        <h1 style={{ fontFamily: D, fontSize: '1.5rem', fontWeight: 800, color: 'white', letterSpacing: '-0.02em', marginBottom: '4px' }}>Reviews</h1>
        <p style={{ color: MUTED, fontSize: '13px' }}>
          {loading ? 'Carregando...' : `${reviews.length} avaliações coletadas`}
        </p>
      </div>

      <div style={{ padding: '28px 32px' }}>

        {isEmpty ? (
          <div style={{ background: 'rgba(255,109,41,0.06)', border: '1px solid rgba(255,109,41,0.2)', borderRadius: '14px', padding: '40px 32px', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '12px' }}>📭</div>
            <div style={{ fontSize: '16px', fontWeight: 600, color: 'white', marginBottom: '8px' }}>Nenhuma review importada ainda</div>
            <div style={{ fontSize: '13px', color: MUTED, marginBottom: '20px' }}>Configure seu Google Place ID e importe as reviews nas Configurações.</div>
            <button onClick={() => navigate('/dashboard/settings')}
              style={{ padding: '10px 22px', background: ORANGE, color: '#000', fontWeight: 700, fontSize: '13px', borderRadius: '9px', border: 'none', cursor: 'pointer' }}>
              Ir para Configurações →
            </button>
          </div>
        ) : (
          <>
            {/* Theme analysis */}
            {themeStats.length > 0 && (
              <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '14px', padding: '20px 24px', marginBottom: '24px' }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'white', marginBottom: '16px' }}>Temas mais citados</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {themeStats.map(t => (
                    <div key={t.theme} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '130px', fontSize: '12px', color: MUTED, textTransform: 'capitalize', flexShrink: 0 }}>{t.theme}</div>
                      <div style={{ flex: 1, height: '6px', borderRadius: '99px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                        <div style={{ width: `${(t.total / maxThemeCount) * 100}%`, height: '100%', borderRadius: '99px', background: t.neg > t.pos ? '#f87171' : '#4ade80', opacity: 0.7 }} />
                      </div>
                      <div style={{ width: '40px', fontSize: '11px', color: MUTED, textAlign: 'right', flexShrink: 0 }}>
                        {t.pos > 0 && <span style={{ color: '#4ade80' }}>+{t.pos}</span>}
                        {t.neg > 0 && <span style={{ color: '#f87171', marginLeft: '2px' }}>-{t.neg}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Filter tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              {(['all', 'positive', 'negative', 'neutral'] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  style={{ padding: '7px 16px', borderRadius: '99px', border: `1px solid ${filter === f ? 'rgba(255,109,41,0.4)' : BORDER}`, background: filter === f ? 'rgba(255,109,41,0.1)' : 'transparent', color: filter === f ? ORANGE : MUTED, fontSize: '12px', fontWeight: filter === f ? 600 : 400, cursor: 'pointer', transition: 'all 0.15s' }}>
                  {{ all: `Todas (${reviews.length})`, positive: `Positivas (${reviews.filter(r => r.sentiment === 'positive').length})`, negative: `Negativas (${reviews.filter(r => r.sentiment === 'negative').length})`, neutral: `Neutras (${reviews.filter(r => r.sentiment === 'neutral').length})` }[f]}
                </button>
              ))}
            </div>

            {/* Reviews list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filtered.map(r => (
                <div key={r.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '12px', padding: '16px 20px', display: 'flex', gap: '14px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,109,41,0.12)', border: '1px solid rgba(255,109,41,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: ORANGE, flexShrink: 0 }}>
                    {(r.author ?? '?')[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                      <div>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'white', marginRight: '10px' }}>{r.author ?? 'Anônimo'}</span>
                        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '99px', background: sentimentBg(r.sentiment), color: sentimentColor(r.sentiment), fontWeight: 700 }}>
                          {'★'.repeat(r.rating ?? 0)}{'☆'.repeat(5 - (r.rating ?? 0))}
                        </span>
                      </div>
                      <span style={{ fontSize: '11px', color: MUTED }}>{r.review_date}</span>
                    </div>
                    {r.text && <p style={{ fontSize: '13px', color: MUTED, lineHeight: 1.5, marginBottom: '8px' }}>{r.text}</p>}
                    {(r.themes ?? []).length > 0 && (
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {(r.themes ?? []).map(th => (
                          <span key={th} style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '99px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER}`, color: MUTED, textTransform: 'capitalize' }}>
                            {th}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
