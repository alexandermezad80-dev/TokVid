create table public.live_rooms (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles(id),
  mode text not null check (mode in ('solo', 'guests')),
  state text not null default 'active' check (state in ('active', 'finished')),
  title text,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  constraint live_rooms_finished_state_check
    check ((state = 'active' and finished_at is null) or (state = 'finished' and finished_at is not null))
);

create table public.live_participants (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.live_rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  role text not null check (role in ('host', 'guest', 'spectator')),
  participation_state text not null check (participation_state in ('spectator','pending_request','pending_invitation','active','voluntary_exit','removed','rejected','finished')),
  window_slot integer,
  camera_authorized boolean not null default false,
  mic_authorized boolean not null default false,
  camera_state text not null default 'off' check (camera_state in ('on', 'off')),
  mic_state text not null default 'off' check (mic_state in ('on', 'off')),
  joined_at timestamptz,
  left_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint live_participants_window_slot_check check (window_slot is null or window_slot between 0 and 11),
  constraint live_participants_state_timestamps_check check (
    (participation_state in ('spectator','pending_request','pending_invitation','active') and left_at is null)
    or
    (participation_state in ('voluntary_exit','removed','rejected','finished') and left_at is not null)
  )
);

create table public.live_invitations (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.live_rooms(id) on delete cascade,
  inviter_id uuid not null references public.profiles(id),
  invitee_id uuid not null references public.profiles(id),
  state text not null default 'pending' check (state in ('pending','accepted','rejected')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint live_invitations_different_users_check check (inviter_id <> invitee_id),
  constraint live_invitations_response_timestamp_check check (
    (state = 'pending' and responded_at is null)
    or
    (state in ('accepted','rejected') and responded_at is not null)
  )
);

create table public.live_join_requests (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.live_rooms(id) on delete cascade,
  requester_id uuid not null references public.profiles(id),
  state text not null default 'pending' check (state in ('pending','accepted','rejected')),
  decided_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  constraint live_join_requests_decision_check check (
    (state = 'pending' and decided_by is null and decided_at is null)
    or
    (state in ('accepted','rejected') and decided_by is not null and decided_at is not null)
  )
);

create table public.live_moderators (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.live_rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  permissions jsonb not null default '{}'::jsonb,
  granted_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table public.live_chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.live_rooms(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  content text not null check (char_length(content) between 1 and 1000),
  moderation_state text not null default 'visible' check (moderation_state in ('visible','hidden','deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.live_pinned_message (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.live_rooms(id) on delete cascade,
  message_id uuid not null references public.live_chat_messages(id) on delete cascade,
  pinned_by uuid not null references public.profiles(id),
  pinned_at timestamptz not null default now(),
  unpinned_at timestamptz
);

create table public.live_quieme (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.live_rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  host_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  constraint live_quieme_host_user_different_check check (user_id <> host_id)
);

create table public.live_gifts (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.live_rooms(id) on delete cascade,
  sender_id uuid not null references public.profiles(id),
  recipient_id uuid not null references public.profiles(id),
  gift_type text not null,
  quantity integer not null check (quantity > 0),
  financial_reference text,
  created_at timestamptz not null default now()
);

create table public.live_shares (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.live_rooms(id) on delete cascade,
  shared_by uuid not null references public.profiles(id),
  reference_type text not null,
  reference_id uuid,
  created_at timestamptz not null default now()
);

create unique index live_rooms_one_active_per_host on public.live_rooms(host_id) where state = 'active';
create unique index live_participants_one_active_membership on public.live_participants(room_id, user_id) where participation_state in ('spectator','pending_request','pending_invitation','active');
create unique index live_participants_one_window_slot on public.live_participants(room_id, window_slot) where participation_state = 'active' and window_slot is not null;
create unique index live_invitations_one_pending on public.live_invitations(room_id, inviter_id, invitee_id) where state = 'pending';
create unique index live_join_requests_one_pending on public.live_join_requests(room_id, requester_id) where state = 'pending';
create unique index live_moderators_one_active on public.live_moderators(room_id, user_id) where revoked_at is null;
create unique index live_pinned_message_one_active on public.live_pinned_message(room_id) where unpinned_at is null;
create unique index live_quieme_one_user_per_room on public.live_quieme(room_id, user_id);

create index live_participants_room_id_idx on public.live_participants(room_id);
create index live_participants_user_id_idx on public.live_participants(user_id);
create index live_invitations_room_id_idx on public.live_invitations(room_id);
create index live_invitations_invitee_id_idx on public.live_invitations(invitee_id);
create index live_join_requests_room_id_idx on public.live_join_requests(room_id);
create index live_moderators_room_id_idx on public.live_moderators(room_id);
create index live_chat_messages_room_created_idx on public.live_chat_messages(room_id, created_at);
create index live_gifts_room_created_idx on public.live_gifts(room_id, created_at);
create index live_shares_room_id_idx on public.live_shares(room_id);

alter table public.live_rooms enable row level security;
alter table public.live_participants enable row level security;
alter table public.live_invitations enable row level security;
alter table public.live_join_requests enable row level security;
alter table public.live_moderators enable row level security;
alter table public.live_chat_messages enable row level security;
alter table public.live_pinned_message enable row level security;
alter table public.live_quieme enable row level security;
alter table public.live_gifts enable row level security;
alter table public.live_shares enable row level security;

create policy "live_rooms_authenticated_read_active" on public.live_rooms for select to authenticated using (state = 'active');
create policy "live_rooms_authenticated_create_own" on public.live_rooms for insert to authenticated with check ((select auth.uid()) = host_id);
create policy "live_participants_authenticated_read_live" on public.live_participants for select to authenticated using (exists (select 1 from public.live_rooms r where r.id = room_id and r.state = 'active'));
create policy "live_invitations_authenticated_read_own" on public.live_invitations for select to authenticated using ((select auth.uid()) = invitee_id or (select auth.uid()) = inviter_id);
create policy "live_join_requests_authenticated_read_own_or_host" on public.live_join_requests for select to authenticated using ((select auth.uid()) = requester_id or exists (select 1 from public.live_rooms r where r.id = room_id and r.host_id = (select auth.uid())));
create policy "live_moderators_authenticated_read_live" on public.live_moderators for select to authenticated using (exists (select 1 from public.live_rooms r where r.id = room_id and r.state = 'active'));
create policy "live_chat_authenticated_read_active" on public.live_chat_messages for select to authenticated using (exists (select 1 from public.live_rooms r where r.id = room_id and r.state = 'active'));
create policy "live_pinned_message_authenticated_read_active" on public.live_pinned_message for select to authenticated using (exists (select 1 from public.live_rooms r where r.id = room_id and r.state = 'active'));
create policy "live_quieme_authenticated_read_active" on public.live_quieme for select to authenticated using (exists (select 1 from public.live_rooms r where r.id = room_id and r.state = 'active'));
create policy "live_gifts_authenticated_read_active" on public.live_gifts for select to authenticated using (exists (select 1 from public.live_rooms r where r.id = room_id and r.state = 'active'));
create policy "live_shares_authenticated_read_active" on public.live_shares for select to authenticated using (exists (select 1 from public.live_rooms r where r.id = room_id and r.state = 'active'));