import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { useLang } from '../../contexts/LanguageContext'

const CARD = '#150E08'
const MUTED = '#BABABA'
const D = "'Bricolage Grotesque', system-ui, sans-serif"
const BORDER = 'rgba(255,255,255,0.06)'

interface BotNotification {
  id: string
  bot_name: string
  event_type: string
  message: string
  created_at: string
}

export default function ActivityPage() {
  const { user } = useAuth()
  const { lang } = useLang()
  const [botNotifications, setBotNotifications] = useState<BotNotification[]>([])
  const [selectedNotif, setSelectedNotif] = useState<BotNotification | null>(null)
  const [loading, setLoading] = useState(true)
  const [noCompany, setNoCompany] = useState(false)

  useEffect(() => {
    if (!user) return
    loadAll()
  }, [user])

  const loadAll = async () => {
    setLoading(true)
    const { data: co } = await supabase.from('companies').select('id').eq('user_id', user!.id).maybeSingle()
    if (!co) { setNoCompany(true); setLoading(false); return }

    const { data } = await supabase.from('bot_notifications')
      .select('id, bot_name, event_type, message, created_at')
      .eq('company_id', co.id)
      .order('created_at', { ascending: false })
      .limit(100)

    setBotNotifications((data ?? []) as BotNotification[])
    setLoading(false)
  }

  return (
    <div>
      <div style={{ padding: '28px 32px 24px', borderBottom: `1px solid ${BORDER}` }}>
        <h1 style={{ fontFamily: D, fontSize: '1.5rem', fontWeight: 800, color: 'white', letterSpacing: '-0.02em', marginBottom: '4px' }}>
          🤖 {lang === 'en' ? 'Bot Activity' : 'Atividade dos Bots'}
        </h1>
        <p style={{ color: MUTED, fontSize: '13px' }}>
          {lang === 'en' ? 'Everything the agents reported via Telegram' : 'Tudo que os agentes avisaram pelo Telegram'}
        </p>
      </div>

      <div style={{ padding: '28px 32px' }}>
        {loading ? (
          <div style={{ color: MUTED, fontSize: '14px' }}>{lang === 'en' ? 'Loading...' : 'Carregando...'}</div>
        ) : noCompany ? (
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '14px', padding: '48px 32px', textAlign: 'center', color: MUTED, fontSize: '13px' }}>
            {lang === 'en' ? 'Complete onboarding first.' : 'Complete o cadastro do seu negócio primeiro.'}
          </div>
        ) : (
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'white' }}>
                {lang === 'en' ? 'History' : 'Histórico'}
              </span>
              <span style={{ fontSize: '11px', color: MUTED }}>
                {lang === 'en' ? 'Telegram · live' : 'Telegram · ao vivo'}
              </span>
            </div>
            {botNotifications.length === 0 ? (
              <div style={{ padding: '32px 24px', textAlign: 'center', color: MUTED, fontSize: '13px', lineHeight: 1.7 }}>
                {lang === 'en'
                  ? 'No bot activity yet. Send /start to @luansoaresribeirobot on Telegram.'
                  : 'Nenhuma atividade ainda. Mande /start para @luansoaresribeirobot no Telegram.'}
              </div>
            ) : (
              <div style={{ padding: '8px 0' }}>
                {botNotifications.map((notif, i) => {
                  const isMarketing = notif.bot_name === 'marketing'
                  const botColor = isMarketing ? '#60a5fa' : '#4ade80'
                  const botLabel = isMarketing ? '📣 Marketing' : (lang === 'en' ? '💼 Sales' : '💼 Vendas')
                  const timeAgo = new Date(notif.created_at).toLocaleString(
                    lang === 'en' ? 'en-US' : 'pt-BR',
                    { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }
                  )
                  return (
                    <div key={notif.id} onClick={() => setSelectedNotif(notif)} style={{
                      display: 'flex', gap: '14px', padding: '12px 24px',
                      borderBottom: i < botNotifications.length - 1 ? `1px solid ${BORDER}` : 'none',
                      alignItems: 'flex-start', cursor: 'pointer', transition: 'background 0.15s',
                    }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
                        background: isMarketing ? 'rgba(96,165,250,0.1)' : 'rgba(74,222,128,0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px',
                      }}>
                        {isMarketing ? '📣' : '💼'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                          <span style={{ fontSize: '10px', fontWeight: 700, color: botColor, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            {botLabel}
                          </span>
                          <span style={{ fontSize: '10px', color: MUTED }}>{timeAgo}</span>
                        </div>
                        <div style={{
                          fontSize: '13px', color: 'rgba(255,255,255,0.85)', lineHeight: 1.5,
                          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                        }}>
                          {notif.message}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {selectedNotif && (
        <div onClick={() => setSelectedNotif(null)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: CARD, border: `1px solid ${BORDER}`, borderRadius: '16px',
            maxWidth: '640px', width: '100%', minHeight: '280px', maxHeight: '80vh', overflowY: 'auto',
            display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ padding: '22px 28px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: selectedNotif.bot_name === 'marketing' ? '#60a5fa' : '#4ade80', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {selectedNotif.bot_name === 'marketing' ? '📣 Marketing' : (lang === 'en' ? '💼 Sales' : '💼 Vendas')}
                {' · '}
                {new Date(selectedNotif.created_at).toLocaleString(lang === 'en' ? 'en-US' : 'pt-BR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </span>
              <button onClick={() => setSelectedNotif(null)}
                style={{ background: 'transparent', border: 'none', color: MUTED, fontSize: '20px', cursor: 'pointer', lineHeight: 1, padding: '4px' }}>
                ✕
              </button>
            </div>
            <div style={{ padding: '28px', flex: 1 }}>
              <div style={{ fontSize: '15px', color: 'rgba(255,255,255,0.9)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                {selectedNotif.message}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
