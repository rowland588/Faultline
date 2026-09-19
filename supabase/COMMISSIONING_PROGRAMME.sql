-- ============================================================================
-- FAULTLINE — THE COMMISSIONING PROGRAMME. Run ONCE. Safe to re-run.
--
-- Commissioning was modelled as a readiness checklist: can we sign off, yes or
-- no. That is the finish line, and it left out the race. A line is commissioned
-- in stages, each needing the one before it to be true, and every question
-- anybody asks about a commissioning job is about TIME — is it going to be
-- ready, what has moved, what is holding it up.
--
-- So: one row per stage per project, carrying the date it was PLANNED for and
-- the date it is now FORECAST. Those two columns are the whole point. Without a
-- baseline nothing can be late, only due — which is how the first cut could
-- watch a handover slip three weeks and have nothing to say about it.
--
-- planned_at is written once, when the programme is agreed, and must never be
-- quietly rewritten afterwards: it is the thing every slip is measured from. A
-- system that lets the baseline follow the forecast around always reports that
-- everything is on time.
--
-- Plus one column on commission_items: which stage a row belongs to, and
-- therefore which gate it holds up.
-- ============================================================================

create table if not exists public.commission_phases (
  id           text primary key,
  owner_id     uuid not null default auth.uid(),
  project_id   text not null,

  -- fat | install | mechanical | sat | rate | handover. Text rather than an
  -- enum: adding a stage to an enum takes a migration and a deploy in lockstep,
  -- and this list will grow the first time somebody commissions something that
  -- is not a packaging line.
  phase_key    text not null,

  -- THE BASELINE and THE FORECAST. ISO dates (yyyy-mm-dd), not timestamps: a
  -- commissioning stage happens on a DAY, and storing a midnight in some zone
  -- invites the classic off-by-one where a date shown in Manchester is the day
  -- before the one stored.
  planned_at   text,
  forecast_at  text,

  -- Set when the gate is passed, with the name of whoever passed it. A gate
  -- passed by nobody is not passed, which is why both columns exist.
  passed_at    text,
  passed_by    text,

  owner        text,
  note         text,

  updated_at   bigint not null,
  deleted_at   bigint
);

-- One row per stage per project. Two devices creating the programme at the same
-- moment would otherwise leave a project with twelve phases and no way to tell
-- which six are real.
create unique index if not exists commission_phases_one_per_key
  on public.commission_phases (project_id, phase_key)
  where deleted_at is null;

create index if not exists commission_phases_project_idx
  on public.commission_phases (project_id);
create index if not exists commission_phases_owner_idx
  on public.commission_phases (owner_id);

-- Which stage an item belongs to, and therefore which gate it holds up. Null is
-- allowed and means exactly what it says: the row is on the line but gates
-- nothing. Every row written before this migration is in that state, which is
-- the honest reading of an item recorded when stages did not exist.
alter table public.commission_items add column if not exists phase_id text;
create index if not exists idx_commission_items_phase
  on public.commission_items (phase_id);

-- ---------- sync transport: the rev stamp ----------
--
-- Not optional. Devices pull with "rev > the last rev I saw", and a table
-- WITHOUT this column answers that query with 42703 — which the app reads as
-- "this cloud is too old for rev cursors", degrading the pull for every table
-- for the rest of the session. A new table missing three lines takes the snags
-- and the tracker down with it.
alter table public.commission_phases add column if not exists rev bigint;

create sequence if not exists public.faultline_rev_seq;

create or replace function public.faultline_stamp_rev() returns trigger language plpgsql
set search_path = ''
as $stamp$
begin
  new.rev := nextval('public.faultline_rev_seq');
  return new;
end $stamp$;

drop trigger if exists faultline_rev on public.commission_phases;
create trigger faultline_rev before insert or update on public.commission_phases
  for each row execute function public.faultline_stamp_rev();

-- A null rev is never greater than a cursor, so a row written by an earlier run
-- would be invisible to every pull until somebody happened to edit it.
update public.commission_phases set rev = nextval('public.faultline_rev_seq') where rev is null;

create index if not exists idx_commission_phases_rev on public.commission_phases (rev);

do $realtime$ begin
  execute 'alter publication supabase_realtime add table public.commission_phases';
exception
  when duplicate_object then null;   -- already published
  when undefined_object then null;   -- realtime disabled here
end $realtime$;

alter table public.commission_phases enable row level security;

-- Scoped to the project, exactly like commission_items: a person invited onto
-- the project must see the programme, or they open a line being handed over and
-- find an empty page with nothing to say why.
--
-- auth.uid() is wrapped in (select ...) so the planner hoists it to an InitPlan
-- and runs it once for the query rather than once per row. The owner_id test is
-- written first so the cheap comparison short-circuits the membership function
-- for the common case.
drop policy if exists commission_phases_own on public.commission_phases;
drop policy if exists "project commission_phases" on public.commission_phases;

do $rls$ begin
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and p.proname = 'is_project_member') then
    execute 'create policy "project commission_phases" on public.commission_phases for all to authenticated using (owner_id = (select auth.uid()) or (select public.is_project_member(project_id))) with check (owner_id = (select auth.uid()) or (select public.is_project_member(project_id)))';
  else
    execute 'create policy "project commission_phases" on public.commission_phases for all to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()))';
  end if;
end $rls$;

-- CHECK: expect one row reading ready ✓. Anything else means re-run this file.
select 'commission_phases' as item,
       case when exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'commission_phases' and column_name = 'rev')
             and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'commission_items' and column_name = 'phase_id')
             and exists (select 1 from pg_trigger where tgname = 'faultline_rev' and tgrelid = 'public.commission_phases'::regclass)
             and exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'commission_phases')
            then 'ready ✓' else 'MISSING — rerun' end as value;

-- ---------- stages you can change ----------
--
-- Six stages is how a packaging line is normally commissioned. It is a default,
-- not a law: the first job that wants "Trials" or "Vertical start-up" between
-- two of them must not need a migration and a deploy, and a system that insists
-- on its own process gets abandoned for the spreadsheet it replaced.
--
-- phase_key was already text rather than an enum for exactly this reason. These
-- two add the rest of it: a name somebody typed, and an explicit position so a
-- stage can be inserted between two others without renumbering every row after
-- it. Both additive; a stage that has never been renamed has phase_name null,
-- which is what it means.
alter table public.commission_phases add column if not exists phase_name text;
alter table public.commission_phases add column if not exists sort numeric not null default 0;

select 'commission_phases flexible' as item,
       case when (select count(*) from information_schema.columns
                  where table_schema = 'public' and table_name = 'commission_phases'
                    and column_name in ('phase_name','sort')) = 2
            then 'ready ✓' else 'MISSING — rerun' end as value;
