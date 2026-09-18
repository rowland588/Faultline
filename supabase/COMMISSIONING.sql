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

-- set search_path = '' because Supabase's own linter flags a SECURITY-relevant
-- function without one (0011_function_search_path_mutable): a caller could
-- otherwise shift what an unqualified name resolves to. Everything inside is
-- schema-qualified already, so pinning it changes nothing but the warning.
create or replace function public.faultline_stamp_rev() returns trigger language plpgsql
set search_path = ''
as $stamp$
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

-- CHECK: expect one row reading ready ✓. Anything else means re-run this file.
select 'commission_items' as item,
       case when exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'commission_items' and column_name = 'rev')
             and exists (select 1 from pg_trigger where tgname = 'faultline_rev' and tgrelid = 'public.commission_items'::regclass)
             and exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'commission_items')
            then 'ready ✓' else 'MISSING — rerun' end as value;
