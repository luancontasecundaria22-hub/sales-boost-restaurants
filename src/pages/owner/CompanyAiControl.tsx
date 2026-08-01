import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const ORANGE = '#FF6D29'
const CARD = '#150E08'
const MUTED = '#BABABA'
const BORDER = 'rgba(255,255,255,0.06)'
const GREEN = '#4ade80'
const D = "'Bricolage Grotesque', system-ui, sans-serif"

export type AiMode = 'economy' | 'balanced' | 'performance' | 'unlimited'
export const MODE_META: Record<AiMode, { label: string; icon: string; desc: string; freq: number; reserve: number }> = {
  economy: { label: 'Economia', icon: '🪙', desc: 'Menor custo. Pensa só quando necessário, reaproveita análises, agrupa tarefas.', freq: 360, reserve: 10 },
  balanced: { label: 'Equilibrado', icon: '⚖️', desc: 'Padrão. Raciocínio e autonomia moderados, boa qualidade.', freq: 120, reserve: 20 },
  performance: { label: 'Performance', icon: '🚀', desc: 'Mais inteligência: monitora com mais frequência, analisa mais fundo, reage mais rápido.', freq: 30, reserve: 25 },
  unlimited: { label: 'Ilimitado', icon: '♾️', desc: 'Sem teto de custo. Só pra planos premium.', freq: 15, reserve: 30 },
}

const FREQ_OPTIONS: { v: number; label: string }[] = [
  { v: 15, label: 'A cada 15 min' }, { v: 30, label: 'A cada 30 min' }, { v: 60, label: 'A cada hora' },
  { v: 120, label: 'A cada 2 horas' }, { v: 360, label: 'A cada 6 horas' }, { v: 720, label: '2x por dia' }, { v: 1440, label: '1x por dia' },
]

interface PlanDefaults { plan: string; mode: AiMode; monthly_budget_usd: number; daily_budget_usd: number; think_frequency_min: number; learning_reserve_pct: number }
interface CompanySettings { mode: AiMode | null; monthly_budget_usd: number | null; daily_budget_usd: number | null; think_frequency_min: number | null; learning_reserve_pct: number | null; paused: boolean }

const numInput = { width: '100%', boxSizing: 'border-box' as const, padding: '9px 12px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`, borderRadius: '8px', color: 'white', fontSize: '13px', outline: 'none', fontFamily: D }
const lbl = { display: 'block', fontSize: '10.5px', color: MUTED, marginBottom: '5px', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }

export default function CompanyAiControl({ companyId, plan }: { companyId: string; plan: string }) {
  const [planDef, setPlanDef] = useState<PlanDefaults | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [hasRow, setHasRow] = useState(false)

  const [mode, setMode] = useState<AiMode>('balanced')
  const [monthly, setMonthly] = useState('')
  const [daily, setDaily] = useState('')
  const [freq, setFreq] = useState(120)
  const [reserve, setReserve] = useState(20)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    const planKey = (plan || 'free').toLowerCase()
    Promise.all([
      supabase.from('plan_ai_defaults').select('*').eq('plan', planKey).maybeSingle(),
      supabase.from('company_ai_settings').select('*').eq('company_id', companyId).maybeSingle(),
    ]).then(([planRes, coRes]) => {
      const pd = (planRes.data as PlanDefaults | null) ?? { plan: planKey, mode: 'balanced', monthly_budget_usd: 10, daily_budget_usd: 1.5, think_frequency_min: 120, learning_reserve_pct: 20 }
      setPlanDef(pd)
      const co = coRes.data as CompanySettings | null
      setHasRow(!!co)
      const m = (co?.mode ?? pd.mode) as AiMode
      setMode(m)
      setMonthly(co?.monthly_budget_usd != null ? String(co.monthly_budget_usd) : String(pd.monthly_budget_usd))
      setDaily(co?.daily_budget_usd != null ? String(co.daily_budget_usd) : String(pd.daily_budget_usd))
      setFreq(co?.think_frequency_min ?? pd.think_frequency_min)
      setReserve(co?.learning_reserve_pct ?? pd.learning_reserve_pct)
      setPaused(co?.paused ?? false)
      setLoading(false)
    })
  }, [companyId, plan])

  const pickMode = (m: AiMode) => { setMode(m); setFreq(MODE_META[m].freq); setReserve(MODE_META[m].reserve) }

  const save = async () => {
    setSaving(true); setSaved(false)
    const { error } = await supabase.from('company_ai_settings').upsert({
      company_id: companyId, mode,
      monthly_budget_usd: monthly === '' ? null : Number(monthly),
      daily_budget_usd: daily === '' ? null : Number(daily),
      think_frequency_min: freq, learning_reserve_pct: reserve, paused,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'company_id' })
    setSaving(false)
    if (!error) { setHasRow(true); setSaved(true); setTimeout(() => setSaved(false), 2200) }
  }

  const resetToPlan = async () => {
    setSaving(true)
    await supabase.from('company_ai_settings').delete().eq('company_id', companyId)
    if (planDef) { setMode(planDef.mode); setMonthly(String(planDef.monthly_budget_usd)); setDaily(String(planDef.daily_budget_usd)); setFreq(planDef.think_frequency_min); setReserve(planDef.learning_reserve_pct); setPaused(false) }
    setHasRow(false); setSaving(false)
  }

  if (loading) return <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '14px', padding: '22px', marginBottom: '20px', color: MUTED, fontSize: '13px' }}>Carregando controle de custo…</div>

  const unlimited = mode === 'unlimited'

  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '14px', padding: '22px', marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px', flexWrap: 'wrap' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: 'white' }}>💰 Controle de custo da IA</div>
        <span style={{ fontSize: '9.5px', fontWeight: 700, color: hasRow ? ORANGE : MUTED, background: hasRow ? 'rgba(255,109,41,0.1)' : 'rgba(255,255,255,0.05)', border: `1px solid ${hasRow ? 'rgba(255,109,41,0.3)' : BORDER}`, borderRadius: '99px', padding: '2px 9px' }}>
          {hasRow ? 'Personalizado' : `Herdando do plano ${(plan || 'free')}`}
        </span>
      </div>
      <div style={{ fontSize: '11px', color: MUTED, marginBottom: '18px', lineHeight: 1.5 }}>
        Quanto de inteligência essa empresa pode consumir por ciclo. Deixe como está pra herdar o plano, ou personalize. O ciclo automático respeita estes limites e pausa sozinho quando o orçamento acaba.
      </div>

      {paused && (
        <div style={{ padding: '10px 13px', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: '9px', fontSize: '12px', color: 'white', marginBottom: '16px' }}>
          ⛔ <strong style={{ color: '#f87171' }}>IA pausada</strong> pra essa empresa — só operações essenciais continuam.
        </div>
      )}

      {/* Modos */}
      <div style={{ ...lbl, marginBottom: '8px' }}>Modo de operação</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px', marginBottom: '18px' }}>
        {(Object.keys(MODE_META) as AiMode[]).map(m => {
          const on = mode === m
          const meta = MODE_META[m]
          return (
            <button key={m} onClick={() => pickMode(m)}
              style={{ textAlign: 'left', background: on ? 'rgba(255,109,41,0.1)' : 'rgba(255,255,255,0.02)', border: `1px solid ${on ? 'rgba(255,109,41,0.4)' : BORDER}`, borderRadius: '10px', padding: '11px 13px', cursor: 'pointer', fontFamily: D }}>
              <div style={{ fontSize: '12.5px', fontWeight: 700, color: on ? ORANGE : 'white', marginBottom: '3px' }}>{meta.icon} {meta.label}</div>
              <div style={{ fontSize: '10px', color: MUTED, lineHeight: 1.45 }}>{meta.desc}</div>
            </button>
          )
        })}
      </div>

      {/* Orçamentos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '14px', marginBottom: '16px' }}>
        <div>
          <label style={lbl}>Orçamento mensal (US$)</label>
          <input type="number" min="0" step="1" value={unlimited ? '' : monthly} disabled={unlimited} onChange={e => setMonthly(e.target.value)} placeholder={unlimited ? 'ilimitado' : '0 = ilimitado'} style={{ ...numInput, opacity: unlimited ? 0.5 : 1 }} />
        </div>
        <div>
          <label style={lbl}>Orçamento diário (US$)</label>
          <input type="number" min="0" step="0.5" value={unlimited ? '' : daily} disabled={unlimited} onChange={e => setDaily(e.target.value)} placeholder={unlimited ? 'ilimitado' : '0 = ilimitado'} style={{ ...numInput, opacity: unlimited ? 0.5 : 1 }} />
        </div>
        <div>
          <label style={lbl}>Frequência de raciocínio</label>
          <select value={freq} onChange={e => setFreq(Number(e.target.value))} style={{ ...numInput, appearance: 'none' }}>
            {FREQ_OPTIONS.map(o => <option key={o.v} value={o.v} style={{ background: '#150E08' }}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>Reserva p/ melhorias (%)</label>
          <input type="number" min="0" max="100" step="5" value={reserve} onChange={e => setReserve(Number(e.target.value))} style={numInput} />
        </div>
      </div>

      <div style={{ fontSize: '10.5px', color: MUTED, lineHeight: 1.5, marginBottom: '16px' }}>
        A <strong style={{ color: 'white' }}>reserva pra melhorias</strong> guarda parte do orçamento pra IA buscar oportunidades, concorrentes e ideias novas por conta própria. Quando acaba, essas atividades proativas pausam — as essenciais (responder cliente, review negativa) continuam.
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: '11px', padding: '11px 14px', borderRadius: '10px', border: `1px solid ${paused ? 'rgba(248,113,113,0.3)' : BORDER}`, background: paused ? 'rgba(248,113,113,0.06)' : 'rgba(255,255,255,0.02)', cursor: 'pointer', marginBottom: '18px' }}>
        <input type="checkbox" checked={paused} onChange={e => setPaused(e.target.checked)} style={{ width: '16px', height: '16px', accentColor: '#f87171' }} />
        <div>
          <div style={{ fontSize: '12.5px', fontWeight: 700, color: paused ? '#f87171' : 'white' }}>Pausar IA desta empresa</div>
          <div style={{ fontSize: '10.5px', color: MUTED }}>Para todo raciocínio autônomo. Só o essencial continua. Use em emergência de custo.</div>
        </div>
      </label>

      {planDef && (
        <div style={{ fontSize: '10.5px', color: MUTED, marginBottom: '16px', padding: '9px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', lineHeight: 1.6 }}>
          Padrão do plano <strong style={{ color: 'white' }}>{planDef.plan}</strong>: modo {MODE_META[planDef.mode]?.label ?? planDef.mode}, US$ {planDef.monthly_budget_usd}/mês · US$ {planDef.daily_budget_usd}/dia.
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={save} disabled={saving} style={{ padding: '10px 22px', background: saved ? GREEN : ORANGE, color: '#000', fontWeight: 700, fontSize: '13px', borderRadius: '9px', border: 'none', cursor: saving ? 'default' : 'pointer', fontFamily: D }}>
          {saved ? '✓ Salvo' : saving ? 'Salvando…' : 'Salvar controle de custo'}
        </button>
        {hasRow && (
          <button onClick={resetToPlan} disabled={saving} style={{ padding: '10px 18px', background: 'transparent', border: `1px solid ${BORDER}`, color: MUTED, fontWeight: 700, fontSize: '12px', borderRadius: '9px', cursor: 'pointer', fontFamily: D }}>
            Voltar ao padrão do plano
          </button>
        )}
      </div>
    </div>
  )
}
