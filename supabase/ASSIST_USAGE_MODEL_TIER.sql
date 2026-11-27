-- ASSIST_USAGE_MODEL_TIER — which Luna tier picked the model (27 November 2026, docs/AI-COST.md §4.3).
-- Values: social | read | opus. Nullable; the gateway falls back if the column is not there yet.

alter table public.assist_usage add column if not exists model_tier text;

select column_name, data_type, is_nullable
  from information_schema.columns
 where table_schema = 'public' and table_name = 'assist_usage' and column_name = 'model_tier';