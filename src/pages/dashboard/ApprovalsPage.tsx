import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { useLang } from '../../contexts/LanguageContext'
import { d } from '../../i18n-dash'

const FORMAT_ICON: Record<string, string> = { reel: '🎬', carrossel: '🎠', story: '📱', foto: '📸' }

const ORANGE = '#FF6D29'
const GREEN = '#4ade80'
const CARD = '#150E08'
const MUTED = '#BABABA'
const D = "'Bricolage Grotesque', system-ui, sans-serif"
const BORDER = 'rgba(255,255,255,0.06)'

interface AiContent {
  id: string
  idea: string | null
  caption: string | null
  hashtags: string | null
  format: 'reel' | 'carrossel' | 'story' | 'foto' | null
  image_url: string | null
  reasoning: string | null
  status: string
  created_at: string
}

function ContentCard({ item, onApprove, onDiscard, busy, lang }: {
  item: AiContent; onApprove: () => void; onDiscard: () => void; busy: boolean; lang: 'pt' | 'en'
}) {
  const icon = item.format ? (FORMAT_ICON[item.format] ?? '📝') : '📝'
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '13px', padding: '16px 18px' }}>
      <div style={{ display: 'flex', gap: '14px' }}>
        {item.image_url && (
          <img src={item.image_url} alt="" style={{ width: '72px', height: '72px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0, border: `1px solid ${BORDER}` }} />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'white', marginBottom: '4px' }}>{icon} {item.idea ?? (lang === 'en' ? 'Content idea' : 'Ideia de conteúdo')}</div>
          {item.caption && <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.82)', lineHeight: 1.55, marginBottom: '6px', whiteSpace: 'pre-wrap' }}>{item.caption}</div>}
          {item.hashtags && <div style={{ fontSize: '11.5px', color: '#60a5fa', marginBottom: '6px' }}>{item.hashtags}</div>}
          {item.reasoning && <div style={{ fontSize: '11px', color: MUTED, lineHeight: 1.5 }}>💡 {item.reasoning}</div>}
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
        <button onClick={onApprove} disabled={busy}
          style={{ padding: '8px 16px', background: ORANGE, color: '#000', fontWeight: 700, fontSize: '12px', border: 'none', borderRadius: '9px', cursor: busy ? 'wait' : 'pointer', fontFamily: D }}>
          {lang === 'en' ? 'Approve' : 'Aprovar'}
        </button>
        <button onClick={onDiscard} disabled={busy}
          style={{ padding: '8px 16px', background: 'transparent', color: MUTED, fontWeight: 600, fontSize: '12px', border: `1px solid ${BORDER}`, borderRadius: '9px', cursor: busy ? 'wait' : 'pointer', fontFamily: D }}>
          {lang === 'en' ? 'Discard' : 'Descartar'}
        </button>
      </div>
    </div>
  )
}

export default function ApprovalsPage() {
  const { user } = useAuth()
  const { lang } = useLang()
  const T = d[lang].approvals

  const [items, setItems] = useState<AiContent[]>([])
  const [busyId, setBusyId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    load()
  }, [user])

  const load = async () => {
    setLoading(true)
    const { data: company } = await supabase.from('companies').select('id').eq('user_id', user!.id).maybeSingle()
    if (!company) { setLoading(false); return }

    const { data } = await supabase.from('marketing_ai_content')
      .select('id, idea, caption, hashtags, format, image_url, reasoning, status, created_at')
      .eq('company_id', company.id)
      .in('status', ['idea', 'draft'])
      .order('created_at', { ascending: false })

    setItems((data ?? []) as AiContent[])
    setLoading(false)
  }

  const approve = async (id: string) => {
    setBusyId(id)
    await supabase.from('marketing_ai_content').update({ status: 'approved', updated_at: new Date().toISOString() }).eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
    setBusyId(null)
  }

  const discard = async (id: string) => {
    setBusyId(id)
    await supabase.from('marketing_ai_content').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
    setBusyId(null)
  }

  const isEmpty = !loading && items.length === 0

  return (
    <div>
      <div style={{ padding: '28px 32px 24px', borderBottom: `1px solid ${BORDER}` }}>
        <h1 style={{ fontFamily: D, fontSize: '1.5rem', fontWeight: 800, color: 'white', letterSpacing: '-0.02em', marginBottom: '4px' }}>{T.title}</h1>
        <p style={{ color: MUTED, fontSize: '13px' }}>
          {lang === 'en' ? 'Content the Marketing AI created, waiting for your OK before anything goes public.' : 'Conteúdo que o Marketing AI criou, esperando seu OK antes de ir ao público.'}
        </p>
      </div>

      <div style={{ padding: '28px 32px', maxWidth: '780px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: MUTED }}>{d[lang].common.loading}</div>
        ) : isEmpty ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🎉</div>
            <div style={{ fontFamily: D, fontSize: '1.3rem', fontWeight: 800, color: 'white', marginBottom: '8px' }}>{T.emptyAll}</div>
            <div style={{ color: MUTED, fontSize: '13px', maxWidth: '380px', margin: '0 auto', lineHeight: 1.7 }}>
              {lang === 'en' ? 'Nothing waiting for approval. When the Marketing AI drafts new content, it lands here.' : 'Nada esperando aprovação. Quando o Marketing AI criar conteúdo novo, ele aparece aqui.'}
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'white' }}>{lang === 'en' ? 'Content to approve' : 'Conteúdo pra aprovar'}</span>
              <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 9px', borderRadius: '99px', background: 'rgba(255,109,41,0.12)', color: ORANGE }}>{items.length}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {items.map(item => (
                <ContentCard key={item.id} item={item} busy={busyId === item.id} lang={lang}
                  onApprove={() => approve(item.id)} onDiscard={() => discard(item.id)} />
              ))}
            </div>
            <div style={{ marginTop: '16px', fontSize: '11.5px', color: MUTED, lineHeight: 1.6, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: GREEN }}>✓</span> {lang === 'en' ? 'Approving marks it ready — nothing is published without you.' : 'Aprovar marca como pronto — nada é publicado sem você.'}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
