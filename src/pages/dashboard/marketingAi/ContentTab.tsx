import { useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { ORANGE, CARD, MUTED, BORDER, D, inputStyle, callMarketingAi, callContentImage, timeAgo, STATUS_LABEL, type ContentItem, type Campaign, type Trend } from './shared'

const imgBtn = { padding: '5px 11px', background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: '7px', color: MUTED, fontSize: '10.5px', cursor: 'pointer', fontFamily: D } as const

// Controle opcional/manual de imagem. O fluxo automático (dados da Meta) já
// gera a imagem sozinho — isto é só o atalho pro dono gerar/trocar na mão.
function ImageControls({ c, accessToken, onRefresh }: { c: ContentItem; accessToken: string; onRefresh: () => Promise<void> }) {
  const [busy, setBusy] = useState<'generate' | 'variations' | 'select' | null>(null)
  const [err, setErr] = useState('')
  const options = c.image_options ?? []

  const run = async (action: 'generate' | 'variations' | 'select', extra: Record<string, unknown> = {}) => {
    setBusy(action)
    setErr('')
    try {
      await callContentImage(accessToken, c.id, action, extra)
      await onRefresh()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erro ao gerar imagem')
    }
    setBusy(null)
  }

  return (
    <div style={{ marginBottom: '10px', padding: '9px 10px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${BORDER}`, borderRadius: '8px' }}>
      <div style={{ fontSize: '9.5px', fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '7px' }}>🖼️ Imagem — opcional</div>
      {options.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(56px, 1fr))', gap: '6px', marginBottom: '7px' }}>
          {options.map(url => (
            <button key={url} onClick={() => run('select', { url })} disabled={!!busy} title="Usar esta imagem"
              style={{ padding: 0, border: c.image_url === url ? `2px solid ${ORANGE}` : `1px solid ${BORDER}`, borderRadius: '6px', overflow: 'hidden', cursor: busy ? 'default' : 'pointer', background: 'none', aspectRatio: '1' }}>
              <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </button>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        <button onClick={() => run('generate')} disabled={!!busy} style={imgBtn}>
          {busy === 'generate' ? 'Gerando...' : c.image_url ? 'Regerar' : 'Gerar imagem'}
        </button>
        <button onClick={() => run('variations')} disabled={!!busy} style={imgBtn}>
          {busy === 'variations' ? 'Gerando...' : 'Ver 3 opções'}
        </button>
      </div>
      {err && <div style={{ color: '#f87171', fontSize: '10.5px', marginTop: '6px' }}>{err}</div>}
    </div>
  )
}

const STATUS_COLOR: Record<string, string> = { idea: MUTED, draft: '#FBBF24', approved: '#4ade80', scheduled: '#60a5fa', published: '#A78BFA' }
const CAMPAIGN_STATUS_LABEL: Record<string, string> = { planned: 'Planejada', active: 'Ativa', completed: 'Concluída', cancelled: 'Cancelada' }
const TREND_COLOR: Record<string, string> = { high: '#f87171', medium: '#FBBF24', low: MUTED }

export default function ContentTab({
  companyId, accessToken, content, campaigns, trends, onRefresh,
}: {
  companyId: string; accessToken: string; content: ContentItem[]; campaigns: Campaign[]; trends: Trend[]; onRefresh: () => Promise<void>
}) {
  const [generating, setGenerating] = useState(false)
  const [detectingTrends, setDetectingTrends] = useState(false)
  const [error, setError] = useState('')
  const [campaignFilter, setCampaignFilter] = useState('all')
  const [showNewCampaign, setShowNewCampaign] = useState(false)
  const [newCampaignName, setNewCampaignName] = useState('')
  const [newCampaignGoal, setNewCampaignGoal] = useState('')

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

  const detectTrends = async () => {
    setDetectingTrends(true)
    setError('')
    try {
      await callMarketingAi(accessToken, 'run_trends')
      await onRefresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao detectar tendências')
    }
    setDetectingTrends(false)
  }

  const approve = async (id: string) => {
    await supabase.from('marketing_ai_content').update({ status: 'approved', updated_at: new Date().toISOString() }).eq('id', id)
    await onRefresh()
  }
  const dismiss = async (id: string) => {
    await supabase.from('marketing_ai_content').delete().eq('id', id)
    await onRefresh()
  }
  const assignCampaign = async (contentId: string, campaignId: string) => {
    await supabase.from('marketing_ai_content').update({ campaign_id: campaignId || null, updated_at: new Date().toISOString() }).eq('id', contentId)
    await onRefresh()
  }
  const createCampaign = async () => {
    if (!newCampaignName.trim()) return
    await supabase.from('marketing_ai_campaigns').insert({ company_id: companyId, name: newCampaignName.trim(), goal: newCampaignGoal || null })
    setNewCampaignName('')
    setNewCampaignGoal('')
    setShowNewCampaign(false)
    await onRefresh()
  }

  const filtered = campaignFilter === 'all' ? content : campaignFilter === 'none' ? content.filter(c => !c.campaign_id) : content.filter(c => c.campaign_id === campaignFilter)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ fontSize: '12.5px', color: MUTED }}>Ideias e legendas geradas pela IA — sempre como rascunho, nunca publicado sozinho.</div>
        <button onClick={generate} disabled={generating}
          style={{ padding: '8px 16px', background: ORANGE, color: '#000', fontWeight: 700, fontSize: '12px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
          {generating ? 'Gerando...' : '✨ Gerar ideias'}
        </button>
      </div>
      {error && <div style={{ color: '#f87171', fontSize: '12px', marginBottom: '14px' }}>{error}</div>}

      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '12px', padding: '14px', marginBottom: '18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: trends.length > 0 ? '10px' : 0 }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'white' }}>📡 Tendências pro segmento</div>
          <button onClick={detectTrends} disabled={detectingTrends} style={{ padding: '5px 12px', background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: '7px', color: ORANGE, fontSize: '11px', cursor: 'pointer' }}>
            {detectingTrends ? 'Detectando...' : 'Detectar tendências'}
          </button>
        </div>
        {trends.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {trends.slice(0, 4).map(t => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '7px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: '7px' }}>
                {t.relevance && <span style={{ fontSize: '9px', fontWeight: 700, color: TREND_COLOR[t.relevance], flexShrink: 0, marginTop: '1px' }}>●</span>}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '11.5px', fontWeight: 600, color: 'white' }}>{t.title}</div>
                  <div style={{ fontSize: '10.5px', color: MUTED, lineHeight: 1.4 }}>{t.description}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '18px' }}>
        <select value={campaignFilter} onChange={e => setCampaignFilter(e.target.value)} style={{ ...inputStyle, padding: '6px 10px' }}>
          <option value="all">Todas as campanhas</option>
          <option value="none">Sem campanha</option>
          {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button onClick={() => setShowNewCampaign(s => !s)} style={{ padding: '6px 12px', background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: '7px', color: MUTED, fontSize: '11.5px', cursor: 'pointer' }}>
          + Nova campanha
        </button>
      </div>

      {showNewCampaign && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '18px', flexWrap: 'wrap' }}>
          <input value={newCampaignName} onChange={e => setNewCampaignName(e.target.value)} placeholder="Nome da campanha" style={{ ...inputStyle, flex: 1, minWidth: '160px' }} />
          <input value={newCampaignGoal} onChange={e => setNewCampaignGoal(e.target.value)} placeholder="Objetivo (opcional)" style={{ ...inputStyle, flex: 1, minWidth: '160px' }} />
          <button onClick={createCampaign} style={{ padding: '8px 16px', background: ORANGE, color: '#000', fontWeight: 700, fontSize: '12px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>Criar</button>
        </div>
      )}

      {campaigns.length > 0 && campaignFilter === 'all' && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '18px' }}>
          {campaigns.map(c => (
            <div key={c.id} style={{ padding: '8px 12px', background: CARD, border: `1px solid ${BORDER}`, borderRadius: '9px', fontSize: '11.5px' }}>
              <span style={{ color: 'white', fontWeight: 600 }}>{c.name}</span>
              <span style={{ color: MUTED, marginLeft: '8px' }}>{CAMPAIGN_STATUS_LABEL[c.status]}</span>
              <span style={{ color: 'rgba(255,255,255,0.3)', marginLeft: '8px' }}>{content.filter(x => x.campaign_id === c.id).length} posts</span>
            </div>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div style={{ padding: '32px', textAlign: 'center', color: MUTED, fontSize: '13px', background: CARD, border: `1px solid ${BORDER}`, borderRadius: '12px' }}>
          {content.length === 0 ? 'Nenhuma ideia ainda. Configure a marca em Configurações e clique em "Gerar ideias".' : 'Nada nesse filtro ainda.'}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {filtered.map(c => (
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
                {campaigns.length > 0 && (
                  <select value={c.campaign_id ?? ''} onChange={e => assignCampaign(c.id, e.target.value)}
                    style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', padding: '5px 8px', fontSize: '11px', marginBottom: '8px', fontFamily: D }}>
                    <option value="">Sem campanha</option>
                    {campaigns.map(camp => <option key={camp.id} value={camp.id}>{camp.name}</option>)}
                  </select>
                )}
                <ImageControls c={c} accessToken={accessToken} onRefresh={onRefresh} />
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
