-- Progresso da varredura pro dono ver uma barra de carregamento real em vez
-- de só "buscando..." — a busca roda no servidor (EdgeRuntime.waitUntil),
-- então continua mesmo se ele fechar a tela; isso só é pra exibição.
alter table prospect_scan_log
  add column if not exists candidates_total int not null default 0,
  add column if not exists candidates_processed int not null default 0;
