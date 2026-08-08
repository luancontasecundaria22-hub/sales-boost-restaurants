import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../../../lib/supabase'
import { CARD, MUTED, BORDER, D, inputStyle, timeAgo } from './shared'
import { ImageModal } from './TestingArea'

const ORANGE = '#FF6D29'

// Categorias sugeridas (extensível — o campo é livre com autocomplete).
const CATEGORIES = ['Minimalista', 'Editorial', 'Luxo', 'UGC', 'Tweet Print', 'Infográfico', 'Educativo', 'Tipografia forte', 'Foco no produto', 'Antes/Depois', 'Comparação', 'Meme', 'Custom']

interface RefMeta { category?: string; format?: string; industry?: string; visual_style?: string; colors?: string; typography?: string; composition?: string; notes?: string; source?: string; path?: string }
interface Reference { id: string; title: string; content: string | null; tags: string[]; image_url: string | null; meta: RefMeta | null; created_at: string }
interface ArchivePost { id: string; instagram_media_id: string | null; caption: string | null; image_url: string | null; posted_at: string | null; likes_count: number | null; comments_count: number | null }

// Layouts & Estilos — seção visual da Biblioteca. Distingue claramente:
//  • Referências Visuais (inspiração escolhida pelo dono, com upload)
//  • Arquivo de Conteúdo (posts publicados, importados da Meta — read-only)
//  • Padrões Vencedores (identificados por performance — próxima fase)
// Reusa marketing_ai_knowledge (module='visual'), instagram_posts e o Storage.
export default function VisualLibrary({ companyId }: { companyId: string }) {
  const [tab, setTab] = useState<'refs' | 'archive'>('refs')
  const [refs, setRefs] = useState<Reference[]>([])
  const [archive, setArchive] = useState<ArchivePost[]>([])
  const [loading, setLoading] = useState(true)
  const [zoom, setZoom] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('all')

  // upload / form
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [pending, setPending] = useState<{ url: string; path: string } | null>(null)
  const [f, setF] = useState<RefMeta & { name: string; description: string; tags: string }>({ name: '', description: '', tags: '', category: '', format: '', industry: '', visual_style: '', colors: '', typography: '', composition: '', notes: '', source: '' })
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    const [{ data: r }, { data: a }] = await Promise.all([
      supabase.from('marketing_ai_knowledge').select('id, title, content, tags, image_url, meta, created_at').eq('company_id', companyId).eq('module', 'visual').order('created_at', { ascending: false }),
      supabase.from('instagram_posts').select('id, instagram_media_id, caption, image_url, posted_at, likes_count, comments_count').eq('company_id', companyId).order('posted_at', { ascending: false }).limit(60),
    ])
    setRefs((r ?? []) as Reference[])
    setArchive((a ?? []) as ArchivePost[])
    setLoading(false)
  }, [companyId])
  useEffect(() => { load() }, [load])

  const onPick = () => fileRef.current?.click()
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true); setErr('')
    try {
      const ext = (file.name.split('.').pop() || 'png').toLowerCase()
      const path = `references/${companyId}/${crypto.randomUUID()}.${ext}`
      const { error } = await supabase.storage.from('post-images').upload(path, file, { contentType: file.type || 'image/png', upsert: false })
      if (error) throw error
      const { data } = supabase.storage.from('post-images').getPublicUrl(path)
      setPending({ url: data.publicUrl, path })
      setF(p => ({ ...p, name: p.name || file.name.replace(/\.[^.]+$/, '') }))
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Falha no upload')
    }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const saveRef = async () => {
    if (!pending || !f.name.trim()) return
    const meta: RefMeta = { category: f.category, format: f.format, industry: f.industry, visual_style: f.visual_style, colors: f.colors, typography: f.typography, composition: f.composition, notes: f.notes, source: f.source || 'Upload', path: pending.path }
    await supabase.from('marketing_ai_knowledge').insert({
      company_id: companyId, module: 'visual', kind: 'layout', title: f.name.trim(), content: f.description || null,
      tags: f.tags.split(',').map(t => t.trim()).filter(Boolean), image_url: pending.url, meta,
    })
    setPending(null)
    setF({ name: '', description: '', tags: '', category: '', format: '', industry: '', visual_style: '', colors: '', typography: '', composition: '', notes: '', source: '' })
    await load()
  }

  const removeRef = async (r: Reference) => {
    if (r.meta?.path) await supabase.storage.from('post-images').remove([r.meta.path]).catch(() => {})
    await supabase.from('marketing_ai_knowledge').delete().eq('id', r.id)
    await load()
  }

  const promote = async (p: ArchivePost) => {
    await supabase.from('marketing_ai_knowledge').insert({
      company_id: companyId, module: 'visual', kind: 'layout',
      title: (p.caption ?? 'Post do Instagram').slice(0, 60), content: p.caption ?? null, tags: ['instagram'],
      image_url: p.image_url, meta: { source: 'Instagram', category: '', format: '' } as RefMeta,
    })
    setTab('refs'); await load()
  }

  const cats = ['all', ...[...new Set(refs.map(r => r.meta?.category).filter(Boolean) as string[])]]
  const visibleRefs = refs.filter(r => (cat === 'all' || r.meta?.category === cat) && (!q.trim() || (r.title + ' ' + (r.content ?? '') + ' ' + r.tags.join(' ')).toLowerCase().includes(q.toLowerCase())))

  return (
    <div>
      <div style={{ padding: '12px 16px', background: 'rgba(167,139,250,0.07)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: '11px', fontSize: '11.5px', color: 'white', lineHeight: 1.6, marginBottom: '16px' }}>
        🎨 <strong>Layouts & Estilos.</strong> Guarde referências visuais (prints, inspirações, sistemas visuais) com metadados. O Diretor Criativo usa as mais relevantes ao criar. <strong>Referências</strong> = inspiração escolhida por você · <strong>Arquivo</strong> = seus posts publicados (via Meta) · <strong>Padrões vencedores</strong> = o que performa melhor (próxima fase).
      </div>

      <div style={{ display: 'inline-flex', gap: '4px', padding: '4px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}`, borderRadius: '10px', marginBottom: '18px' }}>
        {([['refs', '⭐ Referências Visuais'], ['archive', '🗂️ Arquivo de Conteúdo']] as const).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} style={{ padding: '7px 13px', background: tab === k ? 'rgba(167,139,250,0.15)' : 'transparent', border: `1px solid ${tab === k ? 'rgba(167,139,250,0.4)' : 'transparent'}`, borderRadius: '7px', color: tab === k ? '#A78BFA' : 'white', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: D }}>{label}</button>
        ))}
      </div>

      {err && <div style={{ color: '#f87171', fontSize: '11.5px', marginBottom: '12px' }}>{err}</div>}
      {loading ? <div style={{ fontSize: '12px', color: MUTED }}>Carregando...</div> : tab === 'refs' ? (
        <>
          <input ref={fileRef} type="file" accept="image/*" onChange={onFile} style={{ display: 'none' }} />
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '16px' }}>
            <button onClick={onPick} disabled={uploading} style={{ padding: '8px 16px', background: ORANGE, color: '#000', fontWeight: 700, fontSize: '12px', borderRadius: '9px', border: 'none', cursor: 'pointer', fontFamily: D }}>
              {uploading ? 'Enviando...' : '＋ Adicionar referência'}
            </button>
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar..." style={{ ...inputStyle, flex: 1, minWidth: '160px' }} />
            <select value={cat} onChange={e => setCat(e.target.value)} style={{ ...inputStyle, padding: '8px 10px' }}>
              {cats.map(c => <option key={c} value={c}>{c === 'all' ? 'Todas as categorias' : c}</option>)}
            </select>
          </div>

          {pending && (
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginBottom: '18px', padding: '14px', background: CARD, border: `1px solid ${BORDER}`, borderRadius: '12px' }}>
              <img src={pending.url} alt="" style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: '8px' }} />
              <div style={{ flex: 1, minWidth: '260px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="Nome *" style={inputStyle} />
                <input value={f.description} onChange={e => setF({ ...f, description: e.target.value })} placeholder="Descrição" style={inputStyle} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px' }}>
                  <input list="cat-list" value={f.category} onChange={e => setF({ ...f, category: e.target.value })} placeholder="Categoria" style={inputStyle} />
                  <datalist id="cat-list">{CATEGORIES.map(c => <option key={c} value={c} />)}</datalist>
                  <input value={f.format} onChange={e => setF({ ...f, format: e.target.value })} placeholder="Formato (carrossel, story...)" style={inputStyle} />
                  <input value={f.visual_style} onChange={e => setF({ ...f, visual_style: e.target.value })} placeholder="Estilo visual" style={inputStyle} />
                  <input value={f.colors} onChange={e => setF({ ...f, colors: e.target.value })} placeholder="Cores" style={inputStyle} />
                  <input value={f.typography} onChange={e => setF({ ...f, typography: e.target.value })} placeholder="Tipografia" style={inputStyle} />
                  <input value={f.composition} onChange={e => setF({ ...f, composition: e.target.value })} placeholder="Composição" style={inputStyle} />
                  <input value={f.industry} onChange={e => setF({ ...f, industry: e.target.value })} placeholder="Setor" style={inputStyle} />
                  <input value={f.source} onChange={e => setF({ ...f, source: e.target.value })} placeholder="Fonte" style={inputStyle} />
                  <input value={f.tags} onChange={e => setF({ ...f, tags: e.target.value })} placeholder="Tags (vírgula)" style={inputStyle} />
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={saveRef} disabled={!f.name.trim()} style={{ padding: '8px 18px', background: f.name.trim() ? ORANGE : 'rgba(255,255,255,0.08)', color: f.name.trim() ? '#000' : MUTED, fontWeight: 700, fontSize: '12px', borderRadius: '8px', border: 'none', cursor: f.name.trim() ? 'pointer' : 'not-allowed', fontFamily: D }}>Salvar referência</button>
                  <button onClick={() => setPending(null)} style={{ padding: '8px 14px', background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: '8px', color: MUTED, fontSize: '12px', cursor: 'pointer', fontFamily: D }}>Cancelar</button>
                </div>
              </div>
            </div>
          )}

          {visibleRefs.length === 0 ? (
            <div style={{ padding: '28px', textAlign: 'center', color: MUTED, fontSize: '12.5px', background: CARD, border: `1px dashed ${BORDER}`, borderRadius: '12px' }}>
              Nenhuma referência ainda. Suba prints e inspirações — o Diretor Criativo vai consultá-las ao criar.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '12px' }}>
              {visibleRefs.map(r => (
                <div key={r.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '11px', overflow: 'hidden' }}>
                  {r.image_url && <img src={r.image_url} alt="" onClick={() => setZoom(r.image_url)} style={{ width: '100%', height: '150px', objectFit: 'cover', cursor: 'zoom-in' }} />}
                  <div style={{ padding: '11px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'white', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</span>
                      <button onClick={() => removeRef(r)} title="Remover" style={{ background: 'transparent', border: 'none', color: MUTED, fontSize: '12px', cursor: 'pointer' }}>🗑</button>
                    </div>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {r.meta?.category && <span style={{ fontSize: '8.5px', fontWeight: 700, color: '#A78BFA', border: '1px solid rgba(167,139,250,0.4)', borderRadius: '99px', padding: '1px 7px' }}>{r.meta.category}</span>}
                      {r.meta?.format && <span style={{ fontSize: '8.5px', color: MUTED }}>{r.meta.format}</span>}
                      {r.meta?.colors && <span style={{ fontSize: '8.5px', color: MUTED }}>· {r.meta.colors}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        // Arquivo de Conteúdo (instagram_posts)
        archive.length === 0 ? (
          <div style={{ padding: '28px', textAlign: 'center', color: MUTED, fontSize: '12.5px', background: CARD, border: `1px dashed ${BORDER}`, borderRadius: '12px' }}>
            Arquivo vazio. Ele enche automaticamente com seus posts publicados quando o <strong>Instagram/Meta</strong> estiver conectado e sincronizado — sem duplicar mídia (usa a referência da Meta). Daqui você poderá promover posts a referência visual.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
            {archive.map(p => (
              <div key={p.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '11px', overflow: 'hidden' }}>
                {p.image_url && <img src={p.image_url} alt="" onClick={() => setZoom(p.image_url)} style={{ width: '100%', height: '160px', objectFit: 'cover', cursor: 'zoom-in' }} />}
                <div style={{ padding: '11px 12px' }}>
                  {p.caption && <div style={{ fontSize: '11px', color: MUTED, lineHeight: 1.4, maxHeight: '48px', overflow: 'hidden', marginBottom: '6px' }}>{p.caption}</div>}
                  <div style={{ display: 'flex', gap: '10px', fontSize: '10px', color: 'rgba(255,255,255,0.45)', marginBottom: '8px' }}>
                    <span>❤️ {p.likes_count ?? 0}</span><span>💬 {p.comments_count ?? 0}</span>
                    {p.posted_at && <span style={{ marginLeft: 'auto' }}>{timeAgo(p.posted_at)}</span>}
                  </div>
                  <button onClick={() => promote(p)} style={{ width: '100%', padding: '6px', background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.35)', borderRadius: '7px', color: '#A78BFA', fontSize: '10.5px', fontWeight: 700, cursor: 'pointer', fontFamily: D }}>⭐ Promover a referência</button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {zoom && <ImageModal images={[{ url: zoom }]} onClose={() => setZoom(null)} />}
    </div>
  )
}
