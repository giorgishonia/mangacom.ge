# Live Reading ("სხვასთან კითხვა") – Roadmap & Architecture

> Version 0.1 – drafted after discussion on implementing a friend-invited, real-time synchronized reading experience.

---

## 1 • Feature set (final goal)

1. **Friend system**
   - Send / accept / decline friend requests (Supabase tables + API routes).
   - List of current friends inside profile.
   - Notification on request & acceptance.

2. **Live Reading session (room)**
   - Route: `/live/[roomId]` (SSR page + client component).
   - Created only by authenticated users (host).
   - Host selects one or more **friends** to invite.
   - Invites generate notifications: *"Giorgi wants to read **One-Punch Man ch. 17** with you"*.
   - Invitee clicks "Join" → redirected to the room.
   - Room stores: `roomId`, `hostId`, `mangaId`, `chapterId`, `createdAt`, `isActive`, `settings (json)`.

3. **Real-time sync inside room**
   - Page-turn / scroll sync (host → others; optionally co-host).
   - Chat messages.
   - **Emoji reactions** that animate across both screens.
   - Presence counter; join/leave toasts.
   - Host can promote, kick, or mute users.

4. **Post-session summary**
   - "You read 42 pages together" + option to add reaction.
   - Reading progress saved individually.

---

## 2 • Technical stack

| Concern            | Decision                                                                               |
|--------------------|----------------------------------------------------------------------------------------|
| Real-time channel  | **Socket.IO** over a small Node.js service (Docker-ised). Fast binary websocket frames. |
| Persistence        | Supabase Postgres for users, friends, rooms meta, notifications.                       |
| Queue / workers    | Supabase Edge Functions or simple cron for stale-room cleanup.                         |
| Deployment         | Railway / Render for Node server; Vercel continues to host Next.js front-end.          |
| Auth in WS         | Short-lived JWT from Supabase sent in Socket.IO query, verified server-side.           |

Rationale: Supabase Realtime could work, but Socket.IO allows lower latency, custom payloads (emoji particles), and easier role management. We still use Supabase for data & auth.

---

## 3 • Database additions (Supabase SQL)

```sql
-- friends
create table if not exists friends (
  user_id uuid references auth.users on delete cascade,
  friend_id uuid references auth.users on delete cascade,
  status text check (status in ('pending', 'accepted', 'blocked')) not null default 'pending',
  created_at timestamptz default now(),
  primary key (user_id, friend_id)
);

-- live_rooms (metadata only)
create table if not exists live_rooms (
  id uuid primary key,
  host_id uuid references auth.users on delete cascade,
  manga_id text not null,
  chapter_id text not null,
  settings jsonb default '{}',
  created_at timestamptz default now(),
  is_active boolean default true
);

-- live_room_participants (for history / summary)
create table if not exists live_room_participants (
  room_id uuid references live_rooms(id) on delete cascade,
  user_id uuid references auth.users on delete cascade,
  joined_at timestamptz default now(),
  left_at timestamptz,
  primary key (room_id, user_id)
);

-- notifications (simplified)
create table if not exists notifications (
  id bigserial primary key,
  recipient_id uuid references auth.users on delete cascade,
  payload jsonb not null,
  is_read boolean default false,
  created_at timestamptz default now()
);
```

---

## 4 • Socket.IO event contract

| Event                | From → To             | Payload                                   |
|----------------------|-----------------------|-------------------------------------------|
| `join`               | client → server       | `{ roomId, token }`                       |
| `page`               | host → room           | `{ pageIndex }`                           |
| `chat`               | any  → room           | `{ id, text, user }`                      |
| `reaction`           | any  → room           | `{ emoji }`                               |
| `kick`/`mute`        | host → server         | `{ targetId }`                            |
| `room_ended`         | server → room         | `{ reason }`                              |
| `summary`            | server → each client  | `{ pagesRead }`                           |

---

## 5 • Milestone plan

1. **Phase 0 – groundwork**
   - [ ] Create DB tables above (migration SQL).
   - [ ] Build minimal Socket.IO Node server with JWT auth check.

2. **Phase 1 – friend system**
   - [ ] API routes: `POST /friends/request`, `POST /friends/respond`.
   - [ ] UI: friend search, requests list, accept/decline.
   - [ ] Notifications panel (reuse existing notifications lib).

3. **Phase 2 – live room MVP**
   - [ ] Route `/live/[roomId]` (Next.js page).
   - [ ] Host side: clicking new **სხვასთან კითხვა** button → modal to pick one friend (multi-select later) → calls API to `create_room` (returns roomId) → sends Socket invite notification.
   - [ ] Joiner: clicks notification → navigates to `/live/[roomId]`.
   - [ ] Reader + chat functional via Socket.IO (we migrate current `SyncReadingRoom` internals).

4. **Phase 3 – reactions & moderation**
   - [ ] Emoji particle animation (Framer Motion). Broadcast `reaction` events.
   - [ ] Kick/mute UI for host.

5. **Phase 4 – polish & summary**
   - [ ] Presence counter, join/leave toasts.
   - [ ] Post-session summary view and DB write-back.
   - [ ] Copy-link & share API.

---

## 6 • Open questions / decisions pending

1. **Scaling Socket.IO** – single instance may suffice early; can later adopt Redis adapter.
2. **Max participants** – enforce limit?
3. **Recording** – do we log chat for later viewing?
4. **Mobile layout tweaks** – ensure reader + chat fit nicely.

---

*After this document is approved, we'll start with Phase 0 migrations & server bootstrapping.* 