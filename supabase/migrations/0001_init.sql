-- Perfis de usuário com nível de acesso (owner / client)
create table if not exists profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text unique not null,
  role text not null default 'client' check (role in ('owner', 'client')),
  created_at timestamptz default now()
);

-- Empresas cadastradas no onboarding
create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  business_name text not null,
  business_type text,
  city text,
  website text,
  instagram text,
  facebook text,
  tiktok text,
  google_maps text,
  phone text,
  goal text,
  email text,
  created_at timestamptz default now()
);

-- Resultados de diagnóstico (PageSpeed) e scraping (Apify)
create table if not exists diagnostics (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  pagespeed jsonb,
  scrape jsonb,
  created_at timestamptz default now()
);

-- Cria profile automaticamente quando um usuário é criado
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- RLS
alter table profiles enable row level security;
alter table companies enable row level security;
alter table diagnostics enable row level security;

-- profiles: cada um vê o próprio; owner vê todos
create policy "profiles_self_select" on profiles
  for select using (id = auth.uid());

create policy "profiles_owner_all" on profiles
  for all using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'owner')
  );

-- companies: dono da empresa vê a própria; owner vê todas
create policy "companies_self_select" on companies
  for select using (owner_id = auth.uid());

create policy "companies_owner_all" on companies
  for all using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'owner')
  );

-- diagnostics: segue a empresa
create policy "diagnostics_self_select" on diagnostics
  for select using (
    exists (select 1 from companies c where c.id = company_id and c.owner_id = auth.uid())
  );

create policy "diagnostics_owner_all" on diagnostics
  for all using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'owner')
  );

-- ==========================================================
-- APÓS criar os usuários no Authentication, rode:
-- update profiles set role = 'owner' where email = 'luan26ribeiro@gmail.com';
-- (luancontasecundaria22@gmail.com permanece como 'client')
-- ==========================================================
