-- Favourite sessions.
-- Run in the Supabase dashboard → SQL Editor, or let the GitHub integration
-- apply it from supabase/migrations.
--
-- A favourite is a flag on the session row rather than a table of its own: the
-- thing being starred is exactly one past session, and it dies with it.

alter table public.sessions
  add column if not exists is_favorite boolean not null default false;

-- The favourites list is "this user's starred rows, newest first", and it is
-- a small slice of the table — a partial index keeps it cheap.
create index if not exists sessions_user_favorite_idx
  on public.sessions (user_id, created_at desc)
  where is_favorite;

-- No policy changes needed: the existing "Users update own sessions" policy
-- already covers toggling a column on a row you own.
