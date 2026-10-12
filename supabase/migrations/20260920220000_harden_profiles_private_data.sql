begin;

create table if not exists public.profile_private (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  push_token text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profile_private enable row level security;

drop policy if exists "Users can read their own private profile" on public.profile_private;
create policy "Users can read their own private profile"
  on public.profile_private
  for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "Users can insert their own private profile" on public.profile_private;
create policy "Users can insert their own private profile"
  on public.profile_private
  for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "Users can update their own private profile" on public.profile_private;
create policy "Users can update their own private profile"
  on public.profile_private
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

insert into public.profile_private (id, email, push_token)
select id, email, push_token
from public.profiles
on conflict (id) do update
set email = excluded.email,
    push_token = excluded.push_token,
    updated_at = now();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;

  insert into public.profile_private (id, email)
  values (new.id, new.email)
  on conflict (id) do update
    set email = excluded.email,
        updated_at = now();

  return new;
end;
$$;

alter table public.profiles
  drop column if exists email,
  drop column if exists push_token;

commit;
