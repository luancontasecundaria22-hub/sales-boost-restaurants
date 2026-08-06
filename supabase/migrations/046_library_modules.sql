-- Biblioteca por módulo: cada módulo (organico/stories/campanhas) tem seu
-- acervo especializado + um núcleo comum (module='core'). A IA usa core + o
-- módulo que está gerando. O CHECK de kind é removido pra permitir os novos
-- tipos por módulo. Seed do acervo aplicado em produção via MCP (ver histórico).
alter table marketing_ai_knowledge add column if not exists module text not null default 'core';
alter table marketing_ai_knowledge drop constraint if exists marketing_ai_knowledge_kind_check;
create index if not exists idx_mai_knowledge_module on marketing_ai_knowledge(module, kind);
