-- ============================================================================
-- FAULTLINE — A PROGRAM SIGNED OFF BY THE PEOPLE WHO ACCEPT IT. Run ONCE. Safe to re-run.
--
-- Rowland, 28 October: "the program has a set role of criteria. So I choose
-- the criteria ... it's likely I'm going to pick tools ... If they pass, I
-- then need to be able to sign off. So I will sign off, me and my colleagues
-- together, but just leave it as signed off, passed." (docs/PROGRAM-GOAL.md)
--
-- A program's criteria are the studies and tests already naming it
-- (tool_studies / tests program_id) — no new table. What is new is the
-- sign-off: who signed (one or more names) and the day, kept on the program
-- as one JSON value { by: text[], on: 'YYYY-MM-DD', at: epoch ms }. Additive
-- and nullable: every program written before reads as not signed off, and
-- the app says how an older proved program was proved, as it did.
--
-- Who may write it is the rule for the program's other fields: the owner and
-- the team (ACCESS_LEVELS.sql — a client's writes are refused); it is not an
-- agreed field, so faultline_keep_agreement leaves it alone.
--
-- APPLIED 28 October 2026 through the connector as PROGRAM_SIGNOFF (history
-- 20261028061349) and read back: signed_off jsonb, nullable; 26 programs, none
-- signed off.
-- ============================================================================

alter table public.programs add column if not exists signed_off jsonb;

-- What it did: the column, its type, and how many programs carry a sign-off.
select
  (select data_type from information_schema.columns
     where table_schema = 'public' and table_name = 'programs' and column_name = 'signed_off') as signed_off_type,
  (select count(*) from public.programs where signed_off is not null) as signed_off_programs;
