-- Adiciona campos de presença digital ao restaurante
alter table restaurants add column if not exists instagram_handle text;
alter table restaurants add column if not exists ifood_url text;
alter table restaurants add column if not exists tripadvisor_url text;
alter table restaurants add column if not exists website text;
alter table restaurants add column if not exists phone text;
