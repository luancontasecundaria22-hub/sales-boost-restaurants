import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { LanguageProvider, useLang } from '../../contexts/LanguageContext'
import { d } from '../../i18n-dash'
import { supabase } from '../../lib/supabase'

const ORANGE = '#FF6D29'
const SIDEBAR_BG = '#0D0A07'
const BORDER = 'rgba(255,255,255,0.06)'
const MUTED = '#7A6A5A'
const MUTED_BRIGHT = '#BABABA'

const iconStroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

type NavItem = { to: string; label: string; icon: React.ReactNode; end?: boolean }
type NavSection = { section?: string; accent?: boolean; items: NavItem[] }

interface ActivityItem { id: string; content: string; agent_role: string | null; created_at: string }
const AGENT_EMOJI: Record<string, string> = { ceo: '🗂️', researcher: '🔍', cmo: '📣', sales: '💼', analyst: '📊', cs: '⭐' }

function makeNavSections(T: typeof d[keyof typeof d]): NavSection[] {
  return [
    {
      items: [{
        to: '/dashboard', label: T.layout.nav.overview, end: true,
        icon: <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, ...iconStroke }}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>,
      }],
    },
    {
      section: T.layout.sections.meetings, accent: true,
      items: [{
        to: '/jarvis', label: T.layout.nav.jarvis,
        icon: <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, ...iconStroke }}><path d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" /></svg>,
      }],
    },
    {
      section: T.layout.sections.marketing,
      items: [{
        to: '/dashboard/posts', label: T.layout.nav.posts,
        icon: <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, ...iconStroke }}><path d="M16.862 4.487l1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" /></svg>,
      }],
    },
    {
      items: [{
        to: '/dashboard/aprovacoes', label: T.layout.nav.approvals,
        icon: <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, ...iconStroke }}><path d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>,
      }],
    },
  ]
}

function makeBottomItems(T: typeof d[keyof typeof d]): NavItem[] {
  return [
    {
      to: '/dashboard/settings', label: T.layout.nav.settings,
      icon: <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, ...iconStroke }}><path d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 0 1 0 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 0 1 0-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281Z" /><path d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>,
    },
  ]
}

function LangToggle() {
  const { lang, setLang } = useLang()
  return (
    <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`, borderRadius: '8px', padding: '3px', gap: '2px' }}>
      {(['pt', 'en'] as const).map(l => (
        <button key={l} onClick={() => setLang(l)}
          style={{ padding: '3px 9px', borderRadius: '5px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', background: lang === l ? ORANGE : 'transparent', color: lang === l ? '#000' : MUTED, transition: 'all 0.15s' }}>
          {l}
        </button>
      ))}
    </div>
  )
}

function NavItemLink({ item }: { item: NavItem }) {
  return (
    <NavLink to={item.to} end={item.end}
      style={({ isActive }) => ({
        display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', borderRadius: '9px', marginBottom: '2px',
        textDecoration: 'none', fontSize: '13.5px', fontWeight: isActive ? 600 : 400,
        color: isActive ? ORANGE : MUTED_BRIGHT, background: isActive ? 'rgba(255,109,41,0.1)' : 'transparent', transition: 'all 0.15s',
      })}>
      {item.icon}{item.label}
    </NavLink>
  )
}

function SidebarInner() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const { lang } = useLang()
  const T = d[lang]
  const [activity, setActivity] = useState<ActivityItem[]>([])

  useEffect(() => {
    if (!user) return
    supabase.from('companies').select('id').eq('user_id', user.id).maybeSingle()
      .then(({ data: co }) => {
        if (!co?.id) return
        supabase.from('agent_messages')
          .select('id, content, agent_role, created_at')
          .eq('company_id', co.id)
          .eq('role', 'assistant')
          .order('created_at', { ascending: false })
          .limit(5)
          .then(({ data }) => setActivity(data ?? []))
      })
  }, [user])

  const navSections = makeNavSections(T)
  const bottomItems = makeBottomItems(T)

  const handleSignOut = async () => { await signOut(); navigate('/') }
  const userEmail = user?.email ?? ''
  const userInitial = userEmail[0]?.toUpperCase() ?? 'U'

  return (
    <aside style={{ width: '240px', flexShrink: 0, background: SIDEBAR_BG, borderRight: `1px solid ${BORDER}`, display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 40 }}>
      <div style={{ padding: '20px 20px 16px', borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: ORANGE, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ color: '#000', fontWeight: 900, fontSize: '11px' }}>SB</span>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: 'white', fontWeight: 700, fontSize: '14px', lineHeight: 1.2 }}>SalesBoost</div>
            <div style={{ color: MUTED, fontSize: '10px', marginTop: '1px' }}>{T.layout.subtitle}</div>
          </div>
          <LangToggle />
        </div>
      </div>
      <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
        {navSections.map((sec, si) => (
          <div key={si} style={{ marginBottom: sec.section ? '4px' : '8px' }}>
            {sec.section && (
              <div style={{ fontSize: '9.5px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '10px 12px 5px', color: sec.accent ? 'rgba(255,109,41,0.55)' : MUTED }}>
                {sec.section}
              </div>
            )}
            {sec.items.map(item => <NavItemLink key={item.to} item={item} />)}
          </div>
        ))}
        <div style={{ height: '1px', background: BORDER, margin: '8px 0 12px' }} />
        {bottomItems.map(item => <NavItemLink key={item.to} item={item} />)}

        {/* Bot activity feed */}
        {activity.length > 0 && (
          <div style={{ marginTop: '14px' }}>
            <div style={{ height: '1px', background: BORDER, marginBottom: '10px' }} />
            <div style={{ fontSize: '9.5px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0 12px 6px', color: 'rgba(255,109,41,0.5)' }}>
              Atividade
            </div>
            {activity.map(item => (
              <div key={item.id} style={{ padding: '7px 12px', borderRadius: '8px', marginBottom: '2px', cursor: 'default', transition: 'background 0.15s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.03)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '2px' }}>
                  <span style={{ fontSize: '10px' }}>{AGENT_EMOJI[item.agent_role ?? ''] ?? '🤖'}</span>
                  <span style={{ fontSize: '9.5px', color: 'rgba(255,109,41,0.5)', fontWeight: 600, letterSpacing: '0.05em', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.agent_role ?? 'agente'}
                  </span>
                  <span style={{ fontSize: '9px', color: MUTED, flexShrink: 0 }}>
                    {new Date(item.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.content.length > 70 ? item.content.slice(0, 70) + '…' : item.content}
                </div>
              </div>
            ))}
          </div>
        )}
      </nav>
      <div style={{ padding: '12px 10px', borderTop: `1px solid ${BORDER}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '9px', marginBottom: '4px' }}>
          <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(255,109,41,0.18)', border: '1px solid rgba(255,109,41,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: ORANGE, flexShrink: 0 }}>{userInitial}</div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ fontSize: '12px', color: 'white', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userEmail}</div>
            <div style={{ fontSize: '10px', color: MUTED, marginTop: '1px' }}>{T.layout.planFree}</div>
          </div>
        </div>
        <button onClick={handleSignOut}
          style={{ width: '100%', padding: '8px 12px', background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: '8px', color: MUTED_BRIGHT, fontSize: '12px', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'; e.currentTarget.style.color = '#f87171' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = MUTED_BRIGHT }}>
          <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" /></svg>
          {T.layout.signOut}
        </button>
      </div>
    </aside>
  )
}

export default function DashboardLayout() {
  return (
    <LanguageProvider>
      <div style={{ display: 'flex', minHeight: '100vh', background: '#0E0B0A' }}>
        <SidebarInner />
        <main style={{ flex: 1, marginLeft: '240px', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <Outlet />
        </main>
      </div>
    </LanguageProvider>
  )
}
