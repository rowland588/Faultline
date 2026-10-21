/* LINE TALK — one person talking on the line, kept as a conversation
 * (docs/LINE-TALK.md; docs/DIRECTION.md: the AI is this one tool).
 *
 * Rowland, 20 October: "Consultant in a line speaking into his phone, the AI
 * listening to everything, allows pause, continue speaking, it remembers
 * everything like Claude chat." So a talk is a study of tool `talk` (no new
 * record: lib/study), on a line or a job, and its conversation is a list of
 * TURNS in its facts — each words said (the phone wrote them into the box as
 * they were said, lib/hearing), words typed, or a photo taken — merged by id
 * between devices as every study's lists are.
 *
 * NOTHING SAID IS LOST. What is sent is kept as sent; a correction after it is
 * kept beside it; struck, never erased. A talk from before 21 October was
 * recorded as well (Rowland, 21 October: "I see my words come up on the
 * interface. I simply press send" replaced the recorder): its recordings are
 * kept for good and played where they were said, and a piece the phone could
 * not write down then says why, the words typed over it.
 *
 * Pure: read the same on every screen and in every test. */
import { niceDay } from './weeks';
import type { StudyFacts } from './study';
import { docAsText, type TalkAskTurn, type TalkDoc } from './talkAssist';

/** A file a turn keeps — on this device (db putBlob), and in the cloud while
 *  the talk names it (supabase/LINE_TALK.sql). */
export interface TalkMedia {
  blobKey: string;
  mime: string;
  capturedAt: number;
  /** A recording's length, in seconds. */
  durationS?: number;
}

/** A turn: a piece said, words typed, a photo — or Line Talk's answer
 *  (slice 2: ask it — lib/talkAssist), its words and any document it wrote. */
export type TalkKind = 'said' | 'typed' | 'photo' | 'reply';

export interface TalkTurn {
  id: string;
  at: number;
  who?: string;
  kind: TalkKind;
  /** said: the recording (a talk before 21 October); photo: the picture. */
  media?: TalkMedia;
  /** said: the words as the phone wrote them down — as sent from the box. */
  heard?: string;
  /** said: what it heard word for word. */
  transcript?: string;
  /** typed: the words; said: the person's correction of what was heard;
   *  photo: what it shows, if said; reply: the answer's words. */
  text?: string;
  /** said: not written down (with why) — the words are typed over it.
   *  `waiting` is a piece recorded before the phone wrote the words down
   *  (20 October), and reads the same. Absent once heard. */
  hearing?: 'waiting' | 'failed';
  /** reply: being answered, or could not be (with why). Absent once answered. */
  answering?: 'waiting' | 'failed';
  why?: string;
  struck?: boolean;
  /** reply: the document it wrote, as it now reads — the person edits it. */
  doc?: TalkDoc;
  /** reply: the document as Line Talk first wrote it, kept once it is edited. */
  docFirst?: TalkDoc;
  /** reply: figures in it found in nothing it was given — said beside it, to check. */
  unsure?: string[];
  /** reply: the model that answered. */
  model?: string;
}

/** The talk's turns, in the order they happened. */
export const turnsOf = (facts: Pick<StudyFacts, 'turns'>): TalkTurn[] =>
  [...(facts.turns ?? [])].sort((a, b) => a.at - b.at || a.id.localeCompare(b.id));

/** A turn's words as they stand: the correction, else what was heard, else
 *  what was typed. */
export const wordsOf = (t: TalkTurn): string => (t.text ?? t.heard ?? '').trim();

/** The person's own turns — said, typed, photographed — not Line Talk's answers. */
export const isTheirs = (t: TalkTurn): boolean => t.kind !== 'reply';

/** A piece said with no words — the phone could not write it down, and nobody has typed them yet. */
export const notWritten = (t: TalkTurn): boolean => t.kind === 'said' && !t.struck && !wordsOf(t);

const many = (n: number, one: string, more = `${one}s`) => `${n} ${n === 1 ? one : more}`;
const minutes = (s: number) => (s < 60 ? `${Math.max(1, Math.round(s))} s` : `${Math.round(s / 60)} min`);

/** A talk in a line — "6 pieces said, 14 min · 2 photos · 1 typed — 1 not written down". */
export function talkSaid(turns: readonly TalkTurn[]): string {
  const answers = turns.filter(t => t.kind === 'reply' && !t.answering && !t.struck);
  const docs = answers.filter(t => t.doc).length;
  const live = turns.filter(t => !t.struck && isTheirs(t));
  const said = live.filter(t => t.kind === 'said');
  if (!live.length) return 'Nothing said yet.';
  const secs = said.reduce((n, t) => n + (t.media?.durationS ?? 0), 0);
  const parts = [
    said.length ? `${many(said.length, 'piece')} said${secs > 0 ? `, ${minutes(secs)}` : ''}` : '',
    live.some(t => t.kind === 'photo') ? many(live.filter(t => t.kind === 'photo').length, 'photo') : '',
    live.some(t => t.kind === 'typed') ? `${live.filter(t => t.kind === 'typed').length} typed` : '',
    answers.length ? many(answers.length, 'answer') : '',
    docs ? many(docs, 'document') : '',
  ].filter(Boolean);
  const unwritten = said.filter(notWritten).length;
  return `${parts.join(' · ')}${unwritten ? ` — ${unwritten} not written down` : ''}.`;
}

/** A new talk's name — "Line 7 — 20 Oct". */
export const talkName = (lineName: string | undefined, day: string): string => `${lineName?.trim() || 'Line Talk'} — ${niceDay(day)}`;

/** The files a talk names: every recording and photo, a struck turn's too
 *  (struck is never erased, and the recordings are kept for good) — what
 *  goes up to the cloud with it (cloud/mappers studies mediaKeys). */
export function talkMediaKeys(facts: Pick<StudyFacts, 'turns'>): { key: string; mime: string }[] {
  return (facts.turns ?? []).flatMap(t => t.media?.blobKey ? [{ key: t.media.blobKey, mime: t.media.mime }] : []);
}

/* ------------------------------------------------ slice 2: asking Line Talk */

/** Each photo's label — P1, P2 … in the order the talk's photos were taken,
 *  a struck one's too, so a label never moves once a document has used it. */
export function photoLabels(turns: readonly TalkTurn[]): Map<string, string> {
  return new Map(turns.filter(t => t.kind === 'photo').map((t, i) => [t.id, `P${i + 1}`]));
}

/** The person's turns since Line Talk last answered — what the next answer is to. */
export function unanswered(turns: readonly TalkTurn[]): TalkTurn[] {
  let from = 0;
  turns.forEach((t, i) => { if (t.kind === 'reply' && !t.answering) from = i + 1; });
  return turns.slice(from).filter(t => isTheirs(t) && !t.struck);
}

/** The reply being answered or not answered yet, if there is one — asked again in its place. */
export const pendingReply = (turns: readonly TalkTurn[]): TalkTurn | undefined =>
  [...turns].reverse().find(t => t.kind === 'reply' && !!t.answering && !t.struck);

const clockOf = (ms: number) => new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
const dayOf = (ms: number) => new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

/** The conversation as it goes to the gateway (lib/talkAssist TalkAsk): every
 *  turn not struck, in order — its words as they stand, a photo by its label,
 *  Line Talk's own answers with any document as words — each marked with its
 *  time, and with its day where the talk goes on to another. An answer not
 *  given yet is left out. */
export function askTurnsOf(turns: readonly TalkTurn[]): TalkAskTurn[] {
  const labels = photoLabels(turns);
  let day = '';
  return turns.filter(t => !t.struck && !(t.kind === 'reply' && t.answering)).flatMap((t): TalkAskTurn[] => {
    const d = dayOf(t.at);
    const at = d === day ? clockOf(t.at) : `${d} ${clockOf(t.at)}`;
    day = d;
    if (t.kind === 'photo') return [{ kind: 'photo', at, text: wordsOf(t), photo: labels.get(t.id) ?? 'P0' }];
    if (t.kind === 'reply') return [{ kind: 'reply', at, text: [wordsOf(t), t.doc ? docAsText(t.doc) : ''].filter(Boolean).join('\n\n') }];
    const w = wordsOf(t);
    return [{ kind: t.kind, at, text: w || (t.kind === 'said' ? '(a piece not written down)' : '') }];
  }).filter(t => t.kind === 'photo' || t.text);
}

/** The photos whose pictures go with the next question: the newest, as many
 *  as the gateway takes — older ones go by their label alone. */
export function photosToSend(turns: readonly TalkTurn[], max: number): TalkTurn[] {
  return turns.filter(t => t.kind === 'photo' && !t.struck && t.media).slice(-max);
}
