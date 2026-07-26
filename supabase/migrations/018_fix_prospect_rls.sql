-- As policies de 014_sales_prospects.sql juntavam com auth.users pra achar o
-- e-mail do usuário logado — mas o papel `authenticated` (o que o navegador
-- usa) não tem permissão de leitura em auth.users. Isso fazia toda leitura
-- (SELECT) pelo navegador voltar vazia, silenciosamente, sem erro nenhum —
-- só a escrita pela edge function (que usa a service role, sem RLS) funcionava.
-- Fix: usar auth.jwt() ->> 'email', que lê o e-mail direto do token, sem
-- precisar de permissão nenhuma na tabela auth.users.

drop policy if exists "owner_all_prospect_settings" on prospect_settings;
drop policy if exists "owner_all_sales_prospects" on sales_prospects;
drop policy if exists "owner_all_prospect_activities" on prospect_activities;
drop policy if exists "owner_all_prospect_scan_log" on prospect_scan_log;

create policy "owner_all_prospect_settings" on prospect_settings for all
  using (exists (select 1 from user_roles ur where ur.email = auth.jwt() ->> 'email' and ur.role = 'owner'))
  with check (exists (select 1 from user_roles ur where ur.email = auth.jwt() ->> 'email' and ur.role = 'owner'));

create policy "owner_all_sales_prospects" on sales_prospects for all
  using (exists (select 1 from user_roles ur where ur.email = auth.jwt() ->> 'email' and ur.role = 'owner'))
  with check (exists (select 1 from user_roles ur where ur.email = auth.jwt() ->> 'email' and ur.role = 'owner'));

create policy "owner_all_prospect_activities" on prospect_activities for all
  using (exists (select 1 from user_roles ur where ur.email = auth.jwt() ->> 'email' and ur.role = 'owner'))
  with check (exists (select 1 from user_roles ur where ur.email = auth.jwt() ->> 'email' and ur.role = 'owner'));

create policy "owner_all_prospect_scan_log" on prospect_scan_log for all
  using (exists (select 1 from user_roles ur where ur.email = auth.jwt() ->> 'email' and ur.role = 'owner'))
  with check (exists (select 1 from user_roles ur where ur.email = auth.jwt() ->> 'email' and ur.role = 'owner'));
