/* THE MACHINE REPORT IN PLAIN WORDS (27 October — Rowland: "it's difficult to read ... it must be easy to read plain
 * English, and nobody can make a mistake when reading this").
 *
 * The machine report (lib/machineDetail) carries the words the modules already say — lib/machineRecord's "late — was
 * 26 Oct", lib/programJourney's "Test 1 · 22 Oct · aiming 60 ppm for 60 min · set at 58 ppm · … — didn't pass: …".
 * Read alone on paper those left a reader to guess: a bare "1 Nov" (booked? due?), "netted 52 ppm", a problem's
 * place where its status should be. This says each thing once, labelled: the status as one word in its colour, when
 * as "was due 26 Oct" or "booked for 1 Nov", an attempt as "Attempt 1 · 22 Oct — DIDN'T PASS" with what it aimed at
 * and what it did in whole words under it. Nothing is worked out here — every figure is the module's. Pure. */
import type { Attempt } from './programJourney';
import type { MachineTone } from './machineRecord';
import type { TestItem } from './testing';
import type { PaperDetail, PaperTone } from './machinePaper';
import { isoDay, niceDay } from './weeks';

/** What kind of thing a row is, for its status word: a test is passed or booked, a step done or due. */
export type PlainKind = 'test' | 'step' | 'fix' | 'problem';

const DATE = /^\d{1,2} [A-Z][a-z]{2}( \d{4})?$/;

/** The status of a row as one word in capitals — the coloured label on its card — and its colour. */
export function statusWord(kind: PlainKind, tone: MachineTone, word: string, o: { critical?: boolean; risk?: boolean } = {}): { word: string; tone: PaperTone } {
  if (kind === 'problem') return o.critical ? { word: 'CRITICAL', tone: 'r' } : o.risk ? { word: 'HIGH RISK', tone: 'a' } : { word: 'OPEN', tone: 'a' };
  switch (tone) {
    case 'done': return { word: kind === 'test' ? 'PASSED' : kind === 'fix' ? 'FIXED' : 'DONE', tone: 'g' };
    case 'late': return /did not happen|didn.t run/i.test(word) ? { word: 'DID NOT HAPPEN', tone: 'r' } : { word: 'LATE', tone: 'r' };
    case 'failed': return /didn.t run|did not happen|not run/i.test(word) ? { word: 'DIDN’T RUN', tone: 'r' } : { word: 'DIDN’T PASS', tone: 'r' };
    case 'problem': return kind === 'fix' ? { word: 'DUE SOON', tone: 'a' } : { word: 'A PROBLEM', tone: 'a' };
    case 'asking': return { word: 'NEEDS A DECISION', tone: 'a' };
    case 'ahead': return { word: kind === 'test' ? 'BOOKED' : 'DUE', tone: 'w' };
    default: return { word: 'NO DAY SET', tone: 'n' };
  }
}

/** When, said whole — "was due 26 Oct", "booked for 1 Nov", "due 4 Nov", "18 Oct" — from the module's word. */
export function whenWords(kind: PlainKind, tone: MachineTone, word: string): string {
  const w = word.trim();
  if (!w || /^no day set$/i.test(w)) return 'no day set yet';
  if (/^late — was /.test(w)) return `was due ${w.slice('late — was '.length)}`;
  if (tone === 'done' || tone === 'failed') return w.replace(/^(done|passed|fixed|didn.t pass|didn.t run|did not happen)\s*/i, '') || w;
  if (DATE.test(w)) return kind === 'test' ? `booked for ${w}` : `due ${w}`;
  return w.charAt(0).toLowerCase() + w.slice(1);
}

/** A run's figures in whole words — "aiming 60 ppm for 60 min · net 52 ppm" → "aimed for 60 packs a minute for 60
 *  minutes, at least 52 good packs a minute"; "set at 58 ppm · ran 60 min · 3,150 packs · 30 rejects · netted 52 ppm"
 *  → "machine set at 58 packs a minute · ran 60 minutes · 3,150 packs · 30 rejects · 52 good packs a minute". */
export function runWords(s: string): string {
  return s
    .replace(/\baiming ([\d.,]+) ppm/g, 'aimed for $1 packs a minute')
    .replace(/\s*·\s*net ([\d.,]+) ppm/g, ', at least $1 good packs a minute')
    .replace(/\bset at ([\d.,]+) ppm/g, 'machine set at $1 packs a minute')
    .replace(/\bnetted ([\d.,]+) ppm/g, '$1 good packs a minute')
    .replace(/\b([\d.,]+) ppm\b/g, '$1 packs a minute')
    .replace(/\b([\d.,]+) min\b/g, (_, n) => `${n} minute${n === '1' ? '' : 's'}`);
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** The result of one attempt in capitals — "PASSED", "DIDN'T PASS", "BOOKED FOR 1 NOV". */
function resultWord(word: string): string {
  const w = word.trim();
  if (/^booked /.test(w)) return `BOOKED FOR ${w.slice(7).toUpperCase()}`;
  return w.toUpperCase().replace(/'/g, '’');
}

/** One attempt of a test or a program, labelled: "Attempt 2 · 26 Oct" — PASSED — what was seen; under it what it
 *  aimed at and what it did, in whole words. */
export function attemptDetail(a: Pick<Attempt, 'n' | 'when' | 'aim' | 'did' | 'result' | 'seen' | 'test'>): PaperDetail {
  const ran = !!a.test.ranOn;
  const more = [a.aim ? cap(runWords(a.aim)) : '', a.did ? `It ran: ${runWords(a.did)}` : ''].filter(Boolean).join('. ');
  return {
    label: `Attempt ${a.n}${ran ? ` · ${a.when}` : ''}`,
    word: resultWord(a.result.word), tone: a.result.tone,
    text: a.seen ?? (ran ? '' : a.when === 'no day yet' ? 'not booked yet' : ''),
    ...(more ? { more: `${more}.` } : {}),
  };
}

/** The same, from the line programJourney prints — for a program's tests, which the Programs report hands over as
 *  that line: "Test 1 · 26 Oct · aiming … · set at … — passed: 500 packs, no rejects". */
export function attemptFromLine(line: string, tone: PaperTone): PaperDetail {
  const at = line.indexOf(' — ');
  const head = at < 0 ? line : line.slice(0, at), tail = at < 0 ? '' : line.slice(at + 3);
  const parts = head.split(' · ');
  const n = /^Test (\d+)$/.exec(parts[0] ?? '')?.[1];
  const day = parts[1] && DATE.test(parts[1]) ? parts[1] : undefined;
  const figures = parts.slice(day ? 2 : 1).join(' · ');
  const colon = tail.indexOf(': ');
  const word = colon < 0 ? tail : tail.slice(0, colon), seen = colon < 0 ? '' : tail.slice(colon + 2);
  const aimAt = figures.indexOf('aiming'), setAt = figures.search(/set at|ran |\d[\d,.]* packs/);
  const aim = aimAt >= 0 ? figures.slice(aimAt, setAt > aimAt ? setAt : undefined).replace(/\s*·\s*$/, '') : '';
  const did = setAt >= 0 && setAt !== aimAt ? figures.slice(setAt) : aimAt < 0 ? figures : '';
  const more = [aim ? cap(runWords(aim)) : '', did ? `It ran: ${runWords(did)}` : ''].filter(Boolean).join('. ');
  return {
    label: n ? `Attempt ${n}${day ? ` · ${day}` : ''}` : head,
    word: resultWord(word), tone, text: seen,
    ...(more ? { more: `${more}.` } : {}),
  };
}

/** What was written on a test or a step — a problem found, the next step agreed, a note — labelled with its kind and
 *  day, then who has it, by when, the hours it lost and whether it is done, each said whole. */
export function itemDetail(i: TestItem): PaperDetail {
  const kind: Record<TestItem['kind'], string> = { found: 'Problem found', next: 'Next step', note: 'Note', today: 'Planned for the day' };
  const done = i.doneAt != null && i.kind !== 'note';
  const more = [
    i.impact ? `What it means: ${i.impact}` : '',
    i.owner ? `Who has it: ${/^us$/i.test(i.owner.trim()) ? 'us — our own team' : i.owner}` : '',
    i.due ? `By: ${niceDay(i.due)}` : '',
    i.hoursLost ? `Time lost: ${i.hoursLost} hour${i.hoursLost === 1 ? '' : 's'}` : '',
  ].filter(Boolean).join(' · ');
  return {
    label: `${kind[i.kind] ?? 'Note'} · ${niceDay(isoDay(i.createdAt))}`,
    ...(i.critical ? { word: 'CRITICAL', tone: 'r' as const } : i.risk ? { word: 'HIGH RISK', tone: 'a' as const } : done ? { word: 'DONE', tone: 'g' as const } : {}),
    text: i.what,
    ...(more || (done && (i.critical || i.risk)) ? { more: [more, done && (i.critical || i.risk) ? 'Done' : ''].filter(Boolean).join(' · ') } : {}),
  };
}
