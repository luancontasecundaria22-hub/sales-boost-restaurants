import { useParams, useNavigate, Navigate } from 'react-router-dom'
import { useLang } from '../../contexts/LanguageContext'
import { d } from '../../i18n-dash'
import AgentPostsTab from './AgentPostsTab'
import { ViralTrendsTab, CampanhasTab } from './MarketingTabs'
import AudienciaTab from './AudienciaTab'
import DiagnosticsPage from './DiagnosticsPage'
import CompetitorsPage from './CompetitorsPage'
import InsightsPage from './InsightsPage'
import { ComingSoonTab, LinkHealthTab, WebOpinionsTab, GrowthTab } from './AgentTabExtras'
import { titleFor as sharedTitleFor, groupOfKey, type CardKey } from './agentCardShared'

const ORANGE = '#FF6D29'
const MUTED = '#BABABA'
const D = "'Bricolage Grotesque', system-ui, sans-serif"
const BORDER = 'rgba(255,255,255,0.06)'

type SectionKey = CardKey

export default function AgentSectionPage() {
  const { section } = useParams<{ section: string }>()
  const navigate = useNavigate()
  const { lang } = useLang()
  const T = d[lang].posts

  const key = section as SectionKey

  const titleFor = (): string => {
    const group = groupOfKey(key)
    return group ? sharedTitleFor(T, key, group) : key
  }

  const render = () => {
    switch (key) {
      case 'posts': return <AgentPostsTab />
      case 'trends': return <ViralTrendsTab />
      case 'campanhas': return <CampanhasTab />
      case 'avaliacoes': return <InsightsPage />
      case 'opinioes': return <WebOpinionsTab />
      case 'concorrentes': return <CompetitorsPage />
      case 'crescimento': return <GrowthTab />
      case 'leads': return <ComingSoonTab icon="🧲" title={T.comingSoon.leads.title} desc={T.comingSoon.leads.desc} />
      case 'conversao': return <ComingSoonTab icon="🔀" title={T.comingSoon.conversao.title} desc={T.comingSoon.conversao.desc} />
      case 'followup': return <ComingSoonTab icon="⏰" title={T.comingSoon.followup.title} desc={T.comingSoon.followup.desc} />
      case 'fidelizacao': return <ComingSoonTab icon="💛" title={T.comingSoon.fidelizacao.title} desc={T.comingSoon.fidelizacao.desc} />
      case 'performance': return <DiagnosticsPage />
      case 'audiencia': return <AudienciaTab />
      case 'diagnostico': return <LinkHealthTab />
      default: return null
    }
  }

  const content = render()
  if (!content) return <Navigate to="/dashboard/posts" replace />

  return (
    <div>
      <div style={{ padding: '20px 32px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: '14px' }}>
        <button onClick={() => navigate('/dashboard/posts')}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: '8px', color: MUTED, fontSize: '12.5px', fontWeight: 600, cursor: 'pointer', fontFamily: D, flexShrink: 0 }}
          onMouseEnter={e => { e.currentTarget.style.color = ORANGE; e.currentTarget.style.borderColor = 'rgba(255,109,41,0.3)' }}
          onMouseLeave={e => { e.currentTarget.style.color = MUTED; e.currentTarget.style.borderColor = BORDER }}>
          {T.cards.back}
        </button>
        <span style={{ fontFamily: D, fontSize: '14px', fontWeight: 700, color: 'white' }}>{titleFor()}</span>
      </div>
      {content}
    </div>
  )
}
