-- Trial de 3 dias — trial_expires_at já existia (sem uso nenhum até agora).
-- Adiciona o que falta pra calcular o estado real e mostrar a experiência
-- sem inventar nada: início, se foi cancelado, se já viu a tela de boas-vindas.
alter table companies add column if not exists trial_started_at timestamptz;
alter table companies add column if not exists trial_cancelled_at timestamptz;
alter table companies add column if not exists trial_intro_seen_at timestamptz;

-- Duas conquistas do trial que não existiam ainda no Business Game (as
-- outras — "primeira oportunidade", "primeira ação" — são derivadas dos
-- sinais reais que já existem, não precisam de evento novo).
insert into progress_gp_rules (event_type, gp, label, category, active) values
  ('trial_started', 10, 'Trial iniciado', 'geral', true),
  ('trial_completed', 50, 'Revisão dos 3 dias concluída', 'geral', true)
on conflict (event_type) do nothing;
