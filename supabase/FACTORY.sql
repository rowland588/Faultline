-- ============================================================================
-- FAULTLINE — YOUR FACTORY: each production line's type and its place on the
-- floor. Run ONCE. Safe to re-run.
--
-- Rowland, 13 October: "build a stronger backbone ... a factory setup before
-- the new projects ... your production lines. So then we were able to assign
-- everything to a production line ... build your factory, edit your factory,
-- let me put more lines, change the types, the names of the lines. Again,
-- always full edit control."
--
-- A production line is a workspace (every problem, study and standard already
-- hangs off one). Two more things it carries:
--   line_type    what kind of line it is, in the factory's own words
--                ("Packing", "Processing", "Filling") — free words, a list
--                offered from the factory's own types
--   floor_order  where it sits in the factory, the order the lines are
--                listed in everywhere (the control room, the rail, the
--                Problems page); blank sorts after, by name
-- Nothing else changes: the workspaces' policies cover every column.
-- ============================================================================

alter table public.workspaces add column if not exists line_type text;
alter table public.workspaces add column if not exists floor_order integer;

select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'workspaces' and column_name in ('line_type', 'floor_order')
order by column_name;
