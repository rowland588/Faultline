-- STORY.sql — the Story, the client's continuous journey (8 November, docs/STORY.md S2).
--
-- Why: Rowland, 8 November: "the story so far is a continuous journey … I run an update and it pulls it all into a beautiful report."
-- A story is one record a client — its brief, and a chapter each time an update is run, each chapter freezing what was true that
-- day. It is a study record (tool 'story'), the one record every tool's use already is: synced, kept, merged field by field.
--
-- Adds 'story' to studies_tool_check — the same list as lib/study STUDY_TOOLS. Run ONCE. Safe to re-run.

alter table public.studies drop constraint if exists studies_tool_check;
alter table public.studies add constraint studies_tool_check check (tool in (
  'capability', 'map', 'time', 'balance', 'cycle', 'changeover', 'losses', 'sampling', 'ergonomics', 'layout',
  'talk', 'reliability', 'chart', 'analysis',
  'calc', 'log', 'ledger', 'doc', 'scored', 'board', 'run', 'story'));

select pg_get_constraintdef(oid) as studies_tool_check from pg_constraint where conname = 'studies_tool_check';
