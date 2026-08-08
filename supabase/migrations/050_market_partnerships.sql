-- Oportunidades de Parceria: extensão da Inteligência de Mercado.
create table if not exists marketing_ai_partnerships (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text,
  kind text,
  score int,
  details jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_mai_partnerships on marketing_ai_partnerships(company_id, score desc);
alter table marketing_ai_partnerships enable row level security;
create policy "owner all partnerships" on marketing_ai_partnerships for all
  using (company_id in (select id from companies where user_id = auth.uid()))
  with check (company_id in (select id from companies where user_id = auth.uid()));
