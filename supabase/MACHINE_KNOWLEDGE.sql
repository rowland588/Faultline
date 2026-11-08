-- MACHINE_KNOWLEDGE.sql — what a machine is, and how each thing about a machine or a line is known (8 November,
-- docs/FACTORY-KNOWLEDGE.md F1).
--
-- Why: Rowland, 8 November: "it cannot guess which factory, area, production line, machine or process I am talking about … I
-- want Faultline to develop a structured knowledge of every business it works with … Do not create a duplicate factory
-- database." So the one model stays the app's own (workspaces the lines with their client, site and area — CLIENT_SITE_AREA.sql;
-- commission_assets one record a machine — ONE_MACHINE_RECORD.sql) and gains a few words on the rows it already has:
--
--   commission_assets.kind         what the machine is, in the factory's words (scale, checkweigher, mixer, case packer …)
--   commission_assets.model        its model
--   commission_assets.serial       its serial number
--   commission_assets.known        per field, how it is known: { "<field>": { how, source, at, by } } — how is confirmed (a
--                                  person said it is right) · reported (said in a conversation) · document (from a document,
--                                  with its words) · inferred (proposed, not confirmed); a field not in it is simply unknown
--   commission_assets.replaced_by  a machine replaced: the new record's id on the old one, which is kept, never deleted
--                                  (text, as commission_assets.id is — a line's own record is 'mc-<line>-<name>', not a uuid)
--   workspaces.known               the same, for a line's own words (its client, site, area, type)
--
-- All nullable; no row is changed; the tables' policies already cover every column (the rows are the line's), so RLS is
-- untouched. The app sends each column only once a record carries it (src/cloud/mappers.ts), so a device running the new build
-- before this is applied pushes as before — but apply this BEFORE the build reaches main, so a kind typed on a machine is never
-- refused by the cloud.
--
-- Run ONCE. Safe to re-run.

alter table public.commission_assets add column if not exists kind text;
alter table public.commission_assets add column if not exists model text;
alter table public.commission_assets add column if not exists serial text;
alter table public.commission_assets add column if not exists known jsonb;
alter table public.commission_assets add column if not exists replaced_by text;
alter table public.workspaces add column if not exists known jsonb;

-- What it did: the six columns, and that no row carries any of them yet.
select table_name, column_name, data_type, is_nullable
  from information_schema.columns
 where table_schema = 'public'
   and ((table_name = 'commission_assets' and column_name in ('kind', 'model', 'serial', 'known', 'replaced_by'))
     or (table_name = 'workspaces' and column_name = 'known'))
 order by table_name, column_name;
