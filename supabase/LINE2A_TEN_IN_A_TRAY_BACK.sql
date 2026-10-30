-- LINE2A_TEN_IN_A_TRAY_BACK — the 7-station "10 in a tray" Line capacity brought back, on the live Line 2A.
--
-- Rowland, 30 October: "I also asked for my line standard to be returned there — 2 of them were made — I want
-- them to be part of Line 2A now."
--
-- Line 2a's capacity standards, all still in the database (a delete is soft):
--   14f7f8e0  "all"           7 stations  LIVE — moved onto Line 2A by LINE2A_STANDARD_ONTO_LIVE_LINE.sql
--   2c16a973  "10 in a tray"  7 stations  on the dual line "2a 2b", made 15 Oct 07:58, deleted 15 Oct 18:19  <- this file
--   9c7171af  "10 in a tray"  5 stations  on Line 2a, made 14 Oct, deleted 14 Oct 11:22 (an earlier version)
--   58bf7980  "test"          2 stations  on Line 2a, deleted 15 Oct
-- "all" was made at 19:57 on 15 Oct, right after 2c16a973 was deleted — it looks like its replacement; the fuller,
-- later "10 in a tray" is the one brought back. The two older ones stay deleted until Rowland says otherwise.
--
-- It has no project (project_id null), so the agreement guard (faultline_keep_agreement) does not act on it.
-- Un-deleting it is the same row, the same stations; nothing is copied. rev is bumped by the updated_at write the
-- way the app's own write does, so every device pulls it.
--
-- Run ONCE. Safe to re-run: it acts only while the standard is deleted or off Line 2A.

do $$
declare ms bigint := (extract(epoch from now()) * 1000)::bigint;
begin
  update public.standards
     set workspace_id = '9ac1b2ae-5266-4e0a-b598-d82a206051c9', deleted_at = null, updated_at = ms
   where id = '2c16a973-d4a4-4dcc-8589-a2e7c4a1ab99'
     and project_id is null
     and (deleted_at is not null or workspace_id <> '9ac1b2ae-5266-4e0a-b598-d82a206051c9');
end $$;

-- What it did, read back.
select s.id, s.product, w.name as line, s.project_id, (s.deleted_at is not null) as deleted,
       jsonb_array_length(coalesce(s.capacity->'stations', '[]'::jsonb)) as stations
from public.standards s left join public.workspaces w on w.id = s.workspace_id
where s.workspace_id = '9ac1b2ae-5266-4e0a-b598-d82a206051c9' order by s.product;
