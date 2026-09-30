-- THE USUAL INSTALL STAGES, THE JOB'S OWN.
--
-- Rowland: "Allow me to edit the 6 install names that you have made as
-- default." "Add the usual stages" offered six names written into the app;
-- a site that installs its own way had no way to say so. The list rides on
-- the project, as the measures and periods do (MEASURES.sql) — small, read
-- whole, edited as one. NULL means the app's six.
--
-- Additive. Safe to run more than once.

alter table public.projects add column if not exists install_stages jsonb;
