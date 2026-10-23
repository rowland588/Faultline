-- NAME_PICK_AND_PLACE.sql — one machine, one name, on Line 2a.
--
-- Why (23 October, step 0 of the combined line report): Line 2a's two
-- studies of its pick and place — "Pick and place miss picks" (reliability)
-- and "Pick and place reliability Allrounder" (capability) — named the
-- machine by its model, "P160"; its project, its machine record and its
-- problems call it "Pick and Place". Rowland, asked: "Yes P160 is the pick and
-- place". Under two names, the line's report could not say the findings were
-- about one machine. So the studies take the line's name for it. The model
-- stays in the study's own name and words; nothing else changes.
--
-- Run ONCE. Safe to re-run: the second run finds no "P160" left to rename.

update public.studies
   set machine = 'Pick and Place',
       updated_at = (extract(epoch from now()) * 1000)::bigint
 where deleted_at is null
   and trim(machine) ilike 'p160'
   and workspace_id = (select id from public.workspaces where deleted_at is null and lower(trim(name)) = 'line 2a' limit 1);

-- What it did: every live study on Line 2a, the machine it names.
select s.name, s.machine, s.tool
  from public.studies s join public.workspaces w on w.id = s.workspace_id
 where s.deleted_at is null and lower(trim(w.name)) = 'line 2a'
 order by 1;
