import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import { CARD, MUTED, BORDER, D, inputStyle } from './shared'
import VisualLibrary from './VisualLibrary'
import CreativeAgent from './CreativeAgent'
import FormatsLibrary from './FormatsLibrary'

const ORANGE = '#FF6D29'

interface Entry {
  id: string
  company_id: string | null
  module: string
  kind: string
  title: string
  content: string
  created_at: string
}

// Abas de topo da Biblioteca.
const TOP_TABS: { key: string; icon: string; label: string }[] = [
  { key: 'recursos', icon: '📚', label: 'Recursos' },
  { key: 'creative', icon: '💡', label: 'Creative Agent' },
  { key: 'formatos', icon: '🧩', label: 'Formatos' },
  { key: 'visual', icon: '🎨', label: 'Estilos e Visuais' },
]
// Sub-abas dentro de Recursos: os três formatos + o núcleo comum.
const MODULES: { key: string; icon: string; label: string }[] = [
  { key: 'organico', icon: '✍️', label: 'Orgânico' },
  { key: 'stories', icon: '📖', label: 'Stories' },
  { key: 'campanhas', icon: '🎯', label: 'Campanhas' },
  { key: 'core', icon: '🌐', label: 'Núcleo comum' },
]

export const KIND_LABEL: Record<string, string> = {
  personality: 'Personalidades', framework: 'Frameworks de copy', hook: 'Hooks', cta: 'CTAs', visual_system: 'Sistemas visuais',
  principle: 'Princípios', design: 'Design', carousel: 'Carrossel', single_image: 'Imagem única', educational: 'Educativo',
  storytelling: 'Storytelling', authority: 'Autoridade', engagement: 'Engajamento', viral: 'Viral', feed: 'Feed', structure: 'Estruturas',
  sequence: 'Sequências', sticker: 'Stickers', poll: 'Enquetes', countdown: 'Contagem regressiva', link: 'Links', bts: 'Bastidores',
  urgency: 'Urgência', retention: 'Retenção', story_ads: 'Story Ads',
  objective: 'Objetivos', funnel: 'Funil', ad_copy: 'Copy de anúncio', headline: 'Headlines', offer: 'Ofertas', targeting: 'Segmentação',
  retargeting: 'Retargeting', ugc: 'UGC', video_ad: 'Vídeo ad', image_ad: 'Imagem ad', meta_best: 'Meta Ads', scaling: 'Escala', fatigue: 'Fadiga de criativo',
  emotion: 'Emoções', composition: 'Composição', component: 'Componentes',
}
export const kindLabel = (k: string) => KIND_LABEL[k] ?? k.charAt(0).toUpperCase() + k.slice(1).replace(/_/g, ' ')

// Biblioteca de Conhecimento por módulo (Fase 2): cada módulo tem seu acervo
// especializado + o núcleo comum. A IA usa core + o módulo que está gerando.
export default function ContentLibrary({ companyId }: { companyId: string }) {
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [top, setTop] = useState('recursos')
  const [mod, setMod] = useState('organico')
  const [adding, setAdding] = useState(false)
  const [kind, setKind] = useState('hook')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  const load = useCallback(async () => {
    const { data } = await supabase.from('marketing_ai_knowledge').select('*').order('module').order('kind')
    setEntries((data ?? []) as Entry[])
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const add = async () => {
    if (!title.trim() || !content.trim()) return
    await supabase.from('marketing_ai_knowledge').insert({ company_id: companyId, module: mod, kind: kind.trim() || 'hook', title: title.trim(), content: content.trim() })
    setTitle(''); setContent(''); setAdding(false)
    await load()
  }
  const remove = async (id: string) => { await supabase.from('marketing_ai_knowledge').delete().eq('id', id); await load() }

  // Mostra o acervo do módulo escolhido + o núcleo comum (exceto quando o
  // próprio núcleo está selecionado).
  const visible = entries.filter(e => e.module === mod || (mod !== 'core' && e.module === 'core'))
  const kinds = [...new Set(visible.sort((a, b) => (a.module === 'core' ? 1 : 0) - (b.module === 'core' ? 1 : 0)).map(e => e.kind))]
  const kindOptions = [...new Set(entries.filter(e => e.module === mod || e.module === 'core').map(e => e.kind))].sort()

  return (
    <div>
      <div style={{ marginBottom: '18px' }}>
        <div style={{ fontSize: '15px', fontWeight: 800, color: 'white', marginBottom: '3px' }}>📚 Biblioteca do Agente de Conteúdo</div>
        <div style={{ fontSize: '11.5px', color: MUTED, lineHeight: 1.55, maxWidth: '760px' }}>
          O que você ensina aqui, o agente usa automaticamente ao criar: <strong style={{ color: 'white' }}>Recursos</strong> (hooks, frameworks, personalidades), <strong style={{ color: 'white' }}>Creative Agent</strong> (ideias de post), <strong style={{ color: 'white' }}>Formatos</strong> (a anatomia de cada imagem) e <strong style={{ color: 'white' }}>Estilos e Visuais</strong> (o Kit da marca — logo, cores, voz).
        </div>
      </div>

      {/* Abas de topo da Biblioteca */}
      <div style={{ display: 'inline-flex', gap: '4px', padding: '4px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}`, borderRadius: '11px', marginBottom: '18px', flexWrap: 'wrap' }}>
        {TOP_TABS.map(t => {
          const active = top === t.key
          return (
            <button key={t.key} onClick={() => setTop(t.key)}
              style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '9px 15px', background: active ? 'rgba(255,109,41,0.14)' : 'transparent', border: `1px solid ${active ? 'rgba(255,109,41,0.4)' : 'transparent'}`, borderRadius: '8px', cursor: 'pointer', fontFamily: D }}>
              <span style={{ fontSize: '14px' }}>{t.icon}</span>
              <span style={{ fontSize: '12.5px', fontWeight: 800, color: active ? ORANGE : 'white' }}>{t.label}</span>
            </button>
          )
        })}
      </div>

      {top === 'creative' ? <CreativeAgent companyId={companyId} />
        : top === 'formatos' ? <FormatsLibrary companyId={companyId} />
        : top === 'visual' ? <VisualLibrary companyId={companyId} />
        : (<>
      {/* Recursos — sub-abas por formato (a identidade da marca vive no Kit, em Estilos e Visuais) */}
      <div style={{ display: 'inline-flex', gap: '4px', padding: '4px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}`, borderRadius: '11px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {MODULES.map(m => {
          const active = mod === m.key
          return (
            <button key={m.key} onClick={() => setMod(m.key)}
              style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 13px', background: active ? 'rgba(255,109,41,0.12)' : 'transparent', border: `1px solid ${active ? 'rgba(255,109,41,0.35)' : 'transparent'}`, borderRadius: '8px', cursor: 'pointer', fontFamily: D }}>
              <span style={{ fontSize: '14px' }}>{m.icon}</span>
              <span style={{ fontSize: '12px', fontWeight: 700, color: active ? ORANGE : 'white' }}>{m.label}</span>
            </button>
          )
        })}
      </div>

      <div style={{ marginBottom: '16px' }}>
        <button onClick={() => setAdding(a => !a)} style={{ padding: '6px 13px', background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: '7px', color: ORANGE, fontSize: '11.5px', cursor: 'pointer', fontFamily: D }}>
          {adding ? 'Cancelar' : `+ Adicionar recurso em ${MODULES.find(m => m.key === mod)?.label}`}
        </button>
        {adding && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px', padding: '12px', background: CARD, border: `1px solid ${BORDER}`, borderRadius: '10px', maxWidth: '520px' }}>
            <select value={kind} onChange={e => setKind(e.target.value)} style={{ ...inputStyle, fontFamily: D }}>
              {kindOptions.map(k => <option key={k} value={k}>{kindLabel(k)}</option>)}
            </select>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Título" style={{ ...inputStyle }} />
            <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Descrição / template" rows={3} style={{ ...inputStyle, resize: 'vertical', fontFamily: D }} />
            <button onClick={add} style={{ alignSelf: 'flex-start', padding: '7px 16px', background: ORANGE, color: '#000', fontWeight: 700, fontSize: '12px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontFamily: D }}>Salvar</button>
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ fontSize: '12px', color: MUTED }}>Carregando biblioteca...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          {kinds.map(k => (
            <section key={k}>
              <div style={{ fontSize: '12.5px', fontWeight: 800, color: 'white', marginBottom: '10px' }}>{kindLabel(k)}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '10px' }}>
                {visible.filter(e => e.kind === k).map(e => (
                  <div key={e.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '10px', padding: '12px 13px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '5px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'white' }}>{e.title}</span>
                      {e.module === 'core' && <span style={{ fontSize: '8px', fontWeight: 700, color: '#60a5fa', border: '1px solid rgba(96,165,250,0.4)', borderRadius: '99px', padding: '1px 5px' }}>NÚCLEO</span>}
                      {e.company_id === null
                        ? (e.module !== 'core' && <span style={{ fontSize: '8.5px', fontWeight: 700, color: MUTED, border: `1px solid ${BORDER}`, borderRadius: '99px', padding: '1px 6px' }}>EMBUTIDO</span>)
                        : <button onClick={() => remove(e.id)} title="Remover" style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: MUTED, fontSize: '12px', cursor: 'pointer' }}>🗑</button>}
                    </div>
                    <div style={{ fontSize: '11px', color: MUTED, lineHeight: 1.5 }}>{e.content}</div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
      </>)}
    </div>
  )
}
