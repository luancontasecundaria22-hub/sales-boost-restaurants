-- Agenda automática da busca de menções no X/Reddit — roda 1x por dia dentro
-- do Supabase; a própria função só reprocessa uma empresa se já fazem 7+ dias
-- desde a última checagem, então rodar diariamente é seguro e barato.
select cron.schedule(
  'monitor-web-mentions-daily',
  '40 12 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://miwcxakzyforbahpnpst.supabase.co/functions/v1/monitor-web-mentions',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body    := json_build_object('cron_secret', (SELECT value FROM _app_config WHERE key = 'cron_secret'))::jsonb
  );
  $$
);
