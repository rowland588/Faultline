-- ============================================================================
-- FAULTLINE — LOST OUTPUT (optional). Run ONCE (SQL Editor → Run). Re-runnable.
--
-- Idle labour stays the DEFAULT downtime cost. These two columns power the
-- optional refinement: packs/min at rated speed × £ margin per pack = the
-- contribution the packs that never got made would have earned. Opt-in,
-- always labelled where the £ breaks down; unset changes nothing.
-- ============================================================================

alter table public.workspaces add column if not exists packs_per_min  numeric;
alter table public.workspaces add column if not exists margin_per_pack numeric;

-- ---------- report ----------
select 'workspaces.' || column_name as item, 'added ✓' as value
from information_schema.columns
where table_schema = 'public' and table_name = 'workspaces'
  and column_name in ('packs_per_min', 'margin_per_pack')
order by item;
