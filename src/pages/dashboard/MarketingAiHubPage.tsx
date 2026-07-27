import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCompany } from '../../contexts/CompanyContext'
import { ModuleCard } from './agentCardShared'
import GrowthCommandCenter from './marketingAi/GrowthCommandCenter'
import { buildGrowthDemo, useDemoMode } from './marketingAi/growthDemo'
import { MUTED, BORDER, D } from './marketingAi/shared'

const ORANGE = '#FF6D29'
const CARD = '#150E08'

interface ModuleDef { section: string; title: string; desc: string; icon: string; soon?: boolean }

// Os agentes de crescimento — o coração do Growth OS.
const GROWTH_MODULES: ModuleDef[] = [
  { section: 'competitors', title: 'Inteligência de Mercado', desc: 'Concorrentes, tendências e oportunidades do seu segmento.', icon: '🧭' },
  { section: 'content', title: 'Agente de Conteúdo', desc: 'Calendário, ideias, roteiros de Reels, legendas e criativos.', icon: '✍️' },
  { section: 'meta-ads', title: 'Agente de Meta Ads', desc: 'Analisa campanhas, otimiza orçamento e cria testes de criativo.', icon: '🎯' },
  { section: 'funil', title: 'Funil de Vendas', desc: 'CRM inteligente: captura, qualifica e faz follow-up dos leads.', icon: '🔀' },
  { section: 'whatsapp', title: 'Atendimento WhatsApp', desc: 'Responde, qualifica interesse e passa pro humano quando precisa.', icon: '💬' },
  { section: 'conexoes', title: 'Conexões', desc: 'Ligue Meta, WhatsApp, Google, site e loja ao Growth OS.', icon: '🔌' },
]

// Ferramentas de apoio — inteligência, aprendizado e histórico.
const SUPPORT_MODULES: { section: string; label: string; icon: string; soon?: boolean }[] = [
  { section: 'feedback', label: 'Feedback Loop', icon: '🔁' },
  { section: 'tracking', label: 'Tracking', icon: '📈' },
  { section: 'brain', label: 'Marketing Brain', icon: '🧠' },
  { section: 'experiments', label: 'Experimentos', icon: '🧪' },
  { section: 'timeline', label: 'Central de Execução', icon: '🕓' },
  { section: 'reports', label: 'Relatórios', icon: '📊' },
  { section: 'chat', label: 'Chat', icon: '✨' },
  { section: 'tools', label: 'Configuração', icon: '🛠️' },
]

export default function MarketingAiHubPage() {
  const { company } = useCompany()
  const navigate = useNavigate()
  const [demoMode, setDemoMode] = useDemoMode(company?.id)

  const demo = useMemo(() => (company ? buildGrowthDemo(company) : null), [company])

  if (!company || !demo) {
    return <div style={{ padding: '48px', color: MUTED, fontSize: '14px' }}>Carregando...</div>
  }

  const open = (section: string) => navigate(`/dashboard/marketing-ai/${section}`)

  return (
    <div>
      <div style={{ padding: '26px 32px 22px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: D, fontSize: '1.5rem', fontWeight: 900, color: 'white', letterSpacing: '-0.03em', marginBottom: '4px' }}>
            Growth OS <span style={{ color: ORANGE }}>·</span> <span style={{ fontSize: '1rem', fontWeight: 700, color: MUTED }}>{company.business_name}</span>
          </h1>
          <p style={{ color: MUTED, fontSize: '13px' }}>Seu departamento de crescimento com IA — encontra oportunidades, executa campanhas e transforma dados em vendas. Nada vai ao ar sem sua aprovação.</p>
        </div>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '9px', padding: '8px 14px', background: CARD, border: `1px solid ${demoMode ? 'rgba(251,191,36,0.3)' : BORDER}`, borderRadius: '10px', cursor: 'pointer', flexShrink: 0 }}>
          <input type="checkbox" checked={demoMode} onChange={e => setDemoMode(e.target.checked)} style={{ width: '15px', height: '15px', accentColor: ORANGE, cursor: 'pointer' }} />
          <span style={{ fontSize: '12px', fontWeight: 700, color: demoMode ? '#FBBF24' : MUTED }}>Modo demonstração</span>
        </label>
      </div>

      {demoMode ? (
        <GrowthCommandCenter data={demo} onOpenModule={open} />
      ) : (
        <div style={{ margin: '24px 32px 0', padding: '16px 20px', background: 'rgba(255,109,41,0.06)', border: '1px solid rgba(255,109,41,0.2)', borderRadius: '12px', fontSize: '12.5px', color: 'white', lineHeight: 1.6 }}>
          O modo demonstração está desligado. Os painéis com receita, ROAS e funil ficam vazios até as integrações reais (Meta, WhatsApp) serem conectadas e verificadas. Ligue o modo demonstração acima para ver o produto funcionando de ponta a ponta.
        </div>
      )}

      <div style={{ padding: '10px 32px 32px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '14px' }}>
          Sua equipe de agentes
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px', marginBottom: '30px' }}>
          {GROWTH_MODULES.map(m => (
            <ModuleCard
              key={m.section}
              title={m.title}
              desc={m.desc}
              preview={null}
              icon={m.icon}
              soon={!!m.soon}
              openLabel="Abrir"
              soonLabel="Em breve"
              onClick={() => { if (!m.soon) open(m.section) }}
            />
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Inteligência e histórico</span>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {SUPPORT_MODULES.map(l => (
                <button key={l.section} onClick={() => open(l.section)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', background: CARD, border: `1px solid ${BORDER}`, borderRadius: '9px', color: MUTED, fontSize: '12px', cursor: 'pointer', fontFamily: D }}
                  onMouseEnter={e => { e.currentTarget.style.color = ORANGE; e.currentTarget.style.borderColor = 'rgba(255,109,41,0.3)' }}
                  onMouseLeave={e => { e.currentTarget.style.color = MUTED; e.currentTarget.style.borderColor = BORDER }}>
                  <span>{l.icon}</span>{l.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
