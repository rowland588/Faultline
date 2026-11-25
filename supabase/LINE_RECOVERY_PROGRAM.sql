-- A project can carry a scenario programme independently of its improvement method.
-- One or several shared factory lines are still in pace_ppm. No new table or policy.
-- The project owner (and superuser) may change the programme; the existing
-- faultline_keep_agreement trigger retains it on updates by other members.

alter table public.projects add column if not exists program_key text;

do $m$
begin
  if not exists (select 1 from pg_constraint where conname = 'projects_program_key_check' and conrelid = 'public.projects'::regclass) then
    alter table public.projects add constraint projects_program_key_check
      check (program_key is null or program_key in ('line-recovery'));
  end if;
end
$m$;

comment on column public.projects.program_key is
  'Optional scenario programme. line-recovery is the consultant journey across one or more shared factory lines; method is chosen separately.';

do $m$
declare
  def text;
  anchor constant text := E'    new.method          := old.method;\n';
begin
  select pg_get_functiondef('public.faultline_keep_agreement()'::regprocedure) into def;
  if position('new.program_key' in def) = 0 then
    if position(anchor in def) = 0 then
      raise exception 'faultline_keep_agreement() has no expected method anchor; programme guard not applied';
    end if;
    def := replace(def, anchor, anchor || E'    -- The engagement programme is agreed by the project owner.\n    new.program_key     := old.program_key;\n');
    execute def;
  end if;
  if position('new.program_key' in pg_get_functiondef('public.faultline_keep_agreement()'::regprocedure)) = 0 then
    raise exception 'faultline_keep_agreement() does not retain program_key';
  end if;
end
$m$;
