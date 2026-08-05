-- hzaura session history.
-- Run in the Supabase dashboard → SQL Editor, or let the GitHub integration
-- apply it from supabase/migrations.
--
-- Replaces the earlier supabase/sessions_table.sql, which had two defects:
--   * hz was `integer`, but the library ships 0.5, 7.83, 136.1 and 221.23 Hz —
--     every decimal tone would have been rejected or silently rounded.
--   * RLS granted select and insert only. The app writes progress on pause and
--     attaches feedback afterwards, so both would have failed with no error
--     visible to the user; history would look permanently empty or frozen.

create table if not exists public.sessions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  created_at       timestamptz not null default now(),

  hz               numeric(9,3) not null,          -- decimals matter: 7.83, 221.23
  band             text not null,                  -- delta | theta | alpha | beta | gamma
  viz              text not null default 'frequency',

  planned_seconds  integer not null default 0,     -- 0 = open-ended session
  elapsed_seconds  integer not null default 0,
  status           text not null default 'in_progress'
                   check (status in ('in_progress', 'completed')),

  before_score     smallint check (before_score between 1 and 5),
  after_score      smallint check (after_score between 1 and 5)
);

-- History is always "this user's rows, newest first".
create index if not exists sessions_user_created_idx
  on public.sessions (user_id, created_at desc);

alter table public.sessions enable row level security;

-- Policies are dropped first so this file can be re-run safely.
drop policy if exists "Users read own sessions"   on public.sessions;
drop policy if exists "Users insert own sessions" on public.sessions;
drop policy if exists "Users update own sessions" on public.sessions;
drop policy if exists "Users delete own sessions" on public.sessions;

create policy "Users read own sessions"
  on public.sessions for select
  using (auth.uid() = user_id);

create policy "Users insert own sessions"
  on public.sessions for insert
  with check (auth.uid() = user_id);

-- The `with check` clause is what stops a row being reassigned to someone
-- else: `using` decides which rows you may touch, `with check` validates the
-- row you leave behind.
create policy "Users update own sessions"
  on public.sessions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users delete own sessions"
  on public.sessions for delete
  using (auth.uid() = user_id);
