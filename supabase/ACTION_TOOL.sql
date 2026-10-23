-- ============================================================================
-- FAULTLINE — THE TOOL AN ACTION PLANS TO USE. Run ONCE. Safe to re-run.
--
-- Rowland, 23 October: "when you start a project we need a system to plan
-- what we are going to do. We should be able to tick the tools we are going
-- to use, to highlight what we are going to use them for." A plan to use a
-- tool is an action (pace_todos — who, what for, by when, done or not), so it
-- is owed, late and done like every other and sits on the project's Actions
-- and its journey (docs/JOURNEY.md, J1). What marks it apart is the tool:
--
--   tool   the catalogue key of the app tool it plans to use
--          ('capacity', 'changeover', 'balance' … src/catalogue/registry);
--          null on every other action
--
-- The pace_todos policies cover every column; nothing else changes.
-- ============================================================================

alter table public.pace_todos add column if not exists tool text;

select column_name, data_type, is_nullable
  from information_schema.columns
 where table_schema = 'public' and table_name = 'pace_todos' and column_name = 'tool';
