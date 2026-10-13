-- ============================================================================
-- FAULTLINE — THE LINE STANDARD'S BOARD SHAPE. Run ONCE. Safe to re-run.
--
-- Rowland, 13 October: "I only have a small surface area to play with, so
-- it's not like I can ... fit large things on." A board drawn with shapes
-- (no photo) was always 16:9. It can now be wide, square or tall — the
-- room added below what is already on it — and the printed card draws it
-- the same shape.
--
--   board   'wide' | 'square' | 'tall' — blank is wide, as before
--
-- A person's colour needs no column: it rides on the mark, in marks (jsonb).
-- Nothing else changes: the standards' policies cover every column.
-- ============================================================================

alter table public.standards add column if not exists board text;

select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'standards' and column_name = 'board';
