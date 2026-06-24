import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { useLang } from '../../contexts/LanguageContext'
import { d } from '../../i18n-dash'

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
  const navigate = useNavigate()
  const { lang } = useLang()
  const T = d[lang].competitors
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [myRating, setMyRating] = useState<number | null>(null)
  const [myName, setMyName] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [mapping, setMapping] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [hasGoogle, setHasGoogle] = useState(false)
  const [analysis, setAnalysis] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)

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

  const analyzeCompetitors = async () => {
    if (!session || competitors.length === 0) return
    setAnalyzing(true)
    setAnalysis(null)

    const competitorList = competitors.map(c => {
      const dist = c.distance_m != null
        ? (c.distance_m >= 1000 ? `${(c.distance_m / 1000).toFixed(1)}km` : `${c.distance_m}m`)
        : 'distância desconhecida'
      const price = c.price_level ? '$'.repeat(c.price_level) : 'preço desconhecido'
      return `- ${c.name}: ${c.rating ? `${c.rating}★` : 'sem nota'} | ${c.review_count > 0 ? `${c.review_count} reviews` : 'sem reviews'} | ${price} | ${dist} de distância`
    }).join('\n')

    const message = `Analise os concorrentes do meu negócio "${myName}" e crie um plano estratégico para esta semana.

Minha nota no Google: ${myRating ? `${myRating}★` : 'não configurada'}
Média dos concorrentes: ${avgCompRating ? `${avgCompRating.toFixed(1)}★` : 'desconhecida'}

Lista de concorrentes próximos:
${competitorList}

Por favor, estruture a resposta assim:
**1. Análise de cada concorrente** — para cada um, identifique 1-2 pontos fortes e 1-2 pontos fracos com base nos dados.
**2. Maior ameaça** — qual é o concorrente mais perigoso e por quê.
**3. Plano da semana** — 5 ações concretas para superar os concorrentes nesta semana (posts, atendimento, preço, reputação).`

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/agent-chat`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, agent_role: 'ceo', history: [] }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro na análise')
      setAnalysis(data.reply)
    } catch (e) {
      setAnalysis(`Erro ao gerar análise: ${e instanceof Error ? e.message : String(e)}`)
    }
    setAnalyzing(false)
  }

  if (loading) return <div style={{ padding: '28px 32px', color: MUTED, fontSize: '14px' }}>Carregando...</div>

  const withRating = competitors.filter(c => c.rating)
  const avgCompRating = withRating.length
    ? withRating.reduce((s, c) => s + (c.rating ?? 0), 0) / withRating.length
    : null
  const ratingDiff = myRating && avgCompRating ? (myRating - avgCompRating) : null

  const withPrice = competitors.filter(c => c.price_level != null)
  const avgPrice = withPrice.length
    ? withPrice.reduce((s, c) => s + (c.price_level ?? 0), 0) / withPrice.length
    : null

  // Sort from most expensive to cheapest; nulls go last
  const sortedCompetitors = [...competitors].sort((a, b) => {
    if (a.price_level == null) return 1
    if (b.price_level == null) return -1
    return b.price_level - a.price_level
  })

  return (
    <div>
      <div style={{ padding: '28px 32px 24px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: D, fontSize: '1.5rem', fontWeight: 800, color: 'white', letterSpacing: '-0.02em', marginBottom: '4px' }}>{T.title}</h1>
          <p style={{ color: MUTED, fontSize: '13px' }}>
            {competitors.length > 0 ? `${competitors.length} concorrentes mapeados no raio de 2km` : 'Nenhum concorrente mapeado ainda'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {competitors.length > 0 && (
            <button
              onClick={analyzeCompetitors}
              disabled={analyzing}
              style={{ padding: '9px 18px', background: analyzing ? 'rgba(255,109,41,0.15)' : 'rgba(255,109,41,0.12)', color: ORANGE, fontWeight: 700, fontSize: '13px', borderRadius: '9px', border: '1px solid rgba(255,109,41,0.3)', cursor: analyzing ? 'not-allowed' : 'pointer' }}>
              {analyzing ? '🤖 Analisando...' : '🤖 Analisar com IA'}
            </button>
          )}
          <button
            onClick={mapNow}
            disabled={mapping || !hasGoogle}
            title={!hasGoogle ? 'Vincule seu negócio ao Google nas Configurações primeiro' : ''}
            style={{ padding: '9px 18px', background: mapping ? 'rgba(255,109,41,0.3)' : ORANGE, color: '#000', fontWeight: 700, fontSize: '13px', borderRadius: '9px', border: 'none', cursor: mapping || !hasGoogle ? 'not-allowed' : 'pointer', opacity: !hasGoogle ? 0.5 : 1 }}>
            {mapping ? 'Mapeando...' : '🗺 Mapear concorrentes'}
          </button>
        </div>
      </div>

      <div style={{ padding: '24px 32px' }}>
        {(msg || err) && (
          <div style={{ marginBottom: '16px', padding: '12px 16px', background: err ? 'rgba(248,113,113,0.08)' : 'rgba(74,222,128,0.08)', border: `1px solid ${err ? 'rgba(248,113,113,0.2)' : 'rgba(74,222,128,0.2)'}`, borderRadius: '10px', fontSize: '13px', color: err ? '#f87171' : '#4ade80' }}>
            {err || msg}
          </div>
        )}

        {!hasGoogle ? (
          <div style={{ background: 'rgba(255,109,41,0.06)', border: '1px solid rgba(255,109,41,0.2)', borderRadius: '14px', padding: '60px 32px', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '14px' }}>🗺</div>
            <div style={{ fontFamily: D, fontSize: '1.2rem', fontWeight: 800, color: 'white', marginBottom: '10px' }}>{T.noGoogle}</div>
            <div style={{ fontSize: '14px', color: MUTED, maxWidth: '420px', margin: '0 auto 24px', lineHeight: 1.7 }}>{T.noGoogleDesc}</div>
            <button onClick={() => navigate('/dashboard/settings?section=google')}
              style={{ padding: '11px 24px', background: ORANGE, color: '#000', fontWeight: 700, fontSize: '14px', borderRadius: '10px', border: 'none', cursor: 'pointer' }}>
              {T.configureGoogle}
            </button>
          </div>
        ) : competitors.length === 0 ? (
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '14px', padding: '60px 32px', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🗺</div>
            <div style={{ fontFamily: D, fontSize: '1.2rem', fontWeight: 800, color: 'white', marginBottom: '8px' }}>Nenhum concorrente mapeado</div>
            <div style={{ fontSize: '14px', color: MUTED, maxWidth: '400px', margin: '0 auto 24px', lineHeight: 1.7 }}>
              Clique em <strong style={{ color: ORANGE }}>"Mapear concorrentes"</strong> para buscar negócios similares num raio de 2km via Google Maps.
            </div>
            <button onClick={mapNow} disabled={mapping}
              style={{ padding: '11px 24px', background: ORANGE, color: '#000', fontWeight: 700, fontSize: '14px', borderRadius: '10px', border: 'none', cursor: 'pointer' }}>
              {mapping ? 'Mapeando...' : '🗺 Mapear agora →'}
            </button>
          </div>
        ) : (
          <>
            {/* Summary cards */}
            {(myRating || avgCompRating || avgPrice != null) && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
                <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '12px', padding: '18px 20px' }}>
                  <div style={{ fontSize: '10px', color: MUTED, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>Sua nota Google</div>
                  <div style={{ fontFamily: D, fontSize: '2rem', fontWeight: 900, color: myRating && myRating >= 4.3 ? '#4ade80' : myRating && myRating >= 3.8 ? '#FBBF24' : '#f87171' }}>
                    {myRating ? `${myRating}★` : '—'}
                  </div>
                  <div style={{ fontSize: '11px', color: MUTED, marginTop: '4px' }}>{myName}</div>
                </div>
                <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '12px', padding: '18px 20px' }}>
                  <div style={{ fontSize: '10px', color: MUTED, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>Média nota concorrentes</div>
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
                <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '12px', padding: '18px 20px' }}>
                  <div style={{ fontSize: '10px', color: MUTED, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>Média de preço</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, marginTop: '4px' }}>
                    {avgPrice != null ? (
                      Array.from({ length: 4 }, (_, i) => (
                        <span key={i} style={{ color: i < Math.round(avgPrice) ? '#FBBF24' : 'rgba(255,255,255,0.15)', fontWeight: 800 }}>$</span>
                      ))
                    ) : <span style={{ fontFamily: D, color: MUTED }}>—</span>}
                  </div>
                  <div style={{ fontSize: '11px', color: MUTED, marginTop: '4px' }}>
                    {avgPrice != null ? (avgPrice <= 1.5 ? 'barato' : avgPrice <= 2.5 ? 'moderado' : avgPrice <= 3.5 ? 'caro' : 'muito caro') : `${withPrice.length} com preço`}
                  </div>
                </div>
              </div>
            )}

            {/* Table */}
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '14px', overflow: 'hidden' }}>
              <div style={{ padding: '16px 22px', borderBottom: `1px solid ${BORDER}`, display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr 1fr 80px', gap: '12px', alignItems: 'center' }}>
                {['Nome', 'Avaliação', 'Reviews', 'Preço ↓', 'Dist.'].map(h => (
                  <div key={h} style={{ fontSize: '10px', fontWeight: 700, color: h === 'Preço ↓' ? ORANGE : MUTED, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</div>
                ))}
              </div>
              {sortedCompetitors.map((c, i) => (
                <div key={c.id} style={{ padding: '14px 22px', borderBottom: i < sortedCompetitors.length - 1 ? `1px solid ${BORDER}` : 'none', display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr 1fr 80px', gap: '12px', alignItems: 'center' }}>
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
              Ordenado por preço (mais caro → mais barato) · Dados via Google Maps
            </div>

            {/* AI Analysis — always visible */}
            <div style={{ marginTop: '24px', background: CARD, border: `1px solid rgba(255,109,41,0.2)`, borderRadius: '14px', overflow: 'hidden' }}>
              <div style={{ padding: '14px 22px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '16px' }}>🤖</span>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'white' }}>Análise estratégica — Agente Secretário</div>
                    <div style={{ fontSize: '11px', color: MUTED, marginTop: '2px' }}>Pontos fortes/fracos de cada concorrente + plano da semana</div>
                  </div>
                </div>
                {!analyzing && (
                  <button onClick={analyzeCompetitors}
                    style={{ padding: '8px 18px', background: analysis ? 'rgba(255,255,255,0.04)' : ORANGE, color: analysis ? MUTED : '#000', fontWeight: 700, fontSize: '12px', borderRadius: '8px', border: analysis ? `1px solid ${BORDER}` : 'none', cursor: 'pointer', flexShrink: 0 }}>
                    {analysis ? '↻ Reanalisar' : '▶ Analisar agora →'}
                  </button>
                )}
              </div>
              <div style={{ padding: '22px' }}>
                {analyzing ? (
                  <div style={{ color: MUTED, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', background: ORANGE, animation: 'pulse 1.2s infinite' }} />
                    Analisando {competitors.length} concorrentes e montando plano estratégico...
                  </div>
                ) : analysis ? (
                  <div style={{ fontSize: '13.5px', color: 'rgba(255,255,255,0.85)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                    {analysis}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '28px 0', color: MUTED, fontSize: '13px', lineHeight: 1.8 }}>
                    O Agente Secretário vai analisar cada concorrente, identificar a maior ameaça<br />
                    e montar um plano com <strong style={{ color: 'white' }}>5 ações concretas para esta semana</strong>.
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
