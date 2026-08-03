-- ═══════════════════════════════════════════════════════════════════════
-- Platform Monitor — agente de confiabilidade/operações da plataforma.
-- Reaproveita agent_performance (erros/latência/tokens já logados), o pipe de
-- notificação (log-bot-event / Telegram) e pg_cron. NÃO entra em agent_roles
-- de propósito (aquilo é agente do cliente) — é um agente de OWNER/ops.
-- Modular: novos serviços/regras entram só inserindo linhas, sem mudar código.
-- ═══════════════════════════════════════════════════════════════════════

-- Registro dos serviços monitorados (extensível).
CREATE TABLE IF NOT EXISTS platform_services (
  key text PRIMARY KEY,
  name text NOT NULL,
  category text NOT NULL,            -- infra | database | ai | integration | edge_function | worker | agent | cron | external_api
  critical boolean NOT NULL DEFAULT false,
  check_type text NOT NULL,          -- http | hermes | agent_errors | ai_cost | manual
  target text,                       -- url, role ou identificador do check
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Série temporal dos resultados de checagem.
CREATE TABLE IF NOT EXISTS platform_health_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_key text NOT NULL,
  status text NOT NULL,              -- ok | degraded | down | unknown
  latency_ms int,
  detail text,
  checked_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_health_checks_service ON platform_health_checks(service_key, checked_at DESC);

-- Incidentes detectados, com diagnóstico e recuperação.
CREATE TABLE IF NOT EXISTS platform_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_key text NOT NULL,
  severity text NOT NULL,            -- info | warning | critical
  title text NOT NULL,
  what_happened text,
  affected text,
  impact text,
  root_cause text,
  suggested_fix text,
  preventive text,
  priority text,                     -- baixa | media | alta | critica
  auto_recoverable boolean NOT NULL DEFAULT false,
  recovery_status text NOT NULL DEFAULT 'none',  -- none | attempting | recovered | failed | manual
  correlated_change text,
  status text NOT NULL DEFAULT 'open',           -- open | resolved
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_incidents_open ON platform_incidents(status, created_at DESC);

-- Config do monitor (singleton id=true) — o "Control Center" do agente.
CREATE TABLE IF NOT EXISTS monitor_config (
  id boolean PRIMARY KEY DEFAULT true,
  enabled boolean NOT NULL DEFAULT true,
  frequency_min int NOT NULL DEFAULT 10,
  auto_recovery boolean NOT NULL DEFAULT false,
  notify_dashboard boolean NOT NULL DEFAULT true,
  notify_telegram boolean NOT NULL DEFAULT true,
  notify_email boolean NOT NULL DEFAULT false,
  admin_telegram_chat_id text,
  incident_retention_days int NOT NULL DEFAULT 90,
  latency_warn_ms int NOT NULL DEFAULT 2500,
  latency_crit_ms int NOT NULL DEFAULT 6000,
  error_rate_warn numeric NOT NULL DEFAULT 0.15,
  error_rate_crit numeric NOT NULL DEFAULT 0.40,
  daily_cost_alert_usd numeric NOT NULL DEFAULT 20,
  last_run_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT monitor_config_singleton CHECK (id = true)
);
INSERT INTO monitor_config (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

-- Seed dos serviços reais desta plataforma (edite/expanda à vontade).
INSERT INTO platform_services (key, name, category, critical, check_type, target) VALUES
  ('supabase_edge',     'Supabase Edge Functions', 'edge_function', true,  'http',         'FN:log-bot-event'),
  ('edge_hermes_proxy', 'Hermes Proxy (edge)',     'edge_function', true,  'http',         'FN:hermes-proxy'),
  ('hermes_vps',        'Hermes (VPS externa)',    'ai',            true,  'hermes',        null),
  ('ai_anthropic',      'Claude / Anthropic API',  'ai',            true,  'http',          'https://api.anthropic.com/v1/models'),
  ('agent_marketing',   'Agente Geral (Growth OS)','agent',         true,  'agent_errors',  'marketing'),
  ('ai_cost',           'Custo de IA (limite)',    'ai',            false, 'ai_cost',       null),
  ('worker_site',       'Site (Cloudflare Worker)','worker',        true,  'http',          'https://getsaleboost.com/'),
  ('telegram',          'Telegram Bot API',        'integration',   false, 'http',          'https://api.telegram.org'),
  ('meta',              'Integração Meta/Instagram','integration',  false, 'manual',        null)
ON CONFLICT (key) DO NOTHING;

-- RLS: só o owner da plataforma lê/edita pelo painel. Edge function usa service role.
ALTER TABLE platform_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_health_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitor_config ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['platform_services','platform_health_checks','platform_incidents','monitor_config'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_owner ON %I', tbl, tbl);
    EXECUTE format($f$CREATE POLICY %I_owner ON %I FOR ALL
      USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.email = (auth.jwt() ->> 'email') AND ur.role = 'owner'))
      WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.email = (auth.jwt() ->> 'email') AND ur.role = 'owner'))$f$, tbl, tbl);
  END LOOP;
END $$;
