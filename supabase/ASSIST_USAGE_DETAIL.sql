-- ASSIST_USAGE_DETAIL — what each AI request cost, in its parts (12 November 2026).
--
-- Rowland, 12 November: "I would like Faultline to be able to measure: model used, input tokens, output tokens, cached input
-- tokens, cost per request, cost per conversation, monthly accumulated API cost, usage by customer … which features and
-- activities consume the most money."
--
-- assist_usage (ASSIST_USAGE.sql) kept a request's input as ONE number — fresh, read from the cache and written to it added
-- together — and nothing of which conversation or customer it was for. So neither "is the cache working?" nor "what did that
-- conversation cost?" could be answered from our own records. This adds the parts, all nullable, changing nothing that exists:
--   cache_read_tokens       input read from the cache (billed at a twentieth on Opus 5.5 and Sonnet 5.5)
--   cache_write_tokens      input written to the cache for five minutes (a quarter more)
--   cache_write_1h_tokens   input written for an hour (double)
--   conversation_id         the AI Mode conversation (a study's id, as text) — cost per conversation
--   client                  the customer in hand, by name — cost by customer; '' / null = none
--   spoken                  a voice turn
--   round                   which request of the answer this was (1 = the first; a tool round adds one)
--   ms                      how long the request took
--   tools_mode, cache_ttl   the gateway's switches when it was asked (all | search | search-bm25; 1h | 5m)
-- input_tokens stays the sum, as before, so every older reading still holds. The gateway writes the new columns and, should
-- they not exist yet, falls back to the old row — so this file and the function can go live in either order.
-- Row level security is unchanged: a person reads only their own rows; the function writes with the service role.
--
-- Run ONCE. Safe to re-run.

alter table public.assist_usage add column if not exists cache_read_tokens     integer;
alter table public.assist_usage add column if not exists cache_write_tokens    integer;
alter table public.assist_usage add column if not exists cache_write_1h_tokens integer;
alter table public.assist_usage add column if not exists conversation_id       text;
alter table public.assist_usage add column if not exists client                text;
alter table public.assist_usage add column if not exists spoken                boolean;
alter table public.assist_usage add column if not exists round                 integer;
alter table public.assist_usage add column if not exists ms                    integer;
alter table public.assist_usage add column if not exists tools_mode            text;
alter table public.assist_usage add column if not exists cache_ttl             text;

create index if not exists assist_usage_conversation_idx on public.assist_usage (conversation_id, at) where conversation_id is not null;

select column_name, data_type, is_nullable
  from information_schema.columns
 where table_schema = 'public' and table_name = 'assist_usage'
 order by ordinal_position;
