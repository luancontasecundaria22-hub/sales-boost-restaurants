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
  { section: 'avaliacoes', title: 'Avaliações', desc: 'A IA responde as avaliações do Google — rascunha e você aprova (ou liga o modo automático).', icon: '⭐' },
  { section: 'content', title: 'Agente de Conteúdo', desc: 'Calendário, ideias, roteiros de Reels, legendas e criativos.', icon: '✍️' },
  { section: 'meta-ads', title: 'Agente de Meta Ads', desc: 'Analisa campanhas, otimiza orçamento e cria testes de criativo.', icon: '🎯' },
  { section: 'funil', title: 'Funil de Vendas', desc: 'CRM inteligente: captura, qualifica e faz follow-up dos leads.', icon: '🔀' },
  { section: 'whatsapp', title: 'Atendimento WhatsApp', desc: 'Responde, qualifica interesse e passa pro humano quando precisa.', icon: '💬' },
]

// Os 4 pilares de inteligência — a base que faz o agente entender o negócio.
const INTEL_MODULES: ModuleDef[] = [
  { section: 'conexoes', title: 'Conexões', desc: 'Liga Meta, WhatsApp, Google e loja — a base de dados do agente.', icon: '🔌' },
  { section: 'feedback', title: 'Feedback Loop', desc: 'Aprende seu cliente ideal (ICP) e refina sozinho.', icon: '🔁' },
  { section: 'insights', title: 'Insights', desc: 'Oportunidades de fora: eventos, datas, tendências, parcerias.', icon: '💡' },
  { section: 'context', title: 'Contexto do Negócio', desc: 'Você ensina à IA o que nenhuma integração sabe.', icon: '🧠' },
  { section: 'saude-meta', title: 'Saúde da Meta', desc: 'Um score de 0 a 100: quão saudável está seu ecossistema na Meta e o que melhorar primeiro.', icon: '❤️‍🩹' },
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <button onClick={() => navigate('/dashboard/settings?tab=agentes')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '8px 14px', background: CARD, border: `1px solid ${BORDER}`, borderRadius: '10px', cursor: 'pointer', fontFamily: D, color: MUTED, fontSize: '12px', fontWeight: 700 }}
            onMouseEnter={e => { e.currentTarget.style.color = ORANGE; e.currentTarget.style.borderColor = 'rgba(255,109,41,0.3)' }}
            onMouseLeave={e => { e.currentTarget.style.color = MUTED; e.currentTarget.style.borderColor = BORDER }}>
            ⚙️ Configuração
          </button>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '9px', padding: '8px 14px', background: CARD, border: `1px solid ${demoMode ? 'rgba(251,191,36,0.3)' : BORDER}`, borderRadius: '10px', cursor: 'pointer' }}>
            <input type="checkbox" checked={demoMode} onChange={e => setDemoMode(e.target.checked)} style={{ width: '15px', height: '15px', accentColor: ORANGE, cursor: 'pointer' }} />
            <span style={{ fontSize: '12px', fontWeight: 700, color: demoMode ? '#FBBF24' : MUTED }}>Modo demonstração</span>
          </label>
        </div>
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

        <div style={{ fontSize: '11px', fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
          Inteligência do negócio
        </div>
        <p style={{ fontSize: '12px', color: MUTED, lineHeight: 1.6, marginBottom: '14px', maxWidth: '680px' }}>
          Os pilares que fazem a IA entender seu negócio de verdade — <strong style={{ color: 'white' }}>dados</strong> (Conexões), o <strong style={{ color: 'white' }}>cliente ideal</strong> (Feedback Loop), as <strong style={{ color: 'white' }}>oportunidades de fora</strong> (Insights) e o que <strong style={{ color: 'white' }}>só você sabe</strong> (Contexto). Fechando, a <strong style={{ color: 'white' }}>Saúde da Meta</strong> mede tudo num único score e diz o que melhorar primeiro.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '12px' }}>
          {INTEL_MODULES.map((m, i) => (
            <button key={m.section} onClick={() => open(m.section)}
              style={{ textAlign: 'left', background: CARD, border: `1px solid ${BORDER}`, borderRadius: '14px', padding: '16px 17px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '7px', transition: 'border-color 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,109,41,0.35)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                <span style={{ fontSize: '20px' }}>{m.icon}</span>
                <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'white' }}>{m.title}</span>
                <span style={{ marginLeft: 'auto', fontSize: '9.5px', fontWeight: 700, color: 'rgba(255,255,255,0.35)' }}>{i + 1}/{INTEL_MODULES.length}</span>
              </div>
              <div style={{ fontSize: '11.5px', color: MUTED, lineHeight: 1.5 }}>{m.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
