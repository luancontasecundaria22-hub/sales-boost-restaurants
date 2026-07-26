-- Integration Catalog — completa o modelo Agentes + Ferramentas + Integrações.
-- capability_registry (migration 024) diz O QUE o sistema sabe fazer, de
-- forma global. Esta tabela lista QUAIS integrações existem na plataforma
-- (também global). O que muda por empresa — "esta empresa conectou
-- Instagram? WhatsApp?" — não vira uma tabela nova: continua computado ao
-- vivo pelo hermes-proxy a partir de dados que já existem (company_integrations,
-- companies.instagram_user_id, companies.telegram_chat_id). Criar uma tabela
-- própria pra isso duplicaria uma verdade que já mora em outro lugar — o
-- mesmo erro que essa auditoria toda está tentando evitar.

create table if not exists integration_catalog (
  id text primary key,
  name text not null,
  category text not null check (category in ('social', 'reputacao', 'comunicacao', 'analytics', 'crm', 'pagamentos')),
  status text not null check (status in ('live', 'planned')),
  connection_check text not null,
  notes text,
  created_at timestamptz not null default now()
);

alter table integration_catalog enable row level security;
create policy "owner_all_integration_catalog" on integration_catalog for all
  using (exists (select 1 from user_roles ur where ur.email = auth.jwt() ->> 'email' and ur.role = 'owner'))
  with check (exists (select 1 from user_roles ur where ur.email = auth.jwt() ->> 'email' and ur.role = 'owner'));

insert into integration_catalog (id, name, category, status, connection_check, notes) values
('instagram', 'Instagram', 'social', 'live', 'companies.instagram_user_id (OAuth Meta Graph API)', 'Conectado via Configurações > Integrações.'),
('google_business_profile', 'Google Business Profile', 'reputacao', 'live', 'company_integrations.type = ''google_business_profile''', 'Permite responder avaliações de verdade.'),
('google_search_console', 'Google Search Console', 'analytics', 'live', 'company_integrations.type = ''google_search_console''', 'Métricas de SEO (cliques, impressões, posição).'),
('telegram', 'Telegram', 'comunicacao', 'live', 'companies.telegram_chat_id', 'Canal de notificações e chat com o agente.'),
('stripe', 'Stripe', 'pagamentos', 'live', 'companies.plan / stripe_customer_id', 'Cobrança da assinatura — não é usado pelos agentes.'),
('whatsapp', 'WhatsApp Cloud API', 'comunicacao', 'planned', '—', 'Não existe implementação ainda (achado da auditoria do Executor).'),
('hubspot', 'HubSpot', 'crm', 'planned', '—', 'Não existe implementação ainda.'),
('meta_ads', 'Meta Ads (anúncios)', 'social', 'planned', '—', 'Não existe implementação ainda.'),
('instagram_dm', 'Instagram Direct (mensagens)', 'comunicacao', 'planned', '—', 'Diferente do Instagram de publicação — API separada, não implementada.')
on conflict (id) do nothing;

-- Ferramentas de infraestrutura (webhooks, OAuth, billing) — completam o
-- catálogo de ferramentas pra registro, mas nenhuma delas é chamável por um
-- agente (used_by vazio, hermes_callable false): são plumbing que o sistema
-- usa sozinho, nunca algo que o Hermes decide invocar.
insert into capability_registry (id, name, description, category, edge_function, used_by, requires, requires_approval, hermes_callable, toggleable, status, notes) values
('oauth_google_business', 'OAuth Google Business Profile', 'Callback que troca o código OAuth por token e salva a conexão.', 'outros', 'gbp-oauth-callback', '{}', array['Google OAuth Client ID/Secret'], false, false, false, 'live', 'Infraestrutura — nunca chamada por um agente.'),
('oauth_google_search_console', 'OAuth Google Search Console', 'Callback OAuth do Search Console.', 'outros', 'gsc-oauth-callback', '{}', array['Google OAuth Client ID/Secret'], false, false, false, 'live', 'Infraestrutura — nunca chamada por um agente.'),
('oauth_instagram', 'OAuth Instagram/Meta', 'Callback que troca o código do Facebook Login por token de longa duração e acha a conta Instagram Business vinculada.', 'outros', 'instagram-oauth-callback', '{}', array['META_APP_ID/META_APP_SECRET'], false, false, false, 'live', 'Infraestrutura — nunca chamada por um agente.'),
('stripe_checkout', 'Criar checkout Stripe', 'Gera sessão de pagamento pra assinatura.', 'outros', 'create-checkout', '{}', array['STRIPE_SECRET_KEY'], false, false, false, 'live', 'Infraestrutura de billing — nunca chamada por um agente.'),
('stripe_webhook', 'Webhook Stripe', 'Recebe eventos de pagamento (assinatura ativada/cancelada) e atualiza o plano da empresa.', 'outros', 'stripe-webhook', '{}', array['STRIPE_SECRET_KEY'], false, false, false, 'live', 'Infraestrutura — chamada pela Stripe, não por um agente.'),
('telegram_webhook', 'Webhook Telegram', 'Recebe mensagens do Telegram e aciona o telegram-chat pra responder.', 'outros', 'telegram-webhook', '{}', array['TELEGRAM_BOT_TOKEN'], false, false, false, 'live', 'Infraestrutura — o cérebro de resposta de verdade é telegram-chat.'),
('telegram_connect', 'Conectar conta ao Telegram', 'Gera/valida o código que vincula o chat_id do Telegram à empresa.', 'outros', 'telegram-connect', '{}', '{}', false, false, false, 'live', 'Infraestrutura — nunca chamada por um agente.'),
('claim_diagnostic', 'Reivindicar diagnóstico gratuito', 'Vincula um diagnóstico feito antes do cadastro à conta criada depois.', 'outros', 'claim-diagnostic', '{}', '{}', false, false, false, 'live', 'Infraestrutura de onboarding — nunca chamada por um agente.'),
('gsc_metrics', 'Ler métricas do Search Console', 'Busca cliques/impressões/posição direto da API do Google.', 'analytics', 'gsc-metrics', '{}', array['Google Search Console OAuth'], false, false, false, 'live', 'Hoje só é chamada pelo frontend (aba Performance), não pelo Hermes ainda — candidata a virar tool no futuro.')
on conflict (id) do nothing;
