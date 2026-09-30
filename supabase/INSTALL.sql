-- AN INSTALL STEP IS A TEST WITH DIFFERENT WORDS.
--
-- Rowland: "an installing section — the ability to understand the issues and
-- stages that are taking place on a day to day basis, telling a story."
--
-- The weeks between a machine landing and it running are its installation.
-- Each step of it — positioned, air and power connected, I/O checked — is
-- planned for a day, done by somebody, and turns things up, which is the record
-- `tests` already is. So it is a third FACE of that record, the way a fix is
-- the second (see FIXES_AND_RANGES.sql): no new table, no new columns.
--
-- The one thing that has to change is the constraint naming the faces. Without
-- this, a phone that saves an install step has its push rejected, the cursor
-- never advances, and the step never leaves the device — silently.
--
-- Widening only: every row that satisfied the old check satisfies this one.
-- Safe to run more than once.

alter table public.tests drop constraint if exists tests_kind_check;
alter table public.tests
  add constraint tests_kind_check check (kind in ('test', 'fix', 'install'));
