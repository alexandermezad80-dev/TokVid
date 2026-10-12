begin;

create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  media_url text not null,
  media_type text not null check (media_type in ('image', 'video')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);

create index if not exists stories_user_id_idx on public.stories(user_id);
create index if not exists stories_expires_at_idx on public.stories(expires_at);

alter table public.stories enable row level security;

grant select on public.stories to authenticated;
grant insert on public.stories to authenticated;
grant delete on public.stories to authenticated;

drop policy if exists "authenticated users can read active stories" on public.stories;
create policy "authenticated users can read active stories"
  on public.stories
  for select
  to authenticated
  using (expires_at > now());

drop policy if exists "users can create their own stories" on public.stories;
create policy "users can create their own stories"
  on public.stories
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "users can delete their own stories" on public.stories;
create policy "users can delete their own stories"
  on public.stories
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

commit;
