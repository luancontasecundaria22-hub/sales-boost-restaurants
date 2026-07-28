-- Sincroniza os avisos do cliente (Configurações → Notificações) com o
-- controle global do owner (Telegram & Relatórios). Pra isso, o cliente
-- precisa poder LER o report_config (só flags de on/off da plataforma, nada
-- sensível). Escrita continua sendo só do owner (a policy existente).
create policy "authenticated read report_config" on report_config
  for select to authenticated using (true);
