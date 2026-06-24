import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

const ORANGE = '#FF6D29'
const BG = '#0E0B0A'
const CARD = '#150E08'
const MUTED = '#BABABA'
const BORDER = 'rgba(255,255,255,0.06)'
const D = "'Bricolage Grotesque', system-ui, sans-serif"
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string

interface Company {
  id: string
  business_name: string
  business_type: string | null
  city: string | null
  website_url: string | null
  plan: string | null
  active: boolean | null
  created_at: string | null
  health_score: number | null
}

interface AgentMessage {
  id: string
  role: string
  content: string
  agent_role: string | null
  created_at: string
}

interface TelegramConv {
  id: string
  bot_type: string
  telegram_chat_id: string
  status: string
  created_at: string
  messages: { id: string; role: string; content: string; created_at: string }[]
}

interface CompanyDetail {
  id: string
  business_name: string
  business_type: string | null
  city: string | null
  goal: string | null
  plan: string | null
  instagram_url: string | null
  website_url: string | null
  google_rating: number | null
  telegram_chat_id: string | null
}

const AGENT_EMOJI: Record<string, string> = { ceo: '🗂️', researcher: '🔍', cmo: '📣', sales: '💼', analyst: '📊', cs: '⭐' }

function scoreColor(s: number) {
  return s >= 75 ? '#4ade80' : s >= 50 ? '#FBBF24' : '#f87171'
}

export default function OwnerPage() {
  const { session, signOut } = useAuth()
  const navigate = useNavigate()
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<{ company: CompanyDetail; messages: AgentMessage[]; telegram: TelegramConv[] } | null>(null)
  const [activityTab, setActivityTab] = useState<'agent' | 'telegram'>('telegram')
  const [detailLoading, setDetailLoading] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({ business_name: '', business_type: '', city: '', goal: '', plan: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!session) return
    loadCompanies()
  }, [session])

  const loadCompanies = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/owner-companies`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${session!.access_token}` },
      })
      const data = await res.json() as { companies?: Company[]; error?: string }
      if (!res.ok || data.error) {
        setError(data.error ?? 'Erro ao carregar empresas')
      } else {
        setCompanies(data.companies ?? [])
      }
    } catch {
      setError('Erro inesperado')
    }
    setLoading(false)
  }

  const handleSignOut = async () => { await signOut(); navigate('/') }

  const loadDetail = async (companyId: string) => {
    if (expandedId === companyId) { setExpandedId(null); setDetail(null); setEditing(false); return }
    setExpandedId(companyId)
    setDetail(null)
    setEditing(false)
    setDetailLoading(true)
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/owner-company-activity`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session!.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: companyId, limit: 15 }),
      })
      const data = await res.json() as { company?: CompanyDetail; messages?: AgentMessage[]; telegram?: TelegramConv[]; error?: string }
      if (res.ok && data.company) {
        setDetail({ company: data.company, messages: data.messages ?? [], telegram: data.telegram ?? [] })
        setEditForm({
          business_name: data.company.business_name ?? '',
          business_type: data.company.business_type ?? '',
          city: data.company.city ?? '',
          goal: data.company.goal ?? '',
          plan: data.company.plan ?? '',
        })
      }
    } catch { /* ignore */ }
    setDetailLoading(false)
  }

  const saveEdit = async () => {
    if (!expandedId) return
    setSaving(true)
    await fetch(`${SUPABASE_URL}/functions/v1/owner-company-activity`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session!.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ company_id: expandedId, action: 'update', updates: editForm }),
    })
    setSaving(false)
    setEditing(false)
    await loadCompanies()
  }

  const filtered = companies.filter(c =>
    c.business_name.toLowerCase().includes(search.toLowerCase()) ||
    (c.city ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (c.business_type ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ minHeight: '100vh', background: BG }}>
      {/* Top bar */}
      <div style={{ borderBottom: `1px solid ${BORDER}`, padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: ORANGE, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#000', fontWeight: 900, fontSize: '11px' }}>SB</span>
          </div>
          <div>
            <span style={{ fontFamily: D, fontSize: '1rem', fontWeight: 800, color: 'white' }}>SalesBoost</span>
            <span style={{ fontSize: '11px', marginLeft: '10px', padding: '2px 8px', background: 'rgba(255,109,41,0.1)', borderRadius: '99px', border: '1px solid rgba(255,109,41,0.2)', color: ORANGE }}>Painel do Dono</span>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          style={{ padding: '7px 16px', background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: '8px', color: MUTED, fontSize: '12px', cursor: 'pointer' }}
        >
          Sair
        </button>
      </div>

      <div style={{ padding: '32px' }}>
        {/* Header */}
        <div style={{ marginBottom: '28px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
          <div>
            <h1 style={{ fontFamily: D, fontSize: '1.8rem', fontWeight: 900, color: 'white', letterSpacing: '-0.03em', marginBottom: '4px' }}>
              Todas as Empresas
            </h1>
            <p style={{ color: MUTED, fontSize: '14px' }}>
              {loading ? 'Carregando...' : `${companies.length} empresa${companies.length !== 1 ? 's' : ''} cadastrada${companies.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <button
            onClick={loadCompanies}
            style={{ padding: '9px 18px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER}`, borderRadius: '9px', color: MUTED, fontSize: '13px', cursor: 'pointer', flexShrink: 0 }}
          >
            Atualizar
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
          {[
            { label: 'Total', value: companies.length, color: ORANGE },
            { label: 'Ativos', value: companies.filter(c => c.active !== false).length, color: '#4ade80' },
            { label: 'Com diagnóstico', value: companies.filter(c => c.health_score != null).length, color: '#A78BFA' },
            { label: 'Score médio', value: (() => { const withScore = companies.filter(c => c.health_score != null); return withScore.length ? Math.round(withScore.reduce((a, c) => a + c.health_score!, 0) / withScore.length) : '—' })(), color: '#FBBF24' },
          ].map(s => (
            <div key={s.label} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '14px', padding: '20px 22px' }}>
              <div style={{ fontSize: '11px', color: MUTED, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px' }}>{s.label}</div>
              <div style={{ fontFamily: D, fontSize: '2.4rem', fontWeight: 900, color: s.color as string, lineHeight: 1 }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div style={{ marginBottom: '20px' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome, cidade ou tipo..."
            style={{
              width: '100%', maxWidth: '400px', padding: '10px 14px', boxSizing: 'border-box',
              background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`,
              borderRadius: '10px', color: 'white', fontSize: '14px', outline: 'none',
            }}
          />
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', fontSize: '13px', color: '#f87171' }}>
            {error}
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: MUTED }}>Carregando empresas...</div>
        ) : filtered.length === 0 ? (
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '14px', padding: '60px', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '12px' }}>🏢</div>
            <div style={{ color: 'white', fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>
              {search ? 'Nenhuma empresa encontrada' : 'Nenhuma empresa cadastrada ainda'}
            </div>
            <div style={{ color: MUTED, fontSize: '13px' }}>
              {search ? 'Tente outros termos de busca.' : 'As empresas aparecerão aqui quando clientes se cadastrarem.'}
            </div>
          </div>
        ) : (
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '14px', overflow: 'hidden' }}>
            {/* Table header */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 80px 80px 100px', gap: '0', padding: '12px 24px', borderBottom: `1px solid ${BORDER}`, fontSize: '10px', fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              <span>Empresa</span>
              <span>Tipo</span>
              <span>Cidade</span>
              <span>Plano</span>
              <span>Score</span>
              <span>Cadastro</span>
            </div>

            {filtered.map((c, i) => (
              <div key={c.id}>
                {/* Row */}
                <div
                  onClick={() => loadDetail(c.id)}
                  style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 80px 80px 100px', gap: '0', padding: '16px 24px', borderBottom: expandedId === c.id ? 'none' : (i < filtered.length - 1 ? `1px solid ${BORDER}` : 'none'), alignItems: 'center', transition: 'background 0.15s', cursor: 'pointer', background: expandedId === c.id ? 'rgba(255,109,41,0.04)' : 'transparent' }}
                  onMouseEnter={e => { if (expandedId !== c.id) e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
                  onMouseLeave={e => { if (expandedId !== c.id) e.currentTarget.style.background = 'transparent' }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'white' }}>{c.business_name}</div>
                      <span style={{ fontSize: '10px', color: 'rgba(255,109,41,0.4)' }}>{expandedId === c.id ? '▲' : '▼'}</span>
                    </div>
                    {c.website_url && (
                      <div style={{ fontSize: '11px', color: MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.website_url}</div>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', color: MUTED }}>{c.business_type ?? '—'}</div>
                  <div style={{ fontSize: '12px', color: MUTED }}>{c.city ?? '—'}</div>
                  <div>
                    <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '99px', background: 'rgba(255,109,41,0.1)', color: ORANGE, fontWeight: 700, border: '1px solid rgba(255,109,41,0.2)' }}>
                      {c.plan ?? 'free'}
                    </span>
                  </div>
                  <div>
                    {c.health_score != null ? (
                      <span style={{ fontSize: '14px', fontWeight: 800, color: scoreColor(c.health_score), fontFamily: D }}>{c.health_score}</span>
                    ) : (
                      <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.2)' }}>—</span>
                    )}
                  </div>
                  <div style={{ fontSize: '11px', color: MUTED }}>
                    {c.created_at ? new Date(c.created_at).toLocaleDateString('pt-BR') : '—'}
                  </div>
                </div>

                {/* Expanded detail panel */}
                {expandedId === c.id && (
                  <div style={{ borderTop: `1px solid ${BORDER}`, borderBottom: i < filtered.length - 1 ? `1px solid ${BORDER}` : 'none', background: 'rgba(255,109,41,0.02)', padding: '20px 24px' }}>
                    {detailLoading ? (
                      <div style={{ fontSize: '13px', color: MUTED }}>Carregando...</div>
                    ) : detail ? (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                        {/* Left: Edit form */}
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                            <div style={{ fontSize: '11px', fontWeight: 700, color: ORANGE, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Dados da conta</div>
                            <button onClick={() => setEditing(e => !e)}
                              style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '6px', background: editing ? 'rgba(255,109,41,0.15)' : 'rgba(255,255,255,0.05)', color: editing ? ORANGE : MUTED, border: `1px solid ${editing ? 'rgba(255,109,41,0.3)' : BORDER}`, cursor: 'pointer' }}>
                              {editing ? 'Cancelar' : 'Editar'}
                            </button>
                          </div>
                          {editing ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                              {[
                                { key: 'business_name', label: 'Nome' },
                                { key: 'business_type', label: 'Tipo' },
                                { key: 'city', label: 'Cidade' },
                                { key: 'goal', label: 'Objetivo' },
                                { key: 'plan', label: 'Plano' },
                              ].map(({ key, label }) => (
                                <div key={key}>
                                  <div style={{ fontSize: '10px', color: MUTED, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
                                  <input value={editForm[key as keyof typeof editForm]} onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value }))}
                                    style={{ width: '100%', padding: '7px 10px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`, borderRadius: '7px', color: 'white', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
                                </div>
                              ))}
                              <button onClick={saveEdit} disabled={saving}
                                style={{ marginTop: '4px', padding: '8px 16px', background: ORANGE, color: '#000', fontWeight: 700, fontSize: '12px', borderRadius: '8px', border: 'none', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                                {saving ? 'Salvando...' : 'Salvar alterações'}
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {[
                                ['Tipo', detail.company.business_type],
                                ['Cidade', detail.company.city],
                                ['Objetivo', detail.company.goal],
                                ['Instagram', detail.company.instagram_url],
                                ['Telegram', detail.company.telegram_chat_id ? `ID: ${detail.company.telegram_chat_id}` : null],
                                ['Google', detail.company.google_rating ? `${detail.company.google_rating}★` : null],
                              ].map(([label, val]) => val ? (
                                <div key={label as string} style={{ display: 'flex', gap: '8px', fontSize: '12px' }}>
                                  <span style={{ color: MUTED, width: '70px', flexShrink: 0 }}>{label}</span>
                                  <span style={{ color: 'white' }}>{val}</span>
                                </div>
                              ) : null)}
                            </div>
                          )}
                        </div>

                        {/* Right: Activity tabs */}
                        <div>
                          {/* Tab toggle */}
                          <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
                            {([['telegram', '📱 Telegram'], ['agent', '🤖 Agente IA']] as const).map(([tab, label]) => (
                              <button key={tab} onClick={() => setActivityTab(tab)}
                                style={{ fontSize: '11px', padding: '4px 12px', borderRadius: '6px', border: `1px solid ${activityTab === tab ? 'rgba(255,109,41,0.4)' : BORDER}`, background: activityTab === tab ? 'rgba(255,109,41,0.1)' : 'transparent', color: activityTab === tab ? ORANGE : MUTED, cursor: 'pointer', fontWeight: activityTab === tab ? 700 : 400 }}>
                                {label}
                              </button>
                            ))}
                          </div>

                          {activityTab === 'telegram' ? (
                            detail.telegram.length === 0 ? (
                              <div style={{ fontSize: '12px', color: MUTED }}>Telegram não conectado ainda.</div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '300px', overflowY: 'auto' }}>
                                {detail.telegram.map(conv => (
                                  <div key={conv.id}>
                                    <div style={{ fontSize: '10px', color: ORANGE, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
                                      {conv.bot_type === 'marketing' ? '📣 Bot de Marketing' : '💼 Bot de Vendas'} · ID {conv.telegram_chat_id}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                      {conv.messages.slice(0, 6).map(msg => (
                                        <div key={msg.id} style={{ padding: '8px 10px', borderRadius: '7px', background: msg.role === 'user' ? 'rgba(255,255,255,0.03)' : 'rgba(255,109,41,0.04)', border: `1px solid ${msg.role === 'user' ? BORDER : 'rgba(255,109,41,0.1)'}` }}>
                                          <div style={{ display: 'flex', gap: '6px', marginBottom: '3px', alignItems: 'center' }}>
                                            <span style={{ fontSize: '10px', color: msg.role === 'user' ? MUTED : ORANGE, fontWeight: 600 }}>{msg.role === 'user' ? '👤 Cliente' : '🤖 Bot'}</span>
                                            <span style={{ fontSize: '10px', color: MUTED, marginLeft: 'auto' }}>{new Date(msg.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                                          </div>
                                          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5, wordBreak: 'break-word' }}>
                                            {msg.content.length > 180 ? msg.content.slice(0, 180) + '…' : msg.content}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )
                          ) : (
                            detail.messages.length === 0 ? (
                              <div style={{ fontSize: '12px', color: MUTED }}>Sem atividade ainda.</div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto' }}>
                                {detail.messages.map(msg => (
                                  <div key={msg.id} style={{ padding: '10px 12px', borderRadius: '8px', background: msg.role === 'user' ? 'rgba(255,255,255,0.03)' : 'rgba(255,109,41,0.04)', border: `1px solid ${msg.role === 'user' ? BORDER : 'rgba(255,109,41,0.1)'}` }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
                                      <span style={{ fontSize: '11px' }}>{msg.role === 'user' ? '👤' : (AGENT_EMOJI[msg.agent_role ?? ''] ?? '🤖')}</span>
                                      <span style={{ fontSize: '10px', color: msg.role === 'user' ? MUTED : ORANGE, fontWeight: 600 }}>
                                        {msg.role === 'user' ? 'Cliente' : (msg.agent_role ?? 'Bot')}
                                      </span>
                                      <span style={{ fontSize: '10px', color: MUTED, marginLeft: 'auto' }}>
                                        {new Date(msg.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    </div>
                                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5, wordBreak: 'break-word' }}>
                                      {msg.content.length > 200 ? msg.content.slice(0, 200) + '…' : msg.content}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
