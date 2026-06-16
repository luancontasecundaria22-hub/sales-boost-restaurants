import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

const ORANGE = '#FF6D29'
const CARD = '#150E08'
const MUTED = '#BABABA'
const D = "'Bricolage Grotesque', system-ui, sans-serif"
const BORDER = 'rgba(255,255,255,0.06)'
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string

interface ReportData {
  health_score: number
  executive_summary: string
  strengths: Array<{ title: string; action: string }>
  complaints: Array<{ title: string; action: string; urgency: string }>
  pricing_recommendation: string
  actions: Array<{ priority: number; title: string; description: string; impact: string }>
}

interface Report {
  id: string
  period: string
  health_score: number | null
  summary_json: ReportData | null
  created_at: string
}

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '14px', overflow: 'hidden', marginBottom: '16px' }}>
      <div style={{ padding: '16px 22px', borderBottom: `1px solid ${BORDER}` }}>
        <span style={{ fontWeight: 700, fontSize: '14px', color: 'white' }}>{title}</span>
      </div>
      <div style={{ padding: '20px 22px' }}>{children}</div>
    </div>
  )
}

function scoreColor(s: number) {
  return s >= 75 ? '#4ade80' : s >= 50 ? '#FBBF24' : '#f87171'
}

export default function ReportPage() {
  const { user, session } = useAuth()
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  const loadReport = async () => {
    if (!user) return
    setLoading(true)
    const { data: company } = await supabase
      .from('companies')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (company) {
      const { data } = await supabase
        .from('reports')
        .select('id, period, health_score, summary_json, created_at')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      setReport(data as Report | null)
    }
    setLoading(false)
  }

  useEffect(() => { loadReport() }, [user])

  const generate = async () => {
    if (!session) return
    setGenerating(true)
    setMsg('')
    setErr('')
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-report`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro desconhecido')
      setMsg(data.cached ? 'Relatório deste mês já gerado. Veja abaixo.' : `Relatório gerado! Score de saúde: ${data.health_score}/100`)
      await loadReport()
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e))
    }
    setGenerating(false)
  }

  const periodLabel = (period: string) => {
    const [y, m] = period.split('-')
    return new Date(Number(y), Number(m) - 1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' })
  }

  if (loading) return <div style={{ padding: '28px 32px', color: MUTED, fontSize: '14px' }}>Carregando...</div>

  const d = report?.summary_json
  const hs = report?.health_score
  const hsColor = hs != null ? scoreColor(hs) : MUTED

  return (
    <div>
      <div style={{ padding: '28px 32px 24px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: D, fontSize: '1.5rem', fontWeight: 800, color: 'white', letterSpacing: '-0.02em', marginBottom: '4px' }}>Relatório Mensal</h1>
          <p style={{ color: MUTED, fontSize: '13px' }}>
            {report ? `Período: ${periodLabel(report.period)}` : 'Nenhum relatório gerado ainda'}
          </p>
        </div>
        <button
          onClick={generate}
          disabled={generating}
          style={{ padding: '9px 18px', background: generating ? 'rgba(255,109,41,0.3)' : ORANGE, color: '#000', fontWeight: 700, fontSize: '13px', borderRadius: '9px', border: 'none', cursor: generating ? 'not-allowed' : 'pointer' }}>
          {generating ? '✦ Gerando com IA...' : '✦ Gerar relatório deste mês'}
        </button>
      </div>

      <div style={{ padding: '24px 32px' }}>
        {(msg || err) && (
          <div style={{ marginBottom: '16px', padding: '12px 16px', background: err ? 'rgba(248,113,113,0.08)' : 'rgba(74,222,128,0.08)', border: `1px solid ${err ? 'rgba(248,113,113,0.2)' : 'rgba(74,222,128,0.2)'}`, borderRadius: '10px', fontSize: '13px', color: err ? '#f87171' : '#4ade80', lineHeight: 1.5 }}>
            {err || msg}
          </div>
        )}

        {!report ? (
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '14px', padding: '60px 32px', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📋</div>
            <div style={{ fontFamily: D, fontSize: '1.2rem', fontWeight: 800, color: 'white', marginBottom: '8px' }}>Nenhum relatório ainda</div>
            <div style={{ fontSize: '14px', color: MUTED, maxWidth: '440px', margin: '0 auto 8px', lineHeight: 1.7 }}>
              O relatório mensal cruza suas avaliações do Google com os concorrentes e gera um plano de ação concreto com IA.
            </div>
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.25)', marginBottom: '28px' }}>
              Recomendado: importe avaliações e mapeie concorrentes antes de gerar.
            </div>
            <button onClick={generate} disabled={generating}
              style={{ padding: '11px 24px', background: ORANGE, color: '#000', fontWeight: 700, fontSize: '14px', borderRadius: '10px', border: 'none', cursor: generating ? 'not-allowed' : 'pointer' }}>
              {generating ? '✦ Gerando...' : '✦ Gerar primeiro relatório →'}
            </button>
          </div>
        ) : (
          <>
            {/* Section 1 — Score + Resumo */}
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '28px', marginBottom: '16px', display: 'flex', gap: '32px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'center', flexShrink: 0 }}>
                <div style={{ fontFamily: D, fontSize: '5rem', fontWeight: 900, color: hsColor, lineHeight: 1, letterSpacing: '-0.04em' }}>{hs ?? '—'}</div>
                <div style={{ fontSize: '11px', color: MUTED, marginTop: '4px' }}>Score de saúde</div>
                <div style={{ marginTop: '10px', width: '100px', height: '6px', borderRadius: '99px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden', margin: '10px auto 0' }}>
                  <div style={{ width: `${hs ?? 0}%`, height: '100%', background: hsColor, borderRadius: '99px' }} />
                </div>
                <div style={{ fontSize: '11px', color: hsColor, marginTop: '6px' }}>
                  {hs != null ? (hs >= 75 ? '✓ Saudável' : hs >= 50 ? '⚠ Atenção' : '↑ Crítico') : ''}
                </div>
              </div>
              <div style={{ flex: 1, minWidth: '240px' }}>
                <div style={{ fontSize: '11px', color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>Resumo executivo</div>
                <p style={{ fontSize: '14px', color: 'white', lineHeight: 1.7, margin: 0 }}>{d?.executive_summary ?? '—'}</p>
              </div>
            </div>

            {/* Section 2 — Pontos fortes */}
            {d?.strengths && d.strengths.length > 0 && (
              <SectionCard title="✦ O que amam em você — use no marketing">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {d.strengths.map((s, i) => (
                    <div key={i} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 800, color: '#4ade80', flexShrink: 0 }}>
                        {i + 1}
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'white', marginBottom: '4px' }}>✓ {s.title}</div>
                        <div style={{ fontSize: '12px', color: MUTED, lineHeight: 1.6 }}>↳ {s.action}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            {/* Section 3 — Reclamações */}
            {d?.complaints && d.complaints.length > 0 && (
              <SectionCard title="⚠ O que afasta clientes — ação corretiva">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {d.complaints.map((c, i) => (
                    <div key={i} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                      <span style={{ padding: '3px 8px', borderRadius: '6px', background: c.urgency === 'high' ? 'rgba(248,113,113,0.12)' : 'rgba(251,191,36,0.1)', border: `1px solid ${c.urgency === 'high' ? 'rgba(248,113,113,0.25)' : 'rgba(251,191,36,0.2)'}`, fontSize: '10px', fontWeight: 700, color: c.urgency === 'high' ? '#f87171' : '#FBBF24', whiteSpace: 'nowrap', marginTop: '2px' }}>
                        {c.urgency === 'high' ? 'Urgente' : c.urgency === 'medium' ? 'Médio' : 'Baixo'}
                      </span>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'white', marginBottom: '4px' }}>{c.title}</div>
                        <div style={{ fontSize: '12px', color: MUTED, lineHeight: 1.6 }}>↳ {c.action}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            {/* Section 4 — Preços */}
            {d?.pricing_recommendation && (
              <SectionCard title="💰 Posicionamento de preço vs. concorrentes">
                <p style={{ fontSize: '13px', color: MUTED, lineHeight: 1.7, margin: 0 }}>{d.pricing_recommendation}</p>
              </SectionCard>
            )}

            {/* Section 5 — 3 Ações do Mês */}
            {d?.actions && d.actions.length > 0 && (
              <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '14px', overflow: 'hidden', marginBottom: '16px' }}>
                <div style={{ padding: '16px 22px', borderBottom: `1px solid ${BORDER}` }}>
                  <span style={{ fontWeight: 700, fontSize: '14px', color: 'white' }}>🎯 3 Ações do Mês — implemente agora</span>
                </div>
                {d.actions.map((a, i) => (
                  <div key={i} style={{ padding: '20px 22px', borderBottom: i < d.actions.length - 1 ? `1px solid ${BORDER}` : 'none', display: 'flex', gap: '18px', alignItems: 'flex-start' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255,109,41,0.1)', border: '1px solid rgba(255,109,41,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: D, fontSize: '1.1rem', fontWeight: 900, color: ORANGE, flexShrink: 0 }}>
                      {String(a.priority).padStart(2, '0')}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: 'white' }}>{a.title}</span>
                        <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '99px', background: 'rgba(255,109,41,0.1)', color: ORANGE, fontWeight: 700, border: '1px solid rgba(255,109,41,0.2)' }}>Impacto {a.impact}</span>
                      </div>
                      <p style={{ fontSize: '13px', color: MUTED, lineHeight: 1.65, margin: 0 }}>{a.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', textAlign: 'right' }}>
              Gerado em {new Date(report.created_at).toLocaleDateString('pt-BR')} por IA (Claude) · Dados do Google Maps e avaliações importadas
            </div>
          </>
        )}
      </div>
    </div>
  )
}
