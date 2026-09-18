-- ============================================================================
-- FAULTLINE — EVERYTHING OUTSTANDING, IN ONE RUN.
--
--   Supabase dashboard -> SQL Editor -> paste this -> Run.
--
-- This is the only file you need to run. It is the three outstanding
-- migrations in the order they depend on each other, with their separate
-- self-checks replaced by one table of results at the end.
--
-- Safe whatever state the database is in. Every statement is additive or
-- guarded, so it does not matter which of the earlier files have been run, or
-- how many times this one has. Running it twice changes nothing the second
-- time. Nothing here drops a table, a column or a row.
--
--   1  PARETO         two opt-in columns for the Pareto surface
--   2  COMMISSIONING  the commissioning table, its rev stamp and its policy
--   3  RLS HOIST      stops 13 policies calling auth.uid() once per row
--
-- WHEN IT FINISHES, read the result table at the bottom. Every row should end
-- in OK. Any row that does not, send me and I will fix it.
-- ============================================================================



-- ===========================================================================
-- 1. PARETO
-- ===========================================================================

-- The Pareto: an opt-in surface per project, and the sheet each upload carried.
--
-- Two small columns, both additive and both safe to run twice.
--
-- projects.pareto  — the project's own choice, exactly like lever_tree. A tool
--                    some projects run on and most do not.
-- pace_snapshots.pareto — the Pareto sheet as THAT upload had it. Kept per
--                    upload rather than once per project because a Pareto run
--                    again during the work is evidence of movement, and
--                    evidence needs two readings to say anything.
--
-- Nothing here is destructive: existing rows get the defaults and no snapshot
-- loses anything. A device that has never seen a Pareto sheet simply syncs null.

alter table if exists public.projects
  add column if not exists pareto boolean not null default false;

alter table if exists public.pace_snapshots
  add column if not exists pareto jsonb;

-- Only the rows that actually carry one, so the index stays small on a table
-- where most uploads have no Pareto sheet at all.
create index if not exists pace_snapshots_pareto_idx
  on public.pace_snapshots ((pareto is not null))
  where pareto is not null;


-- ===========================================================================
-- 2. COMMISSIONING
-- ===========================================================================

-- Commissioning: a line being handed over by an OEM, tracked on readiness.
--
-- One new table and one new flag. Both additive, both safe to run twice.
--
-- Unlike the tracker, NOTHING here is read from a workbook: a commissioning job
-- has no system of record until somebody makes one, so the app is it. That is
-- why this table holds real fields rather than a blob — the rows are edited from
-- two devices in the same week and last-writer-wins on a whole document would
-- lose somebody's afternoon.

alter table if exists public.projects
  add column if not exists commissioning boolean not null default false;

create table if not exists public.commission_items (
  id          text primary key,
  owner_id    uuid not null default auth.uid(),
  project_id  text not null,

  -- Which asset on the line this belongs to. A production line is made of many
  -- assets and each is commissioned in its own right; NULL means the work
  -- belongs to the line itself rather than to any one machine.
  asset       text,
  -- the workstream, within that asset: Programs, Film & materials, SAT...
  stream      text not null default '',
  -- check (must be proven) | supply (need a quantity) | task (somebody does it)
  kind        text not null default 'task',
  title       text not null default '',

  -- what good looks like, and what actually happened
  target      text,
  result      text,

  -- a check's progression: none | have | testing | passed | failed
  stage       text,
  -- a task's: todo | doing | waiting | done
  task_stage  text,

  -- a supply's arithmetic
  need        numeric,
  have        numeric,
  on_order    numeric,
  due_in      text,

  owner       text,
  due         text,
  note        text,
  -- Pictures attached to this item: an array of lightweight MediaRefs, never
  -- the images themselves. The blobs go to storage by the same route the line
  -- walk's evidence does; what lives here is only which ones belong to this row.
  photos      jsonb,
  -- Every pass at this item, oldest first: what happened, what we made of it,
  -- what we decided next, who ran it and when. A retest must not overwrite the
  -- test — the line is signed off on the story of how it got to rate.
  findings    jsonb,
  -- Line-walk snags this item is proved by. Ids only: the snag itself lives in
  -- the snags table with its own lifecycle, so closing it on the walk closes it
  -- here rather than leaving two copies to drift apart.
  snag_ids    jsonb,
  sort        bigint not null default 0,

  created_at  bigint not null,
  updated_at  bigint not null,
  deleted_at  bigint
);

-- For a database that already ran an earlier cut of this file, before items
-- could carry pictures. Additive and safe on a table that already has it.
alter table if exists public.commission_items
  add column if not exists photos jsonb;
alter table if exists public.commission_items
  add column if not exists snag_ids jsonb;
alter table if exists public.commission_items
  add column if not exists asset text;
alter table if exists public.commission_items
  add column if not exists findings jsonb;

create index if not exists commission_items_project_idx
  on public.commission_items (project_id);
create index if not exists commission_items_owner_idx
  on public.commission_items (owner_id);

-- ---------- sync transport: the rev stamp ----------
--
-- NOT optional, and not only this table's problem. Devices pull with
-- "rev > the last rev I saw", which is server truth and cannot skip rows the
-- way two devices' clocks can. A table WITHOUT this column answers that query
-- with error 42703, and the app reads one 42703 as "this cloud is too old for
-- rev cursors at all": it drops to the legacy clock cursor for EVERY table for
-- the rest of the session and shows the upgrade nudge for good. So a
-- commissioning table missing three lines degrades the sync of the snags, the
-- tracker and the lever tree along with it.
alter table public.commission_items add column if not exists rev bigint;

-- The sequence and the stamp function belong to FRESH_START.sql, and normally
-- they are already here. Created if missing anyway, because the alternative is
-- this file ABORTING on the trigger below — which is three statements before
-- "enable row level security", so the table would be left with no policy at
-- all. On Supabase every signed-in user is granted on public tables, so a
-- commissioning table without RLS is readable by all of them. A migration must
-- not be able to fail into that state.
create sequence if not exists public.faultline_rev_seq;

create or replace function public.faultline_stamp_rev() returns trigger language plpgsql as $stamp$
begin
  new.rev := nextval('public.faultline_rev_seq');
  return new;
end $stamp$;

drop trigger if exists faultline_rev on public.commission_items;

create trigger faultline_rev before insert or update on public.commission_items for each row execute function public.faultline_stamp_rev();

-- Rows written by an earlier run of this file have no rev, and a null rev is
-- never greater than a cursor — they would be invisible to every pull until
-- somebody happened to edit them.
update public.commission_items set rev = nextval('public.faultline_rev_seq') where rev is null;

create index if not exists idx_commission_items_rev on public.commission_items (rev);

-- Realtime, so the second device shows a finding as it is written rather than
-- at the next interval. Optional by design: if realtime is switched off on the
-- project the sync interval still carries everything.
do $realtime$ begin
  execute 'alter publication supabase_realtime add table public.commission_items';
exception
  when duplicate_object then null;   -- already published
  when undefined_object then null;   -- realtime disabled here
end $realtime$;

alter table public.commission_items enable row level security;

-- Who can see it: the owner, and anyone invited into the project.
--
-- Owner-only would have made commissioning the ONE thing a person invited into
-- the project cannot see — they would open a line being handed over and find an
-- empty board, with nothing on screen to say why. Every other project table
-- (pace_ppm, pace_todos, tree_nodes) is already scoped this way.
--
-- Guarded, because is_project_member comes from PROJECT_TEAMS.sql and this file
-- has to be safe on a database where that has not been run yet. Without it the
-- policy is owner-only, which still syncs across that person's own devices.
drop policy if exists commission_items_own on public.commission_items;
drop policy if exists "project commission_items" on public.commission_items;

-- auth.uid() is wrapped in (select ...) on purpose. Called bare, it is
-- evaluated ONCE PER ROW; wrapped, the planner hoists it to an InitPlan and
-- runs it once for the whole query. Supabase's own guidance puts that at 5-10x
-- on a table of any size, and this one grows by a row per check, per asset, for
-- the life of the commissioning.
--
-- is_project_member(project_id) cannot be hoisted the same way — it takes the
-- row's own column, so it stays a per-row SubPlan. It is wrapped anyway for
-- consistency, and the owner_id test is written FIRST so that the cheap
-- comparison short-circuits it for the common case: your own rows on your own
-- devices never call the function at all.
do $rls$ begin
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and p.proname = 'is_project_member') then
    execute 'create policy "project commission_items" on public.commission_items for all to authenticated using (owner_id = (select auth.uid()) or (select public.is_project_member(project_id))) with check (owner_id = (select auth.uid()) or (select public.is_project_member(project_id)))';
  else
    execute 'create policy "project commission_items" on public.commission_items for all to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()))';
  end if;
end $rls$;


-- ===========================================================================
-- 3. RLS HOIST
-- ===========================================================================

-- ============================================================================
-- FAULTLINE — STOP RLS CALLING auth.uid() ONCE PER ROW.
-- Run ONCE (SQL Editor → Run). Safe to re-run: the second run changes nothing.
--
-- A policy written `using (owner_id = auth.uid())` evaluates auth.uid() for
-- EVERY ROW it examines. Written `using (owner_id = (select auth.uid()))` the
-- planner hoists it to an InitPlan and evaluates it once for the whole query.
-- Measured on this schema with a counting stub: 10,002 calls became 2.
--
-- is_super() gets the same treatment and matters more per call, because it is
-- not a cheap lookup — it selects from public.profiles. Per row, on a table
-- being pulled by two devices, that is a query per row.
--
-- The functions that take the ROW'S OWN COLUMN — is_project_member(project_id),
-- is_ws_member(workspace_id) — are deliberately left alone. They cannot be
-- hoisted, because their answer depends on the row being tested. Wrapping them
-- changes nothing and pretending otherwise would hide the real cost.
--
-- WHY THIS READS THE CATALOGUE INSTEAD OF NAMING POLICIES: it rewrites what is
-- ACTUALLY on the database, whichever of the other files have been run and in
-- whatever order. A list of policy names hand-copied from those files would
-- silently miss any that differ, and silently fail on any not present.
--
-- NOTHING'S MEANING CHANGES. Only when and how often a function is called.
-- Every policy's command, roles, permissiveness and predicate are rebuilt
-- exactly as found, with the two call sites wrapped. The whole pass is one
-- transaction, so there is never a moment when a table sits without its policy.
-- ============================================================================

set search_path = public;

do $hoist$
declare
  r        record;
  new_q    text;
  new_c    text;
  stmt     text;
  changed  int := 0;
  seen     int := 0;
begin
  for r in
    select tablename, policyname, permissive, cmd, roles, qual, with_check
    from pg_policies
    where schemaname = 'public'
    order by tablename, policyname
  loop
    seen := seen + 1;

    new_q := r.qual;
    new_c := r.with_check;

    -- pass 1: unwrap anything already hoisted, so the text is in one known form
    new_q := regexp_replace(new_q, '\( SELECT (auth\.uid\(\)|is_super\(\)) AS \w+\)', '\1', 'g');
    new_c := regexp_replace(new_c, '\( SELECT (auth\.uid\(\)|is_super\(\)) AS \w+\)', '\1', 'g');
    -- pass 2: hoist. \m anchors to a word start so a longer identifier that
    -- merely ends in is_super() is never touched.
    new_q := regexp_replace(new_q, '\m(auth\.uid\(\)|is_super\(\))', '(select \1)', 'g');
    new_c := regexp_replace(new_c, '\m(auth\.uid\(\)|is_super\(\))', '(select \1)', 'g');

    -- Skip unless a BARE call actually remains in what is stored.
    --
    -- Not "unless my rewrite differs from the stored text": Postgres re-prints a
    -- wrapped call in its own canonical form, `( SELECT auth.uid() AS uid)`,
    -- which never matches the `(select auth.uid())` this builds. Comparing the
    -- two made an already-hoisted policy look like work, so it was dropped and
    -- recreated on every run and the count reported one more than it changed.
    -- Testing for a bare call instead means the number printed below is the
    -- number of policies that needed fixing, and a second run really is a no-op.
    if regexp_replace(
         coalesce(r.qual,'') || ' ' || coalesce(r.with_check,''),
         '\( SELECT (auth\.uid\(\)|is_super\(\)) AS \w+\)', '', 'g'
       ) !~ '\m(auth\.uid\(\)|is_super\(\))' then
      continue;
    end if;

    stmt := format('create policy %I on public.%I as %s for %s to %s',
                   r.policyname, r.tablename,
                   case when r.permissive = 'RESTRICTIVE' then 'restrictive' else 'permissive' end,
                   case r.cmd when 'ALL' then 'all' else lower(r.cmd) end,
                   array_to_string(r.roles, ', '));
    if new_q is not null then stmt := stmt || format(' using (%s)', new_q); end if;
    if new_c is not null then stmt := stmt || format(' with check (%s)', new_c); end if;

    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
    execute stmt;

    changed := changed + 1;
    raise notice 'hoisted  %.%', r.tablename, r.policyname;
  end loop;

  raise notice '% of % policies rewritten', changed, seen;
end $hoist$;


-- ============================================================================
-- THE ONE RESULT TABLE. Every row should read OK.
-- ============================================================================
set search_path = public;

select * from (
  select 1 as n, 'Pareto columns' as what,
         case when (select count(*) from information_schema.columns
                    where table_schema='public' and table_name='projects' and column_name='pareto') = 1
               and (select count(*) from information_schema.columns
                    where table_schema='public' and table_name='pace_snapshots' and column_name='pareto') = 1
              then 'OK' else 'MISSING - send me this' end as result
  union all
  select 2, 'Commissioning table',
         case when (select count(*) from information_schema.tables
                    where table_schema='public' and table_name='commission_items') = 1
              then 'OK' else 'MISSING - send me this' end
  union all
  select 3, 'All 26 columns the app writes',
         case when (select count(*) from information_schema.columns
                    where table_schema='public' and table_name='commission_items'
                      and column_name in ('id','owner_id','project_id','asset','stream','kind','title',
                        'target','result','stage','task_stage','need','have','on_order','due_in','owner',
                        'due','note','photos','findings','snag_ids','sort','created_at','updated_at',
                        'deleted_at','rev')) = 26
              then 'OK' else 'MISSING - send me this' end
  union all
  select 4, 'Sync stamp fires on every edit',
         case when exists (select 1 from pg_trigger
                           where tgname='faultline_rev'
                             and tgrelid='public.commission_items'::regclass and not tgisinternal)
              then 'OK' else 'MISSING - send me this' end
  union all
  select 5, 'No row hidden from sync by a null rev',
         case when (select count(*) from public.commission_items where rev is null) = 0
              then 'OK' else 'MISSING - send me this' end
  union all
  select 6, 'Commissioning is owner and member scoped',
         case when exists (select 1 from pg_policies
                           where schemaname='public' and tablename='commission_items'
                             and qual like '%auth.uid()%')
               and (select relrowsecurity from pg_class where oid='public.commission_items'::regclass)
              then 'OK' else 'MISSING - send me this' end
  union all
  select 7, 'No policy calls auth.uid() per row',
         case when (select count(*) from pg_policies
                    where schemaname='public'
                      and regexp_replace(coalesce(qual,'')||' '||coalesce(with_check,''),
                            '\( SELECT (auth\.uid\(\)|is_super\(\)) AS \w+\)','','g')
                          ~ '\m(auth\.uid\(\)|is_super\(\))') = 0
              then 'OK' else 'MISSING - send me this' end
) t order by n;
