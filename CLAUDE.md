# CLAUDE.md — Plataforma de Inteligência de Vendas para Restaurantes

> Este arquivo orienta o Claude Code no desenvolvimento deste projeto. Leia antes de qualquer tarefa.

---

## 1. Visão do Produto

**Nome provisório:** (definir) — sugestões: MesaInteligente, Prato Cheio, SalesBoost Restaurantes

**One-liner:** Consultoria de vendas automatizada para restaurantes — cruzamos reputação online, perfil de clientes e preços de concorrentes para entregar um plano de ação mensal que aumenta vendas.

**Problema:** Donos de restaurante não têm tempo nem ferramenta para entender por que vendem menos do que poderiam. Ferramentas existentes (Birdeye, Falaê) entregam dashboards; nenhuma entrega "o que fazer amanhã".

**Cliente-alvo:**
- Fase 1: Restaurantes brasileiros em Miami + restaurantes médios no Rio de Janeiro (Barra da Tijuca)
- Ticket: R$397–697/mês (BR) ou $197–397/mês (US)
- Decisor: o dono, decisão individual e rápida

**Diferencial competitivo (não existe no mercado):**
1. Comparação de preços de concorrentes (raio de 2km, via iFood/cardápios públicos)
2. Cruzamento reviews + preços + perfil de cliente → plano de ação concreto
3. Bilíngue PT/EN (nicho: restaurantes brasileiros nos EUA)

---

## 2. Os 3 Pilares do Produto

### Pilar 1 — Reputação (MVP core)
- Coleta e análise de Google Reviews (API oficial do Google Places — começar por aqui, é legal e estável)
- Fase 2: reviews do iFood, TripAdvisor, comentários de Instagram
- IA (Claude API) classifica reviews por tema: atendimento, comida, preço, ambiente, tempo de espera
- Extrai: pontos fortes (amplificar no marketing), reclamações recorrentes (corrigir), pratos/funcionários mais citados
- Feature de upsell: resposta automática a reviews no tom do restaurante

### Pilar 2 — Inteligência Competitiva (diferencial)
- Mapeia 5–10 concorrentes num raio de 2km (Google Places API: tipo, nota, volume de reviews)
- Coleta de preços: semiautomática no MVP (operador cola cardápio do iFood, IA estrutura os dados)
- Cruzamento-chave: preço do concorrente + reviews do concorrente
  - Ex: "Concorrente cobra 20% menos MAS reviews reclamam de qualidade → não baixe preço, comunique qualidade"
- Atualização quinzenal/mensal (preços não mudam diariamente)

### Pilar 3 — Perfil de Cliente (v2, após validação do core)
- QR code na mesa → pesquisa de 30 segundos em troca de brinde (sobremesa/café)
- Dados: faixa etária, como conheceu, frequência, satisfação
- LGPD: consentimento explícito via checkbox, dados anonimizados em relatórios
- Cruzamento com horários/ticket médio quando houver integração com PDV (futuro)

### Saída final — O Relatório Mensal (o produto de verdade)
1. **Resumo executivo** — Score de saúde 0–100
2. **O que amam em você** — top 3 elogios + como usar no marketing
3. **O que afasta clientes** — top 3 reclamações + ação corretiva
4. **Seu posicionamento de preço** — tabela vs. concorrentes + recomendação
5. **3 Ações do Mês** — concretas, priorizadas, com impacto estimado

---

## 3. Stack Técnico

| Camada | Tecnologia | Observação |
|---|---|---|
| Frontend | React + Vite | Mesmo padrão do Saúde que Sustenta |
| Estilo | Tailwind CSS | Design profissional, evitar visual genérico |
| Backend/DB | Supabase (Postgres + Auth + RLS) | RLS obrigatório — dados de cada restaurante isolados por tenant |
| Hospedagem | Cloudflare Workers | Mesmo pipeline de deploy já dominado |
| IA | Claude API (Anthropic) | Análise de reviews, geração de relatórios e planos de ação |
| Dados externos | Google Places API | Reviews + dados de concorrentes (oficial, pago por uso) |
| PDF | pdf-lib | Geração do relatório mensal (mesma lib do SqS) |
| Email | Resend via Supabase Edge Functions | Entrega do relatório + alertas |
| Pagamentos | Stripe | Assinatura mensal, suporte a BRL e USD |

### Regras de arquitetura
- Multi-tenant desde o dia 1: tabela `restaurants` é a raiz; toda tabela tem `restaurant_id` com RLS
- Roles: `owner` (dono do restaurante), `admin` (você/operador)
- Nunca expor chaves de API no frontend; chamadas à Claude API e Google Places sempre via Edge Functions
- Idioma: interface PT-BR primeiro, EN na sequência (i18n desde o início — usar arquivos de tradução, nunca strings hardcoded)

---

## 4. Modelo de Dados (inicial)

```
restaurants (id, name, google_place_id, address, lat, lng, plan, locale, created_at)
users (id, restaurant_id, role, email)
reviews (id, restaurant_id, source, author, rating, text, review_date, sentiment, themes[])
competitors (id, restaurant_id, google_place_id, name, rating, review_count, distance_m)
competitor_prices (id, competitor_id, item_name, price, collected_at, source)
menu_items (id, restaurant_id, item_name, price, category)
surveys (id, restaurant_id, qr_slug, active)
survey_responses (id, survey_id, age_range, discovery_channel, frequency, nps, created_at)
reports (id, restaurant_id, period, pdf_url, health_score, created_at)
actions (id, report_id, title, description, priority, status)
```

---

## 5. Roadmap de Desenvolvimento

### Sprint 1 — Fundação (semana 1)
- [ ] Setup do repo, Supabase, Cloudflare Workers, CI básico
- [ ] Schema inicial + RLS + auth (Google OAuth, mesmo fluxo do SqS)
- [ ] Cadastro de restaurante: busca via Google Places, salva place_id
- [ ] Importação de reviews do Google (Edge Function + Places API)

### Sprint 2 — Motor de análise (semana 2)
- [ ] Edge Function: análise de reviews via Claude API (sentimento + temas + insights)
- [ ] Mapeamento de concorrentes (Places API: nearby search por tipo "restaurant")
- [ ] Tela admin para inserir preços de concorrentes (colar cardápio → IA estrutura)

### Sprint 3 — O relatório (semana 3)
- [ ] Geração do relatório mensal em PDF (pdf-lib) com as 5 seções
- [ ] Dashboard web do dono: score, principais insights, ações do mês
- [ ] Envio por email via Resend

### Sprint 4 — Comercialização (semana 4)
- [ ] Stripe: planos mensais BRL/USD
- [ ] Landing page (PT/EN) com exemplo de relatório
- [ ] Onboarding self-service: dono cadastra restaurante → relatório demo em 24h

### v2 (após 5+ clientes pagantes)
- [ ] QR code + pesquisa interna (Pilar 3)
- [ ] Resposta automática a reviews
- [ ] Recuperação de clientes sumidos (WhatsApp)
- [ ] Alertas em tempo real (review 1 estrela)
- [ ] Benchmark anônimo entre clientes (quando houver 20+ no mesmo nicho)

---

## 6. Princípios do Projeto

1. **O relatório é o produto.** O dashboard é secundário. Todo esforço vai para a qualidade dos insights e do plano de ação.
2. **Insight > dado.** Nunca mostrar "você tem 47 reviews negativas". Sempre: "73% das reclamações são sobre tempo de espera no sábado — contrate um extra ou ajuste o fluxo da cozinha".
3. **Manual antes de automático.** Se uma feature pode ser feita manualmente pelo operador (admin) com ajuda de IA, fazer assim primeiro. Automatizar só o que provar valor.
4. **Começar com dados públicos e legais.** Google Places API oficial. Scraping de iFood/Instagram fica para depois, com avaliação de risco.
5. **Bilíngue por padrão.** Todo texto via i18n. Mercado = Brasil + brasileiros nos EUA.

## 7. Concorrentes (referência de posicionamento)

- **Birdeye / ReviewTrackers / Podium** (US): caros, genéricos, só dashboard de reviews
- **Falaê** (BR): pesquisa de satisfação + CRM para restaurantes — concorrente mais próximo, mas não faz inteligência competitiva de preços
- **Zenchef / Gastroranking** (EU): gestão de reviews atrelada a reservas
- **Ninguém faz:** comparação de preços + cruzamento com reviews + plano de ação. Esse é o nosso território.

## 8. Métricas de Sucesso

- MVP validado: 3 restaurantes pagando R$300+/mês por 2 meses consecutivos
- North star: % de clientes que renovam após o 3º relatório
- Qualidade: dono consegue citar 1 ação que tomou por causa do relatório
