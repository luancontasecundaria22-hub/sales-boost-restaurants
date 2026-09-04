-- ─────────────────────────────────────────────────────────────────────────
-- Conector Meta Ads (Marketing API via Facebook Login).
-- Guarda a conta de anúncios conectada + token na própria company (mesmo
-- padrão do Instagram). Sem segunda base de clientes.
-- ─────────────────────────────────────────────────────────────────────────
alter table companies add column if not exists meta_ads_account_id text;
alter table companies add column if not exists meta_ads_account_name text;
alter table companies add column if not exists meta_ads_access_token text;
alter table companies add column if not exists meta_ads_token_expires_at timestamptz;
