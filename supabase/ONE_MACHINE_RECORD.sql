-- ============================================================================
-- FAULTLINE — ONE RECORD OF A MACHINE. Run ONCE. Safe to re-run.
--
-- Rowland, 26 October: "i like the idea of one record of the machine this
-- makes sense to me"; 27 October: "Do one record per machine"
-- (docs/STAGEGATE-RESEARCH.md §5, slice 1). A machine on a line is one
-- record of commission_assets, whoever named it first — the line or a
-- project. A second record of a machine its line already holds (Install
-- making its own beside the line's, or two devices before they synced) is
-- put away into the one kept (src/lib/machineMerge.ts): deleted_at set, and
-- merged_into naming the kept one, so a merge is never a loss — the row is
-- still here, with everything it knew, and can be read back and undone.
--
-- The app does the merging (each device, on start and after a sync), and
-- only of the line's own records (project_id null): a project's record is
-- its owner's to delete (ACCESS_LEVELS.sql, faultline_keep_agreement), so
-- two records a project holds are left and said, until a project takes
-- machines on (slice 3). The live database held no two records of one
-- machine on one line when this was written (the select below says so), so
-- nothing here moves a row.
--
-- APPLIED 27 October 2026 through the connector as ONE_MACHINE_RECORD
-- (history 20261027055642) and read back: merged_into text, nullable; no
-- line holding two live records of one machine; 12 rows, none touched.
-- ============================================================================

alter table public.commission_assets add column if not exists merged_into text;

-- What it did: the column, and how many lines hold two live records of one
-- machine (by its name as compared — case and spacing never make two).
select
  (select count(*) from information_schema.columns
     where table_schema = 'public' and table_name = 'commission_assets' and column_name = 'merged_into') as merged_into_column,
  (select count(*) from (
     select workspace_id, lower(regexp_replace(btrim(name), '\s+', ' ', 'g')) as k
       from public.commission_assets
      where deleted_at is null and workspace_id is not null
      group by 1, 2 having count(*) > 1) d) as machines_held_twice;
