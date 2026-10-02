-- ============================================================================
-- FAULTLINE — THE OWNER'S ADD IS THE INVITE. Run ONCE. Safe to re-run.
--
-- The front door is `allowed_emails`: the trigger on auth.users turns away any
-- sign-up whose address is not on it (FRESH_START.sql). Only the superadmin
-- could write that list. So a project owner or a line owner who added a
-- colleague's email put them on the people list, and the app then had to say
-- "the administrator needs to invite them before they can sign in". Fine while
-- the administrator is the one owner there is; a limit the moment it is not
-- (docs/REVIEW.md, item 8).
--
-- From here the add IS the invite. One function, run as definer, does both
-- writes in one call for the person who is allowed to make the add anyway:
--   1. the email goes on allowed_emails, so the person can create an account;
--   2. the email goes on the project's or the line study's people list.
-- It answers true when that person already has an account, so the screen can
-- say nothing new in that case and the true thing otherwise.
--
-- No policy is widened. `allowed_emails` stays super-only through the API; the
-- function checks for itself — a signed-in, confirmed caller who owns the
-- project (is_project_owner), owns the line's workspace (is_ws_owner) or is
-- the superadmin (is_super) — and raises for anyone else, with the reason in
-- words the screen can show as they are.
--
-- Depends on: FRESH_START.sql (allowed_emails, profiles, is_super),
-- WORKSPACE_TEAMS.sql (workspace_members, is_ws_owner), PROJECT_TEAMS.sql
-- (project_members, is_project_owner), SECURITY_RLS.sql (faultline_confirmed).
-- ============================================================================

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

  -- The front door. Already on the list (or already registered): nothing to do.
  insert into public.allowed_emails (email, invited_by) values (e, me)
    on conflict (email) do nothing;

  -- The people list. The late-joiner triggers on both tables re-stamp the
  -- history so the new member's first pull sweeps it up.
  if kind = 'project' then
    insert into public.project_members (project_id, email, role, added_by) values (target_id, e, invitee_role, me)
      on conflict (project_id, email) do nothing;
  else
    insert into public.workspace_members (workspace_id, email, added_by) values (target_id::uuid, e, me)
      on conflict (workspace_id, email) do nothing;
  end if;

  -- True when this person already has an account; false when the invite is
  -- what lets them create one.
  return exists (select 1 from public.profiles p where lower(p.email) = e);
end $$;

-- Postgres grants execute to everyone by default; this is for signed-in callers
-- only (the function refuses an anonymous one anyway).
revoke all on function public.invite_member(text, text, text, text) from public, anon;
grant execute on function public.invite_member(text, text, text, text) to authenticated;

-- ---------- printed back ----------
select 'invite_member()' as item,
  case when exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                    where n.nspname = 'public' and p.proname = 'invite_member' and p.prosecdef)
       then 'installed, security definer' else 'MISSING' end as value
union all
select 'authenticated may call it',
  case when has_function_privilege('authenticated', 'public.invite_member(text,text,text,text)', 'execute') then 'yes' else 'NO' end
union all
select 'anon may call it (should be no)',
  case when has_function_privilege('anon', 'public.invite_member(text,text,text,text)', 'execute') then 'YES' else 'no' end
union all
select 'allowed_emails policies (unchanged: super manages invites)',
  (select string_agg(policyname, ', ') from pg_policies where schemaname = 'public' and tablename = 'allowed_emails');
