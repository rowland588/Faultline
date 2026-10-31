-- FAULTLINE — a project is a method (docs/METHODS.md, slice M2)
--
-- Rowland, 31 October: "the method equals the project … build the methods first".
-- A project is one of eight methods (src/lib/methods.ts): PDCA, DMAIC, 8D, A3,
-- stage gate, Kaizen event, Improvement Kata, Theory of Constraints. Today a
-- project's kind is two booleans (lever_tree, commissioning — src/lib/planModel.ts),
-- chosen to avoid a migration; eight methods need a column of their own.
--
-- Nothing is rewritten. `method` is null for every project that exists: the app
-- reads one that is null from its two booleans, as it always has (a stage-gate
-- job is still the stage-gate method, a 6M board still opens as it does).
-- New projects, from slice M3, carry their method here.
--
-- The method is AGREED, like commissioning and lever_tree: only the owner changes
-- it. faultline_keep_agreement() (the trigger that keeps the agreed fields from
-- anyone but the owner) is re-created from its LIVE definition with one line
-- added, never retyped, so nothing else in it can drift; it stops with an error
-- if the line did not go in.
--
-- Run ONCE. Safe to re-run: the column and the check are created if missing, and
-- the function is touched only if it does not already keep `method`.

alter table public.projects
  add column if not exists method text;

do $m$
begin
  if not exists (select 1 from pg_constraint where conname = 'projects_method_check' and conrelid = 'public.projects'::regclass) then
    alter table public.projects
      add constraint projects_method_check
      check (method is null or method in ('pdca', 'dmaic', 'eight-d', 'a3', 'stage-gate', 'kaizen-event', 'kata', 'toc'));
  end if;
end
$m$;

comment on column public.projects.method is
  'The method this project runs (src/lib/methods.ts): pdca, dmaic, eight-d, a3, stage-gate, kaizen-event, kata or toc. Null: read from lever_tree / commissioning, as before. Agreed — only the owner changes it.';

do $m$
declare
  def text;
  anchor constant text := E'    new.lever_tree      := old.lever_tree;\n';
begin
  select pg_get_functiondef('public.faultline_keep_agreement()'::regprocedure) into def;
  if position('new.method' in def) = 0 then
    if position(anchor in def) = 0 then
      raise exception 'faultline_keep_agreement() is not as PROJECT_METHOD.sql expects — the lever_tree line was not found; nothing changed';
    end if;
    def := replace(def, anchor, anchor || E'    -- THE METHOD IT RUNS (PROJECT_METHOD.sql): agreed, so the owner''s.\n    new.method          := old.method;\n');
    execute def;
  end if;
  if position('new.method' in pg_get_functiondef('public.faultline_keep_agreement()'::regprocedure)) = 0 then
    raise exception 'faultline_keep_agreement() does not keep method after the change';
  end if;
end
$m$;

-- what it did, printed back
select
  (select column_name || ' ' || data_type from information_schema.columns
    where table_schema = 'public' and table_name = 'projects' and column_name = 'method') as method_column,
  (select pg_get_constraintdef(oid) from pg_constraint where conname = 'projects_method_check') as method_check,
  (position('new.method' in pg_get_functiondef('public.faultline_keep_agreement()'::regprocedure)) > 0) as owner_keeps_method;
