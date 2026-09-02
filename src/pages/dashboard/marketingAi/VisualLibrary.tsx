import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import { CARD, MUTED, BORDER, D, timeAgo } from './shared'
import { ImageModal } from './TestingArea'
import BrandKit from './BrandKit'
import ProductPhotos from './ProductPhotos'

interface ArchivePost { id: string; caption: string | null; image_url: string | null; posted_at: string | null; likes_count: number | null; comments_count: number | null }

// Estilos e Visuais — hub da identidade visual. Kit personaliza por cliente;
// Arquivo mostra os posts publicados (via Meta) e as fotos de produto que o
// cliente sobe manualmente — as duas fontes que a geração usa como referência
// visual real do negócio.
export default function VisualLibrary({ companyId }: { companyId: string }) {
  const [tab, setTab] = useState<'kit' | 'archive'>('kit')
  const [archiveTab, setArchiveTab] = useState<'publicados' | 'produtos'>('publicados')
  const [archive, setArchive] = useState<ArchivePost[]>([])
  const [loading, setLoading] = useState(true)
  const [zoom, setZoom] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data: a } = await supabase.from('instagram_posts').select('id, caption, image_url, posted_at, likes_count, comments_count').eq('company_id', companyId).order('posted_at', { ascending: false }).limit(60)
    setArchive((a ?? []) as ArchivePost[])
    setLoading(false)
  }, [companyId])
  useEffect(() => { load() }, [load])

  return (
    <div>
      <div style={{ padding: '12px 16px', background: 'rgba(167,139,250,0.07)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: '11px', fontSize: '11.5px', color: 'white', lineHeight: 1.6, marginBottom: '16px' }}>
        🎨 <strong>Estilos e Visuais — a identidade visual da marca.</strong> <strong>Kit</strong> = logo, cores, tipografia e voz · <strong>Arquivo</strong> = seus posts publicados e as fotos de produto que você subir. A geração filtra e monta as peças a partir daqui.
      </div>

      <div style={{ display: 'inline-flex', gap: '4px', padding: '4px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}`, borderRadius: '10px', marginBottom: '18px', flexWrap: 'wrap' }}>
        {([['kit', '🎨 Kit da Marca'], ['archive', '🗂️ Arquivo']] as const).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} style={{ padding: '7px 13px', background: tab === k ? 'rgba(167,139,250,0.15)' : 'transparent', border: `1px solid ${tab === k ? 'rgba(167,139,250,0.4)' : 'transparent'}`, borderRadius: '7px', color: tab === k ? '#A78BFA' : 'white', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: D }}>{label}</button>
        ))}
      </div>

      {tab === 'kit' ? <BrandKit companyId={companyId} /> : (
        <>
          <div style={{ display: 'inline-flex', gap: '4px', padding: '4px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}`, borderRadius: '10px', marginBottom: '18px', flexWrap: 'wrap' }}>
            {([['publicados', '📷 Publicados'], ['produtos', '📦 Produtos']] as const).map(([k, label]) => (
              <button key={k} onClick={() => setArchiveTab(k)} style={{ padding: '6px 12px', background: archiveTab === k ? 'rgba(255,109,41,0.14)' : 'transparent', border: `1px solid ${archiveTab === k ? 'rgba(255,109,41,0.4)' : 'transparent'}`, borderRadius: '7px', color: archiveTab === k ? '#FF6D29' : 'white', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer', fontFamily: D }}>{label}</button>
            ))}
          </div>

          {archiveTab === 'produtos' ? <ProductPhotos companyId={companyId} /> : (
            loading ? <div style={{ fontSize: '12px', color: MUTED }}>Carregando...</div> : archive.length === 0 ? (
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
        </>
      )}

      {zoom && <ImageModal images={[{ url: zoom }]} onClose={() => setZoom(null)} />}
    </div>
  )
}
