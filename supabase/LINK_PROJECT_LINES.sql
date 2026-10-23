-- LINK A PROJECT'S LINE TO THE FACTORY LINE OF ITS NAME (23 October)
--
-- Rowland, 23 October: "i had programs in there today on line 2a now nothing". His project "Line 2 A" kept its
-- line, "Line 2A", from 2 October — before Your factory existed (13 October). The factory's "Line 2a" was made
-- afterwards, and the two were never joined: a project's line finds the factory's line of its name only when the
-- line is made (lib/lines factoryLineFor). So the project's three programs, on its Pick and Place, read on no
-- factory line, and the factory's Line 2a showed none.
--
-- This joins every project line that still names no factory line to the one live factory line of the same name
-- (case and spaces aside) — on 23 October that is the one row, "Line 2A" → "Line 2a". Nothing is deleted; a line
-- with no factory line of its name, or with two, is left as it is. updated_at moves so every device pulls it
-- (faultline_stamp_rev moves its rev).
--
-- Run ONCE. Safe to re-run: a line already joined is not touched.

with match as (
  select l.id, min(w.id::text) as ws, count(*) as n
  from public.pace_ppm l
  join public.workspaces w
    on w.deleted_at is null
   and lower(regexp_replace(trim(w.name), '\s+', ' ', 'g')) = lower(regexp_replace(trim(l.name), '\s+', ' ', 'g'))
  where l.workspace_id is null and l.deleted_at is null
  group by l.id
)
update public.pace_ppm l
   set workspace_id = m.ws,
       updated_at = (extract(epoch from now()) * 1000)::bigint
  from match m
 where l.id = m.id and m.n = 1;

select l.id, l.name, l.project_id, l.workspace_id, w.name as factory_line, l.updated_at, l.rev
  from public.pace_ppm l left join public.workspaces w on w.id::text = l.workspace_id
 where l.id = '6a27fbc5-041a-4de2-a2e4-6f46f6e3889d';
