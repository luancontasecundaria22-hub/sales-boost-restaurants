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

const ROUTINE_OPTIONS: { key: string; label: string; wired: boolean }[] = [
  { key: 'daily_review', label: 'Revisão diária', wired: true },
  { key: 'detect_crises', label: 'Detectar crises', wired: true },
  { key: 'find_opportunities', label: 'Procurar oportunidades', wired: true },
  { key: 'review_agent_work', label: 'Revisar trabalho dos agentes', wired: true },
  { key: 'auto_create_tasks', label: 'Criar tarefas automaticamente', wired: true },
  { key: 'update_memory', label: 'Atualizar memória', wired: true },
  { key: 'weekly_review', label: 'Revisão semanal', wired: false },
  { key: 'monthly_planning', label: 'Planejamento mensal', wired: false },
  { key: 'monitor_competitors', label: 'Monitorar concorrentes', wired: false },
]

const APPROVAL_OPTIONS: { key: string; label: string; hint: string }[] = [
  { key: 'can_create_campaigns', label: 'Criar campanhas de conteúdo', hint: 'Semanas inteiras de posts agrupados, de uma vez.' },
  { key: 'can_change_prices', label: 'Sugerir mudança de preço/plano', hint: 'Só sugere — quem decide é sempre o dono.' },
  { key: 'can_delete_data', label: 'Apagar dados antigos', hint: 'Leads, posts e registros que não servem mais.' },
  { key: 'can_send_emails', label: 'Enviar e-mail em nome do negócio', hint: 'Ex: confirmação de reserva, resposta a cliente.' },
]

interface Routines { [k: string]: boolean }
interface Approvals { [k: string]: boolean }

interface CapabilityRow {
  id: string; name: string; description: string; category: string
  used_by: string[]; requires: string[]; requires_approval: boolean
  hermes_callable: boolean; toggleable: boolean; enabled: boolean
  status: 'live' | 'partial' | 'planned'; notes: string | null
}

const CATEGORY_LABELS: Record<string, string> = {
  marketing: 'Marketing', reputacao: 'Reputação', concorrentes: 'Concorrentes',
  crm: 'CRM', atendimento: 'Atendimento', comercial: 'Comercial', analytics: 'Analytics', outros: 'Outros',
}
const CATEGORY_ORDER = ['marketing', 'reputacao', 'concorrentes', 'crm', 'atendimento', 'comercial', 'analytics', 'outros']
const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  live: { label: 'Ativa', color: '#4ade80' },
  partial: { label: 'Parcial', color: '#FBBF24' },
  planned: { label: 'Planejada', color: 'rgba(255,255,255,0.35)' },
}

interface IntegrationRow {
  id: string; name: string; category: string; status: 'live' | 'planned'; connection_check: string; notes: string | null
}
const INTEGRATION_CATEGORY_LABELS: Record<string, string> = {
  social: 'Social', reputacao: 'Reputação', comunicacao: 'Comunicação', analytics: 'Analytics', crm: 'CRM', pagamentos: 'Pagamentos',
}

interface AgentRoleRow {
  role: string; label: string; emoji: string; description: string | null; active: boolean
  routines: Routines; approvals: Approvals
  max_claude_calls_daily: number; max_daily_cost_usd: number; max_concurrent_tasks: number
}
interface RoleActivity { count7d: number; lastAt: string | null }

interface ReportConfig { daily_enabled: boolean; weekly_enabled: boolean; monthly_enabled: boolean; annual_enabled: boolean }
const REPORT_OPTIONS: { key: keyof ReportConfig; label: string; hint: string }[] = [
  { key: 'daily_enabled', label: 'Relatório diário', hint: 'Toda noite (22h), pelo Agente Secretário. Já ativo desde o início.' },
  { key: 'weekly_enabled', label: 'Relatório semanal', hint: 'Toda segunda-feira — panorama da semana.' },
  { key: 'monthly_enabled', label: 'Relatório mensal', hint: 'Todo dia 1º — panorama do mês.' },
  { key: 'annual_enabled', label: 'Relatório anual', hint: 'Todo 1º de janeiro — panorama do ano.' },
]

const FACTORY_DEFAULTS = {
  routines: {
    daily_review: true, weekly_review: true, monthly_planning: true, monitor_competitors: true,
    detect_crises: true, find_opportunities: true, auto_create_tasks: true, review_agent_work: true, update_memory: true,
  } as Routines,
  maxConcurrentTasks: 10,
  maxActiveAgents: 8,
  maxDailyCostUsd: 12,
  maxClaudeCallsDaily: 200,
  approvals: { can_create_campaigns: true, can_change_prices: false, can_delete_data: false, can_send_emails: true } as Approvals,
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

export default function AgentsControlCenterPage() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)

  // Rotinas, Aprovações e Limites são POR AGENTE agora — nada disso é
  // editável antes de escolher um agente em "Agentes Ativos". maxActiveAgents
  // é a única exceção: é um teto global (quantos agentes no total rodam por
  // ciclo), então mora fora do buffer por-agente.
  const [selectedRole, setSelectedRole] = useState<string | null>(null)
  const [routines, setRoutines] = useState<Routines>(FACTORY_DEFAULTS.routines)
  const [maxConcurrentTasks, setMaxConcurrentTasks] = useState(FACTORY_DEFAULTS.maxConcurrentTasks)
  const [maxDailyCostUsd, setMaxDailyCostUsd] = useState(FACTORY_DEFAULTS.maxDailyCostUsd)
  const [maxClaudeCallsDaily, setMaxClaudeCallsDaily] = useState(FACTORY_DEFAULTS.maxClaudeCallsDaily)
  const [approvals, setApprovals] = useState<Approvals>(FACTORY_DEFAULTS.approvals)
  const [maxActiveAgents, setMaxActiveAgents] = useState(FACTORY_DEFAULTS.maxActiveAgents)

  const [capabilities, setCapabilities] = useState<CapabilityRow[]>([])
  const [integrationCatalog, setIntegrationCatalog] = useState<IntegrationRow[]>([])
  const [agentRoles, setAgentRoles] = useState<AgentRoleRow[]>([])
  const [roleActivity, setRoleActivity] = useState<Record<string, RoleActivity>>({})
  const [reportConfig, setReportConfig] = useState<ReportConfig>({ daily_enabled: true, weekly_enabled: false, monthly_enabled: true, annual_enabled: false })
  const [telegramStats, setTelegramStats] = useState({ connected: 0, total: 0 })

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [savingGlobal, setSavingGlobal] = useState(false)

  useEffect(() => {
    if (!session) return
    void loadAll()
  }, [session])

  const selectRole = (role: string, roles: AgentRoleRow[] = agentRoles) => {
    setSelectedRole(role)
    const r = roles.find(x => x.role === role)
    setRoutines(r?.routines && Object.keys(r.routines).length ? r.routines : FACTORY_DEFAULTS.routines)
    setApprovals(r?.approvals && Object.keys(r.approvals).length ? r.approvals : FACTORY_DEFAULTS.approvals)
    setMaxClaudeCallsDaily(r?.max_claude_calls_daily ?? FACTORY_DEFAULTS.maxClaudeCallsDaily)
    setMaxDailyCostUsd(r ? Number(r.max_daily_cost_usd) : FACTORY_DEFAULTS.maxDailyCostUsd)
    setMaxConcurrentTasks(r?.max_concurrent_tasks ?? FACTORY_DEFAULTS.maxConcurrentTasks)
  }

  const loadAll = async () => {
    setLoading(true)
    const [{ data }, { data: capRows }, { data: integrationRows }, { data: roleRows }, { data: recentMessages }, { data: reportRow }, { count: telegramConnected }, { count: telegramTotal }] = await Promise.all([
      supabase.from('hermes_config').select('*').eq('id', true).maybeSingle(),
      supabase.from('capability_registry').select('*').order('category').order('name'),
      supabase.from('integration_catalog').select('*').order('category').order('name'),
      supabase.from('agent_roles').select('*').order('role'),
      supabase.from('agent_messages').select('agent_role, created_at').eq('role', 'assistant').order('created_at', { ascending: false }).limit(500),
      supabase.from('report_config').select('*').eq('id', true).maybeSingle(),
      supabase.from('companies').select('id', { count: 'exact', head: true }).not('telegram_chat_id', 'is', null),
      supabase.from('companies').select('id', { count: 'exact', head: true }),
    ])
    if (data) setMaxActiveAgents(data.max_active_agents ?? FACTORY_DEFAULTS.maxActiveAgents)
    setCapabilities((capRows ?? []) as CapabilityRow[])
    setIntegrationCatalog((integrationRows ?? []) as IntegrationRow[])
    const roles = (roleRows ?? []) as AgentRoleRow[]
    setAgentRoles(roles)
    if (reportRow) setReportConfig(reportRow as ReportConfig)
    setTelegramStats({ connected: telegramConnected ?? 0, total: telegramTotal ?? 0 })

    if (roles.length > 0) {
      const initial = roles.find(r => r.active) ?? roles[0]
      selectRole(initial.role, roles)
    }

    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    const activity: Record<string, RoleActivity> = {}
    for (const m of (recentMessages ?? []) as { agent_role: string | null; created_at: string }[]) {
      const role = m.agent_role ?? 'marketing'
      if (!activity[role]) activity[role] = { count7d: 0, lastAt: m.created_at }
      if (new Date(m.created_at).getTime() >= sevenDaysAgo) activity[role].count7d++
    }
    setRoleActivity(activity)
    setLoading(false)
  }

  const toggleCapability = async (id: string, enabled: boolean) => {
    setCapabilities(prev => prev.map(c => c.id === id ? { ...c, enabled } : c))
    await supabase.from('capability_registry').update({ enabled, updated_at: new Date().toISOString() }).eq('id', id)
  }

  const toggleAgentRole = async (role: string, active: boolean) => {
    setAgentRoles(prev => prev.map(r => r.role === role ? { ...r, active } : r))
    await supabase.from('agent_roles').update({ active, updated_at: new Date().toISOString() }).eq('role', role)
  }

  const toggleReport = async (key: keyof ReportConfig, value: boolean) => {
    setReportConfig(prev => ({ ...prev, [key]: value }))
    await supabase.from('report_config').update({ [key]: value, updated_at: new Date().toISOString() }).eq('id', true)
  }

  const saveMaxActiveAgents = async (value: number) => {
    setMaxActiveAgents(value)
    setSavingGlobal(true)
    await supabase.from('hermes_config').update({ max_active_agents: value, updated_at: new Date().toISOString() }).eq('id', true)
    setSavingGlobal(false)
  }

  const saveConfig = async () => {
    if (!selectedRole) return
    setSaving(true)
    setSaved(false)
    const { error } = await supabase.from('agent_roles').update({
      routines, approvals, max_claude_calls_daily: maxClaudeCallsDaily,
      max_daily_cost_usd: maxDailyCostUsd, max_concurrent_tasks: maxConcurrentTasks,
      updated_at: new Date().toISOString(),
    }).eq('role', selectedRole)
    setSaving(false)
    if (!error) {
      setSaved(true)
      setAgentRoles(prev => prev.map(r => r.role === selectedRole ? { ...r, routines, approvals, max_claude_calls_daily: maxClaudeCallsDaily, max_daily_cost_usd: maxDailyCostUsd, max_concurrent_tasks: maxConcurrentTasks } : r))
      setTimeout(() => setSaved(false), 2000)
    }
  }

  const restoreDefaults = () => {
    setRoutines(FACTORY_DEFAULTS.routines)
    setMaxConcurrentTasks(FACTORY_DEFAULTS.maxConcurrentTasks)
    setMaxDailyCostUsd(FACTORY_DEFAULTS.maxDailyCostUsd)
    setMaxClaudeCallsDaily(FACTORY_DEFAULTS.maxClaudeCallsDaily)
    setApprovals(FACTORY_DEFAULTS.approvals)
  }

  const goBack = () => navigate('/owner')
  const selectedRoleRow = agentRoles.find(r => r.role === selectedRole) ?? null

  return (
    <div style={{ minHeight: '100vh', background: BG }}>
      <div style={{ borderBottom: `1px solid ${BORDER}`, padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={goBack} style={{ background: 'transparent', border: 'none', color: MUTED, fontSize: '18px', cursor: 'pointer', padding: '4px' }}>← Voltar</button>
          <div style={{ width: '1px', height: '20px', background: BORDER }} />
          <span style={{ fontFamily: D, fontSize: '1rem', fontWeight: 800, color: 'white' }}>🤖 Agents Control Center</span>
        </div>
        <button onClick={goBack} style={{ padding: '7px 16px', background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: '8px', color: MUTED, fontSize: '12px', cursor: 'pointer' }}>
          Fechar
        </button>
      </div>

      <div style={{ padding: '32px', maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontFamily: D, fontSize: '1.6rem', fontWeight: 900, color: 'white', letterSpacing: '-0.03em', marginBottom: '4px' }}>O que os agentes podem fazer</h1>
          <p style={{ color: MUTED, fontSize: '13.5px' }}>
            Isso é sobre EXECUÇÃO — rotinas, limites, aprovações e capacidades reais. Para MISSÃO, PERSONALIDADE e PRIORIDADES do Hermes, vá em{' '}
            <button onClick={() => navigate('/owner/hermes')} style={{ background: 'transparent', border: 'none', color: ORANGE, fontSize: '13.5px', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>🧠 Hermes Control Center</button>.
            Mudanças só valem depois de "Salvar".
          </p>
        </div>

        {loading ? (
          <div style={{ color: MUTED, fontSize: '14px', padding: '32px' }}>Carregando...</div>
        ) : (
          <>
            <SettingsSection title="Agentes Ativos" description="Liga, desliga ou acompanha cada papel de agente — clique num card pra selecioná-lo e editar as seções abaixo pra ele.">
              <div style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.45)', marginBottom: '16px', lineHeight: 1.6 }}>
                Cada agente só usa as ferramentas do próprio papel — nunca se misturam. Rotinas, Limites, Aprovações e Capacidades abaixo valem só pro agente selecionado aqui. Pra tirar o Jarvis ou o Agente Geral do menu de uma empresa específica (sem afetar as outras), use o card "Menu do cliente" na ficha daquela empresa em /owner.
              </div>
              {agentRoles.length === 0 ? (
                <div style={{ color: MUTED, fontSize: '12.5px' }}>Nenhum papel cadastrado ainda — aplique a migration 028_agent_roles_and_feature_flags.sql.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {agentRoles.map(r => {
                    const act = roleActivity[r.role]
                    const isSelected = r.role === selectedRole
                    return (
                      <div key={r.role} onClick={() => selectRole(r.role)}
                        style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 14px', borderRadius: '10px', cursor: 'pointer', border: `1px solid ${isSelected ? 'rgba(255,109,41,0.5)' : r.active ? 'rgba(74,222,128,0.25)' : BORDER}`, background: isSelected ? 'rgba(255,109,41,0.06)' : r.active ? 'rgba(74,222,128,0.04)' : 'rgba(255,255,255,0.02)' }}>
                        <span style={{ fontSize: '18px', flexShrink: 0 }}>{r.emoji}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: 'white' }}>{r.label}</span>
                            {isSelected && <span style={{ fontSize: '9.5px', fontWeight: 700, color: ORANGE, padding: '1px 7px', borderRadius: '99px', border: '1px solid rgba(255,109,41,0.4)' }}>SELECIONADO</span>}
                            <span style={{ fontSize: '9.5px', fontWeight: 700, color: r.active ? '#4ade80' : 'rgba(255,255,255,0.35)', padding: '1px 7px', borderRadius: '99px', border: `1px solid ${r.active ? 'rgba(74,222,128,0.3)' : BORDER}` }}>{r.active ? 'ATIVO' : 'DESATIVADO'}</span>
                          </div>
                          {r.description && <div style={{ fontSize: '11.5px', color: MUTED, marginTop: '3px', lineHeight: 1.5 }}>{r.description}</div>}
                          <div style={{ fontSize: '10.5px', color: 'rgba(255,255,255,0.35)', marginTop: '4px' }}>
                            {act ? `${act.count7d} ação${act.count7d !== 1 ? 'ões' : ''} nos últimos 7 dias` : 'sem atividade registrada'}
                          </div>
                        </div>
                        <label onClick={e => e.stopPropagation()} style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
                          <input type="checkbox" checked={r.active} onChange={e => toggleAgentRole(r.role, e.target.checked)} style={{ width: '16px', height: '16px', accentColor: ORANGE, cursor: 'pointer' }} />
                        </label>
                      </div>
                    )
                  })}
                </div>
              )}

              <div style={{ marginTop: '18px', paddingTop: '16px', borderTop: `1px solid ${BORDER}` }}>
                <label style={{ display: 'block', fontSize: '11px', color: MUTED, marginBottom: '4px' }}>Máximo de agentes ativos por ciclo (global — não depende do agente selecionado)</label>
                <input type="number" value={maxActiveAgents} onChange={e => saveMaxActiveAgents(Number(e.target.value))} min={1} disabled={savingGlobal} style={{ ...inputStyle, width: '160px', boxSizing: 'border-box' }} />
              </div>
            </SettingsSection>

            <SettingsSection title="Telegram & Relatórios" description="Quais relatórios automáticos são enviados por Telegram, e com que frequência.">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${BORDER}`, borderRadius: '9px', marginBottom: '16px' }}>
                <span style={{ fontSize: '15px' }}>✈️</span>
                <span style={{ fontSize: '12.5px', color: 'white' }}>{telegramStats.connected} de {telegramStats.total} empresas com Telegram conectado</span>
              </div>
              <div style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.45)', marginBottom: '16px', lineHeight: 1.6 }}>
                Cada interruptor aqui é o teto geral da plataforma. Mesmo ligado aqui, cada cliente ainda pode desligar a categoria dele em Configurações → Notificações — os dois precisam estar ligados pro relatório sair.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {REPORT_OPTIONS.map(r => (
                  <label key={r.key} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 14px', borderRadius: '9px', border: `1px solid ${BORDER}`, background: 'rgba(255,255,255,0.02)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={reportConfig[r.key]} onChange={e => toggleReport(r.key, e.target.checked)} style={{ width: '16px', height: '16px', accentColor: ORANGE }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'white' }}>{r.label}</div>
                      <div style={{ fontSize: '11px', color: MUTED, marginTop: '1px' }}>{r.hint}</div>
                    </div>
                  </label>
                ))}
              </div>
            </SettingsSection>

            {selectedRoleRow && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: 'rgba(255,109,41,0.06)', border: '1px solid rgba(255,109,41,0.2)', borderRadius: '9px', marginBottom: '16px', fontSize: '12.5px', color: 'white' }}>
                <span>{selectedRoleRow.emoji}</span>
                <span>Editando Rotinas, Limites, Aprovações e Capacidades de <strong>{selectedRoleRow.label}</strong></span>
              </div>
            )}

            <SettingsSection title="Rotinas" description={selectedRoleRow ? `Liga/desliga pedaços do ciclo automático de ${selectedRoleRow.label}.` : 'Selecione um agente acima.'}>
              {!selectedRoleRow ? (
                <div style={{ color: MUTED, fontSize: '12.5px' }}>Selecione um agente em "Agentes Ativos" pra configurar isso.</div>
              ) : (
                <>
                  <div style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.45)', marginBottom: '14px', lineHeight: 1.6 }}>
                    As marcadas com <span style={{ color: '#FBBF24' }}>●</span> ainda não têm efeito — dependem de outras rotinas de busca que ainda rodam por agenda fixa. Estão aqui já configuráveis pra quando isso for ligado.
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {ROUTINE_OPTIONS.map(r => (
                      <label key={r.key} style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '9px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', cursor: 'pointer' }}>
                        <input type="checkbox" checked={routines[r.key] ?? true} onChange={e => setRoutines(prev => ({ ...prev, [r.key]: e.target.checked }))} />
                        <span style={{ fontSize: '12.5px', color: 'white', flex: 1 }}>{r.label}</span>
                        {!r.wired && <span style={{ color: '#FBBF24', fontSize: '11px' }}>●</span>}
                      </label>
                    ))}
                  </div>
                </>
              )}
            </SettingsSection>

            <SettingsSection title="Limites" description={selectedRoleRow ? `Teto de custo e volume de ações de ${selectedRoleRow.label} — ele para sozinho ao bater o teto.` : 'Selecione um agente acima.'}>
              {!selectedRoleRow ? (
                <div style={{ color: MUTED, fontSize: '12.5px' }}>Selecione um agente em "Agentes Ativos" pra configurar isso.</div>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: MUTED, marginBottom: '4px' }}>Máximo de chamadas de IA por dia</label>
                      <input type="number" value={maxClaudeCallsDaily} onChange={e => setMaxClaudeCallsDaily(Number(e.target.value))} min={1} style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: MUTED, marginBottom: '4px' }}>Custo diário estimado máximo (US$)</label>
                      <input type="number" value={maxDailyCostUsd} onChange={e => setMaxDailyCostUsd(Number(e.target.value))} min={0} step={0.5} style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: MUTED, marginBottom: '4px' }}>Máximo de tarefas simultâneas</label>
                      <input type="number" value={maxConcurrentTasks} onChange={e => setMaxConcurrentTasks(Number(e.target.value))} min={1} style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
                    </div>
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
                    Chamadas e custo diário já são verificados de verdade antes de cada ciclo automático deste agente (o custo é uma estimativa aproximada, não é a fatura real). "Tarefas simultâneas" fica reservado pra quando existir uma fila de tarefas — hoje as ações rodam direto, uma de cada vez.
                  </div>
                </>
              )}
            </SettingsSection>

            <SettingsSection title="Aprovações" description={selectedRoleRow ? `O que ${selectedRoleRow.label} pode decidir sozinho — tudo ainda vira rascunho, nada publica sem você aprovar.` : 'Selecione um agente acima.'}>
              {!selectedRoleRow ? (
                <div style={{ color: MUTED, fontSize: '12.5px' }}>Selecione um agente em "Agentes Ativos" pra configurar isso.</div>
              ) : (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                    {APPROVAL_OPTIONS.map(a => (
                      <label key={a.key} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 14px', borderRadius: '9px', border: `1px solid ${BORDER}`, background: 'rgba(255,255,255,0.02)', cursor: 'pointer' }}>
                        <input type="checkbox" checked={approvals[a.key] ?? false} onChange={e => setApprovals(prev => ({ ...prev, [a.key]: e.target.checked }))} style={{ width: '16px', height: '16px', accentColor: ORANGE }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'white' }}>{a.label}</div>
                          <div style={{ fontSize: '11px', color: MUTED, marginTop: '1px' }}>{a.hint}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                  <div style={{ padding: '12px 14px', background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '9px', fontSize: '11.5px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
                    🔒 <strong style={{ color: '#f87171' }}>Publicar posts sozinho</strong> e <strong style={{ color: '#f87171' }}>responder avaliações sozinho</strong> não existem como opção — isso vale pra todos os clientes da plataforma de uma vez, e contraria a promessa central do Sales Boost (nada vai ao público sem o dono aprovar). Todo conteúdo que os agentes criam sempre fica como rascunho esperando aprovação.
                  </div>
                </>
              )}
            </SettingsSection>

            <SettingsSection title="Capacidades do Executor" description={selectedRoleRow ? `Só as capacidades que ${selectedRoleRow.label} realmente usa.` : 'Selecione um agente acima.'}>
              {!selectedRoleRow ? (
                <div style={{ color: MUTED, fontSize: '12.5px' }}>Selecione um agente em "Agentes Ativos" pra ver as capacidades dele.</div>
              ) : (
              <>
              <div style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.45)', marginBottom: '16px', lineHeight: 1.6 }}>
                Cada linha aqui é uma capacidade real do sistema (não uma promessa) — o toggle liga/desliga só as que são <em>opcionais</em>. As com cadeado 🔒 são o núcleo do agente (sempre ligadas) ou ficam propositalmente fora do alcance por segurança.
              </div>
              {CATEGORY_ORDER.filter(cat => capabilities.some(c => c.category === cat && c.used_by.includes(selectedRoleRow.role))).map(cat => (
                <div key={cat} style={{ marginBottom: '18px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>{CATEGORY_LABELS[cat] ?? cat}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {capabilities.filter(c => c.category === cat && c.used_by.includes(selectedRoleRow.role)).map(c => {
                      const badge = STATUS_BADGE[c.status] ?? STATUS_BADGE.planned
                      return (
                        <div key={c.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '10px 14px', borderRadius: '9px', border: `1px solid ${BORDER}`, background: 'rgba(255,255,255,0.02)' }}>
                          <div style={{ flexShrink: 0, paddingTop: '2px' }}>
                            {c.toggleable ? (
                              <input type="checkbox" checked={c.enabled} onChange={e => toggleCapability(c.id, e.target.checked)} style={{ width: '16px', height: '16px', accentColor: ORANGE, cursor: 'pointer' }} />
                            ) : (
                              <span title={c.hermes_callable ? 'Núcleo — sempre ligada' : 'Fora do alcance por segurança'} style={{ fontSize: '13px' }}>🔒</span>
                            )}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'white' }}>{c.name}</span>
                              <span style={{ fontSize: '9.5px', fontWeight: 700, color: badge.color, padding: '1px 7px', borderRadius: '99px', border: `1px solid ${badge.color}44` }}>{badge.label}</span>
                              {c.hermes_callable && <span style={{ fontSize: '9.5px', color: 'rgba(255,255,255,0.35)' }}>· já em uso</span>}
                            </div>
                            <div style={{ fontSize: '11.5px', color: MUTED, marginTop: '2px', lineHeight: 1.5 }}>{c.description}</div>
                            {c.notes && <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '3px', lineHeight: 1.5, fontStyle: 'italic' }}>{c.notes}</div>}
                            {c.requires.length > 0 && <div style={{ fontSize: '10.5px', color: 'rgba(255,255,255,0.3)', marginTop: '3px' }}>Requer: {c.requires.join(', ')}</div>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
              {capabilities.length === 0 ? (
                <div style={{ color: MUTED, fontSize: '12.5px' }}>Registro de capacidades ainda não foi criado — aplique a migration 024_capability_registry.sql.</div>
              ) : !capabilities.some(c => c.used_by.includes(selectedRoleRow.role)) && (
                <div style={{ color: MUTED, fontSize: '12.5px' }}>Nenhuma capacidade registrada pra {selectedRoleRow.label} ainda.</div>
              )}
              </>
              )}
            </SettingsSection>

            <SettingsSection title="Integrações da Plataforma" description="Quais integrações o Sales Boost sabe usar — o que está conectado por empresa é checado ao vivo, não fica repetido aqui." defaultOpen={false}>
              <div style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.45)', marginBottom: '16px', lineHeight: 1.6 }}>
                Isto é o catálogo global (o que o Sales Boost sabe conectar). Se uma empresa específica não conectou uma dessas, os agentes já sabem disso na hora — nunca planejam uma ação num canal que aquela empresa não tem.
              </div>
              {CATEGORY_ORDER.filter(cat => integrationCatalog.some(i => i.category === cat)).map(cat => (
                <div key={cat} style={{ marginBottom: '14px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>{INTEGRATION_CATEGORY_LABELS[cat] ?? cat}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {integrationCatalog.filter(i => i.category === cat).map(i => {
                      const badge = STATUS_BADGE[i.status] ?? STATUS_BADGE.planned
                      return (
                        <div key={i.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '9px 14px', borderRadius: '9px', border: `1px solid ${BORDER}`, background: 'rgba(255,255,255,0.02)' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'white' }}>{i.name}</span>
                              <span style={{ fontSize: '9.5px', fontWeight: 700, color: badge.color, padding: '1px 7px', borderRadius: '99px', border: `1px solid ${badge.color}44` }}>{badge.label}</span>
                            </div>
                            {i.notes && <div style={{ fontSize: '11px', color: MUTED, marginTop: '3px', lineHeight: 1.5 }}>{i.notes}</div>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
              {integrationCatalog.length === 0 && (
                <div style={{ color: MUTED, fontSize: '12.5px' }}>Catálogo de integrações ainda não foi criado — aplique a migration 025_integration_catalog.sql.</div>
              )}
            </SettingsSection>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '8px', paddingTop: '8px' }}>
              <button onClick={saveConfig} disabled={saving || !selectedRoleRow}
                style={{ padding: '10px 22px', background: saved ? '#4ade80' : ORANGE, color: '#000', fontWeight: 700, fontSize: '13px', borderRadius: '9px', border: 'none', cursor: selectedRoleRow ? 'pointer' : 'not-allowed', opacity: selectedRoleRow ? 1 : 0.5 }}>
                {saved ? '✓ Salvo' : saving ? 'Salvando...' : selectedRoleRow ? `Salvar configurações de ${selectedRoleRow.label}` : 'Selecione um agente'}
              </button>
              <button onClick={restoreDefaults} disabled={!selectedRoleRow}
                style={{ padding: '10px 18px', background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: '9px', color: MUTED, fontSize: '13px', cursor: selectedRoleRow ? 'pointer' : 'not-allowed' }}>
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
