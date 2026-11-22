-- ASSIST_USAGE_ENDED — why each of Luna's requests ended, and the engine settings it was asked with (22 November 2026).
--
-- Rowland, 21 November: "make Luna as intelligent as possible." The audit of that evening found that her answers had 4,000 tokens
-- for thinking, words and steps together, and that running out FAILED the turn — and nobody could say how often, because a usage
-- row keeps what a request cost and not why it ended (docs/LUNA-AGENT.md §5b, "The room an answer has": "the usage rows do not
-- keep why a request ended — the next thing to add to them"). The same is true of a refusal, and of an answer that stopped to
-- ask for a step. Without it the engine's settings (the room an answer has, the effort it is asked at) are set by argument and
-- never by measurement.
--
-- This adds, both nullable, changing nothing that exists:
--   ended     why the model stopped: end_turn (it finished) · tool_use (it asked for a step) · max_tokens (it ran out of room —
--             the answer was cut) · refusal · pause_turn · stop_sequence — the API's own word, as it came
--   effort    the effort the request was asked at (low · medium · high · …) — so a change of it can be told apart in the record
--
-- The gateway writes them and, should they not exist yet, falls back to the row as it was (ASSIST_USAGE_DETAIL.sql's columns),
-- and from that to the first row of all — so this file and the function can go live in either order, and a usage row is never
-- lost to it. Row level security is unchanged: a person reads only their own rows; the function writes with the service role.
--
-- Run ONCE. Safe to re-run.

alter table public.assist_usage add column if not exists ended  text;
alter table public.assist_usage add column if not exists effort text;

select column_name, data_type, is_nullable
  from information_schema.columns
 where table_schema = 'public' and table_name = 'assist_usage'
 order by ordinal_position;
