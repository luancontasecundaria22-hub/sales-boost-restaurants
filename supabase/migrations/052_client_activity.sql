-- Diário do cliente: cada ação relevante que o cliente faz no app. Alimenta a
-- aba "👤 Cliente" da ficha da empresa (painel owner) e é o par local do
-- PostHog (que guarda os mesmos eventos para funis/gráficos agregados).
create table if not exists client_activity (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  user_id uuid,
  event text not null,
  label text,
  meta jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_client_activity on client_activity(company_id, created_at desc);

alter table client_activity enable row level security;

-- Cliente insere/lê só a atividade da própria empresa. O owner lê tudo via
-- service role (edge function owner-company-activity), então não precisa de
-- policy de owner aqui.
drop policy if exists "own company insert activity" on client_activity;
create policy "own company insert activity" on client_activity for insert to authenticated
  with check (company_id in (select id from companies where user_id = auth.uid()));

drop policy if exists "own company read activity" on client_activity;
create policy "own company read activity" on client_activity for select to authenticated
  using (company_id in (select id from companies where user_id = auth.uid()));
