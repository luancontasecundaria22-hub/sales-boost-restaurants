import { useMemo, useState } from 'react'
import type { CompanyData } from '../../../contexts/CompanyContext'
import { CARD, MUTED, BORDER, D } from './shared'
import { buildInsightsDemo, INSIGHT_CATEGORY_META, PRIORITY_META, type InsightCategory, type InsightItem } from './growthIntelDemo'

const ORANGE = '#FF6D29'

function ConfidenceBar({ value }: { value: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
      <div style={{ width: '64px', height: '5px', borderRadius: '99px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        <div style={{ width: `${value}%`, height: '100%', background: value >= 75 ? '#4ade80' : value >= 60 ? '#FBBF24' : '#60a5fa' }} />
      </div>
      <span style={{ fontSize: '10px', color: MUTED }}>{value}% confiança</span>
    </div>
  )
}

function Field({ label, children, accent }: { label: string; children: React.ReactNode; accent?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: '9.5px', fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>{label}</div>
      <div style={{ fontSize: '12px', color: accent ? '#4ade80' : 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>{children}</div>
    </div>
  )
}

function InsightCard({ item }: { item: InsightItem }) {
  const cat = INSIGHT_CATEGORY_META[item.category]
  const pri = PRIORITY_META[item.priority]
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '14px', padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '8px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '10px', fontWeight: 700, color: MUTED, background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER}`, borderRadius: '99px', padding: '2px 9px' }}>{cat.icon} {cat.label}</span>
        <span style={{ fontSize: '10px', fontWeight: 700, color: pri.color, border: `1px solid ${pri.color}44`, borderRadius: '99px', padding: '2px 9px' }}>Prioridade {pri.label}</span>
        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', marginLeft: 'auto' }}>{item.window}</span>
      </div>
      <div style={{ fontSize: '14px', fontWeight: 800, color: 'white', marginBottom: '12px', lineHeight: 1.35 }}>{item.opportunity}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
        <Field label="Por que importa">{item.why}</Field>
        <Field label="Impacto estimado">{item.impact}</Field>
      </div>
      <div style={{ padding: '11px 13px', background: 'rgba(255,109,41,0.06)', border: '1px solid rgba(255,109,41,0.18)', borderRadius: '10px', marginBottom: '11px' }}>
        <Field label="Ação recomendada"><span style={{ color: 'white' }}>{item.action}</span></Field>
      </div>
      <ConfidenceBar value={item.confidence} />
    </div>
  )
}

const FILTERS: { key: InsightCategory | 'all'; label: string }[] = [
  { key: 'all', label: 'Tudo' },
  { key: 'evento', label: '📍 Eventos' },
  { key: 'feriado', label: '🎉 Datas' },
  { key: 'sazonal', label: '🗓️ Sazonal' },
  { key: 'tendencia', label: '📈 Tendências' },
  { key: 'parceria', label: '🤝 Parcerias' },
  { key: 'influenciador', label: '⭐ Influenciadores' },
  { key: 'concorrente', label: '🧭 Concorrentes' },
]

export default function InsightsTab({ company }: { company: Pick<CompanyData, 'city'> }) {
  const all = useMemo(() => buildInsightsDemo(company.city), [company.city])
  const [filter, setFilter] = useState<InsightCategory | 'all'>('all')
  const items = filter === 'all' ? all : all.filter(i => i.category === filter)

  return (
    <div>
      <div style={{ padding: '12px 16px', background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.22)', borderRadius: '11px', fontSize: '11.5px', color: 'white', lineHeight: 1.6, marginBottom: '18px' }}>
        🧪 <strong>Modo demonstração.</strong> Oportunidades de <strong>fora</strong> do seu negócio — eventos, datas, tendências, parcerias e movimentos de concorrentes. No futuro vêm de Meta, Google, Maps, APIs de eventos/notícias e social listening. Por enquanto, dados de exemplo.
      </div>

      <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap', marginBottom: '18px' }}>
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            style={{ padding: '6px 13px', borderRadius: '99px', border: `1px solid ${filter === f.key ? 'rgba(255,109,41,0.5)' : BORDER}`, background: filter === f.key ? 'rgba(255,109,41,0.1)' : 'transparent', color: filter === f.key ? ORANGE : MUTED, fontSize: '11.5px', fontWeight: filter === f.key ? 700 : 500, cursor: 'pointer', fontFamily: D }}>
            {f.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '14px' }}>
        {items.map(i => <InsightCard key={i.id} item={i} />)}
      </div>
    </div>
  )
}
