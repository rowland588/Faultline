-- ============================================================================
-- FAULTLINE — ONE ACTION LIST. Run ONCE. Safe to re-run.
--
-- An action raised from a Pareto or a Case used to become a "snag" in the
-- workspace, while the 3P board read the project's next steps — two lists for
-- one thing. It is a next step now, so it carries:
--   case_id  — the Case (the A3) it was raised for, when it was
--   done_on  — the day it was marked done: what lets the control room say the
--              loss before this action closed and the loss after it.
-- Both nullable: every next step written before this has neither.
-- ============================================================================

alter table public.pace_todos add column if not exists case_id text;
alter table public.pace_todos add column if not exists done_on text;

-- CHECK: expect two rows, both present ✓
select 'pace_todos.' || column_name as item, 'present ✓' as value
from information_schema.columns
where table_schema = 'public' and table_name = 'pace_todos'
  and column_name in ('case_id', 'done_on')
order by item;
