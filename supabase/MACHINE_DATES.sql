-- WHEN A MACHINE ARRIVES, AND WHEN IT RAN.
--
-- Rowland: "machines can need dates, yes — if a date of an asset coming to
-- site, for example, it will happen."
--
-- A machine was the one record in the app carrying a state and no date, which
-- is exactly why it was the one thing that could not be drawn on the plan.
-- Shaped like a material's `due` and `in_on`, for the same reason: what was
-- promised and what actually happened are two facts, and a column that lets one
-- follow the other around always reports that everything went to plan.
--
-- All nullable. A machine already on site when the job started has no due date
-- and never needed one; an invented date reads as a fact.
--
-- Run this in the Supabase SQL editor. Safe to run twice.

alter table public.commission_assets add column if not exists due_on       text;
alter table public.commission_assets add column if not exists on_site_on   text;
alter table public.commission_assets add column if not exists installed_on text;
alter table public.commission_assets add column if not exists running_on   text;

select 'commission_assets.due_on',
       exists (select 1 from information_schema.columns
                where table_schema = 'public' and table_name = 'commission_assets'
                  and column_name = 'due_on') as ok
union all
select 'commission_assets.running_on',
       exists (select 1 from information_schema.columns
                where table_schema = 'public' and table_name = 'commission_assets'
                  and column_name = 'running_on');
