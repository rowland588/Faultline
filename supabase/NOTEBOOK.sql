-- NOTEBOOK.sql — what a client's words mean, kept for Luna (10 November, docs/LUNA-NEXT.md L3).
--
-- Why: the next evolution agreed with Rowland, 10 November — "She remembers what your words mean … downtime means unplanned stops only,
-- Celox is a line, the product master is costs and rates … She proposes an entry, you confirm it … one client's notebook is never seen in
-- another's." A notebook is a study record (tool 'notebook', one a client) — synced, kept and guarded by the studies' own row level
-- security, nothing new.
--
-- Adds 'notebook' to studies_tool_check — the same list as lib/study STUDY_TOOLS. Widens a check only; changes no row.
-- Run ONCE. Safe to re-run.

alter table public.studies drop constraint if exists studies_tool_check;
alter table public.studies add constraint studies_tool_check check (tool in (
  'capability', 'map', 'time', 'balance', 'cycle', 'changeover', 'losses', 'sampling', 'ergonomics', 'layout',
  'talk', 'reliability', 'chart', 'analysis',
  'calc', 'log', 'ledger', 'doc', 'scored', 'board', 'run', 'story', 'department', 'source', 'notebook'));

select pg_get_constraintdef(oid) as studies_tool_check from pg_constraint where conname = 'studies_tool_check';
