-- ============================================================================
-- FAULTLINE — A FIX, PINNED ON THE LINE. Run ONCE. Safe to re-run.
--
-- Rowland: "we had a really good system where evidence was brought in … press
-- on the picture. At the moment I can't see where it comes into play."
--
-- The filmed walk (segments → frames → pins) sat beside a stage-gate job's
-- fixes, never in them. This puts a fix ON a frame: which frame, and where on
-- it, as percentages of the picture — the same as a pinned snag. Null means
-- not pinned, which is every fix written before this.
-- ============================================================================

alter table public.tests add column if not exists pin jsonb;

-- And on what was found: an install problem or a test finding can be pointed
-- at on the line too — "Pin it on the line" wherever a problem is written.
alter table public.test_items add column if not exists pin jsonb;
