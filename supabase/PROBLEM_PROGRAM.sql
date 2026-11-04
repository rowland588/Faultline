-- ============================================================================
-- FAULTLINE — A PROBLEM LINKED TO A PROGRAM AND TO THE PRODUCTS IT AFFECTS. Run ONCE. Safe to re-run.
--
-- Rowland, 4 November: "I would like the option to link a problem to the program, because they could be
-- specific to the program ... I could have a problem that's associated to all products. It's generalistic, so
-- affects everything, or affects a few of them. So allow me to either go or pick which products it actually
-- affects ... program and the products it makes ... a program, but it does three products, but that product is
-- a little bit different and it affects that individual product."
--
-- Two columns on the register's problems (snags):
--   program_id   text    — the program it is about; absent = not about one program (general)
--   products     text[]  — which products it affects; absent or empty with a program = all that program's
--                          products; with no program, any product the person names
-- ============================================================================

alter table public.snags add column if not exists program_id text;
alter table public.snags add column if not exists products text[];

select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'snags' and column_name in ('program_id', 'products')
order by column_name;
