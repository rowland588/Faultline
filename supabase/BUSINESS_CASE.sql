-- ============================================================================
-- FAULTLINE — THE CASE FOR THE CHANGE. Run ONCE. Safe to re-run.
--
-- Rowland, 17 October, with a list of forty project-management practices:
-- "at its core faultline is a project management system ... what we could
-- introduce into faultline that would make it more powerful". A job said
-- when it hands over, never what it is FOR in money, and after the handover
-- nothing said whether it paid (docs/CASE.md, docs/BLUEPRINT.md §6, 12).
--
--   business_case   the job's case, agreed once by its owner: what it is for
--                   (a sentence), each line's rate before and the rate it is
--                   for, the days it runs a week, the day it should start
--                   paying, who agreed it and when. One JSON object, read and
--                   written whole, never queried into.
--
-- What it is worth is never stored: it is worked out from the line's own
-- shifts and margin a pack (lib/businessCase, the one cost model), so a
-- margin changed in Your factory changes the case on every page at once.
--
-- AGREED, SO THE OWNER'S. faultline_keep_agreement keeps it for anyone but
-- the job's owner, as it keeps the handover dates — the same function as
-- PERFORMANCE_RUNS.sql left it, with the one line added.
-- ============================================================================

alter table public.projects add column if not exists business_case jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'projects_business_case_object') then
    alter table public.projects add constraint projects_business_case_object
      check (business_case is null or jsonb_typeof(business_case) = 'object');
  end if;
end $$;

create or replace function public.faultline_keep_agreement()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
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

select 'projects.' || column_name as what, data_type as how
from information_schema.columns
where table_schema = 'public' and table_name = 'projects' and column_name = 'business_case'
union all
select 'constraint ' || conname, pg_get_constraintdef(oid)
from pg_constraint where conname = 'projects_business_case_object'
union all
select 'function faultline_keep_agreement',
       case when pg_get_functiondef('public.faultline_keep_agreement()'::regprocedure) like '%new.business_case   := old.business_case;%'
            then 'keeps business_case for the owner' else 'NOT updated' end;
