-- Short AI-generated report (summary + suggestions) per dashboard tab, so
-- every data tab (except Conteúdo, which already has its own agent loop)
-- shows an interpretation of what's there instead of just raw numbers. Also
-- gives the autonomous agent cycle a compact, pre-digested view of each area
-- instead of re-reading raw tables every time it decides what to do.
create table if not exists insights_reports (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  tab_key text not null,
  summary text not null,
  suggestions text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (company_id, tab_key)
);

create index if not exists insights_reports_company_id_idx on insights_reports (company_id, tab_key);

alter table insights_reports enable row level security;

create policy "insights_reports_self" on insights_reports for select using (
  company_id in (select id from companies where user_id = auth.uid())
);
