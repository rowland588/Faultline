-- ============================================================================
-- FAULTLINE — THE CRITERIA PICKED FOR A PROGRAM. Run ONCE. Safe to re-run.
--
-- Rowland, 28 October: "the program has a set role of criteria. So I choose
-- the criteria ... as I pick these tools, they will be my criteria"
-- (docs/PROGRAM-GOAL.md). The criteria are an explicit list on the program,
-- not every study or test that names it: a test run before the criteria were
-- picked (program 5's net run, failed on outside noise) is left off unless
-- picked, and a program with none picked works as it always has — a passed
-- test proves it.
--
-- One JSON list on the program, each item { kind: 'study' | 'run', id }: a
-- study made for the program in its tool (tool_studies.id), or a run test
-- (the first test of its chain, tests.id). Additive and nullable: every
-- program written before reads as having no criteria picked.
--
-- Who may write it is the rule for the program's other fields: the owner and
-- the team (ACCESS_LEVELS.sql — a client's writes are refused).
--
-- APPLIED 28 October 2026 through the connector as PROGRAM_CRITERIA (history
-- 20261028061642) and read back: criteria jsonb, nullable; 26 programs, none
-- with criteria.
-- ============================================================================

alter table public.programs add column if not exists criteria jsonb;

-- What it did: the column, its type, and how many programs carry criteria.
select
  (select data_type from information_schema.columns
     where table_schema = 'public' and table_name = 'programs' and column_name = 'criteria') as criteria_type,
  (select count(*) from public.programs where criteria is not null) as programs_with_criteria;
