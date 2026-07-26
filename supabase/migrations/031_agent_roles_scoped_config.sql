-- Rotinas, Aprovações e Limites deixam de ser um único config global
-- (hermes_config) e passam a valer por agente — o Agents Control Center
-- agora precisa de um agente selecionado antes de qualquer uma dessas
-- configurações fazer sentido/ser salva. Missão, Personalidade,
-- Prioridades, Objetivos Globais, KPIs e Políticas continuam globais no
-- Hermes Control Center (isso é sobre a identidade do Hermes, não sobre
-- execução de um agente específico).
alter table agent_roles add column if not exists routines jsonb not null default '{}';
alter table agent_roles add column if not exists approvals jsonb not null default '{}';
alter table agent_roles add column if not exists max_claude_calls_daily int not null default 200;
alter table agent_roles add column if not exists max_daily_cost_usd numeric not null default 12;
alter table agent_roles add column if not exists max_concurrent_tasks int not null default 10;

-- Backfill: o único agente ativo hoje (Agente Geral / 'marketing') herda os
-- valores que já estavam em hermes_config, pra não mudar comportamento.
update agent_roles ar set
  routines = coalesce(hc.routines, '{}'::jsonb),
  approvals = coalesce(hc.approvals, '{}'::jsonb),
  max_claude_calls_daily = coalesce(hc.max_claude_calls_daily, 200),
  max_daily_cost_usd = coalesce(hc.max_daily_cost_usd, 12),
  max_concurrent_tasks = coalesce(hc.max_concurrent_tasks, 10)
from hermes_config hc
where ar.role = 'marketing' and hc.id = true;
