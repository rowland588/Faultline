-- ============================================================================
-- FAULTLINE — A PROGRAM'S STATUS SECTION, TYPED BY HAND. Run ONCE. Safe to re-run.
--
-- Rowland, 2 November: "the program report and app ui needs a clear program
-- status section this can be manually inputted by the user. Programs status
-- done, doing etc, best speed. Speed production can run at .. any caveats."
--
-- One JSON object on the program: { work, bestSpeed, runAt, caveats, at, by } —
--   work       'notStarted' | 'doing' | 'done' | 'onHold' — where the work on it stands
--   bestSpeed  the best speed it has been run at, a minute, as the person says it
--   runAt      the speed production can run it at, a minute
--   caveats    what to watch: words
-- Additive and nullable: every program written before reads as nothing said.
-- Who may write it is the rule for the program's other fields (owner and team;
-- ACCESS_LEVELS.sql refuses a client's writes). No policy or trigger changes.
-- ============================================================================

alter table public.programs add column if not exists run_status jsonb;

select
  (select data_type from information_schema.columns
     where table_schema = 'public' and table_name = 'programs' and column_name = 'run_status') as run_status_type,
  (select count(*) from public.programs where run_status is not null) as programs_with_status;
