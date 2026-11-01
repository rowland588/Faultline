/* THE A3 SHEET — ONE MODULE FOR THE BOARD AND THE PAPER (docs/METHODS.md §16; knowledge/methods/rca/a3.md).
 *
 * Toyota's one sheet: the left column is how it is now (background, current condition, target), the right column is what is to be
 * done (analysis, countermeasures, plan, follow-up), read top-left to bottom-right. The screen (shapes/A3Board) and the paper
 * (lib/report/a3Paper) both take THIS model, so they cannot part. Pure: answers in (field id → words), sheet out. The countermeasures
 * are a list — manufacturing is many — kept as answers `counter`, `counter@2`, `counter@3`…, each "what | who | by when | against
 * which cause". A missing input is named; nothing is invented. */
import { fieldsOf } from '../../../lib/methodSheet';

export const CM_SEP = ' | ';
export interface Countermeasure { what: string; who: string; when: string; cause: string }
export const CM_COLUMNS: readonly { key: keyof Countermeasure; label: string }[] = [
  { key: 'what', label: 'What' }, { key: 'who', label: 'Who' }, { key: 'when', label: 'By when' }, { key: 'cause', label: 'Against which cause' },
];

/** One answer → one countermeasure. An older answer with no separator is the whole of "what". */
export function parseCm(text: string | undefined): Countermeasure {
  const p = (text ?? '').split(CM_SEP).map(x => x.trim());
  return { what: p[0] ?? '', who: p[1] ?? '', when: p[2] ?? '', cause: p.slice(3).join(CM_SEP) };
}
/** One countermeasure → its answer (blank when empty; only "what" when the rest are empty, so an older answer reads back the same). */
export function joinCm(c: Countermeasure): string {
  const what = c.what.trim(), rest = [c.who, c.when, c.cause].map(x => x.trim());
  if (!what && rest.every(x => !x)) return '';
  return rest.every(x => !x) ? what : [what, ...rest].join(CM_SEP);
}
export const cmField = (n: number): string => (n <= 1 ? 'counter' : `counter@${n}`);
/** The countermeasures held, in order, numbered by the row they are kept in — always at least row 1 so there is a place to write. */
export function cmRows(answers: Readonly<Record<string, string>>): { n: number; cm: Countermeasure }[] {
  let last = 1;
  for (const k of Object.keys(answers)) { const m = /^counter@(\d+)$/.exec(k); if (m && (answers[k] ?? '').trim() && +m[1] > last) last = +m[1]; }
  return Array.from({ length: last }, (_, i) => ({ n: i + 1, cm: parseCm(answers[cmField(i + 1)]) }));
}
/** Only the rows with something written. */
export const cmWritten = (answers: Readonly<Record<string, string>>) =>
  cmRows(answers).filter(r => joinCm(r.cm) !== '');

export interface A3Evidence { title: string; says: string }
/** A cause on the project's fishbone, as the analysis block reads it (read only — the fishbone keeps it). */
export interface CauseRead { text: string; root: boolean; whys: number }
const same = (a: string, b: string) => { const x = a.trim().toLowerCase(), y = b.trim().toLowerCase(); return !!x && !!y && (x === y || x.includes(y) || y.includes(x)); };
/** What the project's fishbone says at the analysis: how many causes, the roots, and which root has no countermeasure naming it
 *  (the record: every cause has a countermeasure or a reason not). Absent when the fishbone holds none. */
export function causesEvidence(causes: readonly CauseRead[], cms: readonly { cm: Countermeasure }[]): A3Evidence | undefined {
  if (!causes.length) return undefined;
  const roots = causes.filter(c => c.root);
  const bare = roots.filter(r => !cms.some(m => same(m.cm.cause, r.text)));
  const rootsSaid = roots.length ? `${roots.length} marked as the root: ${roots.map(r => `“${r.text}” (${r.whys} ${r.whys === 1 ? 'why' : 'whys'})`).join('; ')}` : 'none marked as the root yet';
  const cover = roots.length && bare.length ? ` No countermeasure names ${bare.map(r => `“${r.text}”`).join(' or ')} yet.` : roots.length ? ' Every root has a countermeasure that names it.' : '';
  return { title: 'The project’s fishbone', says: `${causes.length} ${causes.length === 1 ? 'cause' : 'causes'} on the fishbone, ${rootsSaid}.${cover}` };
}
export interface A3Field { id: string; label: string; hint: string; line?: boolean; value: string }
export interface A3Block {
  n: number; title: string; side: 'left' | 'right';
  /** The question the block answers — for the screen. */
  asks: string;
  /** Section it is kept in (lib/methods) and its fields, in the module's order. */
  section: string; fields: A3Field[];
  /** The block is the countermeasure list. */
  list?: boolean;
  /** What the project's own record of a tool says here — read only, never typed. */
  evidence?: A3Evidence;
}
export interface A3Sheet {
  problem: string; owner: string; agreed: string;
  blocks: A3Block[];
  cms: { n: number; cm: Countermeasure }[];
  /** Countermeasures that name no cause — a to-do list, not a countermeasure. */
  noCause: number;
  /** How many of the seven blocks have something written. */
  written: number;
  /** The closing line — in words, never colour alone. */
  says: string;
}

const BLOCK_DEFS: readonly { n: number; title: string; side: 'left' | 'right'; asks: string; section: string; ids: readonly string[]; list?: boolean }[] = [
  { n: 1, title: 'Background', side: 'left', asks: 'Why does it matter to the business?', section: 'Background', ids: ['why'] },
  { n: 2, title: 'Current condition', side: 'left', asks: 'What is happening now, as a number?', section: 'Current condition', ids: ['current', 'currentnum'] },
  { n: 3, title: 'Target', side: 'left', asks: 'What number do we want, and by when?', section: 'Target', ids: ['target'] },
  { n: 4, title: 'Analysis', side: 'right', asks: 'Why is it so — the root cause, and how is it known?', section: 'Analysis', ids: ['root', 'evidence'] },
  { n: 5, title: 'Countermeasures', side: 'right', asks: 'What will we do, who, by when, against which cause?', section: 'Countermeasures', ids: [], list: true },
  { n: 6, title: 'Plan', side: 'right', asks: 'In what order, on which days?', section: 'Plan and follow-up', ids: ['plan'] },
  { n: 7, title: 'Follow-up', side: 'right', asks: 'Was the number checked — did it hold?', section: 'Plan and follow-up', ids: ['followup', 'followdate', 'held', 'agreed'] },
];
/** The header's fields ride on the first section; the sheet draws them over both columns. */
export const HEADER_IDS = ['problem', 'owner'] as const;

export function a3Sheet(answers: Readonly<Record<string, string>>, evidence: { current?: A3Evidence; followup?: A3Evidence; causes?: readonly CauseRead[] } = {}): A3Sheet {
  const v = (id: string) => (answers[id] ?? '').trim();
  const blocks: A3Block[] = BLOCK_DEFS.map(d => ({
    n: d.n, title: d.title, side: d.side, asks: d.asks, section: d.section, ...(d.list ? { list: true } : {}),
    fields: d.ids.map(id => {
      const fd = fieldsOf('a3', d.section).find(x => x.id === id);
      return { id, label: fd?.label ?? id, hint: fd?.hint ?? '', ...(fd?.line ? { line: true } : {}), value: v(id) };
    }),
    ...(d.n === 2 && evidence.current ? { evidence: evidence.current } : {}),
    ...(d.n === 7 && evidence.followup ? { evidence: evidence.followup } : {}),
  }));
  const cms = cmWritten(answers);
  const fish = causesEvidence(evidence.causes ?? [], cms);
  if (fish) blocks[3].evidence = fish;
  const noCause = cms.filter(r => !r.cm.cause.trim()).length;
  const wrote = (b: A3Block) => (b.list ? cms.length > 0 : b.fields.some(x => x.value !== ''));
  const written = blocks.filter(wrote).length;
  const follow = blocks[6];
  const open = follow.fields.find(x => x.id === 'held')?.value === '' && follow.fields.find(x => x.id === 'followup')?.value === '';
  const says = written === 0 ? 'Nothing is written on the sheet yet.'
    : `${written} of 7 blocks written${open ? ' · the follow-up is not written — the page lives until it is' : ''}${noCause ? ` · ${noCause} countermeasure${noCause === 1 ? '' : 's'} name${noCause === 1 ? 's' : ''} no cause` : ''}.`;
  return { problem: v('problem'), owner: v('owner'), agreed: v('agreed'), blocks, cms, noCause, written, says };
}

/** The studies that speak at the current condition and the follow-up — the newest of the tools that show a number. */
export const CURRENT_TOOLS = ['capability', 'chart', 'losses', 'map', 'sampling'] as const;
export const FOLLOWUP_TOOLS = ['analysis', 'chart', 'capability'] as const;
export function latestOf<T extends { tool: string; updatedAt: number; deletedAt?: number }>(studies: readonly T[], tools: readonly string[]): T | undefined {
  return studies.filter(s => !s.deletedAt && tools.includes(s.tool)).sort((a, b) => b.updatedAt - a.updatedAt || tools.indexOf(a.tool) - tools.indexOf(b.tool))[0];
}

/** The two studies the sheet reads: the newest that shows the number, and — a different one — the newest that shows it again (the
 *  follow-up). One study is never both: a before-and-after needs two. */
export function evidencePair<T extends { id: string; tool: string; updatedAt: number; deletedAt?: number }>(studies: readonly T[]): { current?: T; followup?: T } {
  const current = latestOf(studies, CURRENT_TOOLS);
  const followup = latestOf(studies.filter(s => s.id !== current?.id), FOLLOWUP_TOOLS);
  return { ...(current ? { current } : {}), ...(followup ? { followup } : {}) };
}
