-- BOARDS (FC-067 maintenance measures; knowledge/specs/FC-067-maintenance-measures.md).
-- Adds 'board' to studies_tool_check — same list as lib/study STUDY_TOOLS.
alter table public.studies drop constraint if exists studies_tool_check;
alter table public.studies add constraint studies_tool_check check (tool in (
  'capability', 'map', 'time', 'balance', 'cycle', 'changeover', 'losses', 'sampling', 'ergonomics', 'layout',
  'talk', 'reliability', 'chart', 'analysis',
  'calc', 'log', 'ledger', 'doc', 'scored', 'board', 'run'));

select pg_get_constraintdef(oid) as studies_tool_check from pg_constraint where conname = 'studies_tool_check';
