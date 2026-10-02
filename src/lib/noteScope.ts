/* WHAT A MEETING NOTE IS ABOUT — in the job's own words.
 *
 * Rowland, on the notes screen: "all I have is install section to pick from —
 * the options make no sense, they don't match what's in the actual stages."
 *
 * The picker listed only RECORDS that existed — install steps, as a jumble of
 * "Dry run — Wrapper", "Positioned and levelled — Checkweigher" in no stage order
 * — so a job with nothing past Install offered nothing past Install, and there
 * was no way to say a note was about Set up, or Commission, or a machine, because
 * those are not records. The tabs say Install · Set up · Commission · Hand over ·
 * Fixes; so does this.
 *
 * A note is still a test item with a `testId`. That field already held a record's
 * id, or '' for the whole job. A gate or a machine is spelled in the same field —
 * `gate:setup`, `asset:<id>` — so nothing is stored differently, old notes read
 * exactly as before, and a note about a record that has since gone falls back to
 * the whole job as it always did. */
import { gateOf, live, type Asset, type Test } from './testing';

export type NoteGate = 'install' | 'setup' | 'commission' | 'handover' | 'fixes' | 'materials';

/** The same order, and the same words, as the tabs along the top of a job. */
export const NOTE_GATES: { id: NoteGate; label: string }[] = [
  { id: 'install', label: 'Install' },
  { id: 'setup', label: 'Set up' },
  { id: 'commission', label: 'Commission' },
  { id: 'handover', label: 'Hand over' },
  { id: 'fixes', label: 'Fixes' },
  { id: 'materials', label: 'Materials' },
];

export type NoteScope =
  | { kind: 'job' }
  | { kind: 'gate'; gate: NoteGate }
  | { kind: 'machine'; assetId: string }
  | { kind: 'record'; testId: string };

const GATE_PREFIX = 'gate:';
const ASSET_PREFIX = 'asset:';

export const encodeScope = (s: NoteScope): string =>
  s.kind === 'job' ? '' : s.kind === 'gate' ? GATE_PREFIX + s.gate : s.kind === 'machine' ? ASSET_PREFIX + s.assetId : s.testId;

/** What a stored `testId` means. A gate or machine that is no longer there, and
 *  a record that has been deleted, both read as the whole job — a note is never
 *  lost for pointing at something that has gone. */
export function decodeScope(testId: string, tests: Test[], assets: Asset[]): NoteScope {
  if (!testId) return { kind: 'job' };
  if (testId.startsWith(GATE_PREFIX)) {
    const g = NOTE_GATES.find(x => x.id === testId.slice(GATE_PREFIX.length));
    return g ? { kind: 'gate', gate: g.id } : { kind: 'job' };
  }
  if (testId.startsWith(ASSET_PREFIX)) {
    const id = testId.slice(ASSET_PREFIX.length);
    return live(assets).some(a => a.id === id) ? { kind: 'machine', assetId: id } : { kind: 'job' };
  }
  return live(tests).some(t => t.id === testId) ? { kind: 'record', testId } : { kind: 'job' };
}

/** Which gate a record belongs to, by the tab it lives under. */
export function gateOfRecord(t: Test): NoteGate {
  if (t.kind === 'fix') return 'fixes';
  if (t.kind === 'install') return gateOf(t);
  return 'commission';
}

const gateWord = (g: NoteGate) => NOTE_GATES.find(x => x.id === g)?.label ?? g;
const gateRank = (g: NoteGate) => NOTE_GATES.findIndex(x => x.id === g);

/** The records a scope can be narrowed to, in the order the job runs: by gate,
 *  then in the order they were planned. For a gate it is that gate's records;
 *  for a machine, everything on it. */
export function recordsUnder(scope: NoteScope, tests: Test[], assets: Asset[]): Test[] {
  const mine = live(tests);
  const machineRank = new Map(live(assets).map((a, i) => [a.id, a.sort ?? i]));
  const inOrder = (a: Test, b: Test) =>
    gateRank(gateOfRecord(a)) - gateRank(gateOfRecord(b))
    || (machineRank.get(a.assetId ?? '') ?? 1e9) - (machineRank.get(b.assetId ?? '') ?? 1e9)
    || a.sort - b.sort || a.title.localeCompare(b.title);
  if (scope.kind === 'gate') return mine.filter(t => gateOfRecord(t) === scope.gate).sort(inOrder);
  if (scope.kind === 'machine') return mine.filter(t => t.assetId === scope.assetId).sort(inOrder);
  return [];
}

/** "Whole project", "Install", "Wrapper", "Install · Dry run — Wrapper". */
export function scopeLabel(scope: NoteScope, tests: Test[], assets: Asset[]): string {
  if (scope.kind === 'job') return 'The whole project';
  if (scope.kind === 'gate') return gateWord(scope.gate);
  if (scope.kind === 'machine') return live(assets).find(a => a.id === scope.assetId)?.name ?? 'A machine';
  const t = live(tests).find(x => x.id === scope.testId);
  if (!t) return 'The whole project';
  const m = live(assets).find(a => a.id === t.assetId)?.name;
  return `${gateWord(gateOfRecord(t))} · ${t.title}${m ? ` — ${m}` : ''}`;
}

/** Where a group of notes sits when they are listed: the whole project first,
 *  then each gate in order, then each machine, then single records by the gate
 *  they belong to. */
export function scopeRank(scope: NoteScope, tests: Test[], assets: Asset[]): number {
  if (scope.kind === 'job') return 0;
  if (scope.kind === 'gate') return 1 + gateRank(scope.gate);
  if (scope.kind === 'machine') return 20 + (live(assets).findIndex(a => a.id === scope.assetId));
  const t = live(tests).find(x => x.id === scope.testId);
  return 100 + (t ? gateRank(gateOfRecord(t)) : 0);
}

/** The scope a narrower choice sits inside — what the first box should show
 *  when the second names a record. */
export function parentScope(scope: NoteScope, tests: Test[]): NoteScope {
  if (scope.kind !== 'record') return scope;
  const t = live(tests).find(x => x.id === scope.testId);
  return t ? { kind: 'gate', gate: gateOfRecord(t) } : { kind: 'job' };
}
