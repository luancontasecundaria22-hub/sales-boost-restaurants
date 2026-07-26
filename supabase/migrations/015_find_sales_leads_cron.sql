-- Agenda automática da prospecção noturna de clientes pro próprio Sales
-- Boost (find-sales-leads) — roda 1x por noite; a função é auto-limitada por
-- prospect_settings.max_per_night e nunca reprocessa o que já foi achado
-- (upsert por google_place_id), então rodar diariamente é seguro.
-- 06:00 UTC = 03:00 no horário de Brasília.
select cron.schedule(
  'find-sales-leads-nightly',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://miwcxakzyforbahpnpst.supabase.co/functions/v1/find-sales-leads',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body    := json_build_object('cron_secret', (SELECT value FROM _app_config WHERE key = 'cron_secret'))::jsonb
  );
  $$
);
