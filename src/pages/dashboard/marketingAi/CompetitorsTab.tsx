import { useState } from 'react'
import { ORANGE, CARD, MUTED, BORDER, callMarketingAi, timeAgo, type CompetitorRow, type Insight } from './shared'

export default function CompetitorsTab({
  accessToken, competitors, insights, hasCompetitorsConfigured, onRefresh,
}: {
  accessToken: string; competitors: CompetitorRow[]; insights: Insight[]; hasCompetitorsConfigured: boolean
  onRefresh: () => Promise<void>
}) {
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')

  const runScan = async () => {
    setRunning(true)
    setError('')
    try {
      await callMarketingAi(accessToken, 'run_competitors')
      await onRefresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao escanear concorrentes')
    }
    setRunning(false)
  }

  if (!hasCompetitorsConfigured) {
    return (
      <div style={{ padding: '32px', textAlign: 'center', color: MUTED, fontSize: '13px' }}>
        Adicione o Instagram de concorrentes em Configurações pra ativar o Competitor Intelligence.
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
        <div style={{ fontSize: '12.5px', color: MUTED }}>Dados reais dos concorrentes configurados — o objetivo é achar oportunidade, não copiar.</div>
        <button onClick={runScan} disabled={running}
          style={{ padding: '8px 16px', background: ORANGE, color: '#000', fontWeight: 700, fontSize: '12px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
          {running ? 'Escaneando...' : '🔄 Escanear agora'}
        </button>
      </div>
      {error && <div style={{ color: '#f87171', fontSize: '12px', marginBottom: '14px' }}>{error}</div>}

      {competitors.length === 0 ? (
        <div style={{ padding: '24px', textAlign: 'center', color: MUTED, fontSize: '12.5px', background: CARD, border: `1px solid ${BORDER}`, borderRadius: '12px', marginBottom: '20px' }}>
          Nenhum concorrente escaneado ainda. Clique em "Escanear agora".
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
          {competitors.map(c => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 16px', background: CARD, border: `1px solid ${BORDER}`, borderRadius: '10px' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                {c.last_analyzed_at && <div style={{ fontSize: '10.5px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>Última análise: {timeAgo(c.last_analyzed_at)}</div>}
              </div>
              <div style={{ display: 'flex', gap: '18px', fontSize: '11.5px', color: MUTED, flexShrink: 0 }}>
                <span>{c.followers ?? '—'} seguidores</span>
                <span>{c.avg_engagement != null ? Math.round(c.avg_engagement) : '—'} engaj./post</span>
                <span>{c.posting_frequency_days != null ? `posta a cada ${c.posting_frequency_days}d` : '—'}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ fontSize: '13px', fontWeight: 700, color: 'white', marginBottom: '10px' }}>Oportunidades identificadas</div>
      {insights.length === 0 ? (
        <div style={{ color: MUTED, fontSize: '12.5px' }}>Nenhuma oportunidade identificada ainda.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {insights.map(ins => (
            <div key={ins.id} style={{ padding: '12px 14px', background: CARD, border: `1px solid ${BORDER}`, borderRadius: '10px' }}>
              <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'white', marginBottom: '3px' }}>{ins.title}</div>
              <div style={{ fontSize: '11.5px', color: MUTED, lineHeight: 1.5 }}>{ins.description}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
