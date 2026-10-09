-- ============================================================================
-- FAULTLINE — THE LEAD'S COMMENTARY ON THE REPORTS. Run ONCE. Safe to re-run.
--
-- Rowland, 9 October: "Client report doesn't have status of programs — we have
-- numbers but not the story ... I need a way to add commentary."
--
-- Every word on the client report and the status report was read off the
-- records, which is why the two can never disagree with the app — and why
-- there was nowhere for the person sending them to say, in a sentence or
-- three, what the numbers mean this week. A project now keeps that:
--
--   report_note     the commentary, as written (ui: the Reports screen)
--   report_note_at  when it was last written, ms — printed beside it, so a
--                   reader knows how fresh the words are
--
-- One per project, not per report: it is the lead's word on where the job is
-- now, printed on both reports. Who may write it is who may change the
-- project row already (ACCESS_LEVELS.sql): its owner.
-- ============================================================================

alter table public.projects add column if not exists report_note text;
alter table public.projects add column if not exists report_note_at bigint;

select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'projects' and column_name in ('report_note', 'report_note_at')
order by column_name;
