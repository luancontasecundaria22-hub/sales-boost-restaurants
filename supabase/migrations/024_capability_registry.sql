-- Capability Registry — fonte única da verdade sobre o que o ecossistema
-- sabe fazer de verdade. Vive dentro do Hermes Control Center.
--
-- Importante: esta tabela é METADADO, não é o que decide se algo é chamável.
-- O que decide de verdade é o código do hermes-proxy (o mapa
-- CAPABILITY_TOOL_SCHEMAS) — a tabela só liga/desliga (enabled) uma
-- capacidade que já existe em código. Isso evita o problema de "a tabela diz
-- que existe mas na prática não tem nada por trás" — a mesma alucinação que
-- estávamos tentando evitar, só que morando no banco em vez do prompt.

create table if not exists capability_registry (
  id text primary key,
  name text not null,
  description text not null,
  category text not null check (category in ('marketing', 'reputacao', 'concorrentes', 'crm', 'atendimento', 'comercial', 'analytics', 'outros')),
  edge_function text,
  used_by text[] not null default array['marketing'],
  requires text[] not null default '{}',
  requires_approval boolean not null default false,
  hermes_callable boolean not null default false,
  toggleable boolean not null default false,
  enabled boolean not null default true,
  execution_mode text not null default 'sync' check (execution_mode in ('sync', 'async')),
  status text not null default 'live' check (status in ('live', 'partial', 'planned')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table capability_registry enable row level security;
create policy "owner_all_capability_registry" on capability_registry for all
  using (exists (select 1 from user_roles ur where ur.email = auth.jwt() ->> 'email' and ur.role = 'owner'))
  with check (exists (select 1 from user_roles ur where ur.email = auth.jwt() ->> 'email' and ur.role = 'owner'));

insert into capability_registry (id, name, description, category, edge_function, used_by, requires, requires_approval, hermes_callable, toggleable, status, notes) values
-- Núcleo — já existiam como ferramenta do Hermes antes desta migration. Não
-- desligáveis pela tela (são a base do que o agente faz todo dia).
('create_post', 'Criar rascunho de post', 'Salva conteúdo (já escrito pelo próprio agente) como rascunho.', 'marketing', 'hermes-proxy', array['marketing'], '{}', false, true, false, 'live', 'Núcleo — sempre ligado.'),
('create_multiple_posts', 'Criar vários rascunhos', 'Mesma coisa, em lote — semana de conteúdo.', 'marketing', 'hermes-proxy', array['marketing'], '{}', false, true, false, 'live', 'Núcleo — sempre ligado.'),
('list_posts', 'Listar posts', 'Lê posts por status.', 'marketing', 'hermes-proxy', array['marketing'], '{}', false, true, false, 'live', 'Núcleo — sempre ligado.'),
('list_opportunities', 'Listar oportunidades', 'Lê oportunidades de receita detectadas.', 'analytics', 'hermes-proxy', array['marketing', 'sales'], '{}', false, true, false, 'live', 'Núcleo — sempre ligado.'),
('list_reviews', 'Listar avaliações', 'Lê avaliações do Google.', 'reputacao', 'hermes-proxy', array['marketing', 'sales'], '{}', false, true, false, 'live', 'Núcleo — sempre ligado.'),
('get_latest_diagnostic', 'Ler diagnóstico do site', 'Última análise técnica salva.', 'analytics', 'hermes-proxy', array['marketing'], '{}', false, true, false, 'live', 'Núcleo — sempre ligado.'),
('list_competitors', 'Listar concorrentes', 'Lê concorrentes já mapeados.', 'concorrentes', 'hermes-proxy', array['marketing'], '{}', false, true, false, 'live', 'Núcleo — sempre ligado.'),
('get_tab_insight', 'Ler relatório de uma aba', 'Resumo + sugestões de IA já geradas.', 'analytics', 'hermes-proxy', array['marketing'], '{}', false, true, false, 'live', 'Núcleo — sempre ligado.'),
('save_memory', 'Salvar memória', 'Guarda preferência/fato/regra do agente.', 'outros', 'hermes-proxy', array['marketing', 'sales'], '{}', false, true, false, 'live', 'Núcleo — sempre ligado.'),
('load_memory', 'Carregar memória', 'Lê uma memória salva.', 'outros', 'hermes-proxy', array['marketing', 'sales'], '{}', false, true, false, 'live', 'Núcleo — sempre ligado.'),
('list_memories', 'Listar memórias', 'Lista memórias salvas.', 'outros', 'hermes-proxy', array['marketing', 'sales'], '{}', false, true, false, 'live', 'Núcleo — sempre ligado.'),
('list_leads', 'Listar leads', 'Lê o CRM de leads do cliente.', 'crm', 'hermes-proxy', array['marketing', 'sales'], '{}', false, true, false, 'live', 'Núcleo — sempre ligado.'),
('create_lead', 'Criar lead', 'Insere um lead novo no CRM.', 'crm', 'hermes-proxy', array['sales'], '{}', false, true, false, 'live', 'Núcleo — sempre ligado.'),
('update_lead_stage', 'Mover lead no funil', 'Atualiza a etapa do lead.', 'crm', 'hermes-proxy', array['sales'], '{}', false, true, false, 'live', 'Núcleo — sempre ligado.'),
('draft_followup', 'Rascunhar follow-up', 'Cria rascunho de mensagem pro lead.', 'crm', 'hermes-proxy', array['sales'], '{}', false, true, false, 'live', 'Núcleo — sempre ligado.'),

-- Capacidades que já existiam no ecossistema mas eram invisíveis pro Hermes
-- (achado da auditoria) — agora expostas como ferramenta de verdade, só no
-- chat interativo por enquanto (o ciclo automático ainda não usa).
('generate_content', 'Gerar conteúdo com imagem', 'Escreve post com IA e já gera a imagem (Replicate) — mais completo que criar rascunho manual.', 'marketing', 'generate-posts', array['marketing'], array['REPLICATE_API_KEY (opcional — sem ela, só o texto)'], false, true, true, 'live', 'Exposta ao Hermes nesta atualização — só no chat interativo.'),
('create_campaign', 'Criar campanha de conteúdo', 'Monta um calendário de vários posts organizados em torno de um objetivo.', 'marketing', 'content-intelligence', array['marketing'], '{}', false, true, true, 'live', 'Exposta ao Hermes nesta atualização — só no chat interativo.'),
('find_viral_trends', 'Identificar tendências virais', 'Sugere tendências atuais do segmento pra inspirar conteúdo.', 'marketing', 'content-intelligence', array['marketing'], '{}', false, true, true, 'live', 'Exposta ao Hermes nesta atualização — só no chat interativo.'),
('draft_review_reply', 'Rascunhar resposta a avaliação', 'IA escreve a resposta de uma avaliação; fica esperando aprovação do dono.', 'reputacao', 'draft-reply', array['marketing'], '{}', false, true, true, 'live', 'Exposta ao Hermes nesta atualização — só no chat interativo.'),
('analyze_reviews_now', 'Classificar avaliações pendentes', 'Roda a análise de sentimento agora, sem esperar o ciclo automático.', 'reputacao', 'analyze-reviews', array['marketing'], '{}', false, true, true, 'live', 'Exposta ao Hermes nesta atualização — só no chat interativo.'),
('diagnose_site_now', 'Rodar diagnóstico do site agora', 'PageSpeed + revisão de IA, sem esperar o ciclo automático.', 'analytics', 'site-diagnosis', array['marketing'], '{}', false, true, true, 'live', 'Exposta ao Hermes nesta atualização — só no chat interativo.'),
('find_competitors_now', 'Mapear concorrentes agora', 'Escaneia concorrentes próximos no Google Maps.', 'concorrentes', 'map-competitors', array['marketing'], array['GOOGLE_PLACES_API_KEY'], false, true, true, 'live', 'Exposta ao Hermes nesta atualização — só no chat interativo.'),
('monitor_competitors_social_now', 'Checar redes dos concorrentes agora', 'Puxa Instagram dos concorrentes já mapeados via Apify.', 'concorrentes', 'monitor-competitor-social', array['marketing'], array['APIFY_TOKEN'], false, true, true, 'live', 'Exposta ao Hermes nesta atualização — só no chat interativo.'),
('refresh_tab_insight', 'Atualizar relatório de uma aba', 'Força gerar de novo o resumo de IA de uma aba específica.', 'analytics', 'generate-tab-insight', array['marketing'], '{}', false, true, true, 'live', 'Exposta ao Hermes nesta atualização — só no chat interativo.'),

-- Capacidades reais, mas propositalmente fora do alcance do Hermes.
('reply_google_review', 'Responder avaliação no Google (envio real)', 'Publica a resposta de verdade via Google Business Profile.', 'reputacao', 'reply-google-review', '{}', array['Google Business Profile OAuth'], true, false, false, 'live', 'Propositalmente fora do alcance do Hermes — exige clique de aprovação do dono no dashboard. Hermes só prepara via draft_review_reply.'),
('find_sales_leads', 'Prospectar clientes para o Sales Boost', 'Busca e pontua negócios locais como possíveis clientes da plataforma.', 'comercial', 'find-sales-leads', array['owner'], array['GOOGLE_PLACES_API_KEY', 'APIFY_TOKEN', 'ANTHROPIC_API_KEY'], false, false, false, 'live', 'É prospecção do próprio Sales Boost (uso do owner) — não é capacidade dos agentes de uma empresa cliente.'),

-- Lacunas conhecidas (achado da auditoria) — registradas como "planned" pra
-- o Hermes saber que NÃO pode fazer isso ainda, em vez de assumir que pode.
('publish_instagram', 'Publicar no Instagram (envio real)', 'Postaria direto no Instagram via Graph API.', 'marketing', 'publish-instagram', '{}', array['Instagram Business OAuth'], true, false, false, 'partial', 'Função existe no código mas está órfã — nenhum chamador ativo hoje (achado da auditoria). Não ligar ao Hermes até decidir o fluxo de aprovação.'),
('send_whatsapp', 'Enviar WhatsApp', 'Enviaria mensagem via WhatsApp Cloud API.', 'atendimento', null, '{}', array['WhatsApp Cloud API'], true, false, false, 'planned', 'Não existe implementação nenhuma ainda.'),
('send_email', 'Enviar e-mail', 'Enviaria e-mail via Resend.', 'atendimento', null, '{}', array['RESEND_API_KEY'], true, false, false, 'planned', 'RESEND_API_KEY documentada no projeto mas nenhuma função chama a Resend ainda.'),
('reply_instagram_dm', 'Responder Instagram DM', 'Responderia mensagens diretas do Instagram.', 'atendimento', null, '{}', array['Instagram Messaging API'], true, false, false, 'planned', 'Não existe implementação nenhuma ainda.')
on conflict (id) do nothing;
