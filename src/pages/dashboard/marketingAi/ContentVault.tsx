import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../contexts/AuthContext'
import { CARD, MUTED, BORDER, D, timeAgo } from './shared'
import { callContentTest, ScoreBreakdown, type TestPost } from './TestingArea'

const GREEN = '#4ade80'
const KIND_LABEL: Record<string, string> = { organico: 'Orgânico', stories: 'Stories', campanhas: 'Campanhas' }

// Content Vault: só o conteúdo aprovado pelo controle de qualidade (nota ≥90),
// ordenado pela nota. É a "prateleira" de peças prontas — separada da criação.
// Daqui o dono publica (vira post 'aprovado' na aba Posts) ou descarta.
export default function ContentVault({ companyId, reloadKey }: { companyId: string; reloadKey?: number }) {
  const { session } = useAuth()
  const token = session?.access_token ?? ''
  const [items, setItems] = useState<(TestPost & { kind: string })[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [okMsg, setOkMsg] = useState('')

  const load = useCallback(async () => {
    const { data } = await supabase.from('marketing_ai_test_content').select('*')
      .eq('company_id', companyId).eq('status', 'vault').order('quality_score', { ascending: false })
    setItems((data ?? []) as (TestPost & { kind: string })[])
    setLoading(false)
  }, [companyId])

  useEffect(() => { load() }, [load, reloadKey])

  const publish = async (id: string) => {
    setBusyId(id); setError(''); setOkMsg('')
    try {
      await callContentTest(token, { action: 'approve', test_id: id })
      setOkMsg('Publicado na aba Posts (como aprovado) ✓')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao publicar')
    }
    setBusyId(null)
  }

  const backToTest = async (id: string) => {
    setBusyId(id); setError('')
    await supabase.from('marketing_ai_test_content').update({ status: 'draft' }).eq('id', id)
    await load()
    setBusyId(null)
  }

  const discard = async (id: string) => {
    setBusyId(id); setError('')
    await supabase.from('marketing_ai_test_content').delete().eq('id', id)
    await load()
    setBusyId(null)
  }

  return (
    <div>
      <div style={{ padding: '12px 16px', background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.22)', borderRadius: '11px', fontSize: '11.5px', color: 'white', lineHeight: 1.6, marginBottom: '20px' }}>
        ⭐ <strong>Content Vault.</strong> Só o conteúdo que passou no controle de qualidade (nota ≥90). Daqui você publica pra aba Posts quando quiser — a criação e a publicação ficam separadas.
      </div>

      {error && <div style={{ color: '#f87171', fontSize: '11.5px', marginBottom: '12px' }}>{error}</div>}
      {okMsg && <div style={{ color: GREEN, fontSize: '11.5px', marginBottom: '12px' }}>{okMsg}</div>}

      {loading ? (
        <div style={{ fontSize: '12px', color: MUTED }}>Carregando Vault...</div>
      ) : items.length === 0 ? (
        <div style={{ padding: '32px', textAlign: 'center', color: MUTED, fontSize: '12.5px', background: CARD, border: `1px dashed ${BORDER}`, borderRadius: '12px' }}>
          Vault vazio. Gere posts na Área de Testes (em Orgânico, Stories ou Campanhas) e envie os que passarem (≥90) pra cá.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
          {items.map(t => {
            const busy = busyId === t.id
            return (
              <div key={t.id} style={{ background: CARD, border: `1px solid rgba(74,222,128,0.25)`, borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {t.image_url
                  ? <img src={t.image_url} alt="" style={{ width: '100%', height: '160px', objectFit: 'cover' }} />
                  : <div style={{ width: '100%', height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.03)', color: MUTED, fontSize: '11px' }}>sem imagem</div>}
                <div style={{ padding: '13px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <span style={{ fontSize: '9px', fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{KIND_LABEL[t.kind] ?? t.kind}</span>
                    {t.format && <span style={{ fontSize: '9.5px', color: MUTED }}>· {t.format}</span>}
                    <span style={{ fontSize: '9.5px', color: 'rgba(255,255,255,0.3)', marginLeft: 'auto' }}>{timeAgo(t.created_at)}</span>
                  </div>
                  {t.idea && <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'white' }}>{t.idea}</div>}
                  {t.caption && <div style={{ fontSize: '11.5px', color: MUTED, lineHeight: 1.5, maxHeight: '84px', overflow: 'auto' }}>{t.caption}</div>}
                  {t.hashtags && <div style={{ fontSize: '11px', color: '#60a5fa', lineHeight: 1.4 }}>{t.hashtags}</div>}

                  <ScoreBreakdown post={t} />

                  <div style={{ display: 'flex', gap: '7px', marginTop: 'auto', paddingTop: '2px', flexWrap: 'wrap' }}>
                    <button onClick={() => publish(t.id)} disabled={busy}
                      style={{ flex: 1, padding: '8px', background: 'rgba(74,222,128,0.14)', border: '1px solid rgba(74,222,128,0.4)', borderRadius: '8px', color: GREEN, fontSize: '11.5px', fontWeight: 700, cursor: busy ? 'default' : 'pointer', fontFamily: D }}>
                      {busy ? '...' : '🚀 Publicar'}
                    </button>
                    <button onClick={() => backToTest(t.id)} disabled={busy} title="Voltar pra Área de Testes"
                      style={{ padding: '8px 10px', background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: '8px', color: MUTED, fontSize: '11.5px', cursor: busy ? 'default' : 'pointer', fontFamily: D }}>
                      ↩︎
                    </button>
                    <button onClick={() => discard(t.id)} disabled={busy}
                      style={{ padding: '8px 10px', background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: '8px', color: MUTED, fontSize: '11.5px', cursor: busy ? 'default' : 'pointer', fontFamily: D }}>
                      🗑
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
