-- WhatsApp Business — fundação: número do cliente (pra futura vinculação de
-- leads) + log bruto do que chega no webhook do Meta. A automação real de
-- resposta ainda não existe (fica pra depois, junto com a decisão de como
-- vincular mensagens recebidas a cada empresa) — por enquanto isso só
-- resolve a validação do Meta e guarda o que chega, sem inventar comportamento.
alter table companies add column if not exists whatsapp_number text;
alter table companies add column if not exists whatsapp_connected_at timestamptz;

create table if not exists whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  phone_number_id text,
  from_number text,
  contact_name text,
  message_type text,
  content text,
  raw jsonb,
  received_at timestamptz not null default now()
);
alter table whatsapp_messages enable row level security;
create policy "owner_all_whatsapp_messages" on whatsapp_messages for all
  using (exists (select 1 from user_roles ur where ur.email = auth.jwt() ->> 'email' and ur.role = 'owner'))
  with check (exists (select 1 from user_roles ur where ur.email = auth.jwt() ->> 'email' and ur.role = 'owner'));
