-- ============================================================================
-- FAULTLINE — WORKSPACE TEAMS. Run ONCE (SQL Editor → Run). Safe to re-run.
--
-- Workspaces become independent rooms with their own stakeholders. Anyone in
-- the app can create a workspace; whoever creates it owns it and chooses who
-- else is in it. You see a workspace only if you own it or its owner added
-- your email to its people list. (The app's front door is unchanged: the
-- superadmin still controls who can sign up at all.)
--
-- The subtle part: when someone is added to a workspace that already has
-- months of history, their device must receive ALL of it — not just changes
-- from that moment on. Devices pull by the server-assigned `rev` cursor, so a
-- trigger here re-stamps every row of the workspace with fresh revs the
-- moment a member is added. The new member's next pull sweeps up the lot.
-- ============================================================================

-- ---------- the people list, one row per (workspace, email) ----------
create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  email        text not null,
  added_by     uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  primary key (workspace_id, email)
);
alter table public.workspace_members enable row level security;

-- ---------- who's in the room? (security definer = no RLS recursion) ----------
create or replace function public.is_ws_owner(ws uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.workspaces w where w.id = ws and w.owner_id = auth.uid())
$$;

create or replace function public.is_ws_member(ws uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_super()
      or public.is_ws_owner(ws)
      or exists (
        select 1 from public.workspace_members m
        where m.workspace_id = ws
          and m.email = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
$$;

grant execute on function public.is_ws_owner(uuid)  to authenticated;
grant execute on function public.is_ws_member(uuid) to authenticated;

-- ---------- workspaces: everyone-shared → members-only ----------
drop policy if exists "team workspaces"            on public.workspaces;
drop policy if exists "member workspaces select"   on public.workspaces;
drop policy if exists "member workspaces insert"   on public.workspaces;
drop policy if exists "member workspaces update"   on public.workspaces;
drop policy if exists "member workspaces delete"   on public.workspaces;
create policy "member workspaces select" on public.workspaces
  for select to authenticated using (public.is_ws_member(id));
-- insert: you create workspaces you own; is_ws_member covers upsert echoes
create policy "member workspaces insert" on public.workspaces
  for insert to authenticated with check (owner_id = auth.uid() or public.is_ws_member(id));
create policy "member workspaces update" on public.workspaces
  for update to authenticated using (public.is_ws_member(id)) with check (public.is_ws_member(id));
create policy "member workspaces delete" on public.workspaces
  for delete to authenticated using (public.is_ws_owner(id) or public.is_super());

-- ---------- child data: visible/editable to that workspace's members ----------
do $$
declare t text;
begin
  foreach t in array array['observations','segments','snag_assets','snags'] loop
    execute format('drop policy if exists "team %s" on public.%I', t, t);
    execute format('drop policy if exists "member %s" on public.%I', t, t);
    execute format(
      'create policy "member %s" on public.%I for all to authenticated
         using (public.is_ws_member(workspace_id)) with check (public.is_ws_member(workspace_id))', t, t);
  end loop;
end $$;

-- ---------- the people list itself: members read, the owner manages ----------
drop policy if exists "members read"   on public.workspace_members;
drop policy if exists "members manage" on public.workspace_members;
create policy "members read" on public.workspace_members
  for select to authenticated using (public.is_ws_member(workspace_id));
create policy "members manage" on public.workspace_members
  for all to authenticated
  using (public.is_ws_owner(workspace_id) or public.is_super())
  with check (public.is_ws_owner(workspace_id) or public.is_super());

-- ---------- late-joiner history: re-stamp revs when a member is added ----------
-- No-op updates fire the faultline_rev trigger, so every row of the workspace
-- gets a rev newer than any device's cursor. Values are untouched (updated_at
-- keeps its LWW meaning); existing devices just re-pull identical rows once.
create or replace function public.faultline_member_added()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.workspaces   set updated_at = updated_at where id = new.workspace_id;
  update public.observations set updated_at = updated_at where workspace_id = new.workspace_id;
  update public.segments     set updated_at = updated_at where workspace_id = new.workspace_id;
  update public.snag_assets  set updated_at = updated_at where workspace_id = new.workspace_id;
  update public.snags        set updated_at = updated_at where workspace_id = new.workspace_id;
  return new;
end $$;
drop trigger if exists faultline_member_added on public.workspace_members;
create trigger faultline_member_added
  after insert on public.workspace_members
  for each row execute function public.faultline_member_added();

-- (Media stays team-readable in storage: keys are unguessable uuids and the
-- rows that point at them are membership-scoped. Fine for v1.)

-- ---------- report ----------
select 'policy ' || tablename || ': ' || policyname as item, cmd as value
from pg_policies
where schemaname = 'public'
  and tablename in ('workspaces','observations','segments','snag_assets','snags','workspace_members')
union all
select 'workspace_members table',
  case when exists (select 1 from information_schema.tables
                    where table_schema = 'public' and table_name = 'workspace_members')
       then 'installed' else 'MISSING' end
union all
select 'late-joiner trigger',
  case when exists (select 1 from pg_trigger
                    where tgrelid = 'public.workspace_members'::regclass and tgname = 'faultline_member_added')
       then 'installed' else 'MISSING' end
order by item;
