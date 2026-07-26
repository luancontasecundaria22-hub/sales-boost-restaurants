-- Conexão de Telegram do dono (não confundir com companies.telegram_chat_id,
-- que é por cliente) — usa o mesmo singleton de prospect_settings, já
-- protegido por RLS "só dono". Reaproveita o mesmo bot e o mesmo fluxo de
-- código de 8 dígitos que o cliente já usa (telegram-connect), só que
-- gravando aqui em vez de em companies.
alter table prospect_settings
  add column if not exists telegram_chat_id text,
  add column if not exists telegram_connect_code text,
  add column if not exists telegram_connect_code_used boolean not null default true;
