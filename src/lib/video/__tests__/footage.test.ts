/* A VIDEO STUDY'S FOOTAGE, TO THE CLOUD AND GONE FROM IT (lib/video/footage,
 * supabase/VIDEO_MEDIA.sql) — which files the study names, which it stops
 * naming once the footage is deleted, the deletion kept as its own fact, and
 * the row the cloud gets never naming deleted footage again, even after a
 * merge brought the name back. */
import { describe, expect, it } from 'vitest';
import { footageGone, footageKeys, forTheCloud, goneKeys, withoutFootage } from '../footage';
import { MAPS } from '../../../cloud/mappers';
import { mergeRows } from '../../../cloud/sync';
import type { StudyFacts, ToolStudy } from '../../study';
import type { VideoSource } from '../record';

const video = (over: Partial<VideoSource> = {}): VideoSource => ({
  media: { id: 'm1', blobKey: 'video-1', thumbKey: 'poster-1', mime: 'video/mp4', capturedAt: 1 },
  facts: { fileName: 'line4.mp4', mime: 'video/mp4', bytes: 1000, durationSec: 30, width: 640, height: 360, orientation: 'landscape' },
  job: { state: 'review', progress: 1, attempts: 1, config: { sampleSec: 0.2, readWidth: 160, zones: [], sensitivity: 4, joinGapSec: 0.5, minEventSec: 0.6, version: 'motion-1' }, updatedAt: 1 },
  ...over,
});
const study = (facts: StudyFacts): ToolStudy => ({ id: 's1', ownerId: 'u1', tool: 'balance', name: 'Line 4', facts, uses: [], startedAt: 1, createdAt: 1, updatedAt: 2 });

describe('a study names its footage while it has it', () => {
  it('the recording and its poster, with their types', () => {
    expect(footageKeys({ video: video() })).toEqual([{ key: 'video-1', mime: 'video/mp4' }, { key: 'poster-1', mime: 'image/jpeg' }]);
    expect(footageKeys({})).toEqual([]);
    expect(goneKeys({ video: video() })).toEqual([]);
    expect(footageGone({ video: video() })).toBeUndefined();
  });
  it('the sync sends both, under the study’s owner', () => {
    expect(MAPS.studies.mediaKeys(study({ video: video() }))).toEqual([
      { key: 'video-1', mime: 'video/mp4', owner: 'u1' }, { key: 'poster-1', mime: 'image/jpeg', owner: 'u1' },
    ]);
    expect(MAPS.studies.mediaKeys(study({ readings: [] }))).toEqual([]);
  });
});

describe('deleted, the footage is named nowhere and its deletion is kept', () => {
  const after = withoutFootage({ video: video(), vevents: [] }, 50, 'Rowland');
  it('the video no longer names it; the deletion keeps the files to forget', () => {
    expect(after.video?.media).toEqual({ id: 'm1', blobKey: '', mime: 'video/mp4', capturedAt: 1 });
    expect(after.video).toMatchObject({ footageDeletedAt: 50, footageDeletedBy: 'Rowland' });
    expect(after.videoGone).toEqual({ at: 50, by: 'Rowland', key: 'video-1', thumbKey: 'poster-1' });
    expect(after.vevents).toEqual([]);                                     // what was found is untouched
    expect(footageGone(after)).toEqual({ at: 50, by: 'Rowland' });
    expect(footageKeys(after)).toEqual([]);
    expect(goneKeys(after)).toEqual(['video-1', 'poster-1']);
    expect(MAPS.studies.mediaKeys(study(after))).toEqual([]);
  });
  it('deleting twice changes nothing', () => {
    expect(withoutFootage(after, 99, 'someone else')).toBe(after);
  });
  it('an older study that said it on the video is read the same', () => {
    const old = { video: video({ footageDeletedAt: 40, footageDeletedBy: 'Sam' }) };
    expect(footageGone(old)).toEqual({ at: 40, by: 'Sam' });
    expect(footageKeys(old)).toEqual([]);
    expect(goneKeys(old)).toEqual(['video-1', 'poster-1']);
  });
});

describe('the cloud never gets deleted footage named again', () => {
  it('a later write of the video on this device that brought the name back is sent without it', () => {
    const back: StudyFacts = { video: video({ job: { ...video().job, progress: 0.4 } }), videoGone: { at: 50, key: 'video-1', thumbKey: 'poster-1', by: 'Rowland' } };
    const sent = forTheCloud(back);
    expect(sent.video?.media.blobKey).toBe('');
    expect(sent.video?.media.thumbKey).toBeUndefined();
    expect(sent.video).toMatchObject({ footageDeletedAt: 50, footageDeletedBy: 'Rowland' });
    expect((MAPS.studies.toRow(study(back), 'u1').facts as StudyFacts).video?.media.blobKey).toBe('');
  });
  it('a study with its footage goes as it is', () => {
    const f = { video: video() };
    expect(forTheCloud(f)).toBe(f);
    expect((MAPS.studies.toRow(study(f), 'u1').facts as StudyFacts).video?.media.blobKey).toBe('video-1');
  });
  /* The case the deletion is its own fact for: deleted on the laptop while the
     phone, still reading the footage, wrote the video again — later. The
     phone's video wins whole (mergeRows, one level down), name and all; the
     deletion, which only the laptop moved, is kept beside it, and the row
     the cloud gets names nothing. */
  it('deleted here while another device wrote the video later: the deletion survives the merge', () => {
    const base = MAPS.studies.toRow(study({ video: video() }), 'u1');
    const mine = MAPS.studies.toRow(study(withoutFootage({ video: video() }, 50, 'Rowland')), 'u1');
    const theirs = MAPS.studies.toRow(study({ video: video({ job: { ...video().job, progress: 0.7, updatedAt: 60 } }) }), 'u1');
    for (const mineNewer of [false, true]) {
      const merged = mergeRows(base, mine, theirs, mineNewer, MAPS.studies.nested).row;
      const facts = merged.facts as StudyFacts;
      expect(facts.videoGone?.key).toBe('video-1');
      expect(footageGone(facts)).toEqual({ at: 50, by: 'Rowland' });
      const local = MAPS.studies.fromRow(merged) as unknown as ToolStudy;
      expect(MAPS.studies.mediaKeys(local)).toEqual([]);
      expect((MAPS.studies.toRow(local, 'u1').facts as StudyFacts).video?.media.blobKey).toBe('');
    }
  });
});
