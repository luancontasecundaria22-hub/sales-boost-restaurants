import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../../lib/supabase'
import { ORANGE, CARD, MUTED, BORDER, D, callMarketingAi, type ChatMessage } from './shared'

export default function ChatTab({ companyId, accessToken, agentName }: { companyId: string; accessToken: string; agentName: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.from('marketing_ai_messages').select('role, content').eq('company_id', companyId).order('created_at', { ascending: true }).limit(50)
      .then(({ data }) => {
        setMessages((data ?? []) as ChatMessage[])
        setHistoryLoading(false)
      })
  }, [companyId])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: text }])
    setLoading(true)
    try {
      const data = await callMarketingAi(accessToken, 'chat', { message: text })
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply as string }])
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: e instanceof Error ? `Erro: ${e.message}` : 'Erro inesperado.' }])
    }
    setLoading(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '560px', background: CARD, border: `1px solid ${BORDER}`, borderRadius: '14px', overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px', borderBottom: `1px solid ${BORDER}`, fontSize: '13px', fontWeight: 700, color: 'white' }}>
        ✨ {agentName || 'Agente de Marketing'}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px' }}>
        {historyLoading ? (
          <div style={{ color: MUTED, fontSize: '13px' }}>Carregando...</div>
        ) : messages.length === 0 ? (
          <div style={{ color: MUTED, fontSize: '13px', lineHeight: 1.6 }}>
            Pergunte qualquer coisa sobre o que o {agentName || 'Agente de Marketing'} já descobriu — métricas do Instagram, ideias de conteúdo, concorrentes ou a estratégia atual.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '75%', padding: '10px 14px', borderRadius: '12px', fontSize: '13px', lineHeight: 1.55, whiteSpace: 'pre-wrap',
                  background: m.role === 'user' ? 'rgba(255,109,41,0.12)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${m.role === 'user' ? 'rgba(255,109,41,0.25)' : BORDER}`,
                  color: m.role === 'user' ? 'white' : 'rgba(255,255,255,0.85)',
                }}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && <div style={{ color: MUTED, fontSize: '12.5px' }}>Pensando...</div>}
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div style={{ padding: '14px 18px', borderTop: `1px solid ${BORDER}`, display: 'flex', gap: '10px' }}>
        <input
          value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          placeholder="Pergunte algo..."
          style={{ flex: 1, padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`, borderRadius: '9px', color: 'white', fontSize: '13px', outline: 'none', fontFamily: D }}
        />
        <button onClick={send} disabled={loading || !input.trim()}
          style={{ padding: '10px 20px', background: ORANGE, color: '#000', fontWeight: 700, fontSize: '13px', borderRadius: '9px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading || !input.trim() ? 0.6 : 1 }}>
          Enviar
        </button>
      </div>
    </div>
  )
}
