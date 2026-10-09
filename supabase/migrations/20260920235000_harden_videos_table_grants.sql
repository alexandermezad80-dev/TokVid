begin;

revoke insert, update, delete, truncate, references, trigger
  on public.videos
  from anon;

revoke update, truncate, references, trigger
  on public.videos
  from authenticated;

grant select on public.videos to anon, authenticated;
grant insert, delete on public.videos to authenticated;

commit;