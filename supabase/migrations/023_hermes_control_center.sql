-- Hermes Control Center — o "cérebro" do Hermes deixa de ser texto fixo no
-- código e vira configuração editável pelo owner, sem precisar de deploy.
-- Mesmo padrão de singleton-row já usado em prospect_settings.
--
-- Nota de segurança: propositalmente NÃO existe toggle "pode publicar
-- sozinho" nem "pode responder avaliação sozinho" — isso contradiria a
-- promessa central do produto (human-in-the-loop, ver CLAUDE.md) pra toda a
-- base de clientes de uma vez. As 4 aprovações abaixo são as que fazem
-- sentido ficar configuráveis sem violar esse princípio.

create table if not exists hermes_config (
  id boolean primary key default true check (id),

  mission text not null default 'Ser o CEO responsável pelo crescimento dos clientes.',

  personality text not null default 'ceo'
    check (personality in ('ceo', 'consultor', 'executivo', 'especialista', 'analista', 'criativo')),

  -- 0-100, o quanto o Hermes deve priorizar cada frente ao decidir onde agir.
  priorities jsonb not null default '{
    "marketing": 90, "leads": 100, "seo": 70,
    "avaliacoes": 80, "financeiro": 30, "retencao": 95
  }'::jsonb,

  -- Liga/desliga rotinas do ciclo autônomo. Nem todas ainda são impostas por
  -- código próprio — ver README_HERMES_ROUTINES no final do arquivo.
  routines jsonb not null default '{
    "daily_review": true, "weekly_review": true, "monthly_planning": true,
    "monitor_competitors": true, "detect_crises": true, "find_opportunities": true,
    "auto_create_tasks": true, "review_agent_work": true, "update_memory": true
  }'::jsonb,

  global_objectives text[] not null default array[
    'Sempre melhorar KPIs.',
    'Sempre procurar novas oportunidades.',
    'Nunca deixar um cliente sem acompanhamento.',
    'Priorizar ações de maior impacto.',
    'Agir proativamente.',
    'Pensar como um CEO.'
  ],

  kpis_monitored jsonb not null default '{
    "instagram": true, "google_reviews": true, "conversao": true, "leads": true,
    "faturamento": false, "seo": true, "trafego": false, "tempo_resposta": false,
    "whatsapp": false, "retencao": true
  }'::jsonb,

  -- Reservado — só passa a ter efeito real quando existir uma fila de
  -- tarefas de verdade no sistema (hoje as ações rodam direto, sem fila).
  max_concurrent_tasks int not null default 10,
  max_active_agents int not null default 8,

  -- max_daily_cost_usd é uma ESTIMATIVA (tokens × custo médio aproximado),
  -- não é a fatura real da Anthropic — o modelo que o Hermes usa de verdade
  -- roda numa VPS externa, fora do nosso controle de billing.
  max_daily_cost_usd numeric not null default 12,
  max_claude_calls_daily int not null default 200,

  approvals jsonb not null default '{
    "can_create_campaigns": true, "can_change_prices": false,
    "can_delete_data": false, "can_send_emails": true
  }'::jsonb,

  -- "Políticas do Hermes" — texto livre, injetado direto no prompt de
  -- qualquer agente. Mesmo mecanismo do icp_custom_instructions do Lead
  -- Discovery, só que valendo pro Hermes inteiro.
  policies text not null default '',

  updated_at timestamptz not null default now()
);

insert into hermes_config (id) values (true) on conflict do nothing;

alter table hermes_config enable row level security;
create policy "owner_all_hermes_config" on hermes_config for all
  using (exists (select 1 from user_roles ur where ur.email = auth.jwt() ->> 'email' and ur.role = 'owner'))
  with check (exists (select 1 from user_roles ur where ur.email = auth.jwt() ->> 'email' and ur.role = 'owner'));

-- README_HERMES_ROUTINES: no Phase 1, hermes-proxy passa a respeitar
-- find_opportunities, detect_crises, review_agent_work e update_memory (são
-- passos que já acontecem dentro do próprio orquestrador). monitor_competitors,
-- weekly_review e monthly_planning dependem de outras edge functions
-- (map-competitors, monitor-competitor-social, generate-posts) que ainda
-- rodam por cron fixo, sem checar essa config — é o próximo passo natural,
-- não implementado nesta rodada pra não editar 5+ funções não revisadas às cegas.
