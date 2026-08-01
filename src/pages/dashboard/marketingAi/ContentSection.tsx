import { useState } from 'react'
import type { CompanyData } from '../../../contexts/CompanyContext'
import { BORDER, MUTED, D } from './shared'
import ContentAgentTab from './ContentAgentTab'
import CampaignsTab from './CampaignsTab'
import StoriesTab from './StoriesTab'

const ORANGE = '#FF6D29'

type Mode = 'organico' | 'campanhas' | 'stories'

const TABS: { key: Mode; icon: string; label: string; sub: string }[] = [
  { key: 'organico', icon: '✍️', label: 'Orgânico', sub: 'Calendário, ideias e criativos' },
  { key: 'stories', icon: '📖', label: 'Stories', sub: 'Stories + Story Ads (demo)' },
  { key: 'campanhas', icon: '🎯', label: 'Campanhas', sub: 'Mídia paga com funil (demo)' },
]

// Casa os dois módulos de conteúdo sob uma única seção: o Agente de Conteúdo
// (orgânico, já existente e intacto) e o novo Estrategista de Campanhas (mídia
// paga, modo demonstração). O toggle preserva 100% do que já existia.
export default function ContentSection({ company }: { company: Pick<CompanyData, 'id' | 'business_name' | 'business_type' | 'city'> }) {
  const [mode, setMode] = useState<Mode>('organico')

  return (
    <div>
      <div style={{ display: 'inline-flex', gap: '4px', padding: '4px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}`, borderRadius: '12px', marginBottom: '22px' }}>
        {TABS.map(t => {
          const active = mode === t.key
          return (
            <button key={t.key} onClick={() => setMode(t.key)}
              style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '9px 15px', background: active ? 'rgba(255,109,41,0.12)' : 'transparent', border: `1px solid ${active ? 'rgba(255,109,41,0.35)' : 'transparent'}`, borderRadius: '9px', cursor: 'pointer', fontFamily: D, textAlign: 'left' }}>
              <span style={{ fontSize: '17px' }}>{t.icon}</span>
              <div>
                <div style={{ fontSize: '12.5px', fontWeight: 700, color: active ? ORANGE : 'white' }}>{t.label}</div>
                <div style={{ fontSize: '10px', color: MUTED }}>{t.sub}</div>
              </div>
            </button>
          )
        })}
      </div>

      {mode === 'organico' ? <ContentAgentTab company={company} /> : mode === 'stories' ? <StoriesTab company={company} /> : <CampaignsTab company={company} />}
    </div>
  )
}
