import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { useNavigate } from 'react-router-dom'

const ORANGE = '#FF6D29'
const CARD = '#150E08'
const MUTED = '#BABABA'
const D = "'Bricolage Grotesque', system-ui, sans-serif"
const BORDER = 'rgba(255,255,255,0.06)'
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string

interface Opportunity {
  id: string
  type: string
  title: string
  description: string | null
  estimated_impact: string | null
  status: string
  ref_id: string | null
  ref_type: string | null
  ai_draft: string | null
  created_at: string
}

const TYPE_META: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  negative_review:   { label: 'Review negativa',   color: '#f87171', bg: 'rgba(248,113,113,0.1)',  icon: '⭐' },
  unanswered_review: { label: 'Sem resposta',       color: '#FBBF24', bg: 'rgba(251,191,36,0.1)',  icon: '💬' },
  stale_draft:       { label: 'Rascunho parado',    color: '#A78BFA', bg: 'rgba(167,139,250,0.1)', icon: '📝' },
  no_content:        { label: 'Sem conteúdo',       color: MUTED,     bg: 'rgba(255,255,255,0.05)', icon: '📅' },
  low_engagement:    { label: 'Baixo engajamento',  color: '#60a5fa', bg: 'rgba(96,165,250,0.1)',  icon: '📉' },
}

function OppCard({
  opp, session, onResolve, onDismiss,
}: {
  opp: Opportunity
  session: { access_token: string } | null
  onResolve: (id: string) => void
  onDismiss: (id: string) => void
}) {
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(false)
  const [draft, setDraft] = useState(opp.ai_draft ?? '')
  const [loadingDraft, setLoadingDraft] = useState(false)
  const [copied, setCopied] = useState(false)
  const [resolving, setResolving] = useState(false)

  const meta = TYPE_META[opp.type] ?? TYPE_META.no_content

  const fetchDraft = async () => {
    if (draft || !session) return
    setLoadingDraft(true)
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/draft-reply`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ opportunity_id: opp.id }),
      })
      const data = await res.json()
      if (data.draft) setDraft(data.draft)
    } catch { /* ignore */ }
    setLoadingDraft(false)
  }

  const handleExpand = () => {
    if (!expanded && opp.ref_type === 'review') fetchDraft()
    if (!expanded && opp.type === 'low_engagement') fetchDraft()
    setExpanded(e => !e)
  }

  const handleCopy = async () => {
    if (!draft) return
    await navigator.clipboard.writeText(draft)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleResolve = async () => {
    setResolving(true)
    await supabase.from('opportunities').update({
      status: 'resolved',
      resolved_at: new Date().toISOString(),
    }).eq('id', opp.id)

    if (opp.ref_type === 'review' && opp.ref_id && draft) {
      await supabase.from('reviews').update({
        owner_reply: draft,
        responded_at: new Date().toISOString(),
      }).eq('id', opp.ref_id)
    }
    onResolve(opp.id)
    setResolving(false)
  }

  const handleDismiss = async () => {
    await supabase.from('opportunities').update({ status: 'dismissed' }).eq('id', opp.id)
    onDismiss(opp.id)
  }

  const isReviewType = opp.ref_type === 'review'
  const isPostType = opp.ref_type === 'post' || opp.type === 'no_content'

  return (
    <div style={{
      background: CARD, border: `1px solid ${BORDER}`, borderRadius: '14px',
      overflow: 'hidden', transition: 'border-color 0.2s',
    }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,109,41,0.15)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = BORDER)}
    >
      {/* Header */}
      <div style={{ padding: '16px 20px', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
        <div style={{
          width: '38px', height: '38px', borderRadius: '10px', flexShrink: 0,
          background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px',
        }}>
          {meta.icon}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
            <span style={{
              fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '99px',
              background: meta.bg, color: meta.color, textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              {meta.label}
            </span>
          </div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'white', marginBottom: '4px' }}>{opp.title}</div>
          {opp.description && (
            <div style={{ fontSize: '13px', color: MUTED, lineHeight: 1.5, fontStyle: 'italic' }}>{opp.description}</div>
          )}
          {opp.estimated_impact && (
            <div style={{ fontSize: '12px', color: ORANGE, marginTop: '6px' }}>
              💡 {opp.estimated_impact}
            </div>
          )}
        </div>
      </div>

      {/* Expanded draft area */}
      {expanded && (isReviewType || opp.type === 'low_engagement') && (
        <div style={{ padding: '0 20px 16px' }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}`, borderRadius: '10px', padding: '14px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>
              {loadingDraft ? 'Gerando sugestão...' : 'Sugestão gerada por IA'}
            </div>
            {loadingDraft ? (
              <div style={{ display: 'flex', gap: '5px', padding: '8px 0' }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: '6px', height: '6px', borderRadius: '50%', background: ORANGE,
                    animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                  }} />
                ))}
              </div>
            ) : (
              <textarea
                value={draft}
                onChange={e => setDraft(e.target.value)}
                rows={5}
                style={{
                  width: '100%', background: 'transparent', border: 'none', outline: 'none',
                  color: 'white', fontSize: '13px', lineHeight: 1.7, resize: 'vertical',
                  fontFamily: 'inherit', boxSizing: 'border-box',
                }}
              />
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ padding: '12px 20px', borderTop: `1px solid ${BORDER}`, display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {isReviewType && (
          <button
            onClick={handleExpand}
            style={{
              padding: '7px 14px', fontSize: '12px', fontWeight: 600, borderRadius: '8px', cursor: 'pointer',
              background: expanded ? 'rgba(255,109,41,0.1)' : 'rgba(255,255,255,0.04)',
              color: expanded ? ORANGE : MUTED,
              border: `1px solid ${expanded ? 'rgba(255,109,41,0.25)' : BORDER}`,
            }}
          >
            {expanded ? 'Fechar' : '✨ Ver resposta sugerida'}
          </button>
        )}

        {opp.type === 'low_engagement' && (
          <button
            onClick={handleExpand}
            style={{
              padding: '7px 14px', fontSize: '12px', fontWeight: 600, borderRadius: '8px', cursor: 'pointer',
              background: expanded ? 'rgba(255,109,41,0.1)' : 'rgba(255,255,255,0.04)',
              color: expanded ? ORANGE : MUTED,
              border: `1px solid ${expanded ? 'rgba(255,109,41,0.25)' : BORDER}`,
            }}
          >
            {expanded ? 'Fechar' : '✨ Ver sugestões de melhoria'}
          </button>
        )}

        {expanded && draft && !loadingDraft && (
          <button
            onClick={handleCopy}
            style={{
              padding: '7px 14px', fontSize: '12px', fontWeight: 600, borderRadius: '8px', cursor: 'pointer',
              background: copied ? 'rgba(74,222,128,0.1)' : 'rgba(255,255,255,0.04)',
              color: copied ? '#4ade80' : MUTED,
              border: `1px solid ${copied ? 'rgba(74,222,128,0.25)' : BORDER}`,
              transition: 'all 0.2s',
            }}
          >
            {copied ? '✓ Copiado!' : '📋 Copiar'}
          </button>
        )}

        {isPostType && (
          <button
            onClick={() => navigate('/dashboard/posts')}
            style={{
              padding: '7px 14px', fontSize: '12px', fontWeight: 600, borderRadius: '8px', cursor: 'pointer',
              background: 'rgba(255,109,41,0.1)', color: ORANGE, border: '1px solid rgba(255,109,41,0.25)',
            }}
          >
            Ver Posts →
          </button>
        )}

        {opp.type === 'no_content' && (
          <button
            onClick={() => navigate('/dashboard/agente')}
            style={{
              padding: '7px 14px', fontSize: '12px', fontWeight: 600, borderRadius: '8px', cursor: 'pointer',
              background: 'rgba(255,109,41,0.1)', color: ORANGE, border: '1px solid rgba(255,109,41,0.25)',
            }}
          >
            Pedir posts ao Agente →
          </button>
        )}

        <button
          onClick={handleResolve}
          disabled={resolving}
          style={{
            padding: '7px 14px', fontSize: '12px', fontWeight: 700, borderRadius: '8px', cursor: resolving ? 'not-allowed' : 'pointer',
            background: 'rgba(74,222,128,0.1)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.25)',
            opacity: resolving ? 0.6 : 1,
          }}
        >
          {resolving ? 'Resolvendo...' : '✓ Marcar como resolvido'}
        </button>

        <button
          onClick={handleDismiss}
          style={{
            padding: '7px 14px', fontSize: '12px', fontWeight: 600, borderRadius: '8px', cursor: 'pointer',
            background: 'transparent', color: 'rgba(255,255,255,0.2)', border: `1px solid ${BORDER}`,
          }}
        >
          Dispensar
        </button>
      </div>
    </div>
  )
}

export default function OpportunitiesPage() {
  const { session } = useAuth()
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [lastScan, setLastScan] = useState<Date | null>(null)

  useEffect(() => { scan() }, [])

  const scan = async () => {
    if (!session) return
    setScanning(true)
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/detect-opportunities`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (data.opportunities) {
        setOpportunities(data.opportunities)
        setLastScan(new Date())
      }
    } catch { /* ignore */ }
    setLoading(false)
    setScanning(false)
  }

  const handleResolve = (id: string) => setOpportunities(prev => prev.filter(o => o.id !== id))
  const handleDismiss = (id: string) => setOpportunities(prev => prev.filter(o => o.id !== id))

  const resolveAll = async () => {
    if (!opportunities.length) return
    setScanning(true)
    await Promise.all(
      opportunities.map(o =>
        supabase.from('opportunities').update({ status: 'resolved', resolved_at: new Date().toISOString() }).eq('id', o.id)
      )
    )
    setOpportunities([])
    setScanning(false)
  }

  const negativeCount = opportunities.filter(o => o.type === 'negative_review').length
  const unansweredCount = opportunities.filter(o => o.type === 'unanswered_review').length

  return (
    <div>
      {/* Header */}
      <div style={{ padding: '28px 32px 24px', borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
          <div>
            <h1 style={{ fontFamily: D, fontSize: '1.5rem', fontWeight: 800, color: 'white', letterSpacing: '-0.02em', marginBottom: '4px' }}>
              Oportunidades
            </h1>
            <p style={{ color: MUTED, fontSize: '13px' }}>
              {loading ? 'Escaneando...' : opportunities.length === 0
                ? 'Nenhuma oportunidade aberta. Tudo em dia! ✓'
                : `${opportunities.length} oportunidade(s) detectada(s) · ${lastScan ? `Atualizado ${lastScan.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : ''}`}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {opportunities.length > 0 && (
              <button
                onClick={resolveAll}
                disabled={scanning}
                style={{ padding: '9px 18px', background: 'rgba(74,222,128,0.1)', color: '#4ade80', fontWeight: 700, fontSize: '13px', borderRadius: '10px', border: '1px solid rgba(74,222,128,0.25)', cursor: scanning ? 'not-allowed' : 'pointer' }}
              >
                ✓ Resolver tudo
              </button>
            )}
            <button
              onClick={scan}
              disabled={scanning}
              style={{ padding: '9px 18px', background: scanning ? 'rgba(255,109,41,0.3)' : ORANGE, color: '#000', fontWeight: 700, fontSize: '13px', borderRadius: '10px', border: 'none', cursor: scanning ? 'not-allowed' : 'pointer' }}
            >
              {scanning ? 'Escaneando...' : '🔍 Escanear agora'}
            </button>
          </div>
        </div>

        {/* Stats pills */}
        {!loading && opportunities.length > 0 && (
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
            {negativeCount > 0 && (
              <div style={{ padding: '5px 12px', borderRadius: '99px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', fontSize: '12px', color: '#f87171', fontWeight: 600 }}>
                {negativeCount} review{negativeCount > 1 ? 's' : ''} negativa{negativeCount > 1 ? 's' : ''}
              </div>
            )}
            {unansweredCount > 0 && (
              <div style={{ padding: '5px 12px', borderRadius: '99px', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)', fontSize: '12px', color: '#FBBF24', fontWeight: 600 }}>
                {unansweredCount} sem resposta
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ padding: '24px 32px' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ height: '100px', background: CARD, borderRadius: '14px', border: `1px solid ${BORDER}`, opacity: 0.5, animation: 'pulse 1.5s ease-in-out infinite' }} />
            ))}
          </div>
        ) : opportunities.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🎉</div>
            <div style={{ fontFamily: D, fontSize: '1.3rem', fontWeight: 800, color: 'white', marginBottom: '8px' }}>
              Nenhuma oportunidade aberta!
            </div>
            <div style={{ color: MUTED, fontSize: '13px', maxWidth: '360px', margin: '0 auto', lineHeight: 1.7 }}>
              Todas as avaliações foram respondidas, seus posts estão em dia e o engajamento está saudável. Continue assim!
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {opportunities.map(opp => (
              <OppCard
                key={opp.id}
                opp={opp}
                session={session}
                onResolve={handleResolve}
                onDismiss={handleDismiss}
              />
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes bounce { 0%, 100% { transform: translateY(0); opacity: 0.4; } 50% { transform: translateY(-4px); opacity: 1; } }
        @keyframes pulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 0.3; } }
      `}</style>
    </div>
  )
}
