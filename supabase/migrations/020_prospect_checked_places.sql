-- Sem isso, a busca ficava re-checando pra sempre os mesmos negócios que já
-- tinham sido REJEITADOS (nota fora da faixa, sem Instagram ativo, parece
-- rede etc.) — porque só guardávamos quem virou lead de verdade. O Google
-- devolve os mesmos resultados pra mesma cidade toda vez, então cliques
-- manuais repetidos gastavam API de novo pra achar zero leads novos.
create table if not exists prospect_checked_places (
  google_place_id text primary key,
  checked_at timestamptz not null default now()
);
alter table prospect_checked_places enable row level security;
create policy "owner_all_prospect_checked_places" on prospect_checked_places for all
  using (exists (select 1 from user_roles ur where ur.email = auth.jwt() ->> 'email' and ur.role = 'owner'))
  with check (exists (select 1 from user_roles ur where ur.email = auth.jwt() ->> 'email' and ur.role = 'owner'));

-- Pedido do dono: puxar sempre 10 por rodada (manual ou automática), não 20.
alter table prospect_settings alter column max_per_night set default 10;
update prospect_settings set max_per_night = 10 where id = true;
