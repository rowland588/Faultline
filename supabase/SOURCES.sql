-- SOURCES.sql — a file brought into Faultline as a record of its own (10 November, docs/CONVERSATIONAL-DATA.md).
--
-- Why: Rowland, 10 November: "Every uploaded workbook or document must be identifiable and referenceable … a unique file identity, a
-- meaningful user-facing name, its original filename, upload date … its relationship to relevant customers, factories, departments,
-- lines, machines, studies or projects." A file is a study record (tool 'source') — synced, kept and guarded by the studies' own
-- row level security, nothing new. Its cells stay on the device that read them (lib/workbook); the record says what it holds.
--
-- Adds 'source' to studies_tool_check — the same list as lib/study STUDY_TOOLS. Widens a check only; changes no row.
-- Run ONCE. Safe to re-run.

alter table public.studies drop constraint if exists studies_tool_check;
alter table public.studies add constraint studies_tool_check check (tool in (
  'capability', 'map', 'time', 'balance', 'cycle', 'changeover', 'losses', 'sampling', 'ergonomics', 'layout',
  'talk', 'reliability', 'chart', 'analysis',
  'calc', 'log', 'ledger', 'doc', 'scored', 'board', 'run', 'story', 'department', 'source'));

select pg_get_constraintdef(oid) as studies_tool_check from pg_constraint where conname = 'studies_tool_check';
