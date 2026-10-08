-- ============================================================================
-- FAULTLINE — A PART OF THE PLAN SAYS HOW IT STANDS, IN WORDS. Run ONCE. Safe to re-run.
--
-- Rowland, 8 October: "In programs we need to show status of program, not
-- just problem — pass, fail, baseline achieved. At the moment I only have
-- problem to write in; this is the wrong message. Yes I need problem, but
-- also I need status with commentary."
--
-- A part of a stage (public.test_items, kind 'next' — ui/StageParts) is very
-- often a program on Set up's programs stage: "Tesco Express 1.25 kg". Until
-- now it could only be ticked done or carry a problem. It now keeps its
-- STATUS each time it is said, with what was seen — a json ARRAY, newest last
-- (lib/testing PartResult):
--
--   results  [{ is: 'baseline' | 'passed' | 'failed', on: 'YYYY-MM-DD',
--               note?: 'Running 32 ppm at baseline settings, film tracking to tune',
--               at: <ms> }]
--
-- The newest entry is how the part stands; the earlier ones are its story. A
-- list, not one slot: a program reaches its baseline on Monday, fails on
-- Tuesday and passes on Wednesday, and that story is what the client asks.
--
-- Nothing else changes and no row is touched. Who may write it is who may
-- write the part already (ACCESS_LEVELS.sql): the owner and the team; a
-- client reads it.
-- ============================================================================

alter table public.test_items add column if not exists results jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'test_items_results_array') then
    alter table public.test_items add constraint test_items_results_array
      check (results is null or jsonb_typeof(results) = 'array');
  end if;
end $$;

select c.column_name, c.data_type,
       (select pg_get_constraintdef(k.oid) from pg_constraint k where k.conname = 'test_items_results_array') as rule
from information_schema.columns c
where c.table_schema = 'public' and c.table_name = 'test_items' and c.column_name = 'results';
