-- ============================================================================
-- FAULTLINE — WHY A STAGE MOVED. Run ONCE. Safe to re-run.
--
-- Rowland: "Plans change. This is the reason why. This is what happened. Look
-- at the film. Look at the picture." When a stage's finish is pushed later the
-- app asks why, and keeps the answer as something found on that step — its
-- words, its photos and clips — with the finish it moved FROM and TO, so the
-- plan can draw the original beside what it is now.
-- ============================================================================

alter table public.test_items add column if not exists moved_from text;
alter table public.test_items add column if not exists moved_to text;
