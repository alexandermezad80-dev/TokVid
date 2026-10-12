begin;

create policy "read follows"
  on public.follows
  for select
  to anon, authenticated
  using (true);

commit;
