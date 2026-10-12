begin;

alter table public.follows
  add constraint follows_follower_id_fkey
  foreign key (follower_id)
  references auth.users(id)
  on delete cascade;

alter table public.follows
  add constraint follows_following_id_fkey
  foreign key (following_id)
  references auth.users(id)
  on delete cascade;

commit;
