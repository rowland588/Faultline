-- ============================================================================
-- FAULTLINE — A REMINDER ON A MEETING NOTE. Run ONCE. Safe to re-run.
--
-- Rowland: "put a date as a reminder on the note itself ... the option to add
-- it to the Gantt chart, or just add it as a reminder." The date is the note's
-- existing `due`. This is the second half: whether the reminder is also drawn
-- on the plan. False / null means a reminder only.
-- ============================================================================

alter table public.test_items add column if not exists on_plan boolean;
