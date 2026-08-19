import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import { CARD, MUTED, BORDER, D, inputStyle, timeAgo } from './shared'
import { ImageModal } from './TestingArea'
import BrandKit from './BrandKit'
import BrandComponents from './BrandComponents'

interface RefMeta { category?: string; visual_style?: string; colors?: string; composition?: string }
interface Reference { id: string; title: string; content: string | null; image_url: string | null; meta: RefMeta | null }
interface ArchivePost { id: string; caption: string | null; image_url: string | null; posted_at: string | null; likes_count: number | null; comments_count: number | null }

// Estilos e Visuais — hub da identidade visual. Kit e Componentes personalizam
// por cliente; Referências são GLOBAIS (curadoria da plataforma, as mesmas pra
// todos, garantindo um bom design de base — o owner gerencia em Config); Arquivo
// mostra os posts publicados do cliente (via Meta), read-only.
export default function VisualLibrary({ companyId }: { companyId: string }) {
  const [tab, setTab] = useState<'kit' | 'components' | 'refs' | 'archive'>('kit')
  const [refs, setRefs] = useState<Reference[]>([])
  const [archive, setArchive] = useState<ArchivePost[]>([])
  const [loading, setLoading] = useState(true)
  const [zoom, setZoom] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('all')

  const load = useCallback(async () => {
    const [{ data: r }, { data: a }] = await Promise.all([
      // Referências GLOBAIS (company_id NULL) — as mesmas pra todos os clientes.
      supabase.from('marketing_ai_knowledge').select('id, title, content, image_url, meta').is('company_id', null).eq('module', 'visual').eq('kind', 'layout').order('created_at', { ascending: false }),
      supabase.from('instagram_posts').select('id, caption, image_url, posted_at, likes_count, comments_count').eq('company_id', companyId).order('posted_at', { ascending: false }).limit(60),
    ])
    setRefs((r ?? []) as Reference[])
    setArchive((a ?? []) as ArchivePost[])
    setLoading(false)
  }, [companyId])
  useEffect(() => { load() }, [load])

  const cats = ['all', ...[...new Set(refs.map(r => r.meta?.category).filter(Boolean) as string[])]]
  const visibleRefs = refs.filter(r => (cat === 'all' || r.meta?.category === cat) && (!q.trim() || (r.title + ' ' + (r.content ?? '')).toLowerCase().includes(q.toLowerCase())))

  return (
    <div>
      <div style={{ padding: '12px 16px', background: 'rgba(167,139,250,0.07)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: '11px', fontSize: '11.5px', color: 'white', lineHeight: 1.6, marginBottom: '16px' }}>
        🎨 <strong>Estilos e Visuais — a identidade visual da marca.</strong> <strong>Kit</strong> = logo, cores, tipografia e voz · <strong>Componentes</strong> = suas peças reutilizáveis · <strong>Referências</strong> = curadoria de design (as mesmas pra todos, pra garantir qualidade) · <strong>Arquivo</strong> = seus posts publicados. A geração filtra e monta as peças a partir daqui.
      </div>

      <div style={{ display: 'inline-flex', gap: '4px', padding: '4px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}`, borderRadius: '10px', marginBottom: '18px', flexWrap: 'wrap' }}>
        {([['kit', '🎨 Kit da Marca'], ['components', '🧩 Componentes'], ['refs', '⭐ Referências'], ['archive', '🗂️ Arquivo']] as const).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} style={{ padding: '7px 13px', background: tab === k ? 'rgba(167,139,250,0.15)' : 'transparent', border: `1px solid ${tab === k ? 'rgba(167,139,250,0.4)' : 'transparent'}`, borderRadius: '7px', color: tab === k ? '#A78BFA' : 'white', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: D }}>{label}</button>
        ))}
      </div>

      {tab === 'kit' ? <BrandKit companyId={companyId} /> : tab === 'components' ? <BrandComponents companyId={companyId} /> : (<>
      {loading ? <div style={{ fontSize: '12px', color: MUTED }}>Carregando...</div> : tab === 'refs' ? (
        <>
          <div style={{ fontSize: '10.5px', color: MUTED, marginBottom: '12px' }}>Curadoria da plataforma — o Diretor Criativo se inspira nestas ao criar. (Novas referências são adicionadas pelo time.)</div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '16px' }}>
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar..." style={{ ...inputStyle, flex: 1, minWidth: '160px' }} />
            <select value={cat} onChange={e => setCat(e.target.value)} style={{ ...inputStyle, padding: '8px 10px' }}>
              {cats.map(c => <option key={c} value={c}>{c === 'all' ? 'Todas as categorias' : c}</option>)}
            </select>
          </div>
          {visibleRefs.length === 0 ? (
            <div style={{ padding: '28px', textAlign: 'center', color: MUTED, fontSize: '12.5px', background: CARD, border: `1px dashed ${BORDER}`, borderRadius: '12px' }}>
              Nenhuma referência disponível ainda.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '12px' }}>
              {visibleRefs.map(r => (
                <div key={r.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '11px', overflow: 'hidden' }}>
                  {r.image_url && <img src={r.image_url} alt="" onClick={() => setZoom(r.image_url)} style={{ width: '100%', height: '150px', objectFit: 'cover', cursor: 'zoom-in' }} />}
                  <div style={{ padding: '11px 12px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'white', marginBottom: '5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</div>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {r.meta?.category && <span style={{ fontSize: '8.5px', fontWeight: 700, color: '#A78BFA', border: '1px solid rgba(167,139,250,0.4)', borderRadius: '99px', padding: '1px 7px' }}>{r.meta.category}</span>}
                      {r.meta?.visual_style && <span style={{ fontSize: '8.5px', color: MUTED }}>{r.meta.visual_style}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        archive.length === 0 ? (
          <div style={{ padding: '28px', textAlign: 'center', color: MUTED, fontSize: '12.5px', background: CARD, border: `1px dashed ${BORDER}`, borderRadius: '12px' }}>
            Arquivo vazio. Ele enche automaticamente com seus posts publicados quando o <strong>Instagram/Meta</strong> estiver conectado e sincronizado.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
            {archive.map(p => (
              <div key={p.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '11px', overflow: 'hidden' }}>
                {p.image_url && <img src={p.image_url} alt="" onClick={() => setZoom(p.image_url)} style={{ width: '100%', height: '160px', objectFit: 'cover', cursor: 'zoom-in' }} />}
                <div style={{ padding: '11px 12px' }}>
                  {p.caption && <div style={{ fontSize: '11px', color: MUTED, lineHeight: 1.4, maxHeight: '48px', overflow: 'hidden', marginBottom: '6px' }}>{p.caption}</div>}
                  <div style={{ display: 'flex', gap: '10px', fontSize: '10px', color: 'rgba(255,255,255,0.45)' }}>
                    <span>❤️ {p.likes_count ?? 0}</span><span>💬 {p.comments_count ?? 0}</span>
                    {p.posted_at && <span style={{ marginLeft: 'auto' }}>{timeAgo(p.posted_at)}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}
      </>)}

      {zoom && <ImageModal images={[{ url: zoom }]} onClose={() => setZoom(null)} />}
    </div>
  )
}
