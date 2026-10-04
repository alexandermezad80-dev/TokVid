begin;

alter policy "read own follows"
  on public.follows
  using (
    (select auth.uid()) = follower_id
    or (select auth.uid()) = following_id
  );

commit;
