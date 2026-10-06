-- ============================================================================
-- FAULTLINE — QUICK SNAGS. Run ONCE. Safe to re-run.
--
-- Rowland, 6 October: "Build a quick fire evidence system, snag system — can
-- assign it to line and projects, made for on the move: spot an issue. Make
-- sure you can add multiple snags to the same line. You can then transfer
-- these multiple snags over to a project, transfer them as problems, same
-- sort of multi-status, completely adaptable, editable. We've already got the
-- system built, so it's just about creating another section for it, visible
-- at all times."
--
-- The snag already exists (a line's snag: open / in progress / closed, whose,
-- by when). Three things it could not hold:
--   media       every photo and clip taken of it — it held one close-up only
--   project_id  the project it is for, when it is said on the spot
--   sent        where it went when it became a problem on a project:
--               [{ "projectId": …, "itemId": …, "at": <ms> }]
-- ============================================================================

alter table public.snags add column if not exists media jsonb;
alter table public.snags add column if not exists project_id text;
alter table public.snags add column if not exists sent jsonb;

create index if not exists snags_project_id_idx on public.snags (project_id) where project_id is not null;

select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'snags' and column_name in ('media', 'project_id', 'sent')
order by column_name;
