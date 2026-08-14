// Biblioteca de formatos — tamanho + placement por plataforma. O conceito
// (headline, logo, foto…) é separado do formato: trocar formato = re-render no
// mesmo motor, sem nova IA. `safe` são as margens seguras (fração da largura/
// altura) onde texto e logo devem ficar. Modular: adicionar formato = 1 item.
export interface FormatDef {
  key: string
  name: string
  platform: string
  placement: string
  ratio: string
  w: number
  h: number
  safe: { top: number; right: number; bottom: number; left: number }
}

const M = { top: 0.06, right: 0.08, bottom: 0.09, left: 0.08 }        // margens padrão
const STORY = { top: 0.14, right: 0.08, bottom: 0.20, left: 0.08 }     // stories: UI cobre topo/rodapé
const WIDE = { top: 0.10, right: 0.06, bottom: 0.12, left: 0.06 }      // banners largos

export const STANDARD_FORMATS: FormatDef[] = [
  { key: 'ig_post', name: 'Instagram Post', platform: 'Instagram', placement: 'Feed', ratio: '1:1', w: 1080, h: 1080, safe: M },
  { key: 'ig_portrait', name: 'Instagram Portrait', platform: 'Instagram', placement: 'Feed', ratio: '4:5', w: 1080, h: 1350, safe: M },
  { key: 'ig_story', name: 'Instagram Story', platform: 'Instagram', placement: 'Story', ratio: '9:16', w: 1080, h: 1920, safe: STORY },
  { key: 'ig_reel', name: 'Instagram Reel', platform: 'Instagram', placement: 'Reel', ratio: '9:16', w: 1080, h: 1920, safe: STORY },
  { key: 'fb_post', name: 'Facebook Post', platform: 'Facebook', placement: 'Feed', ratio: '1:1', w: 1080, h: 1080, safe: M },
  { key: 'fb_story', name: 'Facebook Story', platform: 'Facebook', placement: 'Story', ratio: '9:16', w: 1080, h: 1920, safe: STORY },
  { key: 'fb_ad', name: 'Facebook Ad', platform: 'Facebook', placement: 'Ad', ratio: '1:1', w: 1080, h: 1080, safe: M },
  { key: 'ig_ad', name: 'Instagram Ad', platform: 'Instagram', placement: 'Ad', ratio: '4:5', w: 1080, h: 1350, safe: M },
  { key: 'carousel', name: 'Carousel', platform: 'Instagram', placement: 'Feed', ratio: '1:1', w: 1080, h: 1080, safe: M },
  { key: 'li_post', name: 'LinkedIn Post', platform: 'LinkedIn', placement: 'Feed', ratio: '1:1', w: 1080, h: 1080, safe: M },
  { key: 'li_ad', name: 'LinkedIn Ad', platform: 'LinkedIn', placement: 'Ad', ratio: '1.91:1', w: 1200, h: 628, safe: WIDE },
  { key: 'web_banner', name: 'Website Banner', platform: 'Web', placement: 'Banner', ratio: '1.91:1', w: 1200, h: 628, safe: WIDE },
]

export const formatByKey = (k: string) => STANDARD_FORMATS.find(f => f.key === k)

// Objetivo → formato sugerido (usado pelo Creative Agent pra escolher sozinho).
export const OBJECTIVE_FORMAT: Record<string, string> = {
  story: 'ig_story', story_ad: 'ig_story', reel: 'ig_reel', feed: 'ig_portrait',
  post: 'ig_post', ad: 'ig_ad', linkedin: 'li_post', banner: 'web_banner',
}

// Calcula a margem segura em px pra um dado tamanho (fração → px).
export function safePx(fmt: { w: number; h: number; safe?: FormatDef['safe'] }) {
  const s = fmt.safe ?? M
  return { top: Math.round(fmt.h * s.top), right: Math.round(fmt.w * s.right), bottom: Math.round(fmt.h * s.bottom), left: Math.round(fmt.w * s.left) }
}
