import { useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { ORANGE, CARD, MUTED, BORDER, callMarketingAi, timeAgo, STATUS_LABEL, type ContentItem } from './shared'

const STATUS_COLOR: Record<string, string> = { idea: MUTED, draft: '#FBBF24', approved: '#4ade80', scheduled: '#60a5fa', published: '#A78BFA' }

export default function ContentTab({ accessToken, content, onRefresh }: { accessToken: string; content: ContentItem[]; onRefresh: () => Promise<void> }) {
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')

  const generate = async () => {
    setGenerating(true)
    setError('')
    try {
      await callMarketingAi(accessToken, 'run_content')
      await onRefresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao gerar conteúdo')
    }
    setGenerating(false)
  }

  const approve = async (id: string) => {
    await supabase.from('marketing_ai_content').update({ status: 'approved', updated_at: new Date().toISOString() }).eq('id', id)
    await onRefresh()
  }
  const dismiss = async (id: string) => {
    await supabase.from('marketing_ai_content').delete().eq('id', id)
    await onRefresh()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
        <div style={{ fontSize: '12.5px', color: MUTED }}>Ideias e legendas geradas pela IA — sempre como rascunho, nunca publicado sozinho.</div>
        <button onClick={generate} disabled={generating}
          style={{ padding: '8px 16px', background: ORANGE, color: '#000', fontWeight: 700, fontSize: '12px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
          {generating ? 'Gerando...' : '✨ Gerar ideias'}
        </button>
      </div>
      {error && <div style={{ color: '#f87171', fontSize: '12px', marginBottom: '14px' }}>{error}</div>}

      {content.length === 0 ? (
        <div style={{ padding: '32px', textAlign: 'center', color: MUTED, fontSize: '13px', background: CARD, border: `1px solid ${BORDER}`, borderRadius: '12px' }}>
          Nenhuma ideia ainda. Configure a marca em Configurações e clique em "Gerar ideias".
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {content.map(c => (
            <div key={c.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '12px', overflow: 'hidden' }}>
              {c.image_url && <img src={c.image_url} alt="" style={{ width: '100%', height: '160px', objectFit: 'cover' }} />}
              <div style={{ padding: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '9.5px', fontWeight: 700, color: STATUS_COLOR[c.status], padding: '2px 8px', borderRadius: '99px', border: `1px solid ${STATUS_COLOR[c.status]}44`, textTransform: 'uppercase' }}>{STATUS_LABEL[c.status]}</span>
                  {c.format && <span style={{ fontSize: '10px', color: MUTED }}>{c.format}</span>}
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginLeft: 'auto' }}>{timeAgo(c.created_at)}</span>
                </div>
                {c.idea && <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'white', marginBottom: '6px' }}>{c.idea}</div>}
                {c.caption && <div style={{ fontSize: '11.5px', color: MUTED, lineHeight: 1.5, marginBottom: '6px', maxHeight: '80px', overflow: 'auto' }}>{c.caption}</div>}
                {c.hashtags && <div style={{ fontSize: '11px', color: ORANGE, marginBottom: '8px' }}>{c.hashtags}</div>}
                {c.reasoning && <div style={{ fontSize: '10.5px', color: 'rgba(255,255,255,0.35)', fontStyle: 'italic', lineHeight: 1.5, marginBottom: '10px' }}>💡 {c.reasoning}</div>}
                {(c.status === 'idea' || c.status === 'draft') && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => approve(c.id)} style={{ flex: 1, padding: '7px', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: '7px', color: '#4ade80', fontSize: '11.5px', fontWeight: 600, cursor: 'pointer' }}>✓ Aprovar</button>
                    <button onClick={() => dismiss(c.id)} style={{ flex: 1, padding: '7px', background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: '7px', color: MUTED, fontSize: '11.5px', cursor: 'pointer' }}>Descartar</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
