-- Instrução extra, em texto livre, que o dono pode escrever pra guiar como a
-- IA pontua e prioriza os leads (ex: "priorize barbearias de bairro nobre",
-- "não considere negócios com menos de 2 anos"). É ANEXADA ao prompt fixo
-- que já existe (não substitui), pra não arriscar quebrar o formato JSON que
-- o código espera de volta.
alter table prospect_settings
  add column if not exists icp_custom_instructions text;
