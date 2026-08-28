-- ─────────────────────────────────────────────────────────────────────────
-- Business Progress Game — camada de eventos + progresso + gamificação.
--
-- Módulo INDEPENDENTE do Marketing AI, mas que consome os dados reais da
-- plataforma. NÃO cria uma segunda base de clientes: tudo é ligado a
-- companies(id). É uma camada de EVENTOS por cima do que já existe:
--   evento real  →  Growth Points  →  Pins / Levels / Rewards  →  progresso.
--
-- Regras (GP por evento, níveis, pins, rewards) ficam no BANCO (configuráveis),
-- nunca hardcoded no frontend. Idempotência via dedupe_key evita abuso.
-- ─────────────────────────────────────────────────────────────────────────

-- 1. Ledger de eventos de progresso (fonte da verdade, idempotente) ─────────
create table if not exists progress_events (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references companies(id) on delete cascade,
  event_type   text not null,                 -- lead_qualified, content_published, ...
  entity_id    text,                           -- id do lead/post/campanha que gerou
  source       text,                           -- marketing_ai | funil | atendimento | ...
  gp           integer not null default 0,     -- GP creditado (snapshot da regra na hora)
  meta         jsonb not null default '{}'::jsonb,
  dedupe_key   text,                           -- idempotência: mesmo fato = mesma key
  created_at   timestamptz not null default now()
);
create unique index if not exists idx_progress_events_dedupe
  on progress_events(company_id, dedupe_key) where dedupe_key is not null;
create index if not exists idx_progress_events_company on progress_events(company_id, created_at desc);

-- 2. Regras de GP por tipo de evento (configurável) ─────────────────────────
create table if not exists progress_gp_rules (
  event_type text primary key,
  gp         integer not null default 0,
  label      text not null,
  category   text not null default 'geral',    -- vendas | marketing | atendimento | automacao
  active     boolean not null default true
);

-- 3. Níveis (configurável) ──────────────────────────────────────────────────
create table if not exists progress_levels (
  level   integer primary key,
  key     text not null,
  name    text not null,
  icon    text not null,
  min_gp  integer not null,
  max_gp  integer                              -- null = sem teto (último nível)
);

-- 4. Catálogo de Pins / conquistas (configurável) ───────────────────────────
create table if not exists progress_pins (
  key                text primary key,
  name               text not null,
  description        text not null,
  icon               text not null,
  rarity             text not null default 'common', -- common|rare|epic|legendary
  category           text not null default 'geral',
  condition_type     text not null,            -- converted|qualified|leads|revenue|automation|level|streak
  condition_threshold integer not null default 1,
  reward_key         text,                     -- se preenchido, o pin é utilizável (dá esse reward)
  sort               integer not null default 0,
  active             boolean not null default true
);

-- 5. Catálogo de Rewards / boosts (configurável, extensível) ─────────────────
create table if not exists progress_rewards (
  key            text primary key,
  category       text not null,                -- ai_boost | marketing | sales | analytics
  name           text not null,
  description    text not null,
  duration_hours integer,                      -- null = permanente; senão boost temporário
  icon           text not null default '🎁',
  sort           integer not null default 0,
  active         boolean not null default true
);

-- 6. Desbloqueios por empresa (pins + rewards conquistados) ──────────────────
create table if not exists progress_unlocks (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies(id) on delete cascade,
  kind        text not null,                   -- pin | reward
  key         text not null,
  unlocked_at timestamptz not null default now(),
  meta        jsonb not null default '{}'::jsonb,
  unique (company_id, kind, key)
);

-- 7. Ativações de reward/boost (com expiração, sem duplicar ativo) ───────────
create table if not exists progress_reward_activations (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references companies(id) on delete cascade,
  reward_key   text not null,
  activated_at timestamptz not null default now(),
  expires_at   timestamptz,
  source       text,                           -- pin | recovery | admin
  agent        text,                           -- qual agente recebeu o boost
  activated_by uuid                            -- auth.uid()
);
create index if not exists idx_reward_activations_company on progress_reward_activations(company_id, expires_at desc);

-- 8. Estado por empresa (cache + última visita p/ "enquanto você estava fora")
create table if not exists progress_state (
  company_id    uuid primary key references companies(id) on delete cascade,
  last_visit_at timestamptz,
  total_gp      integer not null default 0,
  level         integer not null default 1,
  streak_days   integer not null default 0,
  goal          text,                           -- objetivo do negócio (personalização)
  updated_at    timestamptz not null default now()
);

-- ── Seed: regras de GP ──────────────────────────────────────────────────────
insert into progress_gp_rules (event_type, gp, label, category) values
  ('lead_created',         5,   'Novo lead capturado',            'vendas'),
  ('lead_qualified',       10,  'Lead qualificado',               'vendas'),
  ('lead_converted',       100, 'Conversão',                      'vendas'),
  ('lead_recovered',       30,  'Lead antigo recuperado',         'vendas'),
  ('conversation_handled', 5,   'Conversa atendida',              'atendimento'),
  ('followup_sent',        8,   'Follow-up enviado',              'atendimento'),
  ('content_created',      8,   'Conteúdo criado',                'marketing'),
  ('content_published',    15,  'Conteúdo publicado',             'marketing'),
  ('campaign_created',     20,  'Campanha criada',                'marketing'),
  ('campaign_optimized',   50,  'Campanha otimizada',             'marketing'),
  ('opportunity_found',    12,  'Oportunidade identificada',      'marketing'),
  ('review_replied',       10,  'Avaliação respondida',           'marketing'),
  ('competitor_scanned',   8,   'Concorrente monitorado',         'marketing'),
  ('automation_completed', 20,  'Automação concluída',            'automacao'),
  ('engagement_growth',    25,  'Crescimento de engajamento',     'marketing'),
  ('leads_growth',         25,  'Crescimento de leads',           'vendas'),
  ('goal_completed',       100, 'Meta atingida',                  'geral'),
  ('first_customer',       500, 'Primeiro cliente conquistado',   'vendas')
on conflict (event_type) do nothing;

-- ── Seed: níveis ────────────────────────────────────────────────────────────
insert into progress_levels (level, key, name, icon, min_gp, max_gp) values
  (1, 'starter',        'Starter',        '🌱', 0,     1000),
  (2, 'growing',        'Growing',        '📈', 1000,  5000),
  (3, 'accelerator',    'Accelerator',    '🚀', 5000,  15000),
  (4, 'growth_machine', 'Growth Machine', '🔥', 15000, 50000),
  (5, 'business_master','Business Master','👑', 50000, null)
on conflict (level) do nothing;

-- ── Seed: pins ──────────────────────────────────────────────────────────────
insert into progress_pins (key, name, description, icon, rarity, category, condition_type, condition_threshold, reward_key, sort) values
  ('growth_starter',    'Growth Starter',    'Primeiro lead convertido.',                          '🥉', 'common',    'vendas',     'converted',  1,   null,               10),
  ('seven_day_streak',  '7-Day Streak',      'Negócio com progresso por 7 dias seguidos.',         '🔥', 'rare',      'geral',      'streak',     7,   null,               20),
  ('lead_hunter',       'Lead Hunter',       '100 leads encontrados.',                             '🎯', 'rare',      'vendas',     'leads',      100, null,               30),
  ('revenue_builder',   'Revenue Builder',   'Primeira venda atribuída ao SalesBoost.',            '💰', 'epic',      'vendas',     'revenue',    1,   null,               40),
  ('automation_master', 'Automation Master', '100 ações executadas automaticamente.',              '⚡', 'epic',      'automacao',  'automation', 100, null,               50),
  ('growth_legend',     'Growth Legend',     'Atingiu o nível Business Master.',                   '👑', 'legendary', 'geral',      'level',      5,   null,               60),
  ('ultra_intelligence','Ultra Intelligence','Desbloqueou 24h de inteligência avançada.',          '🔮', 'epic',      'ai_boost',   'qualified',  25,  'ultra_intelligence', 70)
on conflict (key) do nothing;

-- ── Seed: rewards ───────────────────────────────────────────────────────────
insert into progress_rewards (key, category, name, description, duration_hours, icon, sort) values
  ('ultra_intelligence',          'ai_boost',  'Ultra Intelligence',            'Capacidades avançadas do agente por 24h.',          24, '🔮', 10),
  ('advanced_reasoning',          'ai_boost',  'Advanced Reasoning',            'Raciocínio profundo do agente por 24h.',            24, '🧠', 20),
  ('deep_analysis',               'ai_boost',  'Deep Analysis',                 'Análise profunda dos seus dados por 24h.',          24, '🔬', 30),
  ('advanced_competitor_analysis','marketing', 'Advanced Competitor Analysis',  'Análise de concorrentes aprofundada.',              null,'🕵️', 40),
  ('premium_campaign_intelligence','marketing','Premium Campaign Intelligence', 'Inteligência premium de campanhas.',                null,'🎯', 50),
  ('advanced_content_generation', 'marketing', 'Advanced Content Generation',   'Geração de conteúdo avançada.',                     null,'✍️', 60),
  ('advanced_lead_discovery',     'sales',     'Advanced Lead Discovery',       'Descoberta de leads aprofundada.',                  null,'🔎', 70),
  ('lead_enrichment',             'sales',     'Lead Enrichment Boost',         'Enriquecimento de dados dos leads.',                null,'📇', 80),
  ('advanced_qualification',      'sales',     'Advanced Qualification',        'Qualificação avançada de leads.',                   null,'✅', 90),
  ('advanced_reports',            'analytics', 'Advanced Reports',              'Relatórios avançados do negócio.',                  null,'📑', 100),
  ('deep_business_analysis',      'analytics', 'Deep Business Analysis',        'Análise profunda do negócio.',                      null,'📊', 110),
  ('extended_insights',           'analytics', 'Extended Insights',             'Insights estendidos e recomendações.',              null,'💡', 120),
  ('recovery_boost',              'ai_boost',  'Recovery Boost',                'Inteligência avançada por 24h p/ plano de recuperação.', 24, '🛟', 130)
on conflict (key) do nothing;

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table progress_events            enable row level security;
alter table progress_unlocks           enable row level security;
alter table progress_reward_activations enable row level security;
alter table progress_state             enable row level security;
alter table progress_gp_rules          enable row level security;
alter table progress_levels            enable row level security;
alter table progress_pins              enable row level security;
alter table progress_rewards           enable row level security;

-- Catálogo/config: leitura para qualquer autenticado (regras não são segredo).
do $$ begin
  create policy "progress catalog gp readable"     on progress_gp_rules for select to authenticated using (true);
  create policy "progress catalog levels readable" on progress_levels   for select to authenticated using (true);
  create policy "progress catalog pins readable"   on progress_pins     for select to authenticated using (true);
  create policy "progress catalog rewards readable" on progress_rewards for select to authenticated using (true);
exception when duplicate_object then null; end $$;

-- Dados por empresa: só o dono da empresa lê/escreve (edge function usa service role).
do $$ begin
  create policy "progress events own" on progress_events for select to authenticated
    using (company_id in (select id from companies where user_id = auth.uid()));
  create policy "progress unlocks own" on progress_unlocks for select to authenticated
    using (company_id in (select id from companies where user_id = auth.uid()));
  create policy "progress activations own" on progress_reward_activations for all to authenticated
    using (company_id in (select id from companies where user_id = auth.uid()))
    with check (company_id in (select id from companies where user_id = auth.uid()));
  create policy "progress state own" on progress_state for select to authenticated
    using (company_id in (select id from companies where user_id = auth.uid()));
exception when duplicate_object then null; end $$;
