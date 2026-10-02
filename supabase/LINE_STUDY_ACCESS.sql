-- ============================================================================
-- FAULTLINE — WHO CAN SEE A LINE'S STUDY. Run ONCE. Safe to re-run.
--
-- A line's study (its stops, walks, snags and cases) is a tool under a line,
-- and the line is under a project (CLAUDE.md). Until now the study had a door
-- of its own: only the people added to the workspace itself could see it, so
-- a project member opening a line's Pareto on their own phone got an empty
-- study and no word why. From here, being on the project is being on every
-- study under it. The study's own list stays — it is for anyone who is on the
-- line but not the project.
--
-- Also mends a door shut by mistake the other way. SECURITY_RLS.sql part C2
-- meant to drop any policy that read `true`, but tested
-- coalesce(with_check, 'true') — which is 'true' for every SELECT policy,
-- because a select policy has no with_check — and so took the workspaces'
-- select and insert policies with it. Since 24 September no workspace row
-- could be read or created through the API; the app kept them on the device
-- and said nothing. Both policies come back here, and C2's test is fixed in
-- that file so a re-run cannot do it again.
-- ============================================================================

-- ---------- a study's members: its own, plus the project's above it ----------
-- The lookups the function makes, indexed.
create index if not exists pace_ppm_workspace_id_idx
  on public.pace_ppm (workspace_id) where workspace_id is not null;
create index if not exists projects_workspace_ids_idx
  on public.projects using gin (workspace_ids);

create or replace function public.is_ws_member(ws uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.faultline_confirmed() and (
       public.is_super()
    or public.is_ws_owner(ws)
    or exists (
      select 1 from public.workspace_members m
      where m.workspace_id = ws
        and m.email = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
    -- a line's study: anyone on the line's project
    or exists (
      select 1 from public.pace_ppm l
      where l.workspace_id = ws::text
        and l.deleted_at is null
        and public.is_project_member(l.project_id)
    )
    -- a project's own walk, listed on the project row
    or exists (
      select 1 from public.projects p
      where p.workspace_ids ? ws::text
        and p.deleted_at is null
        and public.is_project_member(p.id)
    ))
$$;
grant execute on function public.is_ws_member(uuid) to authenticated;

-- ---------- the workspace doors C2 took: read and create ----------
drop policy if exists "member workspaces select" on public.workspaces;
create policy "member workspaces select" on public.workspaces
  for select to authenticated using (public.is_ws_member(id));
drop policy if exists "member workspaces insert" on public.workspaces;
create policy "member workspaces insert" on public.workspaces
  for insert to authenticated with check (owner_id = (select auth.uid()) or public.is_ws_member(id));

-- ---------- printed back: four policies, one per verb ----------
select policyname, cmd from pg_policies
 where schemaname = 'public' and tablename = 'workspaces' order by cmd;
