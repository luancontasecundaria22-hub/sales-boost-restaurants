-- Duas tabelas pequenas pro pedido do dono: (1) esconder Jarvis/menu
-- Agentes do cliente sem precisar de deploy, (2) ativar/desativar papéis de
-- agente (hoje Marketing e Vendas) direto pelo Agents Control Center, em vez
-- de isso ser uma decisão fixa no código.

create table if not exists feature_flags (
  key text primary key,
  label text not null,
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table feature_flags enable row level security;
create policy "authenticated read feature_flags" on feature_flags for select to authenticated using (true);
create policy "owner write feature_flags" on feature_flags for all to authenticated using (
  exists (select 1 from user_roles ur where ur.email = auth.jwt() ->> 'email' and ur.role = 'owner')
) with check (
  exists (select 1 from user_roles ur where ur.email = auth.jwt() ->> 'email' and ur.role = 'owner')
);
insert into feature_flags (key, label, enabled) values
  ('jarvis', 'Jarvis (voz) no menu do cliente', true),
  ('agentes_menu', 'Menu Agentes (Posts/Campanhas) no menu do cliente', true)
on conflict (key) do nothing;

create table if not exists agent_roles (
  role text primary key,
  label text not null,
  emoji text not null default '🤖',
  description text,
  active boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table agent_roles enable row level security;
create policy "owner all agent_roles" on agent_roles for all to authenticated using (
  exists (select 1 from user_roles ur where ur.email = auth.jwt() ->> 'email' and ur.role = 'owner')
) with check (
  exists (select 1 from user_roles ur where ur.email = auth.jwt() ->> 'email' and ur.role = 'owner')
);
insert into agent_roles (role, label, emoji, active, description) values
  ('marketing', 'Agente de Marketing', '📣', true, 'Posts, conteúdo, reputação, concorrência, diagnóstico do site.'),
  ('sales', 'Agente de Vendas', '💼', false, 'Leads, follow-up e conversão. Pausado por padrão — sem fonte real de leads ainda.')
on conflict (role) do nothing;
