-- LINE2A_TESTS_TO_NEW_PROGRAMS — the done tests onto Rowland's new programs.
--
-- Rowland, 30 October: "I have entered some programs in the app now .. what I
-- want are the tests put with them .. basically I don't need programs anymore
-- I just want the tests I have done .. you will see I have assigned some tests
-- to do — these are the same test. Take the data and put the tests into the
-- new programs I have done."
--
-- The old Line 2a (workspace 9392c23a) and its installation project
-- "Line 2 A" (7a1ad93e) are archived. Rowland re-made the three programs on
-- the live Line 2A (workspace 9ac1b2ae, machine P160 "Pick and Place") on
-- 30 October — P-09, P-10, P-05 — each with an EMPTY capability study picked
-- as a stand-in criterion (facts {}, uses [], made and never touched).
-- The done evidence lives on the archived project's programs:
--
--   old "program 10 all rounder, nana tate, Reds" (5e885049)  →  P-09 (b12d9001)
--     tests 9cab3d45 failed → 4293b642 passed → edbd6fb1 passed → f18b7162 passed
--     proved 2026-10-28, signed by rowlandglew, criterion the run test 9cab3d45
--   old "Program 9 Finest" (4d693706)                         →  P-10 (35a803de)
--     tests fefe1238 failed → 99154844 still to run (net 55 at 75 ppm for 60 min)
--     on the machine, no criteria — the re-test is the work still owed
--   old "Program 5 Express 1.25kg" (7258f8f2)                 →  P-05 (b521bc4a)
--     tests 443bcb69 failed → 5d22413c failed; proved 2026-10-28, signed, by the
--     capability study 4fbe1404 "Express 70 ppm for 30 min with 1 person
--     levelling packs" (2,100 ticks, judged at a 98% loss allowance)
--
-- What this does (nothing is hard-deleted; the old programs stay as history
-- on the archived project):
--   1. moves every test of the three old programs (deleted attempts included,
--      so each chain stays whole) onto the matching new program;
--   2. gives each new program the old one's judged shape — criteria, sign-off,
--      state, proved_on, test_id (P-10 takes onMachine and its open re-test);
--   3. points the proving study 4fbe1404 at the live line and P-05 so it shows
--      where the program now lives (its project_id kept as history);
--   4. puts away the three empty stand-in studies (deleted_at — reversible).
--
-- rev is stamped by the faultline_rev trigger on every update, so every
-- device pulls these rows; updated_at is bumped as the conflict clock.
--
-- Run ONCE. Safe to re-run (every statement checks what it is about to do).

do $$
declare
  ms bigint := (extract(epoch from now()) * 1000)::bigint;
begin
  -- 1. The test chains onto the new programs.
  update public.tests set program_id = 'b12d9001-907c-4eb8-9106-d9e2a31e8aac', updated_at = ms
    where program_id = '5e885049-616c-4cf8-bdba-5b97dbed79ab';
  update public.tests set program_id = '35a803de-60e7-43e9-b127-2a4211f2f56b', updated_at = ms
    where program_id = '4d693706-9a11-4068-ba19-a34a31efd757';
  update public.tests set program_id = 'b521bc4a-5989-44a7-966d-2fb77474f183', updated_at = ms
    where program_id = '7258f8f2-1a8f-4809-aa95-d142a37f30b8';

  -- 2. The new programs take the old ones' judged shape.
  -- P-09 ← program 10: proved and signed, the run test its criterion.
  update public.programs set
      criteria   = '[{"id": "9cab3d45-5d1e-4be7-9297-4c6d7a971d7f", "kind": "run"}]'::jsonb,
      signed_off = '{"at": 1793219464398, "by": ["rowlandglew"], "on": "2026-10-28"}'::jsonb,
      state = 'proved', proved_on = '2026-10-28', test_on = null,
      test_id = 'f18b7162-c5c3-4c7e-a738-924c00256c60', updated_at = ms
    where id = 'b12d9001-907c-4eb8-9106-d9e2a31e8aac'
      and (state is distinct from 'proved' or test_id is distinct from 'f18b7162-c5c3-4c7e-a738-924c00256c60');
  -- P-10 ← Program 9 Finest: on the machine, its re-test still to run.
  update public.programs set
      criteria = null, signed_off = null,
      state = 'onMachine', proved_on = null, test_on = '2026-10-26',
      test_id = '99154844-9ad7-42d9-a9fa-ab5b36f71a02', updated_at = ms
    where id = '35a803de-60e7-43e9-b127-2a4211f2f56b'
      and (state is distinct from 'onMachine' or test_id is distinct from '99154844-9ad7-42d9-a9fa-ab5b36f71a02');
  -- P-05 ← Program 5 Express: proved and signed by the capability study.
  update public.programs set
      criteria   = '[{"id": "4fbe1404-6308-45b7-a4ed-ef13e0daaefb", "kind": "study"}]'::jsonb,
      signed_off = '{"at": 1793222426442, "by": ["rowlandglew"], "on": "2026-10-28"}'::jsonb,
      state = 'proved', proved_on = '2026-10-28', test_on = null,
      test_id = '5d22413c-8e5b-4dba-ad9f-9cf1734f4b93', updated_at = ms
    where id = 'b521bc4a-5989-44a7-966d-2fb77474f183'
      and (state is distinct from 'proved' or test_id is distinct from '5d22413c-8e5b-4dba-ad9f-9cf1734f4b93');

  -- 3. The proving study onto the live line and its program.
  update public.studies set
      workspace_id = '9ac1b2ae-5266-4e0a-b598-d82a206051c9',
      program_id = 'b521bc4a-5989-44a7-966d-2fb77474f183', updated_at = ms
    where id = '4fbe1404-6308-45b7-a4ed-ef13e0daaefb'
      and (workspace_id is distinct from '9ac1b2ae-5266-4e0a-b598-d82a206051c9'
        or program_id is distinct from 'b521bc4a-5989-44a7-966d-2fb77474f183');

  -- 4. The empty stand-in studies put away (kept, reversible).
  update public.studies set deleted_at = coalesce(deleted_at, ms), updated_at = ms
    where id in ('df616a8e-0bd7-47b9-a948-af4aa77e031c',
                 'd210b9f0-6d70-4ee7-8872-3e10034930d3',
                 '0b4ebf00-df20-49ad-ad3c-a50dbb417e61')
      and deleted_at is null;
end $$;

-- What it did, read back.
select p.what, p.state, p.proved_on, p.test_id, p.criteria::text as criteria,
       (p.signed_off is not null) as signed,
       (select count(*) from public.tests t where t.program_id = p.id and t.deleted_at is null) as live_tests
from public.programs p
where p.id in ('b12d9001-907c-4eb8-9106-d9e2a31e8aac','35a803de-60e7-43e9-b127-2a4211f2f56b','b521bc4a-5989-44a7-966d-2fb77474f183')
order by p.what;
