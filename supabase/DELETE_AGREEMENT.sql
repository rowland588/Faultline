-- ============================================================================
-- FAULTLINE — DELETING STAYS WITH THE PROJECT'S OWNER, ON EVERY PROJECT TABLE.
-- Run ONCE. Safe to re-run.
--
-- supabase/ACCESS_LEVELS.sql: on a project, the team does the work, and
-- "what was agreed … and deleting stay with the owner"; the database is the
-- guarantee — faultline_keep_agreement keeps every deleted_at for anyone but
-- the owner. PROBLEM_AGREEMENT.sql and TREE_WINS_AGREEMENT.sql put it on
-- cases, pace_todos, tree_nodes and pace_wins. These are the last eight
-- tables with a project_id and a deleted_at that it was not on:
--
--   readings          a measure's reading — the ✕ on Numbers is can.remove
--   standards         a line standard map — "Delete this map" is can.remove
--   targets           a period's target — cleared only in Measures setup (can.agree)
--   pace_ppm          a line — "Remove line" is can.remove; the rival-line tidy
--                     runs only on the owner's device (loadPaceLines { tidy })
--   project_targets, project_actuals, pace_snapshots, commission_packs
--                     no screen deletes them (only the owner's purge)
--
-- Run only once the app that hides those deletes from the team is live: until
-- then a team member's delete would be kept by the cloud and the row would
-- come back on the next pull — a button that lies. The function is unchanged.
-- ============================================================================

do $t$
declare t text;
begin
  foreach t in array array['readings', 'standards', 'targets', 'pace_ppm', 'project_targets', 'project_actuals', 'pace_snapshots', 'commission_packs'] loop
    if to_regclass('public.' || t) is not null then
      execute format('create or replace trigger faultline_keep_agreement before update on public.%I for each row execute function public.faultline_keep_agreement()', t);
    end if;
  end loop;
end $t$;

-- ---------------------------------------------------------------- read back
select c.table_name,
  exists (select 1 from pg_trigger t where t.tgrelid = ('public.' || c.table_name)::regclass
          and t.tgname = 'faultline_keep_agreement' and not t.tgisinternal) as guarded
from information_schema.columns c
where c.table_schema = 'public' and c.column_name = 'project_id'
  and exists (select 1 from information_schema.columns d where d.table_schema = 'public'
              and d.table_name = c.table_name and d.column_name = 'deleted_at')
order by 2, 1;
