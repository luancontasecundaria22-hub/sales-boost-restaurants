import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

const ORANGE = '#FF6D29'
const CARD = '#150E08'
const MUTED = '#BABABA'
const D = "'Bricolage Grotesque', system-ui, sans-serif"
const BORDER = 'rgba(255,255,255,0.06)'
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string

type PostStatus = 'rascunho' | 'aprovado' | 'publicado'

interface Post {
  id: string
  content: string
  image_suggestion: string | null
  best_time: string | null
  status: PostStatus
  platform: string | null
  created_at: string
}

const STATUS_LABELS: Record<PostStatus, string> = {
  rascunho: 'Rascunho',
  aprovado: 'Aprovado',
  publicado: 'Publicado',
}

const STATUS_COLORS: Record<PostStatus, { bg: string; color: string; border: string }> = {
  rascunho: { bg: 'rgba(251,191,36,0.1)', color: '#FBBF24', border: 'rgba(251,191,36,0.25)' },
  aprovado: { bg: 'rgba(74,222,128,0.1)', color: '#4ade80', border: 'rgba(74,222,128,0.25)' },
  publicado: { bg: 'rgba(167,139,250,0.1)', color: '#A78BFA', border: 'rgba(167,139,250,0.25)' },
}

function StatusBadge({ status }: { status: PostStatus }) {
  const s = STATUS_COLORS[status]
  return (
    <span style={{ fontSize: '10px', fontWeight: 700, padding: '3px 9px', borderRadius: '99px', background: s.bg, color: s.color, border: `1px solid ${s.border}`, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
      {STATUS_LABELS[status]}
    </span>
  )
}

function PostCard({ post, onStatusChange }: { post: Post; onStatusChange: (id: string, status: PostStatus) => void }) {
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(post.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleApprove = async () => {
    setLoading(true)
    await onStatusChange(post.id, 'aprovado')
    setLoading(false)
  }

  const handlePublish = async () => {
    setLoading(true)
    await onStatusChange(post.id, 'publicado')
    setLoading(false)
  }

  const handleReject = async () => {
    setLoading(true)
    await onStatusChange(post.id, 'rascunho')
    setLoading(false)
  }

  const preview = post.content.length > 180 ? post.content.slice(0, 180) + '…' : post.content

  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '14px', overflow: 'hidden', transition: 'border-color 0.2s' }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,109,41,0.2)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = BORDER)}
    >
      {/* Header */}
      <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(255,109,41,0.1)', border: '1px solid rgba(255,109,41,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, fill: 'none', stroke: ORANGE, strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
              <rect x="2" y="2" width="20" height="20" rx="5" />
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
              <path d="M17.5 6.5h.01" />
            </svg>
          </div>
          <span style={{ fontSize: '12px', color: MUTED, textTransform: 'capitalize' }}>{post.platform ?? 'Instagram'}</span>
          {post.best_time && (
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', borderLeft: `1px solid ${BORDER}`, paddingLeft: '10px' }}>
              {post.best_time}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <StatusBadge status={post.status} />
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)' }}>
            {new Date(post.created_at).toLocaleDateString('pt-BR')}
          </span>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '16px 20px' }}>
        <p style={{ fontSize: '14px', color: 'white', lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {expanded ? post.content : preview}
        </p>
        {post.content.length > 180 && (
          <button onClick={() => setExpanded(e => !e)} style={{ marginTop: '6px', fontSize: '12px', color: ORANGE, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            {expanded ? 'Ver menos' : 'Ver mais'}
          </button>
        )}

        {post.image_suggestion && (
          <div style={{ marginTop: '14px', padding: '12px 14px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${BORDER}`, borderRadius: '10px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px' }}>Sugestão de imagem</div>
            <p style={{ fontSize: '13px', color: MUTED, lineHeight: 1.6 }}>{post.image_suggestion}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      {post.status !== 'publicado' && (
        <div style={{ padding: '12px 20px', borderTop: `1px solid ${BORDER}`, display: 'flex', gap: '8px' }}>
          {post.status === 'rascunho' && (
            <button
              onClick={handleApprove}
              disabled={loading}
              style={{ padding: '8px 16px', background: 'rgba(74,222,128,0.1)', color: '#4ade80', fontWeight: 700, fontSize: '12px', borderRadius: '8px', border: '1px solid rgba(74,222,128,0.25)', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}
            >
              ✓ Aprovar
            </button>
          )}
          {post.status === 'aprovado' && (
            <>
              <button
                onClick={handleCopy}
                style={{ padding: '8px 16px', background: copied ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.05)', color: copied ? '#4ade80' : MUTED, fontWeight: 600, fontSize: '12px', borderRadius: '8px', border: `1px solid ${copied ? 'rgba(74,222,128,0.3)' : BORDER}`, cursor: 'pointer', transition: 'all 0.2s' }}
              >
                {copied ? '✓ Copiado!' : '📋 Copiar legenda'}
              </button>
              <button
                onClick={handlePublish}
                disabled={loading}
                style={{ padding: '8px 16px', background: ORANGE, color: '#000', fontWeight: 700, fontSize: '12px', borderRadius: '8px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}
              >
                ✓ Marcar como publicado
              </button>
              <button
                onClick={handleReject}
                disabled={loading}
                style={{ padding: '8px 16px', background: 'transparent', color: MUTED, fontWeight: 600, fontSize: '12px', borderRadius: '8px', border: `1px solid ${BORDER}`, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}
              >
                Voltar p/ rascunho
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default function PostsPage() {
  const { user, session } = useAuth()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState('')
  const [filterStatus, setFilterStatus] = useState<PostStatus | 'todos'>('todos')

  const loadPosts = async () => {
    if (!user) return
    setLoading(true)
    const { data: company } = await supabase
      .from('companies')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (company) {
      const { data } = await supabase
        .from('posts')
        .select('id, content, image_suggestion, best_time, status, platform, created_at')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false })
      setPosts((data ?? []) as Post[])
    }
    setLoading(false)
  }

  useEffect(() => { loadPosts() }, [user])

  const handleGenerate = async () => {
    if (!session) return
    setGenerating(true)
    setGenError('')
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-posts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao gerar posts')
      await loadPosts()
    } catch (e: unknown) {
      setGenError(e instanceof Error ? e.message : String(e))
    }
    setGenerating(false)
  }

  const handleStatusChange = async (id: string, status: PostStatus) => {
    const { error } = await supabase
      .from('posts')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (!error) {
      setPosts(prev => prev.map(p => p.id === id ? { ...p, status } : p))
    }
  }

  const filtered = filterStatus === 'todos' ? posts : posts.filter(p => p.status === filterStatus)

  const counts: Record<string, number> = {
    todos: posts.length,
    rascunho: posts.filter(p => p.status === 'rascunho').length,
    aprovado: posts.filter(p => p.status === 'aprovado').length,
    publicado: posts.filter(p => p.status === 'publicado').length,
  }

  return (
    <div>
      <div style={{ padding: '28px 32px 24px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
        <div>
          <h1 style={{ fontFamily: D, fontSize: '1.5rem', fontWeight: 800, color: 'white', letterSpacing: '-0.02em', marginBottom: '4px' }}>Posts</h1>
          <p style={{ color: MUTED, fontSize: '13px' }}>
            Conteúdo semanal gerado pela IA com base no perfil do seu negócio
          </p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          style={{ padding: '10px 20px', background: generating ? 'rgba(255,109,41,0.4)' : ORANGE, color: '#000', fontWeight: 700, fontSize: '13px', borderRadius: '10px', border: 'none', cursor: generating ? 'not-allowed' : 'pointer', flexShrink: 0, transition: 'background 0.2s' }}
        >
          {generating ? 'Gerando...' : '✨ Gerar posts agora'}
        </button>
      </div>

      <div style={{ padding: '24px 32px' }}>
        {genError && (
          <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', fontSize: '13px', color: '#f87171', lineHeight: 1.5 }}>
            {genError}
          </div>
        )}

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
          {([['todos', 'Total', 'white'], ['rascunho', 'Rascunhos', '#FBBF24'], ['aprovado', 'Aprovados', '#4ade80'], ['publicado', 'Publicados', '#A78BFA']] as const).map(([k, label, color]) => (
            <button
              key={k}
              onClick={() => setFilterStatus(k as PostStatus | 'todos')}
              style={{ background: filterStatus === k ? 'rgba(255,109,41,0.08)' : CARD, border: `1px solid ${filterStatus === k ? 'rgba(255,109,41,0.3)' : BORDER}`, borderRadius: '12px', padding: '16px 18px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}
            >
              <div style={{ fontSize: '10px', color: MUTED, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>{label}</div>
              <div style={{ fontFamily: D, fontSize: '2rem', fontWeight: 900, color, lineHeight: 1 }}>{counts[k]}</div>
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: MUTED }}>Carregando posts...</div>
        ) : filtered.length === 0 ? (
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '60px', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>✨</div>
            <div style={{ fontFamily: D, fontSize: '1.2rem', fontWeight: 700, color: 'white', marginBottom: '8px' }}>
              {posts.length === 0 ? 'Nenhum post ainda' : 'Nenhum post com este filtro'}
            </div>
            <div style={{ color: MUTED, fontSize: '13px', lineHeight: 1.7, maxWidth: '380px', margin: '0 auto 24px' }}>
              {posts.length === 0
                ? 'Clique em "Gerar posts agora" para criar seu primeiro lote de conteúdo com IA, baseado no perfil do seu negócio.'
                : 'Troque o filtro acima para ver posts em outros status.'}
            </div>
            {posts.length === 0 && (
              <button
                onClick={handleGenerate}
                disabled={generating}
                style={{ padding: '11px 24px', background: ORANGE, color: '#000', fontWeight: 700, fontSize: '14px', borderRadius: '10px', border: 'none', cursor: generating ? 'not-allowed' : 'pointer' }}
              >
                {generating ? 'Gerando...' : '✨ Gerar meus primeiros posts →'}
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {filtered.map(post => (
              <PostCard key={post.id} post={post} onStatusChange={handleStatusChange} />
            ))}
          </div>
        )}

        <div style={{ marginTop: '32px', padding: '18px 20px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${BORDER}`, borderRadius: '12px' }}>
          <div style={{ fontSize: '12px', color: MUTED, lineHeight: 1.7 }}>
            <strong style={{ color: 'white' }}>Como funciona:</strong> A IA gera 4 posts por semana com base no perfil do seu negócio. Revise o conteúdo, aprove os que gostar, e marque como publicado quando postar. Novos posts são gerados automaticamente toda segunda-feira às 8h.
          </div>
        </div>
      </div>
    </div>
  )
}
