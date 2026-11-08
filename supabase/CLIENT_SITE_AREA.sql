-- CLIENT_SITE_AREA.sql — each production line's client, site and area (8 November, docs/CONSULTANT.md K1).
--
-- Why: Faultline is Rowland's consultant's tool (Streamline Synergy); the factory is the client's. Rowland, 8 November: "I go in, I
-- build what I see, an area, production lines within the area"; a client may have more than one site. So a line says whose it is,
-- which of their sites it is on and which area of that site it sits in — words on the line, like its type (FACTORY.sql), never a new
-- record. The workspaces' policies already cover every column; nothing else changes.
--
-- Run ONCE. Safe to re-run.

alter table public.workspaces add column if not exists client_name text;
alter table public.workspaces add column if not exists site_name text;
alter table public.workspaces add column if not exists area_name text;

-- What it did
select column_name, data_type from information_schema.columns
where table_schema = 'public' and table_name = 'workspaces' and column_name in ('client_name', 'site_name', 'area_name')
order by column_name;
