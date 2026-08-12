import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../../../lib/supabase'
import { CARD, MUTED, BORDER, D, inputStyle } from './shared'
import { ImageModal } from './TestingArea'

const ORANGE = '#FF6D29'
const TYPES = ['Selo/Badge', 'Moldura', 'Sticker', 'Ícone', 'Padrão/Textura', 'Variação de logo', 'Outro']

interface Comp { id: string; title: string; image_url: string | null; meta: { type?: string; path?: string } | null; created_at: string }

// Componentes — peças visuais reutilizáveis da marca (selos, molduras, stickers,
// ícones, variações de logo). São os "assets" que a geração monta em cima. Sem
// asset, a IA gera do zero. Reusa marketing_ai_knowledge (module='visual',
// kind='component') + Storage.
export default function BrandComponents({ companyId }: { companyId: string }) {
  const [items, setItems] = useState<Comp[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [pending, setPending] = useState<{ url: string; path: string } | null>(null)
  const [name, setName] = useState('')
  const [type, setType] = useState(TYPES[0])
  const [zoom, setZoom] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    const { data } = await supabase.from('marketing_ai_knowledge').select('id, title, image_url, meta, created_at').eq('company_id', companyId).eq('module', 'visual').eq('kind', 'component').order('created_at', { ascending: false })
    setItems((data ?? []) as Comp[])
    setLoading(false)
  }, [companyId])
  useEffect(() => { load() }, [load])

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const ext = (file.name.split('.').pop() || 'png').toLowerCase()
      const path = `renders/${companyId}/comp-${crypto.randomUUID()}.${ext}`
      const { error } = await supabase.storage.from('post-images').upload(path, file, { contentType: file.type || 'image/png', upsert: false })
      if (!error) { const { data } = supabase.storage.from('post-images').getPublicUrl(path); setPending({ url: data.publicUrl, path }); setName(n => n || file.name.replace(/\.[^.]+$/, '')) }
    } finally { setUploading(false); if (fileRef.current) fileRef.current.value = '' }
  }

  const save = async () => {
    if (!pending || !name.trim()) return
    await supabase.from('marketing_ai_knowledge').insert({ company_id: companyId, module: 'visual', kind: 'component', title: name.trim(), image_url: pending.url, meta: { type, path: pending.path } })
    setPending(null); setName(''); await load()
  }
  const remove = async (c: Comp) => {
    if (c.meta?.path) await supabase.storage.from('post-images').remove([c.meta.path]).catch(() => {})
    await supabase.from('marketing_ai_knowledge').delete().eq('id', c.id); await load()
  }

  return (
    <div>
      <div style={{ padding: '12px 16px', background: 'rgba(167,139,250,0.07)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: '11px', fontSize: '11.5px', color: 'white', lineHeight: 1.6, marginBottom: '16px' }}>
        🧩 <strong>Componentes.</strong> Peças reutilizáveis da marca — selos de desconto, molduras, stickers, ícones, variações do logo. A geração <strong>monta em cima destes assets</strong> (é o que baixa o custo). Não tem o asset? A IA gera do zero seguindo o kit.
      </div>

      <input ref={fileRef} type="file" accept="image/*" onChange={onFile} style={{ display: 'none' }} />
      <button onClick={() => fileRef.current?.click()} disabled={uploading} style={{ padding: '8px 16px', background: ORANGE, color: '#000', fontWeight: 700, fontSize: '12px', borderRadius: '9px', border: 'none', cursor: 'pointer', fontFamily: D, marginBottom: '16px' }}>{uploading ? 'Enviando...' : '＋ Adicionar componente'}</button>

      {pending && (
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginBottom: '18px', padding: '14px', background: CARD, border: `1px solid ${BORDER}`, borderRadius: '12px' }}>
          <img src={pending.url} alt="" style={{ width: '90px', height: '90px', objectFit: 'contain', borderRadius: '8px', background: 'rgba(255,255,255,0.05)' }} />
          <div style={{ flex: 1, minWidth: '240px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Nome do componente *" style={inputStyle} />
            <select value={type} onChange={e => setType(e.target.value)} style={{ ...inputStyle, fontFamily: D }}>{TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={save} disabled={!name.trim()} style={{ padding: '8px 18px', background: name.trim() ? ORANGE : 'rgba(255,255,255,0.08)', color: name.trim() ? '#000' : MUTED, fontWeight: 700, fontSize: '12px', borderRadius: '8px', border: 'none', cursor: name.trim() ? 'pointer' : 'not-allowed', fontFamily: D }}>Salvar</button>
              <button onClick={() => setPending(null)} style={{ padding: '8px 14px', background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: '8px', color: MUTED, fontSize: '12px', cursor: 'pointer', fontFamily: D }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {loading ? <div style={{ fontSize: '12px', color: MUTED }}>Carregando...</div> : items.length === 0 ? (
        <div style={{ padding: '28px', textAlign: 'center', color: MUTED, fontSize: '12.5px', background: CARD, border: `1px dashed ${BORDER}`, borderRadius: '12px' }}>Nenhum componente ainda. Suba selos, molduras e stickers da marca — a geração passa a montar em cima deles.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '12px' }}>
          {items.map(c => (
            <div key={c.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '11px', overflow: 'hidden' }}>
              {c.image_url && <img src={c.image_url} alt="" onClick={() => setZoom(c.image_url)} style={{ width: '100%', height: '120px', objectFit: 'contain', background: 'rgba(255,255,255,0.04)', cursor: 'zoom-in' }} />}
              <div style={{ padding: '10px 11px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'white', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</span>
                  <button onClick={() => remove(c)} title="Remover" style={{ background: 'transparent', border: 'none', color: MUTED, fontSize: '12px', cursor: 'pointer' }}>🗑</button>
                </div>
                {c.meta?.type && <span style={{ fontSize: '8.5px', fontWeight: 700, color: '#A78BFA' }}>{c.meta.type}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
      {zoom && <ImageModal images={[{ url: zoom }]} onClose={() => setZoom(null)} />}
    </div>
  )
}
