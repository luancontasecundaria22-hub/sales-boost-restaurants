import { useMemo } from 'react'
import type { CompanyData } from '../../../contexts/CompanyContext'
import { CARD, MUTED, BORDER } from './shared'
import { fmtNum } from './growthDemo'
import {
  buildMarketDemo, MOVE_META,
  type CompetitorMove, type MarketTrend, type MarketOpportunity,
} from './intelDemo'

const ORANGE = '#FF6D29'
const IMPACT_COLOR: Record<string, string> = { high: '#f87171', medium: '#FBBF24', low: MUTED }
const IMPACT_LABEL: Record<string, string> = { high: 'Alto', medium: 'Médio', low: 'Baixo' }
const RELEVANCE_LABEL: Record<string, string> = { high: 'Muito relevante', medium: 'Relevante', low: 'De olho' }

function CompetitorCard({ c }: { c: CompetitorMove }) {
  const m = MOVE_META[c.moveType]
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '11px', padding: '13px 15px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '7px' }}>
        <span style={{ fontSize: '13px', fontWeight: 700, color: 'white' }}>{c.name}</span>
        <span style={{ fontSize: '10px', color: MUTED }}>{fmtNum(c.followers)} seg · {c.engagement}% eng</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', padding: '9px 11px' }}>
        <span style={{ fontSize: '13px', flexShrink: 0 }}>{m.icon}</span>
        <div>
          <div style={{ fontSize: '11.5px', color: 'white', lineHeight: 1.45 }}>{c.move}</div>
          <div style={{ fontSize: '9.5px', color: MUTED, marginTop: '2px' }}>{c.postingFreq}</div>
        </div>
      </div>
    </div>
  )
}

function TrendCard({ t }: { t: MarketTrend }) {
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '11px', padding: '13px 15px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '4px' }}>
        <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'white' }}>🔥 {t.title}</span>
        <span style={{ fontSize: '9px', fontWeight: 700, color: IMPACT_COLOR[t.relevance], flexShrink: 0 }}>{RELEVANCE_LABEL[t.relevance]}</span>
      </div>
      <div style={{ fontSize: '11px', color: MUTED, lineHeight: 1.5 }}>{t.description}</div>
    </div>
  )
}

function OpportunityCard({ o }: { o: MarketOpportunity }) {
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '11px', padding: '13px 15px', borderLeft: `3px solid ${ORANGE}` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '4px' }}>
        <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'white' }}>💰 {o.title}</span>
        <span style={{ fontSize: '9px', fontWeight: 700, color: IMPACT_COLOR[o.impact], flexShrink: 0 }}>{IMPACT_LABEL[o.impact]} impacto</span>
      </div>
      <div style={{ fontSize: '11px', color: MUTED, lineHeight: 1.5 }}>{o.description}</div>
    </div>
  )
}

export default function MarketIntelTab({ company }: { company: Pick<CompanyData, 'id' | 'business_name' | 'business_type' | 'city'> }) {
  const demo = useMemo(() => buildMarketDemo(company), [company])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ padding: '12px 16px', background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.22)', borderRadius: '11px', fontSize: '11.5px', color: 'white', lineHeight: 1.6 }}>
        ⏳ <strong>Modo demonstração.</strong> O agente monitora o Instagram dos concorrentes, identifica tendências do seu segmento, analisa comentários dos consumidores e encontra oportunidades. Ao vivo, os dados vêm do Apify e da IA — aqui é uma amostra do que ele entrega.
      </div>

      {/* Movimentos dos concorrentes */}
      <section>
        <div style={{ fontSize: '13px', fontWeight: 800, color: 'white', marginBottom: '4px' }}>🔍 Movimentos dos concorrentes</div>
        <div style={{ fontSize: '11px', color: MUTED, marginBottom: '13px' }}>O que quem disputa o seu público andou fazendo.</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
          {demo.competitors.map((c, i) => <CompetitorCard key={i} c={c} />)}
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '20px', alignItems: 'start' }}>
        {/* Tendências */}
        <section>
          <div style={{ fontSize: '13px', fontWeight: 800, color: 'white', marginBottom: '11px' }}>📈 Conteúdos que estão performando</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
            {demo.trends.map(t => <TrendCard key={t.id} t={t} />)}
          </div>
        </section>

        {/* Oportunidades */}
        <section>
          <div style={{ fontSize: '13px', fontWeight: 800, color: 'white', marginBottom: '11px' }}>✨ Novas oportunidades</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
            {demo.opportunities.map(o => <OpportunityCard key={o.id} o={o} />)}
          </div>
        </section>
      </div>
    </div>
  )
}
