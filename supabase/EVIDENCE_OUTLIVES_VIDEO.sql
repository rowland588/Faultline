-- EVIDENCE OUTLIVES THE VIDEO
--
-- snag_assets.segment_id was `not null ... on delete cascade`. That made the
-- server agree with a bug the app has now fixed: that a marked frame is part of
-- the clip it was cut from. It is not. The frozen still IS the evidence, the
-- name on it is the machine, and the snags pinned on it are the work. Deleting
-- a clip that would not play took all of that with it.
--
-- After this, deleting a walk removes the footage and nothing else: the frames
-- simply stop naming a clip.
--
-- Safe to run twice. Run it as four separate statements if your editor prefers.

alter table public.snag_assets alter column segment_id drop not null;

alter table public.snag_assets drop constraint if exists snag_assets_segment_id_fkey;

alter table public.snag_assets add constraint snag_assets_segment_id_fkey foreign key (segment_id) references public.segments (id) on delete set null;

-- CHECK: expect is_nullable = YES and delete_rule = SET NULL
select c.is_nullable, r.delete_rule from information_schema.columns c, information_schema.referential_constraints r where c.table_schema = 'public' and c.table_name = 'snag_assets' and c.column_name = 'segment_id' and r.constraint_schema = 'public' and r.constraint_name = 'snag_assets_segment_id_fkey';


-- ---------------------------------------------------------------------------
-- WHAT WAS ALREADY LOST — AND WHETHER IT CAN COME BACK
--
-- The old delete tombstoned the frames and their snags rather than erasing the
-- rows, so on the server they are still there with deleted_at set. The still
-- images may also still be in storage. That means evidence lost this way is
-- very likely recoverable.
--
-- LOOK FIRST. This lists every marked frame that was deleted along with a walk,
-- newest first, so you can see what would come back before anything changes.

select a.id, a.name, a.still_key, to_timestamp(a.deleted_at / 1000) as deleted, (select count(*) from public.snags s where s.asset_id = a.id) as snags_on_it from public.snag_assets a where a.deleted_at is not null order by a.deleted_at desc;

-- THEN, AND ONLY IF THE LIST ABOVE IS WORK YOU WANT BACK, restore it. Put the
-- ids you want from that list in place of the ones below — do not run it
-- unfiltered, or frames you deleted on purpose come back too.
--
-- update public.snag_assets set deleted_at = null, updated_at = (extract(epoch from now()) * 1000)::bigint where id in ('paste-an-id-here');
-- update public.snags set deleted_at = null, updated_at = (extract(epoch from now()) * 1000)::bigint where asset_id in ('paste-an-id-here');
