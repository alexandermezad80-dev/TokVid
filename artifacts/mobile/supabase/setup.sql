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
  using (auth.uid() = id);

-- 4. Auto-create profile on signup (Seamless Registration)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $
declare
  v_username text;
  v_base text;
  v_avatar text;
  v_full_name text;
begin
  v_full_name := coalesce(
    nullif(new.raw_user_meta_data->>'full_name', ''),
    nullif(new.raw_user_meta_data->>'name', ''),
    nullif(new.raw_user_meta_data->>'display_name', '')
  );

  v_avatar := coalesce(
    nullif(new.raw_user_meta_data->>'avatar_url', ''),
    nullif(new.raw_user_meta_data->>'picture', '')
  );

  v_base := coalesce(
    nullif(new.raw_user_meta_data->>'username', ''),
    nullif(new.raw_user_meta_data->>'preferred_username', '')
  );

  if v_base is null then
    v_base := 'Usuario_TokVid_' || substr(md5(new.id::text || clock_timestamp()::text), 1, 6);
  end if;

  v_username := left(v_base, 50);

  insert into public.profiles (id, username, full_name, avatar_url)
  values (new.id, v_username, v_full_name, v_avatar)
  on conflict (id) do update
    set username = coalesce(public.profiles.username, excluded.username),
        full_name = coalesce(public.profiles.full_name, excluded.full_name),
        avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
        updated_at = now();

  insert into public.profile_private (id, email)
  values (new.id, new.email)
  on conflict (id) do update
    set email = excluded.email,
        updated_at = now();

  update auth.users
  set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
    || jsonb_build_object(
      'onboarding_completed', true,
      'username', v_username,
      'display_name', coalesce(v_full_name, v_username),
      'avatar_url', v_avatar
    )
  where id = new.id;

  return new;
end;
$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

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
    update videos
    set likes_count = likes_count + 1
    where id::text = new.video_id;

    select user_id into video_owner from videos where id::text = new.video_id;
    if video_owner is not null then
      update profiles set likes_count = likes_count + 1 where id = video_owner;
    end if;
  elsif tg_op = 'DELETE' then
    update videos
    set likes_count = greatest(0, likes_count - 1)
    where id::text = old.video_id;

    select user_id into video_owner from videos where id::text = old.video_id;
    if video_owner is not null then
      update profiles set likes_count = greatest(0, likes_count - 1) where id = video_owner;
    end if;
  end if;
  return null;
end;
$$ language plpgsql security definer;

create trigger on_video_like_change
  after insert or delete on video_likes
  for each row execute function update_video_like_counts();
