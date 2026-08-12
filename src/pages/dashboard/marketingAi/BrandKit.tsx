import { useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import { MUTED, BORDER, D, inputStyle } from './shared'

const ORANGE = '#FF6D29'
const GREEN = '#4ade80'

export interface Kit {
  colors: { primary: string[]; accent: string[]; text: string; bg: string }
  typography: { heading: string; body: string }
  composition: string
}
const EMPTY: Kit = { colors: { primary: ['#FF6D29', '#150E08'], accent: ['#4ade80', '#FBBF24'], text: '#FFFFFF', bg: '#0E0B0A' }, typography: { heading: 'Bricolage Grotesque', body: 'Bricolage Grotesque' }, composition: '' }

// Clareia/escurece um hex (pra mostrar as tonalidades derivadas).
function shade(hex: string, amt: number): string {
  const h = (hex || '#000').replace('#', '')
  const num = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h.padEnd(6, '0'), 16)
  const cl = (v: number) => Math.max(0, Math.min(255, v))
  const r = cl((num >> 16) + amt), g = cl(((num >> 8) & 0xff) + amt), b = cl((num & 0xff) + amt)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div style={{ fontSize: '10px', color: MUTED, marginBottom: '4px' }}>{label}</div>
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        <input type="color" value={value} onChange={e => onChange(e.target.value)} style={{ width: '38px', height: '34px', padding: 0, border: `1px solid ${BORDER}`, borderRadius: '7px', background: 'transparent', cursor: 'pointer' }} />
        <input value={value} onChange={e => onChange(e.target.value)} style={{ ...inputStyle, width: '92px' }} />
        <div style={{ display: 'flex', gap: '3px' }}>
          {[40, 0, -40].map(s => <div key={s} title={shade(value, s)} style={{ width: '16px', height: '34px', borderRadius: '4px', background: shade(value, s), border: '1px solid rgba(255,255,255,0.12)' }} />)}
        </div>
      </div>
    </div>
  )
}

// Kit da Marca — identidade visual completa: logo, tipografia, sistema de cores
// (2 principais em tonalidades + 2 de destaque) e composição. Persiste em
// brand_dna (kit jsonb + colors/fonts/logo_url planos p/ compatibilidade). É o
// "DNA visual" que a geração filtra e monta.
export default function BrandKit({ companyId }: { companyId: string }) {
  const [kit, setKit] = useState<Kit>(EMPTY)
  const [logo, setLogo] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    const { data } = await supabase.from('brand_dna').select('kit, logo_url').eq('company_id', companyId).maybeSingle()
    const d = data as { kit: Kit | null; logo_url: string | null } | null
    if (d?.kit) setKit({ ...EMPTY, ...d.kit, colors: { ...EMPTY.colors, ...d.kit.colors }, typography: { ...EMPTY.typography, ...d.kit.typography } })
    setLogo(d?.logo_url ?? '')
    setLoading(false)
  }, [companyId])
  useEffect(() => { load() }, [load])

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const ext = (file.name.split('.').pop() || 'png').toLowerCase()
      const path = `renders/${companyId}/logo-${crypto.randomUUID()}.${ext}`
      const { error } = await supabase.storage.from('post-images').upload(path, file, { contentType: file.type || 'image/png', upsert: false })
      if (!error) { const { data } = supabase.storage.from('post-images').getPublicUrl(path); setLogo(data.publicUrl) }
    } finally { setUploading(false); if (fileRef.current) fileRef.current.value = '' }
  }

  const save = async () => {
    setSaving(true)
    const flat = [...kit.colors.primary, ...kit.colors.accent].filter(Boolean)
    await supabase.from('brand_dna').upsert({
      company_id: companyId, kit, logo_url: logo, colors: flat, fonts: kit.typography.heading, updated_at: new Date().toISOString(),
    }, { onConflict: 'company_id' })
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2500)
  }

  const setColor = (group: 'primary' | 'accent', i: number, v: string) => setKit(k => ({ ...k, colors: { ...k.colors, [group]: k.colors[group].map((c, idx) => idx === i ? v : c) } }))

  if (loading) return <div style={{ fontSize: '12px', color: MUTED }}>Carregando kit...</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '760px' }}>
      <div style={{ padding: '12px 16px', background: 'rgba(167,139,250,0.07)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: '11px', fontSize: '11.5px', color: 'white', lineHeight: 1.6 }}>
        🎨 <strong>Kit da Marca (DNA visual).</strong> Logo, tipografia, cores e composição. É daqui que a geração <strong>filtra e monta as peças</strong> pra tudo sair na sua identidade — e é o que faz as variações saírem de graça. Sem um asset, a IA gera do zero seguindo estas regras.
      </div>

      {/* Logo */}
      <section>
        <div style={{ fontSize: '11px', fontWeight: 800, color: ORANGE, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>Logo</div>
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ width: '90px', height: '90px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {logo ? <img src={logo} alt="logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} /> : <span style={{ fontSize: '10px', color: MUTED }}>sem logo</span>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minWidth: '240px' }}>
            <input ref={fileRef} type="file" accept="image/*" onChange={onFile} style={{ display: 'none' }} />
            <button onClick={() => fileRef.current?.click()} disabled={uploading} style={{ alignSelf: 'flex-start', padding: '8px 15px', background: ORANGE, color: '#000', fontWeight: 700, fontSize: '12px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontFamily: D }}>{uploading ? 'Enviando...' : '＋ Enviar logo'}</button>
            <input value={logo} onChange={e => setLogo(e.target.value)} placeholder="ou cole a URL do logo" style={inputStyle} />
          </div>
        </div>
      </section>

      {/* Cores */}
      <section>
        <div style={{ fontSize: '11px', fontWeight: 800, color: ORANGE, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Sistema de cores</div>
        <div style={{ fontSize: '10.5px', color: MUTED, marginBottom: '12px' }}>2 principais (usadas em tonalidades diferentes) + 2 de destaque (promoções, alertas). As tonalidades ao lado são geradas sozinhas.</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '14px' }}>
          <ColorInput label="Principal 1" value={kit.colors.primary[0]} onChange={v => setColor('primary', 0, v)} />
          <ColorInput label="Principal 2" value={kit.colors.primary[1]} onChange={v => setColor('primary', 1, v)} />
          <ColorInput label="Destaque 1 (ex: desconto)" value={kit.colors.accent[0]} onChange={v => setColor('accent', 0, v)} />
          <ColorInput label="Destaque 2 (ex: alerta/novo)" value={kit.colors.accent[1]} onChange={v => setColor('accent', 1, v)} />
          <ColorInput label="Texto" value={kit.colors.text} onChange={v => setKit(k => ({ ...k, colors: { ...k.colors, text: v } }))} />
          <ColorInput label="Fundo" value={kit.colors.bg} onChange={v => setKit(k => ({ ...k, colors: { ...k.colors, bg: v } }))} />
        </div>
      </section>

      {/* Tipografia */}
      <section>
        <div style={{ fontSize: '11px', fontWeight: 800, color: ORANGE, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>Tipografia</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '10px', color: MUTED, marginBottom: '4px' }}>Fonte de título</div>
            <input value={kit.typography.heading} onChange={e => setKit(k => ({ ...k, typography: { ...k.typography, heading: e.target.value } }))} placeholder="Ex: Bricolage Grotesque" style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
          </div>
          <div>
            <div style={{ fontSize: '10px', color: MUTED, marginBottom: '4px' }}>Fonte de corpo</div>
            <input value={kit.typography.body} onChange={e => setKit(k => ({ ...k, typography: { ...k.typography, body: e.target.value } }))} placeholder="Ex: Inter" style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
          </div>
        </div>
      </section>

      {/* Composição */}
      <section>
        <div style={{ fontSize: '11px', fontWeight: 800, color: ORANGE, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>Composição</div>
        <textarea value={kit.composition} onChange={e => setKit(k => ({ ...k, composition: e.target.value }))} rows={3} placeholder="Regras de montagem: onde vai o logo, margens de segurança, alinhamento, densidade... Ex: logo sempre no canto inferior direito, muito respiro, texto grande e curto." style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', resize: 'vertical', fontFamily: D }} />
      </section>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={save} disabled={saving} style={{ padding: '10px 22px', background: ORANGE, color: '#000', fontWeight: 700, fontSize: '13px', borderRadius: '9px', border: 'none', cursor: saving ? 'default' : 'pointer', fontFamily: D }}>{saving ? 'Salvando...' : 'Salvar Kit da Marca'}</button>
        {saved && <span style={{ fontSize: '12px', fontWeight: 700, color: GREEN }}>✓ Salvo — a geração já usa</span>}
      </div>
    </div>
  )
}
