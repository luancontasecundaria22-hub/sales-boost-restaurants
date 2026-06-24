create table if not exists bot_notifications (
  id          uuid default gen_random_uuid() primary key,
  company_id  uuid references companies(id) on delete cascade,
  bot_name    text not null,
  event_type  text not null,
  message     text not null,
  telegram_chat_id bigint,
  created_at  timestamptz default now()
);

alter table bot_notifications enable row level security;

create policy "Users can read own company bot notifications"
  on bot_notifications for select
  using (
    company_id is null
    or company_id in (select id from companies where user_id = auth.uid())
  );
