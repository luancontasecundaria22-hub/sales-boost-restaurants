import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import { CARD, MUTED, BORDER, D, inputStyle } from './shared'

const ORANGE = '#FF6D29'

interface Fmt { id: string; title: string; content: string | null; meta: { fields?: string[]; example?: string } | null; created_at: string }

// Modelos prontos pra começar rápido — clicou, preenche o formulário.
const PRESETS: { title: string; content: string; fields: string[] }[] = [
  { title: 'Print de Tweet', content: 'Parece um post do X/Twitter — bom pra frases de efeito e opiniões.', fields: ['@usuário', 'nome de exibição', 'avatar', 'texto do tweet', 'curtidas', 'retweets', 'data'] },
  { title: 'Card de Citação', content: 'Uma frase forte em destaque com atribuição.', fields: ['citação', 'autor', 'cargo/negócio', 'logo', 'cor de fundo'] },
  { title: 'Infográfico', content: 'Dados/passos em blocos visuais numerados.', fields: ['título', 'itens (lista)', 'ícone por item', 'fonte do dado', 'logo'] },
  { title: 'Antes / Depois', content: 'Comparação lado a lado do resultado.', fields: ['imagem antes', 'imagem depois', 'rótulo antes', 'rótulo depois', 'legenda do resultado'] },
  { title: 'Foco no Produto', content: 'Produto em destaque com nome e preço.', fields: ['foto do produto', 'nome', 'preço', 'chamada', 'logo'] },
]

// Formatos — a anatomia de cada tipo de post: quais campos/componentes a IA
// precisa preencher pra montar aquela imagem. Reusa marketing_ai_knowledge
// (module='formato'); o creative-generate consulta esses formatos ao criar.
export default function FormatsLibrary({ companyId }: { companyId: string }) {
  const [formats, setFormats] = useState<Fmt[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [fields, setFields] = useState('')
  const [example, setExample] = useState('')

  const load = useCallback(async () => {
    const { data } = await supabase.from('marketing_ai_knowledge').select('id, title, content, meta, created_at').eq('company_id', companyId).eq('module', 'formato').order('created_at', { ascending: false })
    setFormats((data ?? []) as Fmt[])
    setLoading(false)
  }, [companyId])
  useEffect(() => { load() }, [load])

  const usePreset = (p: typeof PRESETS[number]) => { setName(p.title); setDesc(p.content); setFields(p.fields.join(', ')); setExample(''); setAdding(true) }

  const save = async () => {
    if (!name.trim()) return
    const arr = fields.split(/[,\n]/).map(s => s.trim()).filter(Boolean)
    await supabase.from('marketing_ai_knowledge').insert({
      company_id: companyId, module: 'formato', kind: 'format', title: name.trim(), content: desc.trim() || null,
      meta: { fields: arr, example: example.trim() || undefined },
    })
    setName(''); setDesc(''); setFields(''); setExample(''); setAdding(false)
    await load()
  }
  const remove = async (id: string) => { await supabase.from('marketing_ai_knowledge').delete().eq('id', id); await load() }

  return (
    <div>
      <div style={{ padding: '12px 16px', background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.22)', borderRadius: '11px', fontSize: '11.5px', color: 'white', lineHeight: 1.6, marginBottom: '16px' }}>
        🧩 <strong>Formatos.</strong> Cada formato é a <strong>anatomia</strong> de um tipo de post — os campos/componentes que a IA precisa pra montar aquela imagem (ex: <em>Print de Tweet</em> → @usuário, nome, avatar, texto...). O <strong>Diretor Criativo consulta esses formatos</strong> ao gerar, e escolhe a anatomia certa. Quanto mais formatos, mais tipos de imagem ele sabe montar.
      </div>

      {/* Modelos prontos */}
      <div style={{ marginBottom: '14px' }}>
        <div style={{ fontSize: '10.5px', color: MUTED, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '7px' }}>Começar rápido</div>
        <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap' }}>
          {PRESETS.map(p => (
            <button key={p.title} onClick={() => usePreset(p)} style={{ padding: '6px 12px', background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.3)', borderRadius: '99px', color: '#93c5fd', fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: D }}>+ {p.title}</button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '18px' }}>
        <button onClick={() => setAdding(a => !a)} style={{ padding: '6px 13px', background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: '7px', color: ORANGE, fontSize: '11.5px', cursor: 'pointer', fontFamily: D }}>
          {adding ? 'Cancelar' : '+ Criar formato do zero'}
        </button>
        {adding && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px', padding: '14px', background: CARD, border: `1px solid ${BORDER}`, borderRadius: '11px', maxWidth: '560px' }}>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Nome do formato (ex: Print de Tweet)" style={inputStyle} />
            <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Quando usar / o que é" style={inputStyle} />
            <textarea value={fields} onChange={e => setFields(e.target.value)} placeholder="Campos necessários, separados por vírgula (ex: @usuário, nome, avatar, texto, curtidas)" rows={2} style={{ ...inputStyle, resize: 'vertical', fontFamily: D }} />
            <input value={example} onChange={e => setExample(e.target.value)} placeholder="Exemplo/observação (opcional)" style={inputStyle} />
            <button onClick={save} disabled={!name.trim()} style={{ alignSelf: 'flex-start', padding: '8px 18px', background: name.trim() ? ORANGE : 'rgba(255,255,255,0.08)', color: name.trim() ? '#000' : MUTED, fontWeight: 700, fontSize: '12px', borderRadius: '8px', border: 'none', cursor: name.trim() ? 'pointer' : 'not-allowed', fontFamily: D }}>Salvar formato</button>
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ fontSize: '12px', color: MUTED }}>Carregando...</div>
      ) : formats.length === 0 ? (
        <div style={{ padding: '28px', textAlign: 'center', color: MUTED, fontSize: '12.5px', background: CARD, border: `1px dashed ${BORDER}`, borderRadius: '12px' }}>
          Nenhum formato ainda. Use um modelo pronto acima ou crie do zero — o Diretor Criativo passa a usar assim que você salvar.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '12px' }}>
          {formats.map(f => (
            <div key={f.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '12px', padding: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '5px' }}>
                <span style={{ fontSize: '12.5px', fontWeight: 800, color: 'white', flex: 1 }}>{f.title}</span>
                <button onClick={() => remove(f.id)} title="Remover" style={{ background: 'transparent', border: 'none', color: MUTED, fontSize: '12px', cursor: 'pointer' }}>🗑</button>
              </div>
              {f.content && <div style={{ fontSize: '11px', color: MUTED, lineHeight: 1.5, marginBottom: '8px' }}>{f.content}</div>}
              {f.meta?.fields?.length ? (
                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                  {f.meta.fields.map((c, i) => <span key={i} style={{ fontSize: '9px', fontWeight: 600, color: '#93c5fd', background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.25)', borderRadius: '99px', padding: '2px 8px' }}>{c}</span>)}
                </div>
              ) : null}
              {f.meta?.example && <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '8px', fontStyle: 'italic' }}>{f.meta.example}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
