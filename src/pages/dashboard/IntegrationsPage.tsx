import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { useNavigate } from 'react-router-dom'

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

export default function IntegrationsPage() {
  const { user, session } = useAuth()
  const navigate = useNavigate()
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [instagramUrl, setInstagramUrl] = useState<string | null>(null)
  const [igData, setIgData] = useState<IgData | null>(null)
  const [socialScrapedAt, setSocialScrapedAt] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState('')
  const [syncSuccess, setSyncSuccess] = useState(false)
  const [integration, setIntegration] = useState<Integration | null>(null)
  const [metrics, setMetrics] = useState<GscMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [metricsLoading, setMetricsLoading] = useState(false)
  const [metricsError, setMetricsError] = useState('')

  useEffect(() => {
    if (!user) return
    loadIntegration()
  }, [user])

  const loadIntegration = async () => {
    setLoading(true)
    const { data: company } = await supabase
      .from('companies')
      .select('id, instagram_url, social_data, social_scraped_at')
      .eq('user_id', user!.id)
      .single()

    if (!company) { setLoading(false); return }
    setCompanyId(company.id)
    setInstagramUrl(company.instagram_url ?? null)
    setSocialScrapedAt(company.social_scraped_at ?? null)
    if (company.social_data?.instagram) {
      setIgData(company.social_data.instagram as IgData)
    }

    const { data: integ } = await supabase
      .from('company_integrations')
      .select('id, type, domain, connected_at')
      .eq('company_id', company.id)
      .eq('type', 'google_search_console')
      .maybeSingle()

    setIntegration(integ ?? null)
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

  if (loading) {
    return (
      <div style={{ padding: '28px 32px' }}>
        <div style={{ color: MUTED, fontSize: '14px' }}>Carregando...</div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ padding: '28px 32px 24px', borderBottom: `1px solid ${BORDER}` }}>
        <h1 style={{ fontFamily: D, fontSize: '1.5rem', fontWeight: 800, color: 'white', letterSpacing: '-0.02em', marginBottom: '4px' }}>Integrações</h1>
        <p style={{ color: MUTED, fontSize: '13px' }}>Conecte suas ferramentas para enriquecer os insights.</p>
      </div>

      <div style={{ padding: '28px 32px' }}>

        {/* Google Search Console Card */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '14px', overflow: 'hidden', marginBottom: '20px' }}>
          <div style={{ padding: '20px 24px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              {/* Google logo placeholder */}
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
                <a href={buildGscAuthUrl(companyId)}
                  style={{ padding: '8px 16px', background: integration ? 'rgba(255,255,255,0.04)' : ORANGE, color: integration ? MUTED : '#000', fontWeight: 700, fontSize: '12px', borderRadius: '8px', border: integration ? `1px solid ${BORDER}` : 'none', textDecoration: 'none', cursor: 'pointer', display: 'inline-block' }}>
                  {integration ? 'Reconectar' : 'Conectar →'}
                </a>
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
                    : instagramUrl ? 'Pronto para sincronizar' : 'Adicione seu Instagram em Configurações'}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {!instagramUrl ? (
                <button
                  onClick={() => navigate('/dashboard/settings')}
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
                Adicione a URL do seu Instagram em Configurações para sincronizar seguidores, engajamento e posts recentes. O Agente usará esses dados para criar conteúdo personalizado.
              </div>
            </div>
          )}
        </div>

        {/* Google Meu Negócio — em breve */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '14px', padding: '20px 24px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', opacity: 0.5 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>⭐</div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'white' }}>Google Meu Negócio</div>
              <div style={{ fontSize: '12px', color: MUTED }}>Responda avaliações diretamente pelo painel.</div>
            </div>
          </div>
          <span style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '99px', background: 'rgba(255,255,255,0.06)', color: MUTED }}>Em breve</span>
        </div>
      </div>
    </div>
  )
}
