-- ============================================================================
-- FAULTLINE — pace_todos.notes AND .outcome.
-- Run ONCE (SQL Editor → Run). Safe to re-run.
--
-- These two columns are ON the live database and in the app's mapper, but no
-- migration in this repository ever created them — they were added by hand at
-- some point. So the repo was not a faithful description of production, and a
-- FRESH deployment would have built a pace_todos without them: every push of a
-- next step would be rejected, the sync cursor would never advance past it, and
-- nothing on screen would say why.
--
-- Found by src/cloud/__tests__/sync-schema.test.ts, which compares what the
-- mapper writes against what the migrations create. Types here are copied from
-- the live column definitions, not guessed:
--
--   notes    text not null default ''
--   outcome  text not null default ''
--
-- NOT NULL with a default is safe on a populated table — existing rows take the
-- default rather than being rejected.
-- ============================================================================

alter table public.pace_todos
  add column if not exists notes text not null default '';

alter table public.pace_todos
  add column if not exists outcome text not null default '';

-- CHECK: expect two rows, both present ✓
select 'pace_todos.' || column_name as item, 'present ✓' as value
from information_schema.columns
where table_schema = 'public' and table_name = 'pace_todos'
  and column_name in ('notes', 'outcome')
order by item;
