-- WhatsApp Embedded Signup — cada cliente conecta o próprio WhatsApp
-- Business Account (WABA) e número, de verdade (não é só anotação de
-- número). O agente responde usando esse número específico do cliente.
alter table companies add column if not exists whatsapp_business_account_id text;
alter table companies add column if not exists whatsapp_phone_number_id text;
alter table companies add column if not exists whatsapp_access_token text;
alter table companies add column if not exists whatsapp_verified_name text;
alter table companies add column if not exists whatsapp_auto_reply boolean not null default true;

-- Histórico de conversas do WhatsApp, por empresa — molde igual ao
-- marketing_ai_messages (role user/assistant, texto corrido).
create table if not exists whatsapp_conversations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  wa_contact_id text not null,
  contact_name text,
  created_at timestamptz not null default now(),
  unique (company_id, wa_contact_id)
);
create table if not exists whatsapp_conversation_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references whatsapp_conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);
alter table whatsapp_conversations enable row level security;
alter table whatsapp_conversation_messages enable row level security;
create policy "users see own whatsapp_conversations" on whatsapp_conversations for select
  using (company_id in (select id from companies where user_id = auth.uid()));
create policy "owner_all_whatsapp_conversations" on whatsapp_conversations for all
  using (exists (select 1 from user_roles ur where ur.email = auth.jwt() ->> 'email' and ur.role = 'owner'))
  with check (exists (select 1 from user_roles ur where ur.email = auth.jwt() ->> 'email' and ur.role = 'owner'));
create policy "users see own whatsapp_conversation_messages" on whatsapp_conversation_messages for select
  using (conversation_id in (select id from whatsapp_conversations where company_id in (select id from companies where user_id = auth.uid())));
create policy "owner_all_whatsapp_conversation_messages" on whatsapp_conversation_messages for all
  using (exists (select 1 from user_roles ur where ur.email = auth.jwt() ->> 'email' and ur.role = 'owner'))
  with check (exists (select 1 from user_roles ur where ur.email = auth.jwt() ->> 'email' and ur.role = 'owner'));
