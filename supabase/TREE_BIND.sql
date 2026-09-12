-- FAULTLINE — a condition can fill itself from the tracker
--
-- A condition box on the lever tree can carry a binding: which line, which
-- tracker categories, optionally a word to look for. The work underneath it is
-- then DERIVED from the weekly upload rather than typed — nothing is copied,
-- and a closed action goes green on its own.
--
-- The derived rows are never stored, here or locally: they are computed from
-- whatever the latest tracker says. Only the binding itself needs a home, and
-- it is one nullable jsonb column.
--
-- Safe to run twice.

alter table public.tree_nodes
  add column if not exists bind jsonb;

comment on column public.tree_nodes.bind is
  'Tracker binding: {line, categories[], keyword}. Null = this box''s children are typed by hand. The matched actions are derived at render time and never stored.';

-- No RLS change: the binding rides on the tree_nodes row, so it is already
-- covered by whatever policy lets you see the node.
