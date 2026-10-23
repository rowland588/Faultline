-- ============================================================================
-- FAULTLINE — A LINE MADE OF OTHER LINES (a dual line). Run ONCE. Safe to re-run.
--
-- Rowland, 23 October: "2a 2b are 2 lines but they happen to be a dual line ...
-- I have experiment happening in 2b and 2a and I also have to run other tools
-- on both. I call it then 2a 2b. It's not a mistake." So a line of the factory
-- may be made of other lines: "2a 2b" is Line 2a and line 2b run together. It
-- keeps its own tools and problems as before; each line it is made of says it
-- is part of it, and the combined line report of each reads the work on it
-- (docs/STRUCTURE.md §20, 23 October).
--
--   made_of   the ids of the factory lines this line is made of, as a JSON
--             array of strings; null (or empty) for an ordinary line
--
-- The workspaces' policies cover every column; nothing else changes. Then the
-- one dual line on the live factory is said to be what it is: "2a 2b", made
-- of "Line 2a" and "line 2b" — only if all three are there by those names and
-- it says nothing yet.
-- ============================================================================

alter table public.workspaces add column if not exists made_of jsonb;

update public.workspaces d
   set made_of = jsonb_build_array(a.id::text, b.id::text),
       updated_at = (extract(epoch from now()) * 1000)::bigint
  from public.workspaces a, public.workspaces b
 where d.deleted_at is null and a.deleted_at is null and b.deleted_at is null
   and lower(trim(d.name)) = '2a 2b'
   and lower(trim(a.name)) = 'line 2a'
   and lower(trim(b.name)) = 'line 2b'
   and (d.made_of is null or d.made_of = '[]'::jsonb);

select w.name, w.made_of,
       (select string_agg(m.name, ' + ' order by m.name) from public.workspaces m
         where w.made_of ? m.id::text) as made_of_names
  from public.workspaces w
 where w.deleted_at is null
 order by w.name;
