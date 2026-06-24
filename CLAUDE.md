# Sales Boost — O gerenciador de crescimento do seu negócio

> **Tagline:** "A plataforma que te faz conhecer seu cliente"
> **Promessa:** gerar mais receita automaticamente para qualquer negócio local.
> **Foco atual:** Jarvis — o assistente de voz com IA que executa tarefas de marketing e vendas.

## O que é (visão de produto)

Sales Boost é o **"gerente de crescimento"** que trabalha sozinho pelo pequeno
negócio. Serve qualquer tipo de comércio ou serviço — varejo, beleza, saúde,
food, clínicas, academias, franquias. Não é um conjunto de ferramentas soltas
— é **UM produto** com 4 peças que se reforçam:

1. **Jarvis (assistente de voz + agentes)** — interface principal do produto.
   O dono fala por voz (ou texto) e um time de agentes de IA executa tarefas de
   marketing e vendas. Cada agente tem personalidade, ferramentas e especialidade
   próprias (CEO, Researcher, CMO, Sales Rep, Data Analyst, Customer Success).
   Rota `/jarvis` — tela HUD 3D estilo Tony Stark, sempre ouvindo.
2. **Agente chat (texto)** — fallback/alternativa ao Jarvis por voz. O dono fala
   em linguagem natural e o agente executa tarefas. Rota `/dashboard/agente`.
3. **Revenue Opportunities** — encontra a receita parada na mesa (leads sem
   resposta, avaliações negativas, consultas não confirmadas) e resolve com 1 clique.
4. **Dashboard** — métricas do negócio + histórico do que o agente fez e o que
   está pendente de aprovação.

**Princípio central:** o Sales Boost gera receita no piloto automático, mas
**nada vai ao público sem aprovação do dono** (human-in-the-loop).

## Stack

- **Frontend:** React + Vite, TypeScript, Tailwind CSS, deploy via Cloudflare Workers.
- **Auth/DB:** Supabase (Auth + Postgres + RLS). *(já implementado)*
- **Agente:** Claude API (Anthropic) via Supabase Edge Functions — definimos as
  *ferramentas* (postar, agendar, ler leads, responder review) e a API orquestra
  raciocínio + execução. *(implementado na edge function `agent-chat`)*
- **Voz (Jarvis):** Web Speech API (STT nativo do browser, pt-BR/en-US) →
  `agent-chat` edge function (Claude AI) → `voice-tts` edge function (ElevenLabs).
  PT voice ID: `CstacWqMhJQlnfLPxRG4` | EN voice ID: `cCYjmrGZaI86GUJ7F2Nn`
- **3D Jarvis Orb:** Three.js — 900 partículas Fibonacci + wireframe + inner glow.
  4 estados animados: idle / listening / thinking / speaking.
- **Canais de integração:** Instagram, WhatsApp (API Cloud oficial),
  Google Business Profile (Maps/Reviews), E-mail. *(novos, entram por etapas)*
- **Coleta de dados:** Apify (reviews, redes sociais, Maps) + Google PageSpeed
  Insights (diagnóstico de site).
- **IA:** Claude API (`claude-sonnet-4-6`) — análise de reviews, geração de posts,
  planos de ação, respostas a leads.
- **PDF:** apitemplate.io (`create-pdf-from-html`) — geração de relatórios mensais.
- **Email:** Resend via Supabase Edge Functions.
- **Pagamentos:** Stripe (assinatura mensal BRL/USD).

### Regras de arquitetura
- Multi-tenant: tabela `companies` é a raiz; toda tabela tem `company_id` com RLS.
- Roles: `owner` (operador/admin), `client` (dono do negócio).
- Nunca expor chaves de API no frontend — chamadas à Claude API e integrações
  sempre via Supabase Edge Functions.
- i18n desde o início — nunca strings hardcoded na UI.
- Deploy: `npm run build` → `npx wrangler deploy` (manual; sem CI/CD pipeline).
- Wrangler token salvo em `C:/Users/Lenovo/AppData/Roaming/xdg.config/.wrangler/config/default.toml`.

## Brand

- **Primary:** `#FF6D29` (laranja)
- **Card BG:** `#150E08`
- **Page BG:** `#0E0B0A`
- **Muted:** `#BABABA`
- **Font:** `'Bricolage Grotesque', system-ui, sans-serif`
- Design dark, técnico, premium. Sem gradientes genéricos. Animações sutis.

## Jarvis — Arquitetura de voz e agentes

### Loop de voz (MVP atual)
```
🎤 Fala  →  Web Speech API (pt-BR/en-US)  →  texto
       ↓
   agent-chat edge function (Claude + tools + contexto da empresa)
       ↓
   resposta em texto  →  voice-tts edge function (ElevenLabs)  →  🔊 áudio
       ↓
   JarvisOrb reage (idle → listening → thinking → speaking)
```

### Agentes (roadmap de papéis)
Cada agente = system prompt + tools + voz ElevenLabs. Todos compartilham
contexto da empresa (`companies`) e memória (`agent_messages`, marcada por agente).

| Agente | Especialidade | Motor |
|--------|--------------|-------|
| CEO | Orquestra e delega | Claude Sonnet |
| Researcher | Varre reviews/Maps/redes (Apify) | Claude Haiku |
| CMO | Posts, conteúdo, calendário | Claude Haiku |
| Sales Rep | Leads, follow-up, WhatsApp | Claude Haiku |
| Data Analyst | Métricas, SQL, gráficos | Claude Haiku |
| Customer Success | Avaliações, retenção | Claude Haiku |
| Dev (Claude) | Executa código — sou eu | Claude Sonnet/Opus |

MVP atual usa 1 agente (CMO/agente-chat existente). Fase 2: generalizar com
`agent_role` em `agent_messages` + seletor no HUD.

## As 4 peças do produto

### 1. Jarvis (voz + HUD 3D)
- **Rota:** `/jarvis` — tela full-screen fora do dashboard.
- **Motor:** Claude API com tool use via `agent-chat` edge function.
- **Voz entrada:** Web Speech API (browser-native, grátis).
- **Voz saída:** ElevenLabs via `voice-tts` edge function.
- **Toggle "Sempre ouvindo":** reinicia STT 700ms após ficar idle.
- **Fallback gracioso:** sem `ELEVENLABS_API_KEY` → modo texto, nada quebra.

### 2. Agente chat (texto)
- **Rota:** `/dashboard/agente`
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

### 3. Revenue Opportunities
Varre os canais e lista oportunidades com valor estimado, ex.:
- "3 leads sem resposta há +24h"
- "7 avaliações negativas sem resposta"
- "5 consultas/reservas não confirmadas"

Cada item tem uma ação sugerida. O botão **"Resolver tudo"** faz o agente montar a
fila de ações e apresentá-la para **aprovação em lote** (Fase 5).

### 4. Dashboard
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
reviews (id, company_id, source, author, rating, text, review_date, sentiment, themes, raw_data, created_at)
opportunities (id, company_id, type, title, description, value_estimate, status, created_at)
```

## Público-alvo

Qualquer dono de pequeno/médio estabelecimento no Brasil — varejo, serviços,
beleza, saúde, food, clínicas, academias, franquias — que quer crescer **sem
precisar virar especialista em marketing**.

- Fase 1: Brasil (foco Rio de Janeiro) + brasileiros nos EUA
- Ticket: R$397–697/mês (BR) ou $197–397/mês (US)
- Decisor: o próprio dono, decisão rápida

## Diferenciais competitivos

1. **Jarvis fala com você** — único assistente de voz IA no mercado BR que executa
   tarefas de marketing por comando de voz, em português.
2. **Conhece o cliente com dados reais da internet (Apify)** — varre reviews,
   redes e Maps para montar o perfil real do cliente.
3. **Diagnóstico de site grátis** — porta de entrada / isca de lead qualificado.
4. **Um agente que EXECUTA, não só mostra relatório** — em PT-BR, preço em R$.
5. **Ninguém faz:** comparação de preços + cruzamento com reviews + plano de ação
   concreto + voz.

## Modelo de cobrança — A DECIDIR

Três hipóteses em aberto:
- **(a)** Assinatura mensal fixa (ex. R$197–R$397/mês). Previsível, fácil de comunicar.
- **(b)** Mensal menor + % da receita recuperada. Alinha incentivos.
- **(c)** Por uso / créditos de ação do agente. Flexível, porém imprevisível.

Custo de API por cliente: ~$0,20–$0,80/mês (Claude Sonnet) + ~$0,10–$0,30/mês
(ElevenLabs). Absorver no preço é viável.

## Estado atual do código

- Site publicado: https://sales-boost-restaurants.luancontasecundaria22.workers.dev/
- **Jarvis ao vivo:** https://sales-boost-restaurants.luancontasecundaria22.workers.dev/jarvis
- Landing page completa com hero, diagnóstico gratuito, pricing.
- Auth com roles `owner`/`client`: `/login`, `/owner`, `/dashboard` + proteção de rota.
- Dashboard com sidebar: Visão Geral, Diagnóstico, Insights, Integrações, Posts,
  Agente, Oportunidades, Concorrentes, Relatório, Configurações.
- **Jarvis:** `/jarvis` — HUD 3D com Three.js orb, voz sempre ativa (toggle), PT/EN.
- Edge functions deployadas: `agent-chat`, `generate-posts`, `run-diagnosis`,
  `site-diagnosis`, `analyze-reviews`, `import-reviews`, `apify-sync`,
  `detect-opportunities`, `draft-reply`, `map-competitors`, `find-place`,
  `generate-report`, `gsc-metrics`, `gsc-oauth-callback`, `gbp-oauth-callback`,
  `reply-google-review`, `claim-diagnostic`, `create-checkout`, `stripe-webhook`,
  **`voice-tts`** (ElevenLabs TTS para o Jarvis).
- Supabase migrations em `supabase/migrations/`.
- i18n via `src/i18n.ts`.

## Roadmap

- [x] Agente-chat MVP (`agent-chat` edge function + `AgentePage`)
- [x] **Fase 2:** Rate limiting por plano na edge function `agent-chat`
- [x] **Fase 3:** Revenue Opportunities — detector de leads sem resposta + avaliações
      negativas (`detect-opportunities`, `draft-reply`, página Oportunidades)
- [x] **Jarvis MVP:** `/jarvis` com 3D orb (Three.js), voz sempre ativa,
      ElevenLabs TTS, toggle PT/EN, `voice-tts` edge function deployada
- [ ] **Fase 4:** Integrações de canal reais — GBP (OAuth + resposta a reviews)
      e Instagram (sync via Apify) já funcionam; falta WhatsApp e E-mail
- [ ] **Fase 5:** Botão "Resolver tudo" (fila de ações em lote com aprovação)
- [ ] **Jarvis Fase 2:** Multi-agente — 7 papéis com `agent_role`, seletor no HUD
- [ ] **Jarvis Fase 3:** Modo "reunião" — CEO orquestra todos os agentes
- [ ] **Jarvis 24/7:** Crons + webhooks para agentes rodarem autonomamente
- [x] Stripe — checkout + webhook (`create-checkout`, `stripe-webhook`)
- [ ] Onboarding self-service com relatório demo em 24h
- [ ] Definir e instrumentar modelo de cobrança final (a/b/c)
- [ ] Automação de deploy: GitHub Actions → sem precisar rodar build+deploy manual

## Concorrentes (referência)

- **Birdeye / ReviewTrackers / Podium** (US): caros, genéricos, só dashboard
- **Falaê** (BR): pesquisa de satisfação + CRM — não faz inteligência de preços
- **Zenchef / Gastroranking** (EU): gestão de reviews atrelada a reservas
- **Diferencial:** ninguém cruza preços + reviews + plano de ação + agente que
  executa + **voz em PT-BR**

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
ELEVENLABS_API_KEY=          # voz do Jarvis — sem isso cai pra modo texto
ELEVENLABS_VOICE_ID=         # opcional; padrão configurado por idioma no JarvisPage
APITEMPLATE_API_KEY=         # PDF de relatórios mensais
```

---

## Regras de agentes (Ruflo / Claude Code)

- Do what has been asked; nothing more, nothing less
- NEVER create files unless absolutely necessary — prefer editing existing files
- NEVER create documentation files unless explicitly requested
- ALWAYS read a file before editing it
- NEVER commit secrets, credentials, or .env files
- Keep files under 500 lines
- Validate input at system boundaries
- **Nunca** expor chaves de API no frontend — sempre via Supabase Edge Functions
- **i18n sempre** — nunca strings hardcoded na UI
- **Human-in-the-loop** — o agente nunca publica ou envia mensagens sem aprovação

### Comunicação com o usuário (Luan)
- Luan NÃO é desenvolvedor. Falar em linguagem simples e direta.
- Nada de jargão técnico sem explicação.
- Quando algo precisa ser feito no terminal, dar o comando pronto.
- Foco: funciona? O que ele precisa fazer agora?

### Coordenação de agentes (SendMessage-First)

```
Lead (you) ←→ architect ←→ developer ←→ tester ←→ reviewer
```

- ALWAYS name agents — `name: "role"` makes them addressable
- Spawn ALL agents in ONE message with `run_in_background: true`
- After spawning: STOP, tell user what's running, wait for results
- NEVER poll status — agents message back or complete automatically

### Quando usar swarm
- **YES**: 3+ files, new features, cross-module refactoring, API changes
- **NO**: single file edits, 1-2 line fixes, docs updates, config changes

### Build & Test

```bash
npm run build && npx wrangler deploy
```

Sempre verificar que o build passa antes de reportar tarefa como concluída.
