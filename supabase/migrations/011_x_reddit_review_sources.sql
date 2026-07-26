-- Permite gravar menções coletadas no X (Twitter) e no Reddit na mesma tabela
-- de reviews/opiniões — são buscas por menção ao nome do negócio (apify-sync),
-- não avaliações num perfil próprio como as demais fontes.
alter table reviews drop constraint reviews_source_check;
alter table reviews add constraint reviews_source_check
  check (source = any (array['google', 'ifood', 'tripadvisor', 'instagram', 'instagram_comment', 'facebook', 'reclame_aqui', 'manual', 'x', 'reddit']));
