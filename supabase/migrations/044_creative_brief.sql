-- Fase 2 (2/2): Diretor Criativo. O post de teste passa a guardar o brief
-- estruturado que o Diretor decidiu (objetivo, formato, sistema visual, hook,
-- CTA, oferta) e a personalidade que o executou. Serve de transparência pro
-- dono ("como o conteúdo nasceu") e de contexto pro resto do pipeline.

alter table marketing_ai_test_content
  add column if not exists brief jsonb,
  add column if not exists personality text;
