-- Camada 2 do Growth OS: registra as ferramentas reais do Agente de Marketing
-- (marketing_ai) no capability_registry, para o painel do owner poder LIGAR e
-- DESLIGAR cada uma de verdade.
--
-- Diferente das linhas já existentes (que mapeiam tools do hermes-proxy do
-- Agente Geral), estas mapeiam AÇÕES da edge function `marketing-ai`. O
-- enforcement mora nessa função: antes de rodar cada ação (no chat e no ciclo
-- automático) ela consulta capability_registry.enabled e pula a ação se
-- estiver desligada. Ou seja: o toggle não é decorativo — desligar aqui
-- realmente impede o Growth OS de executar aquela ferramenta.
--
-- toggleable = true  → o dono pode ligar/desligar pela tela.
-- toggleable = false → núcleo do agente (🔒), sempre ligado (estratégia e chat
--                      são a espinha dorsal — desligar quebraria o agente).

insert into capability_registry (id, name, description, category, edge_function, used_by, requires, requires_approval, hermes_callable, toggleable, status, notes) values
('mai_tracking', 'Análise de tracking', 'Coleta métricas do Instagram (seguidores, curtidas, engajamento) via Apify e gera insights.', 'analytics', 'marketing-ai', array['marketing_ai'], array['APIFY_TOKEN'], false, false, true, 'live', 'Ferramenta do Growth OS — a própria função marketing-ai checa este toggle antes de rodar.'),
('mai_competitors', 'Análise de concorrentes', 'Puxa dados dos concorrentes via Apify e compara com o negócio, gerando insights.', 'concorrentes', 'marketing-ai', array['marketing_ai'], array['APIFY_TOKEN'], false, false, true, 'live', 'Ferramenta do Growth OS — a própria função marketing-ai checa este toggle antes de rodar.'),
('mai_content', 'Geração de conteúdo', 'Escreve posts com IA (e a imagem, se o Replicate estiver configurado) — sempre como rascunho para aprovação.', 'marketing', 'marketing-ai', array['marketing_ai'], '{}', false, false, true, 'live', 'Ferramenta do Growth OS — a própria função marketing-ai checa este toggle antes de rodar.'),
('mai_trends', 'Tendências virais', 'Identifica tendências atuais do segmento pra inspirar conteúdo.', 'marketing', 'marketing-ai', array['marketing_ai'], '{}', false, false, true, 'live', 'Ferramenta do Growth OS — a própria função marketing-ai checa este toggle antes de rodar.'),
('mai_reports', 'Relatórios', 'Gera relatórios (semanal, mensal, campanha, executivo...) citando só dados reais.', 'analytics', 'marketing-ai', array['marketing_ai'], '{}', false, false, true, 'live', 'Ferramenta do Growth OS — a própria função marketing-ai checa este toggle antes de rodar.'),
('mai_experiments', 'Experimentos A/B', 'Propõe, inicia e conclui testes A/B — quem decide o vencedor é sempre o dono.', 'marketing', 'marketing-ai', array['marketing_ai'], '{}', false, false, true, 'live', 'Ferramenta do Growth OS — a própria função marketing-ai checa este toggle antes de rodar.'),
-- Núcleo — sempre ligadas (não desligáveis pela tela).
('mai_strategy', 'Estratégia', 'Decide a próxima ação do agente com base nos dados reais da empresa (via Hermes).', 'outros', 'marketing-ai', array['marketing_ai'], array['HERMES_URL'], false, true, false, 'live', 'Núcleo do Growth OS — sempre ligada. É o cérebro que decide o que o agente faz a seguir.'),
('mai_chat', 'Chat', 'Conversa com o dono respondendo com os dados reais da empresa, sem inventar número.', 'outros', 'marketing-ai', array['marketing_ai'], '{}', false, true, false, 'live', 'Núcleo do Growth OS — sempre ligada.')
on conflict (id) do nothing;
