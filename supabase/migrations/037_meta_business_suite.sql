-- Login com o Meta Business Suite (Facebook Login for Business) — dá acesso
-- real às Páginas, contas de Instagram vinculadas e negócios do Business
-- Manager do cliente, pra plataforma usar dados de verdade (não mock).
alter table companies add column if not exists meta_business_user_id text;
alter table companies add column if not exists meta_business_name text;
alter table companies add column if not exists meta_business_access_token text;
alter table companies add column if not exists meta_business_token_expires_at timestamptz;
alter table companies add column if not exists meta_business_connected_at timestamptz;

-- Páginas do Facebook que vieram junto no login — cada uma pode ter uma
-- conta de Instagram Business vinculada (instagram_business_account_id).
create table if not exists company_meta_pages (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  page_id text not null,
  name text,
  access_token text,
  instagram_business_account_id text,
  created_at timestamptz not null default now(),
  unique (company_id, page_id)
);
alter table company_meta_pages enable row level security;
create policy "users see own company_meta_pages" on company_meta_pages for select
  using (company_id in (select id from companies where user_id = auth.uid()));
create policy "owner_all_company_meta_pages" on company_meta_pages for all
  using (exists (select 1 from user_roles ur where ur.email = auth.jwt() ->> 'email' and ur.role = 'owner'))
  with check (exists (select 1 from user_roles ur where ur.email = auth.jwt() ->> 'email' and ur.role = 'owner'));
