import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import { CARD, MUTED, BORDER, D, inputStyle } from './shared'

const ORANGE = '#FF6D29'

type Kind = 'framework' | 'hook' | 'cta' | 'visual_system' | 'personality'

interface Entry {
  id: string
  company_id: string | null
  kind: Kind
  title: string
  content: string
  tags: string[]
  created_at: string
}

const KIND_META: { key: Kind; icon: string; label: string; hint: string }[] = [
  { key: 'personality', icon: '🎭', label: 'Personalidades', hint: 'Os especialistas que o Diretor Criativo aciona' },
  { key: 'framework', icon: '🧩', label: 'Frameworks de copy', hint: 'Estruturas de texto que vendem' },
  { key: 'hook', icon: '🪝', label: 'Hooks', hint: 'Ganchos de primeira linha' },
  { key: 'cta', icon: '📣', label: 'CTAs', hint: 'Chamadas pra ação' },
  { key: 'visual_system', icon: '🎨', label: 'Sistemas visuais', hint: 'Formatos de criativo' },
]

// Biblioteca de Conhecimento (Fase 2): os recursos que as personalidades
// consultam ao criar. Vêm itens embutidos (globais) + os que o dono adicionar.
// É a fundação modular — adicionar um framework/estilo aqui passa a valer pra
// toda geração automaticamente.
export default function ContentLibrary({ companyId }: { companyId: string }) {
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState<Kind | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  const load = useCallback(async () => {
    const { data } = await supabase.from('marketing_ai_knowledge').select('*').order('kind').order('created_at')
    setEntries((data ?? []) as Entry[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const add = async (kind: Kind) => {
    if (!title.trim() || !content.trim()) return
    await supabase.from('marketing_ai_knowledge').insert({ company_id: companyId, kind, title: title.trim(), content: content.trim() })
    setTitle(''); setContent(''); setAdding(null)
    await load()
  }
  const remove = async (id: string) => {
    await supabase.from('marketing_ai_knowledge').delete().eq('id', id)
    await load()
  }

  return (
    <div>
      <div style={{ padding: '12px 16px', background: 'rgba(255,109,41,0.06)', border: '1px solid rgba(255,109,41,0.2)', borderRadius: '11px', fontSize: '11.5px', color: 'white', lineHeight: 1.6, marginBottom: '22px' }}>
        📚 <strong>Biblioteca de Conhecimento.</strong> Os recursos que os especialistas consultam pra criar — frameworks, ganchos, CTAs, estilos visuais e as personalidades. Os itens embutidos já valem pra todo mundo; você pode adicionar os seus. Quanto mais rica a biblioteca, melhor o conteúdo gerado.
      </div>

      {loading ? (
        <div style={{ fontSize: '12px', color: MUTED }}>Carregando biblioteca...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '26px' }}>
          {KIND_META.map(km => {
            const list = entries.filter(e => e.kind === km.key)
            return (
              <section key={km.key}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '15px' }}>{km.icon}</span>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: 'white' }}>{km.label}</div>
                    <div style={{ fontSize: '10.5px', color: MUTED }}>{km.hint}</div>
                  </div>
                  <button onClick={() => { setAdding(adding === km.key ? null : km.key); setTitle(''); setContent('') }}
                    style={{ marginLeft: 'auto', padding: '5px 12px', background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: '7px', color: ORANGE, fontSize: '11px', cursor: 'pointer', fontFamily: D }}>
                    {adding === km.key ? 'Cancelar' : '+ Adicionar'}
                  </button>
                </div>

                {adding === km.key && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px', padding: '12px', background: CARD, border: `1px solid ${BORDER}`, borderRadius: '10px' }}>
                    <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Título (ex: Meu gancho favorito)" style={{ ...inputStyle }} />
                    <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Descrição / template" rows={3} style={{ ...inputStyle, resize: 'vertical', fontFamily: D }} />
                    <button onClick={() => add(km.key)} style={{ alignSelf: 'flex-start', padding: '7px 16px', background: ORANGE, color: '#000', fontWeight: 700, fontSize: '12px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontFamily: D }}>Salvar</button>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '10px' }}>
                  {list.map(e => (
                    <div key={e.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '10px', padding: '12px 13px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '5px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: 'white' }}>{e.title}</span>
                        {e.company_id === null
                          ? <span style={{ fontSize: '8.5px', fontWeight: 700, color: MUTED, border: `1px solid ${BORDER}`, borderRadius: '99px', padding: '1px 6px' }}>EMBUTIDO</span>
                          : <button onClick={() => remove(e.id)} title="Remover" style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: MUTED, fontSize: '12px', cursor: 'pointer' }}>🗑</button>}
                      </div>
                      <div style={{ fontSize: '11px', color: MUTED, lineHeight: 1.5 }}>{e.content}</div>
                    </div>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
