import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { ORANGE, MUTED, BORDER, D, inputStyle, type MarketingAiConfig } from '../dashboard/marketingAi/shared'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const CONTENT_TYPE_OPTIONS = ['reel', 'carrossel', 'foto', 'story']

interface CompanyLite { id: string; business_name: string }
interface BusinessDna {
  mission?: string; brand_voice?: string; target_audience?: string; differentiators?: string; values?: string[]
}

// Config do Marketing AI POR EMPRESA, editada pelo owner. Só pede o que o
// Business DNA (ficha da empresa em /owner) não cobre — voz da marca e
// público-alvo vêm de lá automaticamente (fonte única), então não são pedidos
// de novo aqui. O owner-company-activity grava com service role e deriva esses
// campos do DNA no momento do save.
export default function CompanyMarketingAiSection() {
  const { session } = useAuth()
  const [companies, setCompanies] = useState<CompanyLite[]>([])
  const [companyId, setCompanyId] = useState('')
  const [dna, setDna] = useState<BusinessDna | null>(null)
  const [loading, setLoading] = useState(false)
  const [hasConfig, setHasConfig] = useState(false)

  const [agentName, setAgentName] = useState('Agente de Marketing')
  const [postingFrequency, setPostingFrequency] = useState('3x por semana')
  const [contentTypes, setContentTypes] = useState<string[]>(['reel', 'carrossel', 'foto'])
  const [contentPillars, setContentPillars] = useState<string[]>([])
  const [newPillar, setNewPillar] = useState('')
  const [marketingGoals, setMarketingGoals] = useState('')
  const [competitors, setCompetitors] = useState<string[]>([])
  const [newCompetitor, setNewCompetitor] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    void supabase.from('companies').select('id, business_name').order('business_name')
      .then(({ data }) => setCompanies((data ?? []) as CompanyLite[]))
  }, [])

  useEffect(() => {
    if (!companyId || !session) { setDna(null); return }
    void loadCompany()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, session])

  const loadCompany = async () => {
    setLoading(true)
    setSaved(false)
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/owner-company-activity`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session!.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: companyId, limit: 1 }),
      })
      const data = await res.json() as { company?: { business_dna: BusinessDna | null }; marketing_ai?: MarketingAiConfig | null }
      setDna(data.company?.business_dna ?? {})
      const cfg = data.marketing_ai ?? null
      setHasConfig(!!cfg)
      setAgentName(cfg?.agent_name ?? 'Agente de Marketing')
      setPostingFrequency(cfg?.posting_frequency ?? '3x por semana')
      setContentTypes(cfg?.preferred_content_types ?? ['reel', 'carrossel', 'foto'])
      setContentPillars(cfg?.content_pillars ?? [])
      setMarketingGoals(cfg?.marketing_goals ?? '')
      setCompetitors(cfg?.competitors ?? [])
    } catch { /* deixa os defaults — o owner ainda consegue preencher e salvar */ }
    setLoading(false)
  }

  const toggleType = (t: string) => setContentTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  const addPillar = () => { if (newPillar.trim()) { setContentPillars(prev => [...prev, newPillar.trim()]); setNewPillar('') } }
  const removePillar = (i: number) => setContentPillars(prev => prev.filter((_, idx) => idx !== i))
  const addCompetitor = () => { if (newCompetitor.trim()) { setCompetitors(prev => [...prev, newCompetitor.trim()]); setNewCompetitor('') } }
  const removeCompetitor = (i: number) => setCompetitors(prev => prev.filter((_, idx) => idx !== i))

  const save = async () => {
    if (!companyId) return
    setSaving(true)
    setSaved(false)
    const res = await fetch(`${SUPABASE_URL}/functions/v1/owner-company-activity`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session!.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company_id: companyId,
        action: 'update_marketing_ai',
        marketing_ai: {
          agent_name: agentName.trim() || 'Agente de Marketing',
          posting_frequency: postingFrequency,
          preferred_content_types: contentTypes,
          content_pillars: contentPillars,
          marketing_goals: marketingGoals || null,
          competitors,
        },
      }),
    })
    setSaving(false)
    if (res.ok) {
      setHasConfig(true)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  const dnaFilled = !!(dna && (dna.brand_voice || dna.target_audience || dna.mission || dna.differentiators))

  return (
    <div>
      <div style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.45)', marginBottom: '14px', lineHeight: 1.6 }}>
        Configura o agente de marketing de cada empresa. Voz da marca e público-alvo vêm do Business DNA (ficha da empresa em /owner) — aqui você só ajusta o operacional (nome, frequência, formatos, pilares, metas, concorrentes).
      </div>

      <label style={{ display: 'block', fontSize: '11px', color: MUTED, marginBottom: '5px' }}>Empresa</label>
      <select value={companyId} onChange={e => setCompanyId(e.target.value)} style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', marginBottom: '18px', cursor: 'pointer' }}>
        <option value="">Selecione uma empresa…</option>
        {companies.map(c => <option key={c.id} value={c.id}>{c.business_name}</option>)}
      </select>

      {!companyId ? (
        <div style={{ color: MUTED, fontSize: '12.5px' }}>Escolha uma empresa acima para configurar o Marketing AI dela.</div>
      ) : loading ? (
        <div style={{ color: MUTED, fontSize: '12.5px' }}>Carregando…</div>
      ) : (
        <>
          {/* Herdado do Business DNA — read-only, pra não repetir */}
          {dnaFilled ? (
            <div style={{ padding: '13px 16px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${BORDER}`, borderRadius: '10px', marginBottom: '18px' }}>
              <div style={{ fontSize: '10.5px', fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>🧬 Herdado do Business DNA</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <div style={{ display: 'flex', gap: '8px', fontSize: '12px' }}>
                  <span style={{ color: MUTED, width: '90px', flexShrink: 0 }}>Voz da marca</span>
                  <span style={{ color: 'white' }}>{dna?.brand_voice || '—'}</span>
                </div>
                <div style={{ display: 'flex', gap: '8px', fontSize: '12px' }}>
                  <span style={{ color: MUTED, width: '90px', flexShrink: 0 }}>Público-alvo</span>
                  <span style={{ color: 'white' }}>{dna?.target_audience || '—'}</span>
                </div>
              </div>
              <div style={{ fontSize: '10.5px', color: 'rgba(255,255,255,0.35)', marginTop: '8px' }}>
                Pra mudar isso, edite o Business DNA na ficha da empresa em /owner.
              </div>
            </div>
          ) : (
            <div style={{ padding: '13px 16px', background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: '10px', marginBottom: '18px', fontSize: '12px', color: 'white', lineHeight: 1.6 }}>
              ⚠️ Essa empresa ainda não tem <strong>Business DNA</strong> preenchido (voz, público, missão). Preencha primeiro na ficha da empresa em /owner — é de lá que o agente puxa a personalidade da marca.
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: MUTED, marginBottom: '5px' }}>Nome do agente</label>
              <input value={agentName} onChange={e => setAgentName(e.target.value)} placeholder="Agente de Marketing" style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: MUTED, marginBottom: '5px' }}>Frequência de postagem</label>
              <input value={postingFrequency} onChange={e => setPostingFrequency(e.target.value)} style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
            </div>
          </div>

          <label style={{ display: 'block', fontSize: '11px', color: MUTED, marginBottom: '5px' }}>Formatos preferidos</label>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
            {CONTENT_TYPE_OPTIONS.map(t => (
              <button key={t} onClick={() => toggleType(t)}
                style={{ padding: '6px 12px', borderRadius: '8px', border: `1px solid ${contentTypes.includes(t) ? 'rgba(255,109,41,0.4)' : BORDER}`, background: contentTypes.includes(t) ? 'rgba(255,109,41,0.1)' : 'transparent', color: contentTypes.includes(t) ? ORANGE : MUTED, fontSize: '11.5px', cursor: 'pointer' }}>
                {t}
              </button>
            ))}
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
            <input value={newPillar} onChange={e => setNewPillar(e.target.value)} placeholder="Ex: bastidores, promoções, depoimentos…"
              onKeyDown={e => { if (e.key === 'Enter') addPillar() }} style={{ ...inputStyle, flex: 1 }} />
            <button onClick={addPillar} style={{ padding: '8px 16px', background: ORANGE, color: '#000', fontWeight: 700, fontSize: '12px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>+ Adicionar</button>
          </div>

          <label style={{ display: 'block', fontSize: '11px', color: MUTED, marginBottom: '5px' }}>Metas de marketing</label>
          <textarea value={marketingGoals} onChange={e => setMarketingGoals(e.target.value)} rows={2}
            placeholder="Ex: dobrar o engajamento no Instagram em 3 meses."
            style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', resize: 'vertical', fontFamily: D, marginBottom: '16px' }} />

          <label style={{ display: 'block', fontSize: '11px', color: MUTED, marginBottom: '6px' }}>Concorrentes monitorados (URL do Instagram)</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
            {competitors.map((c, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                <span style={{ flex: 1, fontSize: '12.5px', color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c}</span>
                <button onClick={() => removeCompetitor(i)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '14px' }}>×</button>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
            <input value={newCompetitor} onChange={e => setNewCompetitor(e.target.value)} placeholder="https://instagram.com/concorrente"
              onKeyDown={e => { if (e.key === 'Enter') addCompetitor() }} style={{ ...inputStyle, flex: 1 }} />
            <button onClick={addCompetitor} style={{ padding: '8px 16px', background: ORANGE, color: '#000', fontWeight: 700, fontSize: '12px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>+ Adicionar</button>
          </div>

          <button onClick={save} disabled={saving}
            style={{ padding: '10px 22px', background: saved ? '#4ade80' : ORANGE, color: '#000', fontWeight: 700, fontSize: '13px', borderRadius: '9px', border: 'none', cursor: 'pointer' }}>
            {saved ? '✓ Salvo' : saving ? 'Salvando…' : hasConfig ? 'Salvar configurações' : 'Ativar Marketing AI'}
          </button>
        </>
      )}
    </div>
  )
}
