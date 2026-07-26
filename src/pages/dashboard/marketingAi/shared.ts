export const ORANGE = '#FF6D29'
export const CARD = '#150E08'
export const MUTED = '#BABABA'
export const BORDER = 'rgba(255,255,255,0.06)'
export const D = "'Bricolage Grotesque', system-ui, sans-serif"
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string

export interface MarketingAiConfig {
  company_id: string
  agent_name: string
  business_objectives: string | null
  brand_voice: string | null
  tone: string | null
  posting_frequency: string
  preferred_content_types: string[]
  automatic_publishing: boolean
  approval_workflow: 'draft_only' | 'auto_publish'
  competitors: string[]
  brand_colors: string[]
  target_audience: string | null
  content_pillars: string[]
  marketing_goals: string | null
}

export interface TrackingSnapshot {
  id: string
  followers: number | null
  posts_count: number | null
  avg_likes: number | null
  avg_comments: number | null
  engagement_rate: number | null
  best_posting_hour: number | null
  collected_at: string
}

export interface Insight {
  id: string
  pillar: 'tracking' | 'content' | 'competitor' | 'strategy'
  title: string
  description: string
  impact: 'high' | 'medium' | 'low' | null
  status: 'open' | 'dismissed' | 'acted_on'
  created_at: string
}

export interface ContentItem {
  id: string
  idea: string | null
  caption: string | null
  hashtags: string | null
  format: 'reel' | 'carrossel' | 'story' | 'foto' | null
  image_url: string | null
  status: 'idea' | 'draft' | 'approved' | 'scheduled' | 'published'
  reasoning: string | null
  created_at: string
}

export interface CompetitorRow {
  id: string
  name: string
  instagram_url: string | null
  posting_frequency_days: number | null
  avg_engagement: number | null
  followers: number | null
  last_analyzed_at: string | null
}

export interface StrategyLogRow {
  id: string
  recommendation: string
  reasoning: string
  status: 'proposed' | 'approved' | 'dismissed' | 'implemented'
  created_at: string
}

export interface ChatMessage { role: 'user' | 'assistant'; content: string }

export interface ActivityLogRow {
  id: string
  pillar: string | null
  action: string
  reasoning: string | null
  created_at: string
}

export const IMPACT_COLOR: Record<string, string> = { high: '#f87171', medium: '#FBBF24', low: MUTED }
export const IMPACT_LABEL: Record<string, string> = { high: 'Alto impacto', medium: 'Médio impacto', low: 'Baixo impacto' }
export const PILLAR_LABEL: Record<string, string> = { tracking: 'Tracking', content: 'Conteúdo', competitor: 'Concorrentes', strategy: 'Estratégia' }
export const PILLAR_ICON: Record<string, string> = { tracking: '📈', content: '✍️', competitor: '🔍', strategy: '🧭' }
export const STATUS_LABEL: Record<string, string> = { idea: 'Ideia', draft: 'Rascunho', approved: 'Aprovado', scheduled: 'Agendado', published: 'Publicado' }

export async function callMarketingAi(accessToken: string, action: string, extra: Record<string, unknown> = {}) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/marketing-ai`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...extra }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error ?? 'Erro ao chamar Marketing AI')
  return data
}

export const inputStyle = { padding: '8px 12px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`, borderRadius: '8px', color: 'white', fontSize: '13px', outline: 'none' } as const

export function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `${mins}min atrás`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h atrás`
  const days = Math.floor(hours / 24)
  return `${days}d atrás`
}
