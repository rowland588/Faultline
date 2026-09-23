-- A FIX IS A TEST WITH DIFFERENT WORDS, AND A PLAN CAN BE A BLOCK OF DAYS.
--
-- Rowland: "fix — literally what we're fixing, the same thing, same sort of
-- format: what's the problem, who's doing it, what was the end result." And:
-- "sometimes it's a block, it's like a week commencing... we plan the test from
-- X date to another date."
--
-- Both land on `tests`, because both are that record. A fix is a second FACE of
-- it, not a second table: no second mapper, no second migration after this one,
-- and everything already derived from a test — the verdict, the plan, what we
-- are waiting on, the client report, the card — reads a fix on the day it is
-- added with nothing new written to draw it.
--
-- THREE COLUMNS, ALL ADDITIVE. Nothing existing is rewritten:
--   kind        'test' or 'fix'. Every row written before today is a test, and
--               the default says so, so no data has to be touched.
--   planned_to  the LAST day of the planned window. NULL means a single day,
--               which is what every existing row means.
--   ran_to      the last day it actually ran. NULL means it was one day.
--
-- Safe to run more than once.

alter table public.tests add column if not exists kind text not null default 'test';
alter table public.tests add column if not exists planned_to date;
alter table public.tests add column if not exists ran_to date;

-- A face this app does not have is a row nothing can draw. The constraint is
-- named so a later migration can drop it by name rather than by guessing.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'tests_kind_check'
  ) then
    alter table public.tests
      add constraint tests_kind_check check (kind in ('test', 'fix'));
  end if;
end $$;

-- The lists read "what is still to do, soonest first" off the end of the
-- window, and now filter by face as well.
create index if not exists tests_project_kind_idx
  on public.tests (project_id, kind);

-- WHICH PROGRAM A TEST OR A FIX IS ABOUT.
--
-- Rowland: "you can have a setup of a program, a test of a program, then a fix
-- of a program, or a fix of an asset."
--
-- programs.test_id has always pointed at the test that proved a program; this
-- is that same link read from the other end, so a fix can say which program it
-- is about instead of only saying it in its title. Optional, and absent is the
-- ordinary case.
alter table public.tests add column if not exists program_id text;
