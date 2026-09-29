-- Public buckets for workspace logos and profile photos.
-- Paths: workspace-logos/<workspace_id>/<file>, avatars/<user_id>/<file>.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('workspace-logos', 'workspace-logos', true, 1048576, array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']),
  ('avatars', 'avatars', true, 1048576, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy "admins upload workspace logos" on storage.objects for insert to authenticated
  with check (bucket_id = 'workspace-logos' and public.is_admin(((storage.foldername(name))[1])::uuid));
create policy "admins replace workspace logos" on storage.objects for update to authenticated
  using (bucket_id = 'workspace-logos' and public.is_admin(((storage.foldername(name))[1])::uuid));
create policy "admins delete workspace logos" on storage.objects for delete to authenticated
  using (bucket_id = 'workspace-logos' and public.is_admin(((storage.foldername(name))[1])::uuid));

create policy "people upload their avatar" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "people replace their avatar" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "people delete their avatar" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
