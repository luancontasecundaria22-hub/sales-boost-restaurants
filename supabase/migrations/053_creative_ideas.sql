-- Ideias de post geradas pelo Creative Agent (cards de ideação). Cada ideia
-- pode virar um post de teste via creative-generate (idea seed). Formatos
-- reusam marketing_ai_knowledge (module='formato', campos em meta) — não
-- precisam de tabela nova.
create table if not exists marketing_ai_ideas (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  title text not null,
  hook text,
  angle text,
  format text,
  module text,
  rationale text,
  status text not null default 'new',   -- new | used | dismissed
  created_at timestamptz not null default now()
);
create index if not exists idx_mai_ideas on marketing_ai_ideas(company_id, status, created_at desc);

alter table marketing_ai_ideas enable row level security;
drop policy if exists "owner all ideas" on marketing_ai_ideas;
create policy "owner all ideas" on marketing_ai_ideas for all to authenticated
  using (company_id in (select id from companies where user_id = auth.uid()))
  with check (company_id in (select id from companies where user_id = auth.uid()));
