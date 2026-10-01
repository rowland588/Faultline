-- ============================================================================
-- FAULTLINE — 3P ACTIONS, KEPT IN THE APP. Run ONCE. Safe to re-run.
--
-- Rowland: "There will be no Excel that needs to be uploaded ... this is about
-- now fully using the app to be able to do everything that we need to do."
--
-- The 3P board was read off an uploaded tracker workbook. It is drawn from the
-- project's next steps now, so a next step carries the two things a board
-- action needs that it did not have: which of People, Plant or Process it
-- sits under, and the day it is due. Both nullable — every next step written
-- before this is simply not sorted yet, and has no date.
-- ============================================================================

alter table public.pace_todos add column if not exists pillar text;
alter table public.pace_todos add column if not exists due text;

-- CHECK: expect two rows, both present ✓
select 'pace_todos.' || column_name as item, 'present ✓' as value
from information_schema.columns
where table_schema = 'public' and table_name = 'pace_todos'
  and column_name in ('pillar', 'due')
order by item;
