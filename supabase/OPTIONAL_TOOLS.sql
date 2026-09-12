-- FAULTLINE — the lever tree becomes an opt-in surface
--
-- Not every project is shaped like a lever tree: it suits an initiative with
-- one measurable outcome and a chain of conditions under it, and most projects
-- are not that. It is off unless a project asks for it. The screen, the route
-- and the report page all stay built — they simply are not offered.
--
-- Safe to run twice. Existing projects default to off, which is the change:
-- Project Pace stops showing it until it is ticked back on.

alter table public.projects
  add column if not exists lever_tree boolean not null default false;

comment on column public.projects.lever_tree is
  'Opt-in: show the lever tree for this project, and print its page in the GM report.';
