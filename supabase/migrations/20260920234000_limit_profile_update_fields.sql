begin;

drop policy if exists "Users can update own profile" on public.profiles;

create policy "Users can update own profile"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

revoke update on public.profiles from anon;
revoke update on public.profiles from authenticated;

grant update (username, full_name, avatar_url, bio)
  on public.profiles
  to authenticated;

commit;