-- Program 5 Express 1.25kg — 28 October 2026
-- Test 2 failed on net alone; the capability work that passed is the tick study
-- "Express 70 ppm for 30 min with 1 person levelling packs" (2112 readings,
-- Proved by on test 5d22413c…). The criterion had pointed at the empty
-- "Express 75 ppm…" shell (6d371041…) with no readings — Sign off stayed blocked.
-- Point criteria at the study that actually passed; sign-off is done in the app.

UPDATE programs
SET criteria = '[{"kind": "study", "id": "4fbe1404-6308-45b7-a4ed-ef13e0daaefb"}]'::jsonb,
    updated_at = (EXTRACT(EPOCH FROM NOW()) * 1000)::bigint
WHERE id = '7258f8f2-1a8f-4809-aa95-d142a37f30b8'
  AND deleted_at IS NULL;
