-- Carrossel: cada post pode ter vários slides (texto + imagem própria). A
-- legenda fica limpa (só a legenda), e as instruções de foto viram slides.
alter table marketing_ai_test_content add column if not exists slides jsonb;
