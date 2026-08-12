-- Permite o cliente subir as imagens de formato geradas (html-to-image) em
-- post-images/renders/<company_id>/... — leitura pública já existe no bucket.
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='auth upload renders') then
    create policy "auth upload renders" on storage.objects for insert to authenticated
      with check (bucket_id = 'post-images' and (storage.foldername(name))[1] = 'renders');
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='auth delete renders') then
    create policy "auth delete renders" on storage.objects for delete to authenticated
      using (bucket_id = 'post-images' and (storage.foldername(name))[1] = 'renders');
  end if;
end $$;
