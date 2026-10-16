-- ============================================================================
-- FAULTLINE — A LINE'S DELETE STAYS WITH ITS OWNER; LINE STANDARDS ARE THE
-- EDITORS' TO WRITE; NO HARD DELETE FROM ANY LINE TABLE; A PROBLEM FOR A JOB
-- IS THE JOB'S EDITORS' TO WRITE.                      Run ONCE. Safe to re-run.
--
-- ADDS ONLY. Nothing here drops or replaces a policy: every rule is a new
-- RESTRICTIVE policy, which Postgres ANDs with the permissive ones already in
-- force, so it can only take access away and never hand out more. Re-runnable
-- because each is made only when its name is not there yet, and the triggers
-- with `create or replace trigger` (Postgres 14+; live is 17).
--
-- The upgrade audit of 16 October (docs/UPGRADE-AUDIT.md S1–S5; the live
-- pg_policies and pg_trigger read back that day) found four holes the access
-- model (supabase/ACCESS_LEVELS.sql) had left on the LINE side:
--
--   S1  Any member of a line — a project client included, through
--       is_ws_member — could set workspaces.deleted_at. The tombstone then
--       hard-deleted the line's stops, walks, frames, problems, cases and their
--       media on every device (src/db/sync.ts applyRemoteDelete). Nothing kept
--       it: the keep_agreement trigger is keyed on project_id and is not on
--       workspaces.  → faultline_keep_line: deleted_at and owner_id stay with
--       the line's owner (or a superadmin). Archive, name, type and floor order
--       stay open to the team: they lose nothing and the factory is edited
--       together (Rowland, 13 October: "always full edit control"). A line
--       with no owner (none live today; owner_id defaults to auth.uid()) is
--       open, as the screen treats it — the two must say the same.
--
--   S2  standards had no editors-only rule: a client could write a job's line
--       standards and capacities, and any signed-in user could insert a
--       standards row into any job id they had seen (the permissive "project
--       standards" policy lets the row's owner through, and the owner is
--       whoever wrote it).  → restrictive editors-only insert and update, as
--       the job tables have: the job's editors, or for a row with no job (a
--       line's — the check constraint says one or the other) the line's
--       members; and keep_owner / clamp_clock on it as on every other table.
--
--   S3  The `for all` policies on cases, observations, segments, snag_assets,
--       snags, standards, studies, programs and commission_assets allowed a
--       hard DELETE the app never issues (it tombstones; src/cloud has no
--       .delete() on any of them) — a hand-made request would bypass the
--       tombstones and keep_agreement.  → a restrictive "no hard delete" on
--       each: using (false). The service role (the remind function) is not
--       subject to RLS and deletes none of them.
--
--   S5  snags.project_id ("a problem for a job") had no project-level write
--       rule, where cases got one (SIXM.sql).  → the same restrictive rule.
--
-- The first draft split each `for all` policy into select/insert/update and
-- rebuilt the standards policies; it dropped policies to do it, which the
-- connector holds for a confirmation, and an add-only rule says the same
-- with nothing taken down first. The select at the end prints what is in
-- force.
-- ============================================================================

-- ---------------------------------------------------------------- S1: the line
create or replace function public.faultline_keep_line()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_super() or old.owner_id is null or old.owner_id = auth.uid() then return new; end if;
  new.deleted_at := old.deleted_at;
  new.owner_id   := old.owner_id;
  return new;
end $$;

create or replace trigger faultline_keep_line before update on public.workspaces
  for each row execute function public.faultline_keep_line();

-- ------------------------------------------------ the rules, each made once
do $$
declare
  t text;
begin
  /* S3: no hard delete from a line table */
  foreach t in array array['cases','observations','segments','snag_assets','snags','standards','studies','programs','commission_assets'] loop
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = 'no hard delete') then
      execute format('create policy %I on public.%I as restrictive for delete to public using (false)', 'no hard delete', t);
    end if;
  end loop;

  /* S2: a line standard is the editors' to write */
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'standards' and policyname = 'editors only insert') then
    create policy "editors only insert" on public.standards as restrictive for insert to authenticated
      with check (public.is_project_editor(project_id)
        or (project_id is null and workspace_id is not null and (select public.is_ws_member(workspace_id))));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'standards' and policyname = 'editors only update') then
    create policy "editors only update" on public.standards as restrictive for update to authenticated
      using (public.is_project_editor(project_id)
        or (project_id is null and workspace_id is not null and (select public.is_ws_member(workspace_id))))
      with check (public.is_project_editor(project_id)
        or (project_id is null and workspace_id is not null and (select public.is_ws_member(workspace_id))));
  end if;

  /* S5: a problem for a job is the job's editors' to write */
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'snags' and policyname = 'project editors only insert') then
    create policy "project editors only insert" on public.snags as restrictive for insert to authenticated
      with check (project_id is null or public.is_project_editor(project_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'snags' and policyname = 'project editors only update') then
    create policy "project editors only update" on public.snags as restrictive for update to authenticated
      using (project_id is null or public.is_project_editor(project_id))
      with check (project_id is null or public.is_project_editor(project_id));
  end if;
end $$;

-- ------------------------------------------- S2: standards' owner and clock
create or replace trigger faultline_keep_owner before update on public.standards
  for each row execute function public.faultline_keep_owner();
create or replace trigger faultline_clamp_clock before insert or update on public.standards
  for each row execute function public.faultline_clamp_clock();

-- ------------------------------------------------------------- what is in force
select tablename, policyname, permissive, cmd, roles::text
from pg_policies
where schemaname = 'public'
  and tablename in ('workspaces','cases','observations','segments','snag_assets','snags','programs','commission_assets','standards','studies')
order by tablename, cmd, policyname;
