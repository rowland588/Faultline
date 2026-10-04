-- ============================================================================
-- FAULTLINE — A 6M PROBLEM'S CLOSE AND DELETE, AND AN ACTION'S DELETE, STAY
-- WITH THE PROJECT'S OWNER. Run ONCE. Safe to re-run.
--
-- supabase/ACCESS_LEVELS.sql made the database the guarantee of who may do
-- what: a trigger (faultline_keep_agreement) keeps what was agreed, and every
-- deleted_at, for anyone but the project's owner. It was put on the stage-gate
-- tables, materials, programs and projects — but not on the two tables the 6M
-- method writes (supabase/SIXM.sql): cases, the problem at the head of each
-- fishbone, and pace_todos, the actions on the board (its countermeasures).
--
-- The screens already follow the rule (useAccess): only the owner sees
-- "Remove this problem", "It worked — close it", "Reopen" and an action's
-- "Delete". Without this a team member's device could still set them — a
-- stray local write, or a hand-made request. With it the database keeps:
--
--   cases       deleted_at (removing a problem), status and closed_at
--               (closing it, or reopening it). The hold check stays writable:
--               the team ticks "Checked today".
--   pace_todos  deleted_at (deleting an action).
--
-- A row with no project (a line study's own case or action) is untouched, as
-- before. The function is the same as ACCESS_LEVELS' with one more branch.
-- ============================================================================

create or replace function public.faultline_keep_agreement()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
declare pid text;
begin
  if tg_table_name = 'projects' then pid := old.id; else pid := old.project_id; end if;
  if pid is null or public.is_super() or public.is_project_owner(pid) then
    return new;
  end if;
  new.deleted_at := old.deleted_at;
  if tg_table_name = 'projects' then
    new.archived_at     := old.archived_at;
    new.planned_at      := old.planned_at;
    new.expected_at     := old.expected_at;
    new.install_stages  := old.install_stages;
    new.gate_stages     := old.gate_stages;
    new.commissioning   := old.commissioning;
    new.lever_tree      := old.lever_tree;
    new.owner_id        := old.owner_id;
  elsif tg_table_name = 'tests' then
    if coalesce(old.passes_if, '') <> '' then new.passes_if := old.passes_if; end if;
  elsif tg_table_name = 'cases' then
    new.status    := old.status;
    new.closed_at := old.closed_at;
  end if;
  return new;
end $function$;

create or replace trigger faultline_keep_agreement before update on public.cases
  for each row execute function public.faultline_keep_agreement();
create or replace trigger faultline_keep_agreement before update on public.pace_todos
  for each row execute function public.faultline_keep_agreement();

-- ---------------------------------------------------------------- read back
select tgrelid::regclass::text as on_table, tgname
  from pg_trigger where tgname = 'faultline_keep_agreement' and not tgisinternal
  order by 1;
