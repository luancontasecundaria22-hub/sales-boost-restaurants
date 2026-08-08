import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../contexts/AuthContext'
import { CARD, MUTED, BORDER, D, SUPABASE_URL } from './shared'

const ORANGE = '#FF6D29'
const GREEN = '#4ade80'

interface Details {
  niche?: string; location?: string; audience_profile?: string; audience_size?: string; engagement_quality?: string
  why_match?: string; collaboration_type?: string; difficulty?: string; cost?: string
  offer?: string; ask?: string; outreach?: string; format?: string; benefit?: string; effort?: string; priority?: string
}
interface Partnership { id: string; name: string; kind: string; score: number; details: Details }

const KIND_META: Record<string, { icon: string; label: string }> = {
  influencer: { icon: '👤', label: 'Influenciador' }, complementary: { icon: '🤝', label: 'Negócio complementar' },
  local: { icon: '📍', label: 'Negócio local' }, podcast: { icon: '🎙️', label: 'Podcast' },
  newsletter: { icon: '📧', label: 'Newsletter' }, event: { icon: '🎪', label: 'Evento' },
  community: { icon: '👥', label: 'Comunidade' }, association: { icon: '🏛️', label: 'Associação' },
  comarketing: { icon: '📣', label: 'Co-marketing' }, collab: { icon: '✨', label: 'Colaboração' },
}
const PRIORITY_COLOR: Record<string, string> = { high: '#f87171', medium: '#FBBF24', low: MUTED }
const scoreColor = (n: number) => (n >= 75 ? GREEN : n >= 55 ? '#FBBF24' : '#f87171')

function Field({ label, value }: { label: string; value?: string }) {
  if (!value) return null
  return (
    <div>
      <div style={{ fontSize: '9px', fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>{label}</div>
      <div style={{ fontSize: '11px', color: 'white', lineHeight: 1.45 }}>{value}</div>
    </div>
  )
}

// Oportunidades de Parceria — extensão nativa da Inteligência de Mercado.
// Analisa o contexto real da empresa e ranqueia parcerias estratégicas.
export default function PartnershipSection({ companyId }: { companyId: string }) {
  const { session } = useAuth()
  const token = session?.access_token ?? ''
  const [items, setItems] = useState<Partnership[]>([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const { data } = await supabase.from('marketing_ai_partnerships').select('*').eq('company_id', companyId).order('score', { ascending: false })
    setItems((data ?? []) as Partnership[])
    setLoading(false)
  }, [companyId])
  useEffect(() => { load() }, [load])

  const scan = async () => {
    setScanning(true); setError('')
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/partnership-opportunities`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: '{}',
      })
      const r = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(r.error ?? 'Erro ao buscar parcerias')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao buscar parcerias')
    }
    setScanning(false)
  }

  return (
    <section style={{ paddingTop: '20px', borderTop: `1px solid ${BORDER}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap', marginBottom: '13px' }}>
        <div style={{ maxWidth: '620px' }}>
          <div style={{ fontSize: '13px', fontWeight: 800, color: 'white', marginBottom: '3px' }}>🤝 Oportunidades de Parceria</div>
          <div style={{ fontSize: '11px', color: MUTED, lineHeight: 1.55 }}>
            O agente analisa seu nicho, público, local, concorrentes e objetivos e recomenda <strong>parcerias estratégicas</strong> (influenciadores, negócios complementares, podcasts, eventos, comunidades…), ranqueadas por valor. Prioriza <strong>relevância e qualidade de audiência</strong>, não número de seguidores.
          </div>
        </div>
        <button onClick={scan} disabled={scanning || !token}
          style={{ padding: '9px 16px', background: ORANGE, color: '#000', fontWeight: 700, fontSize: '12px', borderRadius: '9px', border: 'none', cursor: scanning ? 'default' : 'pointer', fontFamily: D, flexShrink: 0, opacity: scanning ? 0.7 : 1 }}>
          {scanning ? 'Analisando...' : items.length ? '🔄 Atualizar' : '✨ Encontrar parcerias'}
        </button>
      </div>

      {scanning && (
        <div style={{ marginBottom: '12px' }}>
          <style>{`@keyframes sbslide2{0%{left:-40%}100%{left:100%}}`}</style>
          <div style={{ fontSize: '11px', color: MUTED, marginBottom: '5px' }}>Analisando o contexto e ranqueando oportunidades... (~30s)</div>
          <div style={{ position: 'relative', height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '99px', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, height: '100%', width: '40%', background: ORANGE, borderRadius: '99px', animation: 'sbslide2 1.1s ease-in-out infinite' }} />
          </div>
        </div>
      )}
      {error && <div style={{ color: '#f87171', fontSize: '11.5px', marginBottom: '12px' }}>{error}</div>}

      {loading ? (
        <div style={{ fontSize: '12px', color: MUTED }}>Carregando...</div>
      ) : items.length === 0 ? (
        <div style={{ padding: '24px', textAlign: 'center', color: MUTED, fontSize: '12.5px', background: CARD, border: `1px dashed ${BORDER}`, borderRadius: '11px' }}>
          Nenhuma análise ainda. Clique em <strong>"Encontrar parcerias"</strong> pra o agente recomendar oportunidades estratégicas pro seu negócio.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '12px' }}>
          {items.map(p => {
            const m = KIND_META[p.kind] ?? KIND_META.collab
            const d = p.details ?? {}
            return (
              <div key={p.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '12px', padding: '14px 15px', borderLeft: `3px solid ${scoreColor(p.score)}` }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: 'white' }}>{m.icon} {p.name}</div>
                    <div style={{ fontSize: '10px', color: MUTED, marginTop: '2px' }}>
                      {m.label}{d.niche ? ` · ${d.niche}` : ''}{d.location ? ` · ${d.location}` : ''}
                    </div>
                  </div>
                  <div style={{ textAlign: 'center', flexShrink: 0 }}>
                    <div style={{ fontSize: '19px', fontWeight: 800, color: scoreColor(p.score), lineHeight: 1 }}>{p.score}</div>
                    <div style={{ fontSize: '8px', color: MUTED }}>score</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '9px' }}>
                  {d.priority && <span style={{ fontSize: '8.5px', fontWeight: 700, color: PRIORITY_COLOR[d.priority] ?? MUTED, border: `1px solid ${(PRIORITY_COLOR[d.priority] ?? MUTED)}55`, borderRadius: '99px', padding: '2px 7px' }}>Prioridade {d.priority}</span>}
                  {d.collaboration_type && <span style={{ fontSize: '8.5px', fontWeight: 700, color: ORANGE, border: '1px solid rgba(255,109,41,0.4)', borderRadius: '99px', padding: '2px 7px' }}>{d.collaboration_type}</span>}
                  {d.audience_size && <span style={{ fontSize: '8.5px', color: MUTED }}>👥 {d.audience_size}</span>}
                  {d.engagement_quality && <span style={{ fontSize: '8.5px', color: MUTED }}>· engaj. {d.engagement_quality}</span>}
                </div>

                {d.why_match && <div style={{ fontSize: '11.5px', color: 'white', lineHeight: 1.5, marginBottom: '10px' }}>{d.why_match}</div>}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '9px', marginBottom: '9px' }}>
                  <Field label="Você oferece" value={d.offer} />
                  <Field label="Você pede" value={d.ask} />
                  <Field label="Formato" value={d.format} />
                  <Field label="Benefício" value={d.benefit} />
                </div>

                {d.outreach && (
                  <div style={{ fontSize: '10.5px', color: MUTED, lineHeight: 1.5, background: 'rgba(255,255,255,0.02)', borderRadius: '7px', padding: '7px 9px', marginBottom: '9px' }}>
                    <span style={{ color: ORANGE, fontWeight: 700 }}>Abordagem:</span> {d.outreach}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '9.5px', color: 'rgba(255,255,255,0.4)' }}>
                  {d.cost && <span>💰 {d.cost}</span>}
                  {d.effort && <span>· esforço {d.effort}</span>}
                  {d.difficulty && <span>· dificuldade {d.difficulty}</span>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
