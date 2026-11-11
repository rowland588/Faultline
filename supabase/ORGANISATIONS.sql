-- ============================================================================
-- LUNA — THE BUSINESS: a manufacturing business, its people and their roles. Run ONCE. Safe to re-run.
--
-- Rowland, 11 November (docs/ORGANISATION.md, slice O1): "Manufacturing businesses themselves will subscribe to Luna and use it throughout
-- their organisation … Each should be able to interact with Luna according to their role, responsibilities and permissions … not
-- unnecessary enterprise complexity."
--
-- WHAT THIS ADDS — one layer above the line, nothing beside it:
--   organisations         (id, name, created_by, created_at, updated_at, deleted_at, entitlement jsonb, rev) — the business that
--                         subscribes. `entitlement` ({ plan, seats, aiDailyUsd, until }) is the administrator's, read by O5; this build
--                         neither reads nor writes it.
--   organisation_members  (id, org_id, email, role, sites text[], areas text[], invited_by, created_at, updated_at, deleted_at, rev) —
--                         one row a person a business. id = org_id || ':' || email, so an invite after a removal is the same row brought
--                         back. Role one of admin · leader · manager · team · viewer (src/org/organisation ORG_ROLES); sites and areas
--                         empty = the whole business.
--   workspaces.org_id     the business a line belongs to. No foreign key on purpose: a line and its new business can go up in either
--                         order in one sync pass, and a consultant's line at a business not on Luna carries none.
-- Both tables are synced like every other row (rev cursor, last-writer-wins, tombstones; src/cloud/mappers `organisations`,
-- `organisation_members`), so the business is the same on every device.
--
-- WHO MAY DO WHAT:
--   * a business — read by its members (and its maker); made by its maker for themselves (somebody who may start their own work,
--     can_start_projects); changed only by its administrator (a member whose role is admin, or its maker). No delete policy: a business
--     is put away by its administrator through deleted_at, never dropped.
--   * its people — the list read by the business's members; written (invite, role, scope, removal) by its administrator only.
--   * the maker stays the maker: a trigger keeps created_by.
--   * a line's business moves only by its owner or the business's administrator, and only into a business the person may write in; a
--     line made with no business takes its owner's own (a trigger — KEEPING the old value rather than refusing the row, as
--     ACCESS_LEVELS.sql part 3 does, so the sync never stalls on it).
-- No policy is `true`. Every function: security definer, search_path set.
-- Visibility of the lines themselves is ORG_VISIBILITY.sql (O3); the invite's front door is ORG_PEOPLE.sql (O2). This file changes
-- nobody's access to any line: is_ws_member is untouched here.
--
-- BACKFILL (idempotent): every person who owns a line gets one business of their own — its id THEIR user id (so every device finds the
-- same one, src/org/orgStore pickBusiness), named from the client name their lines carry most, else "My business" (the same rule as
-- src/org/organisation businessNameFrom) — with themselves as its administrator, and their lines with no business put in it. Run again,
-- it adds nothing.
--
-- BEFORE THIS IS APPLIED the app is safe: the two kinds answer "relation does not exist" and wait (src/cloud/sync.ts isMissingTable);
-- a line's org_id is sent only when the line carries one, which it does only once a business exists on the device.
--
-- Depends on: FRESH_START (profiles, is_super, workspaces), SECURITY_RLS (faultline_confirmed), WORKSPACE_TEAMS (is_ws_owner),
-- ACCESS_LEVELS (can_start_projects), COMMISSIONING / LINE_STANDARD (faultline_rev_seq, faultline_stamp_rev).
-- WRITTEN 11 November 2026 (slice O1). To be applied with apply_migration under this name and read back (pg_policies,
-- pg_get_functiondef, the backfill's counts) before the business is said to sync.
-- ============================================================================

-- ---------------------------------------------------------------- the tables
create table if not exists public.organisations (
  id           uuid primary key,
  name         text not null default '',
  created_by   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  entitlement  jsonb not null default '{}'::jsonb,
  created_at   bigint not null,
  updated_at   bigint not null,
  deleted_at   bigint
);

create table if not exists public.organisation_members (
  id          text primary key,
  org_id      uuid not null references public.organisations (id) on delete cascade,
  email       text not null check (email = lower(email)),
  role        text not null default 'team' check (role in ('admin', 'leader', 'manager', 'team', 'viewer')),
  sites       text[] not null default '{}',
  areas       text[] not null default '{}',
  invited_by  uuid references auth.users (id) on delete set null,
  created_at  bigint not null,
  updated_at  bigint not null,
  deleted_at  bigint,
  unique (org_id, email)
);
create index if not exists organisation_members_email_idx on public.organisation_members (email);
create index if not exists organisation_members_org_idx   on public.organisation_members (org_id);

alter table public.workspaces add column if not exists org_id uuid;
create index if not exists workspaces_org_idx on public.workspaces (org_id) where org_id is not null;

-- ---------------------------------------------------------------- sync transport: the rev stamp
do $rev$
declare t text;
begin
  foreach t in array array['organisations', 'organisation_members'] loop
    execute format('alter table public.%I add column if not exists rev bigint', t);
    execute format('create or replace trigger faultline_rev before insert or update on public.%I
                    for each row execute function public.faultline_stamp_rev()', t);
    execute format('update public.%I set rev = nextval(''public.faultline_rev_seq'') where rev is null', t);
    execute format('create index if not exists idx_%I_rev on public.%I (rev)', t, t);
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception
      when duplicate_object then null;
      when undefined_object then null;
    end;
  end loop;
end $rev$;

-- ---------------------------------------------------------------- who may
-- A member of the business (or its maker), not removed, the business not put away.
create or replace function public.is_org_member(o uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select o is not null and public.faultline_confirmed() and (
       public.is_super()
    or exists (select 1 from public.organisations g where g.id = o and g.deleted_at is null and g.created_by = auth.uid())
    or exists (
      select 1 from public.organisation_members m join public.organisations g on g.id = m.org_id and g.deleted_at is null
       where m.org_id = o and m.deleted_at is null
         and m.email = lower(coalesce(auth.jwt() ->> 'email', ''))
    ))
$$;

-- Its administrator: its maker, or a member whose role is admin.
create or replace function public.is_org_admin(o uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select o is not null and public.faultline_confirmed() and (
       public.is_super()
    or exists (select 1 from public.organisations g where g.id = o and g.created_by = auth.uid())
    or exists (
      select 1 from public.organisation_members m
       where m.org_id = o and m.deleted_at is null and m.role = 'admin'
         and m.email = lower(coalesce(auth.jwt() ->> 'email', ''))
    ))
$$;

-- May put work into this business: a member who is not a viewer (or its maker).
create or replace function public.may_write_in_org(o uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select o is not null and public.faultline_confirmed() and (
       public.is_super()
    or exists (select 1 from public.organisations g where g.id = o and g.deleted_at is null and g.created_by = auth.uid())
    or exists (
      select 1 from public.organisation_members m
       where m.org_id = o and m.deleted_at is null and m.role <> 'viewer'
         and m.email = lower(coalesce(auth.jwt() ->> 'email', ''))
    ))
$$;

revoke all on function public.is_org_member(uuid), public.is_org_admin(uuid), public.may_write_in_org(uuid) from public, anon;
grant execute on function public.is_org_member(uuid), public.is_org_admin(uuid), public.may_write_in_org(uuid) to authenticated;

alter table public.organisations        enable row level security;
alter table public.organisation_members enable row level security;

do $p$ begin
  -- the business: members read; its maker makes it for themselves; its administrator changes it (the upsert of a sync echo included)
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'organisations' and policyname = 'members read their business') then
    create policy "members read their business" on public.organisations for select to authenticated
      using ((select public.is_org_member(organisations.id)));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'organisations' and policyname = 'a business made by its maker') then
    create policy "a business made by its maker" on public.organisations for insert to authenticated
      with check ((created_by = (select auth.uid()) and (select public.can_start_projects())) or (select public.is_org_admin(organisations.id)));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'organisations' and policyname = 'the administrator changes the business') then
    create policy "the administrator changes the business" on public.organisations for update to authenticated
      using ((select public.is_org_admin(organisations.id))) with check ((select public.is_org_admin(organisations.id)));
  end if;

  -- its people: the business's members read the list; only its administrator writes it
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'organisation_members' and policyname = 'members read the people') then
    create policy "members read the people" on public.organisation_members for select to authenticated
      using ((select public.is_org_member(organisation_members.org_id)));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'organisation_members' and policyname = 'the administrator invites') then
    create policy "the administrator invites" on public.organisation_members for insert to authenticated
      with check ((select public.is_org_admin(organisation_members.org_id)));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'organisation_members' and policyname = 'the administrator changes the people') then
    create policy "the administrator changes the people" on public.organisation_members for update to authenticated
      using ((select public.is_org_admin(organisation_members.org_id))) with check ((select public.is_org_admin(organisation_members.org_id)));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'organisation_members' and policyname = 'the administrator removes') then
    create policy "the administrator removes" on public.organisation_members for delete to authenticated
      using ((select public.is_org_admin(organisation_members.org_id)));
  end if;
end $p$;

-- ---------------------------------------------------------------- the maker stays the maker
create or replace function public.faultline_keep_org_maker()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.created_by := old.created_by;
  return new;
end $$;
create or replace trigger faultline_keep_org_maker before update on public.organisations
  for each row execute function public.faultline_keep_org_maker();

-- ---------------------------------------------------------------- backfill: one business an owner, their lines in it
-- Before the line trigger below, so it moves nothing it would keep. Idempotent: an owner with a business gets no second; a line with a
-- business keeps it.
with owners as (
  select w.owner_id as uid,
         coalesce((select c from (select nullif(btrim(x.client_name), '') as c, count(*) as n from public.workspaces x
                                   where x.owner_id = w.owner_id group by 1) k
                    where c is not null order by n desc, c asc limit 1), 'My business') as name
    from public.workspaces w
   where w.owner_id is not null
   group by w.owner_id
)
insert into public.organisations (id, name, created_by, created_at, updated_at)
select o.uid, o.name, o.uid, (extract(epoch from now()) * 1000)::bigint, (extract(epoch from now()) * 1000)::bigint
  from owners o
 where not exists (select 1 from public.organisations g where g.id = o.uid)
on conflict (id) do nothing;

insert into public.organisation_members (id, org_id, email, role, invited_by, created_at, updated_at)
select g.id::text || ':' || lower(u.email), g.id, lower(u.email), 'admin', g.created_by,
       (extract(epoch from now()) * 1000)::bigint, (extract(epoch from now()) * 1000)::bigint
  from public.organisations g join auth.users u on u.id = g.created_by
 where u.email is not null
on conflict (org_id, email) do nothing;

update public.workspaces w set org_id = w.owner_id
 where w.org_id is null and exists (select 1 from public.organisations g where g.id = w.owner_id and g.deleted_at is null);

-- ---------------------------------------------------------------- a line's business
create or replace function public.faultline_line_org()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return new; end if;            -- the database's own work (a migration), not a person's
  if tg_op = 'INSERT' then
    if new.org_id is not null and not public.may_write_in_org(new.org_id) then new.org_id := null; end if;
    if new.org_id is null then
      new.org_id := (select g.id from public.organisations g where g.id = new.owner_id and g.deleted_at is null);
    end if;
    return new;
  end if;
  if new.org_id is distinct from old.org_id and not (
       public.is_super()
    or ((public.is_ws_owner(old.id) or (old.org_id is not null and public.is_org_admin(old.org_id)))
        and (new.org_id is null or public.may_write_in_org(new.org_id)))
  ) then
    new.org_id := old.org_id;
  end if;
  return new;
end $$;
create or replace trigger faultline_line_org before insert or update on public.workspaces
  for each row execute function public.faultline_line_org();

-- ---------------------------------------------------------------- read back
select 'table' as what, table_name as name from information_schema.tables
 where table_schema = 'public' and table_name in ('organisations', 'organisation_members')
union all
select 'column', 'workspaces.org_id' from information_schema.columns
 where table_schema = 'public' and table_name = 'workspaces' and column_name = 'org_id'
union all
select 'policy', tablename || ': ' || policyname || ' (' || cmd || ')' from pg_policies
 where schemaname = 'public' and tablename in ('organisations', 'organisation_members')
union all
select 'function', p.proname || case when p.prosecdef then ' — security definer' else ' — INVOKER' end
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and p.proname in ('is_org_member', 'is_org_admin', 'may_write_in_org', 'faultline_line_org', 'faultline_keep_org_maker')
union all
select 'trigger', event_object_table || ': ' || trigger_name from information_schema.triggers
 where trigger_schema = 'public' and trigger_name in ('faultline_line_org', 'faultline_keep_org_maker')
union all
select 'backfill', (select count(*) from public.organisations)::text || ' businesses · '
                || (select count(*) from public.organisation_members)::text || ' people · '
                || (select count(*) from public.workspaces where org_id is not null)::text || ' of '
                || (select count(*) from public.workspaces)::text || ' lines in a business'
order by 1, 2;
