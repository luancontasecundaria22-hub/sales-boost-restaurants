-- Layouts & Estilos: biblioteca de referências visuais dentro do Knowledge
-- Library do Agente de Conteúdo. Reaproveita marketing_ai_knowledge
-- (module='visual', kind='layout') em vez de criar tabela paralela — cada
-- referência guarda a mídia no Storage (bucket post-images, pasta references/)
-- e os metadados em `meta` (categoria, formato, estilo, cores, composição...).
alter table marketing_ai_knowledge
  add column if not exists image_url text,
  add column if not exists meta jsonb;

-- Políticas de Storage para o dono subir/remover as próprias referências.
-- A mídia vai para post-images/references/<company_id>/... (leitura pública já
-- existe no bucket; aqui liberamos escrita/remoção para usuários autenticados).
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'auth upload references'
  ) then
    create policy "auth upload references" on storage.objects for insert to authenticated
      with check (bucket_id = 'post-images' and (storage.foldername(name))[1] = 'references');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'auth delete references'
  ) then
    create policy "auth delete references" on storage.objects for delete to authenticated
      using (bucket_id = 'post-images' and (storage.foldername(name))[1] = 'references');
  end if;
end $$;
