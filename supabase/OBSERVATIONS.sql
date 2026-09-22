-- OBSERVATIONS, AND THE ONES YOU DECIDE TO ACTION.
--
-- Rowland: "what we found on the day — you'll see five open of five. So what's
-- taking place here is an immediate interpretation that this is like an action.
-- However what I am actually doing is recording observations. I need to decide
-- whether or not there's an action to take place out of it. I'm live, taking
-- observations, writing stuff down... and I'd appreciate then the ability to go
-- yes, let's action this, and then it becomes an action."
--
-- So a finding is no longer open or closed. It is written down, and some of
-- them are then actioned — which creates a next step, and the two know about
-- each other. `test_items.became_test_id` already does exactly this one level
-- up, for a next step that became the next test; this is the same link one
-- level down.
--
-- Run this in the Supabase SQL editor. Safe to run twice.

alter table public.test_items add column if not exists became_item_id text;
alter table public.test_items add column if not exists from_item_id   text;

-- The observation a next step came out of, so a report can read the chain
-- without scanning every row.
create index if not exists test_items_from_item_idx on public.test_items (from_item_id);

select 'test_items.became_item_id',
       exists (select 1 from information_schema.columns
                where table_schema = 'public' and table_name = 'test_items'
                  and column_name = 'became_item_id') as ok
union all
select 'test_items.from_item_id',
       exists (select 1 from information_schema.columns
                where table_schema = 'public' and table_name = 'test_items'
                  and column_name = 'from_item_id');
