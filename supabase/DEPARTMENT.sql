-- DEPARTMENT.sql — a department of the factory as a record of its own (10 November, docs/FACTORY-WALK.md).
--
-- Why: Rowland, 10 November: "A department should be a proper record in the Factory Knowledge Model, even if it has no production
-- lines, machines or equipment registered yet. For example, Dispatch should exist as a department in its own right … Do not force
-- the creation of child records." A department is a study record (tool 'department') — the one record every tool's use and the
-- story already are: synced, kept, merged field by field, under the studies' own row level security (owner and team), nothing new.
-- Its client, site and name are the same words the lines carry (workspaces.client_name · site_name · area_name), so a department
-- and the lines in it are found by the same words (lib/areas).
--
-- Adds 'department' to studies_tool_check — the same list as lib/study STUDY_TOOLS. Widens a check only; changes no row.
-- Run ONCE. Safe to re-run.

alter table public.studies drop constraint if exists studies_tool_check;
alter table public.studies add constraint studies_tool_check check (tool in (
  'capability', 'map', 'time', 'balance', 'cycle', 'changeover', 'losses', 'sampling', 'ergonomics', 'layout',
  'talk', 'reliability', 'chart', 'analysis',
  'calc', 'log', 'ledger', 'doc', 'scored', 'board', 'run', 'story', 'department'));

select pg_get_constraintdef(oid) as studies_tool_check from pg_constraint where conname = 'studies_tool_check';
