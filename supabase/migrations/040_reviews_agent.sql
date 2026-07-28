-- Avaliações do Google viram capacidade do agente principal (Growth OS).
-- 1) Modo automático por empresa: quando ligado, o ciclo do draft-reply além
--    de rascunhar a resposta, publica direto no Google (respeitando a escolha
--    do dono; padrão desligado = rascunha e espera aprovação).
alter table companies add column if not exists auto_reply_reviews boolean not null default false;

-- 2) Registra a capacidade no Control Center (aparece nas ferramentas do
--    Growth OS). Núcleo/leitura — o liga/desliga real do modo automático é o
--    toggle por empresa (auto_reply_reviews), não este.
insert into capability_registry (id, name, description, category, edge_function, used_by, requires, requires_approval, hermes_callable, toggleable, status, notes) values
('mai_reviews', 'Responder avaliações do Google', 'A IA rascunha a resposta de cada avaliação; o dono aprova e publica — ou liga o modo automático (publica sozinho) por empresa.', 'reputacao', 'draft-reply', array['marketing_ai'], array['Google Business Profile (para publicar)'], false, true, false, 'live', 'Fluxo: draft-reply rascunha, reply-google-review publica. Modo automático por empresa em companies.auto_reply_reviews.')
on conflict (id) do nothing;
