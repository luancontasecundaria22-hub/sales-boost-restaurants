import { useEffect, useState, type ReactNode } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

const ORANGE = '#FF6D29'
const BG = '#0E0B0A'
const CARD = '#150E08'
const MUTED = '#BABABA'
const BORDER = 'rgba(255,255,255,0.06)'
const D = "'Bricolage Grotesque', system-ui, sans-serif"

const PRIORITY_KEYS = ['leads', 'marketing', 'retencao', 'avaliacoes', 'seo', 'financeiro'] as const
const PRIORITY_LABELS: Record<string, string> = { marketing: 'Marketing', leads: 'Leads', seo: 'SEO', avaliacoes: 'Avaliações', financeiro: 'Financeiro', retencao: 'Retenção' }

const KPI_OPTIONS: { key: string; label: string }[] = [
  { key: 'instagram', label: 'Instagram' }, { key: 'google_reviews', label: 'Google Reviews' },
  { key: 'conversao', label: 'Conversão' }, { key: 'leads', label: 'Leads' },
  { key: 'faturamento', label: 'Faturamento' }, { key: 'seo', label: 'SEO' },
  { key: 'trafego', label: 'Tráfego' }, { key: 'tempo_resposta', label: 'Tempo de resposta' },
  { key: 'whatsapp', label: 'WhatsApp' }, { key: 'retencao', label: 'Retenção' },
]

const PERSONALITY_OPTIONS: { key: string; label: string; desc: string }[] = [
  { key: 'ceo', label: 'CEO', desc: 'Decisivo, direto ao ponto, orientado a resultado.' },
  { key: 'consultor', label: 'Consultor', desc: 'Explica o raciocínio antes de agir.' },
  { key: 'executivo', label: 'Executivo', desc: 'Rápido, pragmático, foco em execução.' },
  { key: 'especialista', label: 'Especialista', desc: 'Técnico, preciso, cita dados.' },
  { key: 'analista', label: 'Analista', desc: 'Cético com dado fraco, sempre busca evidência.' },
  { key: 'criativo', label: 'Criativo', desc: 'Ousado em ideias, propõe ângulos novos.' },
]

interface Priorities { [k: string]: number }
interface Kpis { [k: string]: boolean }

const FACTORY_DEFAULTS = {
  mission: 'Ser o CEO responsável pelo crescimento dos clientes.',
  personality: 'ceo',
  priorities: { marketing: 90, leads: 100, seo: 70, avaliacoes: 80, financeiro: 30, retencao: 95 } as Priorities,
  globalObjectives: [
    'Sempre melhorar KPIs.', 'Sempre procurar novas oportunidades.', 'Nunca deixar um cliente sem acompanhamento.',
    'Priorizar ações de maior impacto.', 'Agir proativamente.', 'Pensar como um CEO.',
  ],
  kpisMonitored: {
    instagram: true, google_reviews: true, conversao: true, leads: true, faturamento: false,
    seo: true, trafego: false, tempo_resposta: false, whatsapp: false, retencao: true,
  } as Kpis,
  policies: '',
}

function SettingsSection({ title, description, children, defaultOpen = true }: { title: string; description: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '14px', marginBottom: '16px', overflow: 'hidden' }}>
      <div onClick={() => setOpen(o => !o)} style={{ padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'white' }}>{title}</div>
          <div style={{ fontSize: '11.5px', color: MUTED, marginTop: '3px' }}>{description}</div>
        </div>
        <span style={{ color: MUTED, fontSize: '13px', flexShrink: 0, marginLeft: '16px' }}>{open ? '▲' : '▼'}</span>
      </div>
      {open && <div style={{ padding: '0 24px 22px' }}>{children}</div>}
    </div>
  )
}

const inputStyle = { padding: '8px 12px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`, borderRadius: '8px', color: 'white', fontSize: '13px', outline: 'none' } as const

export default function HermesControlCenterPage() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)

  const [mission, setMission] = useState(FACTORY_DEFAULTS.mission)
  const [personality, setPersonality] = useState(FACTORY_DEFAULTS.personality)
  const [priorities, setPriorities] = useState<Priorities>(FACTORY_DEFAULTS.priorities)
  const [globalObjectives, setGlobalObjectives] = useState<string[]>(FACTORY_DEFAULTS.globalObjectives)
  const [newObjective, setNewObjective] = useState('')
  const [kpisMonitored, setKpisMonitored] = useState<Kpis>(FACTORY_DEFAULTS.kpisMonitored)
  const [policies, setPolicies] = useState(FACTORY_DEFAULTS.policies)

  const [companies, setCompanies] = useState<{ id: string; business_name: string; goal: string | null }[]>([])

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!session) return
    void loadAll()
  }, [session])

  const loadAll = async () => {
    setLoading(true)
    const [{ data }, { data: companyRows }] = await Promise.all([
      supabase.from('hermes_config').select('*').eq('id', true).maybeSingle(),
      supabase.from('companies').select('id, business_name, goal').order('business_name'),
    ])
    if (data) {
      setMission(data.mission ?? FACTORY_DEFAULTS.mission)
      setPersonality(data.personality ?? FACTORY_DEFAULTS.personality)
      setPriorities(data.priorities ?? FACTORY_DEFAULTS.priorities)
      setGlobalObjectives(data.global_objectives ?? FACTORY_DEFAULTS.globalObjectives)
      setKpisMonitored(data.kpis_monitored ?? FACTORY_DEFAULTS.kpisMonitored)
      setPolicies(data.policies ?? '')
    }
    setCompanies((companyRows ?? []) as { id: string; business_name: string; goal: string | null }[])
    setLoading(false)
  }

  const saveConfig = async () => {
    setSaving(true)
    setSaved(false)
    const { error } = await supabase.from('hermes_config').update({
      mission, personality, priorities, global_objectives: globalObjectives,
      kpis_monitored: kpisMonitored, policies, updated_at: new Date().toISOString(),
    }).eq('id', true)
    setSaving(false)
    if (!error) { setSaved(true); setTimeout(() => setSaved(false), 2000) }
  }

  const restoreDefaults = () => {
    setMission(FACTORY_DEFAULTS.mission)
    setPersonality(FACTORY_DEFAULTS.personality)
    setPriorities(FACTORY_DEFAULTS.priorities)
    setGlobalObjectives(FACTORY_DEFAULTS.globalObjectives)
    setKpisMonitored(FACTORY_DEFAULTS.kpisMonitored)
    setPolicies('')
  }

  const addObjective = () => {
    if (!newObjective.trim()) return
    setGlobalObjectives(prev => [...prev, newObjective.trim()])
    setNewObjective('')
  }
  const removeObjective = (i: number) => setGlobalObjectives(prev => prev.filter((_, idx) => idx !== i))

  const goBack = () => navigate('/owner')

  return (
    <div style={{ minHeight: '100vh', background: BG }}>
      <div style={{ borderBottom: `1px solid ${BORDER}`, padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={goBack} style={{ background: 'transparent', border: 'none', color: MUTED, fontSize: '18px', cursor: 'pointer', padding: '4px' }}>← Voltar</button>
          <div style={{ width: '1px', height: '20px', background: BORDER }} />
          <span style={{ fontFamily: D, fontSize: '1rem', fontWeight: 800, color: 'white' }}>🧠 Hermes Control Center</span>
        </div>
        <button onClick={goBack} style={{ padding: '7px 16px', background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: '8px', color: MUTED, fontSize: '12px', cursor: 'pointer' }}>
          Fechar
        </button>
      </div>

      <div style={{ padding: '32px', maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontFamily: D, fontSize: '1.6rem', fontWeight: 900, color: 'white', letterSpacing: '-0.03em', marginBottom: '4px' }}>O cérebro do Hermes</h1>
          <p style={{ color: MUTED, fontSize: '13.5px' }}>Isso define como o Hermes pensa e age pra todos os clientes — sem precisar mexer em código. Mudanças só valem depois de "Salvar".</p>
        </div>

        {loading ? (
          <div style={{ color: MUTED, fontSize: '14px', padding: '32px' }}>Carregando...</div>
        ) : (
          <>
            <div onClick={() => navigate('/owner/hermes/estrategia')} style={{ background: CARD, border: '1px solid rgba(255,109,41,0.25)', borderRadius: '14px', marginBottom: '16px', padding: '18px 24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'white' }}>💬 Estratégia</div>
                <div style={{ fontSize: '11.5px', color: MUTED, marginTop: '3px' }}>Converse em linguagem natural sobre como o Hermes deve se comportar — ele propõe a mudança, você aprova.</div>
              </div>
              <span style={{ color: ORANGE, fontSize: '13px', flexShrink: 0, marginLeft: '16px' }}>Abrir →</span>
            </div>

            <div onClick={() => navigate('/owner/agentes')} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '14px', marginBottom: '16px', padding: '18px 24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'white' }}>🤖 Agents Control Center</div>
                <div style={{ fontSize: '11.5px', color: MUTED, marginTop: '3px' }}>Rotinas, limites, aprovações e Capacidades do Executor — o que os agentes podem fazer na prática, separado da missão/estratégia daqui.</div>
              </div>
              <span style={{ color: ORANGE, fontSize: '13px', flexShrink: 0, marginLeft: '16px' }}>Abrir →</span>
            </div>

            <SettingsSection title="Missão e Personalidade" description="Quem o Hermes pensa que é enquanto trabalha.">
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px' }}>Missão</label>
              <textarea value={mission} onChange={e => setMission(e.target.value)} rows={2}
                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', resize: 'vertical', fontFamily: D, marginBottom: '20px' }} />

              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px' }}>Personalidade</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                {PERSONALITY_OPTIONS.map(p => (
                  <button key={p.key} onClick={() => setPersonality(p.key)}
                    style={{ textAlign: 'left', padding: '10px 12px', borderRadius: '9px', border: `1px solid ${personality === p.key ? 'rgba(255,109,41,0.4)' : BORDER}`, background: personality === p.key ? 'rgba(255,109,41,0.1)' : 'rgba(255,255,255,0.02)', cursor: 'pointer' }}>
                    <div style={{ fontSize: '12.5px', fontWeight: 700, color: personality === p.key ? ORANGE : 'white', marginBottom: '2px' }}>{p.label}</div>
                    <div style={{ fontSize: '10.5px', color: MUTED, lineHeight: 1.4 }}>{p.desc}</div>
                  </button>
                ))}
              </div>
            </SettingsSection>

            <SettingsSection title="Prioridades" description="0 a 100 — quanto mais alto, mais atenção e disposição a agir sem confirmar.">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {PRIORITY_KEYS.map(key => (
                  <div key={key}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '12.5px', color: 'white', fontWeight: 600 }}>{PRIORITY_LABELS[key]}</span>
                      <span style={{ fontSize: '12.5px', color: ORANGE, fontWeight: 700 }}>{priorities[key] ?? 0}%</span>
                    </div>
                    <input type="range" min={0} max={100} value={priorities[key] ?? 0}
                      onChange={e => setPriorities(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                      style={{ width: '100%', accentColor: ORANGE }} />
                  </div>
                ))}
              </div>
            </SettingsSection>

            <SettingsSection title="Objetivos Globais" description="Valem pra toda empresa, além do objetivo específico de cada uma.">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
                {globalObjectives.map((obj, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                    <span style={{ flex: 1, fontSize: '12.5px', color: 'white' }}>{obj}</span>
                    <button onClick={() => removeObjective(i)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '14px' }}>×</button>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input value={newObjective} onChange={e => setNewObjective(e.target.value)} placeholder="Novo objetivo global..."
                  onKeyDown={e => { if (e.key === 'Enter') addObjective() }}
                  style={{ ...inputStyle, flex: 1 }} />
                <button onClick={addObjective} style={{ padding: '8px 16px', background: ORANGE, color: '#000', fontWeight: 700, fontSize: '12px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>+ Adicionar</button>
              </div>
            </SettingsSection>

            <SettingsSection title="KPIs Monitorados" description="Quais métricas o Hermes prioriza olhar antes de agir." defaultOpen={false}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {KPI_OPTIONS.map(k => (
                  <label key={k.key} style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '9px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={kpisMonitored[k.key] ?? false} onChange={e => setKpisMonitored(prev => ({ ...prev, [k.key]: e.target.checked }))} />
                    <span style={{ fontSize: '12.5px', color: 'white' }}>{k.label}</span>
                  </label>
                ))}
              </div>
            </SettingsSection>

            <SettingsSection title="Objetivos por Empresa" description="Já existe — cada cliente tem seu próprio objetivo, editável na ficha dele." defaultOpen={false}>
              {companies.length === 0 ? (
                <div style={{ color: MUTED, fontSize: '12.5px' }}>Nenhuma empresa cadastrada ainda.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {companies.map(c => (
                    <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '9px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                      <span style={{ fontSize: '12.5px', color: 'white', fontWeight: 600, flexShrink: 0 }}>{c.business_name}</span>
                      <span style={{ fontSize: '12.5px', color: c.goal ? MUTED : 'rgba(255,255,255,0.3)', textAlign: 'right' }}>{c.goal ?? 'sem objetivo definido'}</span>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={() => navigate('/owner')} style={{ marginTop: '12px', fontSize: '12px', color: ORANGE, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
                Editar objetivo de uma empresa →
              </button>
            </SettingsSection>

            <SettingsSection title="Políticas do Hermes" description="Instruções livres de COMO agir — somam ao resto, não substituem nada." defaultOpen={false}>
              <div style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.45)', marginBottom: '10px', lineHeight: 1.6 }}>
                Ex: "Quando encontrar um problema: descubra a causa, calcule o impacto, procure a solução, revise, e explique por que decidiu agir." Ou: "Sempre prefira ações de maior ROI. Sempre explique por que tomou uma decisão."
              </div>
              <textarea value={policies} onChange={e => setPolicies(e.target.value)}
                placeholder="Escreva em texto livre as políticas que o Hermes deve seguir..."
                rows={5}
                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', resize: 'vertical', fontFamily: D }} />
            </SettingsSection>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '8px', paddingTop: '8px' }}>
              <button onClick={saveConfig} disabled={saving}
                style={{ padding: '10px 22px', background: saved ? '#4ade80' : ORANGE, color: '#000', fontWeight: 700, fontSize: '13px', borderRadius: '9px', border: 'none', cursor: 'pointer' }}>
                {saved ? '✓ Salvo' : saving ? 'Salvando...' : 'Salvar configurações'}
              </button>
              <button onClick={restoreDefaults}
                style={{ padding: '10px 18px', background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: '9px', color: MUTED, fontSize: '13px', cursor: 'pointer' }}>
                Restaurar padrões
              </button>
              <button onClick={goBack}
                style={{ padding: '10px 18px', background: 'transparent', border: 'none', borderRadius: '9px', color: 'rgba(255,255,255,0.4)', fontSize: '13px', cursor: 'pointer' }}>
                Cancelar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
