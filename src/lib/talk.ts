/* LINE TALK — one person talking on the line, kept as a conversation
 * (docs/LINE-TALK.md; docs/DIRECTION.md: the AI is this one tool).
 *
 * Rowland, 20 October: "Consultant in a line speaking into his phone, the AI
 * listening to everything, allows pause, continue speaking, it remembers
 * everything like Claude chat." So a talk is a study of tool `talk` (no new
 * record: lib/study), on a line or a job, and its conversation is a list of
 * TURNS in its facts — each a piece said (the recording kept for good, and
 * what was heard), a photo taken, or words typed — merged by id between
 * devices as every study's lists are.
 *
 * NOTHING SAID IS LOST. A piece is kept the moment it is recorded; what the
 * voice service hears is written beside it, never over it; a correction is
 * kept beside what was heard; a piece that could not be heard yet waits, and
 * is heard when it can be. Struck, never erased.
 *
 * Pure: read the same on every screen and in every test. */
import { niceDay } from './weeks';
import type { StudyFacts } from './study';

/** A file a turn keeps — on this device (db putBlob), and in the cloud while
 *  the talk names it (supabase/LINE_TALK.sql). */
export interface TalkMedia {
  blobKey: string;
  mime: string;
  capturedAt: number;
  /** A recording's length, in seconds. */
  durationS?: number;
}

export type TalkKind = 'said' | 'typed' | 'photo';

export interface TalkTurn {
  id: string;
  at: number;
  who?: string;
  kind: TalkKind;
  /** said: the recording; photo: the picture. */
  media?: TalkMedia;
  /** said: what the voice service heard, as clean sentences. */
  heard?: string;
  /** said: what it heard word for word. */
  transcript?: string;
  /** typed: the words; said: the person's correction of what was heard;
   *  photo: what it shows, if said. */
  text?: string;
  /** said: not heard yet, or could not be (with why). Absent once heard. */
  hearing?: 'waiting' | 'failed';
  why?: string;
  struck?: boolean;
}

/** The longest piece sent to be heard — a long stretch of talk is cut into
 *  pieces this long as it is said, so each goes to the voice service whole
 *  (a minute of 16 kHz speech is well inside what the service takes). */
export const PIECE_SECONDS = 60;

/** The talk's turns, in the order they happened. */
export const turnsOf = (facts: Pick<StudyFacts, 'turns'>): TalkTurn[] =>
  [...(facts.turns ?? [])].sort((a, b) => a.at - b.at || a.id.localeCompare(b.id));

/** A turn's words as they stand: the correction, else what was heard, else
 *  what was typed. */
export const wordsOf = (t: TalkTurn): string => (t.text ?? t.heard ?? '').trim();

/** Pieces said and not heard yet — heard when there is signal. */
export const toHear = (turns: readonly TalkTurn[]): TalkTurn[] =>
  turns.filter(t => t.kind === 'said' && !t.struck && t.hearing === 'waiting');

/** The whole talk as words, in order — a photo said where it was taken —
 *  for the voice service's sense of what came before, and later for what is
 *  asked of the talk. */
export function talkText(turns: readonly TalkTurn[]): string {
  return turns.filter(t => !t.struck).map(t => {
    if (t.kind === 'photo') return `[photo${t.text ? `: ${t.text}` : ''}]`;
    const w = wordsOf(t);
    return w || (t.kind === 'said' ? '[a piece not heard yet]' : '');
  }).filter(Boolean).join('\n');
}

/** What was said before a piece — its last `max` characters, cut at a word —
 *  so "same as the last one" and "the machine after the sealer" are heard
 *  with what they point at. */
export function earlierOf(turns: readonly TalkTurn[], beforeAt: number, max = 1500): string {
  const text = talkText(turns.filter(t => t.at < beforeAt));
  if (text.length <= max) return text;
  const cut = text.slice(text.length - max);
  const space = cut.indexOf(' ');
  return `…${space >= 0 ? cut.slice(space + 1) : cut}`;
}

const many = (n: number, one: string, more = `${one}s`) => `${n} ${n === 1 ? one : more}`;
const minutes = (s: number) => (s < 60 ? `${Math.max(1, Math.round(s))} s` : `${Math.round(s / 60)} min`);

/** A talk in a line — "6 pieces said, 14 min · 2 photos · 1 typed — 1 waiting to be heard". */
export function talkSaid(turns: readonly TalkTurn[]): string {
  const live = turns.filter(t => !t.struck);
  const said = live.filter(t => t.kind === 'said');
  if (!live.length) return 'Nothing said yet.';
  const secs = said.reduce((n, t) => n + (t.media?.durationS ?? 0), 0);
  const parts = [
    said.length ? `${many(said.length, 'piece')} said${secs > 0 ? `, ${minutes(secs)}` : ''}` : '',
    live.some(t => t.kind === 'photo') ? many(live.filter(t => t.kind === 'photo').length, 'photo') : '',
    live.some(t => t.kind === 'typed') ? `${live.filter(t => t.kind === 'typed').length} typed` : '',
  ].filter(Boolean);
  const waiting = toHear(live).length, failed = said.filter(t => t.hearing === 'failed').length;
  const tail = [waiting ? `${waiting} waiting to be heard` : '', failed ? `${failed} could not be heard` : ''].filter(Boolean).join(', ');
  return `${parts.join(' · ')}${tail ? ` — ${tail}` : ''}.`;
}

/** A new talk's name — "Line 7 — 20 Oct". */
export const talkName = (lineName: string | undefined, day: string): string => `${lineName?.trim() || 'Line Talk'} — ${niceDay(day)}`;

/** The files a talk names: every recording and photo, a struck turn's too
 *  (struck is never erased, and the recordings are kept for good) — what
 *  goes up to the cloud with it (cloud/mappers studies mediaKeys). */
export function talkMediaKeys(facts: Pick<StudyFacts, 'turns'>): { key: string; mime: string }[] {
  return (facts.turns ?? []).flatMap(t => t.media?.blobKey ? [{ key: t.media.blobKey, mime: t.media.mime }] : []);
}
