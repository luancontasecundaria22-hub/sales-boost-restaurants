import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { ViralTrendsTab, CampanhasTab } from './MarketingTabs'
import AudienciaTab from './AudienciaTab'
import DiagnosticsPage from './DiagnosticsPage'
import { useLang } from '../../contexts/LanguageContext'
import { d } from '../../i18n-dash'

const ORANGE = '#FF6D29'
const CARD = '#150E08'
const MUTED = '#BABABA'
const D = "'Bricolage Grotesque', system-ui, sans-serif"
const BORDER = 'rgba(255,255,255,0.06)'
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string

const PLAN_LIMITS: Record<string, number> = { free: 5, basic: 15, pro: 35, ultra: 50 }

type PostStatus = 'rascunho' | 'aprovado' | 'publicado'

interface Post {
  id: string
  content: string
  image_suggestion: string | null
  image_url: string | null
  best_time: string | null
  status: PostStatus
  platform: string | null
  created_at: string
  agent_notes: string | null
}

const STATUS_COLORS: Record<PostStatus, { bg: string; color: string; border: string }> = {
  rascunho: { bg: 'rgba(251,191,36,0.1)', color: '#FBBF24', border: 'rgba(251,191,36,0.25)' },
  aprovado: { bg: 'rgba(74,222,128,0.1)', color: '#4ade80', border: 'rgba(74,222,128,0.25)' },
  publicado: { bg: 'rgba(167,139,250,0.1)', color: '#A78BFA', border: 'rgba(167,139,250,0.25)' },
}

function StatusBadge({ status, label }: { status: PostStatus; label: string }) {
  const s = STATUS_COLORS[status]
  return (
    <span style={{ fontSize: '10px', fontWeight: 700, padding: '3px 9px', borderRadius: '99px', background: s.bg, color: s.color, border: `1px solid ${s.border}`, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
      {label}
    </span>
  )
}

function PostCard({ post, onStatusChange, locked, T }: {
  post: Post
  onStatusChange: (id: string, status: PostStatus) => void
  locked: boolean
  T: typeof d['pt']['posts']
}) {
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(post.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleApprove = async () => { setLoading(true); await onStatusChange(post.id, 'aprovado'); setLoading(false) }
  const handlePublish = async () => { setLoading(true); await onStatusChange(post.id, 'publicado'); setLoading(false) }
  const handleReject  = async () => { setLoading(true); await onStatusChange(post.id, 'rascunho');  setLoading(false) }

  const preview = post.content.length > 180 ? post.content.slice(0, 180) + '…' : post.content

  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '14px', overflow: 'hidden', transition: 'border-color 0.2s' }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = locked ? 'rgba(255,255,255,0.1)' : 'rgba(255,109,41,0.2)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = BORDER)}
    >
      {/* Header */}
      <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(255,109,41,0.1)', border: '1px solid rgba(255,109,41,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, fill: 'none', stroke: ORANGE, strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
              <rect x="2" y="2" width="20" height="20" rx="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><path d="M17.5 6.5h.01" />
            </svg>
          </div>
          <span style={{ fontSize: '12px', color: MUTED, textTransform: 'capitalize' }}>{post.platform ?? 'Instagram'}</span>
          {post.best_time && (
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', borderLeft: `1px solid ${BORDER}`, paddingLeft: '10px' }}>
              {post.best_time}
            </span>
          )}
          {locked && (
            <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '99px', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.35)', border: `1px solid ${BORDER}` }}>
              {T.freeBadge}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <StatusBadge status={post.status} label={T.statuses[post.status]} />
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)' }}>
            {new Date(post.created_at).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Image */}
      {post.image_url && (
        <div style={{ position: 'relative', width: '100%', aspectRatio: '1/1', overflow: 'hidden', maxHeight: '360px' }}>
          <img src={post.image_url} alt="Imagem gerada pelo agente de marketing" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: locked ? 'blur(6px)' : 'none', transition: 'filter 0.3s' }} />
          {locked && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(14,11,10,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: '32px', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.5))' }}>🔒</div>
            </div>
          )}
          {!locked && (
            <div style={{ position: 'absolute', bottom: '8px', right: '8px', fontSize: '9px', fontWeight: 700, color: 'rgba(255,255,255,0.7)', background: 'rgba(0,0,0,0.5)', padding: '2px 7px', borderRadius: '99px', letterSpacing: '0.06em', backdropFilter: 'blur(4px)' }}>
              IA · DALL-E 3
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div style={{ padding: '16px 20px' }}>
        <p style={{ fontSize: '14px', color: 'white', lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {expanded ? post.content : preview}
        </p>
        {post.content.length > 180 && (
          <button onClick={() => setExpanded(e => !e)} style={{ marginTop: '6px', fontSize: '12px', color: ORANGE, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            {expanded ? T.seeLess : T.seeMore}
          </button>
        )}

        {post.agent_notes && (
          <div style={{ marginTop: '14px', padding: '12px 14px', background: 'rgba(255,109,41,0.04)', border: '1px solid rgba(255,109,41,0.15)', borderRadius: '10px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(255,109,41,0.15)', border: '1px solid rgba(255,109,41,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '11px' }}>🤖</div>
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: ORANGE, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '4px' }}>{T.agentNote}</div>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, margin: 0 }}>{post.agent_notes}</p>
            </div>
          </div>
        )}

        {post.image_suggestion && !locked && (
          <div style={{ marginTop: '10px', padding: '10px 14px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${BORDER}`, borderRadius: '10px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '4px' }}>{T.imageSuggestion}</div>
            <p style={{ fontSize: '12px', color: MUTED, lineHeight: 1.6, margin: 0 }}>{post.image_suggestion}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      {locked ? (
        <div style={{ padding: '12px 20px', borderTop: `1px solid ${BORDER}` }}>
          <Link to="/dashboard/settings"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px 14px', background: 'rgba(255,109,41,0.08)', border: '1px solid rgba(255,109,41,0.2)', borderRadius: '8px', color: ORANGE, fontWeight: 600, fontSize: '13px', textDecoration: 'none', transition: 'all 0.15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,109,41,0.14)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,109,41,0.08)' }}>
            {T.upgradePost}
          </Link>
        </div>
      ) : (
        post.status !== 'publicado' && (
          <div style={{ padding: '12px 20px', borderTop: `1px solid ${BORDER}`, display: 'flex', gap: '8px' }}>
            {post.status === 'rascunho' && (
              <button onClick={handleApprove} disabled={loading} style={{ padding: '8px 16px', background: 'rgba(74,222,128,0.1)', color: '#4ade80', fontWeight: 700, fontSize: '12px', borderRadius: '8px', border: '1px solid rgba(74,222,128,0.25)', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}>
                {T.approve}
              </button>
            )}
            {post.status === 'aprovado' && (
              <>
                <button onClick={handleCopy} style={{ padding: '8px 16px', background: copied ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.05)', color: copied ? '#4ade80' : MUTED, fontWeight: 600, fontSize: '12px', borderRadius: '8px', border: `1px solid ${copied ? 'rgba(74,222,128,0.3)' : BORDER}`, cursor: 'pointer', transition: 'all 0.2s' }}>
                  {copied ? T.copied : T.copyCaption}
                </button>
                <button onClick={handlePublish} disabled={loading} style={{ padding: '8px 16px', background: ORANGE, color: '#000', fontWeight: 700, fontSize: '12px', borderRadius: '8px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}>
                  {T.markPublished}
                </button>
                <button onClick={handleReject} disabled={loading} style={{ padding: '8px 16px', background: 'transparent', color: MUTED, fontWeight: 600, fontSize: '12px', borderRadius: '8px', border: `1px solid ${BORDER}`, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}>
                  {T.backDraft}
                </button>
              </>
            )}
          </div>
        )
      )}
    </div>
  )
}

function AgentStatusBar({ generating, lastGeneratedAt, onRequestMore, monthlyCount, monthlyLimit, plan, T }: {
  generating: boolean; lastGeneratedAt: string | null; onRequestMore: () => void
  monthlyCount: number; monthlyLimit: number; plan: string; T: typeof d['pt']['posts']
}) {
  const [dot, setDot] = useState(0)
  useEffect(() => {
    if (!generating) return
    const t = setInterval(() => setDot(v => (v + 1) % 4), 400)
    return () => clearInterval(t)
  }, [generating])

  const atLimit = monthlyCount >= monthlyLimit
  const quotaPercent = monthlyLimit > 0 ? Math.min(100, (monthlyCount / monthlyLimit) * 100) : 0
  const quotaColor = quotaPercent >= 100 ? '#f87171' : quotaPercent >= 80 ? '#FBBF24' : '#4ade80'
  const monthName = new Date().toLocaleDateString(undefined, { month: 'long' })

  return (
    <div style={{ padding: '12px 16px', borderRadius: '10px', marginBottom: '24px', background: generating ? 'rgba(255,109,41,0.06)' : 'rgba(255,255,255,0.02)', border: `1px solid ${generating ? 'rgba(255,109,41,0.2)' : BORDER}`, transition: 'all 0.3s' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: generating ? ORANGE : '#4ade80', boxShadow: generating ? `0 0 6px ${ORANGE}` : '0 0 6px #4ade80', animation: generating ? 'pulse 1s infinite' : 'none' }} />
          <span style={{ fontSize: '12px', color: generating ? ORANGE : MUTED, fontWeight: generating ? 600 : 400 }}>
            {generating
              ? `${T.agentCreating}${'.'.repeat(dot)}`
              : lastGeneratedAt
                ? `${T.agentLast} ${new Date(lastGeneratedAt).toLocaleDateString(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}`
                : T.agentActive}
          </span>
        </div>
        {!generating && !atLimit && (
          <button onClick={onRequestMore} style={{ fontSize: '11px', fontWeight: 600, color: MUTED, background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: '6px', padding: '4px 10px', cursor: 'pointer' }}>
            {T.requestMore}
          </button>
        )}
        {!generating && atLimit && plan !== 'ultra' && (
          <Link to="/dashboard/settings" style={{ fontSize: '11px', fontWeight: 600, color: ORANGE, background: 'rgba(255,109,41,0.08)', border: '1px solid rgba(255,109,41,0.2)', borderRadius: '6px', padding: '4px 10px', textDecoration: 'none' }}>
            {T.upgrade}
          </Link>
        )}
      </div>
      <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ flex: 1, height: '3px', borderRadius: '99px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
          <div style={{ width: `${quotaPercent}%`, height: '100%', borderRadius: '99px', background: quotaColor, transition: 'width 0.5s ease' }} />
        </div>
        <span style={{ fontSize: '11px', color: atLimit ? '#f87171' : MUTED, flexShrink: 0, fontWeight: atLimit ? 600 : 400 }}>
          {monthlyCount}/{monthlyLimit} {T.postsIn} {monthName}
        </span>
      </div>
    </div>
  )
}

export default function PostsPage() {
  const { user, session } = useAuth()
  const { lang } = useLang()
  const T = d[lang].posts
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState('')
  const [filterStatus, setFilterStatus] = useState<PostStatus | 'todos'>('todos')
  const [lastGeneratedAt, setLastGeneratedAt] = useState<string | null>(null)
  const [plan, setPlan] = useState('free')
  const [monthlyCount, setMonthlyCount] = useState(0)
  const [monthlyLimit, setMonthlyLimit] = useState(5)
  const autoGenTriggered = useRef(false)
  const [activeTab, setActiveTab] = useState('posts')

  const loadPostsOnly = async () => {
    if (!user) return
    const { data: company } = await supabase.from('companies').select('id, plan').eq('user_id', user.id).maybeSingle()
    if (!company) return

    const startOfMonth = new Date()
    startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0)
    const { count } = await supabase.from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', company.id)
      .gte('created_at', startOfMonth.toISOString())

    const planKey = company.plan ?? 'free'
    const limit = PLAN_LIMITS[planKey] ?? 5
    const monthly = count ?? 0
    setPlan(planKey); setMonthlyCount(monthly); setMonthlyLimit(limit)

    const { data } = await supabase
      .from('posts')
      .select('id, content, image_suggestion, image_url, best_time, status, platform, created_at, agent_notes')
      .eq('company_id', company.id)
      .order('created_at', { ascending: false })
    const fetched = (data ?? []) as Post[]
    setPosts(fetched)
    setLastGeneratedAt(fetched[0]?.created_at ?? null)
    return { posts: fetched, planKey, limit, monthly }
  }

  const triggerGenerate = async (token: string) => {
    setGenerating(true)
    setGenError('')
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-posts`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      console.log('[generate-posts]', JSON.stringify(data, null, 2))
      if (data.quota_reached) {
        setGenError(`Você atingiu o limite de ${data.limit} posts do plano este mês. Aguarde o próximo mês ou faça upgrade.`)
        setGenerating(false)
        return
      }
      if (!res.ok) throw new Error(data.error ?? 'Erro ao gerar posts')
      if (!data.generated) throw new Error(data.message ?? 'Não foi possível gerar posts agora.')
      await loadPostsOnly()
    } catch (e: unknown) {
      const msg = String(e instanceof Error ? e.message : e).toLowerCase()
      if (msg.includes('credit') || msg.includes('balance')) {
        setGenError('Agente de Marketing temporariamente indisponível. Tente novamente em alguns instantes.')
      } else if (msg.includes('rate') || msg.includes('429') || msg.includes('overload')) {
        setGenError('Agente de Marketing muito ocupado agora. Tente novamente em alguns minutos.')
      } else {
        setGenError('Agente de Marketing não conseguiu gerar posts agora. Tente novamente em instantes.')
      }
    }
    setGenerating(false)
  }

  useEffect(() => {
    if (!user || !session) return
    const init = async () => {
      setLoading(true)
      const result = await loadPostsOnly()
      setLoading(false)
      if (!result) return
      const { posts: fetched, limit, monthly } = result
      const hasDrafts = fetched.some(p => p.status === 'rascunho')
      const quotaRemaining = limit - monthly
      if (!hasDrafts && !autoGenTriggered.current && quotaRemaining > 0) {
        autoGenTriggered.current = true
        await triggerGenerate(session.access_token)
      }
    }
    init()
  }, [user, session])

  const handleStatusChange = async (id: string, status: PostStatus) => {
    const { error } = await supabase.from('posts').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
    if (!error) setPosts(prev => prev.map(p => p.id === id ? { ...p, status } : p))
  }

  const filtered = filterStatus === 'todos' ? posts : posts.filter(p => p.status === filterStatus)
  const counts: Record<string, number> = {
    todos: posts.length,
    rascunho: posts.filter(p => p.status === 'rascunho').length,
    aprovado: posts.filter(p => p.status === 'aprovado').length,
    publicado: posts.filter(p => p.status === 'publicado').length,
  }
  const locked = plan === 'free'

  const filterColors: Record<string, string> = { todos: 'white', rascunho: '#FBBF24', aprovado: '#4ade80', publicado: '#A78BFA' }

  return (
    <div>
      <div style={{ padding: '28px 32px 24px', borderBottom: `1px solid ${BORDER}` }}>
        <h1 style={{ fontFamily: D, fontSize: '1.5rem', fontWeight: 800, color: 'white', letterSpacing: '-0.02em', marginBottom: '4px' }}>{T.title}</h1>
        <p style={{ color: MUTED, fontSize: '13px' }}>{T.subtitle}</p>
      </div>

      <div style={{ borderBottom: `1px solid ${BORDER}`, padding: '0 32px' }}>
        <div style={{ display: 'flex' }}>
          {T.tabs.map((label, i) => {
            const id = T.tabIds[i]
            return (
              <button key={id} onClick={() => setActiveTab(id)} style={{ padding: '13px 18px', background: 'transparent', border: 'none', borderBottom: activeTab === id ? `2px solid ${ORANGE}` : '2px solid transparent', color: activeTab === id ? 'white' : MUTED, fontSize: '13.5px', fontWeight: activeTab === id ? 600 : 400, cursor: 'pointer', fontFamily: D, transition: 'all 0.15s', marginBottom: '-1px' }}>{label}</button>
            )
          })}
        </div>
      </div>

      {activeTab === 'posts' && <div style={{ padding: '24px 32px' }}>
        {genError && (
          <div style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', fontSize: '13px', color: '#FBBF24', lineHeight: 1.5, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>⚠️</span><span>{genError}</span>
            {genError.includes('limite') && (
              <Link to="/dashboard/settings" style={{ color: ORANGE, marginLeft: 'auto', fontWeight: 700, textDecoration: 'none', fontSize: '12px', flexShrink: 0 }}>Ver planos →</Link>
            )}
          </div>
        )}

        <AgentStatusBar generating={generating} lastGeneratedAt={lastGeneratedAt} onRequestMore={() => session && triggerGenerate(session.access_token)} monthlyCount={monthlyCount} monthlyLimit={monthlyLimit} plan={plan} T={T} />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
          {(['todos', 'rascunho', 'aprovado', 'publicado'] as const).map(k => (
            <button key={k} onClick={() => setFilterStatus(k as PostStatus | 'todos')}
              style={{ background: filterStatus === k ? 'rgba(255,109,41,0.08)' : CARD, border: `1px solid ${filterStatus === k ? 'rgba(255,109,41,0.3)' : BORDER}`, borderRadius: '12px', padding: '16px 18px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}>
              <div style={{ fontSize: '10px', color: MUTED, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>{T.filterLabels[k]}</div>
              <div style={{ fontFamily: D, fontSize: '2rem', fontWeight: 900, color: filterColors[k], lineHeight: 1 }}>{counts[k]}</div>
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: MUTED }}>{d[lang].common.loading}</div>
        ) : generating && posts.length === 0 ? (
          <div style={{ background: CARD, border: `1px solid rgba(255,109,41,0.15)`, borderRadius: '16px', padding: '60px', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '16px' }}>🤖</div>
            <div style={{ fontFamily: D, fontSize: '1.2rem', fontWeight: 700, color: 'white', marginBottom: '8px' }}>{T.agentCreatingTitle}</div>
            <div style={{ color: MUTED, fontSize: '13px', lineHeight: 1.7, maxWidth: '380px', margin: '0 auto' }}>{T.agentCreatingDesc}</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '60px', textAlign: 'center' }}>
            <div style={{ color: MUTED, fontSize: '13px' }}>{T.noFilter}</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {filtered.map(post => (
              <PostCard key={post.id} post={post} onStatusChange={handleStatusChange} locked={locked} T={T} />
            ))}
          </div>
        )}
      </div>}

      {activeTab === 'audiencia' && <AudienciaTab />}
      {activeTab === 'trends' && <ViralTrendsTab />}
      {activeTab === 'campanhas' && <CampanhasTab />}
      {activeTab === 'diagnostico' && <DiagnosticsPage />}
    </div>
  )
}
