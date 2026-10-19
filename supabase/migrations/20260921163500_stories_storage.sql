begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'stories',
  'stories',
  true,
  52428800,
  array['image/jpeg','image/png','image/webp','video/mp4','video/quicktime']::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users upload own stories media" on storage.objects;
create policy "Users upload own stories media"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'stories'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Users update own stories media" on storage.objects;
create policy "Users update own stories media"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'stories'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'stories'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Users delete own stories media" on storage.objects;
create policy "Users delete own stories media"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'stories'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

commit;
