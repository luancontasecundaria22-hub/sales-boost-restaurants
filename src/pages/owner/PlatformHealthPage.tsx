import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

const ORANGE = '#FF6D29'
const BG = '#0E0B0A'
const CARD = '#150E08'
const MUTED = '#BABABA'
const BORDER = 'rgba(255,255,255,0.06)'
const D = "'Bricolage Grotesque', system-ui, sans-serif"
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string

const STATUS_META: Record<string, { label: string; color: string }> = {
  ok: { label: 'Operacional', color: '#4ade80' },
  degraded: { label: 'Degradado', color: '#FBBF24' },
  down: { label: 'Fora do ar', color: '#f87171' },
  unknown: { label: 'Sem dados', color: '#6b7280' },
}
const SEV_META: Record<string, { label: string; color: string }> = {
  info: { label: 'Info', color: '#60a5fa' },
  warning: { label: 'Atenção', color: '#FBBF24' },
  critical: { label: 'Crítico', color: '#f87171' },
}
const CAT_LABEL: Record<string, string> = {
  infra: 'Infraestrutura', database: 'Banco de dados', ai: 'Serviços de IA', integration: 'Integrações',
  edge_function: 'Edge Functions', worker: 'Workers', agent: 'Agentes', cron: 'Jobs agendados', external_api: 'APIs externas',
}
const STATUS_SCORE: Record<string, number> = { ok: 100, degraded: 55, down: 0 }

interface Service { key: string; name: string; category: string; critical: boolean; check_type: string; enabled: boolean }
interface Check { service_key: string; status: string; latency_ms: number | null; detail: string | null; checked_at: string }
interface Incident {
  id: string; service_key: string; severity: string; title: string; what_happened: string | null; affected: string | null
  impact: string | null; root_cause: string | null; suggested_fix: string | null; preventive: string | null; priority: string | null
  auto_recoverable: boolean; recovery_status: string; correlated_change: string | null; status: string; created_at: string; resolved_at: string | null
}
interface Config {
  enabled: boolean; frequency_min: number; auto_recovery: boolean; notify_dashboard: boolean; notify_telegram: boolean; notify_email: boolean
  admin_telegram_chat_id: string | null; incident_retention_days: number; latency_warn_ms: number; latency_crit_ms: number
  error_rate_warn: number; error_rate_crit: number; daily_cost_alert_usd: number; last_run_at: string | null
}

const num = { width: '100%', boxSizing: 'border-box' as const, padding: '8px 11px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`, borderRadius: '8px', color: 'white', fontSize: '13px', outline: 'none', fontFamily: D }
const lbl = { display: 'block', fontSize: '10px', color: MUTED, marginBottom: '5px', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }

function timeAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 1) return 'agora'; if (m < 60) return `${m}min atrás`
  const h = Math.floor(m / 60); if (h < 24) return `${h}h atrás`
  return `${Math.floor(h / 24)}d atrás`
}

export default function PlatformHealthPage() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [services, setServices] = useState<Service[]>([])
  const [checks, setChecks] = useState<Check[]>([])
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [cfg, setCfg] = useState<Config | null>(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [savingCfg, setSavingCfg] = useState(false)
  const [openInc, setOpenInc] = useState<string | null>(null)

  // filtros
  const [fSeverity, setFSeverity] = useState('all')
  const [fCategory, setFCategory] = useState('all')
  const [fDays, setFDays] = useState(7)

  const load = async () => {
    const [svc, chk, inc, cf] = await Promise.all([
      supabase.from('platform_services').select('*').order('category'),
      supabase.from('platform_health_checks').select('service_key, status, latency_ms, detail, checked_at').order('checked_at', { ascending: false }).limit(400),
      supabase.from('platform_incidents').select('*').order('created_at', { ascending: false }).limit(120),
      supabase.from('monitor_config').select('*').eq('id', true).maybeSingle(),
    ])
    setServices((svc.data as Service[]) ?? [])
    setChecks((chk.data as Check[]) ?? [])
    setIncidents((inc.data as Incident[]) ?? [])
    setCfg((cf.data as Config) ?? null)
    setLoading(false)
  }
  useEffect(() => { load() /* eslint-disable-next-line */ }, [])

  const latestByService = useMemo(() => {
    const m = new Map<string, Check>()
    for (const c of checks) if (!m.has(c.service_key)) m.set(c.service_key, c)
    return m
  }, [checks])

  const health = useMemo(() => {
    let sum = 0, weight = 0
    for (const s of services) {
      if (!s.enabled) continue
      const st = latestByService.get(s.key)?.status
      if (!st || st === 'unknown' || !(st in STATUS_SCORE)) continue
      const w = s.critical ? 2 : 1
      sum += STATUS_SCORE[st] * w; weight += w
    }
    return weight ? Math.round(sum / weight) : null
  }, [services, latestByService])

  const openIncidents = incidents.filter(i => i.status === 'open')
  const filteredIncidents = useMemo(() => {
    const cutoff = Date.now() - fDays * 24 * 60 * 60 * 1000
    return incidents.filter(i =>
      (fSeverity === 'all' || i.severity === fSeverity) &&
      (fCategory === 'all' || services.find(s => s.key === i.service_key)?.category === fCategory) &&
      new Date(i.created_at).getTime() >= cutoff)
  }, [incidents, fSeverity, fCategory, fDays, services])

  const byCategory = useMemo(() => {
    const g = new Map<string, Service[]>()
    for (const s of services) { const a = g.get(s.category) ?? []; a.push(s); g.set(s.category, a) }
    return [...g.entries()]
  }, [services])

  const runNow = async () => {
    if (!session) return
    setRunning(true)
    try {
      await fetch(`${SUPABASE_URL}/functions/v1/platform-monitor`, { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: '{}' })
    } catch { /* ignore */ }
    await load(); setRunning(false)
  }

  const saveCfg = async () => {
    if (!cfg) return
    setSavingCfg(true)
    await supabase.from('monitor_config').update({ ...cfg, updated_at: new Date().toISOString() }).eq('id', true)
    setSavingCfg(false)
  }
  const setC = (patch: Partial<Config>) => setCfg(c => c ? { ...c, ...patch } : c)

  const healthColor = health == null ? MUTED : health >= 90 ? '#4ade80' : health >= 70 ? '#FBBF24' : '#f87171'

  if (loading) return <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', color: MUTED }}>Carregando saúde da plataforma…</div>

  return (
    <div style={{ minHeight: '100vh', background: BG, color: 'white' }}>
      <div style={{ borderBottom: `1px solid ${BORDER}`, padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => navigate('/owner')} style={{ background: 'transparent', border: 'none', color: MUTED, fontSize: '15px', cursor: 'pointer' }}>← Voltar</button>
          <span style={{ fontFamily: D, fontSize: '1.05rem', fontWeight: 800 }}>🛡️ Platform Monitor</span>
        </div>
        <button onClick={runNow} disabled={running} style={{ padding: '8px 16px', background: ORANGE, color: '#000', fontWeight: 700, fontSize: '12.5px', borderRadius: '9px', border: 'none', cursor: running ? 'default' : 'pointer', fontFamily: D }}>
          {running ? 'Verificando…' : '↻ Verificar agora'}
        </button>
      </div>

      <div style={{ padding: '28px 32px', maxWidth: '1180px', margin: '0 auto' }}>
        {/* Health score */}
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap', background: CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '22px 26px', marginBottom: '22px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '46px', fontWeight: 900, color: healthColor, lineHeight: 1 }}>{health ?? '—'}</div>
            <div style={{ fontSize: '11px', color: MUTED, marginTop: '4px' }}>Saúde geral</div>
          </div>
          <div style={{ flex: 1, minWidth: '240px' }}>
            <div style={{ fontSize: '13px', color: 'white', fontWeight: 700, marginBottom: '4px' }}>
              {health == null ? 'Aguardando primeira verificação' : health >= 90 ? 'Plataforma saudável' : health >= 70 ? 'Alguns pontos de atenção' : 'Requer ação'}
            </div>
            <div style={{ fontSize: '12px', color: MUTED, lineHeight: 1.5 }}>
              {openIncidents.length > 0 ? `${openIncidents.length} incidente(s) aberto(s).` : 'Nenhum incidente aberto.'} Última verificação: {cfg?.last_run_at ? timeAgo(cfg.last_run_at) : 'nunca'}. Frequência: a cada {cfg?.frequency_min ?? '—'}min.
            </div>
          </div>
        </div>

        {/* Serviços por categoria */}
        <SectionTitle>Status dos serviços</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px', marginBottom: '28px' }}>
          {byCategory.map(([cat, list]) => (
            <div key={cat} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '13px', padding: '14px 16px' }}>
              <div style={{ fontSize: '10.5px', fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>{CAT_LABEL[cat] ?? cat}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {list.map(s => {
                  const chk = latestByService.get(s.key)
                  const st = STATUS_META[chk?.status ?? 'unknown'] ?? STATUS_META.unknown
                  return (
                    <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                      <span style={{ width: '9px', height: '9px', borderRadius: '99px', background: st.color, flexShrink: 0, boxShadow: `0 0 8px ${st.color}66` }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '12.5px', color: 'white', fontWeight: 600 }}>{s.name} {s.critical && <span style={{ fontSize: '8.5px', color: '#f87171', fontWeight: 700 }}>CRÍTICO</span>}</div>
                        {chk?.detail && <div style={{ fontSize: '10px', color: MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{chk.detail}</div>}
                      </div>
                      <span style={{ fontSize: '10px', fontWeight: 700, color: st.color, flexShrink: 0 }}>{st.label}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <SectionTitle>Incidentes</SectionTitle>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '14px', alignItems: 'flex-end' }}>
          <div><div style={lbl}>Severidade</div><select value={fSeverity} onChange={e => setFSeverity(e.target.value)} style={{ ...num, width: 'auto', appearance: 'none' }}><option value="all" style={{ background: CARD }}>Todas</option>{Object.entries(SEV_META).map(([k, v]) => <option key={k} value={k} style={{ background: CARD }}>{v.label}</option>)}</select></div>
          <div><div style={lbl}>Serviço/Categoria</div><select value={fCategory} onChange={e => setFCategory(e.target.value)} style={{ ...num, width: 'auto', appearance: 'none' }}><option value="all" style={{ background: CARD }}>Todos</option>{Object.entries(CAT_LABEL).map(([k, v]) => <option key={k} value={k} style={{ background: CARD }}>{v}</option>)}</select></div>
          <div><div style={lbl}>Período</div><select value={fDays} onChange={e => setFDays(Number(e.target.value))} style={{ ...num, width: 'auto', appearance: 'none' }}>{[1, 7, 30, 90].map(d => <option key={d} value={d} style={{ background: CARD }}>Últimos {d} dias</option>)}</select></div>
        </div>

        {filteredIncidents.length === 0 ? (
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '13px', padding: '26px', textAlign: 'center', color: MUTED, fontSize: '13px', marginBottom: '28px' }}>✓ Nenhum incidente no período.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', marginBottom: '28px' }}>
            {filteredIncidents.map(inc => {
              const sev = SEV_META[inc.severity] ?? SEV_META.info
              const isOpen = openInc === inc.id
              return (
                <div key={inc.id} style={{ background: CARD, border: `1px solid ${inc.status === 'open' ? `${sev.color}44` : BORDER}`, borderRadius: '12px', overflow: 'hidden', opacity: inc.status === 'resolved' ? 0.75 : 1 }}>
                  <button onClick={() => setOpenInc(isOpen ? null : inc.id)} style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer', padding: '13px 15px', display: 'flex', alignItems: 'center', gap: '10px', fontFamily: D }}>
                    <span style={{ fontSize: '9px', fontWeight: 700, color: sev.color, background: `${sev.color}18`, border: `1px solid ${sev.color}44`, borderRadius: '99px', padding: '2px 8px', flexShrink: 0 }}>{sev.label}</span>
                    <span style={{ flex: 1, fontSize: '12.5px', fontWeight: 700, color: 'white' }}>{inc.title}</span>
                    {inc.status === 'resolved' ? <span style={{ fontSize: '9.5px', color: '#4ade80', flexShrink: 0 }}>✓ resolvido</span> : <span style={{ fontSize: '9.5px', color: '#f87171', flexShrink: 0 }}>● aberto</span>}
                    <span style={{ fontSize: '10px', color: MUTED, flexShrink: 0 }}>{timeAgo(inc.created_at)}</span>
                  </button>
                  {isOpen && (
                    <div style={{ padding: '2px 15px 15px', borderTop: `1px solid ${BORDER}`, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '11px', fontSize: '12px' }}>
                      <IncField label="O que aconteceu">{inc.what_happened}</IncField>
                      <IncField label="Serviços afetados">{inc.affected}</IncField>
                      <IncField label="Impacto">{inc.impact}</IncField>
                      <IncField label="Causa provável">{inc.root_cause}</IncField>
                      <IncField label="Correção sugerida" accent>{inc.suggested_fix}</IncField>
                      <IncField label="Ação preventiva">{inc.preventive}</IncField>
                      <IncField label="Prioridade">{inc.priority}</IncField>
                      <IncField label="Recuperação">{inc.auto_recoverable ? `Automática possível · ${inc.recovery_status}` : `Manual · ${inc.recovery_status}`}</IncField>
                      {inc.correlated_change && <IncField label="Correlação">{inc.correlated_change}</IncField>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Config */}
        {cfg && (
          <>
            <SectionTitle>Configuração (Control Center)</SectionTitle>
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '14px', padding: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', cursor: 'pointer' }}>
                <input type="checkbox" checked={cfg.enabled} onChange={e => setC({ enabled: e.target.checked })} style={{ width: '16px', height: '16px', accentColor: ORANGE }} />
                <span style={{ fontSize: '13px', fontWeight: 700, color: cfg.enabled ? '#4ade80' : MUTED }}>Monitor {cfg.enabled ? 'ativo' : 'desligado'}</span>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '13px', marginBottom: '16px' }}>
                <div><div style={lbl}>Frequência (min)</div><input type="number" min="1" value={cfg.frequency_min} onChange={e => setC({ frequency_min: Number(e.target.value) })} style={num} /></div>
                <div><div style={lbl}>Latência atenção (ms)</div><input type="number" value={cfg.latency_warn_ms} onChange={e => setC({ latency_warn_ms: Number(e.target.value) })} style={num} /></div>
                <div><div style={lbl}>Latência crítica (ms)</div><input type="number" value={cfg.latency_crit_ms} onChange={e => setC({ latency_crit_ms: Number(e.target.value) })} style={num} /></div>
                <div><div style={lbl}>Erro % atenção</div><input type="number" step="0.05" value={cfg.error_rate_warn} onChange={e => setC({ error_rate_warn: Number(e.target.value) })} style={num} /></div>
                <div><div style={lbl}>Erro % crítico</div><input type="number" step="0.05" value={cfg.error_rate_crit} onChange={e => setC({ error_rate_crit: Number(e.target.value) })} style={num} /></div>
                <div><div style={lbl}>Alerta de custo/dia (US$)</div><input type="number" value={cfg.daily_cost_alert_usd} onChange={e => setC({ daily_cost_alert_usd: Number(e.target.value) })} style={num} /></div>
                <div><div style={lbl}>Retenção incidentes (dias)</div><input type="number" value={cfg.incident_retention_days} onChange={e => setC({ incident_retention_days: Number(e.target.value) })} style={num} /></div>
                <div><div style={lbl}>Telegram do admin (chat id)</div><input value={cfg.admin_telegram_chat_id ?? ''} onChange={e => setC({ admin_telegram_chat_id: e.target.value })} placeholder="ex: 123456789" style={num} /></div>
              </div>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '18px' }}>
                <Toggle label="Auto-recuperação segura" v={cfg.auto_recovery} on={v => setC({ auto_recovery: v })} />
                <Toggle label="Avisar no Telegram" v={cfg.notify_telegram} on={v => setC({ notify_telegram: v })} />
                <Toggle label="Avisar no painel" v={cfg.notify_dashboard} on={v => setC({ notify_dashboard: v })} />
                <Toggle label="Avisar por e-mail" v={cfg.notify_email} on={v => setC({ notify_email: v })} />
              </div>
              <button onClick={saveCfg} disabled={savingCfg} style={{ padding: '10px 22px', background: ORANGE, color: '#000', fontWeight: 700, fontSize: '13px', borderRadius: '9px', border: 'none', cursor: 'pointer', fontFamily: D }}>{savingCfg ? 'Salvando…' : 'Salvar configuração'}</button>
              <div style={{ fontSize: '10.5px', color: MUTED, marginTop: '12px', lineHeight: 1.5 }}>Os serviços monitorados ficam na tabela <code>platform_services</code> — adicione novos sem mexer no código. Auto-recuperação faz só re-checagem segura (nunca ação destrutiva).</div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: '13.5px', fontWeight: 800, color: 'white', fontFamily: D, marginBottom: '12px' }}>{children}</div>
}
function IncField({ label, children, accent }: { label: string; children: React.ReactNode; accent?: boolean }) {
  if (!children) return null
  return (
    <div style={{ marginTop: '11px' }}>
      <div style={{ fontSize: '9px', fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '3px' }}>{label}</div>
      <div style={{ fontSize: '12px', color: accent ? ORANGE : 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>{children}</div>
    </div>
  )
}
function Toggle({ label, v, on }: { label: string; v: boolean; on: (v: boolean) => void }) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
      <input type="checkbox" checked={v} onChange={e => on(e.target.checked)} style={{ width: '15px', height: '15px', accentColor: ORANGE }} />
      <span style={{ fontSize: '12px', color: v ? 'white' : MUTED }}>{label}</span>
    </label>
  )
}
