// One-time migration script — run with: node scripts/migrate.mjs
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://kvbppgofblldwnkkoscb.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_KEY) {
  console.error("❌  Missing SUPABASE_SERVICE_ROLE_KEY env var");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

const SQL = `
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

alter table public.profiles enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'profiles' and policyname = 'Profiles are viewable by everyone'
  ) then
    create policy "Profiles are viewable by everyone"
      on public.profiles for select using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where tablename = 'profiles' and policyname = 'Users can insert their own profile'
  ) then
    create policy "Users can insert their own profile"
      on public.profiles for insert with check (auth.uid() = id);
  end if;

  if not exists (
    select 1 from pg_policies
    where tablename = 'profiles' and policyname = 'Users can update their own profile'
  ) then
    create policy "Users can update their own profile"
      on public.profiles for update using (auth.uid() = id);
  end if;
end $$;

create or replace function public.handle_new_user()
returns trigger as \$\$
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
\$\$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
`;

async function run() {
  console.log("🔄  Running migration...");

  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
    },
    body: JSON.stringify({ sql: SQL }),
  });

  if (!res.ok) {
    // Try via pg endpoint
    const res2 = await fetch(`${SUPABASE_URL}/pg/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({ query: SQL }),
    });

    if (!res2.ok) {
      console.log("⚠️  Could not run SQL via API automatically.");
      console.log("👉  Please run the SQL in supabase/setup.sql via the Supabase SQL Editor:");
      console.log("    https://supabase.com/dashboard/project/kvbppgofblldwnkkoscb/sql");
      process.exit(0);
    }

    const data2 = await res2.json();
    console.log("✅  Migration applied via pg endpoint:", data2);
    return;
  }

  const data = await res.json();
  console.log("✅  Migration applied:", data);
}

run().catch((e) => {
  console.error("❌  Error:", e.message);
  process.exit(1);
});
