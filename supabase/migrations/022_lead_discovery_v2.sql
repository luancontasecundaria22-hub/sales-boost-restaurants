-- Lead Discovery v2 — busca configurável, validação de ICP separada,
-- score modular explicável e log de auditoria (achados/rejeitados por busca).
-- Tudo pensado pro ICP REAL do Sales Boost (comércio local independente —
-- barbearia, salão, restaurante, varejo, saúde), não um exemplo genérico de
-- consultoria B2B.

-- Palavras-chave de busca por categoria — configurável, sem precisar mexer
-- no código pra adicionar uma nova. Várias por categoria em vez de uma só
-- string genérica (era o motivo de tanto resultado irrelevante antes).
create table if not exists prospect_search_keywords (
  id uuid primary key default gen_random_uuid(),
  business_type text not null,
  keyword text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists prospect_search_keywords_type_idx on prospect_search_keywords (business_type) where active;

insert into prospect_search_keywords (business_type, keyword) values
  ('Barbearia', 'barbearia'),
  ('Barbearia', 'barbeiro'),
  ('Barbearia', 'corte de cabelo masculino'),
  ('Barbearia', 'barber shop'),
  ('Beleza & Estética', 'salão de beleza'),
  ('Beleza & Estética', 'estética facial'),
  ('Beleza & Estética', 'spa dia'),
  ('Beleza & Estética', 'manicure e pedicure'),
  ('Restaurante / Food', 'restaurante'),
  ('Restaurante / Food', 'lanchonete'),
  ('Restaurante / Food', 'bar e petiscaria'),
  ('Restaurante / Food', 'hamburgueria'),
  ('Varejo / E-commerce', 'loja de roupas'),
  ('Varejo / E-commerce', 'loja de calçados'),
  ('Varejo / E-commerce', 'papelaria'),
  ('Varejo / E-commerce', 'loja de presentes'),
  ('Serviços', 'assistência técnica'),
  ('Serviços', 'oficina mecânica'),
  ('Serviços', 'lavanderia'),
  ('Serviços', 'gráfica rápida'),
  ('Saúde & Bem-estar', 'clínica de fisioterapia'),
  ('Saúde & Bem-estar', 'academia'),
  ('Saúde & Bem-estar', 'estúdio de pilates'),
  ('Saúde & Bem-estar', 'consultório odontológico')
on conflict do nothing;

alter table prospect_search_keywords enable row level security;
create policy "owner_all_prospect_search_keywords" on prospect_search_keywords for all
  using (exists (select 1 from user_roles ur where ur.email = auth.jwt() ->> 'email' and ur.role = 'owner'))
  with check (exists (select 1 from user_roles ur where ur.email = auth.jwt() ->> 'email' and ur.role = 'owner'));

-- Log de auditoria — todo candidato examinado, aceito ou rejeitado, com o
-- motivo. É o que alimenta o Modo Debug no painel.
create table if not exists prospect_candidate_log (
  id uuid primary key default gen_random_uuid(),
  scan_log_id uuid references prospect_scan_log(id) on delete cascade,
  google_place_id text not null,
  business_name text,
  search_keyword text,
  business_type text,
  city text,
  status text not null check (status in ('accepted', 'rejected')),
  lead_score int,
  icp_confidence int,
  score_breakdown jsonb,
  rejection_reason text,
  checked_at timestamptz not null default now()
);
create index if not exists prospect_candidate_log_scan_idx on prospect_candidate_log (scan_log_id);

alter table prospect_candidate_log enable row level security;
create policy "owner_all_prospect_candidate_log" on prospect_candidate_log for all
  using (exists (select 1 from user_roles ur where ur.email = auth.jwt() ->> 'email' and ur.role = 'owner'))
  with check (exists (select 1 from user_roles ur where ur.email = auth.jwt() ->> 'email' and ur.role = 'owner'));

-- Um registro por busca (cidade + categoria + palavra-chave) dentro de cada
-- scan — mostra quanto cada busca individual rendeu.
create table if not exists prospect_search_query_log (
  id uuid primary key default gen_random_uuid(),
  scan_log_id uuid references prospect_scan_log(id) on delete cascade,
  city text not null,
  business_type text not null,
  keyword text not null,
  companies_found int not null default 0,
  companies_rejected int not null default 0,
  companies_accepted int not null default 0,
  avg_lead_score numeric,
  search_time_ms int,
  created_at timestamptz not null default now()
);
create index if not exists prospect_search_query_log_scan_idx on prospect_search_query_log (scan_log_id);

alter table prospect_search_query_log enable row level security;
create policy "owner_all_prospect_search_query_log" on prospect_search_query_log for all
  using (exists (select 1 from user_roles ur where ur.email = auth.jwt() ->> 'email' and ur.role = 'owner'))
  with check (exists (select 1 from user_roles ur where ur.email = auth.jwt() ->> 'email' and ur.role = 'owner'));

-- Pesos do score e limite de confiança do ICP — configuráveis, não fixos no
-- código. Dá pra ajustar sem precisar reimplantar a função.
alter table prospect_settings
  add column if not exists scoring_weights jsonb not null default '{
    "rating_in_range": 30,
    "reviews_in_range": 15,
    "instagram_active": 15,
    "has_website": 10,
    "no_online_ordering": 10,
    "has_phone": 10,
    "independent_business": 10,
    "recent_review": 5,
    "likely_chain_penalty": -40
  }'::jsonb,
  add column if not exists icp_confidence_threshold int not null default 60;

-- Explicabilidade guardada junto do lead — pra tela mostrar o checklist de
-- por que ele foi aceito, sem precisar recalcular nada.
alter table sales_prospects
  add column if not exists score_breakdown jsonb,
  add column if not exists icp_confidence int;
