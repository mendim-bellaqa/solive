-- Run this in your Supabase SQL editor (Dashboard → SQL Editor)

create table if not exists sessions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete cascade,
  created_at      timestamptz default now(),
  hz              integer not null,
  binaural_band   text not null,
  duration_seconds integer not null default 0,
  answers         jsonb,
  before_score    integer,  -- 1-5 self-rating before session
  after_score     integer   -- 1-5 self-rating after session
);

-- Row-level security: users can only see their own sessions
alter table sessions enable row level security;

create policy "Users see own sessions"
  on sessions for select
  using (auth.uid() = user_id);

create policy "Users insert own sessions"
  on sessions for insert
  with check (auth.uid() = user_id);
