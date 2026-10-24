/* A VIDEO STUDY'S FOOTAGE — which files it is, and when it is gone
 * (docs/VIDEO.md, Deletion; supabase/VIDEO_MEDIA.sql).
 *
 * The cloud takes and gives a file only while a record the person can see
 * names it, and a study names its footage at facts.video.media. So the
 * footage goes up with the study, and comes down on every device that can
 * see the study.
 *
 * DELETED MEANS GONE EVERYWHERE. Deleting the footage takes the name off the
 * video — from that moment the cloud lets nobody open it — and keeps the
 * deletion as its own fact, `facts.videoGone`, with the files' names: every
 * device that gets the study forgets its copy, and the device that sent it
 * takes it out of the cloud (only the sender may — the bucket's rule). The
 * deletion is its own fact, not a field of the video, because a device still
 * writing the video (a reading in progress) wins the video whole when the two
 * meet (cloud/sync mergeRows): the video could come back with the name on
 * it, and its deletion with it. A fact of its own nobody else writes always
 * survives the merge, and the study never names its footage to the cloud
 * again once it carries one (forTheCloud). */
import type { StudyFacts } from '../../lib/study';
import type { VideoSource } from './record';

/** The recording no longer named: no file, no poster. */
function unnamed(m: VideoSource['media']): VideoSource['media'] {
  const out = { ...m, blobKey: '' };
  delete out.thumbKey;
  return out;
}

/** The footage taken off a study: when, by whom, and the files it was. */
export interface FootageGone {
  at: number;
  by?: string;
  /** The recording's file, kept so each device can forget its copy. */
  key: string;
  thumbKey?: string;
}

/** Whether the footage was deleted, and when and by whom — read from the
 *  deletion's own fact, or from an older study that said it on the video. */
export function footageGone(facts: StudyFacts): { at: number; by?: string } | undefined {
  const g = facts.videoGone;
  if (g) return { at: g.at, ...(g.by ? { by: g.by } : {}) };
  const v = facts.video;
  return v?.footageDeletedAt ? { at: v.footageDeletedAt, ...(v.footageDeletedBy ? { by: v.footageDeletedBy } : {}) } : undefined;
}

/** The files the footage is — the recording and its poster — while the study has them. */
export function footageKeys(facts: StudyFacts): { key: string; mime?: string }[] {
  const v = facts.video;
  if (!v || footageGone(facts)) return [];
  return [
    ...(v.media.blobKey ? [{ key: v.media.blobKey, mime: v.media.mime }] : []),
    ...(v.media.thumbKey ? [{ key: v.media.thumbKey, mime: 'image/jpeg' }] : []),
  ];
}

/** The files of footage taken off the study — for every device to forget and
 *  the device that sent them to take out of the cloud. */
export function goneKeys(facts: StudyFacts): string[] {
  const g = facts.videoGone;
  const v = facts.video;
  const keys = g ? [g.key, g.thumbKey] : v?.footageDeletedAt ? [v.media.blobKey, v.media.thumbKey] : [];
  return [...new Set(keys.filter((k): k is string => !!k))];
}

/** The facts with the footage taken off: the video no longer names it, the
 *  deletion kept as its own fact. What was found in it is untouched. */
export function withoutFootage(facts: StudyFacts, at: number, by?: string): StudyFacts {
  const v = facts.video;
  if (!v || facts.videoGone) return facts;
  const gone: FootageGone = { at, ...(by ? { by } : {}), key: v.media.blobKey, ...(v.media.thumbKey ? { thumbKey: v.media.thumbKey } : {}) };
  return { ...facts, videoGone: gone, video: { ...v, media: unnamed(v.media), footageDeletedAt: at, ...(by ? { footageDeletedBy: by } : {}) } };
}

/** The facts as they go to the cloud: once the footage is gone, the video
 *  never names it again — even when a later write of the video brought the
 *  name back on this device. */
export function forTheCloud(facts: StudyFacts): StudyFacts {
  const g = facts.videoGone, v = facts.video;
  if (!g || !v || (!v.media.blobKey && !v.media.thumbKey && v.footageDeletedAt)) return facts;
  return { ...facts, video: { ...v, media: unnamed(v.media), footageDeletedAt: v.footageDeletedAt ?? g.at, ...(g.by && !v.footageDeletedBy ? { footageDeletedBy: g.by } : {}) } };
}
