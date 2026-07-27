-- Toggle do agente principal (Growth OS) no "Menu do cliente" da ficha do
-- owner. Default true: toda empresa já existente continua vendo o Marketing AI
-- no menu — o owner desliga caso a empresa ainda não deva ter o agente
-- principal (ex: cliente em setup, ainda sem Meta conectado).
alter table companies add column if not exists marketing_ai_enabled boolean not null default true;
