insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-photos', 'profile-photos', true, 8388608, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- Photos live at {user_id}/{filename}; anyone can view (needed for venue lists/matches), only the owner can write.
-- (The blanket read policy below is tightened in migration 009, which removes it in favor of public-URL access.)
create policy profile_photos_read on storage.objects for select
  using (bucket_id = 'profile-photos');
create policy profile_photos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy profile_photos_update on storage.objects for update to authenticated
  using (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy profile_photos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- Deletes all app data for the calling user (cascades to check-ins, likes, matches, messages, reports,
-- blocks, notifications, push tokens via FK). Does NOT remove the auth identity itself -- that requires
-- the Supabase Admin API (service role) and is triggered by the "delete-account" edge function so the
-- login credential is destroyed in the same flow. No recovery is possible once both steps complete.
create or replace function public.delete_own_account()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.users where id = auth.uid();
$$;
