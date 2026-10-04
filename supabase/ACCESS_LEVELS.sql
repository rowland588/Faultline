-- ============================================================================
-- FAULTLINE — WHO CAN DO WHAT ON A PROJECT. Run ONCE. Safe to re-run.
--
-- Rowland, 4 October: "If I invite you to the app, you can make up your own
-- projects. If I invite you to a project, you should have limitations, because
-- I still need to be able to control what's happening." Every comparable app
-- (Asana, Fieldwire, Basecamp, Procore, Smartsheet) separates the two, and
-- gives a project a short ladder picked once per person. Faultline's:
--
--   OWNER   the project's owner_id (or the administrator) — everything.
--   TEAM    project_members.access = 'team' — does the work, but cannot
--           change what was AGREED or delete anything (part 3).
--   CLIENT  project_members.access = 'client' — reads it and takes the
--           reports; changes nothing (part 2).
--
-- 1. A PROJECT INVITE IS NOT AN APP INVITE. invite_member put the address on
--    allowed_emails, which let the person in AND let them start projects of
--    their own. allowed_emails now says which: scope 'app' (the
--    administrator's invite — start your own projects) or 'project' (an
--    owner's invite — only what you were invited to). Existing rows are 'app',
--    so nobody already here loses anything.
-- 2. CLIENTS CHANGE NOTHING. Insert and update on the project's rows need
--    is_project_editor (owner, administrator, or a team member) instead of
--    is_project_member. Reading is unchanged. The app never pushes a client's
--    rows (src/cloud/sync.ts), so a refusal here never stalls a sync.
-- 3. THE AGREEMENT IS THE OWNER'S. A trigger keeps, for anyone but the owner
--    or the administrator: the handover dates, the stage lists, the method,
--    a test's "passes if" once it has been written, and every deleted_at /
--    archived_at. It KEEPS the old value rather than refusing the row, so a
--    team member's other changes on the same row still land and the sync
--    never stalls on it. The screens do not offer these to a team member at
--    all; this is the guarantee behind them.
--
-- Depends on: FRESH_START (allowed_emails, profiles), PROJECT_TEAMS
-- (project_members, is_project_member, is_project_owner), SECURITY_RLS (the
-- member policies this replaces, faultline_confirmed), OWNER_INVITES.
-- ============================================================================

-- ---------------------------------------------------------------- columns
alter table public.project_members add column if not exists access text not null default 'team';
alter table public.allowed_emails  add column if not exists scope  text not null default 'app';

do $k$ begin
  if not exists (select 1 from pg_constraint where conname = 'project_members_access_check') then
    alter table public.project_members add constraint project_members_access_check check (access in ('team', 'client'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'allowed_emails_scope_check') then
    alter table public.allowed_emails add constraint allowed_emails_scope_check check (scope in ('app', 'project'));
  end if;
end $k$;

-- ---------------------------------------------------------------- who may
-- May change this project's rows: the owner, the administrator, a team member.
create or replace function public.is_project_editor(p text)
returns boolean language sql stable security definer set search_path = public as $$
  select p is not null and public.faultline_confirmed() and (
       public.is_super()
    or public.is_project_owner(p)
    or exists (
      select 1 from public.project_members m
      where m.project_id = p and m.access = 'team'
        and m.email = lower(coalesce(auth.jwt() ->> 'email', ''))
    ))
$$;

-- May start projects of their own: anyone not let in by a project invite only.
create or replace function public.can_start_projects()
returns boolean language sql stable security definer set search_path = public as $$
  select public.faultline_confirmed() and (
       public.is_super()
    or not exists (
      select 1 from public.allowed_emails a
      where a.email = lower(coalesce(auth.jwt() ->> 'email', '')) and a.scope = 'project'
    ))
$$;
grant execute on function public.is_project_editor(text) to authenticated;
grant execute on function public.can_start_projects() to authenticated;

-- ------------------------------------------------- 1 · the invite's scope
-- Same function as OWNER_INVITES, one change: the front-door row it writes is
-- a PROJECT invite. An address already on the list keeps what it had.
create or replace function public.invite_member(kind text, target_id text, invitee text, invitee_role text default 'member')
returns boolean language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  e  text := lower(trim(invitee));
begin
  if me is null or not public.faultline_confirmed() then
    raise exception 'Sign in with a confirmed address to add people.';
  end if;
  if e !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'That doesn''t look like an email address.';
  end if;

  if kind = 'project' then
    if not (public.is_project_owner(target_id) or public.is_super()) then
      raise exception 'Only the owner of this project, or the administrator, can add people to it.';
    end if;
    if invitee_role not in ('lead', 'sponsor', 'owner', 'member') then
      raise exception 'A project role is lead, sponsor, owner or member, not "%".', invitee_role;
    end if;
  elsif kind = 'workspace' then
    if not (public.is_ws_owner(target_id::uuid) or public.is_super()) then
      raise exception 'Only the owner of this line''s study, or the administrator, can add people to it.';
    end if;
  else
    raise exception 'invite_member: kind is project or workspace, not "%".', kind;
  end if;

  insert into public.allowed_emails (email, invited_by, scope) values (e, me, 'project')
    on conflict (email) do nothing;

  if kind = 'project' then
    insert into public.project_members (project_id, email, role, added_by) values (target_id, e, invitee_role, me)
      on conflict (project_id, email) do nothing;
  else
    insert into public.workspace_members (workspace_id, email, added_by) values (target_id::uuid, e, me)
      on conflict (workspace_id, email) do nothing;
  end if;
  -- The access level (team or client) is set by the owner straight after, on
  -- project_members, which the owner already manages ("project members manage").
  return exists (select 1 from public.profiles p where lower(p.email) = e);
end $$;

-- ------------------------------------------------- 2 · clients change nothing
do $c$
declare t text; r record; q text;
begin
  foreach t in array array[
    'project_targets','project_actuals','pace_ppm','pace_todos','pace_snapshots','pace_wins',
    'tree_nodes','commission_assets','commission_items','commission_phases',
    'tests','test_items','targets','readings','materials','programs'
  ] loop
    if to_regclass('public.' || t) is null then continue; end if;
    for r in select policyname from pg_policies where schemaname = 'public' and tablename = t and cmd in ('INSERT', 'UPDATE') loop
      execute format('drop policy if exists %I on public.%I', r.policyname, t);
    end loop;
    q := '(public.is_project_editor(project_id) or (project_id is null and owner_id = (select auth.uid())))';
    execute format('create policy "editor %1$s insert" on public.%1$I for insert to authenticated with check %2$s', t, q);
    execute format('create policy "editor %1$s update" on public.%1$I for update to authenticated using %2$s with check %2$s', t, q);
  end loop;
end $c$;

-- The project row itself: a new one only by somebody who may start projects;
-- an existing one changed only by its editors.
drop policy if exists "member projects insert" on public.projects;
drop policy if exists "member projects update" on public.projects;
drop policy if exists "editor projects insert" on public.projects;
drop policy if exists "editor projects update" on public.projects;
create policy "editor projects insert" on public.projects for insert to authenticated
  with check ((owner_id = (select auth.uid()) and public.can_start_projects()) or public.is_project_editor(id));
create policy "editor projects update" on public.projects for update to authenticated
  using (public.is_project_editor(id)) with check (public.is_project_editor(id));

-- ------------------------------------------------- 3 · the agreement is the owner's
create or replace function public.faultline_keep_agreement()
returns trigger language plpgsql security definer set search_path = public as $$
declare pid text;
begin
  -- Two statements, not one CASE: plpgsql plans both arms, and old.project_id
  -- does not exist on the projects row.
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
    -- Written once by anyone (a test is proposed with what it must show);
    -- after that, what was agreed moves only with the owner.
    if coalesce(old.passes_if, '') <> '' then new.passes_if := old.passes_if; end if;
  end if;
  return new;
end $$;

do $t$
declare t text;
begin
  foreach t in array array['projects','tests','test_items','commission_assets','commission_items','commission_phases','materials','programs'] loop
    if to_regclass('public.' || t) is null then continue; end if;
    execute format('drop trigger if exists faultline_keep_agreement on public.%I', t);
    execute format('create trigger faultline_keep_agreement before update on public.%I for each row execute function public.faultline_keep_agreement()', t);
  end loop;
end $t$;

-- ---------------------------------------------------------------- read back
select 'column' as what, table_name || '.' || column_name as name from information_schema.columns
  where table_schema = 'public' and ((table_name = 'project_members' and column_name = 'access') or (table_name = 'allowed_emails' and column_name = 'scope'))
union all
select 'policy', tablename || ': ' || policyname from pg_policies
  where schemaname = 'public' and policyname like 'editor %'
union all
select 'trigger', event_object_table || ': ' || trigger_name from information_schema.triggers
  where trigger_schema = 'public' and trigger_name = 'faultline_keep_agreement'
order by 1, 2;
