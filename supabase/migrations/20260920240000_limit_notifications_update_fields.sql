begin;

revoke update on public.notifications from anon;
revoke update on public.notifications from authenticated;

grant update (read)
  on public.notifications
  to authenticated;

commit;
