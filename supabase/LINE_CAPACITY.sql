-- ============================================================================
-- FAULTLINE — WHERE A LINE IS LIMITED. Run ONCE. Safe to re-run.
--
-- Rowland: the Pareto says where time is lost; it does not say where the line
-- is limited when nothing breaks. A line's stations — each machine or crew, in
-- the order product goes through them, with its own unit and speed — are one
-- jsonb document on the line: { targetPerMin, plannedHoursPerWeek, stations[] }.
-- Read and written whole, never queried into, the same shape the line standard
-- keeps its marks in. Null until somebody fills it in.
-- ============================================================================

alter table public.pace_ppm add column if not exists capacity jsonb;
