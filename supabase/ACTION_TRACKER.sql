-- ============================================================================
-- FAULTLINE — TRACKER TEETH. Run ONCE (SQL Editor → Run). Re-runnable.
--
-- An action can now carry a promise. `due_at` is the agreed day (local
-- midnight, epoch ms) — the field that lets a Monday review ask "what's
-- overdue, and by how much?" instead of leaning on a blunt 30-day staleness.
-- `latest_update` (+ its timestamp) is the one-line answer to "what's
-- happening with this?" — usable long before the close note. Nothing is
-- required: an action with no due date behaves exactly as before.
-- ============================================================================

alter table public.snags add column if not exists due_at           bigint;
alter table public.snags add column if not exists latest_update    text;
alter table public.snags add column if not exists latest_update_at bigint;

-- ---------- report ----------
select 'snags.' || column_name as item, 'added ✓' as value
from information_schema.columns
where table_schema = 'public' and table_name = 'snags'
  and column_name in ('due_at', 'latest_update', 'latest_update_at')
order by item;
