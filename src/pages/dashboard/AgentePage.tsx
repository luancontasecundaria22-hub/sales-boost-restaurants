import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { useNavigate } from 'react-router-dom'

const ORANGE = '#FF6D29'
const CARD = '#150E08'
const MUTED = '#BABABA'
const D = "'Bricolage Grotesque', system-ui, sans-serif"
const BORDER = 'rgba(255,255,255,0.06)'
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string

type Message = { role: 'user' | 'assistant'; content: string }

const QUICK_PROMPTS = [
  'Cria 5 posts para essa semana',
  'Sugira um post de promoção para segunda-feira',
  'Crie um post de boas-vindas para novos clientes',
  'Sugira conteúdo para o fim de semana',
]

export default function AgentePage() {
  const { user, session } = useAuth()
  const navigate = useNavigate()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(true)
  const [noCompany, setNoCompany] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const WELCOME: Message = {
    role: 'assistant',
    content: 'Olá! Sou seu agente de crescimento. Posso criar posts, sugerir conteúdo e ajudar a organizar sua semana de publicações. O que você precisa hoje?',
  }

  useEffect(() => {
    if (!user) return
    loadCompanyAndHistory()
  }, [user])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function loadCompanyAndHistory() {
    setHistoryLoading(true)
    const { data: company } = await supabase
      .from('companies')
      .select('id')
      .eq('user_id', user!.id)
      .maybeSingle()

    if (!company) {
      setNoCompany(true)
      setHistoryLoading(false)
      return
    }

    const { data: history } = await supabase
      .from('agent_messages')
      .select('role, content')
      .eq('company_id', company.id)
      .order('created_at', { ascending: true })
      .limit(60)

    if (history && history.length > 0) {
      setMessages(history as Message[])
    } else {
      setMessages([WELCOME])
    }

    setHistoryLoading(false)
  }

  async function sendMessage(text?: string) {
    const msg = (text ?? input).trim()
    if (!msg || loading || !session) return

    const newMessages: Message[] = [...messages, { role: 'user', content: msg }]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const history = newMessages.slice(0, -1).slice(-10)
      const res = await fetch(`${SUPABASE_URL}/functions/v1/agent-chat`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: msg, history }),
      })

      const data = await res.json()

      if (!res.ok) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.error ?? 'Erro ao contatar o agente. Tente novamente.',
        }])
        return
      }

      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])

      if (data.postsCreated > 0) {
        setTimeout(() => {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `✅ ${data.postsCreated} rascunho(s) criado(s) e disponíveis na aba **Posts** para sua aprovação.`,
          }])
        }, 600)
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Erro de conexão. Verifique sua internet e tente novamente.',
      }])
    } finally {
      setLoading(false)
    }
  }

  if (historyLoading) {
    return <div style={{ padding: '28px 32px', color: MUTED, fontSize: '14px' }}>Carregando...</div>
  }

  if (noCompany) {
    return (
      <div>
        <div style={{ padding: '28px 32px 24px', borderBottom: `1px solid ${BORDER}` }}>
          <h1 style={{ fontFamily: D, fontSize: '1.5rem', fontWeight: 800, color: 'white', letterSpacing: '-0.02em', marginBottom: '4px' }}>Agente</h1>
          <p style={{ color: MUTED, fontSize: '13px' }}>Seu assistente pessoal de crescimento</p>
        </div>
        <div style={{ padding: '28px 32px' }}>
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '14px', padding: '48px 32px', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🤖</div>
            <div style={{ fontFamily: D, fontSize: '1.2rem', fontWeight: 800, color: 'white', marginBottom: '8px' }}>
              Cadastre seu negócio primeiro
            </div>
            <div style={{ fontSize: '14px', color: MUTED, maxWidth: '380px', margin: '0 auto 24px', lineHeight: 1.6 }}>
              O agente precisa conhecer seu negócio para criar conteúdo relevante.
            </div>
            <button
              onClick={() => navigate('/onboarding')}
              style={{ padding: '11px 24px', background: ORANGE, color: '#000', fontWeight: 700, fontSize: '14px', borderRadius: '10px', border: 'none', cursor: 'pointer' }}
            >
              Fazer diagnóstico gratuito →
            </button>
          </div>
        </div>
      </div>
    )
  }

  const isFirstMessage = messages.length === 1 && messages[0].role === 'assistant'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Header */}
      <div style={{ padding: '20px 32px 16px', borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontFamily: D, fontSize: '1.5rem', fontWeight: 800, color: 'white', letterSpacing: '-0.02em', marginBottom: '2px' }}>
              Agente
            </h1>
            <p style={{ color: MUTED, fontSize: '13px' }}>Seu assistente pessoal de crescimento</p>
          </div>
          <button
            onClick={() => navigate('/dashboard/posts')}
            style={{ padding: '8px 16px', background: 'rgba(255,109,41,0.1)', border: '1px solid rgba(255,109,41,0.25)', borderRadius: '9px', color: ORANGE, fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
          >
            Ver Posts →
          </button>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              gap: '12px',
              flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
            }}
          >
            {/* Avatar */}
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '10px',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              background: msg.role === 'assistant' ? 'rgba(255,109,41,0.15)' : 'rgba(255,255,255,0.06)',
              border: `1px solid ${msg.role === 'assistant' ? 'rgba(255,109,41,0.3)' : BORDER}`,
            }}>
              {msg.role === 'assistant' ? '🤖' : '👤'}
            </div>

            {/* Bubble */}
            <div style={{
              maxWidth: '75%',
              padding: '12px 16px',
              borderRadius: msg.role === 'user' ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
              fontSize: '14px',
              lineHeight: 1.65,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              background: msg.role === 'user'
                ? `linear-gradient(135deg, ${ORANGE}, #E05A1E)`
                : CARD,
              color: msg.role === 'user' ? '#000' : 'white',
              border: msg.role === 'user' ? 'none' : `1px solid ${BORDER}`,
              fontWeight: msg.role === 'user' ? 500 : 400,
            }}>
              {msg.content}
            </div>
          </div>
        ))}

        {/* Loading bubble */}
        {loading && (
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '10px', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px',
              background: 'rgba(255,109,41,0.15)', border: '1px solid rgba(255,109,41,0.3)',
            }}>🤖</div>
            <div style={{
              padding: '12px 16px', borderRadius: '4px 16px 16px 16px',
              background: CARD, border: `1px solid ${BORDER}`,
              display: 'flex', gap: '5px', alignItems: 'center',
            }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: '6px', height: '6px', borderRadius: '50%', background: ORANGE,
                  animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                }} />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Quick prompts — only on first message */}
      {isFirstMessage && !loading && (
        <div style={{ padding: '0 32px 12px', display: 'flex', flexWrap: 'wrap', gap: '8px', flexShrink: 0 }}>
          {QUICK_PROMPTS.map(p => (
            <button
              key={p}
              onClick={() => sendMessage(p)}
              style={{
                padding: '7px 14px', fontSize: '12px', borderRadius: '99px',
                background: 'rgba(255,109,41,0.07)', border: '1px solid rgba(255,109,41,0.2)',
                color: ORANGE, cursor: 'pointer', fontWeight: 500, transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,109,41,0.15)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,109,41,0.07)' }}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{ padding: '12px 32px 24px', borderTop: `1px solid ${BORDER}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Peça ao agente algo para fazer..."
            disabled={loading}
            style={{
              flex: 1, padding: '12px 16px', fontSize: '14px', borderRadius: '12px',
              background: CARD, border: `1px solid ${BORDER}`, color: 'white',
              outline: 'none', transition: 'border-color 0.15s',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = 'rgba(255,109,41,0.4)' }}
            onBlur={e => { e.currentTarget.style.borderColor = BORDER }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            style={{
              padding: '12px 20px', borderRadius: '12px', border: 'none',
              background: loading || !input.trim() ? 'rgba(255,109,41,0.3)' : ORANGE,
              color: '#000', fontWeight: 700, fontSize: '14px',
              cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s', flexShrink: 0,
            }}
          >
            Enviar
          </button>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); opacity: 0.4; }
          50% { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
