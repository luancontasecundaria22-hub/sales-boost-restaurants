-- Fase 1: o Telegram vira um canal configurável pelo Agents Control Center,
-- em vez de ter prompt e ferramentas fixos no código.
--
-- 1) Config global do agente do Telegram (uma linha só). A função telegram-chat
--    lê isto a cada mensagem — mudar aqui muda o comportamento na hora, sem
--    deploy (mesma filosofia da Camada 2).
create table if not exists telegram_agent_config (
  id boolean primary key default true,
  assigned_agent text not null default 'marketing_ai',
  personality text,
  updated_at timestamptz not null default now(),
  constraint telegram_agent_config_singleton check (id = true)
);

alter table telegram_agent_config enable row level security;
create policy "owner_all_telegram_agent_config" on telegram_agent_config for all
  using (exists (select 1 from user_roles ur where ur.email = auth.jwt() ->> 'email' and ur.role = 'owner'))
  with check (exists (select 1 from user_roles ur where ur.email = auth.jwt() ->> 'email' and ur.role = 'owner'));

insert into telegram_agent_config (id, assigned_agent, personality)
values (true, 'marketing_ai', 'Direto, prestativo e humano. Responde curto, como quem está no WhatsApp — sem enrolação, sem markdown.')
on conflict (id) do nothing;

-- 2) Ferramentas do agente do Telegram no capability_registry (used_by
--    'telegram'). A telegram-chat checa enabled antes de oferecer/rodar cada
--    uma — o owner liga/desliga pela tela, de verdade.
insert into capability_registry (id, name, description, category, edge_function, used_by, requires, requires_approval, hermes_callable, toggleable, status, notes) values
('tg_content', 'Criar posts (rascunho)', 'Cria rascunho de post (ou vários) pela conversa do Telegram — sempre pra aprovação, nunca publica.', 'marketing', 'telegram-chat', array['telegram'], '{}', false, false, true, 'live', 'Ferramenta do agente do Telegram — a função telegram-chat checa este toggle.'),
('tg_overview', 'Resumo do negócio', 'Responde um panorama do negócio (posts, avaliações, oportunidades) com números reais.', 'analytics', 'telegram-chat', array['telegram'], '{}', false, false, true, 'live', 'Ferramenta do agente do Telegram — a função telegram-chat checa este toggle.'),
('tg_posts', 'Consultar posts', 'Lista posts por status pela conversa.', 'marketing', 'telegram-chat', array['telegram'], '{}', false, false, true, 'live', 'Ferramenta do agente do Telegram — a função telegram-chat checa este toggle.'),
('tg_opportunities', 'Consultar oportunidades', 'Lista oportunidades de receita detectadas.', 'analytics', 'telegram-chat', array['telegram'], '{}', false, false, true, 'live', 'Ferramenta do agente do Telegram — a função telegram-chat checa este toggle.'),
('tg_reviews', 'Consultar avaliações', 'Lista avaliações do Google com filtros.', 'reputacao', 'telegram-chat', array['telegram'], '{}', false, false, true, 'live', 'Ferramenta do agente do Telegram — a função telegram-chat checa este toggle.'),
('tg_diagnostic', 'Consultar diagnóstico do site', 'Responde o diagnóstico mais recente do site.', 'analytics', 'telegram-chat', array['telegram'], '{}', false, false, true, 'live', 'Ferramenta do agente do Telegram — a função telegram-chat checa este toggle.'),
('tg_competitors', 'Consultar concorrentes', 'Lista concorrentes mapeados.', 'concorrentes', 'telegram-chat', array['telegram'], '{}', false, false, true, 'live', 'Ferramenta do agente do Telegram — a função telegram-chat checa este toggle.'),
('tg_leads', 'Consultar leads', 'Lista leads do CRM pela conversa.', 'crm', 'telegram-chat', array['telegram'], '{}', false, false, true, 'live', 'Ferramenta do agente do Telegram — a função telegram-chat checa este toggle.')
on conflict (id) do nothing;
