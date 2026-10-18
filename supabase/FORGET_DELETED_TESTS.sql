-- FORGET DELETED TESTS — a program whose proving test was deleted keeps no
-- memory of it.
--
-- Rowland, 18 October, on a job's Programs: "it was a test I deleted ... it
-- was the test that was the problem" — "tesco main estate finest 2kg 8 in a
-- tray" still read "on the machine · test 20 Oct" after its booked test was
-- deleted. Deleting a test never told its program: the program kept the
-- test's link (test_id) and the day it was booked for (test_on). The app now
-- makes the program forget the test the moment it is deleted (db/testing
-- deleteTest → db/programs forgetTest, lib/programs programAfterTestGone);
-- this puts right the programs already left holding a deleted test.
--
-- The same rule as the app's, for a program not proved: its link to the
-- deleted test comes off, and its test day when it was that test's day. A
-- program proved is left alone here (its proof is a fact a person can see
-- and change on its row). A program with another live test of its own keeps
-- that test as its link and day.
--
-- Run ONCE. Safe to re-run: a second run finds nothing left to change.

with gone as (
  select p.id as program_id, t.planned_for
  from public.programs p
  join public.tests t on t.id = p.test_id
  where p.deleted_at is null and p.proved_on is null and t.deleted_at is not null
),
kept as (
  -- the program's newest live test still booked, if it has one
  select distinct on (t.program_id) t.program_id, t.id as test_id, t.planned_for
  from public.tests t
  join gone g on g.program_id = t.program_id
  where t.deleted_at is null and t.outcome = 'planned'
  order by t.program_id, t.created_at desc
)
update public.programs p
set test_id    = k.test_id,
    test_on    = case when k.test_id is not null then k.planned_for
                      when p.test_on = g.planned_for then null
                      else p.test_on end,
    updated_at = (extract(epoch from now()) * 1000)::bigint
from gone g
left join kept k on k.program_id = g.program_id
where p.id = g.program_id;

-- What it did: every live program still pointing at a deleted test (none, once run).
select p.id, p.what, p.test_on, p.test_id
from public.programs p
join public.tests t on t.id = p.test_id
where p.deleted_at is null and p.proved_on is null and t.deleted_at is not null;
