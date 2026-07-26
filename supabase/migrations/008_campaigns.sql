-- Lets the Marketing Agent turn a trend/goal into a batch of draft posts that
-- are grouped together (Campanhas tab) instead of showing up as one-off posts.
create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  goal text not null,
  brief text,
  source text not null default 'manual' check (source in ('manual', 'auto_trend')),
  created_at timestamptz not null default now()
);

create index if not exists campaigns_company_id_idx on campaigns (company_id, created_at desc);

alter table campaigns enable row level security;

create policy "campaigns_self" on campaigns for select using (
  company_id in (select id from companies where user_id = auth.uid())
);

alter table posts add column if not exists campaign_id uuid references campaigns(id) on delete set null;
