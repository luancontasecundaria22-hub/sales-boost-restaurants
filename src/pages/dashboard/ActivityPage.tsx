import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { useLang } from '../../contexts/LanguageContext'
import { PILLAR_ICON, PILLAR_LABEL, timeAgo, type ActivityLogRow } from './marketingAi/shared'

const CARD = '#150E08'
const MUTED = '#BABABA'
const D = "'Bricolage Grotesque', system-ui, sans-serif"
const BORDER = 'rgba(255,255,255,0.06)'

export default function ActivityPage() {
  const { user } = useAuth()
  const { lang } = useLang()
  const [activity, setActivity] = useState<ActivityLogRow[]>([])
  const [selected, setSelected] = useState<ActivityLogRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [noCompany, setNoCompany] = useState(false)

  useEffect(() => {
    if (!user) return
    load()
  }, [user])

  const load = async () => {
    setLoading(true)
    const { data: co } = await supabase.from('companies').select('id').eq('user_id', user!.id).maybeSingle()
    if (!co) { setNoCompany(true); setLoading(false); return }

    const { data } = await supabase.from('marketing_ai_activity_log')
      .select('id, pillar, action, reasoning, created_at')
      .eq('company_id', co.id)
      .order('created_at', { ascending: false })
      .limit(100)

    setActivity((data ?? []) as ActivityLogRow[])
    setLoading(false)
  }

  return (
    <div>
      <div style={{ padding: '28px 32px 24px', borderBottom: `1px solid ${BORDER}` }}>
        <h1 style={{ fontFamily: D, fontSize: '1.5rem', fontWeight: 800, color: 'white', letterSpacing: '-0.02em', marginBottom: '4px' }}>
          ✨ {lang === 'en' ? 'Agent activity' : 'Atividade do agente'}
        </h1>
        <p style={{ color: MUTED, fontSize: '13px' }}>
          {lang === 'en' ? 'Everything the Marketing AI (Growth OS) did — collections, content, competitors and strategy.' : 'Tudo que o Marketing AI (Growth OS) fez — coletas, conteúdo, concorrentes e estratégia.'}
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
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '16px', overflow: 'hidden', maxWidth: '820px' }}>
            <div style={{ padding: '18px 24px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'white' }}>
                {lang === 'en' ? 'History' : 'Histórico'}
              </span>
              <span style={{ fontSize: '11px', color: MUTED }}>
                {lang === 'en' ? 'Growth OS · live' : 'Growth OS · ao vivo'}
              </span>
            </div>
            {activity.length === 0 ? (
              <div style={{ padding: '32px 24px', textAlign: 'center', color: MUTED, fontSize: '13px', lineHeight: 1.7 }}>
                {lang === 'en'
                  ? 'No activity yet. As soon as the Marketing AI collects data, creates content or recommends something, it shows up here.'
                  : 'Nenhuma atividade ainda. Assim que o Marketing AI coletar dados, gerar conteúdo ou recomendar algo, aparece aqui.'}
              </div>
            ) : (
              <div style={{ padding: '8px 0' }}>
                {activity.map((a, i) => (
                  <div key={a.id} onClick={() => setSelected(a)} style={{
                    display: 'flex', gap: '14px', padding: '12px 24px',
                    borderBottom: i < activity.length - 1 ? `1px solid ${BORDER}` : 'none',
                    alignItems: 'flex-start', cursor: 'pointer', transition: 'background 0.15s',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '9px', flexShrink: 0, background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>
                      {PILLAR_ICON[a.pillar ?? ''] ?? '🤖'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                        <span style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,109,41,0.65)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          {PILLAR_LABEL[a.pillar ?? ''] ?? (lang === 'en' ? 'System' : 'Sistema')}
                        </span>
                        <span style={{ fontSize: '10px', color: MUTED }}>{timeAgo(a.created_at)}</span>
                      </div>
                      <div style={{ fontSize: '13px', color: 'white', fontWeight: 500 }}>{a.action}</div>
                      {a.reasoning && (
                        <div style={{ fontSize: '11.5px', color: MUTED, marginTop: '3px', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {a.reasoning}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {selected && (
        <div onClick={() => setSelected(null)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: CARD, border: `1px solid ${BORDER}`, borderRadius: '16px',
            maxWidth: '640px', width: '100%', maxHeight: '80vh', overflowY: 'auto',
          }}>
            <div style={{ padding: '22px 28px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,109,41,0.7)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {PILLAR_ICON[selected.pillar ?? ''] ?? '🤖'} {PILLAR_LABEL[selected.pillar ?? ''] ?? (lang === 'en' ? 'System' : 'Sistema')}
                {' · '}
                {new Date(selected.created_at).toLocaleString(lang === 'en' ? 'en-US' : 'pt-BR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </span>
              <button onClick={() => setSelected(null)}
                style={{ background: 'transparent', border: 'none', color: MUTED, fontSize: '20px', cursor: 'pointer', lineHeight: 1, padding: '4px' }}>
                ✕
              </button>
            </div>
            <div style={{ padding: '28px' }}>
              <div style={{ fontSize: '15px', color: 'white', fontWeight: 600, marginBottom: selected.reasoning ? '12px' : 0 }}>{selected.action}</div>
              {selected.reasoning && (
                <div style={{ fontSize: '13.5px', color: 'rgba(255,255,255,0.85)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                  {selected.reasoning}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
