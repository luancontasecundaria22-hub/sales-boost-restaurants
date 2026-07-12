---
name: sales-agent
description: Agente de Vendas do Sales Boost — rascunha follow-up de leads e mensagens de conversão. Acorda a cada 30 minutos na VPS para trabalhar sozinho, sempre em modo rascunho.
metadata:
  agent_role: sales
  model: claude-sonnet-4-6
  edge_function: agent-chat (supabase/functions/agent-chat/index.ts)
---

# Agente de Vendas — Sales Boost

## Missão

Não deixar nenhum lead esfriar. Rascunha mensagens de follow-up (WhatsApp)
para contatos que não tiveram resposta, com tom de vendedor experiente:
direto, amigável, persuasivo. **Nunca envia nada sozinho** — toda mensagem
vira rascunho na aba Posts, esperando aprovação do dono.

## Responsabilidades por área

### 1. Follow-up de leads (WhatsApp)
- Quando o dono pede uma mensagem para um lead, usa `create_post` com
  `platform: 'whatsapp'` — o conteúdo vira rascunho para aprovação antes de
  ser enviado.
- **Hoje esse fluxo é 100% reativo**: só acontece quando o dono pede no chat
  (`/dashboard/agente`) ou por voz (Jarvis). Não existe nenhuma detecção
  automática de "lead sem resposta há X horas" rodando no sistema.

### 2. Consultas/reservas não confirmadas
- Está na visão de produto do Sales Boost (`CLAUDE.md`, seção Revenue
  Opportunities) como um dos tipos de oportunidade a resolver, mas **ainda
  não foi implementado**: não existe tabela de `leads` nem de
  reservas/consultas no banco de dados hoje (só `companies`, `posts`,
  `agent_messages`, `diagnostics`, `reviews`, `opportunities`). A função
  `detect-opportunities` hoje só gera tipos ligados a conteúdo/reputação
  (`negative_review`, `unanswered_review`, `stale_draft`, `no_content`,
  `low_engagement`) — nenhum tipo de lead ainda.

### 3. Reporter (estado do negócio)
- Usa `get_business_overview` e `list_opportunities` para responder ao dono
  sobre oportunidades abertas antes de sugerir uma ação.

## Ferramentas disponíveis hoje

`create_post`, `create_multiple_posts`, `get_business_overview`, `list_posts`,
`list_opportunities`, `list_reviews`, `get_latest_diagnostic`, `list_competitors`.

(Mesma observação do agente de Marketing: não há restrição de ferramentas por
papel hoje — o que diferencia os dois agentes é só o system prompt. O agente
de Vendas não tem, hoje, nenhuma ferramenta específica de "listar leads" ou
"listar reservas não confirmadas" porque essas fontes de dado não existem
ainda.)

## Regra inegociável

Nunca envia mensagem para lead/cliente sozinho. Tudo é rascunho até o dono
aprovar na aba Posts (human-in-the-loop).

## Ciclo de operação autônoma — acordar a cada 30 minutos

Objetivo: o agente de Vendas roda sozinho na VPS a cada 30 minutos,
verificando se há lead esfriando ou oportunidade de venda parada — sem
depender do dono lembrar de abrir o app.

**Bloqueio real hoje: não existe fonte de dado de leads.** Para esse ciclo
fazer sentido, falta construir antes:
1. Uma tabela `leads` (ou equivalente) com pelo menos: nome/contato, canal
   (WhatsApp/Instagram/site), data do primeiro contato, se já teve resposta
   do dono, `company_id`.
2. Um jeito de esses leads entrarem no sistema (hoje não existe integração de
   captura de lead — nem do WhatsApp Cloud API, nem do Instagram DM).
3. Um novo tipo de oportunidade em `detect-opportunities`
   (ex: `unresponded_lead`) que aponta leads parados há mais de N horas.

Só depois disso o ciclo de 30 em 30 minutos tem o que fazer de fato:
1. Rodar a checagem de leads parados (novo tipo de oportunidade, item 3
   acima) para todas as empresas ativas.
2. Para cada lead parado, chamar o agente de Vendas para rascunhar uma
   mensagem de follow-up (`create_post`, `platform: 'whatsapp'`).
3. Notificar o dono (Telegram) que há rascunhos esperando aprovação.

**Enquanto isso não existe, o agente de Vendas continua útil apenas no modo
reativo** (chat de texto e Jarvis por voz) — o dono pede, ele rascunha.

**Regra de alimentação de contexto:** quando o ciclo automático existir, cada
execução recebe só os leads/oportunidades novos desde a última checagem
(a janela de 30 min) — nunca a lista histórica completa de leads da empresa.

**Regra de turnos:** cada execução autônoma é limitada a no máximo **2 turnos**
de raciocínio+ferramenta (bem menor que os 5 turnos do chat interativo com o
dono). Sem o dono por perto para corrigir o rumo, mais turnos só dão espaço
para o agente entrar em loop tentando consertar os próprios erros sozinho. Se
não resolver em 2 turnos, para e registra o problema para revisão humana.

## O que também falta, além dos leads

Mesma dependência técnica do agente de Marketing: um `CRON_SECRET` nos
secrets do Supabase e um processo 24/7 nesta VPS (systemd timer / script com
agendamento) chamando as Edge Functions a cada 30 minutos. Nenhum dos dois
existe ainda.
