-- Run this once in your Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor)

-- 1. Create profiles table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  email text,
  avatar_url text,
  bio text default 'Living life one frame at a time 🎬✨',
  followers_count integer default 0,
  following_count integer default 0,
  likes_count integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Enable Row Level Security
alter table public.profiles enable row level security;

-- 3. Policies
create policy "Profiles are viewable by everyone"
  on public.profiles for select
  using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Profile counters and identity fields are server-owned. Users may edit
-- presentation fields (username, avatar_url, bio) but cannot spoof email,
-- ownership, timestamps, or follower/like counters.
create or replace function public.protect_profile_authoritative_fields()
returns trigger as $$
begin
  if new.id is distinct from old.id
     or new.email is distinct from old.email
     or new.followers_count is distinct from old.followers_count
     or new.following_count is distinct from old.following_count
     or new.likes_count is distinct from old.likes_count
     or new.created_at is distinct from old.created_at then
    raise exception 'profile authoritative fields are immutable';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists protect_profile_authoritative_fields on public.profiles;
create trigger protect_profile_authoritative_fields
  before update on public.profiles
  for each row execute function public.protect_profile_authoritative_fields();

-- 4. Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 5. VIDEO LIKES
CREATE TABLE IF NOT EXISTS video_likes (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, video_id)
);
alter table video_likes enable row level security;
create policy "own select video_likes" on video_likes for select to authenticated using (auth.uid() = user_id);
create policy "own insert video_likes" on video_likes for insert to authenticated with check (auth.uid() = user_id);
create policy "own delete video_likes" on video_likes for delete to authenticated using (auth.uid() = user_id);
create index if not exists video_likes_user_id_idx on video_likes(user_id);
create index if not exists video_likes_video_id_idx on video_likes(video_id);

create or replace function update_video_like_counts()
returns trigger as $$
declare
  video_owner uuid;
begin
  if tg_op = 'INSERT' then
    update videos set likes_count = likes_count + 1 where id::text = new.video_id;
    select user_id into video_owner from videos where id::text = new.video_id;
    if video_owner is not null then update profiles set likes_count = likes_count + 1 where id = video_owner; end if;
  elsif tg_op = 'DELETE' then
    update videos set likes_count = greatest(0, likes_count - 1) where id::text = old.video_id;
    select user_id into video_owner from videos where id::text = old.video_id;
    if video_owner is not null then update profiles set likes_count = greatest(0, likes_count - 1) where id = video_owner; end if;
  end if;
  return null;
end;
$$ language plpgsql security definer;

create trigger on_video_like_change
  after insert or delete on video_likes
  for each row execute function update_video_like_counts();
