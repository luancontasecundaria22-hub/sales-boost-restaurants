import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

const ORANGE = '#FF6D29'
const BG = '#0E0B0A'
const CARD = '#150E08'
const MUTED = '#BABABA'
const BORDER = 'rgba(255,255,255,0.06)'
const D = "'Bricolage Grotesque', system-ui, sans-serif"
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string

interface ProposedChange { field: string; new_value: unknown; reasoning: string }
interface Message { role: 'user' | 'assistant'; content: string; proposedChanges?: ProposedChange[]; applied?: boolean; discarded?: boolean }

const FIELD_LABELS: Record<string, string> = {
  mission: 'Missão', personality: 'Personalidade', priorities: 'Prioridades', routines: 'Rotinas',
  global_objectives: 'Objetivos Globais', kpis_monitored: 'KPIs Monitorados', max_daily_cost_usd: 'Custo diário máximo (US$)',
  max_claude_calls_daily: 'Chamadas de IA máximas por dia', max_active_agents: 'Agentes ativos máximos',
  approvals: 'Aprovações', policies: 'Políticas do Hermes',
}
const MERGE_FIELDS = new Set(['priorities', 'routines', 'kpis_monitored', 'approvals'])

function formatValue(v: unknown): string {
  if (typeof v === 'string') return v
  if (Array.isArray(v)) return v.join(', ')
  if (v && typeof v === 'object') return Object.entries(v as Record<string, unknown>).map(([k, val]) => `${k}: ${val}`).join(', ')
  return String(v)
}

const WELCOME: Message = {
  role: 'assistant',
  content: 'Oi! Aqui você conversa comigo sobre como eu devo me comportar — não sobre um cliente específico. Me diz o que quer mudar, ex: "seja mais agressivo buscando novos clientes" ou "priorize mais reputação do que conteúdo". Eu só proponho a mudança — nada é aplicado sem você clicar em "Aplicar".',
}

export default function HermesStrategyPage() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [messages, setMessages] = useState<Message[]>([WELCOME])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const sendMessage = async () => {
    if (!input.trim() || loading || !session) return
    const userMsg: Message = { role: 'user', content: input.trim() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    try {
      const history = newMessages.slice(0, -1).slice(-10).map(m => ({ role: m.role, content: m.content }))
      const res = await fetch(`${SUPABASE_URL}/functions/v1/hermes-strategy`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg.content, history }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.error ?? 'Erro ao processar.' }])
        return
      }
      setMessages(prev => [...prev, {
        role: 'assistant', content: data.reply,
        proposedChanges: (data.proposed_changes as ProposedChange[] | undefined)?.length ? data.proposed_changes : undefined,
      }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Erro de conexão. Tente novamente.' }])
    } finally {
      setLoading(false)
    }
  }

  const applyChanges = async (msgIndex: number) => {
    const msg = messages[msgIndex]
    if (!msg.proposedChanges) return
    const { data: current } = await supabase.from('hermes_config').select('*').eq('id', true).maybeSingle()
    if (!current) return
    const updates: Record<string, unknown> = {}
    for (const c of msg.proposedChanges) {
      if (MERGE_FIELDS.has(c.field)) {
        updates[c.field] = { ...(current[c.field] as Record<string, unknown> ?? {}), ...(c.new_value as Record<string, unknown>) }
      } else {
        updates[c.field] = c.new_value
      }
    }
    updates.updated_at = new Date().toISOString()
    const { error } = await supabase.from('hermes_config').update(updates).eq('id', true)
    if (!error) setMessages(prev => prev.map((m, i) => i === msgIndex ? { ...m, applied: true } : m))
  }

  const discardChanges = (msgIndex: number) => {
    setMessages(prev => prev.map((m, i) => i === msgIndex ? { ...m, discarded: true } : m))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: BG }}>
      <div style={{ padding: '16px 32px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => navigate('/owner/hermes')} style={{ background: 'transparent', border: 'none', color: MUTED, fontSize: '18px', cursor: 'pointer', padding: '4px' }}>← Voltar</button>
          <div style={{ width: '1px', height: '20px', background: BORDER }} />
          <span style={{ fontFamily: D, fontSize: '1rem', fontWeight: 800, color: 'white' }}>🧠 Estratégia — conversar com o Hermes</span>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '760px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{ display: 'flex', gap: '10px', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row', maxWidth: '85%' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '9px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', background: msg.role === 'assistant' ? 'rgba(255,109,41,0.15)' : 'rgba(255,255,255,0.06)', border: `1px solid ${msg.role === 'assistant' ? 'rgba(255,109,41,0.3)' : BORDER}` }}>
                {msg.role === 'assistant' ? '🧠' : '👤'}
              </div>
              <div style={{
                padding: '11px 15px', borderRadius: msg.role === 'user' ? '14px 3px 14px 14px' : '3px 14px 14px 14px',
                fontSize: '13.5px', lineHeight: 1.6, whiteSpace: 'pre-wrap',
                background: msg.role === 'user' ? `linear-gradient(135deg, ${ORANGE}, #E05A1E)` : CARD,
                color: msg.role === 'user' ? '#000' : 'white', border: msg.role === 'user' ? 'none' : `1px solid ${BORDER}`,
              }}>
                {msg.content}
              </div>
            </div>

            {msg.proposedChanges && (
              <div style={{ marginLeft: '38px', maxWidth: '85%', background: 'rgba(255,109,41,0.06)', border: '1px solid rgba(255,109,41,0.25)', borderRadius: '12px', padding: '14px 16px', width: '100%', boxSizing: 'border-box' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: ORANGE, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>Prévia das mudanças</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
                  {msg.proposedChanges.map((c, ci) => (
                    <div key={ci} style={{ fontSize: '12.5px' }}>
                      <div style={{ fontWeight: 700, color: 'white', marginBottom: '2px' }}>{FIELD_LABELS[c.field] ?? c.field}</div>
                      <div style={{ color: MUTED, marginBottom: '3px' }}>{c.reasoning}</div>
                      <div style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', fontSize: '11.5px', background: 'rgba(0,0,0,0.2)', padding: '4px 8px', borderRadius: '6px', wordBreak: 'break-word' }}>
                        → {formatValue(c.new_value)}
                      </div>
                    </div>
                  ))}
                </div>
                {msg.applied ? (
                  <div style={{ fontSize: '12px', color: '#4ade80', fontWeight: 700 }}>✓ Aplicado</div>
                ) : msg.discarded ? (
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>Descartado</div>
                ) : (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => applyChanges(i)} style={{ padding: '8px 16px', background: ORANGE, color: '#000', fontWeight: 700, fontSize: '12.5px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
                      Aplicar
                    </button>
                    <button onClick={() => discardChanges(i)} style={{ padding: '8px 16px', background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: '8px', color: MUTED, fontSize: '12.5px', cursor: 'pointer' }}>
                      Descartar
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', background: 'rgba(255,109,41,0.15)', border: '1px solid rgba(255,109,41,0.3)' }}>🧠</div>
            <div style={{ padding: '11px 15px', borderRadius: '3px 14px 14px 14px', background: CARD, border: `1px solid ${BORDER}`, display: 'flex', gap: '5px' }}>
              {[0, 1, 2].map(i => <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: ORANGE, animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />)}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: '16px 32px 24px', borderTop: `1px solid ${BORDER}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: '10px', maxWidth: '760px', margin: '0 auto' }}>
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Ex: seja mais agressivo buscando novos clientes..."
            disabled={loading}
            style={{ flex: 1, padding: '12px 16px', fontSize: '14px', borderRadius: '12px', background: CARD, border: `1px solid ${BORDER}`, color: 'white', outline: 'none' }} />
          <button onClick={sendMessage} disabled={loading || !input.trim()}
            style={{ padding: '12px 22px', borderRadius: '12px', border: 'none', background: loading || !input.trim() ? 'rgba(255,109,41,0.3)' : ORANGE, color: '#000', fontWeight: 700, fontSize: '14px', cursor: loading || !input.trim() ? 'not-allowed' : 'pointer', flexShrink: 0 }}>
            Enviar
          </button>
        </div>
      </div>

      <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); opacity: 0.4; } 50% { transform: translateY(-5px); opacity: 1; } }`}</style>
    </div>
  )
}
