-- ============================================================================
-- LUNA — WHO SEES WHICH LINES IN A BUSINESS: the business's people, as far as their scope reaches. Run ONCE. Safe to re-run.
--
-- Rowland, 11 November (docs/ORGANISATION.md, slice O3): "A team leader must not automatically have access to everything a managing
-- director can see."
--
-- ONE FUNCTION WIDENED, ONCE. is_ws_member(ws) is what every line-attached table's policies already ask (observations, segments,
-- snag_assets, snags, cases, standards, studies, programs, commission_assets, kept_papers, problem_history, workspace_members, the
-- workspaces row itself, and the media rule through them). It is replaced here by its newest definition — taken from
-- supabase/PROJECT_WALK.sql (2 October; the line's owner, the line's people list, a project on the line, a project's own walk), every
-- clause unchanged — with ONE clause added: a member of the line's business whose sites and areas reach the line (org_role_on_line).
-- Every table that follows a line follows the business; no policy is edited table by table.
-- !! Before applying, compare with the live definition (select pg_get_functiondef('public.is_ws_member(uuid)'::regprocedure)) — if
--    it differs from PROJECT_WALK.sql's, carry the live body over and add only the org_role_on_line clause.
--
-- SCOPE: organisation_members.sites / areas against workspaces.site_name / area_name, compared without case or surrounding spaces; an
-- empty list is the whole business; a line with no site (or area) is outside a scope that names sites (or areas). The same test as the
-- app's (src/org/organisation covers). A person removed (deleted_at), or a business put away, reaches nothing. The business's maker
-- reaches every line in it.
--
-- A VIEWER CHANGES NOTHING. RESTRICTIVE policies — ANDed with the permissive ones, as ACCESS_LEVELS.sql part 2 — on insert, update and
-- delete of every line-attached table that has a workspace_id (and the workspaces row by its id): refused only when the person's ONLY
-- way to the line is a viewer's membership of its business (ws_viewer_only). Anybody with any other way to the line — its owner, its
-- people list, a project on it, the administrator — writes exactly as before: nothing that worked is taken away. Reading is unchanged.
-- problem_history and workspace_members are not in the list: the first is written only by its trigger, the second only by the line's
-- owner.
--
-- LATE JOINERS: devices pull by rev (rows newer than their cursor), so somebody invited — or given a wider scope, or brought back —
-- would never pull the business's history. A trigger on organisation_members re-stamps the rows of the business's lines (as
-- faultline_member_added does for a line's people list), so their next pull sweeps them up. Values untouched (updated_at = updated_at).
--
-- No policy is `true`. Every function: security definer, search_path set.
-- Depends on: ORGANISATIONS.sql (the tables, workspaces.org_id), PROJECT_WALK.sql (is_ws_member as it stands), WORKSPACE_TEAMS
-- (is_ws_owner, workspace_members), PROJECT_TEAMS (is_project_member), SECURITY_RLS (faultline_confirmed, is_super).
-- Proved by supabase/tests/org_visibility_test.sql (a team leader in Packing cannot read Dispatch's line; a leader reads both; a viewer
-- reads and cannot write; a stranger reads nothing; a removed person reads nothing).
-- WRITTEN 11 November 2026 (slice O3). Applied with apply_migration under this name, read back with pg_get_functiondef and pg_policies,
-- and the test run, before anybody is invited for real.
-- ============================================================================

-- ---------------------------------------------------------------- the person's role on a line, through its business
-- 'admin' for the business's maker; else their membership's role when their scope reaches the line; else null.
create or replace function public.org_role_on_line(ws uuid)
returns text language sql stable security definer set search_path = public as $$
  select coalesce(
    (select 'admin'::text
       from public.workspaces w join public.organisations g on g.id = w.org_id and g.deleted_at is null
      where w.id = ws and g.created_by = auth.uid()
      limit 1),
    (select m.role
       from public.workspaces w
       join public.organisations g on g.id = w.org_id and g.deleted_at is null
       join public.organisation_members m on m.org_id = w.org_id and m.deleted_at is null
      where w.id = ws
        and m.email = lower(coalesce(auth.jwt() ->> 'email', ''))
        and (cardinality(m.sites) = 0 or exists (
              select 1 from unnest(m.sites) s
               where btrim(coalesce(w.site_name, '')) <> '' and lower(btrim(s)) = lower(btrim(w.site_name))))
        and (cardinality(m.areas) = 0 or exists (
              select 1 from unnest(m.areas) a
               where btrim(coalesce(w.area_name, '')) <> '' and lower(btrim(a)) = lower(btrim(w.area_name))))
      limit 1))
$$;

-- ---------------------------------------------------------------- is_ws_member, widened once
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
    )
    -- THE BUSINESS (ORG_VISIBILITY.sql, 11 November): a member of the line's business whose sites and areas reach it
    or public.org_role_on_line(ws) is not null)
$$;
grant execute on function public.is_ws_member(uuid) to authenticated;

-- ---------------------------------------------------------------- a viewer, and only a viewer
-- True only when the person's sole way to the line is a viewer's membership of its business.
create or replace function public.ws_viewer_only(ws uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select ws is not null
    and coalesce(public.org_role_on_line(ws) = 'viewer', false)
    and not public.is_super()
    and not public.is_ws_owner(ws)
    and not exists (
      select 1 from public.workspace_members m
      where m.workspace_id = ws and m.email = lower(coalesce(auth.jwt() ->> 'email', '')))
    and not exists (
      select 1 from public.pace_ppm l
      where l.workspace_id = ws::text and l.deleted_at is null and public.is_project_member(l.project_id))
    and not exists (
      select 1 from public.projects p
      where (p.walk_workspace_id = ws::text or p.workspace_ids ? ws::text) and p.deleted_at is null and public.is_project_member(p.id))
$$;

revoke all on function public.org_role_on_line(uuid), public.ws_viewer_only(uuid) from public, anon;
grant execute on function public.org_role_on_line(uuid), public.ws_viewer_only(uuid) to authenticated;

-- ---------------------------------------------------------------- viewers write nothing on the lines
do $v$
declare t text; col text; q text;
begin
  foreach t in array array[
    'workspaces', 'observations', 'segments', 'snag_assets', 'snags', 'cases',
    'standards', 'studies', 'programs', 'commission_assets', 'kept_papers'
  ] loop
    if to_regclass('public.' || t) is null then continue; end if;
    col := case when t = 'workspaces' then 'id' else 'workspace_id' end;
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = t and column_name = col) then continue; end if;
    q := format('(%1$I is null or not (select public.ws_viewer_only(%1$I)))', col);
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = 'org viewers read only insert') then
      execute format('create policy "org viewers read only insert" on public.%1$I as restrictive for insert to authenticated with check %2$s', t, q);
    end if;
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = 'org viewers read only update') then
      execute format('create policy "org viewers read only update" on public.%1$I as restrictive for update to authenticated using %2$s with check %2$s', t, q);
    end if;
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = 'org viewers read only delete') then
      execute format('create policy "org viewers read only delete" on public.%1$I as restrictive for delete to authenticated using %2$s', t, q);
    end if;
  end loop;
end $v$;

-- ---------------------------------------------------------------- late joiners: the business's lines re-stamped
create or replace function public.faultline_org_member_added()
returns trigger language plpgsql security definer set search_path = public as $$
declare t text;
begin
  if new.deleted_at is not null then return new; end if;
  if tg_op = 'UPDATE' and old.deleted_at is null and old.sites = new.sites and old.areas = new.areas then return new; end if;
  update public.workspaces set updated_at = updated_at where org_id = new.org_id;
  foreach t in array array['observations', 'segments', 'snag_assets', 'snags', 'cases', 'standards', 'studies', 'programs', 'commission_assets', 'kept_papers'] loop
    if to_regclass('public.' || t) is null then continue; end if;
    execute format('update public.%I set updated_at = updated_at where workspace_id in (select id from public.workspaces where org_id = $1)', t) using new.org_id;
  end loop;
  return new;
end $$;
create or replace trigger faultline_org_member_added after insert or update of sites, areas, deleted_at on public.organisation_members
  for each row execute function public.faultline_org_member_added();

-- ---------------------------------------------------------------- read back
select 'function' as what, p.proname || case when p.prosecdef then ' — security definer' else ' — INVOKER' end
  || case when p.proconfig::text like '%search_path=public%' then ', search_path set' else ', NO search_path' end as value
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and p.proname in ('is_ws_member', 'org_role_on_line', 'ws_viewer_only', 'faultline_org_member_added')
union all
select 'is_ws_member reaches the business',
  case when pg_get_functiondef('public.is_ws_member(uuid)'::regprocedure) like '%org_role_on_line%' then 'yes' else 'NO' end
union all
select 'policy', tablename || ': ' || policyname || ' (' || cmd || ', ' || permissive || ')' from pg_policies
 where schemaname = 'public' and policyname like 'org viewers read only %'
union all
select 'policies reading `true` (none added here; any listed predate this file)', coalesce(string_agg(tablename || '.' || policyname, ', '), 'none') from pg_policies
 where schemaname = 'public' and (qual = 'true' or with_check = 'true')
union all
select 'trigger', event_object_table || ': ' || trigger_name from information_schema.triggers
 where trigger_schema = 'public' and trigger_name = 'faultline_org_member_added'
order by 1, 2;
