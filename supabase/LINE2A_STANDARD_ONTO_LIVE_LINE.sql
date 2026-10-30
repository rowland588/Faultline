-- LINE2A_STANDARD_ONTO_LIVE_LINE — Line 2a's capacity "all" put on the live Line 2A.
--
-- Rowland, 30 October: "we had 2 line standards in the old line 2 project ... put it in Line 2A that
-- we have now."
--
-- The old Line 2a (workspace 9392c23a) and its installation project "Line 2 A" (7a1ad93e) are archived.
-- What was kept for them, all still in the database (a delete here is soft):
--   14f7f8e0  "all"          Line capacity, 7 stations on two lanes (Line A, Line B)  LIVE, on old Line 2a
--   9c7171af  "10 in a tray" Line capacity, 5 stations                                deleted 15 Oct
--   58bf7980  "test"         Line capacity, 2 stations                                deleted 15 Oct
--   d50f1330  "line 2 fully automated pick and place, de-staker - BDU"  empty (no marks, no stations)
--             on the archived project, deleted 6 Oct
--
-- This moves the one that is still live onto the live Line 2A (workspace 9ac1b2ae). It has no project, so
-- nothing guards it (faultline_keep_agreement acts only on a record that belongs to a project). The three
-- deleted ones are left deleted until Rowland says which he wants back.
--
-- Run ONCE. Safe to re-run: it only acts while the standard is still on the old line.

do $$
declare ms bigint := (extract(epoch from now()) * 1000)::bigint;
begin
  update public.standards set workspace_id = '9ac1b2ae-5266-4e0a-b598-d82a206051c9', updated_at = ms
    where id = '14f7f8e0-6898-4372-b17e-49ea45fa5d2e'
      and workspace_id = '9392c23a-96f9-4e14-83cd-67e1e62342a0'
      and project_id is null;
end $$;

-- What it did, read back.
select s.id, s.product, s.workspace_id, w.name as line, s.project_id, (s.deleted_at is not null) as deleted,
       jsonb_array_length(coalesce(s.capacity->'stations', '[]'::jsonb)) as stations
from public.standards s left join public.workspaces w on w.id = s.workspace_id
where s.id = '14f7f8e0-6898-4372-b17e-49ea45fa5d2e';
