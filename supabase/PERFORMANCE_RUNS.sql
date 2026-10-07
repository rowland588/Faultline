-- ============================================================================
-- FAULTLINE — A PERFORMANCE RUN IS MANY PRODUCTS. Run ONCE. Safe to re-run.
--
-- Rowland, 7 October: "At the moment I can only book in ONE commissioning
-- run. That is not how I operate. Commissioning runs are MULTIPLE PRODUCTS.
-- While I'm prepping I want to plan: these are the tests I'm going to do,
-- this is the product I'm going to run — Save. Next one — Save. Then on the
-- line all I do is put in the numbers, and it calculates whether it passed.
-- When would I ever commission one thing?"
--
-- One more thing a test (public.tests) can hold — a json ARRAY, one entry per
-- product down the machine (lib/run ProductRun):
--
--   runs   [{ id, product,
--             agreed: { rate, minutes, rejectsMax },      -- before the day
--             day:    { minutes, packs, rejects, speed, stops },
--             ranOn }]
--
-- The single run_agreed / run kept by PERFORMANCE_RUN.sql stay as they are:
-- the app reads them as the list's first product (id = the test's id || '-r1')
-- until the list is first written, and then writes the list whole. Nothing is
-- copied or moved here — no row is touched by this file.
--
-- WHAT WAS AGREED STAYS WITH THE OWNER, product by product, as a written
-- "passes if" and run_agreed already do (ACCESS_LEVELS.sql): for anyone but
-- the project's owner, faultline_keep_agreement now also
--   * puts back each existing product's `agreed` numbers once they are written
--     (a team member may write them the first time, never change them after);
--   * puts back a product taken off the list (deleting stays with the owner,
--     as every deleted_at already does);
--   * and, the first time the list is written on a test that kept one run,
--     puts the old run_agreed onto that run's entry ('<id>-r1').
-- The function below is PERFORMANCE_RUN.sql's, line for line, with that added
-- under the tests branch.
-- ============================================================================

alter table public.tests add column if not exists runs jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'tests_runs_array') then
    alter table public.tests add constraint tests_runs_array
      check (runs is null or jsonb_typeof(runs) = 'array');
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

select 'tests.' || column_name as what, data_type as how
from information_schema.columns
where table_schema = 'public' and table_name = 'tests' and column_name = 'runs'
union all
select 'constraint ' || conname, pg_get_constraintdef(oid)
from pg_constraint where conname = 'tests_runs_array'
union all
select 'function faultline_keep_agreement',
       case when pg_get_functiondef('public.faultline_keep_agreement()'::regprocedure) like '%PERFORMANCE_RUNS.sql%'
            then 'keeps each product''s agreed numbers' else 'NOT UPDATED' end;
