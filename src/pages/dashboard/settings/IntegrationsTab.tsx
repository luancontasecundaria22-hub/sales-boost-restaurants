import { useEffect, useState } from 'react'
import { useAuth } from '../../../contexts/AuthContext'
import { supabase } from '../../../lib/supabase'
import { useNavigate, useSearchParams } from 'react-router-dom'

function buildGbpAuthUrl(companyId: string): string {
  const params = new URLSearchParams({
    client_id: import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID as string,
    redirect_uri: `${window.location.origin}/auth/gbp/callback`,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/business.manage',
    access_type: 'offline',
    prompt: 'consent',
    state: companyId,
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

const ORANGE = '#FF6D29'
const CARD = '#150E08'
const MUTED = '#BABABA'
const D = "'Bricolage Grotesque', system-ui, sans-serif"
const BORDER = 'rgba(255,255,255,0.06)'

interface GscMetrics {
  summary: { clicks: number; impressions: number; ctr: number; position: number }
  top_queries: Array<{ query: string; clicks: number; impressions: number; position: number }>
  top_pages: Array<{ page: string; clicks: number; impressions: number }>
  period: { start: string; end: string }
}

interface Integration {
  id: string
  type: string
  domain: string | null
  connected_at: string | null
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const GSC_CLIENT_ID = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID as string

function buildGscAuthUrl(companyId: string): string {
  const params = new URLSearchParams({
    client_id: GSC_CLIENT_ID,
    redirect_uri: `${window.location.origin}/auth/gsc/callback`,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/webmasters.readonly',
    access_type: 'offline',
    prompt: 'consent',
    state: companyId,
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

interface IgData {
  username?: string
  followers?: number
  posts_count?: number
  avg_likes?: number
  avg_comments?: number
  engagement_rate?: number
  synced_at?: string
}

export default function IntegrationsTab() {
  const { user, session } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [instagramUrl, setInstagramUrl] = useState<string | null>(null)
  const [igData, setIgData] = useState<IgData | null>(null)
  const [socialScrapedAt, setSocialScrapedAt] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState('')
  const [syncSuccess, setSyncSuccess] = useState(false)
  const [integration, setIntegration] = useState<Integration | null>(null)
  const [gbpIntegration, setGbpIntegration] = useState<Integration | null>(null)
  const [metrics, setMetrics] = useState<GscMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [metricsLoading, setMetricsLoading] = useState(false)
  const [metricsError, setMetricsError] = useState('')
  // Instagram auto-post state
  const [igConnected, setIgConnected] = useState(false)
  const [igAutoPost, setIgAutoPost] = useState(false)
  const [igFrequency, setIgFrequency] = useState('daily')
  const [igTogglingAuto, setIgTogglingAuto] = useState(false)
  const igOauthError = searchParams.get('error')
  const igOauthSuccess = searchParams.get('instagram') === 'connected'

  useEffect(() => {
    if (!user) return
    loadIntegration()
  }, [user])

  const loadIntegration = async () => {
    setLoading(true)
    const { data: company } = await supabase
      .from('companies')
      .select('id, instagram_url, social_data, social_scraped_at, instagram_user_id, instagram_auto_post, instagram_post_frequency')
      .eq('user_id', user!.id)
      .single()

    if (!company) { setLoading(false); return }
    setCompanyId(company.id)
    setInstagramUrl(company.instagram_url ?? null)
    setSocialScrapedAt(company.social_scraped_at ?? null)
    if (company.social_data?.instagram) {
      setIgData(company.social_data.instagram as IgData)
    }
    setIgConnected(!!company.instagram_user_id)
    setIgAutoPost(company.instagram_auto_post ?? false)
    setIgFrequency(company.instagram_post_frequency ?? 'daily')

    const { data: integ } = await supabase
      .from('company_integrations')
      .select('id, type, domain, connected_at')
      .eq('company_id', company.id)
      .eq('type', 'google_search_console')
      .maybeSingle()

    const { data: gbpInteg } = await supabase
      .from('company_integrations')
      .select('id, type, domain, connected_at')
      .eq('company_id', company.id)
      .eq('type', 'google_business_profile')
      .maybeSingle()

    setIntegration(integ ?? null)
    setGbpIntegration(gbpInteg ?? null)
    setLoading(false)
  }

  const handleApifySync = async () => {
    if (!session) return
    setSyncing(true)
    setSyncError('')
    setSyncSuccess(false)
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/apify-sync`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro na sincronização')
      setSyncSuccess(true)
      await loadIntegration()
    } catch (e: unknown) {
      setSyncError(e instanceof Error ? e.message : String(e))
    }
    setSyncing(false)
  }

  const loadGscMetrics = async () => {
    if (!companyId || !session) return
    setMetricsLoading(true)
    setMetricsError('')

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/gsc-metrics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ company_id: companyId }),
      })
      const data = await res.json() as GscMetrics & { error?: string }
      if (!res.ok || data.error) {
        setMetricsError(data.error ?? 'Erro ao carregar métricas')
      } else {
        setMetrics(data)
      }
    } catch {
      setMetricsError('Erro inesperado ao buscar métricas')
    }
    setMetricsLoading(false)
  }

  const toggleAutoPost = async (enabled: boolean) => {
    if (!companyId) return
    setIgTogglingAuto(true)
    await supabase.from('companies').update({ instagram_auto_post: enabled }).eq('id', companyId)
    setIgAutoPost(enabled)
    setIgTogglingAuto(false)
  }

  const updateFrequency = async (freq: string) => {
    if (!companyId) return
    setIgFrequency(freq)
    await supabase.from('companies').update({ instagram_post_frequency: freq }).eq('id', companyId)
  }

  const handleDisconnectGsc = async () => {
    if (!integration) return
    await supabase.from('company_integrations').delete().eq('id', integration.id)
    setIntegration(null)
    setMetrics(null)
  }

  const handleDisconnectGbp = async () => {
    if (!gbpIntegration) return
    await supabase.from('company_integrations').delete().eq('id', gbpIntegration.id)
    setGbpIntegration(null)
  }

  const handleDisconnectIgOauth = async () => {
    if (!companyId) return
    await supabase.from('companies').update({ instagram_user_id: null, instagram_auto_post: false }).eq('id', companyId)
    setIgConnected(false)
    setIgAutoPost(false)
  }

  if (loading) {
    return <div style={{ color: MUTED, fontSize: '14px' }}>Carregando...</div>
  }

  return (
    <div>
      {/* Google Search Console Card */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '14px', overflow: 'hidden', marginBottom: '20px' }}>
        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
              🔍
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'white' }}>Google Search Console</div>
              <div style={{ fontSize: '12px', color: MUTED }}>
                {integration ? (
                  <span style={{ color: '#4ade80' }}>✓ Conectado{integration.domain ? ` · ${integration.domain}` : ''}</span>
                ) : 'Não conectado'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {integration && (
              <button onClick={loadGscMetrics} disabled={metricsLoading}
                style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.06)', color: MUTED, fontWeight: 600, fontSize: '12px', borderRadius: '8px', border: `1px solid ${BORDER}`, cursor: metricsLoading ? 'not-allowed' : 'pointer' }}>
                {metricsLoading ? 'Carregando...' : 'Atualizar dados'}
              </button>
            )}
            {companyId && GSC_CLIENT_ID && (
              <>
                <a href={buildGscAuthUrl(companyId)}
                  style={{ padding: '8px 16px', background: integration ? 'rgba(255,255,255,0.04)' : ORANGE, color: integration ? MUTED : '#000', fontWeight: 700, fontSize: '12px', borderRadius: '8px', border: integration ? `1px solid ${BORDER}` : 'none', textDecoration: 'none', cursor: 'pointer', display: 'inline-block' }}>
                  {integration ? 'Reconectar' : 'Conectar →'}
                </a>
                {integration && (
                  <button onClick={handleDisconnectGsc}
                    style={{ padding: '8px 14px', background: 'transparent', color: '#f87171', fontWeight: 600, fontSize: '12px', borderRadius: '8px', border: '1px solid rgba(248,113,113,0.3)', cursor: 'pointer' }}>
                    Desconectar
                  </button>
                )}
              </>
            )}
            {!GSC_CLIENT_ID && (
              <div style={{ fontSize: '12px', color: MUTED, fontStyle: 'italic', padding: '8px' }}>
                Configure VITE_GOOGLE_OAUTH_CLIENT_ID
              </div>
            )}
          </div>
        </div>

        {/* GSC metrics */}
        {metricsError && (
          <div style={{ padding: '16px 24px', background: 'rgba(239,68,68,0.08)', borderTop: `1px solid rgba(239,68,68,0.2)` }}>
            <div style={{ fontSize: '13px', color: '#f87171' }}>{metricsError}</div>
          </div>
        )}

        {metrics && (
          <div style={{ padding: '24px' }}>
            <div style={{ fontSize: '11px', color: MUTED, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '16px' }}>
              Últimos 28 dias ({metrics.period.start} → {metrics.period.end})
            </div>

            {/* Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
              {[
                { label: 'Cliques', value: metrics.summary.clicks.toLocaleString('pt-BR'), color: ORANGE },
                { label: 'Impressões', value: metrics.summary.impressions.toLocaleString('pt-BR'), color: '#A78BFA' },
                { label: 'CTR', value: `${metrics.summary.ctr}%`, color: '#4ade80' },
                { label: 'Posição média', value: String(metrics.summary.position), color: '#FBBF24' },
              ].map(s => (
                <div key={s.label} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}`, borderRadius: '10px', padding: '16px' }}>
                  <div style={{ fontSize: '10px', color: MUTED, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>{s.label}</div>
                  <div style={{ fontFamily: D, fontSize: '1.8rem', fontWeight: 800, color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              {/* Top queries */}
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'white', marginBottom: '12px' }}>Top queries</div>
                {metrics.top_queries.map((q, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${BORDER}`, gap: '12px' }}>
                    <div style={{ fontSize: '12px', color: MUTED, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.query}</div>
                    <div style={{ display: 'flex', gap: '12px', flexShrink: 0 }}>
                      <span style={{ fontSize: '12px', color: ORANGE }}>{q.clicks} cliques</span>
                      <span style={{ fontSize: '12px', color: MUTED }}>P{q.position}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Top pages */}
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'white', marginBottom: '12px' }}>Top páginas</div>
                {metrics.top_pages.map((p, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${BORDER}`, gap: '12px' }}>
                    <div style={{ fontSize: '12px', color: MUTED, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.page}>
                      {p.page.replace(/^https?:\/\/[^/]+/, '') || '/'}
                    </div>
                    <span style={{ fontSize: '12px', color: ORANGE, flexShrink: 0 }}>{p.clicks} cliques</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {!integration && (
          <div style={{ padding: '20px 24px' }}>
            <div style={{ fontSize: '13px', color: MUTED, lineHeight: 1.6 }}>
              Conecte o Google Search Console para ver quais palavras-chave trazem visitantes para o seu site, quais páginas têm mais tráfego orgânico e oportunidades de SEO.
            </div>
          </div>
        )}
      </div>

      {/* Instagram / Apify card */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '14px', overflow: 'hidden', marginBottom: '20px' }}>
        <div style={{ padding: '20px 24px', borderBottom: igData ? `1px solid ${BORDER}` : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
              📸
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'white' }}>Instagram</div>
              <div style={{ fontSize: '12px', color: igData ? '#4ade80' : MUTED }}>
                {igData
                  ? `✓ @${igData.username ?? ''} · sincronizado ${socialScrapedAt ? new Date(socialScrapedAt).toLocaleDateString('pt-BR') : ''}`
                  : instagramUrl ? 'Pronto para sincronizar' : 'Adicione seu Instagram em Sobre o negócio'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {!instagramUrl ? (
              <button
                onClick={() => navigate('/dashboard/settings?section=presenca')}
                style={{ padding: '8px 16px', background: ORANGE, color: '#000', fontWeight: 700, fontSize: '12px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
              >
                Configurar →
              </button>
            ) : (
              <button
                onClick={handleApifySync}
                disabled={syncing}
                style={{ padding: '8px 16px', background: syncing ? 'rgba(255,109,41,0.3)' : ORANGE, color: '#000', fontWeight: 700, fontSize: '12px', borderRadius: '8px', border: 'none', cursor: syncing ? 'not-allowed' : 'pointer' }}
              >
                {syncing ? 'Sincronizando...' : igData ? 'Atualizar dados' : 'Sincronizar agora →'}
              </button>
            )}
          </div>
        </div>

        {syncError && (
          <div style={{ padding: '12px 24px', background: 'rgba(239,68,68,0.08)', fontSize: '12px', color: '#f87171' }}>
            {syncError}
          </div>
        )}

        {syncSuccess && !syncError && (
          <div style={{ padding: '12px 24px', background: 'rgba(74,222,128,0.06)', fontSize: '12px', color: '#4ade80' }}>
            ✓ Dados sincronizados! O agente já usa essas informações.
          </div>
        )}

        {igData && (
          <div style={{ padding: '20px 24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
              {[
                { label: 'Seguidores', value: igData.followers?.toLocaleString('pt-BR') ?? '—', color: ORANGE },
                { label: 'Posts', value: igData.posts_count?.toLocaleString('pt-BR') ?? '—', color: '#A78BFA' },
                { label: 'Média curtidas', value: igData.avg_likes?.toLocaleString('pt-BR') ?? '—', color: '#4ade80' },
                { label: 'Engajamento', value: igData.engagement_rate ? `${igData.engagement_rate}%` : '—', color: '#FBBF24' },
              ].map(s => (
                <div key={s.label} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}`, borderRadius: '10px', padding: '14px 16px' }}>
                  <div style={{ fontSize: '10px', color: MUTED, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px' }}>{s.label}</div>
                  <div style={{ fontFamily: D, fontSize: '1.5rem', fontWeight: 800, color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '12px', fontSize: '12px', color: MUTED }}>
              Esses dados são usados pelo Agente para criar conteúdo mais relevante e personalizado.
            </div>
          </div>
        )}

        {!instagramUrl && (
          <div style={{ padding: '16px 24px' }}>
            <div style={{ fontSize: '13px', color: MUTED, lineHeight: 1.6 }}>
              Adicione a URL do seu Instagram em "Sobre o negócio" para sincronizar seguidores, engajamento e posts recentes. O Agente usará esses dados para criar conteúdo personalizado.
            </div>
          </div>
        )}
      </div>

      {/* Instagram Auto-post (agente 24/7) */}
      <div style={{ background: CARD, border: `1px solid ${igConnected ? 'rgba(255,109,41,0.25)' : BORDER}`, borderRadius: '14px', overflow: 'hidden', marginBottom: '20px' }}>
        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: igConnected ? 'rgba(255,109,41,0.12)' : 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🤖</div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'white' }}>Instagram Auto-post <span style={{ fontSize: '10px', background: 'rgba(255,109,41,0.15)', color: ORANGE, padding: '2px 8px', borderRadius: 99, marginLeft: 6, verticalAlign: 'middle' }}>NOVO</span></div>
              <div style={{ fontSize: '12px', color: igConnected ? '#4ade80' : MUTED }}>
                {igConnected
                  ? igAutoPost ? '● Agente publicando automaticamente' : '○ Conectado · auto-post pausado'
                  : 'Conecte para o Agente de Marketing publicar sozinho 24/7'}
              </div>
            </div>
          </div>
          {companyId && !igConnected && (
            <a
              href={`${SUPABASE_URL}/functions/v1/instagram-oauth-start?company_id=${companyId}`}
              style={{ padding: '8px 18px', background: ORANGE, color: '#000', fontWeight: 700, fontSize: '12px', borderRadius: '8px', border: 'none', textDecoration: 'none', display: 'inline-block', cursor: 'pointer' }}>
              Conectar Instagram →
            </a>
          )}
          {igConnected && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: '12px', color: igAutoPost ? ORANGE : MUTED }}>{igAutoPost ? 'Ativo' : 'Pausado'}</span>
              <div onClick={() => !igTogglingAuto && toggleAutoPost(!igAutoPost)}
                style={{ width: 42, height: 22, borderRadius: 99, cursor: igTogglingAuto ? 'wait' : 'pointer', background: igAutoPost ? ORANGE : 'rgba(255,255,255,0.1)', position: 'relative', transition: 'all 0.2s' }}>
                <div style={{ position: 'absolute', top: 3, left: igAutoPost ? 21 : 3, width: 16, height: 16, borderRadius: '50%', background: igAutoPost ? '#000' : 'rgba(255,255,255,0.4)', transition: 'left 0.2s' }} />
              </div>
            </div>
          )}
        </div>

        {!igConnected && (
          <div style={{ padding: '14px 24px', background: 'rgba(251,191,36,0.06)', borderBottom: `1px solid ${BORDER}` }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#FBBF24', marginBottom: '8px' }}>⚠️ Antes de conectar, confira 2 coisas (exigência da Meta):</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', gap: '8px', fontSize: '12.5px', color: 'white', lineHeight: 1.5 }}>
                <span style={{ color: '#FBBF24', flexShrink: 0 }}>1.</span>
                <span>Seu Instagram precisa ser <strong>Profissional (Business)</strong> — não pode ser conta pessoal.</span>
              </div>
              <div style={{ display: 'flex', gap: '8px', fontSize: '12.5px', color: 'white', lineHeight: 1.5 }}>
                <span style={{ color: '#FBBF24', flexShrink: 0 }}>2.</span>
                <span>Ele precisa estar <strong>ligado a uma Página do Facebook</strong> (pelo app do Instagram ou pela Meta Business Suite).</span>
              </div>
            </div>
            <div style={{ fontSize: '11px', color: MUTED, marginTop: '9px', lineHeight: 1.5 }}>
              Sem os dois, a Meta bloqueia a conexão. É rápido de ajustar nas configurações do seu Instagram.
            </div>
          </div>
        )}

        {(igOauthSuccess || igOauthError) && (
          <div style={{ padding: '12px 24px', background: igOauthSuccess ? 'rgba(74,222,128,0.06)' : 'rgba(239,68,68,0.08)', fontSize: '12px', color: igOauthSuccess ? '#4ade80' : '#f87171' }}>
            {igOauthSuccess ? '✓ Instagram conectado! O agente já pode publicar automaticamente.' : `Erro: ${igOauthError}`}
          </div>
        )}

        {igConnected && (
          <div style={{ padding: '20px 24px' }}>
            <div style={{ fontSize: '12px', color: MUTED, marginBottom: 12 }}>Frequência de publicação</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[['daily', 'Diário'], ['3x_week', '3x por semana'], ['weekly', 'Semanal']].map(([val, label]) => (
                <button key={val} onClick={() => updateFrequency(val)}
                  style={{ padding: '7px 14px', borderRadius: 8, border: `1px solid ${igFrequency === val ? ORANGE : BORDER}`, background: igFrequency === val ? 'rgba(255,109,41,0.1)' : 'transparent', color: igFrequency === val ? ORANGE : MUTED, fontSize: '12px', fontWeight: igFrequency === val ? 700 : 400, cursor: 'pointer' }}>
                  {label}
                </button>
              ))}
            </div>
            <div style={{ marginTop: 14, fontSize: '12px', color: MUTED, lineHeight: 1.6 }}>
              O Agente de Marketing vai criar conteúdo com IA, gerar uma imagem e publicar direto no Instagram, todos os dias às 10h. Você pode pausar a qualquer momento.
            </div>
            {companyId && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 12 }}>
                <a href={`${SUPABASE_URL}/functions/v1/instagram-oauth-start?company_id=${companyId}`}
                  style={{ fontSize: '11px', color: 'rgba(255,109,41,0.5)', textDecoration: 'none' }}>
                  Reconectar Instagram
                </a>
                <button onClick={handleDisconnectIgOauth}
                  style={{ background: 'transparent', border: 'none', padding: 0, fontSize: '11px', color: 'rgba(248,113,113,0.5)', cursor: 'pointer' }}>
                  Desconectar
                </button>
              </div>
            )}
          </div>
        )}

        {!igConnected && (
          <div style={{ padding: '16px 24px' }}>
            <div style={{ fontSize: '13px', color: MUTED, lineHeight: 1.7 }}>
              O Agente de Marketing vai criar posts com IA, gerar imagem e publicar direto no seu Instagram todos os dias — sem você precisar fazer nada.
            </div>
          </div>
        )}
      </div>

      {/* Google Business Profile card */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '14px', overflow: 'hidden', marginBottom: '20px' }}>
        <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>⭐</div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'white' }}>Google Business Profile</div>
              <div style={{ fontSize: '12px', color: gbpIntegration ? '#4ade80' : MUTED }}>
                {gbpIntegration
                  ? `✓ Conectado${gbpIntegration.domain ? ` · ${gbpIntegration.domain}` : ''}`
                  : 'Responda avaliações do Google direto pelo painel'}
              </div>
            </div>
          </div>
          {companyId && (import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID as string) && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <a
                href={buildGbpAuthUrl(companyId)}
                style={{ padding: '8px 16px', background: gbpIntegration ? 'rgba(255,255,255,0.04)' : ORANGE, color: gbpIntegration ? MUTED : '#000', fontWeight: 700, fontSize: '12px', borderRadius: '8px', border: gbpIntegration ? `1px solid ${BORDER}` : 'none', textDecoration: 'none', display: 'inline-block', cursor: 'pointer' }}
              >
                {gbpIntegration ? 'Reconectar' : 'Conectar →'}
              </a>
              {gbpIntegration && (
                <button onClick={handleDisconnectGbp}
                  style={{ padding: '8px 14px', background: 'transparent', color: '#f87171', fontWeight: 600, fontSize: '12px', borderRadius: '8px', border: '1px solid rgba(248,113,113,0.3)', cursor: 'pointer' }}>
                  Desconectar
                </button>
              )}
            </div>
          )}
        </div>
        {!gbpIntegration && (
          <div style={{ padding: '0 24px 20px' }}>
            <div style={{ fontSize: '13px', color: MUTED, lineHeight: 1.6 }}>
              Conecte seu Google Business Profile para responder avaliações diretamente pelo Sales Boost. As respostas aparecem publicamente no Google Maps.
            </div>
          </div>
        )}
        {gbpIntegration && (
          <div style={{ padding: '12px 24px', background: 'rgba(74,222,128,0.04)', borderTop: `1px solid ${BORDER}` }}>
            <div style={{ fontSize: '12px', color: MUTED }}>
              ✓ Botão "Responder no Google" ativo em <strong style={{ color: 'white' }}>Avaliações</strong>. Conectado em {new Date(gbpIntegration.connected_at!).toLocaleDateString('pt-BR')}.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
