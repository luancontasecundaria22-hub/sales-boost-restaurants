import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

const ORANGE = '#FF6D29'
const CARD = '#150E08'
const MUTED = '#BABABA'
const D = "'Bricolage Grotesque', system-ui, sans-serif"
const BORDER = 'rgba(255,255,255,0.06)'
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string

interface SocialProfile {
  platform?: string
  username?: string
  full_name?: string
  followers?: number
  following?: number
  posts_count?: number
  videos_count?: number
  hearts?: number
  avg_likes?: number
  avg_comments?: number
  avg_views?: number
  engagement_rate?: number
  posting_freq_days?: number
  last_post?: string
  likes?: number
  category?: string
  error?: string
  scraped_at?: string
}

interface Company {
  id: string
  business_name: string | null
  business_type: string | null
  website_url: string | null
  instagram_url: string | null
  facebook_url: string | null
  tiktok_url: string | null
  google_maps_url: string | null
  google_place_id: string | null
  google_rating: number | null
  google_review_count: number | null
  tripadvisor_url: string | null
  reclame_aqui_url: string | null
  ifood_url: string | null
  social_data: Record<string, SocialProfile> | null
  social_scraped_at: string | null
}

interface PlatformConfig {
  key: 'google_place_id' | 'website_url' | 'instagram_url' | 'tiktok_url' | 'facebook_url' | 'tripadvisor_url' | 'reclame_aqui_url' | 'ifood_url'
  socialKey?: 'instagram' | 'tiktok' | 'facebook'
  name: string
  icon: string
  scrapable: boolean
  connectedNote?: string
  getReach: (bt: string) => string
  getTip: (bt: string) => string
}

const PLATFORMS: PlatformConfig[] = [
  {
    key: 'google_place_id', name: 'Google Meu Negócio', icon: '🔍', scrapable: true,
    connectedNote: 'Avaliações importadas alimentam Insights e Revenue Opportunities.',
    getReach: () => '',
    getTip: () => 'Negócios verificados no Google recebem 7× mais cliques do que os não verificados.',
  },
  {
    key: 'website_url', name: 'Site', icon: '🌐', scrapable: false,
    getReach: () => '',
    getTip: () => 'Um site com SEO básico bem feito pode triplicar o tráfego orgânico em 6 meses.',
  },
  {
    key: 'instagram_url', socialKey: 'instagram', name: 'Instagram', icon: '📸', scrapable: true,
    getReach: (bt) => bt.includes('Restaurante') || bt.includes('Food') ? '5.000–30.000 impressões/mês' : bt.includes('Beleza') || bt.includes('Saúde') ? '3.000–20.000 impressões/mês' : '2.000–15.000 impressões/mês',
    getTip: (bt) => bt.includes('Restaurante') || bt.includes('Food') ? 'Restaurantes que postam 3×/semana crescem 40% mais rápido.' : bt.includes('Beleza') ? 'Vídeos de "antes e depois" no Reels são o formato de maior engajamento.' : 'Posts educativos + depoimentos geram as maiores taxas de salvamento.',
  },
  {
    key: 'tiktok_url', socialKey: 'tiktok', name: 'TikTok', icon: '🎵', scrapable: true,
    getReach: (bt) => bt.includes('Restaurante') || bt.includes('Food') ? '20.000–200.000 views/mês orgânicos' : bt.includes('Beleza') || bt.includes('Saúde') ? '10.000–100.000 views/mês orgânicos' : '5.000–50.000 views/mês orgânicos',
    getTip: (bt) => bt.includes('Restaurante') || bt.includes('Food') ? 'Vídeos de 15–30s mostrando o preparo têm 3× mais chance de viralizar.' : bt.includes('Beleza') ? 'Transformações em time-lapse são o conteúdo de maior alcance orgânico no TikTok.' : 'TikTok tem maior alcance orgânico gratuito — empresas locais chegam a 10k views no primeiro mês.',
  },
  {
    key: 'facebook_url', socialKey: 'facebook', name: 'Facebook', icon: '👥', scrapable: true,
    getReach: (bt) => bt.includes('Restaurante') || bt.includes('Food') ? '2.000–15.000 alcance/mês (público 35+)' : '1.000–8.000 alcance/mês (público 35+)',
    getTip: () => 'Facebook ainda domina para o público acima de 35 anos. Grupos locais e eventos têm alcance orgânico expressivo.',
  },
  {
    key: 'tripadvisor_url', name: 'TripAdvisor', icon: '🦉', scrapable: true,
    connectedNote: 'Avaliações importadas alimentam Insights e Revenue Opportunities.',
    getReach: (bt) => bt.includes('Restaurante') || bt.includes('Food') ? 'Decisivo para turistas e visitantes de fora da cidade' : 'Relevante se seu negócio recebe turistas',
    getTip: () => 'TripAdvisor é a primeira parada de quem pesquisa antes de visitar uma cidade. Responder avaliações aumenta a confiança.',
  },
  {
    key: 'reclame_aqui_url', name: 'Reclame Aqui', icon: '📢', scrapable: true,
    connectedNote: 'Reclamações importadas alimentam Insights e Revenue Opportunities.',
    getReach: () => '',
    getTip: () => 'Empresas que respondem reclamações em até 24h recuperam a confiança de até 70% dos clientes insatisfeitos.',
  },
  {
    key: 'ifood_url', name: 'iFood', icon: '🛵', scrapable: true,
    connectedNote: 'Avaliações importadas alimentam Insights e Revenue Opportunities.',
    getReach: () => 'Canal decisivo para delivery e take-away',
    getTip: () => 'Notas baixas no iFood reduzem a visibilidade no app. Responder avaliações negativas rapidamente ajuda a manter o ranking.',
  },
]

function fmt(n: number | undefined): string {
  if (n == null) return '—'
  return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <div style={{ fontSize: '10px', color: MUTED, marginBottom: '2px' }}>{label}</div>
      <div style={{ fontSize: '14px', fontWeight: 700, color, fontFamily: D }}>{value}</div>
    </div>
  )
}

function SocialStats({ profile, platform }: { profile: SocialProfile; platform: PlatformConfig }) {
  if (profile.error) {
    return <div style={{ fontSize: '11px', color: '#f87171', marginTop: '4px' }}>Erro ao analisar: {profile.error.slice(0, 80)}</div>
  }
  const scrapedDate = profile.scraped_at ? new Date(profile.scraped_at).toLocaleDateString('pt-BR') : null
  return (
    <div style={{ marginTop: '8px' }}>
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '6px' }}>
        {platform.socialKey === 'instagram' && (
          <>
            <Stat label="Seguidores" value={fmt(profile.followers)} color="white" />
            <Stat label="Posts" value={fmt(profile.posts_count)} color={MUTED} />
            {profile.engagement_rate != null && <Stat label="Engajamento" value={`${profile.engagement_rate}%`} color={profile.engagement_rate >= 3 ? '#4ade80' : profile.engagement_rate >= 1 ? '#FBBF24' : '#f87171'} />}
            {profile.avg_likes != null && <Stat label="Média likes" value={fmt(profile.avg_likes)} color={MUTED} />}
            {profile.posting_freq_days != null && <Stat label="Freq. postagem" value={`${profile.posting_freq_days}d`} color={profile.posting_freq_days <= 3 ? '#4ade80' : profile.posting_freq_days <= 7 ? '#FBBF24' : '#f87171'} />}
          </>
        )}
        {platform.socialKey === 'tiktok' && (
          <>
            <Stat label="Seguidores" value={fmt(profile.followers)} color="white" />
            <Stat label="Vídeos" value={fmt(profile.videos_count)} color={MUTED} />
            {profile.avg_views != null && <Stat label="Média views" value={fmt(profile.avg_views)} color={profile.avg_views >= 10000 ? '#4ade80' : profile.avg_views >= 1000 ? '#FBBF24' : MUTED} />}
            {profile.hearts != null && <Stat label="Total curtidas" value={fmt(profile.hearts)} color={MUTED} />}
          </>
        )}
        {platform.socialKey === 'facebook' && (
          <>
            <Stat label="Seguidores" value={fmt(profile.followers ?? profile.likes)} color="white" />
            {profile.category && <Stat label="Categoria" value={profile.category} color={MUTED} />}
          </>
        )}
      </div>
      {scrapedDate && <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)' }}>Analisado em {scrapedDate}</div>}
    </div>
  )
}

export default function AudienciaTab() {
  const { user, session } = useAuth()
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeMsg, setAnalyzeMsg] = useState('')
  const [analyzeErr, setAnalyzeErr] = useState('')

  useEffect(() => { if (user) load() }, [user])

  const load = async (skipSet = false) => {
    if (!user) return
    if (!skipSet) setLoading(true)
    const { data: co } = await supabase
      .from('companies')
      .select('id, business_name, business_type, website_url, instagram_url, facebook_url, tiktok_url, google_maps_url, google_place_id, google_rating, google_review_count, tripadvisor_url, reclame_aqui_url, ifood_url, social_data, social_scraped_at')
      .eq('user_id', user.id)
      .maybeSingle()
    setCompany(co as Company | null)
    if (!skipSet) setLoading(false)
  }

  const handleAnalyze = async () => {
    if (!session) return
    setAnalyzing(true); setAnalyzeMsg(''); setAnalyzeErr('')
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/apify-sync`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro desconhecido')
      const ok = (data.scraped as string[] | undefined)?.join(', ') ?? 'concluído'
      const errs = data.errors?.length ? ` (erro em: ${(data.errors as string[]).join(', ')})` : ''
      setAnalyzeMsg(`✓ Análise concluída: ${ok}${errs}`)
      await load(true)
    } catch (e: unknown) {
      setAnalyzeErr(e instanceof Error ? e.message : String(e))
    }
    setAnalyzing(false)
  }

  if (loading) return <div style={{ padding: '28px 32px', color: MUTED, fontSize: '14px' }}>Carregando...</div>
  if (!company) return (
    <div style={{ padding: '28px 32px' }}>
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '14px', padding: '48px 32px', textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', marginBottom: '12px' }}>📡</div>
        <div style={{ fontFamily: D, fontSize: '1.1rem', fontWeight: 700, color: 'white', marginBottom: '8px' }}>Perfil não encontrado</div>
        <div style={{ fontSize: '13px', color: MUTED }}>Configure seu negócio nas Configurações para ativar a análise de presença digital.</div>
      </div>
    </div>
  )

  const bt = company.business_type ?? ''
  const sd = company.social_data ?? {}
  const isConnected = (p: PlatformConfig): boolean => {
    if (p.key === 'google_place_id') return !!company.google_place_id
    return !!(company[p.key as keyof Company])
  }
  const hasScrapable = PLATFORMS.some(p => p.scrapable && isConnected(p))
  const lastScrape = company.social_scraped_at ? new Date(company.social_scraped_at).toLocaleDateString('pt-BR') : null
  const connected = PLATFORMS.filter(p => isConnected(p))
  const missing = PLATFORMS.filter(p => !isConnected(p))

  return (
    <div style={{ padding: '24px 32px' }}>
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '14px', overflow: 'hidden' }}>
        <div style={{ padding: '16px 22px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <span style={{ color: 'white', fontWeight: 700, fontSize: '14px' }}>Presença Digital</span>
            {lastScrape && <span style={{ fontSize: '11px', color: MUTED, marginLeft: '10px' }}>Analisado em {lastScrape}</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '11px', color: MUTED }}>{connected.length}/{PLATFORMS.length} canais ativos</span>
            {hasScrapable && (
              <button
                onClick={handleAnalyze} disabled={analyzing}
                style={{ padding: '6px 14px', background: analyzing ? 'rgba(255,109,41,0.2)' : 'rgba(255,109,41,0.12)', color: ORANGE, fontWeight: 700, fontSize: '12px', borderRadius: '8px', border: '1px solid rgba(255,109,41,0.25)', cursor: analyzing ? 'not-allowed' : 'pointer' }}>
                {analyzing ? 'Analisando...' : '✦ Analisar redes sociais'}
              </button>
            )}
          </div>
        </div>

        {(analyzeMsg || analyzeErr) && (
          <div style={{ padding: '10px 22px', background: analyzeErr ? 'rgba(248,113,113,0.06)' : 'rgba(74,222,128,0.06)', borderBottom: `1px solid ${BORDER}`, fontSize: '12px', color: analyzeErr ? '#f87171' : '#4ade80' }}>
            {analyzeErr || analyzeMsg}
          </div>
        )}

        {connected.length > 0 && (
          <div style={{ borderBottom: missing.length > 0 ? `1px solid ${BORDER}` : 'none' }}>
            <div style={{ padding: '12px 22px 4px', fontSize: '10px', fontWeight: 700, color: '#4ade80', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Canais ativos</div>
            {connected.map((p, i) => {
              const profile = p.socialKey ? sd[p.socialKey] : null
              const hasData = profile && !profile.error
              return (
                <div key={p.key} style={{ padding: '14px 22px', borderTop: i > 0 ? `1px solid ${BORDER}` : 'none', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '17px', flexShrink: 0 }}>
                    {p.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'white' }}>{p.name}</span>
                      <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '99px', background: 'rgba(74,222,128,0.1)', color: '#4ade80', fontWeight: 700, border: '1px solid rgba(74,222,128,0.2)' }}>✓ Ativo</span>
                      {p.key === 'google_place_id' && company.google_rating && (
                        <span style={{ fontSize: '11px', color: '#FBBF24' }}>{company.google_rating}★ · {company.google_review_count ?? '?'} aval.</span>
                      )}
                      {p.key === 'website_url' && (
                        <span style={{ fontSize: '11px', color: MUTED }}>Ver Diagnóstico do site ↗</span>
                      )}
                      {p.socialKey && p.scrapable && !hasData && !profile?.error && (
                        <span style={{ fontSize: '11px', color: MUTED }}>Clique em "Analisar" para ver métricas</span>
                      )}
                      {!p.socialKey && p.key !== 'google_place_id' && p.key !== 'website_url' && p.connectedNote && (
                        <span style={{ fontSize: '11px', color: MUTED }}>{p.connectedNote}</span>
                      )}
                    </div>
                    {profile && <SocialStats profile={profile} platform={p} />}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {missing.length > 0 && (
          <div>
            <div style={{ padding: '12px 22px 4px', fontSize: '10px', fontWeight: 700, color: ORANGE, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Canais ausentes — potencial não explorado
            </div>
            {missing.map((p, i) => (
              <div key={p.key} style={{ padding: '14px 22px', borderTop: i > 0 ? `1px solid ${BORDER}` : 'none', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '17px', flexShrink: 0, opacity: 0.5 }}>
                  {p.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'white' }}>{p.name}</span>
                    <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '99px', background: 'rgba(255,109,41,0.1)', color: ORANGE, fontWeight: 700, border: '1px solid rgba(255,109,41,0.2)' }}>Ausente</span>
                    {p.getReach(bt) && (
                      <span style={{ fontSize: '11px', color: '#f87171', fontWeight: 600 }}>−{p.getReach(bt)}</span>
                    )}
                  </div>
                  <p style={{ fontSize: '12px', color: MUTED, lineHeight: 1.65, margin: '0 0 6px' }}>
                    💡 {p.getTip(bt)}
                  </p>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)' }}>
                    <span style={{ color: ORANGE }}>→</span> Adicione o link nas <strong style={{ color: 'rgba(255,255,255,0.4)' }}>Configurações</strong> para ativar
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
