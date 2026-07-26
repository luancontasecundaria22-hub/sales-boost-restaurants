-- Business DNA — perfil editável do negócio de cada cliente, capturado pelo
-- dono na ficha da empresa. Fonte única pro que a empresa É (missão, voz,
-- público, diferenciais, valores) — módulos futuros podem ler daqui em vez
-- de pedir a mesma coisa de novo.
alter table companies add column if not exists business_dna jsonb not null default '{}';
