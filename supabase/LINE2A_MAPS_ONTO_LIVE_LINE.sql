-- LINE2A_MAPS_ONTO_LIVE_LINE — Line 2a/2b's Line standard MAPS put on the live Line 2A; the wrongly restored capacity undone.
--
-- Rowland, 30 October: "it was line standard maps — 2a & 2b and 2a line standards … I want them to be part of
-- Line 2A now." He meant the Line standard (the drawn board), not Line capacity.
--
-- The two maps still alive, both on the archived dual line "2a 2b" (e89f5039), 54 marks each:
--   374e1f72  "Line 2a & 2b Baskets"   made 13 Oct
--   5b9f0fd7  "Line 2a and 2b mu's"    made 22 Oct
-- Older versions stay deleted (superseded): "Line 2a & 2b MU'S", "Line 2a &2b baskets v2" (16 Oct).
-- The only record on the archived project "Line 2 A" was an empty map (BDU, deleted 6 Oct) — nothing to bring.
--
-- Both have no project (project_id null), so the agreement guard does not act on them. Moved to Line 2A (9ac1b2ae);
-- same rows, same marks — nothing copied.
--
-- ALSO UNDONE: LINE2A_TEN_IN_A_TRAY_BACK.sql un-deleted a Line CAPACITY record ("10 in a tray", 2c16a973) on the
-- wrong reading of the request. It is put back as it was: deleted, on the 2a 2b line. (Line capacity "all" stays on
-- Line 2A, where LINE2A_STANDARD_ONTO_LIVE_LINE.sql moved it — a relocation of a live record, Rowland may delete it.)
--
-- Run ONCE. Safe to re-run.

do $$
declare ms bigint := (extract(epoch from now()) * 1000)::bigint;
begin
  update public.standards set workspace_id = '9ac1b2ae-5266-4e0a-b598-d82a206051c9', updated_at = ms
   where (id::text like '374e1f72-%' or id::text like '5b9f0fd7-%')
     and workspace_id = 'e89f5039-2c6d-484b-af1c-2d1e4ad2da7b'
     and project_id is null and deleted_at is null;

  update public.standards set workspace_id = 'e89f5039-2c6d-484b-af1c-2d1e4ad2da7b', deleted_at = 1792088366663, updated_at = ms
   where id = '2c16a973-d4a4-4dcc-8589-a2e7c4a1ab99' and project_id is null and deleted_at is null;
end $$;

select s.id, s.product, w.name as line, (s.deleted_at is not null) as deleted,
       jsonb_array_length(coalesce(s.marks,'[]'::jsonb)) as marks, jsonb_array_length(coalesce(s.capacity->'stations','[]'::jsonb)) as stations
from public.standards s left join public.workspaces w on w.id = s.workspace_id
where s.workspace_id = '9ac1b2ae-5266-4e0a-b598-d82a206051c9' or s.id = '2c16a973-d4a4-4dcc-8589-a2e7c4a1ab99' order by s.product;
