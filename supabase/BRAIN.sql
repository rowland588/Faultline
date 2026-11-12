-- BRAIN — the analytical brain's homework, kept (12 November, docs/LUNAR-BRAIN.md B1).
-- Rowland: "Lunar does its homework before the question is asked … store structured findings, relationships, analytical results and
-- provenance … Luna must be able to retrieve this knowledge when answering questions."
-- Each line's findings are one study of tool 'brain' (id brain-<line>), synced and guarded by the studies table's existing policies —
-- no new table, no second data model. This widens the tool check by one value; no row is changed, nothing is dropped but the check
-- itself, re-made at once with every value it had plus 'brain'.
-- Run ONCE. Safe to re-run.
alter table public.studies drop constraint if exists studies_tool_check;
alter table public.studies add constraint studies_tool_check check (tool = any (array[
  'capability','map','time','balance','cycle','changeover','losses','sampling','ergonomics','layout','talk','reliability','chart',
  'analysis','calc','log','ledger','doc','scored','board','run','story','department','source','notebook','brain'
]::text[]));
select conname, pg_get_constraintdef(oid) from pg_constraint where conrelid = 'public.studies'::regclass and conname = 'studies_tool_check';
