-- ============================================================================
-- FAULTLINE — AN OVERLAP SAID TO BE FINE. Run ONCE. Safe to re-run.
--
-- Rowland, 6 October: "On the plan Gantt we have overlaps stated across most
-- things because I put range dates in ... but this is normal, because not
-- everything had a set date and some things are done at the same time. Don't
-- think we need to highlight this so much — perhaps a question on a date
-- range: it overlaps, okay, yes or no. Set everything in the current plan to
-- yes."
--
-- A step that starts before the one ahead of it on its machine has finished
-- was flagged "overlaps …" on the plan and its paper, whether or not that was
-- the plan. Now the dates form asks once — it overlaps, is that OK? — and a
-- yes (tests.overlap_ok) stops the flag. Blank or no: flagged, as before.
-- ============================================================================

alter table public.tests add column if not exists overlap_ok boolean;

-- Everything planned before this file — "set everything in the current plan
-- to yes". Bounded by when the row was made (6 Oct 2026, 07:52 UTC), so a
-- re-run never answers for a step planned since. updated_at moves on so every
-- device takes the answer on its next pull.
update public.tests
   set overlap_ok = true,
       updated_at = greatest(updated_at, (extract(epoch from now()) * 1000)::bigint)
 where overlap_ok is null
   and deleted_at is null
   and coalesce(kind, 'test') <> 'fix'
   and planned_for is not null
   and created_at < 1791277949943;

select count(*) filter (where overlap_ok) as said_ok,
       count(*) filter (where overlap_ok is null and planned_for is not null and deleted_at is null) as not_asked
from public.tests;
