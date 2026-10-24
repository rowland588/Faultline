-- ============================================================================
-- FAULTLINE — THE REJECTS A PROBLEM CAUSES AND THE PRODUCT IT HOLDS. Run ONCE. Safe to re-run.
--
-- Rowland, 24 October: "all tools made or that will be made will have cost
-- in ... the cost is merely one of the outputs ... if the user doesn't have
-- that information then the app must handle it gracefully, don't block
-- anything." knowledge/MONEY.md §4, FC-154 part 2 (knowledge/specs/
-- FC-154-problem-cost.md): a problem on the register may say the rejects a
-- day it causes (packs thrown away — priced at the line's materials a pack,
-- causation M) and the packs it holds (money tied up at their materials,
-- causation H — said as tied up, never as a daily loss). The materials a
-- pack is the line's typical figure, typed once in Set up the line beside
-- the margin a pack — the one cost model's one new input (MONEY.md §3).
--
-- Two columns on the register's problems (snags), one on the lines (workspaces):
--   snags.rejects_per_day        numeric — packs a day thrown away because of it
--   snags.held_packs             numeric — packs on hold because of it, now
--   workspaces.materials_per_pack numeric — £ a pack's materials, the line's typical figure
-- ============================================================================

alter table public.snags add column if not exists rejects_per_day numeric;
alter table public.snags add column if not exists held_packs numeric;
alter table public.workspaces add column if not exists materials_per_pack numeric;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'snags_rejects_per_day_sane') then
    alter table public.snags add constraint snags_rejects_per_day_sane
      check (rejects_per_day is null or (rejects_per_day >= 0 and rejects_per_day <= 10000000));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'snags_held_packs_sane') then
    alter table public.snags add constraint snags_held_packs_sane
      check (held_packs is null or (held_packs >= 0 and held_packs <= 100000000));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'workspaces_materials_per_pack_sane') then
    alter table public.workspaces add constraint workspaces_materials_per_pack_sane
      check (materials_per_pack is null or materials_per_pack >= 0);
  end if;
end $$;

select table_name, column_name, data_type,
  (select pg_get_constraintdef(oid) from pg_constraint where conname = table_name || '_' || column_name || '_sane') as rule
from information_schema.columns
where table_schema = 'public' and ((table_name = 'snags' and column_name in ('rejects_per_day', 'held_packs'))
  or (table_name = 'workspaces' and column_name = 'materials_per_pack'))
order by table_name, column_name;
