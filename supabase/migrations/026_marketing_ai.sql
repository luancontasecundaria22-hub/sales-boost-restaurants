-- Marketing AI — sistema 100% independente do módulo "Agentes" existente,
-- por decisão explícita do dono (não reaproveita tabelas nem lógica do
-- hermes-proxy/generate-posts/content-intelligence/map-competitors). Cada
-- tabela abaixo é própria deste subsistema.
--
-- Multi-tenant: segue o mesmo padrão de RLS já usado em `posts` (company_id
-- vinculado via companies.user_id = auth.uid()) — isso é uma regra de
-- segurança do projeto inteiro, não uma dependência do módulo Agentes.

create table if not exists marketing_ai_config (
  company_id uuid primary key references companies(id) on delete cascade,
  business_objectives text,
  brand_voice text,
  tone text,
  posting_frequency text not null default '3x por semana',
  preferred_content_types text[] not null default array['reel', 'carrossel', 'foto'],
  automatic_publishing boolean not null default false,
  approval_workflow text not null default 'draft_only' check (approval_workflow in ('draft_only', 'auto_publish')),
  competitors text[] not null default '{}',
  brand_colors text[] not null default '{}',
  brand_assets jsonb not null default '{}',
  target_audience text,
  content_pillars text[] not null default '{}',
  marketing_goals text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists marketing_ai_tracking_snapshots (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  source text not null default 'instagram',
  followers int, posts_count int,
  avg_likes numeric, avg_comments numeric, avg_reach numeric, avg_impressions numeric,
  avg_saves numeric, avg_shares numeric, engagement_rate numeric, best_posting_hour int,
  raw jsonb,
  collected_at timestamptz not null default now()
);
create index if not exists marketing_ai_tracking_snapshots_company_idx on marketing_ai_tracking_snapshots (company_id, collected_at desc);

create table if not exists marketing_ai_insights (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  pillar text not null check (pillar in ('tracking', 'content', 'competitor', 'strategy')),
  title text not null,
  description text not null,
  impact text check (impact in ('high', 'medium', 'low')),
  status text not null default 'open' check (status in ('open', 'dismissed', 'acted_on')),
  created_at timestamptz not null default now()
);
create index if not exists marketing_ai_insights_company_idx on marketing_ai_insights (company_id, created_at desc);

-- Calendário de conteúdo PRÓPRIO — não é a tabela `posts` do módulo Agentes.
create table if not exists marketing_ai_content (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  idea text,
  caption text,
  hashtags text,
  format text check (format in ('reel', 'carrossel', 'story', 'foto')),
  image_url text,
  status text not null default 'idea' check (status in ('idea', 'draft', 'approved', 'scheduled', 'published')),
  scheduled_at timestamptz,
  published_at timestamptz,
  performance jsonb,
  reasoning text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists marketing_ai_content_company_idx on marketing_ai_content (company_id, created_at desc);

-- Concorrentes PRÓPRIOS — não é a tabela `competitors` do módulo Agentes.
create table if not exists marketing_ai_competitors (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  instagram_url text,
  posting_frequency_days numeric,
  avg_engagement numeric,
  followers int,
  hashtags_used text[],
  notes text,
  last_analyzed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists marketing_ai_competitors_company_idx on marketing_ai_competitors (company_id);

create table if not exists marketing_ai_competitor_snapshots (
  id uuid primary key default gen_random_uuid(),
  competitor_id uuid not null references marketing_ai_competitors(id) on delete cascade,
  followers int, posts_count int, avg_engagement numeric,
  collected_at timestamptz not null default now()
);

create table if not exists marketing_ai_strategy_log (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  recommendation text not null,
  reasoning text not null,
  status text not null default 'proposed' check (status in ('proposed', 'approved', 'dismissed', 'implemented')),
  created_at timestamptz not null default now()
);
create index if not exists marketing_ai_strategy_log_company_idx on marketing_ai_strategy_log (company_id, created_at desc);

-- Aprendizado contínuo — "essa legenda aumenta salvamentos", etc.
create table if not exists marketing_ai_memory (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  key text not null,
  learning text not null,
  confidence text check (confidence in ('high', 'medium', 'low')),
  updated_at timestamptz not null default now(),
  unique (company_id, key)
);

create table if not exists marketing_ai_activity_log (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  pillar text,
  action text not null,
  reasoning text,
  created_at timestamptz not null default now()
);
create index if not exists marketing_ai_activity_log_company_idx on marketing_ai_activity_log (company_id, created_at desc);

-- RLS — mesmo padrão de `posts`: o cliente só vê a própria empresa. Escrita
-- de verdade acontece pela edge function com service role (ignora RLS).
do $$
declare
  t text;
begin
  for t in select unnest(array[
    'marketing_ai_config', 'marketing_ai_tracking_snapshots', 'marketing_ai_insights',
    'marketing_ai_content', 'marketing_ai_competitors', 'marketing_ai_strategy_log',
    'marketing_ai_memory', 'marketing_ai_activity_log'
  ])
  loop
    execute format('alter table %I enable row level security', t);
    execute format(
      'create policy "users see own company %1$s" on %1$s for select using (company_id in (select id from companies where user_id = auth.uid()))',
      t
    );
    execute format(
      'create policy "users update own company %1$s" on %1$s for update using (company_id in (select id from companies where user_id = auth.uid()))',
      t
    );
  end loop;
end $$;

-- marketing_ai_competitor_snapshots não tem company_id direto — segue via competitor_id.
alter table marketing_ai_competitor_snapshots enable row level security;
create policy "users see own company marketing_ai_competitor_snapshots" on marketing_ai_competitor_snapshots for select
  using (competitor_id in (select id from marketing_ai_competitors where company_id in (select id from companies where user_id = auth.uid())));
