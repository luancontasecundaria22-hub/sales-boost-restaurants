-- Controle global (dono) de quais relatórios automáticos por Telegram estão
-- ligados — Diário já existia (enzo-daily-report) e Mensal já rodava
-- (monthly-report), Semanal e Anual são novos. Cada empresa ainda pode
-- desligar a categoria dela em Configurações > Notificações
-- (companies.notification_prefs) — este switch aqui é o interruptor geral
-- da plataforma, por cima do interruptor de cada cliente.
create table if not exists report_config (
  id boolean primary key default true check (id),
  daily_enabled boolean not null default true,
  weekly_enabled boolean not null default false,
  monthly_enabled boolean not null default true,
  annual_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);
insert into report_config (id) values (true) on conflict (id) do nothing;

alter table report_config enable row level security;
create policy "owner all report_config" on report_config for all to authenticated using (
  exists (select 1 from user_roles ur where ur.email = auth.jwt() ->> 'email' and ur.role = 'owner')
) with check (
  exists (select 1 from user_roles ur where ur.email = auth.jwt() ->> 'email' and ur.role = 'owner')
);
