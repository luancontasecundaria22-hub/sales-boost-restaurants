import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

const CARD = '#150E08'
const MUTED = '#BABABA'
const D = "'Bricolage Grotesque', system-ui, sans-serif"
const BORDER = 'rgba(255,255,255,0.06)'
const ORANGE = '#FF6D29'
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string

interface Competitor {
  id: string
  name: string
  rating: number | null
  review_count: number
  distance_m: number | null
  price_level: number | null
  google_place_id: string | null
}

function PriceLevel({ level }: { level: number | null }) {
  if (!level) return <span style={{ color: 'rgba(255,255,255,0.2)' }}>—</span>
  return (
    <span style={{ fontWeight: 600 }}>
      {Array.from({ length: 4 }, (_, i) => (
        <span key={i} style={{ color: i < level ? '#FBBF24' : 'rgba(255,255,255,0.15)' }}>$</span>
      ))}
    </span>
  )
}

function RatingBar({ rating }: { rating: number | null }) {
  if (!rating) return <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.2)' }}>—</span>
  const color = rating >= 4.3 ? '#4ade80' : rating >= 3.8 ? '#FBBF24' : '#f87171'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ fontFamily: D, fontWeight: 800, fontSize: '1.1rem', color }}>{rating.toFixed(1)}</span>
      <div style={{ flex: 1, height: '4px', borderRadius: '99px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden', minWidth: '60px' }}>
        <div style={{ width: `${(rating / 5) * 100}%`, height: '100%', background: color, borderRadius: '99px' }} />
      </div>
      <span style={{ fontSize: '10px', color: '#FBBF24' }}>★</span>
    </div>
  )
}

export default function CompetitorsPage() {
  const { user, session } = useAuth()
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [myRating, setMyRating] = useState<number | null>(null)
  const [myName, setMyName] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [mapping, setMapping] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [hasGoogle, setHasGoogle] = useState(false)

  const load = async () => {
    if (!user) return
    setLoading(true)
    const { data: company } = await supabase
      .from('companies')
      .select('id, business_name, google_rating, google_place_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (company) {
      setMyRating(company.google_rating)
      setMyName(company.business_name ?? '')
      setHasGoogle(!!company.google_place_id)

      const { data } = await supabase
        .from('competitors')
        .select('id, name, rating, review_count, distance_m, price_level, google_place_id')
        .eq('company_id', company.id)
        .order('distance_m', { ascending: true })

      setCompetitors((data ?? []) as Competitor[])
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [user])

  const mapNow = async () => {
    if (!session) return
    setMapping(true)
    setMsg('')
    setErr('')
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/map-competitors`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro desconhecido')
      setMsg(`${data.mapped} concorrentes mapeados no raio de 2km`)
      await load()
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e))
    }
    setMapping(false)
  }

  if (loading) return <div style={{ padding: '28px 32px', color: MUTED, fontSize: '14px' }}>Carregando...</div>

  const withRating = competitors.filter(c => c.rating)
  const avgCompRating = withRating.length
    ? withRating.reduce((s, c) => s + (c.rating ?? 0), 0) / withRating.length
    : null
  const ratingDiff = myRating && avgCompRating ? (myRating - avgCompRating) : null

  return (
    <div>
      <div style={{ padding: '28px 32px 24px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: D, fontSize: '1.5rem', fontWeight: 800, color: 'white', letterSpacing: '-0.02em', marginBottom: '4px' }}>Concorrentes</h1>
          <p style={{ color: MUTED, fontSize: '13px' }}>
            {competitors.length > 0 ? `${competitors.length} concorrentes mapeados no raio de 2km` : 'Nenhum concorrente mapeado ainda'}
          </p>
        </div>
        <button
          onClick={mapNow}
          disabled={mapping || !hasGoogle}
          title={!hasGoogle ? 'Vincule seu negócio ao Google nas Configurações primeiro' : ''}
          style={{ padding: '9px 18px', background: mapping ? 'rgba(255,109,41,0.3)' : ORANGE, color: '#000', fontWeight: 700, fontSize: '13px', borderRadius: '9px', border: 'none', cursor: mapping || !hasGoogle ? 'not-allowed' : 'pointer', opacity: !hasGoogle ? 0.5 : 1 }}>
          {mapping ? 'Mapeando...' : '🗺 Mapear concorrentes'}
        </button>
      </div>

      <div style={{ padding: '24px 32px' }}>
        {(msg || err) && (
          <div style={{ marginBottom: '16px', padding: '12px 16px', background: err ? 'rgba(248,113,113,0.08)' : 'rgba(74,222,128,0.08)', border: `1px solid ${err ? 'rgba(248,113,113,0.2)' : 'rgba(74,222,128,0.2)'}`, borderRadius: '10px', fontSize: '13px', color: err ? '#f87171' : '#4ade80' }}>
            {err || msg}
          </div>
        )}

        {!hasGoogle && (
          <div style={{ marginBottom: '20px', padding: '14px 18px', background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: '12px', fontSize: '13px', color: '#FBBF24', lineHeight: 1.6 }}>
            ⚠ Para mapear concorrentes, vincule seu negócio ao Google nas <strong>Configurações</strong>.
          </div>
        )}

        {competitors.length === 0 ? (
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '14px', padding: '60px 32px', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🗺</div>
            <div style={{ fontFamily: D, fontSize: '1.2rem', fontWeight: 800, color: 'white', marginBottom: '8px' }}>Nenhum concorrente mapeado</div>
            <div style={{ fontSize: '14px', color: MUTED, maxWidth: '400px', margin: '0 auto 24px', lineHeight: 1.7 }}>
              Clique em <strong style={{ color: ORANGE }}>"Mapear concorrentes"</strong> para buscar negócios similares num raio de 2km via Google Maps.
            </div>
            {hasGoogle && (
              <button onClick={mapNow} disabled={mapping}
                style={{ padding: '11px 24px', background: ORANGE, color: '#000', fontWeight: 700, fontSize: '14px', borderRadius: '10px', border: 'none', cursor: 'pointer' }}>
                {mapping ? 'Mapeando...' : '🗺 Mapear agora →'}
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Summary cards */}
            {(myRating || avgCompRating) && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '24px' }}>
                <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '12px', padding: '18px 20px' }}>
                  <div style={{ fontSize: '10px', color: MUTED, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>Sua nota Google</div>
                  <div style={{ fontFamily: D, fontSize: '2rem', fontWeight: 900, color: myRating && myRating >= 4.3 ? '#4ade80' : myRating && myRating >= 3.8 ? '#FBBF24' : '#f87171' }}>
                    {myRating ? `${myRating}★` : '—'}
                  </div>
                  <div style={{ fontSize: '11px', color: MUTED, marginTop: '4px' }}>{myName}</div>
                </div>
                <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '12px', padding: '18px 20px' }}>
                  <div style={{ fontSize: '10px', color: MUTED, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>Média dos concorrentes</div>
                  <div style={{ fontFamily: D, fontSize: '2rem', fontWeight: 900, color: MUTED }}>
                    {avgCompRating ? `${avgCompRating.toFixed(1)}★` : '—'}
                  </div>
                  <div style={{ fontSize: '11px', color: MUTED, marginTop: '4px' }}>{withRating.length} com nota</div>
                </div>
                <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '12px', padding: '18px 20px' }}>
                  <div style={{ fontSize: '10px', color: MUTED, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>Diferença de nota</div>
                  <div style={{ fontFamily: D, fontSize: '2rem', fontWeight: 900, color: ratingDiff == null ? MUTED : ratingDiff > 0 ? '#4ade80' : '#f87171' }}>
                    {ratingDiff == null ? '—' : `${ratingDiff > 0 ? '+' : ''}${ratingDiff.toFixed(1)}`}
                  </div>
                  <div style={{ fontSize: '11px', color: MUTED, marginTop: '4px' }}>
                    {ratingDiff == null ? '' : ratingDiff > 0 ? 'acima da média' : ratingDiff < 0 ? 'abaixo da média' : 'na média'}
                  </div>
                </div>
              </div>
            )}

            {/* Table */}
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '14px', overflow: 'hidden' }}>
              <div style={{ padding: '16px 22px', borderBottom: `1px solid ${BORDER}`, display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr 1fr 80px', gap: '12px' }}>
                {['Nome', 'Avaliação', 'Reviews', 'Preço', 'Dist.'].map(h => (
                  <div key={h} style={{ fontSize: '10px', fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</div>
                ))}
              </div>
              {competitors.map((c, i) => (
                <div key={c.id} style={{ padding: '14px 22px', borderBottom: i < competitors.length - 1 ? `1px solid ${BORDER}` : 'none', display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr 1fr 80px', gap: '12px', alignItems: 'center' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'white' }}>{c.name}</div>
                  <div><RatingBar rating={c.rating} /></div>
                  <div style={{ fontSize: '12px', color: MUTED }}>{c.review_count > 0 ? c.review_count.toLocaleString('pt-BR') : '—'}</div>
                  <div><PriceLevel level={c.price_level} /></div>
                  <div style={{ fontSize: '12px', color: MUTED }}>
                    {c.distance_m != null ? (c.distance_m >= 1000 ? `${(c.distance_m / 1000).toFixed(1)}km` : `${c.distance_m}m`) : '—'}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '12px', fontSize: '11px', color: 'rgba(255,255,255,0.2)', textAlign: 'right' }}>
              Dados via Google Maps · Atualizado ao clicar "Mapear concorrentes"
            </div>
          </>
        )}
      </div>
    </div>
  )
}
