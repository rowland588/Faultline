-- ============================================================================
-- FAULTLINE — THE OVERLAP ANSWER, SENT AGAIN. Run ONCE. Safe to re-run.
--
-- Rowland, 6 October: "In reports I still see overlaps with spares list
-- agreed — I told you set everything we currently have as okay, part of the
-- plan."
--
-- OVERLAP_OK.sql answered yes for every dated step and moved updated_at on so
-- devices would pull it. It ran a few minutes BEFORE the app that knows the
-- column went live: a device still on the old build pulled those rows, dropped
-- the field it did not know, and — its cursor now past them — never asked
-- again. So the answer is stamped once more (the rev trigger moves with
-- updated_at), now that every device reads it, and the steps dated since are
-- answered too: "set everything we currently have as okay".
-- ============================================================================

update public.tests
   set overlap_ok = true,
       updated_at = greatest(updated_at + 1, (extract(epoch from now()) * 1000)::bigint)
 where deleted_at is null
   and coalesce(kind, 'test') <> 'fix'
   and planned_for is not null
   and (overlap_ok is null or overlap_ok = true)
   and created_at < 1791289500000;   -- 6 Oct 2026, 12:25 UTC

select count(*) filter (where overlap_ok) as said_ok,
       count(*) filter (where overlap_ok is null and planned_for is not null and deleted_at is null and coalesce(kind, 'test') <> 'fix') as not_asked
from public.tests;
