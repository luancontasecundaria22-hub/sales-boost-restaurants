import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useCompany } from '../../contexts/CompanyContext'
import { supabase } from '../../lib/supabase'
import {
  ORANGE, CARD, MUTED, BORDER, D, PILLAR_ICON, IMPACT_COLOR, IMPACT_LABEL, timeAgo,
  type MarketingAiConfig, type TrackingSnapshot, type Insight, type ContentItem, type CompetitorRow, type StrategyLogRow, type ActivityLogRow,
} from './marketingAi/shared'
import TrackingTab from './marketingAi/TrackingTab'
import ContentTab from './marketingAi/ContentTab'
import CompetitorsTab from './marketingAi/CompetitorsTab'
import StrategyTab from './marketingAi/StrategyTab'
import TimelineTab from './marketingAi/TimelineTab'
import ReportsTab from './marketingAi/ReportsTab'
import ChatTab from './marketingAi/ChatTab'

type Tab = 'overview' | 'chat' | 'tracking' | 'content' | 'competitors' | 'strategy' | 'timeline' | 'reports'

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'overview', label: 'Visão Geral', icon: '🏠' },
  { key: 'chat', label: 'Chat', icon: '✨' },
  { key: 'tracking', label: 'Tracking', icon: '📈' },
  { key: 'content', label: 'Conteúdo', icon: '✍️' },
  { key: 'competitors', label: 'Concorrentes', icon: '🔍' },
  { key: 'strategy', label: 'Estratégia', icon: '🧭' },
  { key: 'timeline', label: 'Atividades', icon: '🕓' },
  { key: 'reports', label: 'Relatórios', icon: '📊' },
]

export default function MarketingAiPage() {
  const { session } = useAuth()
  const { company } = useCompany()
  const [tab, setTab] = useState<Tab>('overview')
  const [loading, setLoading] = useState(true)

  const [config, setConfig] = useState<MarketingAiConfig | null>(null)
  const [snapshots, setSnapshots] = useState<TrackingSnapshot[]>([])
  const [insights, setInsights] = useState<Insight[]>([])
  const [content, setContent] = useState<ContentItem[]>([])
  const [competitors, setCompetitors] = useState<CompetitorRow[]>([])
  const [strategyLog, setStrategyLog] = useState<StrategyLogRow[]>([])
  const [activity, setActivity] = useState<ActivityLogRow[]>([])

  const loadAll = useCallback(async () => {
    if (!company) return
    setLoading(true)
    const [cfg, snaps, ins, cont, comps, strat, act] = await Promise.all([
      supabase.from('marketing_ai_config').select('*').eq('company_id', company.id).maybeSingle(),
      supabase.from('marketing_ai_tracking_snapshots').select('*').eq('company_id', company.id).order('collected_at', { ascending: false }).limit(20),
      supabase.from('marketing_ai_insights').select('*').eq('company_id', company.id).eq('status', 'open').order('created_at', { ascending: false }).limit(30),
      supabase.from('marketing_ai_content').select('*').eq('company_id', company.id).order('created_at', { ascending: false }).limit(20),
      supabase.from('marketing_ai_competitors').select('*').eq('company_id', company.id).order('followers', { ascending: false }),
      supabase.from('marketing_ai_strategy_log').select('*').eq('company_id', company.id).order('created_at', { ascending: false }).limit(20),
      supabase.from('marketing_ai_activity_log').select('*').eq('company_id', company.id).order('created_at', { ascending: false }).limit(30),
    ])
    setConfig((cfg.data as MarketingAiConfig | null) ?? null)
    setSnapshots((snaps.data ?? []) as TrackingSnapshot[])
    setInsights((ins.data ?? []) as Insight[])
    setContent((cont.data ?? []) as ContentItem[])
    setCompetitors((comps.data ?? []) as CompetitorRow[])
    setStrategyLog((strat.data ?? []) as StrategyLogRow[])
    setActivity((act.data ?? []) as ActivityLogRow[])
    setLoading(false)
  }, [company])

  useEffect(() => { void loadAll() }, [loadAll])

  if (!company || loading) {
    return <div style={{ padding: '48px', color: MUTED, fontSize: '14px' }}>Carregando...</div>
  }

  const accessToken = session?.access_token ?? ''
  const pendingContent = content.filter(c => c.status === 'idea' || c.status === 'draft').length
  const proposedStrategy = strategyLog.filter(s => s.status === 'proposed').length

  return (
    <div style={{ padding: '28px 32px', maxWidth: '1100px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontFamily: D, fontSize: '1.5rem', fontWeight: 900, color: 'white', letterSpacing: '-0.03em', marginBottom: '4px' }}>✨ Marketing AI</h1>
        <p style={{ color: MUTED, fontSize: '13px' }}>Sistema próprio de inteligência de marketing — tracking, conteúdo, concorrentes e estratégia, sempre com aprovação sua antes de publicar.</p>
      </div>

      <div style={{ display: 'flex', gap: '6px', marginBottom: '24px', borderBottom: `1px solid ${BORDER}`, paddingBottom: '2px', overflowX: 'auto' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{
              padding: '9px 14px', background: 'transparent', border: 'none', borderBottom: `2px solid ${tab === t.key ? ORANGE : 'transparent'}`,
              color: tab === t.key ? 'white' : MUTED, fontSize: '12.5px', fontWeight: tab === t.key ? 700 : 500, cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px',
            }}>
            <span>{t.icon}</span>{t.label}
            {t.key === 'content' && pendingContent > 0 && <span style={{ fontSize: '9.5px', fontWeight: 700, background: 'rgba(255,109,41,0.15)', color: ORANGE, borderRadius: '99px', padding: '1px 6px' }}>{pendingContent}</span>}
            {t.key === 'strategy' && proposedStrategy > 0 && <span style={{ fontSize: '9.5px', fontWeight: 700, background: 'rgba(255,109,41,0.15)', color: ORANGE, borderRadius: '99px', padding: '1px 6px' }}>{proposedStrategy}</span>}
          </button>
        ))}
      </div>

      {!config ? (
        <div style={{ padding: '48px 32px', textAlign: 'center', background: CARD, border: `1px solid ${BORDER}`, borderRadius: '14px' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>✨</div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: 'white', marginBottom: '6px' }}>Marketing AI ainda não foi ativado</div>
          <div style={{ fontSize: '12.5px', color: MUTED, maxWidth: '420px', margin: '0 auto' }}>
            Nossa equipe configura a marca, o público e os concorrentes da sua empresa pra ativar as quatro inteligências: Tracking, Conteúdo, Concorrentes e Estratégia. Assim que estiver pronto, tudo aparece aqui.
          </div>
        </div>
      ) : (
        <>
          {tab === 'overview' && (
            <OverviewTab
              config={config} snapshots={snapshots} insights={insights} pendingContent={pendingContent}
              proposedStrategy={proposedStrategy} activity={activity} onNavigate={setTab}
            />
          )}
          {tab === 'tracking' && (
            <TrackingTab accessToken={accessToken} snapshots={snapshots} insights={insights.filter(i => i.pillar === 'tracking')} hasInstagram={!!company.instagram_url} onRefresh={loadAll} />
          )}
          {tab === 'content' && <ContentTab accessToken={accessToken} content={content} onRefresh={loadAll} />}
          {tab === 'competitors' && (
            <CompetitorsTab accessToken={accessToken} competitors={competitors} insights={insights.filter(i => i.pillar === 'competitor')} hasCompetitorsConfigured={(config?.competitors.length ?? 0) > 0} onRefresh={loadAll} />
          )}
          {tab === 'strategy' && <StrategyTab accessToken={accessToken} log={strategyLog} onRefresh={loadAll} />}
          {tab === 'timeline' && <TimelineTab activity={activity} />}
          {tab === 'reports' && <ReportsTab insights={insights} strategyLog={strategyLog} />}
          {tab === 'chat' && <ChatTab companyId={company.id} accessToken={accessToken} agentName={config?.agent_name ?? 'Agente de Marketing'} />}
        </>
      )}
    </div>
  )
}

function OverviewTab({
  config, snapshots, insights, pendingContent, proposedStrategy, activity, onNavigate,
}: {
  config: MarketingAiConfig | null; snapshots: TrackingSnapshot[]; insights: Insight[]
  pendingContent: number; proposedStrategy: number; activity: ActivityLogRow[]; onNavigate: (t: Tab) => void
}) {
  const latest = snapshots[0]
  const topInsights = insights.slice(0, 5)

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
        <StatCard label="Seguidores" value={latest?.followers ?? '—'} onClick={() => onNavigate('tracking')} />
        <StatCard label="Conteúdo esperando aprovação" value={pendingContent} onClick={() => onNavigate('content')} highlight={pendingContent > 0} />
        <StatCard label="Recomendações novas" value={proposedStrategy} onClick={() => onNavigate('strategy')} highlight={proposedStrategy > 0} />
        <StatCard label="Concorrentes monitorados" value={config?.competitors.length ?? 0} onClick={() => onNavigate('competitors')} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'white', marginBottom: '10px' }}>Insights em aberto</div>
          {topInsights.length === 0 ? (
            <div style={{ color: MUTED, fontSize: '12.5px' }}>Nenhum insight aberto agora.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {topInsights.map(ins => (
                <div key={ins.id} style={{ padding: '10px 12px', background: CARD, border: `1px solid ${BORDER}`, borderRadius: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginBottom: '2px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'white' }}>{PILLAR_ICON[ins.pillar]} {ins.title}</span>
                    {ins.impact && <span style={{ fontSize: '9px', fontWeight: 700, color: IMPACT_COLOR[ins.impact], flexShrink: 0 }}>{IMPACT_LABEL[ins.impact]}</span>}
                  </div>
                  <div style={{ fontSize: '11px', color: MUTED, lineHeight: 1.5 }}>{ins.description}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'white', marginBottom: '10px' }}>Atividade recente</div>
          {activity.length === 0 ? (
            <div style={{ color: MUTED, fontSize: '12.5px' }}>Nenhuma atividade ainda.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {activity.slice(0, 5).map(a => (
                <div key={a.id} style={{ padding: '10px 12px', background: CARD, border: `1px solid ${BORDER}`, borderRadius: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                    <span style={{ fontSize: '12px', color: 'white' }}>{PILLAR_ICON[a.pillar ?? ''] ?? '🤖'} {a.action}</span>
                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>{timeAgo(a.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, onClick, highlight }: { label: string; value: number | string; onClick: () => void; highlight?: boolean }) {
  return (
    <button onClick={onClick} style={{ textAlign: 'left', background: CARD, border: `1px solid ${highlight ? 'rgba(255,109,41,0.3)' : BORDER}`, borderRadius: '12px', padding: '16px', cursor: 'pointer' }}>
      <div style={{ fontSize: '10.5px', color: MUTED, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>{label}</div>
      <div style={{ fontSize: '22px', fontWeight: 800, color: highlight ? ORANGE : 'white' }}>{value}</div>
    </button>
  )
}
