-- ============================================================================
-- FAULTLINE — CLOSE THE DOORS A SECURITY AUDIT FOUND OPEN.
-- Run ONCE in the SQL Editor. Safe to re-run: every part re-asserts a state.
-- One transaction: no table sits without a policy at any moment.
--
-- What the audit found (24 September), in order of severity:
--
--  1. MEDIA. The `media` bucket's policies were `bucket_id = 'media'` and
--     nothing else. Anyone who could sign in — an OEM guest on one project —
--     could list, download, replace or delete every photo, video and document
--     in every workspace and project. The rows were scoped by membership; the
--     bytes were not.
--  2. PROJECT ROWS. Every project table's policy was
--     `owner_id = auth.uid() OR is_project_member(project_id)`. The first arm
--     let any signed-in user INSERT a row — a passed test, a reading — into
--     any project whose id they had seen, and let a row's owner UPDATE it into
--     a project they were not in. And the app stamps the editor as owner on
--     every push, so somebody removed from a project kept every row they had
--     ever touched.
--  3. UNCONFIRMED EMAIL. Membership is matched on the JWT's email, and the
--     superadmin is recognised at insert. If email confirmation is off in Auth,
--     registering somebody else's invited address inherits their access.
--  4. PROFILES. Every user could read every other user's email.
--  5. HARD DELETES. Members could DELETE rows outright, bypassing tombstones;
--     a hard-deleted row is resurrected by the next device that edits it.
--  6. CLOCKS. `updated_at` is client-supplied and last-write-wins reads it; a
--     device with a wrong date wins every concurrent edit.
--
-- WHY IT READS THE CATALOGUE rather than naming policies: it rewrites what is
-- ACTUALLY on the database, whichever files were run and in whatever order.
-- The verification at the end prints every policy on every synced table.
--
-- Depends on: FRESH_START.sql (profiles, is_super), WORKSPACE_TEAMS.sql
-- (is_ws_member), PROJECT_TEAMS.sql (is_project_member), and the tables.
-- Tables that do not exist on this database are skipped, not created.
-- ============================================================================

set search_path = public;

begin;

-- ============================ PART A ========================================
-- Only a confirmed address counts. `faultline_confirmed()` reads auth.users as
-- definer; the three membership functions AND it in. With confirmation on in
-- Auth this changes nothing; with it off, an unconfirmed session sees nothing.
-- ============================================================================

create or replace function public.faultline_confirmed()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from auth.users u
    where u.id = auth.uid() and (u.email_confirmed_at is not null or u.confirmed_at is not null)
  )
$$;
grant execute on function public.faultline_confirmed() to authenticated, anon;

create or replace function public.is_super()
returns boolean language sql stable security definer set search_path = public as $$
  select public.faultline_confirmed()
     and exists (select 1 from public.profiles where id = auth.uid() and is_super)
$$;

create or replace function public.is_ws_member(ws uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.faultline_confirmed() and (
       public.is_super()
    or public.is_ws_owner(ws)
    or exists (
      select 1 from public.workspace_members m
      where m.workspace_id = ws
        and m.email = lower(coalesce(auth.jwt() ->> 'email', ''))
    ))
$$;

create or replace function public.is_project_member(p text)
returns boolean language sql stable security definer set search_path = public as $$
  select p is not null and public.faultline_confirmed() and (
       public.is_super()
    or public.is_project_owner(p)
    or exists (
      select 1 from public.project_members m
      where m.project_id = p
        and m.email = lower(coalesce(auth.jwt() ->> 'email', ''))
    ))
$$;

-- ============================ PART B ========================================
-- Ownership is set once. The app stamps the editor as owner on every push;
-- this keeps the first owner whatever the client sends. And the clock cannot
-- run ahead of the server by more than five minutes — clamped, never rejected,
-- because a rejected upsert is recorded as sent on the device and goes stale.
-- ============================================================================

create or replace function public.faultline_keep_owner()
returns trigger language plpgsql as $$
begin
  if old.owner_id is not null then new.owner_id := old.owner_id; end if;
  return new;
end $$;

create or replace function public.faultline_clamp_clock()
returns trigger language plpgsql as $$
declare ceiling bigint := (extract(epoch from now()) * 1000)::bigint + 300000;
begin
  if new.updated_at is not null and new.updated_at > ceiling then new.updated_at := ceiling; end if;
  return new;
end $$;

do $b$
declare t text;
begin
  foreach t in array array[
    'workspaces','cases','observations','segments','snag_assets','snags',
    'projects','project_targets','project_actuals','pace_ppm','pace_todos','pace_snapshots','pace_wins',
    'tree_nodes','commission_assets','tests','test_items','targets','readings','materials','programs'
  ] loop
    if to_regclass('public.' || t) is null then continue; end if;
    execute format('drop trigger if exists faultline_keep_owner on public.%I', t);
    execute format('create trigger faultline_keep_owner before update on public.%I for each row execute function public.faultline_keep_owner()', t);
    execute format('drop trigger if exists faultline_clamp_clock on public.%I', t);
    execute format('create trigger faultline_clamp_clock before insert or update on public.%I for each row execute function public.faultline_clamp_clock()', t);
  end loop;
end $b$;

-- ============================ PART C ========================================
-- Project rows: membership only. The owner arm survives ONLY for a row with
-- no project (legacy pace rows from before projects existed). Split into
-- select / insert / update, and no DELETE at all — the app never hard-deletes
-- (a delete is an update setting deleted_at), so nobody else should either.
-- Any policy on these tables that reads `true` — TEAM_UPGRADE's, if it was
-- re-run after the teams files — goes with them.
-- ============================================================================

do $c$
declare t text; r record; q text;
begin
  foreach t in array array[
    'project_targets','project_actuals','pace_ppm','pace_todos','pace_snapshots','pace_wins',
    'tree_nodes','commission_assets','commission_items','commission_phases',
    'tests','test_items','targets','readings','materials','programs'
  ] loop
    if to_regclass('public.' || t) is null then continue; end if;
    for r in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
      execute format('drop policy if exists %I on public.%I', r.policyname, t);
    end loop;
    q := format('(public.is_project_member(project_id) or (project_id is null and owner_id = (select auth.uid())))');
    execute format('create policy "member %1$s select" on public.%1$I for select to authenticated using %2$s', t, q);
    execute format('create policy "member %1$s insert" on public.%1$I for insert to authenticated with check %2$s', t, q);
    execute format('create policy "member %1$s update" on public.%1$I for update to authenticated using %2$s with check %2$s', t, q);
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $c$;

-- Workspace rows keep their membership policies, but any policy that reads
-- `true` on them is an open door and goes.
do $c2$
declare t text; r record;
begin
  foreach t in array array['workspaces','cases','observations','segments','snag_assets','snags'] loop
    if to_regclass('public.' || t) is null then continue; end if;
    for r in select policyname from pg_policies
             where schemaname = 'public' and tablename = t
               and (coalesce(qual, 'true') = 'true' or coalesce(with_check, 'true') = 'true')
               and cmd <> 'DELETE' loop
      execute format('drop policy if exists %I on public.%I', r.policyname, t);
    end loop;
  end loop;
end $c2$;

-- ============================ PART D ========================================
-- Media: a file is visible when a row that names it is visible. The function
-- runs as the caller (no security definer), so the tables' own policies decide.
-- The object name is the blob key (`blob-…`, `thumb-…`); legacy objects sit at
-- `<uid>/<key>`, so the last path segment is what is looked up. Rows are pushed
-- before their blobs and pulled before downloads, so the row is there in time.
-- ============================================================================

create or replace function public.faultline_can_see_media(object_name text)
returns boolean language plpgsql stable set search_path = public as $$
declare k text := regexp_replace(object_name, '^.*/', '');
        one jsonb := jsonb_build_array(jsonb_build_object('blobKey', k));
        two jsonb := jsonb_build_array(jsonb_build_object('thumbKey', k));
        hit boolean := false;
begin
  if to_regclass('public.observations') is not null then
    execute 'select exists (select 1 from public.observations where media @> $1 or media @> $2)' into hit using one, two;
    if hit then return true; end if;
  end if;
  if to_regclass('public.segments') is not null then
    execute 'select exists (select 1 from public.segments where video_key = $1 or poster_key = $1)' into hit using k;
    if hit then return true; end if;
  end if;
  if to_regclass('public.snag_assets') is not null then
    execute 'select exists (select 1 from public.snag_assets where still_key = $1)' into hit using k;
    if hit then return true; end if;
  end if;
  if to_regclass('public.snags') is not null then
    execute 'select exists (select 1 from public.snags where detail_photo_key = $1 or fixed_photo_key = $1)' into hit using k;
    if hit then return true; end if;
  end if;
  if to_regclass('public.pace_todos') is not null then
    execute 'select exists (select 1 from public.pace_todos where media @> $1 or media @> $2)' into hit using one, two;
    if hit then return true; end if;
  end if;
  if to_regclass('public.tests') is not null then
    execute 'select exists (select 1 from public.tests where media @> $1 or media @> $2 or docs @> $1)' into hit using one, two;
    if hit then return true; end if;
  end if;
  if to_regclass('public.test_items') is not null then
    execute 'select exists (select 1 from public.test_items where media @> $1 or media @> $2)' into hit using one, two;
    if hit then return true; end if;
  end if;
  if to_regclass('public.commission_assets') is not null then
    execute 'select exists (select 1 from public.commission_assets where docs @> $1)' into hit using one;
    if hit then return true; end if;
  end if;
  if to_regclass('public.commission_items') is not null then
    execute 'select exists (select 1 from public.commission_items where photos @> $1 or photos @> $2)' into hit using one, two;
    if hit then return true; end if;
  end if;
  return false;
end $$;
grant execute on function public.faultline_can_see_media(text) to authenticated;

-- The lookups above are containment queries; these make them index reads.
do $d$
declare c record;
begin
  for c in select * from (values
      ('observations','media'), ('pace_todos','media'), ('tests','media'), ('tests','docs'),
      ('test_items','media'), ('commission_assets','docs'), ('commission_items','photos')
    ) as v(t, col) loop
    if to_regclass('public.' || c.t) is null then continue; end if;
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = c.t and column_name = c.col) then continue; end if;
    execute format('create index if not exists idx_%s_%s_gin on public.%I using gin (%I jsonb_path_ops)', c.t, c.col, c.t, c.col);
  end loop;
  if to_regclass('public.segments') is not null then
    execute 'create index if not exists idx_segments_video_key on public.segments (video_key)';
    execute 'create index if not exists idx_segments_poster_key on public.segments (poster_key)';
  end if;
  if to_regclass('public.snag_assets') is not null then
    execute 'create index if not exists idx_snag_assets_still_key on public.snag_assets (still_key)';
  end if;
  if to_regclass('public.snags') is not null then
    execute 'create index if not exists idx_snags_detail_photo_key on public.snags (detail_photo_key)';
    execute 'create index if not exists idx_snags_fixed_photo_key on public.snags (fixed_photo_key)';
  end if;
end $d$;

do $pol$
declare r record;
begin
  for r in select policyname from pg_policies where schemaname = 'storage' and tablename = 'objects' loop
    execute format('drop policy if exists %I on storage.objects', r.policyname);
  end loop;
  execute $p$create policy "media read"   on storage.objects for select to authenticated using (bucket_id = 'media' and public.faultline_can_see_media(name))$p$;
  execute $p$create policy "media write"  on storage.objects for insert to authenticated with check (bucket_id = 'media' and public.faultline_can_see_media(name))$p$;
  execute $p$create policy "media update" on storage.objects for update to authenticated using (bucket_id = 'media' and owner = (select auth.uid())) with check (bucket_id = 'media' and owner = (select auth.uid()))$p$;
  execute $p$create policy "media delete" on storage.objects for delete to authenticated using (bucket_id = 'media' and (owner = (select auth.uid()) or (select public.is_super())))$p$;
exception when insufficient_privilege then
  raise notice 'storage.objects policies need the dashboard: Storage -> media -> Policies. Use faultline_can_see_media(name) for read and write.';
end $pol$;

-- ============================ PART E ========================================
-- Profiles: your own row, or somebody you share a workspace or project with.
-- The attribution list on screen only needs the people whose rows you can see.
-- ============================================================================

create or replace function public.faultline_shares_with(other_email text)
returns boolean language sql stable security definer set search_path = public as $$
  with me as (select lower(coalesce(auth.jwt() ->> 'email', '')) as email)
  select exists (
    select 1 from public.workspace_members a join public.workspace_members b on a.workspace_id = b.workspace_id, me
    where a.email = me.email and b.email = lower(other_email)
  ) or exists (
    select 1 from public.project_members a join public.project_members b on a.project_id = b.project_id, me
    where a.email = me.email and b.email = lower(other_email)
  ) or exists (
    select 1 from public.workspaces w join public.workspace_members m on m.workspace_id = w.id
    where (w.owner_id = auth.uid() and m.email = lower(other_email))
       or (m.email = (select email from me) and w.owner_id = (select id from public.profiles where lower(email) = lower(other_email) limit 1))
  ) or exists (
    select 1 from public.projects p join public.project_members m on m.project_id = p.id
    where (p.owner_id = auth.uid() and m.email = lower(other_email))
       or (m.email = (select email from me) and p.owner_id = (select id from public.profiles where lower(email) = lower(other_email) limit 1))
  )
$$;
grant execute on function public.faultline_shares_with(text) to authenticated;

drop policy if exists "team profiles read" on public.profiles;
drop policy if exists "profiles read" on public.profiles;
create policy "profiles read" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_super()) or public.faultline_shares_with(email));

-- ============================ PART F ========================================
-- Who gave whom access. project_members already records it; workspace_members
-- gains the same column, defaulting to the caller.
-- ============================================================================

alter table public.workspace_members add column if not exists added_by uuid references auth.users (id) on delete set null;
alter table public.workspace_members alter column added_by set default auth.uid();
alter table public.project_members alter column added_by set default auth.uid();

commit;

-- ============================ VERIFY ========================================
-- Every policy on every synced table, and on storage. Read it: no `true`, no
-- DELETE on a project child, and four `media …` rows on storage.objects.
-- ============================================================================

select schemaname, tablename, policyname, cmd, qual, with_check
from pg_policies
where (schemaname = 'public' and tablename in (
    'workspaces','cases','observations','segments','snag_assets','snags','profiles',
    'projects','project_members','workspace_members',
    'project_targets','project_actuals','pace_ppm','pace_todos','pace_snapshots','pace_wins',
    'tree_nodes','commission_assets','tests','test_items','targets','readings','materials','programs'))
   or (schemaname = 'storage' and tablename = 'objects')
order by schemaname, tablename, cmd, policyname;
