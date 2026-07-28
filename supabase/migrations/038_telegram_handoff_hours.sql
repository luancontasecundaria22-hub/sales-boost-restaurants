-- Completa os controles operacionais do agente do Telegram no Control Center:
-- Human Handoff (pausar a IA / atendente humano) e Horário de atendimento
-- (auto-resposta fora do horário). Tudo lido pela telegram-chat a cada
-- mensagem — muda na hora, sem deploy.
alter table telegram_agent_config
  add column if not exists ai_paused boolean not null default false,
  add column if not exists paused_reply text,
  add column if not exists active_hours_enabled boolean not null default false,
  add column if not exists active_start int not null default 8,
  add column if not exists active_end int not null default 20,
  add column if not exists timezone text not null default 'America/Sao_Paulo',
  add column if not exists outside_hours_reply text;

update telegram_agent_config set
  paused_reply = coalesce(paused_reply, 'No momento um atendente humano vai te responder por aqui. É só aguardar um instante 🙂'),
  outside_hours_reply = coalesce(outside_hours_reply, 'Estamos fora do horário de atendimento agora, mas já anotei sua mensagem e retornamos assim que possível!')
where id = true;
