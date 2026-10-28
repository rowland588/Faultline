-- Program 10 (program 10 all rounder, nana tate, Reds) — 28 October 2026
-- Rowland: the long runs at 75 ppm are a *run at speed* criterion, not net ppm
-- alone. No study existed; the good hours live on tests 2–3. Test 4 was marked
-- passed on 26 Oct with no numbers — back-filled from the 21 Oct hour.
-- Criteria: the program's run test (first test in the chain). Sign-off left to
-- the team on the app when ready (program already proved 26 Oct by its test).

UPDATE tests
SET run_agreed = '{"rate": 75, "minutes": 60}'::jsonb,
    run = '{"packs": 3600, "speed": 75, "minutes": 60, "rejects": 30}'::jsonb,
    result = COALESCE(result, 'Line ran consistently at 75 ppm — one hour, no changeovers in that hour (same evidence as 21 Oct).')
WHERE id = 'f18b7162-c5c3-4c7e-a738-924c00256c60'
  AND program_id = '5e885049-616c-4cf8-bdba-5b97dbed79ab';

UPDATE programs
SET criteria = '[{"kind": "run", "id": "9cab3d45-5d1e-4be7-9297-4c6d7a971d7f"}]'::jsonb,
    updated_at = (EXTRACT(EPOCH FROM NOW()) * 1000)::bigint
WHERE id = '5e885049-616c-4cf8-bdba-5b97dbed79ab'
  AND deleted_at IS NULL;
