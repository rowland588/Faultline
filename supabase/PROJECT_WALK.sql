-- ============================================================================
-- FAULTLINE — THE PROJECT'S WALK, ON THE PROJECT ROW. Run ONCE. Safe to re-run.
--
-- A stage-gate job's filmed walk (its Evidence tab) is a workspace of its own.
-- Which workspace was remembered only in the device's meta store and never
-- synced, so a laptop opening a job the phone had filmed made a second, empty
-- walk (docs/REVIEW.md, item 1). One column on the project row carries the
-- link now, and the membership rule lets anyone on the project into it.
-- ============================================================================

alter table public.projects add column if not exists walk_workspace_id text;
create index if not exists projects_walk_workspace_idx
  on public.projects (walk_workspace_id) where walk_workspace_id is not null;

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
    -- a project's own walk: on the project row (or its legacy list)
    or exists (
      select 1 from public.projects p
      where (p.walk_workspace_id = ws::text or p.workspace_ids ? ws::text)
        and p.deleted_at is null
        and public.is_project_member(p.id)
    ))
$$;
grant execute on function public.is_ws_member(uuid) to authenticated;

-- ---------- printed back ----------
select column_name, data_type from information_schema.columns
 where table_schema = 'public' and table_name = 'projects' and column_name = 'walk_workspace_id';
