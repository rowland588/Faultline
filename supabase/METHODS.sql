-- ============================================================================
-- FAULTLINE — METHODS AS DATA: the method a project runs, the steps done and
-- gates passed under it, and who changed what. Run ONCE. Safe to re-run.
--
-- Rowland, 18 October: "A user should eventually be able to describe what
-- they need in ordinary language ... The outcome must be more than a
-- generated document, checklist or AI conversation. It must become a real,
-- working part of the application." Until now every method was code (the
-- method two booleans on a project; the stage gate's gates a check
-- constraint on tests). This is the data a method needs to be written,
-- approved, run, changed and audited without a line of code
-- (docs/PLATFORM-REVIEW.md §6; docs/PLATFORM-STATUS.md; src/lib/flow/).
--
--   methods        a definition, versioned. One row a version; every version
--                  of one method shares family_id. Drafts change; an ACTIVE
--                  version never does — a change is a new version — and the
--                  guard below keeps that true in the database, not only on
--                  the screen.
--   flow_records   on a project running a method: a step done (kind 'step')
--                  or a gate passed (kind 'gate'). The shape of a stage
--                  gate's test, kept apart from `tests` so nothing that reads
--                  tests across projects reads these by mistake.
--   activity_log   who did what, when, and whether it began as the
--                  assistant's proposal. Written once; never changed, never
--                  deleted.
--   projects.flow  which method (family and version) a project runs, when it
--                  started, and who does each role. Agreed, so the owner's.
--
-- WHO MAY DO WHAT (src/lib/access.ts; ACCESS_LEVELS.sql):
--   methods        their author writes them; anybody on a project that runs
--                  one reads it.
--   flow_records   a project's members read; the owner and the team write;
--                  a client reads only (restrictive policies, as every job
--                  table). PASSING A GATE is agreeing the stage is finished:
--                  the owner's (or the administrator's) alone. Deleting is
--                  the owner's (faultline_keep_agreement keeps deleted_at).
--   activity_log   its author and the project's members read it; the owner
--                  and the team add to it; nobody changes or deletes it (the
--                  guard returns the row as it was — the sync never stalls).
--
-- Applied 18 October with flow_records.stage_key and .step_key; FLOW_MEDIA.sql
-- renamed them stage and step the same day, before any row existed. The
-- table is written here as it now stands.
--
-- The shared guard faultline_keep_agreement is replaced here with ONE line
-- added (projects: new.flow := old.flow). It was read back live on 18
-- October before this file was written, so the replacement is today's
-- function plus that line — never an older copy (CLAUDE.md, "The files in
-- supabase/ are a history").
-- ============================================================================

-- ---------------------------------------------------------------- the method
create table if not exists public.methods (
  id            text primary key,
  owner_id      uuid not null default auth.uid(),
  family_id     text not null,
  version       integer not null,
  status        text not null default 'draft',
  definition    jsonb not null,
  parent_id     text,
  origin        text,
  change_note   text,
  approved_by   text,
  approved_at   bigint,
  created_at    bigint not null,
  updated_at    bigint not null,
  deleted_at    bigint
);

do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'methods_status_check') then
    alter table public.methods add constraint methods_status_check check (status in ('draft', 'active', 'retired'));
  end if;
end $c$;

create index if not exists methods_owner_idx  on public.methods (owner_id);
create index if not exists methods_family_idx on public.methods (family_id);

-- ---------------------------------------------------------------- steps done, gates passed
create table if not exists public.flow_records (
  id            text primary key,
  owner_id      uuid not null default auth.uid(),
  project_id    text not null,
  kind          text not null default 'step',
  stage         text not null,
  step          text,
  asset_id      text,
  version       integer not null default 1,
  outcome       text not null default 'planned',
  planned_for   text,
  done_on       text,
  who           text,
  "values"      jsonb,
  note          text,
  signed_by     text,
  open_at_sign  jsonb,
  media         jsonb,
  docs          jsonb,
  study_id      text,
  override      text,
  open_at_pass  jsonb,
  checks        jsonb,
  sort          double precision not null default 0,
  created_at    bigint not null,
  updated_at    bigint not null,
  deleted_at    bigint
);

do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'flow_records_kind_check') then
    alter table public.flow_records add constraint flow_records_kind_check check (kind in ('step', 'gate'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'flow_records_outcome_check') then
    alter table public.flow_records add constraint flow_records_outcome_check check (outcome in ('planned', 'done', 'failed', 'notRun'));
  end if;
end $c$;

create index if not exists flow_records_project_idx on public.flow_records (project_id);

-- ---------------------------------------------------------------- who changed what
create table if not exists public.activity_log (
  id            text primary key,
  owner_id      uuid not null default auth.uid(),
  project_id    text,
  method_id     text,
  who           text not null default '',
  at            bigint not null,
  op            text not null,
  summary       text not null default '',
  source        text not null default 'person',
  target        jsonb,
  detail        jsonb,
  created_at    bigint not null,
  updated_at    bigint not null
);

do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'activity_log_source_check') then
    alter table public.activity_log add constraint activity_log_source_check check (source in ('person', 'assistant'));
  end if;
end $c$;

create index if not exists activity_log_project_idx on public.activity_log (project_id) where project_id is not null;
create index if not exists activity_log_owner_idx   on public.activity_log (owner_id);

-- ---------------------------------------------------------------- the project's method
alter table public.projects add column if not exists flow jsonb;

-- ---------------------------------------------------------------- sync transport: the rev stamp, the clock, the owner
alter table public.methods      add column if not exists rev bigint;
alter table public.flow_records add column if not exists rev bigint;
alter table public.activity_log add column if not exists rev bigint;

create or replace trigger faultline_rev before insert or update on public.methods
  for each row execute function public.faultline_stamp_rev();
create or replace trigger faultline_rev before insert or update on public.flow_records
  for each row execute function public.faultline_stamp_rev();
create or replace trigger faultline_rev before insert or update on public.activity_log
  for each row execute function public.faultline_stamp_rev();

create or replace trigger faultline_clamp_clock before insert or update on public.methods
  for each row execute function public.faultline_clamp_clock();
create or replace trigger faultline_clamp_clock before insert or update on public.flow_records
  for each row execute function public.faultline_clamp_clock();

create or replace trigger faultline_keep_owner before update on public.methods
  for each row execute function public.faultline_keep_owner();
create or replace trigger faultline_keep_owner before update on public.flow_records
  for each row execute function public.faultline_keep_owner();

update public.methods      set rev = nextval('public.faultline_rev_seq') where rev is null;
update public.flow_records set rev = nextval('public.faultline_rev_seq') where rev is null;
update public.activity_log set rev = nextval('public.faultline_rev_seq') where rev is null;
create index if not exists idx_methods_rev      on public.methods (rev);
create index if not exists idx_flow_records_rev on public.flow_records (rev);
create index if not exists idx_activity_log_rev on public.activity_log (rev);

do $p$ begin
  alter publication supabase_realtime add table public.methods;
exception when duplicate_object then null; when undefined_object then null; end $p$;
do $p$ begin
  alter publication supabase_realtime add table public.flow_records;
exception when duplicate_object then null; when undefined_object then null; end $p$;
do $p$ begin
  alter publication supabase_realtime add table public.activity_log;
exception when duplicate_object then null; when undefined_object then null; end $p$;

-- ---------------------------------------------------------------- who may: methods
alter table public.methods enable row level security;
do $r$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'methods' and policyname = 'own methods') then
    create policy "own methods" on public.methods for all to authenticated
      using (owner_id = (select auth.uid()))
      with check (owner_id = (select auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'methods' and policyname = 'methods a project runs') then
    create policy "methods a project runs" on public.methods for select to authenticated
      using (exists (
        select 1 from public.projects p
        where p.flow ->> 'familyId' = methods.family_id
          and p.deleted_at is null
          and public.is_project_member(p.id)
      ));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'methods' and policyname = 'no hard delete') then
    create policy "no hard delete" on public.methods as restrictive for delete using (false);
  end if;
end $r$;

-- An active version never changes; a retired one may come back into use; no
-- version goes back to being a draft. Kept, not refused, so a stale device's
-- edit lands harmlessly and the sync never stalls.
create or replace function public.faultline_keep_method()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.status in ('active', 'retired') then
    new.definition  := old.definition;
    new.version     := old.version;
    new.family_id   := old.family_id;
    new.parent_id   := old.parent_id;
    new.origin      := old.origin;
    new.approved_by := old.approved_by;
    new.approved_at := old.approved_at;
    if new.status = 'draft' then new.status := old.status; end if;
  end if;
  return new;
end $$;

create or replace trigger faultline_keep_method before update on public.methods
  for each row execute function public.faultline_keep_method();

-- ---------------------------------------------------------------- who may: flow_records
alter table public.flow_records enable row level security;
do $r$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'flow_records' and policyname = 'member flow select') then
    create policy "member flow select" on public.flow_records for select to authenticated
      using (public.is_project_member(project_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'flow_records' and policyname = 'member flow insert') then
    create policy "member flow insert" on public.flow_records for insert to authenticated
      with check (public.is_project_member(project_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'flow_records' and policyname = 'member flow update') then
    create policy "member flow update" on public.flow_records for update to authenticated
      using (public.is_project_member(project_id))
      with check (public.is_project_member(project_id));
  end if;
  -- RESTRICTIVE: writing also needs the owner, the administrator or the team.
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'flow_records' and policyname = 'editors only insert') then
    create policy "editors only insert" on public.flow_records as restrictive for insert to authenticated
      with check (public.is_project_editor(project_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'flow_records' and policyname = 'editors only update') then
    create policy "editors only update" on public.flow_records as restrictive for update to authenticated
      using (public.is_project_editor(project_id))
      with check (public.is_project_editor(project_id));
  end if;
  -- RESTRICTIVE: a gate is passed by the owner (or the administrator) alone.
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'flow_records' and policyname = 'gates are the owner''s insert') then
    create policy "gates are the owner's insert" on public.flow_records as restrictive for insert to authenticated
      with check (kind <> 'gate' or public.is_super() or public.is_project_owner(project_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'flow_records' and policyname = 'gates are the owner''s update') then
    create policy "gates are the owner's update" on public.flow_records as restrictive for update to authenticated
      using (kind <> 'gate' or public.is_super() or public.is_project_owner(project_id))
      with check (kind <> 'gate' or public.is_super() or public.is_project_owner(project_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'flow_records' and policyname = 'no hard delete') then
    create policy "no hard delete" on public.flow_records as restrictive for delete using (false);
  end if;
end $r$;

create or replace trigger faultline_keep_agreement before update on public.flow_records
  for each row execute function public.faultline_keep_agreement();

-- ---------------------------------------------------------------- who may: activity_log
alter table public.activity_log enable row level security;
do $r$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'activity_log' and policyname = 'own activity') then
    create policy "own activity" on public.activity_log for all to authenticated
      using (owner_id = (select auth.uid()))
      with check (owner_id = (select auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'activity_log' and policyname = 'project activity') then
    create policy "project activity" on public.activity_log for select to authenticated
      using (project_id is not null and public.is_project_member(project_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'activity_log' and policyname = 'editors only insert') then
    create policy "editors only insert" on public.activity_log as restrictive for insert to authenticated
      with check (project_id is null or public.is_project_editor(project_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'activity_log' and policyname = 'no hard delete') then
    create policy "no hard delete" on public.activity_log as restrictive for delete using (false);
  end if;
end $r$;

-- Written once: an update gives back the row as it was (the rev trigger,
-- after this one by name, still stamps it, so the sync settles).
create or replace function public.faultline_keep_activity()
returns trigger language plpgsql as $$
begin
  return old;
end $$;

create or replace trigger faultline_keep_activity before update on public.activity_log
  for each row execute function public.faultline_keep_activity();

-- ---------------------------------------------------------------- the project's method is agreed
-- Today's faultline_keep_agreement (read back live, 18 October) with one line
-- added in the projects branch: new.flow := old.flow.
create or replace function public.faultline_keep_agreement()
returns trigger language plpgsql security definer set search_path = public as $function$
declare pid text;
begin
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
    -- THE CASE FOR THE CHANGE (BUSINESS_CASE.sql): agreed, so the owner's.
    new.business_case   := old.business_case;
    -- THE METHOD IT RUNS (METHODS.sql): agreed, so the owner's.
    new.flow            := old.flow;
    new.owner_id        := old.owner_id;
  elsif tg_table_name = 'tests' then
    if coalesce(old.passes_if, '') <> '' then new.passes_if := old.passes_if; end if;
    if old.run_agreed is not null and old.run_agreed <> '{}'::jsonb then new.run_agreed := old.run_agreed; end if;
    -- THE PRODUCT RUNS (PERFORMANCE_RUNS.sql). The first time the list is
    -- written on a test that kept one run, that run's agreed numbers go onto
    -- its entry, so the move to a list cannot change them.
    if (old.runs is null or jsonb_array_length(old.runs) = 0)
       and old.run_agreed is not null and old.run_agreed <> '{}'::jsonb
       and new.runs is not null and jsonb_typeof(new.runs) = 'array' and jsonb_array_length(new.runs) > 0 then
      new.runs := (
        select jsonb_agg(case when e.v->>'id' = old.id || '-r1'
                              then e.v || jsonb_build_object('agreed', old.run_agreed) else e.v end
                         order by e.ord)
        from jsonb_array_elements(new.runs) with ordinality as e(v, ord)
      );
    end if;
    -- Each product already on the list keeps the agreed numbers it had, and
    -- one taken off the list comes back.
    if old.runs is not null and jsonb_typeof(old.runs) = 'array' and jsonb_array_length(old.runs) > 0 then
      new.runs := (
        select coalesce(jsonb_agg(x.v order by x.ord), '[]'::jsonb)
        from (
          select case when o.v is not null and coalesce(o.v->'agreed', '{}'::jsonb) <> '{}'::jsonb
                      then n.v || jsonb_build_object('agreed', o.v->'agreed') else n.v end as v,
                 n.ord as ord
          from jsonb_array_elements(case when jsonb_typeof(new.runs) = 'array' then new.runs else '[]'::jsonb end)
                 with ordinality as n(v, ord)
          left join lateral (
            select oo.v from jsonb_array_elements(old.runs) as oo(v)
            where oo.v->>'id' = n.v->>'id' limit 1
          ) as o on true
          union all
          select o.v, 1000000 + o.ord
          from jsonb_array_elements(old.runs) with ordinality as o(v, ord)
          where not exists (
            select 1 from jsonb_array_elements(case when jsonb_typeof(new.runs) = 'array' then new.runs else '[]'::jsonb end) as n(v)
            where n.v->>'id' = o.v->>'id'
          )
        ) as x
      );
    end if;
  elsif tg_table_name = 'cases' then
    new.status    := old.status;
    new.closed_at := old.closed_at;
  end if;
  return new;
end $function$;

-- ---------------------------------------------------------------- read back
select 'column' as what, table_name || '.' || column_name as name
  from information_schema.columns
 where table_schema = 'public' and (table_name in ('methods', 'flow_records', 'activity_log') or (table_name = 'projects' and column_name = 'flow'))
union all
select 'policy', tablename || ' · ' || policyname || ' · ' || permissive || ' · ' || cmd
  from pg_policies where schemaname = 'public' and tablename in ('methods', 'flow_records', 'activity_log')
union all
select 'trigger', c.relname || ' · ' || t.tgname
  from pg_trigger t join pg_class c on c.oid = t.tgrelid
 where not t.tgisinternal and c.relname in ('methods', 'flow_records', 'activity_log')
union all
select 'realtime', tablename from pg_publication_tables where pubname = 'supabase_realtime' and tablename in ('methods', 'flow_records', 'activity_log')
union all
select 'keeps flow', case when pg_get_functiondef('public.faultline_keep_agreement'::regproc) like '%new.flow%' then 'yes' else 'NO' end
order by 1, 2;
