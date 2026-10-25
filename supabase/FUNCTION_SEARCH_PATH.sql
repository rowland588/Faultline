-- FUNCTION SEARCH PATH — 25 October 2026 (walkthrough).
-- The database linter (0011 function_search_path_mutable) named four functions
-- whose search_path a caller could change. None of them reads a table — three
-- are triggers on NEW/OLD, one returns a constant — so pinning the path to
-- public changes nothing they do. Safe to run again.
alter function public.faultline_superadmin_email() set search_path = public;
alter function public.faultline_keep_owner() set search_path = public;
alter function public.faultline_clamp_clock() set search_path = public;
alter function public.faultline_keep_activity() set search_path = public;
