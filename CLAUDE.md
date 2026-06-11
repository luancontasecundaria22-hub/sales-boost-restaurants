# Sales Boost — Restaurant Growth Platform

## Stack
- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **Animations:** Framer Motion v12
- **Icons:** Lucide React
- **Deploy:** Cloudflare Pages (branch: `main`, build: `npm run build`, output: `.next`)

## Brand
- **Primary:** `#10B981` (emerald-500)
- **Dark BG:** `#0F172A` (slate-900)
- **Background:** `#FFFFFF`
- **Fonts:** Inter Tight (headings) + Inter (body) via `next/font/google`
- **CSS vars:** `--font-inter-tight`, `--font-inter`

## Pages
- `/` — Landing page completa (lead gen + agendamento de strategy call)

## Components (`src/components/`)
| Arquivo | Seção |
|---|---|
| `Navbar.tsx` | Nav fixa com scroll effect |
| `Hero.tsx` | Headline + dashboard card CSS |
| `Trust.tsx` | Logos de clientes (grayscale) |
| `Services.tsx` | 3 cards: Reativação, Fidelidade, Campanhas |
| `About.tsx` | Split layout + métricas |
| `Results.tsx` | Dark section com 4 stats grandes |
| `Process.tsx` | 4 passos: Auditoria → Otimização |
| `Testimonials.tsx` | 3 depoimentos com rating |
| `FinalCTA.tsx` | Dark CTA section |
| `Footer.tsx` | Links + social icons |

## Objetivo do site
Gerar leads qualificados e agendamentos de strategy call para donos de restaurantes brasileiros.

## O que foi pedido (brief original)
- Design nível Stripe/Linear/Vercel — premium, não template
- Inspiração visual: layout do Optibiz (hierarquia, espaçamento, sequência de seções)
- Público: donos de restaurante, redes, fast food, pizzaria, sushi, café, dark kitchen
- PT-BR como idioma principal
- Animações sutis (fade-up on scroll, hover transitions)
- Dashboard no hero deve parecer produto SaaS real, não decorativo
- Sem gradientes genéricos, sem ilustrações aleatórias, sem template de IA

## Próximos passos sugeridos
- [ ] Adicionar imagens reais (Unsplash/Pexels) no About e Testimonials
- [ ] Criar página `/obrigado` após formulário de contato
- [ ] Integrar Calendly ou Cal.com no botão CTA
- [ ] Adicionar seção de Pricing
- [ ] SEO: meta tags, OG image, sitemap
- [ ] Analytics: Plausible ou GA4
- [ ] Formulário de captura de leads com integração (HubSpot, ActiveCampaign, etc.)
