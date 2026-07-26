-- Ticket médio (preço médio de venda) informado pelo dono do negócio —
-- usado pra calcular um valor real de "receita recuperável" nas oportunidades,
-- em vez dos números fixos e inventados que existiam antes.
alter table companies add column if not exists avg_ticket numeric;

-- estimated_value passa a poder ser null quando o dono ainda não configurou o
-- ticket médio — melhor não mostrar valor nenhum do que mostrar um inventado.
alter table opportunities alter column estimated_value drop not null;
