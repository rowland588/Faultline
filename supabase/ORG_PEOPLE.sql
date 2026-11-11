-- ============================================================================
-- LUNA — THE BUSINESS'S PEOPLE: an invite with a role is the way in. Run ONCE. Safe to re-run.
--
-- Rowland, 11 November (docs/ORGANISATION.md, slice O2): "Each should be able to interact with Luna according to their role,
-- responsibilities and permissions … A team leader must not automatically have access to everything a managing director can see."
--
-- The People page (src/screens/PeopleScreen) invites by email with a role and, if wanted, the sites and areas the person may see. The
-- invite IS the organisation_members row (ORGANISATIONS.sql: only the business's administrator may write it). This file makes that row
-- also open the front door:
--   1. allowed_emails.scope gains 'org' — let in by a business's invite. The check constraint is widened (it said app · project);
--      every existing row keeps its scope.
--   2. A trigger on organisation_members puts the address on allowed_emails with scope 'org' when somebody is invited (or brought back
--      after a removal) — so they can make an account. An address already on the list keeps what it had (an 'app' person stays one).
--      It runs as definer because allowed_emails stays the administrator's through the API ("super manages invites", unchanged); the
--      row it follows was already refused to anybody who is not the business's administrator.
--   3. can_start_projects (ACCESS_LEVELS.sql) learns the business's roles: somebody let in ONLY by a business's invite may start projects
--      of their own when they are an administrator, leader or manager somewhere — never as team or viewer (src/org/organisation orgCan).
--      Everybody else answers as before.
-- No policy is added or widened here. Removing somebody (deleted_at) leaves their address on the list: they can still sign in, and see
-- nothing of the business's (ORG_VISIBILITY.sql reads only people not removed).
--
-- Depends on: ORGANISATIONS.sql, ACCESS_LEVELS.sql (allowed_emails.scope, can_start_projects), SECURITY_RLS (faultline_confirmed).
-- WRITTEN 11 November 2026 (slice O2). Applied with apply_migration under this name and read back (pg_constraint, pg_get_functiondef,
-- the trigger) before an invite is said to let anybody in.
-- ============================================================================

-- ---------------------------------------------------------------- 1 · the scope 'org'
do $k$
begin
  if exists (select 1 from pg_constraint where conname = 'allowed_emails_scope_check'
              and pg_get_constraintdef(oid) not like '%org%') then
    alter table public.allowed_emails drop constraint allowed_emails_scope_check;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'allowed_emails_scope_check') then
    alter table public.allowed_emails add constraint allowed_emails_scope_check check (scope in ('app', 'project', 'org'));
  end if;
end $k$;

-- ---------------------------------------------------------------- 2 · the invite opens the front door
create or replace function public.faultline_org_invite()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.deleted_at is null and (tg_op = 'INSERT' or old.deleted_at is not null) then
    insert into public.allowed_emails (email, invited_by, scope)
    values (lower(btrim(new.email)), coalesce(auth.uid(), new.invited_by), 'org')
    on conflict (email) do nothing;
  end if;
  return new;
end $$;
create or replace trigger faultline_org_invite after insert or update of deleted_at on public.organisation_members
  for each row execute function public.faultline_org_invite();

-- ---------------------------------------------------------------- 3 · who may start their own work
-- ACCESS_LEVELS.sql's, one clause added: an address let in only by a business (scope 'org') starts projects when its role somewhere
-- is admin, leader or manager.
create or replace function public.can_start_projects()
returns boolean language sql stable security definer set search_path = public as $$
  select public.faultline_confirmed() and (
       public.is_super()
    or (
      not exists (
        select 1 from public.allowed_emails a
        where a.email = lower(coalesce(auth.jwt() ->> 'email', '')) and a.scope = 'project'
      )
      and (
        not exists (
          select 1 from public.allowed_emails a
          where a.email = lower(coalesce(auth.jwt() ->> 'email', '')) and a.scope = 'org'
        )
        or exists (
          select 1 from public.organisation_members m
          where m.email = lower(coalesce(auth.jwt() ->> 'email', '')) and m.deleted_at is null
            and m.role in ('admin', 'leader', 'manager')
        )
      )
    ))
$$;
grant execute on function public.can_start_projects() to authenticated;

-- ---------------------------------------------------------------- read back
select 'constraint' as what, pg_get_constraintdef(oid) as value from pg_constraint where conname = 'allowed_emails_scope_check'
union all
select 'trigger', event_object_table || ': ' || trigger_name || ' (' || event_manipulation || ')' from information_schema.triggers
 where trigger_schema = 'public' and trigger_name = 'faultline_org_invite'
union all
select 'function', p.proname || case when p.prosecdef then ' — security definer' else ' — INVOKER' end
  || case when p.proconfig::text like '%search_path=public%' then ', search_path set' else ', NO search_path' end
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and p.proname in ('faultline_org_invite', 'can_start_projects')
union all
select 'allowed_emails policies (unchanged: super manages invites)',
  (select string_agg(policyname, ', ') from pg_policies where schemaname = 'public' and tablename = 'allowed_emails')
order by 1, 2;
