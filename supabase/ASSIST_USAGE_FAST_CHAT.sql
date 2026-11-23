-- ASSIST_USAGE_FAST_CHAT — F1 fast conversational path (23 November 2026, docs/LUNA-ROOM.md §2).
--
-- When the gateway classifies a turn as greeting, thanks or small talk, it omits capability schemas
-- and sets fast_chat on the assist_usage row. Nullable; the gateway falls back if the column is not there yet.
--
-- Run ONCE. Safe to re-run.

alter table public.assist_usage add column if not exists fast_chat boolean;

select column_name, data_type, is_nullable
  from information_schema.columns
 where table_schema = 'public' and table_name = 'assist_usage' and column_name = 'fast_chat';