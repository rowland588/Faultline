-- ============================================================================
-- FAULTLINE — A LINE'S DELETE STAYS WITH ITS OWNER; LINE STANDARDS FOLLOW THE
-- JOB TABLES' RULES; NO HARD DELETE FROM ANY LINE TABLE; A PROBLEM FOR A JOB
-- IS THE JOB'S EDITORS' TO WRITE.                      Run ONCE. Safe to re-run.
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
--   S2  standards had no editors-only rule and kept the first-arm hole
--       SECURITY_RLS part C closed on every other job table: a client could
--       write a job's line standards and capacities, and any signed-in user
--       could insert a standards row into any job id they had seen.
--       → the same member select/insert/update + restrictive editors-only
--       policies as the job tables, and keep_owner / clamp_clock on it. With
--       NO owner arm: a row with no job is a line's (the check constraint
--       says one or the other), and the line's members' policies cover it;
--       an owner arm let any signed-in user plant a row on a line they were
--       not on (the independent review, 16 October).
--
--   S3  `for all` policies on cases, observations, segments, snag_assets,
--       snags, standards, studies, programs and commission_assets allowed a
--       hard DELETE the app never issues (it tombstones) — a hand-made request
--       would bypass the tombstones and keep_agreement.  → every one split
--       into select / insert / update with the predicate it had.
--
--   S5  snags.project_id ("a problem for a job") had no project-level write
--       rule, where cases got one (SIXM.sql).  → the same restrictive rule.
--
-- Every policy is re-created with EXACTLY the predicate and role it had on the
-- live database on 16 October (pg_policies read back); only its command set
-- changes. The select at the end prints what is in force.
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
revoke execute on function public.faultline_keep_line() from public, anon, authenticated;

drop trigger if exists faultline_keep_line on public.workspaces;
create trigger faultline_keep_line before update on public.workspaces
  for each row execute function public.faultline_keep_line();

-- --------------------------------------------- S3: the line tables, no DELETE
-- A helper for this file only: re-make one `for all` policy as select / insert
-- / update with the same predicate and roles.
create or replace function pg_temp.faultline_split_all(tbl text, pol text) returns void language plpgsql as $$
declare p record;
begin
  select * into p from pg_policies where schemaname = 'public' and tablename = tbl and policyname = pol and cmd = 'ALL';
  if not found then return; end if;
  execute format('drop policy %I on public.%I', pol, tbl);
  execute format('create policy %I on public.%I for select to %s using (%s)', pol || ' select', tbl, array_to_string(p.roles, ','), p.qual);
  execute format('create policy %I on public.%I for insert to %s with check (%s)', pol || ' insert', tbl, array_to_string(p.roles, ','), coalesce(p.with_check, p.qual));
  execute format('create policy %I on public.%I for update to %s using (%s) with check (%s)', pol || ' update', tbl, array_to_string(p.roles, ','), p.qual, coalesce(p.with_check, p.qual));
end $$;

select pg_temp.faultline_split_all('cases',             'member cases');
select pg_temp.faultline_split_all('observations',      'member observations');
select pg_temp.faultline_split_all('segments',          'member segments');
select pg_temp.faultline_split_all('snag_assets',       'member snag_assets');
select pg_temp.faultline_split_all('snags',             'member snags');
select pg_temp.faultline_split_all('programs',          'line programs');
select pg_temp.faultline_split_all('commission_assets', 'line machines');
select pg_temp.faultline_split_all('standards',         'line standards');
select pg_temp.faultline_split_all('studies',           'line studies');
select pg_temp.faultline_split_all('studies',           'own studies');
select pg_temp.faultline_split_all('studies',           'project studies');

-- ------------------------------------------------- S2: standards, a job table
drop policy if exists "project standards" on public.standards;

drop policy if exists "member standards select" on public.standards;
create policy "member standards select" on public.standards for select to authenticated
  using (public.is_project_member(project_id));
drop policy if exists "member standards insert" on public.standards;
create policy "member standards insert" on public.standards for insert to authenticated
  with check (public.is_project_member(project_id));
drop policy if exists "member standards update" on public.standards;
create policy "member standards update" on public.standards for update to authenticated
  using (public.is_project_member(project_id))
  with check (public.is_project_member(project_id));

drop policy if exists "editors only insert" on public.standards;
create policy "editors only insert" on public.standards as restrictive for insert to authenticated
  with check (public.is_project_editor(project_id)
    or (project_id is null and workspace_id is not null and (select public.is_ws_member(workspace_id))));
drop policy if exists "editors only update" on public.standards;
create policy "editors only update" on public.standards as restrictive for update to authenticated
  using (public.is_project_editor(project_id)
    or (project_id is null and workspace_id is not null and (select public.is_ws_member(workspace_id))))
  with check (public.is_project_editor(project_id)
    or (project_id is null and workspace_id is not null and (select public.is_ws_member(workspace_id))));

drop trigger if exists faultline_keep_owner on public.standards;
create trigger faultline_keep_owner before update on public.standards for each row execute function public.faultline_keep_owner();
drop trigger if exists faultline_clamp_clock on public.standards;
create trigger faultline_clamp_clock before insert or update on public.standards for each row execute function public.faultline_clamp_clock();

-- -------------------------------------------- S5: a problem for a job (snags)
drop policy if exists "project editors only insert" on public.snags;
create policy "project editors only insert" on public.snags as restrictive for insert to authenticated
  with check (project_id is null or public.is_project_editor(project_id));
drop policy if exists "project editors only update" on public.snags;
create policy "project editors only update" on public.snags as restrictive for update to authenticated
  using (project_id is null or public.is_project_editor(project_id))
  with check (project_id is null or public.is_project_editor(project_id));

-- ------------------------------------------------------------- what is in force
select tablename, policyname, permissive, cmd, roles::text
from pg_policies
where schemaname = 'public'
  and tablename in ('workspaces','cases','observations','segments','snag_assets','snags','programs','commission_assets','standards','studies')
order by tablename, cmd, policyname;
