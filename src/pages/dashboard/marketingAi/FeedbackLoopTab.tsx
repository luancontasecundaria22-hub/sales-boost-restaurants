import { useMemo } from 'react'
import type { CompanyData } from '../../../contexts/CompanyContext'
import { CARD, MUTED, BORDER } from './shared'
import { buildFeedbackDemo, CONFIDENCE_META, type AttributionStep, type Learning } from './feedbackDemo'

const ORANGE = '#FF6D29'
const GREEN = '#4ade80'

// Cadeia de atribuição: anúncio → clique → lead → conversa → venda → receita
function AttributionChain({ steps }: { steps: AttributionStep[] }) {
  return (
    <div style={{ display: 'flex', alignItems: 'stretch', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
      {steps.map((s, i) => {
        const isRevenue = s.key === 'receita'
        return (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            <div style={{ minWidth: '112px', background: CARD, border: `1px solid ${isRevenue ? 'rgba(255,109,41,0.4)' : BORDER}`, borderRadius: '12px', padding: '13px 14px', textAlign: 'center' }}>
              <div style={{ fontSize: '17px', marginBottom: '5px' }}>{s.icon}</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: isRevenue ? ORANGE : 'white', letterSpacing: '-0.02em' }}>{s.value}</div>
              <div style={{ fontSize: '10px', color: MUTED, marginTop: '2px' }}>{s.label}</div>
            </div>
            {i < steps.length - 1 && <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '14px' }}>→</span>}
          </div>
        )
      })}
    </div>
  )
}

// O ciclo que fecha: Ação → Resultado → Aprendizado → Nova ação
function LoopDiagram() {
  const nodes = [
    { icon: '⚡', label: 'Ação', desc: 'A IA executa (com sua aprovação)' },
    { icon: '📊', label: 'Resultado', desc: 'Mede o que aconteceu de verdade' },
    { icon: '🧠', label: 'Aprendizado', desc: 'Descobre o que funcionou e por quê' },
    { icon: '🔁', label: 'Nova ação', desc: 'Aplica o aprendizado na próxima' },
  ]
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
      {nodes.map((n, i) => (
        <div key={n.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${BORDER}`, borderRadius: '11px', padding: '10px 14px', minWidth: '150px' }}>
            <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'white' }}>{n.icon} {n.label}</div>
            <div style={{ fontSize: '10px', color: MUTED, marginTop: '2px', lineHeight: 1.4 }}>{n.desc}</div>
          </div>
          <span style={{ color: ORANGE, fontSize: '14px' }}>{i < nodes.length - 1 ? '→' : '↺'}</span>
        </div>
      ))}
    </div>
  )
}

function LearningCard({ l }: { l: Learning }) {
  const conf = CONFIDENCE_META[l.confidence]
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '13px', padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px', marginBottom: '7px' }}>
        <span style={{ fontSize: '13.5px', fontWeight: 800, color: 'white', lineHeight: 1.35 }}>💡 {l.title}</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '9px', fontWeight: 700, color: conf.color, flexShrink: 0, marginTop: '2px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '99px', background: conf.color }} />{conf.label}
        </span>
      </div>
      <div style={{ fontSize: '11.5px', color: MUTED, lineHeight: 1.55, marginBottom: '11px' }}>{l.evidence}</div>
      <div style={{ fontSize: '11.5px', color: GREEN, lineHeight: 1.5, background: 'rgba(74,222,128,0.07)', border: '1px solid rgba(74,222,128,0.18)', borderRadius: '8px', padding: '9px 12px' }}>
        <strong>Ação tomada:</strong> {l.action}
      </div>
    </div>
  )
}

export default function FeedbackLoopTab({ company }: { company: Pick<CompanyData, 'id' | 'business_name'> }) {
  const demo = useMemo(() => buildFeedbackDemo(company), [company])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '26px' }}>
      <div style={{ padding: '12px 16px', background: 'rgba(255,109,41,0.06)', border: '1px solid rgba(255,109,41,0.2)', borderRadius: '11px', fontSize: '11.5px', color: 'white', lineHeight: 1.6 }}>
        🔁 <strong>O diferencial do Growth OS.</strong> A maioria das ferramentas para no "anúncio → resultado". Aqui a IA acompanha o caminho inteiro — <strong>anúncio → lead → venda → aprendizado</strong> — e fica mais inteligente a cada ciclo. No modo demonstração os números vêm dos outros módulos; ao vivo, cruzam os dados reais da Meta, do funil e do atendimento.
      </div>

      {/* Cadeia de atribuição */}
      <section>
        <div style={{ fontSize: '13px', fontWeight: 800, color: 'white', marginBottom: '4px' }}>📍 De onde veio a receita</div>
        <div style={{ fontSize: '11px', color: MUTED, marginBottom: '13px' }}>O caminho completo do dinheiro, ponta a ponta — não só o clique.</div>
        <AttributionChain steps={demo.chain} />
      </section>

      {/* Ciclo */}
      <section>
        <div style={{ fontSize: '13px', fontWeight: 800, color: 'white', marginBottom: '13px' }}>♻️ O ciclo que fica mais inteligente</div>
        <LoopDiagram />
      </section>

      {/* Aprendizados */}
      <section>
        <div style={{ fontSize: '13px', fontWeight: 800, color: 'white', marginBottom: '4px' }}>🧠 Aprendizados da IA</div>
        <div style={{ fontSize: '11px', color: MUTED, marginBottom: '13px' }}>Cada aprendizado nasce de um dado real e já virou uma ação — é assim que a máquina melhora sozinha.</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '12px' }}>
          {demo.learnings.map(l => <LearningCard key={l.id} l={l} />)}
        </div>
      </section>
    </div>
  )
}
