-- Dá ao Marketing AI uma identidade de agente de verdade (não só cron jobs
-- silenciosos): um nome próprio e um histórico de conversa — igual ao
-- padrão de agent_messages do módulo Agentes, mas 100% independente (tabela
-- própria, não reaproveita agent_messages/hermes_config).
alter table marketing_ai_config add column if not exists agent_name text not null default 'Agente de Marketing';

create table if not exists marketing_ai_messages (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);
create index if not exists marketing_ai_messages_company_idx on marketing_ai_messages (company_id, created_at desc);

alter table marketing_ai_messages enable row level security;
create policy "users see own company marketing_ai_messages" on marketing_ai_messages for select
  using (company_id in (select id from companies where user_id = auth.uid()));
create policy "users insert own company marketing_ai_messages" on marketing_ai_messages for insert
  with check (company_id in (select id from companies where user_id = auth.uid()));
