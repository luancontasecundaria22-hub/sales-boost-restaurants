-- ICP (perfil de cliente ideal) fixo e editável pelo dono em
-- /owner/prospects, em vez de precisar escolher tipo de negócio toda vez.
-- Os "Must have" viram filtros reais (descarta candidato antes de gastar
-- Apify/IA); os "Nice to have" viram sinais coletados e passados pra IA
-- pontuar, sem travar a busca.
alter table prospect_settings
  add column if not exists min_rating numeric not null default 4.0,
  add column if not exists max_rating numeric not null default 4.8,
  add column if not exists min_reviews int not null default 50,
  add column if not exists max_reviews int not null default 500,
  add column if not exists require_active_instagram boolean not null default true,
  add column if not exists require_phone boolean not null default true,
  add column if not exists exclude_chains boolean not null default true;

-- Tipos de negócio deixam de ser obrigatórios pra configurar — busca ampla
-- em todas as categorias por padrão, filtro fica por conta do ICP (rating,
-- reviews, Instagram ativo, telefone, rede vs. independente).
update prospect_settings
  set business_types = '{Restaurante / Food,Varejo / E-commerce,Serviços,Beleza & Estética,Barbearia,Saúde & Bem-estar}'
  where id = true and business_types = '{}';

-- Sinais "nice to have" coletados durante o scan, guardados pra contexto e
-- pra aparecer no painel (não são filtro obrigatório).
alter table sales_prospects
  add column if not exists has_online_ordering boolean,
  add column if not exists days_since_last_review int,
  add column if not exists price_level int,
  add column if not exists is_likely_chain boolean;
