-- Saved session setups ("templates").
-- Run in the Supabase dashboard → SQL Editor, or let the GitHub integration
-- apply it from supabase/migrations.
--
-- A preset is just the four choices the session builder makes — tone, band,
-- visual and length — so it stays valid no matter how the studio changes.
-- Signed-out users keep the same feature in localStorage; this table is only
-- for people who want their setups on every device.

create table if not exists public.session_presets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now(),

  name        text not null check (char_length(name) between 1 and 60),
  hz          numeric(9,3) not null check (hz >= 1 and hz <= 20000),
  band        text not null check (band in ('delta', 'theta', 'alpha', 'beta', 'gamma')),
  viz         text not null default 'frequency'
              check (viz in ('brain', 'aura', 'frequency')),
  -- Minutes. 9999 is the open-ended session, matching the studio's own sentinel.
  minutes     integer not null default 30 check (minutes between 1 and 9999)
);

create index if not exists session_presets_user_created_idx
  on public.session_presets (user_id, created_at desc);

alter table public.session_presets enable row level security;

drop policy if exists "Users read own presets"   on public.session_presets;
drop policy if exists "Users insert own presets" on public.session_presets;
drop policy if exists "Users update own presets" on public.session_presets;
drop policy if exists "Users delete own presets" on public.session_presets;

create policy "Users read own presets"
  on public.session_presets for select
  using (auth.uid() = user_id);

create policy "Users insert own presets"
  on public.session_presets for insert
  with check (auth.uid() = user_id);

create policy "Users update own presets"
  on public.session_presets for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users delete own presets"
  on public.session_presets for delete
  using (auth.uid() = user_id);
