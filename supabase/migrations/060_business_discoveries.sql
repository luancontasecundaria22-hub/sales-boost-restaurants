-- ─────────────────────────────────────────────────────────────────────────
-- Business Progress Game — Hidden Business Reveal (Discoveries).
--
-- Uma descoberta NÃO é informação comum escondida pra criar curiosidade: só
-- existe quando a IA detecta algo genuinamente notável nos DADOS REAIS do
-- negócio (post que estourou o benchmark, oportunidade de alto valor, marco de
-- conteúdo, etc). Cada descoberta é rastreável (entity_id, source, before/after
-- em meta) e o XP só é creditado quando o usuário REVELA (abre) — nunca antes,
-- nunca fabricado.
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists progress_discoveries (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references companies(id) on delete cascade,
  kind         text not null,                 -- post_outperform | opportunity_insight | content_milestone | ...
  title        text not null,
  detail       text not null,
  reason       text not null,                 -- por que foi considerado especial (rastreável)
  achievement  text,                          -- conquista associada
  xp           integer not null default 0,    -- creditado só ao revelar
  entity_id    text,                          -- id do post/oportunidade que originou
  source       text,                          -- instagram | opportunities | posts | ...
  meta         jsonb not null default '{}'::jsonb,  -- before/after, ratios, etc.
  status       text not null default 'pending',     -- pending | revealed
  dedupe_key   text,                          -- idempotência: um fato = uma descoberta
  created_at   timestamptz not null default now(),
  revealed_at  timestamptz
);
create unique index if not exists idx_discoveries_dedupe on progress_discoveries(company_id, dedupe_key) where dedupe_key is not null;
create index if not exists idx_discoveries_company on progress_discoveries(company_id, status, created_at desc);

alter table progress_discoveries enable row level security;
do $$ begin
  create policy "discoveries own" on progress_discoveries for select to authenticated
    using (company_id in (select id from companies where user_id = auth.uid()));
exception when duplicate_object then null; end $$;
