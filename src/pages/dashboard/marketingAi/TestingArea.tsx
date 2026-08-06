import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../contexts/AuthContext'
import { CARD, MUTED, BORDER, D, SUPABASE_URL, timeAgo } from './shared'

const ORANGE = '#FF6D29'
const GREEN = '#4ade80'

type Kind = 'organico' | 'stories' | 'campanhas'
type CatScore = { score: number; comment: string }

export interface TestPost {
  id: string
  idea: string | null
  caption: string | null
  hashtags: string | null
  cta: string | null
  format: string | null
  image_url: string | null
  reasoning: string | null
  scores: Record<string, CatScore> | null
  quality_score: number | null
  status: string
  brief: Record<string, string> | null
  personality: string | null
  created_at: string
}

// Brief do Diretor Criativo (Fase 2): mostra como o conteúdo nasceu.
export function BriefBlock({ post }: { post: TestPost }) {
  const b = post.brief
  if (!b && !post.personality) return null
  const chips = [
    post.personality && `🎭 ${post.personality}`,
    b?.objective && `🎯 ${b.objective}`,
    b?.visual_system && `🎨 ${b.visual_system}`,
    b?.framework && `🧩 ${b.framework}`,
  ].filter(Boolean) as string[]
  return (
    <div style={{ background: 'rgba(255,109,41,0.06)', border: '1px solid rgba(255,109,41,0.18)', borderRadius: '8px', padding: '8px 10px' }}>
      <div style={{ fontSize: '9px', fontWeight: 700, color: ORANGE, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '5px' }}>🎬 Brief do Diretor</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
        {chips.map(c => <span key={c} style={{ fontSize: '9.5px', color: 'white', background: 'rgba(255,255,255,0.05)', borderRadius: '99px', padding: '2px 7px' }}>{c}</span>)}
      </div>
    </div>
  )
}

export const CAT_LABEL: Record<string, string> = {
  creative: 'Criativo', novelty: 'Novidade', brand: 'Marca', hook: 'Hook', cta: 'CTA',
  visual: 'Visual', engagement: 'Engaj.', conversion: 'Conversão', readability: 'Leitura',
}
export const CAT_ORDER = ['creative', 'novelty', 'brand', 'hook', 'cta', 'visual', 'engagement', 'conversion', 'readability']
export const scoreColor = (n: number) => (n >= 90 ? GREEN : n >= 75 ? '#FBBF24' : '#f87171')

export async function callContentTest(token: string, payload: Record<string, unknown>) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/content-test`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error ?? 'Erro na Área de Testes')
  return data as { id?: string; quality_score?: number; regenerated?: string; image_generated?: boolean }
}

// Grade de notas do júri: nota final ponderada + cada dimensão (comentário no hover).
export function ScoreBreakdown({ post }: { post: TestPost }) {
  if (post.quality_score == null || !post.scores) return null
  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${BORDER}`, borderRadius: '8px', padding: '9px 10px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '7px', marginBottom: '7px' }}>
        <span style={{ fontSize: '22px', fontWeight: 800, color: scoreColor(post.quality_score), lineHeight: 1 }}>{post.quality_score}</span>
        <span style={{ fontSize: '10px', color: MUTED }}>/100 · nota de qualidade</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
        {CAT_ORDER.filter(c => post.scores![c]).map(c => (
          <span key={c} title={post.scores![c].comment}
            style={{ fontSize: '9px', fontWeight: 700, color: scoreColor(post.scores![c].score), border: `1px solid ${scoreColor(post.scores![c].score)}44`, borderRadius: '99px', padding: '2px 6px', cursor: 'help' }}>
            {CAT_LABEL[c]} {post.scores![c].score}
          </span>
        ))}
      </div>
    </div>
  )
}

// Área de Testes (QC): gera com o mesmo motor da automação, avalia com o júri
// (nota ponderada), e roteia: passou (>=90) → Vault; reprovou → regenera só o
// componente fraco. Isolado da fila principal; só publica quando o dono manda.
export default function TestingArea({ companyId, kind, onVaultChange }: { companyId: string; kind: Kind; onVaultChange?: () => void }) {
  const { session } = useAuth()
  const token = session?.access_token ?? ''
  const [tests, setTests] = useState<TestPost[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [okMsg, setOkMsg] = useState('')

  const load = useCallback(async () => {
    const { data } = await supabase.from('marketing_ai_test_content').select('*')
      .eq('company_id', companyId).eq('kind', kind).neq('status', 'vault').order('created_at', { ascending: false })
    setTests((data ?? []) as TestPost[])
    setLoading(false)
  }, [companyId, kind])

  useEffect(() => { load() }, [load])

  const generate = async () => {
    setGenerating(true); setError(''); setOkMsg('')
    try {
      // Passo 1+2: Diretor Criativo + personalidade (creative-generate)
      const res = await fetch(`${SUPABASE_URL}/functions/v1/creative-generate`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind }),
      })
      const r = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(r.error ?? 'Erro ao gerar post de teste')
      await load()
      // Passo 3: controle de qualidade (content-test)
      if (r?.id) { await callContentTest(token, { action: 'score', test_id: r.id }); await load() }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao gerar post de teste')
    }
    setGenerating(false)
  }

  const act = async (id: string, payload: Record<string, unknown>, okText?: string) => {
    setBusyId(id); setError(''); setOkMsg('')
    try {
      const r = await callContentTest(token, { ...payload, test_id: id })
      if (okText) setOkMsg(okText)
      if (payload.action === 'regenerate') setOkMsg(`Regenerado (${r.regenerated}) → nova nota ${r.quality_score}`)
      await load()
      if (payload.action === 'to_vault') onVaultChange?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro')
    }
    setBusyId(null)
  }

  const discard = async (id: string) => {
    setBusyId(id); setError('')
    await supabase.from('marketing_ai_test_content').delete().eq('id', id)
    await load()
    setBusyId(null)
  }

  return (
    <section style={{ marginTop: '26px', paddingTop: '22px', borderTop: `1px solid ${BORDER}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
        <div style={{ maxWidth: '600px' }}>
          <div style={{ fontSize: '13px', fontWeight: 800, color: 'white', marginBottom: '3px' }}>🧪 Área de Testes + Controle de Qualidade</div>
          <div style={{ fontSize: '11.5px', color: MUTED, lineHeight: 1.55 }}>
            Gera com o <strong>mesmo motor</strong> da automação e passa por um <strong>júri de revisores</strong> que dá uma nota de qualidade. <strong>Passou (≥90)</strong> → vai pro Vault. <strong>Reprovou</strong> → regenera só o ponto fraco. Só do Vault é que você publica.
          </div>
        </div>
        <button onClick={generate} disabled={generating || !token}
          style={{ padding: '9px 16px', background: ORANGE, color: '#000', fontWeight: 700, fontSize: '12px', borderRadius: '9px', border: 'none', cursor: generating ? 'default' : 'pointer', fontFamily: D, flexShrink: 0, opacity: generating ? 0.7 : 1 }}>
          {generating ? 'Gerando + avaliando...' : '✨ Gerar post de teste'}
        </button>
      </div>

      {error && <div style={{ color: '#f87171', fontSize: '11.5px', marginBottom: '12px' }}>{error}</div>}
      {okMsg && <div style={{ color: GREEN, fontSize: '11.5px', marginBottom: '12px' }}>{okMsg}</div>}

      {loading ? (
        <div style={{ fontSize: '12px', color: MUTED }}>Carregando testes...</div>
      ) : tests.length === 0 ? (
        <div style={{ padding: '24px', textAlign: 'center', color: MUTED, fontSize: '12.5px', background: CARD, border: `1px dashed ${BORDER}`, borderRadius: '11px' }}>
          Nenhum post de teste ainda. Clique em <strong>"Gerar post de teste"</strong> — ele já vem com nota de qualidade.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: '12px' }}>
          {tests.map(t => {
            const busy = busyId === t.id
            return (
              <div key={t.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {t.image_url
                  ? <img src={t.image_url} alt="" style={{ width: '100%', height: '150px', objectFit: 'cover' }} />
                  : <div style={{ width: '100%', height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.03)', color: MUTED, fontSize: '11px' }}>sem imagem</div>}
                <div style={{ padding: '13px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    {t.format && <span style={{ fontSize: '9px', fontWeight: 700, color: ORANGE, padding: '2px 7px', borderRadius: '99px', border: `1px solid rgba(255,109,41,0.35)`, textTransform: 'uppercase' }}>{t.format}</span>}
                    <span style={{ fontSize: '9.5px', color: 'rgba(255,255,255,0.3)', marginLeft: 'auto' }}>{timeAgo(t.created_at)}</span>
                  </div>
                  {t.idea && <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'white' }}>{t.idea}</div>}
                  {t.caption && <div style={{ fontSize: '11.5px', color: MUTED, lineHeight: 1.5, maxHeight: '84px', overflow: 'auto' }}>{t.caption}</div>}
                  {t.cta && (
                    <div style={{ fontSize: '11px', color: 'white', background: 'rgba(255,109,41,0.1)', border: '1px solid rgba(255,109,41,0.25)', borderRadius: '7px', padding: '6px 9px' }}>
                      <span style={{ color: ORANGE, fontWeight: 700 }}>CTA:</span> {t.cta}
                    </div>
                  )}
                  {t.hashtags && <div style={{ fontSize: '11px', color: '#60a5fa', lineHeight: 1.4 }}>{t.hashtags}</div>}

                  <BriefBlock post={t} />
                  <ScoreBreakdown post={t} />

                  <div style={{ display: 'flex', gap: '7px', marginTop: 'auto', paddingTop: '2px', flexWrap: 'wrap' }}>
                    {t.quality_score == null ? (
                      <button onClick={() => act(t.id, { action: 'score' })} disabled={busy}
                        style={{ flex: 1, padding: '8px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER}`, borderRadius: '8px', color: 'white', fontSize: '11.5px', fontWeight: 700, cursor: busy ? 'default' : 'pointer', fontFamily: D }}>
                        {busy ? '...' : 'Avaliar'}
                      </button>
                    ) : t.quality_score >= 90 ? (
                      <button onClick={() => act(t.id, { action: 'to_vault' }, 'Enviado pro Vault ✓')} disabled={busy}
                        style={{ flex: 1, padding: '8px', background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.35)', borderRadius: '8px', color: GREEN, fontSize: '11.5px', fontWeight: 700, cursor: busy ? 'default' : 'pointer', fontFamily: D }}>
                        {busy ? '...' : '⭐ Enviar pro Vault'}
                      </button>
                    ) : (
                      <button onClick={() => act(t.id, { action: 'regenerate' })} disabled={busy}
                        style={{ flex: 1, padding: '8px', background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.35)', borderRadius: '8px', color: '#FBBF24', fontSize: '11.5px', fontWeight: 700, cursor: busy ? 'default' : 'pointer', fontFamily: D }}>
                        {busy ? 'Regenerando...' : '🔁 Regenerar fraco'}
                      </button>
                    )}
                    <button onClick={() => discard(t.id)} disabled={busy}
                      style={{ padding: '8px 12px', background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: '8px', color: MUTED, fontSize: '11.5px', cursor: busy ? 'default' : 'pointer', fontFamily: D }}>
                      Descartar
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
