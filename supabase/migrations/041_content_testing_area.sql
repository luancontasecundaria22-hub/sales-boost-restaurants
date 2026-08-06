-- Área de Testes (QC) da seção Conteúdo.
-- Posts de teste ficam numa tabela própria, isolados da fila principal
-- (marketing_ai_content) por construção — a automação/marketing-ai nunca lê
-- aqui. Só entram em `posts` (a aba Posts existente) quando o dono aprova,
-- via a edge function content-test. Nada publica sozinho.

create table if not exists marketing_ai_test_content (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  kind text not null check (kind in ('organico', 'stories', 'campanhas')),
  idea text,
  caption text,
  hashtags text,
  cta text,
  format text,
  image_url text,
  reasoning text,
  created_at timestamptz not null default now()
);

create index if not exists idx_mai_test_content_company_kind
  on marketing_ai_test_content(company_id, kind, created_at desc);

alter table marketing_ai_test_content enable row level security;

create policy "owner selects own test content" on marketing_ai_test_content for select
  using (company_id in (select id from companies where user_id = auth.uid()));
create policy "owner inserts own test content" on marketing_ai_test_content for insert
  with check (company_id in (select id from companies where user_id = auth.uid()));
create policy "owner updates own test content" on marketing_ai_test_content for update
  using (company_id in (select id from companies where user_id = auth.uid()));
create policy "owner deletes own test content" on marketing_ai_test_content for delete
  using (company_id in (select id from companies where user_id = auth.uid()));
