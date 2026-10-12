begin;

drop policy if exists "read follows" on public.follows;

commit;
