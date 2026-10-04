-- ============================================================================
-- FAULTLINE — DELETING A LEVER TREE BOX OR A WIN STAYS WITH THE PROJECT'S
-- OWNER. Run ONCE. Safe to re-run.
--
-- supabase/ACCESS_LEVELS.sql: deleting stays with the owner, and the database
-- is the guarantee — faultline_keep_agreement keeps every deleted_at for
-- anyone but the owner. PROBLEM_AGREEMENT.sql put it on cases and pace_todos.
-- Two more tables whose screens already offer Delete only to the owner were
-- still open to a team member's device:
--
--   tree_nodes  the boxes of a lever tree (src/screens/LeverTree.tsx — Delete
--               is can.remove since the tree learned access levels)
--   pace_wins   a line's wins (src/screens/PaceSuccess.tsx — can.remove)
--
-- The function is unchanged (it keeps deleted_at on every table it is on);
-- this only puts it on these two.
-- ============================================================================

create or replace trigger faultline_keep_agreement before update on public.tree_nodes
  for each row execute function public.faultline_keep_agreement();
create or replace trigger faultline_keep_agreement before update on public.pace_wins
  for each row execute function public.faultline_keep_agreement();

-- ---------------------------------------------------------------- read back
select tgrelid::regclass::text as on_table, tgname
  from pg_trigger where tgname = 'faultline_keep_agreement' and not tgisinternal
  order by 1;
