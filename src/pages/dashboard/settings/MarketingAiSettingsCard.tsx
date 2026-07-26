import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { ORANGE, CARD, MUTED, BORDER, D, inputStyle, type MarketingAiConfig } from '../marketingAi/shared'

const CONTENT_TYPE_OPTIONS = ['reel', 'carrossel', 'foto', 'story']

interface Draft {
  agent_name: string; business_objectives: string; brand_voice: string; tone: string
  posting_frequency: string; preferred_content_types: string[]; target_audience: string
  content_pillars: string[]; marketing_goals: string; competitors: string[]
}

const draftKey = (companyId: string) => `marketing_ai_settings_draft:${companyId}`

// Rascunho local — o formulário não se perde só porque o dono trocou de aba
// ou fechou a tela sem clicar em "Salvar". Some sozinho assim que salva de
// verdade no banco.
function loadDraft(companyId: string): Partial<Draft> | null {
  try {
    const raw = localStorage.getItem(draftKey(companyId))
    return raw ? JSON.parse(raw) as Partial<Draft> : null
  } catch { return null }
}

export default function MarketingAiSettingsCard({ companyId, config, onSaved }: { companyId: string; config: MarketingAiConfig | null; onSaved: (c: MarketingAiConfig) => void }) {
  const draft = loadDraft(companyId)

  const [agentName, setAgentName] = useState(draft?.agent_name ?? config?.agent_name ?? 'Agente de Marketing')
  const [businessObjectives, setBusinessObjectives] = useState(draft?.business_objectives ?? config?.business_objectives ?? '')
  const [brandVoice, setBrandVoice] = useState(draft?.brand_voice ?? config?.brand_voice ?? '')
  const [tone, setTone] = useState(draft?.tone ?? config?.tone ?? '')
  const [postingFrequency, setPostingFrequency] = useState(draft?.posting_frequency ?? config?.posting_frequency ?? '3x por semana')
  const [contentTypes, setContentTypes] = useState<string[]>(draft?.preferred_content_types ?? config?.preferred_content_types ?? ['reel', 'carrossel', 'foto'])
  const [targetAudience, setTargetAudience] = useState(draft?.target_audience ?? config?.target_audience ?? '')
  const [contentPillars, setContentPillars] = useState<string[]>(draft?.content_pillars ?? config?.content_pillars ?? [])
  const [newPillar, setNewPillar] = useState('')
  const [marketingGoals, setMarketingGoals] = useState(draft?.marketing_goals ?? config?.marketing_goals ?? '')
  const [competitors, setCompetitors] = useState<string[]>(draft?.competitors ?? config?.competitors ?? [])
  const [newCompetitor, setNewCompetitor] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Grava o rascunho a cada mudança — sobrevive a trocar de aba, fechar a
  // tela ou navegar pra outro lugar antes de salvar de verdade.
  useEffect(() => {
    const d: Draft = {
      agent_name: agentName, business_objectives: businessObjectives, brand_voice: brandVoice, tone,
      posting_frequency: postingFrequency, preferred_content_types: contentTypes, target_audience: targetAudience,
      content_pillars: contentPillars, marketing_goals: marketingGoals, competitors,
    }
    try { localStorage.setItem(draftKey(companyId), JSON.stringify(d)) } catch { /* localStorage indisponível — só perde o rascunho, sem quebrar a tela */ }
  }, [companyId, agentName, businessObjectives, brandVoice, tone, postingFrequency, contentTypes, targetAudience, contentPillars, marketingGoals, competitors])

  const toggleType = (t: string) => setContentTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  const addPillar = () => { if (newPillar.trim()) { setContentPillars(prev => [...prev, newPillar.trim()]); setNewPillar('') } }
  const removePillar = (i: number) => setContentPillars(prev => prev.filter((_, idx) => idx !== i))
  const addCompetitor = () => { if (newCompetitor.trim()) { setCompetitors(prev => [...prev, newCompetitor.trim()]); setNewCompetitor('') } }
  const removeCompetitor = (i: number) => setCompetitors(prev => prev.filter((_, idx) => idx !== i))

  const save = async () => {
    setSaving(true)
    setSaved(false)
    const payload = {
      company_id: companyId,
      agent_name: agentName.trim() || 'Agente de Marketing',
      business_objectives: businessObjectives || null,
      brand_voice: brandVoice || null,
      tone: tone || null,
      posting_frequency: postingFrequency,
      preferred_content_types: contentTypes,
      target_audience: targetAudience || null,
      content_pillars: contentPillars,
      marketing_goals: marketingGoals || null,
      competitors,
      updated_at: new Date().toISOString(),
    }
    const { data, error } = await supabase.from('marketing_ai_config').upsert(payload).select('*').single()
    setSaving(false)
    if (!error && data) {
      setSaved(true)
      onSaved(data as MarketingAiConfig)
      try { localStorage.removeItem(draftKey(companyId)) } catch { /* nada a limpar */ }
      setTimeout(() => setSaved(false), 2000)
    }
  }

  return (
    <div>
      {!config && (
        <div style={{ padding: '14px 18px', background: 'rgba(255,109,41,0.06)', border: '1px solid rgba(255,109,41,0.2)', borderRadius: '10px', marginBottom: '20px', fontSize: '12.5px', color: 'white', lineHeight: 1.6 }}>
          👋 Configure abaixo e clique em "Salvar" pra ativar o Marketing AI pra sua empresa. Sem essa configuração, nenhuma coleta ou geração automática roda.
        </div>
      )}

      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '14px', padding: '20px', marginBottom: '16px' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: 'white', marginBottom: '14px' }}>Marca e voz</div>
        <label style={{ display: 'block', fontSize: '11px', color: MUTED, marginBottom: '5px' }}>Nome do agente</label>
        <input value={agentName} onChange={e => setAgentName(e.target.value)} placeholder="Agente de Marketing"
          style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', marginBottom: '14px' }} />
        <label style={{ display: 'block', fontSize: '11px', color: MUTED, marginBottom: '5px' }}>Objetivos de negócio</label>
        <textarea value={businessObjectives} onChange={e => setBusinessObjectives(e.target.value)} rows={2}
          placeholder="Ex: crescer a base de seguidores e converter mais visitas em clientes na loja física."
          style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', resize: 'vertical', fontFamily: D, marginBottom: '14px' }} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: MUTED, marginBottom: '5px' }}>Voz da marca</label>
            <input value={brandVoice} onChange={e => setBrandVoice(e.target.value)} placeholder="Ex: acolhedora, próxima, divertida"
              style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: MUTED, marginBottom: '5px' }}>Tom</label>
            <input value={tone} onChange={e => setTone(e.target.value)} placeholder="Ex: casual, direto, bem-humorado"
              style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
          </div>
        </div>

        <label style={{ display: 'block', fontSize: '11px', color: MUTED, marginBottom: '5px' }}>Público-alvo</label>
        <input value={targetAudience} onChange={e => setTargetAudience(e.target.value)} placeholder="Ex: mulheres de 25-40 anos na região"
          style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
      </div>

      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '14px', padding: '20px', marginBottom: '16px' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: 'white', marginBottom: '14px' }}>Estratégia de conteúdo</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: MUTED, marginBottom: '5px' }}>Frequência de postagem</label>
            <input value={postingFrequency} onChange={e => setPostingFrequency(e.target.value)} style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: MUTED, marginBottom: '5px' }}>Formatos preferidos</label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
              {CONTENT_TYPE_OPTIONS.map(t => (
                <button key={t} onClick={() => toggleType(t)}
                  style={{ padding: '6px 12px', borderRadius: '8px', border: `1px solid ${contentTypes.includes(t) ? 'rgba(255,109,41,0.4)' : BORDER}`, background: contentTypes.includes(t) ? 'rgba(255,109,41,0.1)' : 'transparent', color: contentTypes.includes(t) ? ORANGE : MUTED, fontSize: '11.5px', cursor: 'pointer' }}>
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        <label style={{ display: 'block', fontSize: '11px', color: MUTED, marginBottom: '6px' }}>Pilares de conteúdo</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
          {contentPillars.map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
              <span style={{ flex: 1, fontSize: '12.5px', color: 'white' }}>{p}</span>
              <button onClick={() => removePillar(i)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '14px' }}>×</button>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <input value={newPillar} onChange={e => setNewPillar(e.target.value)} placeholder="Ex: bastidores, promoções, depoimentos..."
            onKeyDown={e => { if (e.key === 'Enter') addPillar() }} style={{ ...inputStyle, flex: 1 }} />
          <button onClick={addPillar} style={{ padding: '8px 16px', background: ORANGE, color: '#000', fontWeight: 700, fontSize: '12px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>+ Adicionar</button>
        </div>

        <label style={{ display: 'block', fontSize: '11px', color: MUTED, marginBottom: '5px' }}>Metas de marketing</label>
        <textarea value={marketingGoals} onChange={e => setMarketingGoals(e.target.value)} rows={2}
          placeholder="Ex: dobrar o engajamento no Instagram em 3 meses."
          style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', resize: 'vertical', fontFamily: D }} />
      </div>

      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '14px', padding: '20px', marginBottom: '16px' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: 'white', marginBottom: '4px' }}>Concorrentes monitorados</div>
        <div style={{ fontSize: '11.5px', color: MUTED, marginBottom: '14px' }}>URL do Instagram de cada concorrente que você quer acompanhar.</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
          {competitors.map((c, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
              <span style={{ flex: 1, fontSize: '12.5px', color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c}</span>
              <button onClick={() => removeCompetitor(i)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '14px' }}>×</button>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input value={newCompetitor} onChange={e => setNewCompetitor(e.target.value)} placeholder="https://instagram.com/concorrente"
            onKeyDown={e => { if (e.key === 'Enter') addCompetitor() }} style={{ ...inputStyle, flex: 1 }} />
          <button onClick={addCompetitor} style={{ padding: '8px 16px', background: ORANGE, color: '#000', fontWeight: 700, fontSize: '12px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>+ Adicionar</button>
        </div>
      </div>

      <div style={{ padding: '12px 14px', background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '9px', fontSize: '11.5px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, marginBottom: '16px' }}>
        🔒 O Marketing AI nunca publica sozinho no Instagram — todo conteúdo gerado fica como rascunho esperando sua aprovação na aba Conteúdo do Marketing AI, igual ao resto da plataforma.
      </div>

      <button onClick={save} disabled={saving}
        style={{ padding: '10px 22px', background: saved ? '#4ade80' : ORANGE, color: '#000', fontWeight: 700, fontSize: '13px', borderRadius: '9px', border: 'none', cursor: 'pointer' }}>
        {saved ? '✓ Salvo' : saving ? 'Salvando...' : config ? 'Salvar configurações' : 'Ativar Marketing AI'}
      </button>
    </div>
  )
}
