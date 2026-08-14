-- Formatos custom do cliente (os padrão ficam em código) + presets (combinações
-- de formatos). Modular: adicionar formato/plataforma = 1 linha, sem mexer na
-- arquitetura do Creative Agent.
create table if not exists marketing_ai_formats (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  platform text,
  placement text,
  ratio text,
  w int not null,
  h int not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_mai_formats on marketing_ai_formats(company_id);
alter table marketing_ai_formats enable row level security;
drop policy if exists "owner all formats" on marketing_ai_formats;
create policy "owner all formats" on marketing_ai_formats for all to authenticated
  using (company_id in (select id from companies where user_id = auth.uid()))
  with check (company_id in (select id from companies where user_id = auth.uid()));

create table if not exists marketing_ai_presets (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  formats jsonb not null default '[]',
  created_at timestamptz not null default now()
);
create index if not exists idx_mai_presets on marketing_ai_presets(company_id);
alter table marketing_ai_presets enable row level security;
drop policy if exists "owner all presets" on marketing_ai_presets;
create policy "owner all presets" on marketing_ai_presets for all to authenticated
  using (company_id in (select id from companies where user_id = auth.uid()))
  with check (company_id in (select id from companies where user_id = auth.uid()));
