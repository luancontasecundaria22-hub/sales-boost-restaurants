import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

const ORANGE = '#FF6D29'
const SIDEBAR_BG = '#0D0A07'
const BORDER = 'rgba(255,255,255,0.06)'
const MUTED = '#7A6A5A'
const MUTED_BRIGHT = '#BABABA'

type NavItem = { to: string; label: string; icon: React.ReactNode; end?: boolean }

const iconStroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

const NAV_ITEMS: NavItem[] = [
  {
    to: '/dashboard',
    label: 'Visão Geral',
    end: true,
    icon: <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, ...iconStroke }}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>,
  },
  {
    to: '/jarvis',
    label: 'Jarvis ✦',
    icon: <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, ...iconStroke }}><path d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" /></svg>,
  },
  {
    to: '/dashboard/agente',
    label: 'Agente',
    icon: <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, ...iconStroke }}><path d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" /></svg>,
  },
  {
    to: '/dashboard/oportunidades',
    label: 'Oportunidades',
    icon: <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, ...iconStroke }}><path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>,
  },
  {
    to: '/dashboard/posts',
    label: 'Posts',
    icon: <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, ...iconStroke }}><path d="M16.862 4.487l1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" /></svg>,
  },
  {
    to: '/dashboard/diagnostico',
    label: 'Diagnóstico',
    icon: <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, ...iconStroke }}><path d="M3 12h2l2-7 4 14 3-9 2 2h5" /></svg>,
  },
  {
    to: '/dashboard/insights',
    label: 'Insights',
    icon: <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, ...iconStroke }}><path d="M11.48 3.5a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" /></svg>,
  },
  {
    to: '/dashboard/integrations',
    label: 'Integrações',
    icon: <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, ...iconStroke }}><path d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>,
  },
  {
    to: '/dashboard/concorrentes',
    label: 'Concorrentes',
    icon: <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, ...iconStroke }}><path d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /><path d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" /></svg>,
  },
  {
    to: '/dashboard/relatorio',
    label: 'Relatório',
    icon: <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, ...iconStroke }}><path d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" /></svg>,
  },
  {
    to: '/dashboard/settings',
    label: 'Configurações',
    icon: <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, ...iconStroke }}><path d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 0 1 0 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 0 1 0-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281Z" /><path d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>,
  },
]

export default function DashboardLayout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const userEmail = user?.email ?? ''
  const userInitial = userEmail[0]?.toUpperCase() ?? 'U'

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0E0B0A' }}>

      {/* ── Sidebar ── */}
      <aside style={{ width: '240px', flexShrink: 0, background: SIDEBAR_BG, borderRight: `1px solid ${BORDER}`, display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 40 }}>

        {/* logo */}
        <div style={{ padding: '20px 20px 16px', borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: ORANGE, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ color: '#000', fontWeight: 900, fontSize: '11px' }}>SB</span>
            </div>
            <div>
              <div style={{ color: 'white', fontWeight: 700, fontSize: '14px', lineHeight: 1.2 }}>SalesBoost</div>
              <div style={{ color: MUTED, fontSize: '10px', marginTop: '1px' }}>Painel de inteligência</div>
            </div>
          </div>
        </div>

        {/* nav */}
        <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
          <div style={{ fontSize: '10px', fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '4px 10px 8px' }}>Menu</div>
          {NAV_ITEMS.map(({ to, label, icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '9px 12px', borderRadius: '9px', marginBottom: '2px',
                textDecoration: 'none', fontSize: '13.5px', fontWeight: isActive ? 600 : 400,
                color: isActive ? ORANGE : MUTED_BRIGHT,
                background: isActive ? 'rgba(255,109,41,0.1)' : 'transparent',
                transition: 'all 0.15s',
              })}
            >
              {icon}
              {label}
            </NavLink>
          ))}
        </nav>

        {/* user footer */}
        <div style={{ padding: '12px 10px', borderTop: `1px solid ${BORDER}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '9px', marginBottom: '4px' }}>
            <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(255,109,41,0.18)', border: '1px solid rgba(255,109,41,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: ORANGE, flexShrink: 0 }}>
              {userInitial}
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontSize: '12px', color: 'white', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userEmail}</div>
              <div style={{ fontSize: '10px', color: MUTED, marginTop: '1px' }}>Plano Free</div>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            style={{ width: '100%', padding: '8px 12px', background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: '8px', color: MUTED_BRIGHT, fontSize: '12px', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'; e.currentTarget.style.color = '#f87171' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = MUTED_BRIGHT }}
          >
            <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
              <path d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
            </svg>
            Sair da conta
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main style={{ flex: 1, marginLeft: '240px', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Outlet />
      </main>
    </div>
  )
}
