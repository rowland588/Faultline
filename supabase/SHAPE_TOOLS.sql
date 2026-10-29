-- THE TOOLS THAT SHARE A SHAPE — 25 October 2026 (docs/TOOLS-BUILD.md, knowledge/BUILD-SHAPES.md).
-- A calculator, a check log, a ledger, a document, a scored register and a designed run are each one
-- kind of record carrying many tools: the tool a study is is one of these six keys, and WHICH calculator
-- or check log it is lives in the study's own agreed record (agreed.calc.key, agreed.log.key …). So the
-- studies table is widened once here and not once a tool. The app's list is lib/study STUDY_TOOLS and
-- the schema test compares them.
-- Run ONCE. Safe to re-run: the check is replaced with the same tools and the six more.
alter table public.studies drop constraint if exists studies_tool_check;
alter table public.studies add constraint studies_tool_check check (tool in (
  'capability', 'map', 'time', 'balance', 'cycle', 'changeover', 'losses', 'sampling', 'ergonomics', 'layout',
  'talk', 'reliability', 'chart', 'analysis',
  'calc', 'log', 'ledger', 'doc', 'scored', 'board', 'run'));

select pg_get_constraintdef(oid) as studies_tool_check from pg_constraint where conname = 'studies_tool_check';
