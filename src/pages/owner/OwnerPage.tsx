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

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
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
              <div
                key={c.id}
                style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 80px 80px 100px', gap: '0', padding: '16px 24px', borderBottom: i < filtered.length - 1 ? `1px solid ${BORDER}` : 'none', alignItems: 'center', transition: 'background 0.15s', cursor: 'default' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'white', marginBottom: '2px' }}>{c.business_name}</div>
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
                    <span style={{ fontSize: '14px', fontWeight: 800, color: scoreColor(c.health_score), fontFamily: D }}>
                      {c.health_score}
                    </span>
                  ) : (
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.2)' }}>—</span>
                  )}
                </div>
                <div style={{ fontSize: '11px', color: MUTED }}>
                  {c.created_at ? new Date(c.created_at).toLocaleDateString('pt-BR') : '—'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
