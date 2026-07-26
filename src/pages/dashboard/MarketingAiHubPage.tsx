import { useNavigate } from 'react-router-dom'
import { useCompany } from '../../contexts/CompanyContext'
import { ModuleCard } from './agentCardShared'
import { useMarketingAiData } from './marketingAi/useMarketingAiData'
import { MUTED, BORDER, D } from './marketingAi/shared'

const ORANGE = '#FF6D29'
const CARD = '#150E08'

type SectionKey = 'tracking' | 'content' | 'competitors' | 'brain' | 'overview' | 'chat' | 'experiments' | 'tools' | 'timeline' | 'reports'

const PILLAR_CARDS: { key: SectionKey; title: string; desc: string; icon: string }[] = [
  { key: 'tracking', title: 'Tracking', desc: 'Métricas reais do Instagram e padrões detectados no histórico.', icon: '📈' },
  { key: 'content', title: 'Conteúdo', desc: 'Ideias, legendas, campanhas e tendências do segmento.', icon: '✍️' },
  { key: 'competitors', title: 'Concorrentes', desc: 'Quem mais aparece no seu raio de atuação e as oportunidades que isso abre.', icon: '🔍' },
  { key: 'brain', title: 'Marketing Brain', desc: 'A memória permanente — cada padrão, aprendizado e decisão do Hermes.', icon: '🧠' },
]

const SECONDARY_LINKS: { key: SectionKey; label: string; icon: string }[] = [
  { key: 'overview', label: 'Visão Geral', icon: '🏠' },
  { key: 'chat', label: 'Chat', icon: '✨' },
  { key: 'experiments', label: 'Experiments', icon: '🧪' },
  { key: 'tools', label: 'Tools', icon: '🛠️' },
  { key: 'timeline', label: 'Atividades', icon: '🕓' },
  { key: 'reports', label: 'Relatórios', icon: '📊' },
]

export default function MarketingAiHubPage() {
  const { company } = useCompany()
  const navigate = useNavigate()
  const data = useMarketingAiData(company?.id)

  if (!company || data.loading) {
    return <div style={{ padding: '48px', color: MUTED, fontSize: '14px' }}>Carregando...</div>
  }

  const pendingContent = data.content.filter(c => c.status === 'idea' || c.status === 'draft').length
  const proposedDecisions = data.strategyLog.filter(s => s.status === 'proposed').length

  const previewFor = (key: SectionKey): string | null => {
    if (key === 'tracking') {
      const latest = data.snapshots[0]
      return latest?.followers != null ? `${latest.followers} seguidores` : 'Nenhuma coleta ainda'
    }
    if (key === 'content') return pendingContent > 0 ? `${pendingContent} esperando aprovação` : 'Nenhum rascunho pendente'
    if (key === 'competitors') return data.competitors.length > 0 ? `${data.competitors.length} concorrente(s) monitorado(s)` : 'Nenhum concorrente cadastrado'
    if (key === 'brain') return proposedDecisions > 0 ? `${proposedDecisions} decisão(ões) nova(s) do Hermes` : `${data.brainNodes.length} registro(s) de conhecimento`
    return null
  }

  return (
    <div>
      <div style={{ padding: '28px 32px 24px', borderBottom: `1px solid ${BORDER}` }}>
        <h1 style={{ fontFamily: D, fontSize: '1.5rem', fontWeight: 900, color: 'white', letterSpacing: '-0.03em', marginBottom: '4px' }}>✨ Marketing AI</h1>
        <p style={{ color: MUTED, fontSize: '13px' }}>Sistema próprio de inteligência de marketing — sempre com aprovação sua antes de publicar.</p>
      </div>

      {!data.config && (
        <div style={{ margin: '24px 32px 0', padding: '14px 18px', background: 'rgba(255,109,41,0.06)', border: '1px solid rgba(255,109,41,0.2)', borderRadius: '12px', fontSize: '12.5px', color: 'white', lineHeight: 1.6 }}>
          👋 <strong>Marketing AI ainda não foi ativado.</strong> A ativação é feita pela equipe Sales Boost, configurando a marca, o público e os concorrentes pra ligar as quatro inteligências. Fale com a gente pra ativar.
        </div>
      )}

      <div style={{ padding: '28px 32px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '14px' }}>
          As quatro inteligências
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px', marginBottom: '32px' }}>
          {PILLAR_CARDS.map(c => (
            <ModuleCard
              key={c.key}
              title={c.title}
              desc={c.desc}
              preview={previewFor(c.key)}
              icon={c.icon}
              soon={false}
              openLabel="Abrir"
              soonLabel="Em breve"
              onClick={() => navigate(`/dashboard/marketing-ai/${c.key}`)}
            />
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Mais</span>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {SECONDARY_LINKS.map(l => (
                <button key={l.key} onClick={() => navigate(`/dashboard/marketing-ai/${l.key}`)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', background: CARD, border: `1px solid ${BORDER}`, borderRadius: '9px', color: MUTED, fontSize: '12px', cursor: 'pointer', fontFamily: D }}
                  onMouseEnter={e => { e.currentTarget.style.color = ORANGE; e.currentTarget.style.borderColor = 'rgba(255,109,41,0.3)' }}
                  onMouseLeave={e => { e.currentTarget.style.color = MUTED; e.currentTarget.style.borderColor = BORDER }}>
                  <span>{l.icon}</span>{l.label}
                  {l.key === 'content' && pendingContent > 0 && <span style={{ fontSize: '9.5px', fontWeight: 700, background: 'rgba(255,109,41,0.15)', color: ORANGE, borderRadius: '99px', padding: '1px 6px' }}>{pendingContent}</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
