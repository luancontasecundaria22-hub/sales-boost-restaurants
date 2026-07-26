-- Marketing AI V2 — Marketing Brain (conhecimento unificado), Experiments,
-- Tool Registry e configuração dinâmica. Continua 100% independente das
-- tabelas do módulo Agentes (nenhuma FK ou leitura cruzada com posts/
-- agent_messages/hermes_config). Migration aditiva — nada existente é
-- removido ou renomeado, então as abas atuais (Tracking/Content/etc.)
-- continuam funcionando sem alteração.

-- Marketing Brain — cada pilar grava aqui um nó de conhecimento destilado
-- (padrão, aprendizado, recomendação, estratégia bem/mal-sucedida). É a
-- "memória permanente" mencionada no doc — nenhum pilar guarda conhecimento
-- isolado só pra si; tudo que vira insight de verdade passa por aqui também.
create table if not exists marketing_ai_brain_nodes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  node_type text not null check (node_type in (
    'pattern', 'learned_behavior', 'recommendation', 'successful_strategy',
    'failed_strategy', 'experiment_result', 'competitor_observation', 'brand_fact'
  )),
  source_pillar text not null check (source_pillar in ('tracking', 'content', 'competitor', 'strategy', 'experiment')),
  title text not null,
  body text not null,
  confidence text check (confidence in ('high', 'medium', 'low')),
  data jsonb not null default '{}',
  related_node_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists marketing_ai_brain_nodes_company_idx on marketing_ai_brain_nodes (company_id, created_at desc);
create index if not exists marketing_ai_brain_nodes_type_idx on marketing_ai_brain_nodes (company_id, node_type);

-- Experiments — testes controlados (CTA, horário, tamanho de legenda, etc.)
-- propostos pelo Hermes e medidos pelo Marketing AI.
create table if not exists marketing_ai_experiments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  hypothesis text not null,
  variable text not null,
  variant_a text not null,
  variant_b text not null,
  status text not null default 'proposed' check (status in ('proposed', 'running', 'completed', 'cancelled')),
  winner text check (winner in ('a', 'b', 'inconclusive')),
  results jsonb not null default '{}',
  reasoning text,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists marketing_ai_experiments_company_idx on marketing_ai_experiments (company_id, created_at desc);

-- Tool Registry — inventário de tudo que o Marketing AI sabe (ou pretende)
-- fazer. `connected` reflete se existe integração de verdade hoje; tools sem
-- API real ficam com status 'planned' e NUNCA fabricam dado — a UI mostra
-- "não conectado ainda" em vez de simular.
create table if not exists marketing_ai_tool_registry (
  id text primary key,
  name text not null,
  description text not null,
  category text not null,
  connected boolean not null default false,
  requires_integration text,
  status text not null default 'planned' check (status in ('live', 'partial', 'planned')),
  notes text
);

insert into marketing_ai_tool_registry (id, name, description, category, connected, requires_integration, status, notes) values
  ('instagram_tool', 'Instagram Tool', 'Perfil, posts, reels, stories via scraping (Apify).', 'dados', true, 'Apify', 'partial', 'Só dados públicos — não é a API oficial da Meta, então não inclui Insights privados nem DMs.'),
  ('insights_tool', 'Insights Tool', 'Alcance, impressões, engajamento oficiais do Instagram.', 'dados', false, 'Meta Business API (Instagram Insights)', 'planned', 'Hoje o Tracking Intelligence deriva engajamento a partir do scraping público — não é o Insights oficial da Meta.'),
  ('publishing_tool', 'Publishing Tool', 'Cria rascunho, agenda, publica.', 'execução', true, null, 'partial', 'Cria e agenda rascunho — publicar de verdade nunca é automático (regra da plataforma).'),
  ('calendar_tool', 'Calendar Tool', 'Calendário de conteúdo e campanhas.', 'execução', true, null, 'live', null),
  ('comment_tool', 'Comment Intelligence Tool', 'Sentimento, reclamações, elogios nos comentários.', 'dados', false, 'Meta Business API (comentários)', 'planned', 'Sem acesso à API de comentários ainda — não simulado.'),
  ('messaging_tool', 'Messaging Intelligence Tool', 'Conversas, leads e intenção via Instagram Direct.', 'dados', false, 'Instagram Messaging API', 'planned', 'Sem acesso à API de DM ainda — não simulado.'),
  ('competitor_tool', 'Competitor Tool', 'Acompanha concorrentes cadastrados via scraping.', 'dados', true, 'Apify', 'live', null),
  ('trend_discovery_tool', 'Trend Discovery Tool', 'Hashtags, formatos e tópicos em alta pro segmento.', 'inteligência', true, 'Claude', 'partial', 'Baseado em raciocínio da IA, não em API de tendências em tempo real.'),
  ('research_tool', 'Research Tool', 'Aprende sobre o negócio, produtos e clientes continuamente.', 'inteligência', true, 'Claude', 'live', null),
  ('image_generation_tool', 'Image Generation Tool', 'Gera imagens respeitando marca e identidade visual.', 'execução', true, 'Replicate', 'live', null),
  ('caption_generation_tool', 'Caption Generation Tool', 'Gera legendas com base no Marketing Brain.', 'execução', true, 'Claude', 'live', null),
  ('analytics_tool', 'Analytics Tool', 'Relatórios semanais, mensais, de campanha.', 'inteligência', true, null, 'live', null),
  ('experiment_tool', 'Experiment Tool', 'Testes controlados (CTA, horário, formato).', 'inteligência', true, null, 'live', null),
  ('learning_tool', 'Learning Tool', 'Toda execução vira conhecimento permanente no Marketing Brain.', 'inteligência', true, null, 'live', null),
  ('configuration_tool', 'Configuration Tool', 'Config dinâmica — Hermes refina automaticamente com evidência.', 'execução', true, null, 'live', null)
on conflict (id) do nothing;

-- Configuração dinâmica — campos do doc que ainda não existiam.
alter table marketing_ai_config add column if not exists brand_personality text;
alter table marketing_ai_config add column if not exists cta_preferences text;
alter table marketing_ai_config add column if not exists campaign_preferences text;
alter table marketing_ai_config add column if not exists visual_identity jsonb not null default '{}';

-- RLS — mesmo padrão das outras tabelas marketing_ai_*.
alter table marketing_ai_brain_nodes enable row level security;
create policy "users see own company marketing_ai_brain_nodes" on marketing_ai_brain_nodes for select
  using (company_id in (select id from companies where user_id = auth.uid()));

alter table marketing_ai_experiments enable row level security;
create policy "users see own company marketing_ai_experiments" on marketing_ai_experiments for select
  using (company_id in (select id from companies where user_id = auth.uid()));
create policy "users update own company marketing_ai_experiments" on marketing_ai_experiments for update
  using (company_id in (select id from companies where user_id = auth.uid()));

-- Tool registry é catálogo global (igual capability_registry/integration_catalog) — leitura pra qualquer autenticado, escrita só owner.
alter table marketing_ai_tool_registry enable row level security;
create policy "authenticated read marketing_ai_tool_registry" on marketing_ai_tool_registry for select to authenticated using (true);
create policy "owner write marketing_ai_tool_registry" on marketing_ai_tool_registry for all to authenticated using (
  exists (select 1 from user_roles ur where ur.email = auth.jwt() ->> 'email' and ur.role = 'owner')
) with check (
  exists (select 1 from user_roles ur where ur.email = auth.jwt() ->> 'email' and ur.role = 'owner')
);
