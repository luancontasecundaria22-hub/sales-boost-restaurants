-- Fase 1 da "agência criativa": Testing Pipeline + Content Quality Score + Vault.
-- O post de teste (marketing_ai_test_content) ganha um júri de revisores (scores)
-- e uma nota final ponderada (quality_score). Passou (>=90) → vai pro Vault
-- (status='vault'); reprovou → feedback + regenerar. Só do Vault é que o dono
-- publica de fato (vira post 'aprovado' na aba Posts). Nada publica sozinho.

alter table marketing_ai_test_content
  add column if not exists scores jsonb,
  add column if not exists quality_score int,
  add column if not exists status text not null default 'draft';
  -- status: 'draft' (em teste) | 'vault' (aprovado pelo QC, aguardando publicação)

create index if not exists idx_mai_test_content_status
  on marketing_ai_test_content(company_id, status, quality_score desc);
