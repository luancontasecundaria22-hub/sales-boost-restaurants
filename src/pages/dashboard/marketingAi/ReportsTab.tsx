import { CARD, MUTED, BORDER, PILLAR_LABEL, PILLAR_ICON, IMPACT_COLOR, IMPACT_LABEL, timeAgo, type Insight, type StrategyLogRow } from './shared'

export default function ReportsTab({ insights, strategyLog }: { insights: Insight[]; strategyLog: StrategyLogRow[] }) {
  const pillars = ['tracking', 'content', 'competitor', 'strategy'] as const
  const implemented = strategyLog.filter(s => s.status === 'implemented' || s.status === 'approved')

  return (
    <div>
      <div style={{ fontSize: '13px', fontWeight: 700, color: 'white', marginBottom: '4px' }}>Resumo por pilar</div>
      <div style={{ fontSize: '11.5px', color: MUTED, marginBottom: '16px' }}>Quantos insights cada inteligência já gerou, do mais recente pro mais antigo.</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {pillars.map(p => {
          const items = insights.filter(i => i.pillar === p)
          return (
            <div key={p} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontSize: '18px', marginBottom: '6px' }}>{PILLAR_ICON[p]}</div>
              <div style={{ fontSize: '10.5px', color: MUTED, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>{PILLAR_LABEL[p]}</div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: 'white' }}>{items.length}</div>
              <div style={{ fontSize: '10.5px', color: 'rgba(255,255,255,0.35)' }}>{items.filter(i => i.status === 'open').length} em aberto</div>
            </div>
          )
        })}
      </div>

      <div style={{ fontSize: '13px', fontWeight: 700, color: 'white', marginBottom: '10px' }}>Todos os insights</div>
      {insights.length === 0 ? (
        <div style={{ color: MUTED, fontSize: '12.5px', marginBottom: '24px' }}>Nenhum insight gerado ainda.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '24px' }}>
          {insights.map(ins => (
            <div key={ins.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px 14px', background: CARD, border: `1px solid ${BORDER}`, borderRadius: '10px' }}>
              <span style={{ fontSize: '14px', flexShrink: 0 }}>{PILLAR_ICON[ins.pillar]}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'white' }}>{ins.title}</div>
                <div style={{ fontSize: '11px', color: MUTED, marginTop: '2px', lineHeight: 1.5 }}>{ins.description}</div>
              </div>
              {ins.impact && <span style={{ flexShrink: 0, fontSize: '9.5px', fontWeight: 700, color: IMPACT_COLOR[ins.impact], whiteSpace: 'nowrap' }}>{IMPACT_LABEL[ins.impact]}</span>}
              <span style={{ flexShrink: 0, fontSize: '10px', color: 'rgba(255,255,255,0.3)', whiteSpace: 'nowrap' }}>{timeAgo(ins.created_at)}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ fontSize: '13px', fontWeight: 700, color: 'white', marginBottom: '10px' }}>Recomendações aprovadas/implementadas</div>
      {implemented.length === 0 ? (
        <div style={{ color: MUTED, fontSize: '12.5px' }}>Nenhuma recomendação aprovada ainda — veja a aba Estratégia.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {implemented.map(s => (
            <div key={s.id} style={{ padding: '10px 14px', background: CARD, border: `1px solid ${BORDER}`, borderRadius: '10px' }}>
              <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'white' }}>{s.recommendation}</div>
              <div style={{ fontSize: '11px', color: MUTED, marginTop: '2px', lineHeight: 1.5 }}>{s.reasoning}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
