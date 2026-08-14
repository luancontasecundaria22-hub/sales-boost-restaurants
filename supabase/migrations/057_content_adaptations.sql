-- Adaptar Conteúdo: versões derivadas de um post aprovado, sem tocar no
-- original. Reusa a MESMA tabela (marketing_ai_test_content) + o renderer + o
-- fluxo de aprovação — nada de sistema duplicado.
--   source_id: aponta pro post original (árvore de versões).
--   origin: 'adapt' nas versões derivadas.
--   concept: a RECEITA de render (template, fields, brand, background, sticker,
--            size) — permite re-renderizar em qualquer formato SEM nova IA.
alter table marketing_ai_test_content
  add column if not exists source_id uuid references marketing_ai_test_content(id) on delete cascade,
  add column if not exists origin text,
  add column if not exists concept jsonb;
create index if not exists idx_mai_test_source on marketing_ai_test_content(source_id);
