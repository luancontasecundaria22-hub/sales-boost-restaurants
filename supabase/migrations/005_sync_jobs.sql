-- Tracks background sync runs (reviews + competitors) triggered from Settings,
-- so progress survives a closed tab and is visible from any tab that reopens
-- the dashboard — the job lives in the DB, not in component state.
create table if not exists sync_jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  status text not null default 'running' check (status in ('running','done','error')),
  steps jsonb not null default '[]'::jsonb,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sync_jobs_company_id_idx on sync_jobs (company_id, created_at desc);

alter table sync_jobs enable row level security;

create policy "sync_jobs_self" on sync_jobs for select using (
  company_id in (select id from companies where user_id = auth.uid())
);
