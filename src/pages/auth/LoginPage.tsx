import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

const D = "'Bricolage Grotesque', system-ui, sans-serif"
const ORANGE = '#FF6D29'
const BG = '#0E0B0A'
const CARD = '#150E08'
const MUTED = '#BABABA'
const BORDER = 'rgba(255,255,255,0.1)'

type Tab = 'password' | 'magic'

function InputField({ label, type = 'text', value, onChange, placeholder, extra }: {
  label: string; type?: string; value: string; onChange: (v: string) => void
  placeholder?: string; extra?: React.ReactNode
}) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '7px' }}>
        <label style={{ fontSize: '11px', fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</label>
        {extra}
      </div>
      <input
        type={type} value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: '100%', padding: '12px 14px', boxSizing: 'border-box',
          background: 'rgba(255,255,255,0.04)',
          border: `1px solid ${focused ? 'rgba(255,109,41,0.55)' : BORDER}`,
          borderRadius: '10px', color: 'white', fontSize: '14px', outline: 'none',
          transition: 'border-color 0.2s',
        }}
      />
    </div>
  )
}

export default function LoginPage() {
  const [tab, setTab] = useState<Tab>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [magicSent, setMagicSent] = useState(false)
  const { signIn, signInWithMagicLink, user, role, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  // Redirect already-logged-in users
  useEffect(() => {
    if (!authLoading && user && role) {
      navigate(role === 'owner' ? '/owner' : '/dashboard', { replace: true })
    }
  }, [authLoading, user, role, navigate])

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error, role } = await signIn(email, password)
    setLoading(false)
    if (error) setError(error)
    else navigate(role === 'owner' ? '/owner' : '/dashboard')
  }

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signInWithMagicLink(email)
    setLoading(false)
    if (error) setError(error)
    else setMagicSent(true)
  }

  return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%,-50%)', width: '700px', height: '500px', background: 'radial-gradient(ellipse, rgba(255,109,41,0.1) 0%, transparent 70%)', filter: 'blur(60px)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: '420px', position: 'relative', zIndex: 1 }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center', marginBottom: '40px', textDecoration: 'none' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: ORANGE, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#000', fontWeight: 900, fontSize: '13px', letterSpacing: '-0.03em' }}>SB</span>
          </div>
          <span style={{ color: 'white', fontWeight: 700, fontSize: '18px', letterSpacing: '-0.02em' }}>SalesBoost</span>
        </Link>

        <div style={{ background: CARD, border: '1px solid rgba(255,255,255,0.07)', borderRadius: '20px', padding: '36px 40px' }}>
          <h1 style={{ fontFamily: D, fontSize: '1.7rem', fontWeight: 800, color: 'white', marginBottom: '6px', letterSpacing: '-0.03em' }}>
            Bem-vindo de volta
          </h1>
          <p style={{ color: MUTED, fontSize: '14px', marginBottom: '24px', lineHeight: 1.5 }}>
            Entre para ver seu painel de inteligência.
          </p>

          {/* Tab switcher */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '3px', marginBottom: '24px' }}>
            {(['password', 'magic'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(''); setMagicSent(false) }}
                style={{
                  flex: 1, padding: '8px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                  fontSize: '13px', fontWeight: 600, transition: 'all 0.2s',
                  background: tab === t ? 'rgba(255,109,41,0.15)' : 'transparent',
                  color: tab === t ? ORANGE : MUTED,
                }}
              >
                {t === 'password' ? 'Senha' : 'Link mágico'}
              </button>
            ))}
          </div>

          {tab === 'password' ? (
            <form onSubmit={handlePassword}>
              <InputField label="E-mail" type="email" value={email} onChange={setEmail} placeholder="seu@email.com" />
              <InputField
                label="Senha" type="password" value={password} onChange={setPassword} placeholder="••••••••"
                extra={<Link to="/forgot-password" style={{ fontSize: '12px', color: ORANGE, textDecoration: 'none' }}>Esqueceu?</Link>}
              />

              {error && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: '#f87171' }}>
                  {error}
                </div>
              )}

              <button
                type="submit" disabled={loading}
                style={{ width: '100%', padding: '13px', background: loading ? 'rgba(255,109,41,0.55)' : ORANGE, color: '#000', fontWeight: 700, fontSize: '14px', borderRadius: '10px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', marginTop: '8px', letterSpacing: '0.01em' }}
              >
                {loading ? 'Entrando...' : 'Entrar →'}
              </button>
            </form>
          ) : magicSent ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: '2rem', marginBottom: '12px' }}>📬</div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'white', marginBottom: '8px' }}>Verifique seu e-mail</div>
              <div style={{ fontSize: '13px', color: MUTED, lineHeight: 1.6 }}>
                Enviamos um link de acesso para <strong style={{ color: 'white' }}>{email}</strong>. Clique nele para entrar.
              </div>
            </div>
          ) : (
            <form onSubmit={handleMagicLink}>
              <InputField label="E-mail" type="email" value={email} onChange={setEmail} placeholder="seu@email.com" />
              <p style={{ fontSize: '12px', color: MUTED, marginBottom: '16px', lineHeight: 1.5 }}>
                Vamos enviar um link de acesso direto para o seu e-mail. Sem senha necessária.
              </p>

              {error && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: '#f87171' }}>
                  {error}
                </div>
              )}

              <button
                type="submit" disabled={loading}
                style={{ width: '100%', padding: '13px', background: loading ? 'rgba(255,109,41,0.55)' : ORANGE, color: '#000', fontWeight: 700, fontSize: '14px', borderRadius: '10px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', letterSpacing: '0.01em' }}
              >
                {loading ? 'Enviando...' : 'Enviar link de acesso →'}
              </button>
            </form>
          )}
        </div>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: MUTED }}>
          Não tem conta?{' '}
          <Link to="/signup" style={{ color: ORANGE, textDecoration: 'none', fontWeight: 600 }}>Criar conta →</Link>
        </p>
      </div>
    </div>
  )
}
