-- Coloca o Marketing AI na lista de "Agentes Ativos" do Agents Control
-- Center (/owner/agentes), do mesmo jeito que o Agente Geral já está.
-- Diferente do Agente Geral, ele não usa Rotinas/Limites/Aprovações/
-- Capacidades daquela tela (é um agente independente, configurado por
-- empresa em /owner/company/:id) — a linha existe só pra aparecer no
-- seletor de "Agentes Ativos" e ligar/desligar globalmente.
insert into agent_roles (role, label, emoji, description, active, routines, approvals, max_claude_calls_daily, max_daily_cost_usd, max_concurrent_tasks)
values ('marketing_ai', 'Agente de Marketing', '✨', 'Tracking, conteúdo, concorrentes e estratégia do Instagram (Marketing AI) — configurado por empresa, não globalmente. Selecione uma empresa abaixo pra editar.', true, '{}'::jsonb, '{}'::jsonb, 200, 12, 10)
on conflict (role) do nothing;

-- Achado ao aplicar o passo acima: 'marketing' (Agente Geral) estava com
-- active=false no banco. hermes-proxy's getActiveAgentRoles() só cai pro
-- fallback ['marketing'] quando NENHUM papel está ativo — com 'marketing_ai'
-- ativo, o fallback nunca entrava, e o Agente Geral ficava fora do conjunto
-- ativo de verdade (bloqueando chat, voz/Jarvis, Telegram e o ciclo cron
-- pra TODAS as empresas). Reativa aqui pra não deixar essa regressão presa
-- só numa correção manual via SQL editor.
update agent_roles set active = true, updated_at = now() where role = 'marketing' and active = false;
