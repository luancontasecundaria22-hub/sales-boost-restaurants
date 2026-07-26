-- Prospecção de clientes para o próprio Sales Boost — completamente separado
-- do CRM `leads` (que é dos clientes finais, por company_id). Isso é só do
-- dono: negócios que ainda não são clientes, achados e qualificados por IA
-- pra virar pipeline de vendas.

-- Config editável pelo dono (singleton row) — cidades e tipos de negócio
-- que a varredura noturna deve cobrir, sem precisar redeploy pra mudar.
create table if not exists prospect_settings (
  id boolean primary key default true check (id),
  cities text[] not null default '{}',
  business_types text[] not null default '{}',
  max_per_night int not null default 20,
  updated_at timestamptz not null default now()
);
insert into prospect_settings (id) values (true) on conflict do nothing;

-- Cada linha é permanente — a varredura noturna só insere novos (upsert por
-- google_place_id), nunca apaga ou substitui o que já foi achado.
create table if not exists sales_prospects (
  id uuid primary key default gen_random_uuid(),
  google_place_id text not null unique,
  business_name text not null,
  business_type text,
  city text,
  address text,
  phone text,
  website_url text,
  instagram_url text,
  facebook_url text,
  has_whatsapp boolean not null default false,
  google_rating numeric,
  google_review_count int,
  lat numeric,
  lng numeric,
  marketing_score int,
  lead_score int,
  ai_summary text,
  ai_cold_call_notes text,
  status text not null default 'new' check (status in ('new', 'contacted', 'qualified', 'discarded', 'converted')),
  discovered_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists sales_prospects_lead_score_idx on sales_prospects (lead_score desc nulls last);
create index if not exists sales_prospects_status_idx on sales_prospects (status);

-- Histórico de contato/anotações por prospect — mesma ideia de "activities"
-- do desenho original, só que preso ao prospect em vez de ao lead do CRM.
create table if not exists prospect_activities (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references sales_prospects(id) on delete cascade,
  activity_type text not null default 'note' check (activity_type in ('call', 'email', 'note', 'status_change')),
  notes text,
  created_at timestamptz not null default now()
);

-- Um registro por rodada de varredura (manual ou automática) — pra o painel
-- mostrar "última varredura: X, achou Y leads novos" sem precisar polling
-- direto na tabela de prospects.
create table if not exists prospect_scan_log (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running' check (status in ('running', 'done', 'error')),
  found_count int not null default 0,
  error_message text
);

alter table prospect_settings enable row level security;
alter table sales_prospects enable row level security;
alter table prospect_activities enable row level security;
alter table prospect_scan_log enable row level security;

-- user_roles não tem user_id — o vínculo real com o usuário logado é por
-- email (confirmado direto no banco: user_roles.email = auth.users.email).
create policy "owner_all_prospect_settings" on prospect_settings for all
  using (exists (select 1 from user_roles ur join auth.users u on u.email = ur.email where u.id = auth.uid() and ur.role = 'owner'))
  with check (exists (select 1 from user_roles ur join auth.users u on u.email = ur.email where u.id = auth.uid() and ur.role = 'owner'));

create policy "owner_all_sales_prospects" on sales_prospects for all
  using (exists (select 1 from user_roles ur join auth.users u on u.email = ur.email where u.id = auth.uid() and ur.role = 'owner'))
  with check (exists (select 1 from user_roles ur join auth.users u on u.email = ur.email where u.id = auth.uid() and ur.role = 'owner'));

create policy "owner_all_prospect_activities" on prospect_activities for all
  using (exists (select 1 from user_roles ur join auth.users u on u.email = ur.email where u.id = auth.uid() and ur.role = 'owner'))
  with check (exists (select 1 from user_roles ur join auth.users u on u.email = ur.email where u.id = auth.uid() and ur.role = 'owner'));

create policy "owner_all_prospect_scan_log" on prospect_scan_log for all
  using (exists (select 1 from user_roles ur join auth.users u on u.email = ur.email where u.id = auth.uid() and ur.role = 'owner'))
  with check (exists (select 1 from user_roles ur join auth.users u on u.email = ur.email where u.id = auth.uid() and ur.role = 'owner'));
