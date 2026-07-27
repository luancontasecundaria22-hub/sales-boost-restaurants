import { CARD, MUTED, BORDER, D } from './shared'
import { CONNECTION_CATEGORY_LABEL, type DemoConnection, type ConnectionCategory } from './growthDemo'

const ORANGE = '#FF6D29'
const GREEN = '#4ade80'
const AMBER = '#FBBF24'

const CATEGORY_ORDER: ConnectionCategory[] = ['meta', 'mensageria', 'reputacao', 'site', 'crm', 'ecommerce']

function ConnectionCard({ c }: { c: DemoConnection }) {
  const statusColor = c.connected ? GREEN : c.requiresVerification ? AMBER : 'rgba(255,255,255,0.35)'
  const statusLabel = c.connected ? 'Conectado' : c.requiresVerification ? 'Aguardando Meta' : 'Não conectado'
  return (
    <div style={{ background: CARD, border: `1px solid ${c.connected ? 'rgba(74,222,128,0.25)' : BORDER}`, borderRadius: '13px', padding: '15px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
        <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'white' }}>{c.icon} {c.name}</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '10px', fontWeight: 700, color: statusColor, flexShrink: 0 }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '99px', background: statusColor }} />{statusLabel}
        </span>
      </div>
      <div style={{ fontSize: '11px', color: MUTED, lineHeight: 1.5, minHeight: '32px' }}>{c.detail}</div>
      <button
        disabled={c.connected}
        style={{
          alignSelf: 'flex-start', padding: '6px 14px', borderRadius: '8px', fontSize: '11.5px', fontWeight: 700, fontFamily: D,
          border: c.connected ? `1px solid ${BORDER}` : '1px solid rgba(255,109,41,0.4)',
          background: c.connected ? 'transparent' : 'rgba(255,109,41,0.12)',
          color: c.connected ? MUTED : ORANGE, cursor: c.connected ? 'default' : 'pointer',
        }}>
        {c.connected ? '✓ Conectado' : c.requiresVerification ? 'Conectar quando verificado' : 'Conectar'}
      </button>
    </div>
  )
}

export default function ConnectionsTab({ connections }: { connections: DemoConnection[] }) {
  const connectedCount = connections.filter(c => c.connected).length

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '18px', flexWrap: 'wrap' }}>
        <div style={{ fontSize: '12.5px', color: MUTED, lineHeight: 1.6, maxWidth: '560px' }}>
          Conecte suas ferramentas para o Growth OS ter contexto real do negócio. Quanto mais fontes ligadas, mais preciso o agente fica. <strong style={{ color: 'white' }}>{connectedCount} de {connections.length}</strong> conectadas.
        </div>
      </div>

      <div style={{ marginBottom: '18px', padding: '12px 16px', background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.22)', borderRadius: '11px', fontSize: '11.5px', color: 'white', lineHeight: 1.6 }}>
        ⏳ <strong>Meta Ads e WhatsApp Business</strong> ficam disponíveis assim que sua conta for verificada pela Meta. Enquanto isso, você já vê todo o fluxo funcionando em <strong>modo demonstração</strong> — quando a verificação sair, os dados reais entram sem mudar nada nas telas.
      </div>

      {CATEGORY_ORDER.map(cat => {
        const items = connections.filter(c => c.category === cat)
        if (items.length === 0) return null
        return (
          <div key={cat} style={{ marginBottom: '22px' }}>
            <div style={{ fontSize: '10.5px', fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
              {CONNECTION_CATEGORY_LABEL[cat]}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '10px' }}>
              {items.map(c => <ConnectionCard key={c.key} c={c} />)}
            </div>
          </div>
        )
      })}
    </div>
  )
}
