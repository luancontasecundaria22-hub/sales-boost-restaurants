import { useMemo, useState } from 'react'
import type { CompanyData } from '../../../contexts/CompanyContext'
import { CARD, MUTED, BORDER, D } from './shared'
import { buildWhatsAppDemo, WA_STATUS_META, type DemoWaConversation } from './salesDemo'

const ORANGE = '#FF6D29'
const GREEN = '#4ade80'

function StatusBadge({ status }: { status: DemoWaConversation['status'] }) {
  const m = WA_STATUS_META[status]
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '9.5px', fontWeight: 700, color: m.color, flexShrink: 0 }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '99px', background: m.color }} />{m.label}
    </span>
  )
}

export default function WhatsAppTab({ company }: { company: Pick<CompanyData, 'id' | 'business_name' | 'business_type'> }) {
  const demo = useMemo(() => buildWhatsAppDemo(company), [company])
  const [activeId, setActiveId] = useState(demo.conversations[0]?.id ?? '')
  const [transferred, setTransferred] = useState<Set<string>>(new Set())
  const active = demo.conversations.find(c => c.id === activeId) ?? demo.conversations[0]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <div style={{ padding: '12px 16px', background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.22)', borderRadius: '11px', fontSize: '11.5px', color: 'white', lineHeight: 1.6 }}>
        ⏳ <strong>Modo demonstração.</strong> Com a WhatsApp Business API verificada, o agente responde dúvidas, apresenta produtos, qualifica o interesse e passa pro humano quando precisa — aprendendo com o histórico de conversas e o FAQ da empresa. Você define o nível de autonomia (sugerir, aprovar ou responder sozinho).
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 0.9fr) minmax(0, 1.6fr)', gap: '14px', alignItems: 'start' }}>
        {/* Lista de conversas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>Conversas</div>
          {demo.conversations.map(c => {
            const isActive = c.id === active?.id
            return (
              <button key={c.id} onClick={() => setActiveId(c.id)}
                style={{ textAlign: 'left', background: CARD, border: `1px solid ${isActive ? 'rgba(255,109,41,0.4)' : BORDER}`, borderRadius: '10px', padding: '11px 13px', cursor: 'pointer', fontFamily: D }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'white' }}>{c.name}</span>
                  {c.unread > 0 && <span style={{ fontSize: '9px', fontWeight: 700, background: ORANGE, color: '#000', borderRadius: '99px', padding: '1px 6px' }}>{c.unread}</span>}
                </div>
                <div style={{ fontSize: '11px', color: MUTED, lineHeight: 1.4, marginBottom: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.lastPreview}</div>
                <StatusBadge status={c.status} />
              </button>
            )
          })}
        </div>

        {/* Conversa aberta */}
        {active && (
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '13px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '13px 16px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'white' }}>💬 {active.name}</span>
              <StatusBadge status={active.status} />
            </div>

            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '9px', maxHeight: '340px', overflowY: 'auto' }}>
              {active.messages.map((m, i) => {
                const isAgent = m.from === 'agente'
                return (
                  <div key={i} style={{ display: 'flex', justifyContent: isAgent ? 'flex-end' : 'flex-start' }}>
                    <div style={{ maxWidth: '78%', padding: '8px 12px', borderRadius: '12px', background: isAgent ? 'rgba(255,109,41,0.14)' : 'rgba(255,255,255,0.05)', border: `1px solid ${isAgent ? 'rgba(255,109,41,0.25)' : BORDER}` }}>
                      {isAgent && <div style={{ fontSize: '9px', fontWeight: 700, color: ORANGE, marginBottom: '2px' }}>🤖 Agente IA</div>}
                      <div style={{ fontSize: '12px', color: 'white', lineHeight: 1.5 }}>{m.text}</div>
                      <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', marginTop: '3px', textAlign: 'right' }}>{m.time}</div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div style={{ padding: '12px 16px', borderTop: `1px solid ${BORDER}` }}>
              {transferred.has(active.id) ? (
                <div style={{ fontSize: '11.5px', color: GREEN, textAlign: 'center' }}>✓ Conversa transferida para um atendente humano</div>
              ) : (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div style={{ flex: 1, padding: '9px 12px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}`, borderRadius: '9px', fontSize: '11.5px', color: 'rgba(255,255,255,0.3)' }}>
                    O agente responde automaticamente…
                  </div>
                  <button onClick={() => setTransferred(prev => new Set(prev).add(active.id))}
                    style={{ padding: '9px 14px', background: 'transparent', border: `1px solid ${BORDER}`, color: MUTED, fontWeight: 700, fontSize: '11px', borderRadius: '9px', cursor: 'pointer', fontFamily: D, flexShrink: 0 }}>
                    Transferir p/ humano
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* O que o agente aprende */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${BORDER}`, borderRadius: '13px', padding: '16px 18px' }}>
        <div style={{ fontSize: '12.5px', fontWeight: 800, color: 'white', marginBottom: '4px' }}>🧠 O que o agente aprende</div>
        <div style={{ fontSize: '11px', color: MUTED, marginBottom: '13px', lineHeight: 1.5 }}>Ele responde com base no histórico de conversas, nos produtos e no FAQ da sua empresa — quanto mais você alimenta, mais preciso ele fica.</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '10px', fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>FAQ</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {demo.knowledge.faq.map((f, i) => <Chip key={i} text={f} />)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '10px', fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Produtos / Serviços</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {demo.knowledge.products.map((p, i) => <Chip key={i} text={p} />)}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Chip({ text }: { text: string }) {
  return (
    <span style={{ fontSize: '11px', color: 'white', background: CARD, border: `1px solid ${BORDER}`, borderRadius: '99px', padding: '5px 11px' }}>{text}</span>
  )
}
