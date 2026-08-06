import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../contexts/AuthContext'
import { CARD, MUTED, BORDER, D, SUPABASE_URL, timeAgo } from './shared'

const ORANGE = '#FF6D29'
const GREEN = '#4ade80'

type Kind = 'organico' | 'stories' | 'campanhas'

interface TestPost {
  id: string
  idea: string | null
  caption: string | null
  hashtags: string | null
  cta: string | null
  format: string | null
  image_url: string | null
  reasoning: string | null
  created_at: string
}

async function callContentTest(token: string, payload: Record<string, unknown>) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/content-test`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error ?? 'Erro na Área de Testes')
  return data
}

// Área de Testes (QC): gera posts de teste com o MESMO motor da automação
// (content-test → mesmo modelo/prompt do marketing-ai + generate-image), mas
// isolados numa tabela própria. Cada um dos 3 cards de conteúdo tem a sua.
// Só entram na aba Posts quando o dono aprova — não muda nada do fluxo atual.
export default function TestingArea({ companyId, kind }: { companyId: string; kind: Kind }) {
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
      .eq('company_id', companyId).eq('kind', kind).order('created_at', { ascending: false })
    setTests((data ?? []) as TestPost[])
    setLoading(false)
  }, [companyId, kind])

  useEffect(() => { load() }, [load])

  const generate = async () => {
    setGenerating(true); setError(''); setOkMsg('')
    try {
      const r = await callContentTest(token, { action: 'generate', kind })
      if (r?.image_generated === false) setOkMsg('Post gerado ✓ (a imagem não pôde ser gerada agora — legenda e textos estão prontos)')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao gerar post de teste')
    }
    setGenerating(false)
  }

  const approve = async (id: string) => {
    setBusyId(id); setError(''); setOkMsg('')
    try {
      await callContentTest(token, { action: 'approve', test_id: id })
      setOkMsg('Post aprovado e enviado pra aba Posts ✓')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao aprovar')
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
        <div style={{ maxWidth: '580px' }}>
          <div style={{ fontSize: '13px', fontWeight: 800, color: 'white', marginBottom: '3px' }}>🧪 Área de Testes</div>
          <div style={{ fontSize: '11.5px', color: MUTED, lineHeight: 1.55 }}>
            Gera posts de teste com o <strong>mesmo motor</strong> que a automação vai usar — imagem, legenda, hashtags e CTA reais. Ficam <strong>isolados aqui</strong>: não entram na fila principal nem publicam. Só vão pra aba <strong>Posts</strong> quando você aprovar. Gere quantos quiser pra comparar.
          </div>
        </div>
        <button onClick={generate} disabled={generating || !token}
          style={{ padding: '9px 16px', background: ORANGE, color: '#000', fontWeight: 700, fontSize: '12px', borderRadius: '9px', border: 'none', cursor: generating ? 'default' : 'pointer', fontFamily: D, flexShrink: 0, opacity: generating ? 0.7 : 1 }}>
          {generating ? 'Gerando post...' : '✨ Gerar post de teste'}
        </button>
      </div>

      {error && <div style={{ color: '#f87171', fontSize: '11.5px', marginBottom: '12px' }}>{error}</div>}
      {okMsg && <div style={{ color: GREEN, fontSize: '11.5px', marginBottom: '12px' }}>{okMsg}</div>}

      {loading ? (
        <div style={{ fontSize: '12px', color: MUTED }}>Carregando testes...</div>
      ) : tests.length === 0 ? (
        <div style={{ padding: '24px', textAlign: 'center', color: MUTED, fontSize: '12.5px', background: CARD, border: `1px dashed ${BORDER}`, borderRadius: '11px' }}>
          Nenhum post de teste ainda. Clique em <strong>"Gerar post de teste"</strong> pra validar a geração completa antes de aprovar.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
          {tests.map(t => (
            <div key={t.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {t.image_url
                ? <img src={t.image_url} alt="" style={{ width: '100%', height: '150px', objectFit: 'cover' }} />
                : <div style={{ width: '100%', height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.03)', color: MUTED, fontSize: '11px' }}>sem imagem</div>}
              <div style={{ padding: '13px', display: 'flex', flexDirection: 'column', gap: '7px', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                  {t.format && <span style={{ fontSize: '9px', fontWeight: 700, color: ORANGE, padding: '2px 7px', borderRadius: '99px', border: `1px solid rgba(255,109,41,0.35)`, textTransform: 'uppercase' }}>{t.format}</span>}
                  <span style={{ fontSize: '9.5px', color: 'rgba(255,255,255,0.3)', marginLeft: 'auto' }}>{timeAgo(t.created_at)}</span>
                </div>
                {t.idea && <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'white' }}>{t.idea}</div>}
                {t.caption && <div style={{ fontSize: '11.5px', color: MUTED, lineHeight: 1.5, maxHeight: '96px', overflow: 'auto' }}>{t.caption}</div>}
                {t.cta && (
                  <div style={{ fontSize: '11px', color: 'white', background: 'rgba(255,109,41,0.1)', border: '1px solid rgba(255,109,41,0.25)', borderRadius: '7px', padding: '6px 9px' }}>
                    <span style={{ color: ORANGE, fontWeight: 700 }}>CTA:</span> {t.cta}
                  </div>
                )}
                {t.hashtags && <div style={{ fontSize: '11px', color: '#60a5fa', lineHeight: 1.4 }}>{t.hashtags}</div>}
                {t.reasoning && <div style={{ fontSize: '10.5px', color: 'rgba(255,255,255,0.35)', fontStyle: 'italic', lineHeight: 1.5 }}>💡 {t.reasoning}</div>}
                <div style={{ display: 'flex', gap: '7px', marginTop: 'auto', paddingTop: '4px' }}>
                  <button onClick={() => approve(t.id)} disabled={busyId === t.id}
                    style={{ flex: 1, padding: '8px', background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.35)', borderRadius: '8px', color: GREEN, fontSize: '11.5px', fontWeight: 700, cursor: busyId === t.id ? 'default' : 'pointer', fontFamily: D }}>
                    {busyId === t.id ? '...' : '✓ Aprovar'}
                  </button>
                  <button onClick={() => discard(t.id)} disabled={busyId === t.id}
                    style={{ padding: '8px 12px', background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: '8px', color: MUTED, fontSize: '11.5px', cursor: busyId === t.id ? 'default' : 'pointer', fontFamily: D }}>
                    Descartar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
