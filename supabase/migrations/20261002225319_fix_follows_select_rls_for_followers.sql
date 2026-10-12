begin;

drop policy if exists "read follows" on public.follows;
drop policy if exists "read own follows" on public.follows;

create policy "read own follows"
  on public.follows
  for select
  to anon, authenticated
  using (
    auth.uid() = follower_id
    or auth.uid() = following_id
  );

commit;
