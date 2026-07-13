import { useState, useEffect } from 'react'
import { useAuth } from '../../../contexts/AuthContext'
import { supabase } from '../../../lib/supabase'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const MARKETING_BOT_USERNAME = 'SalesBoostContentBot'

const ORANGE = '#FF6D29'
const CARD = '#150E08'
const MUTED = '#BABABA'
const BORDER = 'rgba(255,255,255,0.06)'

type Channel = 'telegram' | 'teams' | 'whatsapp'

const CHANNELS: { key: Channel; name: string; emoji: string; available: boolean }[] = [
  { key: 'telegram', name: 'Telegram', emoji: '✈️', available: true },
  { key: 'teams', name: 'Microsoft Teams', emoji: '👥', available: false },
  { key: 'whatsapp', name: 'WhatsApp', emoji: '💬', available: false },
]

export default function NotificationsCard() {
  const { user, session } = useAuth()
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [telegramChatId, setTelegramChatId] = useState<number | null>(null)
  const [telegramCode, setTelegramCode] = useState('')
  const [telegramGenerating, setTelegramGenerating] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [picking, setPicking] = useState(false)

  useEffect(() => {
    if (!user) return
    supabase.from('companies')
      .select('id, telegram_chat_id')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return
        setCompanyId(data.id)
        setTelegramChatId(data.telegram_chat_id ?? null)
      })
  }, [user])

  const generateTelegramCode = async () => {
    if (!session) return
    setTelegramGenerating(true)
    setTelegramCode('')
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/telegram-link`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const data = await res.json() as { code?: string; error?: string }
      if (data.code) setTelegramCode(data.code)
    } catch { /* silently ignore */ }
    setTelegramGenerating(false)
  }

  const disconnectTelegram = async () => {
    if (!companyId) return
    setDisconnecting(true)
    await supabase.from('companies').update({ telegram_chat_id: null, telegram_group_invite_link: null }).eq('id', companyId)
    setTelegramChatId(null)
    setTelegramCode('')
    setPicking(false)
    setDisconnecting(false)
  }

  const connected = !!telegramChatId

  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '14px', marginBottom: '20px', overflow: 'hidden' }}>
      <div style={{ padding: '16px 22px', borderBottom: `1px solid ${BORDER}` }}>
        <span style={{ fontSize: '14px', fontWeight: 600, color: 'white' }}>Notificações</span>
      </div>
      <div style={{ padding: '22px' }}>
        <p style={{ fontSize: '12px', color: MUTED, marginBottom: '18px', lineHeight: 1.6 }}>
          Receba um aviso toda vez que o agente encontrar uma oportunidade, gerar um post novo ou precisar da sua aprovação.
        </p>

        {connected ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: '10px' }}>
            <span style={{ fontSize: '18px' }}>✈️</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', color: '#4ade80', fontWeight: 600 }}>✓ Telegram conectado</div>
              <div style={{ fontSize: '11px', color: MUTED, marginTop: '1px' }}>Você vai receber os avisos por lá.</div>
            </div>
            <button onClick={disconnectTelegram} disabled={disconnecting}
              style={{ padding: '7px 14px', background: 'transparent', color: '#f87171', fontWeight: 600, fontSize: '12px', borderRadius: '8px', border: '1px solid rgba(248,113,113,0.3)', cursor: disconnecting ? 'not-allowed' : 'pointer', flexShrink: 0 }}>
              {disconnecting ? 'Desconectando...' : 'Desconectar'}
            </button>
          </div>
        ) : !picking ? (
          <button onClick={() => setPicking(true)} disabled={!companyId}
            style={{ width: '100%', padding: '16px 20px', background: ORANGE, borderRadius: '12px', color: '#000', fontSize: '15px', fontWeight: 800, textAlign: 'center', border: 'none', cursor: companyId ? 'pointer' : 'not-allowed', opacity: companyId ? 1 : 0.6, letterSpacing: '-0.01em' }}>
            🔔 Conecte para receber notificações
          </button>
        ) : (
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '12px' }}>
              Escolha por onde quer ser avisado
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: telegramCode ? '16px' : 0 }}>
              {CHANNELS.map(c => (
                <div key={c.key}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px', padding: '13px 16px', borderRadius: '10px',
                    border: `1px solid ${BORDER}`, background: c.available ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.015)',
                    opacity: c.available ? 1 : 0.5,
                  }}>
                  <span style={{ fontSize: '20px' }}>{c.emoji}</span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: 'white', flex: 1 }}>{c.name}</span>
                  {c.available ? (
                    <button onClick={generateTelegramCode} disabled={telegramGenerating || !!telegramCode}
                      style={{ padding: '7px 16px', background: 'rgba(255,109,41,0.12)', border: '1px solid rgba(255,109,41,0.3)', borderRadius: '8px', color: ORANGE, fontSize: '12px', fontWeight: 700, cursor: telegramGenerating || !!telegramCode ? 'default' : 'pointer' }}>
                      {telegramGenerating ? 'Gerando...' : telegramCode ? '✓ Pronto' : 'Conectar'}
                    </button>
                  ) : (
                    <span style={{ fontSize: '10px', fontWeight: 700, color: MUTED, background: 'rgba(255,255,255,0.06)', padding: '3px 9px', borderRadius: '99px' }}>Em breve</span>
                  )}
                </div>
              ))}
            </div>

            {telegramCode && (
              <a
                href={`https://t.me/${MARKETING_BOT_USERNAME}?start=${telegramCode}`}
                target="_blank"
                rel="noreferrer"
                style={{ display: 'block', padding: '14px 20px', background: ORANGE, borderRadius: '12px', color: '#000', fontSize: '15px', fontWeight: 800, textAlign: 'center', textDecoration: 'none', letterSpacing: '-0.01em' }}>
                Abrir Sales Boost no Telegram →
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
