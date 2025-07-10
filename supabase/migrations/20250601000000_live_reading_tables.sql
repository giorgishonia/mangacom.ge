-- Migration: Live Reading feature tables

-- friends table: store friend relationships and their status
create table if not exists friends (
  user_id uuid references auth.users on delete cascade,
  friend_id uuid references auth.users on delete cascade,
  status text check (status in ('pending', 'accepted', 'blocked')) not null default 'pending',
  created_at timestamptz default now(),
  primary key (user_id, friend_id)
);

-- live_rooms stores minimal metadata for an active or historical session
create table if not exists live_rooms (
  id uuid primary key,
  host_id uuid references auth.users on delete cascade,
  manga_id text not null,
  chapter_id text not null,
  settings jsonb default '{}',
  created_at timestamptz default now(),
  is_active boolean default true
);

-- participant history for rooms
create table if not exists live_room_participants (
  room_id uuid references live_rooms(id) on delete cascade,
  user_id uuid references auth.users on delete cascade,
  joined_at timestamptz default now(),
  left_at timestamptz,
  primary key (room_id, user_id)
);

-- generic notifications table (simple payload-based approach)
create table if not exists notifications (
  id bigserial primary key,
  recipient_id uuid references auth.users on delete cascade,
  payload jsonb not null,
  is_read boolean default false,
  created_at timestamptz default now()
); 