-- ============================================================================
-- FAULTLINE — WHICH OF THE EIGHT WASTES A PROBLEM IS. Run ONCE. Safe to re-run.
--
-- FC-005, the waste walk (knowledge/specs/FC-005-waste-walk.md; 1 November 2026): Ohno's seven wastes and
-- Liker's eighth, picked on a problem of the register as it is looked at — so a walk's findings can be
-- counted by kind and by place and priced by the line's own cost model (lib/problemCost), with no new
-- record: a waste is a problem that says which waste it is.
--
-- One column on the register's problems (snags):
--   waste   text — transport · inventory · motion · waiting · overproduction · overprocessing · defects ·
--           talent; or 'none', the answer "not a waste" (told apart from null, "not classed yet").
--
-- The app sends the column only for a problem that has been classed, so a problem never classed is
-- unaffected whether or not this has been run — but a CLASSED problem is refused by the cloud until it is.
-- ============================================================================

alter table public.snags add column if not exists waste text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'snags_waste_kind') then
    alter table public.snags add constraint snags_waste_kind
      check (waste is null or waste in ('transport', 'inventory', 'motion', 'waiting', 'overproduction', 'overprocessing', 'defects', 'talent', 'none'));
  end if;
end $$;

select column_name, data_type,
  (select pg_get_constraintdef(oid) from pg_constraint where conname = 'snags_waste_kind') as rule
from information_schema.columns
where table_schema = 'public' and table_name = 'snags' and column_name = 'waste';
