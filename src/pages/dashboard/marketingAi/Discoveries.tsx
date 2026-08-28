import { useState } from 'react'
import { CARD, MUTED, BORDER, D, SUPABASE_URL } from './shared'

const ORANGE = '#FF6D29'
const GREEN = '#4ade80'

export interface Discovery {
  id: string; kind: string; title: string; detail: string; reason: string
  achievement: string | null; xp: number; status: 'pending' | 'revealed'
  meta?: Record<string, unknown>
}

async function call(token: string, companyId: string, action: string, extra: Record<string, unknown> = {}) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/business-progress`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ action, company_id: companyId, ...extra }),
  })
  return res.json().catch(() => ({}))
}

export async function fetchDiscoveries(token: string, companyId: string): Promise<{ pending: Discovery[]; revealed: Discovery[] }> {
  const j = await call(token, companyId, 'list_discoveries')
  return { pending: j.pending ?? [], revealed: j.revealed ?? [] }
}

export async function revealDiscovery(token: string, companyId: string, id: string): Promise<Discovery | null> {
  const j = await call(token, companyId, 'reveal_discovery', { discovery_id: id })
  return j.discovery ?? null
}

// Chip discreto "algo especial te espera" — curadoria, não info comum escondida.
export function DiscoveryChip({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button onClick={onClick}
      style={{ width: '100%', marginTop: '12px', padding: '11px 14px', background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.35)', borderRadius: '11px', cursor: 'pointer', fontFamily: D, display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left' }}>
      <span style={{ fontSize: '18px' }}>🔒</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#c4b5fd' }}>{count === 1 ? '1 Business Discovery esperando' : `${count} Business Discoveries esperando`}</div>
        <div style={{ fontSize: '10.5px', color: MUTED }}>👀 A IA encontrou algo especial sobre o seu negócio.</div>
      </div>
      <span style={{ fontSize: '13px', color: '#A78BFA' }}>→</span>
    </button>
  )
}

// Revelação (recompensa por curiosidade) — mostra o porquê + credita XP.
export function DiscoveryReveal({ d }: { d: Discovery }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '11px', fontWeight: 800, color: '#A78BFA', letterSpacing: '0.08em', marginBottom: '6px' }}>🔓 DISCOVERY REVEALED</div>
      <div style={{ fontSize: '18px', fontWeight: 900, color: 'white', lineHeight: 1.25, marginBottom: '10px' }}>{d.title}</div>
      <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.9)', lineHeight: 1.55, marginBottom: '10px' }}>{d.detail}</div>
      <div style={{ fontSize: '11.5px', color: MUTED, lineHeight: 1.5, background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}`, borderRadius: '9px', padding: '10px 12px', marginBottom: '12px', textAlign: 'left' }}>
        <strong style={{ color: 'white' }}>Por que é especial:</strong> {d.reason}
      </div>
      {d.achievement && <div style={{ fontSize: '14px', fontWeight: 800, color: '#FBBF24', marginBottom: '6px' }}>🏆 Conquista: {d.achievement}</div>}
      {d.xp > 0 && <div style={{ fontSize: '16px', fontWeight: 900, color: GREEN }}>🟢 +{d.xp} XP</div>}
    </div>
  )
}

// Seção da página: pendentes (lacradas) + já reveladas.
export function DiscoveriesSection({ token, companyId, pending, revealed, onRevealed }: {
  token: string; companyId: string; pending: Discovery[]; revealed: Discovery[]
  onRevealed: (d: Discovery) => void
}) {
  const [busy, setBusy] = useState<string | null>(null)
  const [shown, setShown] = useState<Discovery | null>(null)

  const open = async (id: string) => {
    setBusy(id)
    const d = await revealDiscovery(token, companyId, id)
    setBusy(null)
    if (d) { setShown(d); onRevealed(d) }
  }

  if (pending.length === 0 && revealed.length === 0) return null

  return (
    <div>
      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '14px', fontWeight: 800, color: 'white', fontFamily: D }}>🎁 Business Discoveries</div>
        <div style={{ fontSize: '11.5px', color: MUTED, marginTop: '2px' }}>Achados que a IA marcou como notáveis nos seus dados reais. Revele pra ganhar XP.</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '11px' }}>
        {pending.map(d => (
          <button key={d.id} onClick={() => open(d.id)} disabled={busy === d.id}
            style={{ textAlign: 'left', background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: '13px', padding: '16px', cursor: 'pointer', fontFamily: D }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔒</div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#c4b5fd', marginBottom: '4px' }}>Descoberta esperando</div>
            <div style={{ fontSize: '11px', color: MUTED, lineHeight: 1.4 }}>{busy === d.id ? 'Revelando…' : '👀 A IA encontrou algo especial. Clique para revelar.'}</div>
          </button>
        ))}
        {revealed.map(d => (
          <div key={d.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '13px', padding: '16px' }}>
            <div style={{ fontSize: '12.5px', fontWeight: 800, color: 'white', marginBottom: '5px' }}>{d.achievement ? `🏆 ${d.achievement}` : d.title}</div>
            <div style={{ fontSize: '11px', color: MUTED, lineHeight: 1.45, marginBottom: '6px' }}>{d.detail}</div>
            {d.xp > 0 && <div style={{ fontSize: '11px', fontWeight: 800, color: GREEN }}>+{d.xp} XP</div>}
          </div>
        ))}
      </div>

      {shown && (
        <div onClick={() => setShown(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)', zIndex: 1001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: D }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '420px', background: 'linear-gradient(180deg, #1A1008, #120c07)', border: '1px solid rgba(167,139,250,0.4)', borderRadius: '20px', padding: '28px 26px', boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 60px rgba(167,139,250,0.15)' }}>
            <DiscoveryReveal d={shown} />
            <button onClick={() => setShown(null)} style={{ width: '100%', marginTop: '18px', padding: '12px', background: ORANGE, color: '#000', fontWeight: 800, fontSize: '13px', border: 'none', borderRadius: '10px', cursor: 'pointer', fontFamily: D }}>Fechar</button>
          </div>
        </div>
      )}
    </div>
  )
}
