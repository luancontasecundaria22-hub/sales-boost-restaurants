import type { JSX } from 'react'

// Motor de formatos — cada template é um layout HTML/CSS real (não foto de IA).
// O FormatStudio renderiza um destes em tamanho cheio e exporta como PNG.
// Adicionar um formato novo = adicionar um item aqui (campos + função render).

export interface Brand { primary: string; name: string; primary2?: string; accent?: string; accent2?: string; text?: string; bg?: string; logoUrl?: string; heading?: string; body?: string }
export interface FieldDef { key: string; label: string; type?: 'text' | 'textarea'; placeholder?: string }
export interface Template {
  key: string
  label: string
  icon: string
  w: number
  h: number
  fields: FieldDef[]
  sample: Record<string, string>
  render: (f: Record<string, string>, brand: Brand) => JSX.Element
}

const FONT = "'Bricolage Grotesque', system-ui, sans-serif"
const initials = (name: string) => (name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')
// Fonte da marca (título) quando definida no Kit, com fallback.
const bfont = (b: Brand) => b.heading ? `'${b.heading}', ${FONT}` : FONT
// Logo da marca no canto (quando existe no Kit).
function Logo({ b, dark }: { b: Brand; dark?: boolean }) {
  if (!b.logoUrl) return null
  return <img src={b.logoUrl} crossOrigin="anonymous" alt="" style={{ position: 'absolute', bottom: '54px', right: '64px', height: '58px', maxWidth: '220px', objectFit: 'contain', opacity: dark ? 0.9 : 1 }} />
}

// ── Print de Tweet ──────────────────────────────────────────────────────────
function tweet(f: Record<string, string>, brand: Brand): JSX.Element {
  const dark = (f.theme || 'dark') === 'dark'
  const bg = dark ? '#15202b' : '#ffffff'
  const fg = dark ? '#e7e9ea' : '#0f1419'
  const muted = dark ? '#8b98a5' : '#536471'
  const line = dark ? '#38444d' : '#eff3f4'
  return (
    <div style={{ width: '100%', height: '100%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: bfont(brand) }}>
      <div style={{ width: '84%', background: bg }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '30px' }}>
          <div style={{ width: '92px', height: '92px', borderRadius: '50%', background: brand.primary, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '38px', fontWeight: 800, flexShrink: 0 }}>{initials(f.name)}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '34px', fontWeight: 800, color: fg }}>{f.name || 'Nome'}</span>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="#1d9bf0"><path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z"/></svg>
              <span style={{ fontSize: '30px', color: muted }}>@{f.handle || 'usuario'}</span>
            </div>
          </div>
        </div>
        <div style={{ fontSize: '44px', lineHeight: 1.35, color: fg, fontWeight: 500, marginBottom: '30px', whiteSpace: 'pre-wrap' }}>{f.text || 'O texto do tweet aparece aqui.'}</div>
        <div style={{ fontSize: '26px', color: muted, marginBottom: '24px' }}>{f.time || '14:22'} · {f.date || 'hoje'}</div>
        <div style={{ height: '1px', background: line, marginBottom: '24px' }} />
        <div style={{ display: 'flex', gap: '46px', fontSize: '28px', color: muted }}>
          <span><b style={{ color: fg }}>{f.retweets || '128'}</b> Retuítes</span>
          <span><b style={{ color: fg }}>{f.likes || '1.204'}</b> Curtidas</span>
        </div>
      </div>
    </div>
  )
}

// ── Card de Citação ─────────────────────────────────────────────────────────
function quote(f: Record<string, string>, brand: Brand): JSX.Element {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: `linear-gradient(155deg, ${brand.primary}, ${shade(brand.primary, -30)})`, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '110px', boxSizing: 'border-box', fontFamily: bfont(brand), color: '#fff' }}>
      <div style={{ fontSize: '150px', lineHeight: 0.6, fontWeight: 800, opacity: 0.35 }}>“</div>
      <div style={{ fontSize: '58px', lineHeight: 1.3, fontWeight: 800, margin: '20px 0 44px' }}>{f.quote || 'A frase de efeito que resume a sua marca vai aqui.'}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: 800 }}>{initials(f.author || brand.name)}</div>
        <div>
          <div style={{ fontSize: '32px', fontWeight: 800 }}>{f.author || brand.name}</div>
          {f.role && <div style={{ fontSize: '24px', opacity: 0.85 }}>{f.role}</div>}
        </div>
      </div>
      <Logo b={brand} />
    </div>
  )
}

// ── Anúncio / Promoção ──────────────────────────────────────────────────────
function announcement(f: Record<string, string>, brand: Brand): JSX.Element {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: brand.bg || '#0E0B0A', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '100px', boxSizing: 'border-box', fontFamily: bfont(brand), color: brand.text || '#fff' }}>
      {f.eyebrow && <div style={{ fontSize: '30px', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: brand.primary, marginBottom: '28px' }}>{f.eyebrow}</div>}
      <div style={{ fontSize: '92px', lineHeight: 1.05, fontWeight: 800, marginBottom: '30px' }}>{f.headline || 'Sua chamada principal'}</div>
      {f.subtext && <div style={{ fontSize: '38px', lineHeight: 1.4, color: '#BABABA', marginBottom: '44px' }}>{f.subtext}</div>}
      {f.offer && <div style={{ alignSelf: 'flex-start', background: brand.accent || brand.primary, color: '#000', fontSize: '46px', fontWeight: 800, padding: '18px 40px', borderRadius: '18px', marginBottom: '44px' }}>{f.offer}</div>}
      {f.cta && <div style={{ fontSize: '34px', fontWeight: 700, color: brand.text || '#fff', border: `2px solid ${brand.primary}`, borderRadius: '999px', padding: '18px 42px', alignSelf: 'flex-start' }}>{f.cta} →</div>}
      <Logo b={brand} />
    </div>
  )
}

// ── Estatística / Destaque ──────────────────────────────────────────────────
function stat(f: Record<string, string>, brand: Brand): JSX.Element {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: brand.bg || '#150E08', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '90px', boxSizing: 'border-box', fontFamily: bfont(brand), color: brand.text || '#fff', textAlign: 'center' }}>
      {f.label && <div style={{ fontSize: '38px', fontWeight: 700, color: '#BABABA', marginBottom: '20px' }}>{f.label}</div>}
      <div style={{ fontSize: '230px', lineHeight: 1, fontWeight: 800, color: brand.primary }}>{f.value || '87%'}</div>
      {f.context && <div style={{ fontSize: '42px', lineHeight: 1.35, marginTop: '30px', maxWidth: '80%' }}>{f.context}</div>}
      {f.source && <div style={{ fontSize: '24px', color: '#7a7a7a', marginTop: '40px' }}>{f.source}</div>}
      <Logo b={brand} />
    </div>
  )
}

// Clareia/escurece um hex (para o gradiente do card de citação).
function shade(hex: string, amt: number): string {
  const h = hex.replace('#', '')
  const num = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16)
  const clamp = (v: number) => Math.max(0, Math.min(255, v))
  const r = clamp((num >> 16) + amt), g = clamp(((num >> 8) & 0xff) + amt), b = clamp((num & 0xff) + amt)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

export const TEMPLATES: Template[] = [
  {
    key: 'tweet', label: 'Print de Tweet', icon: '🐦', w: 1080, h: 1080,
    fields: [
      { key: 'name', label: 'Nome' }, { key: 'handle', label: 'Usuário (@)' },
      { key: 'text', label: 'Texto do tweet', type: 'textarea' },
      { key: 'likes', label: 'Curtidas' }, { key: 'retweets', label: 'Retuítes' },
      { key: 'time', label: 'Hora' }, { key: 'date', label: 'Data' }, { key: 'theme', label: 'Tema (dark/light)' },
    ],
    sample: { name: '', handle: '', text: '', likes: '1.204', retweets: '128', time: '14:22', date: 'hoje', theme: 'dark' },
    render: tweet,
  },
  {
    key: 'quote', label: 'Card de Citação', icon: '❝', w: 1080, h: 1080,
    fields: [{ key: 'quote', label: 'Citação', type: 'textarea' }, { key: 'author', label: 'Autor' }, { key: 'role', label: 'Cargo / negócio' }],
    sample: { quote: '', author: '', role: '' },
    render: quote,
  },
  {
    key: 'announcement', label: 'Anúncio / Promoção', icon: '📣', w: 1080, h: 1350,
    fields: [
      { key: 'eyebrow', label: 'Etiqueta (topo)' }, { key: 'headline', label: 'Chamada principal', type: 'textarea' },
      { key: 'subtext', label: 'Subtexto', type: 'textarea' }, { key: 'offer', label: 'Oferta (destaque)' }, { key: 'cta', label: 'Chamada pra ação' },
    ],
    sample: { eyebrow: 'Novidade', headline: '', subtext: '', offer: '', cta: '' },
    render: announcement,
  },
  {
    key: 'stat', label: 'Estatística / Destaque', icon: '📊', w: 1080, h: 1080,
    fields: [{ key: 'value', label: 'Número/destaque' }, { key: 'label', label: 'Rótulo (topo)' }, { key: 'context', label: 'Contexto', type: 'textarea' }, { key: 'source', label: 'Fonte' }],
    sample: { value: '', label: '', context: '', source: '' },
    render: stat,
  },
]

export const templateByKey = (k: string) => TEMPLATES.find(t => t.key === k)
