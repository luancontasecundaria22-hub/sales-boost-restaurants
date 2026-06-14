# Sales Boost — "A plataforma que te faz conhecer seu cliente"

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
Gerar leads qualificados e agendamentos de strategy call para **qualquer tipo de estabelecimento** — não só restaurantes. Varejo, serviços, beleza, saúde, food, franquias, etc.

## Tagline
**"A plataforma que te faz conhecer seu cliente"**

## Público-alvo (ampliado)
Qualquer dono de estabelecimento físico ou digital no Brasil que queira entender melhor seus clientes e crescer de forma previsível.

## Diferenciais competitivos (baseado em análise de mercado)

### 1. Posicionamento único — "Conhecer o cliente com dados reais da internet"
Concorrentes como Birdeye, Malou e Bloom Intelligence usam dados internos (POS, reservas, WiFi). O Sales Boost vai além: usa **Apify para varrer a internet** — reviews do Google, redes sociais, Maps — e monta um perfil real do cliente a partir do que já existe online. Nenhum concorrente faz isso de forma tão ampla. Comunicar isso claramente na landing page é diferencial de conversão.

### 2. Diagnóstico de site como porta de entrada gratuita
Nenhum concorrente oferece diagnóstico de frontend/backend do site do cliente. Isso funciona como **isca gratuita**: qualquer empresa cola o link do site e recebe um relatório de pontos fracos (performance, SEO, UX). Gera lead qualificado e já demonstra valor antes de vender. Abre também a venda de LPs (landing pages corrigidas).

### 3. Preço acessível em R$ para o mercado brasileiro
- Birdeye: caro, foco EUA
- SevenRooms: preço oculto, foco em hotéis/premium
- Malou: ~$150/mês, francês, foco em redes grandes
- Bloom Intelligence: $60/mês por unidade, só restaurantes

**Oportunidade:** entrar com preço claro e competitivo em R$ para pequenos e médios negócios brasileiros — mercado sem nenhuma solução local nesse nível.

## O que foi pedido (brief original)
- Design nível Stripe/Linear/Vercel — premium, não template
- Inspiração visual: layout do Optibiz (hierarquia, espaçamento, sequência de seções)
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
