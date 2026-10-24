-- ============================================================================
-- FAULTLINE — WHAT A COUNTERMEASURE ON THE 6M BOARD SHOULD BE WORTH. Run ONCE. Safe to re-run.
--
-- Rowland, 24 October: "all tools made or that will be made will have cost
-- in ... the cost is merely one of the outputs ... don't block anything."
-- knowledge/MONEY.md §4, FC-146: a 6M problem's £ a week is its lost hours
-- by the line's cost model (lib/sixmMoney); a countermeasure's worth is the
-- share of the problem it should remove, said before it is done (the A3's
-- expected effect), × that £.
--
-- One column on the board's actions (pace_todos):
--   expect_pct   numeric — how much of the problem it should remove, 0–100;
--                absent when nobody has said
-- ============================================================================

alter table public.pace_todos add column if not exists expect_pct numeric;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'pace_todos_expect_pct_share') then
    alter table public.pace_todos add constraint pace_todos_expect_pct_share
      check (expect_pct is null or (expect_pct >= 0 and expect_pct <= 100));
  end if;
end $$;

select column_name, data_type,
  (select pg_get_constraintdef(oid) from pg_constraint where conname = 'pace_todos_expect_pct_share') as rule
from information_schema.columns
where table_schema = 'public' and table_name = 'pace_todos' and column_name = 'expect_pct';
