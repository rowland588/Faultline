-- ============================================================================
-- FAULTLINE — TESTING. THE WHOLE MODEL, IN TWO TABLES. Run ONCE. Safe to re-run.
--
-- Five rebuilds of this feature invented a process and asked the job to fit it:
-- a readiness checklist, six gates with pass criteria, a programme of phases,
-- one flat list grouped by stage, and then an asset × pack grid with material
-- supersession and A/B/C grades on everything. The person doing the job said it
-- plainly in the end:
--
--   "What do we plan to do. What machine. What's the pass, the expectation.
--    Then the day happens, and the day is fluid. What product did you run, what
--    was the result, but more importantly what issues did we find on the day.
--    Then we agree the next steps with the OEM, and that's what we do next.
--    It's a project cycle. Simple. Really simple."
--
-- So: ONE record per test, and ONE table for the two lists that hang off it.
--
-- THE PLAN IS NOT REWRITTEN AFTER THE DAY. planned_for against ran_on, planned
-- against product: two columns each, because the day is fluid and the gap
-- between what you meant to do and what you did is usually the story. A single
-- column that followed the result around would always report that everything
-- went to plan.
-- ============================================================================

create table if not exists public.tests (
  id           text primary key,
  owner_id     uuid not null default auth.uid(),
  project_id   text not null,

  -- the plan, written before the day
  title        text not null,
  asset_id     text,
  -- ISO dates (yyyy-mm-dd), not timestamps: a test happens on a DAY, and a
  -- midnight in some zone shows in Manchester as the day before it was stored.
  planned_for  text,
  passes_if    text,
  with_whom    text,
  planned      text,

  -- the day
  ran_on       text,
  product      text,
  result       text,
  -- planned | passed | failed | notRun. Text rather than an enum: adding a
  -- state to an enum takes a migration and a deploy in lockstep.
  outcome      text not null default 'planned',

  -- photos and video of the day, and any file somebody was sent. Metadata here,
  -- bytes through the media pipeline, exactly like a snag photo.
  media        jsonb,
  docs         jsonb,

  -- the loop: the test this one was planned from
  from_test_id text,

  sort         numeric not null default 0,
  created_at   bigint not null,
  updated_at   bigint not null,
  deleted_at   bigint
);

create index if not exists tests_project_idx on public.tests (project_id);
create index if not exists tests_owner_idx   on public.tests (owner_id);
create index if not exists tests_asset_idx   on public.tests (asset_id);

-- WHAT WE FOUND, and WHAT WE DO NEXT. One table, because they are the same
-- shape — a line of words, somebody's name, a date, and whatever was filmed —
-- and `kind` is the only thing that differs. Two tables would have bought a
-- second mapper and a second migration and nothing else.
create table if not exists public.test_items (
  id             text primary key,
  owner_id       uuid not null default auth.uid(),
  project_id     text not null,
  test_id        text not null,

  -- found | next
  kind           text not null,
  what           text not null,
  note           text,
  owner          text,
  due            text,
  done_at        bigint,
  media          jsonb,
  -- for a next step that became the next test
  became_test_id text,

  sort           numeric not null default 0,
  created_at     bigint not null,
  updated_at     bigint not null,
  deleted_at     bigint
);

create index if not exists test_items_project_idx on public.test_items (project_id);
create index if not exists test_items_owner_idx   on public.test_items (owner_id);
create index if not exists test_items_test_idx    on public.test_items (test_id);

-- ---------- sync transport: the rev stamp ----------
--
-- Not optional, and not per-table optional either. Devices pull with "rev > the
-- last rev I saw", and a table WITHOUT this column answers that query with
-- 42703 — which the app reads as "this cloud is too old for rev cursors",
-- degrading the pull for EVERY table for the rest of the session.

create sequence if not exists public.faultline_rev_seq;

create or replace function public.faultline_stamp_rev() returns trigger language plpgsql
set search_path = ''
as $stamp$
begin
  new.rev := nextval('public.faultline_rev_seq');
  return new;
end $stamp$;

do $rev$
declare t text;
begin
  foreach t in array array['tests', 'test_items'] loop
    execute format('alter table public.%I add column if not exists rev bigint', t);
    execute format('drop trigger if exists faultline_rev on public.%I', t);
    execute format('create trigger faultline_rev before insert or update on public.%I
                    for each row execute function public.faultline_stamp_rev()', t);
    -- A null rev is never greater than a cursor, so a row written by an earlier
    -- run would be invisible to every pull until somebody happened to edit it.
    execute format('update public.%I set rev = nextval(''public.faultline_rev_seq'') where rev is null', t);
    execute format('create index if not exists idx_%I_rev on public.%I (rev)', t, t);

    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception
      when duplicate_object then null;
      when undefined_object then null;
    end;

    execute format('alter table public.%I enable row level security', t);

    -- Scoped to the project, like everything else a project owns. auth.uid() is
    -- wrapped in (select …) so the planner hoists it to an InitPlan and runs it
    -- once per query rather than once per row, and the cheap owner_id test is
    -- written first so it short-circuits the membership function.
    execute format('drop policy if exists "project %s" on public.%I', t, t);
    if exists (select 1 from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
               where ns.nspname = 'public' and p.proname = 'is_project_member') then
      execute format('create policy "project %s" on public.%I for all to authenticated
                      using (owner_id = (select auth.uid()) or (select public.is_project_member(project_id)))
                      with check (owner_id = (select auth.uid()) or (select public.is_project_member(project_id)))', t, t);
    else
      execute format('create policy "project %s" on public.%I for all to authenticated
                      using (owner_id = (select auth.uid()))
                      with check (owner_id = (select auth.uid()))', t, t);
    end if;
  end loop;
end $rev$;

-- CHECK: expect two rows reading ready ✓.
select 'tests' as item,
       case when (select count(*) from information_schema.columns
                  where table_schema = 'public' and table_name = 'tests'
                    and column_name in ('title','asset_id','planned_for','passes_if','ran_on','product','result','outcome','media','docs','rev')) = 11
             and exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'tests')
            then 'ready ✓' else 'MISSING — rerun' end as value
union all
select 'test_items',
       case when (select count(*) from information_schema.columns
                  where table_schema = 'public' and table_name = 'test_items'
                    and column_name in ('test_id','kind','what','owner','due','done_at','media','rev')) = 8
             and exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'test_items')
            then 'ready ✓' else 'MISSING — rerun' end;
