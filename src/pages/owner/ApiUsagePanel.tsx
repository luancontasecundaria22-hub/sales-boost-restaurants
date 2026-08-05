import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

const ORANGE = '#FF6D29'
const CARD = '#150E08'
const MUTED = '#BABABA'
const BORDER = 'rgba(255,255,255,0.06)'
const D = "'Bricolage Grotesque', system-ui, sans-serif"
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string

interface Usage { label: string; used: number; limit: number | null; unit: string; pct: number | null }
interface Provider {
  key: string; name: string; category: string; usage_type: string
  billing_url: string | null; enabled: boolean; manual_note: string | null
  configured: boolean; status: 'ok' | 'nokey' | 'error'; usage: Usage | null; note: string | null
}

const CATEGORY_LABEL: Record<string, string> = {
  ia: '🧠 Inteligência Artificial',
  dados: '🌐 Dados & Coleta',
  infra: '⚙️ Infraestrutura',
  pagamentos: '💳 Pagamentos',
}
const CATEGORY_ORDER = ['ia', 'dados', 'infra', 'pagamentos']

const STATUS_META: Record<string, { color: string; label: string }> = {
  ok: { color: '#4ade80', label: 'Ativa' },
  error: { color: '#f87171', label: 'Erro' },
  nokey: { color: 'rgba(255,255,255,0.3)', label: 'Sem chave' },
}

function fmt(n: number, unit: string): string {
  if (unit === 'USD') return `US$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  return `${n.toLocaleString('pt-BR')} ${unit === 'caracteres' ? '' : unit}`.trim()
}

function UsageView({ u }: { u: Usage }) {
  const barColor = u.pct == null ? ORANGE : u.pct >= 85 ? '#f87171' : u.pct >= 60 ? '#FBBF24' : '#4ade80'
  return (
    <div style={{ marginTop: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '5px' }}>
        <span style={{ fontSize: '10px', fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{u.label}</span>
        <span style={{ fontSize: '13px', fontWeight: 800, color: 'white' }}>
          {fmt(u.used, u.unit)}{u.limit != null && <span style={{ color: MUTED, fontWeight: 600 }}> / {fmt(u.limit, u.unit)}</span>}
        </span>
      </div>
      {u.limit != null && u.pct != null ? (
        <div style={{ height: '6px', borderRadius: '99px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
          <div style={{ width: `${Math.max(2, u.pct)}%`, height: '100%', background: barColor }} />
        </div>
      ) : (
        <div style={{ fontSize: '10.5px', color: MUTED }}>Sem teto de plano informado pela API.</div>
      )}
    </div>
  )
}

function NoteEditor({ p, onSaved }: { p: Provider; onSaved: (v: string) => void }) {
  const [val, setVal] = useState(p.manual_note ?? '')
  const [saving, setSaving] = useState(false)
  const dirty = (val.trim() || null) !== (p.manual_note ?? null)
  const save = async () => {
    setSaving(true)
    await supabase.from('api_providers').update({ manual_note: val.trim() || null }).eq('key', p.key)
    onSaved(val.trim())
    setSaving(false)
  }
  return (
    <div style={{ marginTop: '12px', display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '9.5px', fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Sua nota</div>
        <input value={val} onChange={e => setVal(e.target.value)} placeholder="ex: plano free até 5 USD/mês; renova dia 1"
          style={{ width: '100%', padding: '7px 10px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}`, borderRadius: '8px', color: 'white', fontSize: '11.5px', fontFamily: D, outline: 'none', boxSizing: 'border-box' }} />
      </div>
      {dirty && (
        <button onClick={save} disabled={saving}
          style={{ padding: '7px 12px', background: ORANGE, color: '#000', border: 'none', borderRadius: '8px', fontSize: '11px', fontWeight: 800, cursor: saving ? 'default' : 'pointer', fontFamily: D, flexShrink: 0 }}>
          {saving ? '...' : 'Salvar'}
        </button>
      )}
    </div>
  )
}

function ProviderCard({ p, onNote }: { p: Provider; onNote: (key: string, v: string) => void }) {
  const st = STATUS_META[p.status]
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '14px', padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '2px' }}>
        <span style={{ width: '8px', height: '8px', borderRadius: '99px', background: st.color, flexShrink: 0 }} />
        <span style={{ fontSize: '14px', fontWeight: 800, color: 'white' }}>{p.name}</span>
        <span style={{ marginLeft: 'auto', fontSize: '10px', fontWeight: 700, color: st.color, border: `1px solid ${st.color}44`, borderRadius: '99px', padding: '2px 9px' }}>{st.label}</span>
      </div>

      {p.usage ? <UsageView u={p.usage} /> : (
        <div style={{ marginTop: '8px', fontSize: '11.5px', color: MUTED, lineHeight: 1.5 }}>
          {p.status === 'nokey' ? 'Chave ainda não configurada nesta função.' : (p.note ?? 'Sem dados de uso.')}
        </div>
      )}

      {p.usage && p.note && <div style={{ marginTop: '6px', fontSize: '10.5px', color: MUTED }}>{p.note}</div>}

      <NoteEditor p={p} onSaved={(v) => onNote(p.key, v)} />

      {p.billing_url && (
        <a href={p.billing_url} target="_blank" rel="noreferrer"
          style={{ display: 'inline-block', marginTop: '12px', fontSize: '11px', fontWeight: 700, color: ORANGE, textDecoration: 'none' }}>
          Abrir painel do provedor →
        </a>
      )}
    </div>
  )
}

export default function ApiUsagePanel() {
  const { session } = useAuth()
  const [providers, setProviders] = useState<Provider[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!session) return
    setRefreshing(true)
    setError(null)
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/api-usage`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: '{}',
      })
      const data = await res.json() as { ok?: boolean; providers?: Provider[]; generated_at?: string; error?: string }
      if (data.providers) { setProviders(data.providers); setGeneratedAt(data.generated_at ?? null) }
      else setError(data.error ?? 'Não foi possível carregar.')
    } catch {
      setError('Falha de conexão ao consultar as APIs.')
    }
    setRefreshing(false)
  }, [session])

  useEffect(() => { load() }, [load])

  const onNote = (key: string, v: string) =>
    setProviders(prev => prev?.map(p => p.key === key ? { ...p, manual_note: v || null } : p) ?? prev)

  const grouped = CATEGORY_ORDER
    .map(cat => ({ cat, items: (providers ?? []).filter(p => p.category === cat) }))
    .filter(g => g.items.length > 0)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: 'rgba(255,109,41,0.05)', border: '1px solid rgba(255,109,41,0.18)', borderRadius: '11px', fontSize: '11.5px', color: 'white', lineHeight: 1.6, marginBottom: '18px' }}>
        <span>🔑 Todas as APIs que o site usa. Onde o provedor tem API de saldo (Apify, APITemplate) o crédito aparece <strong>ao vivo</strong>. Claude e OpenAI não expõem saldo por chave — pra esses mostramos o gasto rastreado e o link do painel deles.</span>
        <button onClick={load} disabled={refreshing} style={{ marginLeft: 'auto', flexShrink: 0, padding: '6px 12px', background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: '8px', color: MUTED, fontSize: '11px', fontWeight: 700, cursor: refreshing ? 'default' : 'pointer', fontFamily: D }}>{refreshing ? 'Atualizando…' : '↻ Atualizar'}</button>
      </div>

      {error && <div style={{ padding: '14px 16px', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: '11px', color: '#f87171', fontSize: '12.5px', marginBottom: '18px' }}>{error}</div>}

      {providers == null && !error && <div style={{ color: MUTED, fontSize: '13px' }}>Carregando uso das APIs…</div>}

      {grouped.map(g => (
        <div key={g.cat} style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '12px', fontWeight: 800, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '11px' }}>{CATEGORY_LABEL[g.cat] ?? g.cat}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '13px' }}>
            {g.items.map(p => <ProviderCard key={p.key} p={p} onNote={onNote} />)}
          </div>
        </div>
      ))}

      {generatedAt && <div style={{ fontSize: '10.5px', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>Consultado em {new Date(generatedAt).toLocaleString('pt-BR')}</div>}
    </div>
  )
}
