# Sales Boost — O gerenciador de crescimento do seu negócio

> **Tagline:** "A plataforma que te faz conhecer seu cliente"
> **Promessa:** gerar mais receita automaticamente para pequenos negócios.

## O que é (visão de produto)

Sales Boost é o **"gerente de crescimento"** que trabalha sozinho pelo pequeno
negócio. Não é um conjunto de ferramentas soltas — é **UM produto** com 3 peças
que se reforçam:

1. **Agente pessoal (chat)** — o dono fala em linguagem natural ("cria 5 posts pra
   próxima semana e agenda seg/ter/qua às 12h", "quem não me respondeu?") e o
   agente executa as tarefas de marketing e vendas.
2. **Revenue Opportunities** — encontra a receita parada na mesa (leads sem
   resposta, avaliações negativas, consultas não confirmadas) e resolve com 1 clique.
3. **Dashboard** — métricas do negócio + histórico do que o agente fez e o que
   está pendente de aprovação.

**Princípio central:** o Sales Boost gera receita no piloto automático, mas
**nada vai ao público sem aprovação do dono** (human-in-the-loop).

## Stack

- **Frontend:** Next.js 16 (App Router), TypeScript, Tailwind CSS v4, Framer Motion v12, Lucide React.
- **Auth/DB:** Supabase (Auth + Postgres + RLS). *(já implementado)*
- **Agente:** Claude Agent SDK — o mesmo motor do Claude Code. Nós definimos as
  *ferramentas* (postar, agendar, ler leads, responder review/WhatsApp) e o SDK
  orquestra o raciocínio + a execução. *(novo)*
- **Canais de integração:** Instagram, WhatsApp (API Cloud oficial),
  Google Business Profile (Maps/Reviews), E-mail. *(novo — entram por etapas)*
- **Coleta de dados:** Apify (reviews, redes sociais, Maps) + Google PageSpeed
  Insights (diagnóstico de site).
- **Deploy:** Cloudflare Pages (branch `main`, build: `npm run build`, output: `.next`).

## Brand

- **Primary:** `#10B981` (emerald-500)
- **Dark BG:** `#0F172A` (slate-900)
- **Background:** `#FFFFFF`
- **Fonts:** Inter Tight (headings) + Inter (body) via `next/font/google`
- **CSS vars:** `--font-inter-tight`, `--font-inter`
- Design nível Stripe/Linear/Vercel — premium, não template. Sem gradientes
  genéricos, sem ilustrações aleatórias. Animações sutis (fade-up on scroll).

## As 3 peças do produto

### 1. Agente pessoal (chat)
- **Motor:** Claude Agent SDK. Cada empresa tem um **CLAUDE.md próprio** (tom de
  voz, ofertas, horários, FAQ, público) que vira o contexto/system prompt do agente.
- **Ferramentas que o agente pode chamar — todas com aprovação humana:**
  - criar e agendar posts (Instagram primeiro)
  - listar leads sem resposta e rascunhar follow-up (WhatsApp / E-mail)
  - ler avaliações e rascunhar resposta (Google)
  - consultar métricas do dashboard
- **Regra de ouro:** o agente **nunca** publica ou responde sozinho —
  gera rascunho → dono aprova → então executa.

### 2. Revenue Opportunities
Varre os canais e lista oportunidades com valor estimado, ex.:
- "3 leads sem resposta há +24h"
- "7 avaliações negativas sem resposta"
- "5 consultas/reservas não confirmadas"

Cada item tem uma ação sugerida. O botão **"Resolver tudo"** faz o agente montar a
fila de ações e apresentá-la para **aprovação em lote**.

### 3. Dashboard
Métricas (receita recuperada, leads respondidos, posts publicados, reputação) +
timeline do que o agente fez e o que está pendente de aprovação.

## Público-alvo
Qualquer dono de pequeno/médio estabelecimento no Brasil — varejo, serviços,
beleza, saúde, food, franquias — que quer crescer **sem precisar virar
especialista em marketing**.

## Diferenciais competitivos
1. **Conhece o cliente com dados reais da internet (Apify)** — varre reviews,
   redes e Maps para montar o perfil real do cliente. Esses dados alimentam o agente.
2. **Diagnóstico de site grátis** — porta de entrada / isca de lead qualificado.
   Cole o link do site e receba um relatório de pontos fracos antes de comprar.
3. **Um agente que EXECUTA, não só mostra relatório** — em PT-BR, preço em R$ para
   o mercado brasileiro (concorrentes como Birdeye, Malou, Bloom focam EUA/premium).

## Modelo de cobrança — **A DECIDIR**
Três hipóteses em aberto:
- **(a)** Assinatura mensal fixa (ex. R$197–R$397/mês). Previsível, fácil de comunicar.
- **(b)** Mensal menor + % da receita recuperada. Alinha com "gerar receita".
- **(c)** Por uso / créditos de ação do agente. Flexível, porém imprevisível.

## Estado atual do código (herdado)
- Landing page completa com seções: Navbar, Hero, Trust, DataIntelligence,
  Services, Diagnostic, About, Results, Process, Testimonials, Pricing, FinalCTA, Footer.
- Auth com roles `owner`/`client`: `/login`, `/owner` (vê tudo, service role),
  `/dashboard` (própria empresa, RLS). Proteção de rota em `src/proxy.ts`.
- API routes: `/api/onboarding`, `/api/diagnose` (PageSpeed), `/api/scrape` (Apify).
- Migração Supabase `0001_init` (tabelas `profiles`, `companies`, `diagnostics`).
- Todas as integrações degradam graciosamente sem credenciais.

## Páginas
- `/` — Landing page (lead gen + diagnóstico grátis como isca)
- `/onboarding` — captura multi-step (alimenta o agente e o Apify)
- `/login`, `/dashboard`, `/owner` — área autenticada

## Acessos de teste
- `luan26ribeiro@gmail.com` = **owner** (vê tudo, nunca perde dados das empresas)
- `luancontasecundaria22@gmail.com` = **client** (teste do dashboard do cliente)

## Roadmap
- [ ] **Fase 1:** Agente-chat MVP (Claude Agent SDK) + ferramenta de gerar/agendar
      posts (com aprovação).
- [ ] **Fase 2:** Revenue Opportunities — detector de leads sem resposta + avaliações negativas.
- [ ] **Fase 3:** Integrações de canal reais (Instagram → WhatsApp → Google → E-mail).
- [ ] **Fase 4:** Botão "Resolver tudo" (fila de ações em lote com aprovação).
- [ ] Definir o modelo de cobrança e instrumentar billing.
- [ ] SEO (meta tags, OG image, sitemap) + Analytics.

## Variáveis de ambiente (`.env`)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
PAGESPEED_API_KEY=
APIFY_TOKEN=
ANTHROPIC_API_KEY=
```
