-- Marketing AI Foundation — completa peças estruturais que faltavam:
-- workspace por empresa, campanhas, tendências, relatórios armazenados e
-- config por ferramenta. Continua com o prefixo marketing_ai_ (consistente
-- com tudo que já existe) em vez dos nomes soltos do documento — é só
-- convenção de nome, a estrutura pedida é a mesma. Config por ferramenta
-- vira UMA tabela polimórfica (tool_id + settings jsonb) em vez de 15
-- tabelas quase idênticas — evita duplicar schema pra cada tool, mas ainda
-- deixa cada ferramenta configurável de verdade, como pedido.

-- Workspace — status/nível de automação por empresa, separado do resto da
-- config (marketing_ai_config já cobre voz/tom/público/etc.).
create table if not exists marketing_ai_accounts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade unique,
  name text not null default 'Marketing AI',
  status text not null default 'inactive' check (status in ('inactive', 'active', 'paused')),
  automation_level text not null default 'draft_only' check (automation_level in ('draft_only', 'semi_auto')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Campanhas — agrupam conteúdo por objetivo (o que marketing_ai_content
-- sozinho não fazia).
create table if not exists marketing_ai_campaigns (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  goal text,
  budget numeric,
  status text not null default 'planned' check (status in ('planned', 'active', 'completed', 'cancelled')),
  start_date date,
  end_date date,
  performance jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists marketing_ai_campaigns_company_idx on marketing_ai_campaigns (company_id, created_at desc);

alter table marketing_ai_content add column if not exists campaign_id uuid references marketing_ai_campaigns(id) on delete set null;

-- Tendências detectadas (Trend Discovery Tool).
create table if not exists marketing_ai_trends (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  title text not null,
  description text not null,
  category text,
  relevance text check (relevance in ('high', 'medium', 'low')),
  detected_at timestamptz not null default now()
);
create index if not exists marketing_ai_trends_company_idx on marketing_ai_trends (company_id, detected_at desc);

-- Relatórios armazenados — antes só existia a agregação na hora (ReportsTab
-- lendo insights direto). Agora fica um registro permanente por período.
create table if not exists marketing_ai_reports (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  report_type text not null check (report_type in ('weekly', 'monthly', 'campaign', 'executive', 'growth', 'audience')),
  title text not null,
  summary text not null,
  data jsonb not null default '{}',
  period_start date,
  period_end date,
  created_at timestamptz not null default now()
);
create index if not exists marketing_ai_reports_company_idx on marketing_ai_reports (company_id, created_at desc);

-- Config por ferramenta — polimórfica (tool_id referencia
-- marketing_ai_tool_registry.id). Cada ferramenta grava seus próprios
-- campos dentro de `settings`, sem precisar de tabela dedicada por tool.
create table if not exists marketing_ai_tool_config (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  tool_id text not null references marketing_ai_tool_registry(id) on delete cascade,
  enabled boolean not null default true,
  settings jsonb not null default '{}',
  health text not null default 'unknown' check (health in ('ok', 'warning', 'error', 'unknown')),
  last_sync_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (company_id, tool_id)
);

-- RLS — mesmo padrão de sempre.
do $$
declare t text;
begin
  for t in select unnest(array['marketing_ai_accounts', 'marketing_ai_campaigns', 'marketing_ai_trends', 'marketing_ai_reports', 'marketing_ai_tool_config'])
  loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "users see own company %1$s" on %1$s for select using (company_id in (select id from companies where user_id = auth.uid()))', t);
  end loop;
end $$;
create policy "users update own company marketing_ai_tool_config" on marketing_ai_tool_config for update
  using (company_id in (select id from companies where user_id = auth.uid()));
create policy "users insert own company marketing_ai_tool_config" on marketing_ai_tool_config for insert
  with check (company_id in (select id from companies where user_id = auth.uid()));
