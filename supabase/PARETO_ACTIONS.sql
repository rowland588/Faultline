-- ============================================================================
-- FAULTLINE — ACTIONS FROM THE BOARD. Run ONCE (SQL Editor → Run). Re-runnable.
--
-- A snag can now be raised straight from the Pareto, with no photo pin: the
-- drill says "size changes on the filler are the problem", and the action
-- ("SMED workshop, owner Dave") gets recorded right there — flowing into the
-- same snag list, the same report, the same trend flags. Pin fields become
-- optional; three columns record where the board was pointing.
-- ============================================================================

alter table public.snags alter column asset_id drop not null;
alter table public.snags alter column x_pct    drop not null;
alter table public.snags alter column y_pct    drop not null;

alter table public.snags add column if not exists target_category    text;
alter table public.snags add column if not exists target_subcategory text;
alter table public.snags add column if not exists target_asset       text;

-- ---------- report ----------
select 'snags.' || column_name as item,
       case when is_nullable = 'YES' then 'nullable ✓' else 'STILL NOT NULL — rerun' end as value
from information_schema.columns
where table_schema = 'public' and table_name = 'snags'
  and column_name in ('asset_id','x_pct','y_pct')
union all
select 'snags.' || column_name, 'added ✓'
from information_schema.columns
where table_schema = 'public' and table_name = 'snags'
  and column_name in ('target_category','target_subcategory','target_asset')
order by item;
