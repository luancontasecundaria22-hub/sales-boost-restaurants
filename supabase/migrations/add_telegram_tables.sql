create table if not exists telegram_conversations (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references companies(id) on delete set null,
  bot_type text not null check (bot_type in ('marketing', 'vendas')),
  telegram_chat_id text not null,
  telegram_user_id text,
  status text not null default 'active' check (status in ('active', 'closed', 'archived')),
  context jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (bot_type, telegram_chat_id)
);

create table if not exists telegram_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references telegram_conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_telegram_conversations_customer
  on telegram_conversations(customer_id);
create index if not exists idx_telegram_messages_conversation
  on telegram_messages(conversation_id, created_at desc);
