-- Calls foundation: private voice/video call records and participant-only visibility.
-- Mutations are intentionally server-side; the mobile client only needs SELECT
-- for Realtime/state observation. Agora credentials never live in this table.

create table if not exists public.calls (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null
    references public.conversations(id) on delete cascade,
  caller_id uuid not null
    references auth.users(id) on delete cascade,
  receiver_id uuid not null
    references auth.users(id) on delete cascade,
  type text not null
    check (type in ('voice', 'video')),
  status text not null default 'ringing'
    check (status in ('ringing', 'accepted', 'rejected', 'cancelled', 'missed', 'ended')),
  agora_channel text not null unique
    default ('call_' || replace(gen_random_uuid()::text, '-', '')),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  answered_at timestamptz,
  ended_at timestamptz,
  constraint calls_different_users check (caller_id <> receiver_id)
);

create index if not exists calls_conversation_id_idx
  on public.calls (conversation_id);

create index if not exists calls_caller_id_idx
  on public.calls (caller_id);

create index if not exists calls_receiver_id_idx
  on public.calls (receiver_id);

create index if not exists calls_created_at_idx
  on public.calls (created_at desc);

create unique index if not exists calls_one_active_per_conversation_idx
  on public.calls (conversation_id)
  where status in ('ringing', 'accepted');

alter table public.calls enable row level security;
alter table public.calls force row level security;

drop policy if exists "Participants can read their calls" on public.calls;

create policy "Participants can read their calls"
on public.calls
for select
to authenticated
using (
  (select auth.uid()) = caller_id
  or (select auth.uid()) = receiver_id
);

-- Calls are mutated through the authenticated API/server boundary.
-- Do not grant client INSERT/UPDATE/DELETE privileges here.

revoke all on table public.calls from anon;
revoke all on table public.calls from authenticated;
grant select on table public.calls to authenticated;

-- Realtime is required for incoming-call state changes.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'calls'
  ) then
    alter publication supabase_realtime add table public.calls;
  end if;
end
$$;
