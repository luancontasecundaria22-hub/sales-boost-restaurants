-- Kit visual estruturado da marca: papéis de cor (2 principais + 2 destaque),
-- tipografia (título/corpo) e regras de composição. O `colors` array plano
-- continua pra compatibilidade (BrandCard); o `kit` guarda a estrutura.
--   kit = {
--     colors: { primary: [hex, hex], accent: [hex, hex], text: hex, bg: hex },
--     typography: { heading: text, body: text },
--     composition: text
--   }
alter table brand_dna add column if not exists kit jsonb;
