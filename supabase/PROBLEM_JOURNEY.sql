-- ============================================================================
-- FAULTLINE — A PROBLEM'S JOURNEY, AND A FRESH START. Run ONCE. Safe to re-run.
--
-- Rowland, 12 October: "Every single problem allows me to put in what the
-- problem is. And we also want them to be able to track a journey of
-- improvement with it ... so when people go into the meetings ... they can
-- see the journey: this is what it is, it's low risk, this is what we're
-- going to do, this is when we did it, this was what the result was ... on X
-- date we did X." And: "I want a fresh start. Don't erase anything."
--
-- Two more things a problem (snags) can carry:
--   journey      [{ id, at, did, result? }] — on a day, what was done and
--                what came of it; a list merged by id (src/cloud/sync.ts
--                mergeList), so a step written on the phone and another on
--                the laptop both stay
--   archived_at  put away by a fresh start — kept, never deleted, and
--                brought back with one tap
-- ============================================================================

alter table public.snags add column if not exists journey jsonb;
alter table public.snags add column if not exists archived_at bigint;

select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'snags' and column_name in ('journey', 'archived_at')
order by column_name;
