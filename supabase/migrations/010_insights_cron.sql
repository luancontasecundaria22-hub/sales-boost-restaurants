-- Agenda automática do relatório por aba (insights_reports) — roda 1x por dia
-- dentro do próprio Supabase, junto com detect-opportunities-daily e
-- generate-posts-weekly. A função generate-tab-insight só reprocessa uma
-- aba se já fazem 7+ dias desde a última vez, então rodar todo dia é seguro.
select cron.schedule(
  'generate-tab-insight-daily',
  '20 12 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://miwcxakzyforbahpnpst.supabase.co/functions/v1/generate-tab-insight',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body    := json_build_object('cron_secret', (SELECT value FROM _app_config WHERE key = 'cron_secret'))::jsonb
  );
  $$
);
