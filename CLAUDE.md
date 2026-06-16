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

- **Frontend:** React + Vite, TypeScript, Tailwind CSS, deploy via Cloudflare Workers.
- **Auth/DB:** Supabase (Auth + Postgres + RLS). *(já implementado)*
- **Agente:** Claude API (Anthropic) via Supabase Edge Functions — definimos as
  *ferramentas* (postar, agendar, ler leads, responder review) e a API orquestra
  raciocínio + execução. *(implementado na edge function `agent-chat`)*
- **Canais de integração:** Instagram, WhatsApp (API Cloud oficial),
  Google Business Profile (Maps/Reviews), E-mail. *(novos, entram por etapas)*
- **Coleta de dados:** Apify (reviews, redes sociais, Maps) + Google PageSpeed
  Insights (diagnóstico de site).
- **IA:** Claude API (`claude-sonnet-4-6`) — análise de reviews, geração de posts,
  planos de ação, respostas a leads.
- **PDF:** pdf-lib — geração de relatórios mensais.
- **Email:** Resend via Supabase Edge Functions.
- **Pagamentos:** Stripe (assinatura mensal BRL/USD).

### Regras de arquitetura
- Multi-tenant: tabela `companies` é a raiz; toda tabela tem `company_id` com RLS.
- Roles: `owner` (operador/admin), `client` (dono do negócio).
- Nunca expor chaves de API no frontend — chamadas à Claude API e integrações
  sempre via Supabase Edge Functions.
- i18n desde o início — nunca strings hardcoded na UI.

## Brand

- **Primary:** `#FF6D29` (laranja)
- **Card BG:** `#150E08`
- **Page BG:** `#0E0B0A`
- **Muted:** `#BABABA`
- **Font:** `'Bricolage Grotesque', system-ui, sans-serif`
- Design dark, técnico, premium. Sem gradientes genéricos. Animações sutis.

## As 3 peças do produto

### 1. Agente pessoal (chat)
- **Motor:** Claude API com tool use. Cada empresa tem contexto próprio
  (nome, tipo, cidade, Instagram, objetivo) injetado no system prompt.
- **Ferramentas que o agente pode chamar — todas com aprovação humana:**
  - `create_post` — cria rascunho de post para aprovação
  - `create_multiple_posts` — cria vários rascunhos de uma vez (semana de conteúdo)
  - *(futuro)* listar leads sem resposta e rascunhar follow-up (WhatsApp / E-mail)
  - *(futuro)* ler avaliações e rascunhar resposta (Google)
  - *(futuro)* consultar métricas do dashboard
- **Regra de ouro:** o agente **nunca** publica ou responde sozinho —
  gera rascunho → dono aprova na aba Posts → então executa.
- **Histórico:** conversas salvas em `agent_messages` por empresa.
- **Rate limiting:** planejado — X mensagens/mês por plano para controlar custo de API.

### 2. Revenue Opportunities *(a implementar)*
Varre os canais e lista oportunidades com valor estimado, ex.:
- "3 leads sem resposta há +24h"
- "7 avaliações negativas sem resposta"
- "5 consultas/reservas não confirmadas"

Cada item tem uma ação sugerida. O botão **"Resolver tudo"** faz o agente montar a
fila de ações e apresentá-la para **aprovação em lote**.

### 3. Dashboard
Métricas (receita recuperada, leads respondidos, posts publicados, reputação) +
timeline do que o agente fez e o que está pendente de aprovação.

## Modelo de dados (atual)

```
companies (id, user_id, business_name, business_type, city, website_url, instagram_url, goal, plan, created_at)
user_roles (user_id, role)  -- 'owner' | 'client'
posts (id, company_id, content, platform, status, image_suggestion, best_time, created_at)
  -- status: 'rascunho' | 'aprovado' | 'publicado'
agent_messages (id, company_id, role, content, created_at)
  -- role: 'user' | 'assistant'
diagnostics (id, company_id, url, score, data, created_at)
```

## Público-alvo

Qualquer dono de pequeno/médio estabelecimento no Brasil — varejo, serviços,
beleza, saúde, food, franquias — que quer crescer **sem precisar virar
especialista em marketing**.

- Fase 1: Brasil (foco Rio de Janeiro) + brasileiros nos EUA
- Ticket: R$397–697/mês (BR) ou $197–397/mês (US)
- Decisor: o próprio dono, decisão rápida

## Diferenciais competitivos

1. **Conhece o cliente com dados reais da internet (Apify)** — varre reviews,
   redes e Maps para montar o perfil real do cliente. Esses dados alimentam o agente.
2. **Diagnóstico de site grátis** — porta de entrada / isca de lead qualificado.
3. **Um agente que EXECUTA, não só mostra relatório** — em PT-BR, preço em R$
   (concorrentes como Birdeye, Malou, Bloom focam EUA/premium).
4. **Ninguém faz:** comparação de preços + cruzamento com reviews + plano de ação concreto.

## Modelo de cobrança — **A DECIDIR**

Três hipóteses em aberto:
- **(a)** Assinatura mensal fixa (ex. R$197–R$397/mês). Previsível, fácil de comunicar.
- **(b)** Mensal menor + % da receita recuperada. Alinha incentivos.
- **(c)** Por uso / créditos de ação do agente. Flexível, porém imprevisível.

Custo de API por cliente: ~$0,20–$0,80/mês (Claude Sonnet). Absorver no preço é viável.

## Estado atual do código

- Landing page completa com hero, diagnóstico gratuito, pricing.
- Auth com roles `owner`/`client`: `/login`, `/owner`, `/dashboard` + proteção de rota.
- Dashboard com sidebar: Visão Geral, Diagnóstico, Insights, Integrações, Posts, Agente, Concorrentes, Relatório, Configurações.
- Edge functions deployadas: `agent-chat`, `generate-posts`, `run-diagnosis`, `analyze-reviews`, `import-reviews`, `map-competitors`, `find-place`, `generate-report`, `gsc-metrics`, `gsc-oauth-callback`, `claim-diagnostic`.
- Supabase migrations em `supabase/migrations/`.
- i18n via `src/i18n.ts`.

## Roadmap

- [x] Agente-chat MVP (`agent-chat` edge function + `AgentePage`)
- [ ] **Fase 2:** Rate limiting por plano na edge function `agent-chat`
- [ ] **Fase 3:** Revenue Opportunities — detector de leads sem resposta + avaliações negativas
- [ ] **Fase 4:** Integrações de canal reais (Instagram → WhatsApp → Google → E-mail)
- [ ] **Fase 5:** Botão "Resolver tudo" (fila de ações em lote com aprovação)
- [ ] Stripe — planos mensais BRL/USD + controle de acesso por plano
- [ ] Onboarding self-service com relatório demo em 24h
- [ ] Definir e instrumentar modelo de cobrança

## Concorrentes (referência)

- **Birdeye / ReviewTrackers / Podium** (US): caros, genéricos, só dashboard
- **Falaê** (BR): pesquisa de satisfação + CRM — não faz inteligência de preços
- **Zenchef / Gastroranking** (EU): gestão de reviews atrelada a reservas
- **Diferencial:** ninguém cruza preços + reviews + plano de ação + agente que executa

## Variáveis de ambiente

```
# Frontend (.env.local)
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_GOOGLE_OAUTH_CLIENT_ID=

# Supabase Edge Functions (secrets)
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
PAGESPEED_API_KEY=
APIFY_TOKEN=
RESEND_API_KEY=
STRIPE_SECRET_KEY=
```
