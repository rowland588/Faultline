/* DMAIC'S CHARTER AND PHASE GATES — one module, so the board and the Charter paper cannot part (docs/METHODS.md §16; ISO 13053-1).
 * The charter is Define's own questions; each phase ends in a review (a tollgate): who held it, when, and what it decided. The
 * reviews are answers of the same sheet (`rv_<phase>_who|when|result|note`, kept as `method:dmaic:<id>`) — nothing new is stored.
 * A review never locks the next phase (the floor starts Measure while Define's review is booked); it is said in words. Pure. */
import { fieldsOf, sectionState } from '../../../lib/methodSheet';
import { studyLine } from '../../../lib/studyLinks';
import type { ToolStudy } from '../../../lib/study';

export const PHASES = [
  { key: 'define', name: 'Define', asks: 'Is the problem worth solving, and is it agreed what “done” is?' },
  { key: 'measure', name: 'Measure', asks: 'Can the measure be trusted, and where is it today?' },
  { key: 'analyse', name: 'Analyse', asks: 'Which causes are proved by data?' },
  { key: 'improve', name: 'Improve', asks: 'Did the chosen solution move the measure in a pilot?' },
  { key: 'control', name: 'Control', asks: 'Is the gain held, and handed to the process owner?' },
] as const;
export type PhaseKey = typeof PHASES[number]['key'];

export const RESULTS = [
  { k: 'passed', word: 'Passed' },
  { k: 'conditions', word: 'Passed with conditions' },
  { k: 'held', word: 'Held' },
] as const;
export type ResultKey = typeof RESULTS[number]['k'];

export const reviewId = (p: PhaseKey, part: 'who' | 'when' | 'result' | 'note'): string => `rv_${p}_${part}`;

export type GateTone = 'n' | 'w' | 'g' | 'a' | 'r';
export interface Review { who: string; when: string; result?: ResultKey; note: string }
export interface Gate {
  key: PhaseKey; name: string; asks: string;
  written: number; fields: number;
  review: Review;
  /** In words, never colour alone. */
  state: 'Not started' | 'Under way' | 'Ready for review' | 'Passed' | 'Passed with conditions' | 'Held';
  tone: GateTone;
}

const clean = (a: Readonly<Record<string, string>>, id: string): string => (a[id] ?? '').trim();
const resultOf = (v: string): ResultKey | undefined => RESULTS.find(r => r.k === v)?.k;

/** The day as the paper and the board say it: 14 Nov 2026. A value that is not a day is shown as typed. */
export function dayWords(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export function gatesOf(answers: Readonly<Record<string, string>>): Gate[] {
  return PHASES.map(p => {
    const st = sectionState('dmaic', p.name, answers);
    const review: Review = { who: clean(answers, reviewId(p.key, 'who')), when: clean(answers, reviewId(p.key, 'when')), result: resultOf(clean(answers, reviewId(p.key, 'result'))), note: clean(answers, reviewId(p.key, 'note')) };
    const state: Gate['state'] = review.result === 'passed' ? 'Passed' : review.result === 'conditions' ? 'Passed with conditions' : review.result === 'held' ? 'Held'
      : st.written === 0 ? 'Not started' : st.written === st.fields ? 'Ready for review' : 'Under way';
    const tone: GateTone = review.result === 'passed' ? 'g' : review.result === 'conditions' ? 'a' : review.result === 'held' ? 'r' : state === 'Not started' ? 'n' : 'w';
    return { key: p.key, name: p.name, asks: p.asks, written: st.written, fields: st.fields, review, state, tone };
  });
}

/** The phase the project is in: the first not yet passed (with or without conditions). Undefined once Control has passed. */
export function currentGate(gates: readonly Gate[]): Gate | undefined {
  return gates.find(g => g.review.result !== 'passed' && g.review.result !== 'conditions');
}

/** One sentence for the strip. */
export function gatesSay(gates: readonly Gate[]): string {
  const passed = gates.filter(g => g.review.result === 'passed' || g.review.result === 'conditions').length;
  const held = gates.find(g => g.review.result === 'held');
  const cur = currentGate(gates);
  if (!cur) return 'All five phases have passed their review.';
  const lead = `${passed} of 5 phase reviews passed.`;
  if (held) return `${lead} ${held.name} was held at its review — what it was held for is on its card.`;
  return `${lead} In ${cur.name}: ${cur.state.toLowerCase()}${cur.state === 'Ready for review' && !cur.review.when ? ' — book its review' : ''}.`;
}

/** The previous phase's review, said when it has not passed, in the card of the one after (advice, never a lock). */
export function waitingOn(gates: readonly Gate[], key: PhaseKey): string | undefined {
  const i = gates.findIndex(g => g.key === key);
  const before = i > 0 ? gates[i - 1] : undefined;
  if (!before || before.review.result === 'passed' || before.review.result === 'conditions') return undefined;
  return before.review.result === 'held' ? `${before.name} was held — this phase waits for it to pass.` : `${before.name} has not passed its review yet.`;
}

export interface CharterRow { id: string; label: string; value: string }
export interface Charter { rows: CharterRow[]; written: number; total: number; says: string; missing: string[] }
/** The charter is Define's own questions, in their order: written or not, each by its label. */
export function charterOf(answers: Readonly<Record<string, string>>): Charter {
  const rows = fieldsOf('dmaic', 'Define').map(fl => ({ id: fl.id, label: fl.label, value: clean(answers, fl.id) }));
  const written = rows.filter(r => r.value).length;
  const missing = rows.filter(r => !r.value).map(r => r.label);
  return {
    rows, written, total: rows.length, missing,
    says: written === rows.length ? 'The charter is complete — ready for its Define review.' : written === 0 ? 'The charter is not written yet.' : `${written} of ${rows.length} charter items written; still to write: ${missing.join(' · ')}.`,
  };
}

/* ---- where the project's tools already speak (read-only; never required) ---- */
export interface Insertion {
  id: string; phase: PhaseKey;
  /** The question it answers, in the sheet's words. */
  question: string;
  /** The tool's key in the app (registry) and the catalogue id the board starts it by. */
  tool: string; toolName: string; fc: string;
  /** Where it opens when that is a page of its own inside the tool (a document's list, /doc/charter). */
  at?: string;
  /** The latest study's own sentence, absent when there is none in this project. */
  says?: string; name?: string; studyCount: number;
}
const GAUGE_KINDS = new Set(['gauge', 'grr', 'attr']);
const SLOTS: { id: string; phase: PhaseKey; question: string; tool: string; toolName: string; fc: string; at?: string; take: (s: ToolStudy) => boolean }[] = [
  { id: 'charter', phase: 'define', question: 'The charter as a page the sponsor agrees', tool: 'doc', toolName: 'Documents', fc: 'FC-142', at: '/doc/charter', take: s => s.tool === 'doc' && s.agreed?.doc?.def === 'charter' },
  { id: 'baseline', phase: 'measure', question: 'The baseline of the measure', tool: 'capability', toolName: 'Capability', fc: 'FC-094', take: s => s.tool === 'capability' },
  { id: 'gauge', phase: 'measure', question: 'The gauge proved fit — how', tool: 'analysis', toolName: 'Analysis', fc: 'FC-118', take: s => s.tool === 'analysis' && GAUGE_KINDS.has(s.agreed?.analysis?.kind ?? '') },
  { id: 'evidence', phase: 'analyse', question: 'Root causes found, and the data that shows each', tool: 'analysis', toolName: 'Analysis', fc: 'FC-105', take: s => s.tool === 'analysis' && !GAUGE_KINDS.has(s.agreed?.analysis?.kind ?? '') && s.agreed?.analysis?.kind !== 'change' },
  { id: 'pilot', phase: 'improve', question: 'The pilot, and its result on the measure', tool: 'analysis', toolName: 'Analysis', fc: 'FC-105', take: s => s.tool === 'analysis' && s.agreed?.analysis?.kind === 'change' },
  { id: 'hold', phase: 'control', question: 'The control plan', tool: 'chart', toolName: 'Control chart', fc: 'FC-086', take: s => s.tool === 'chart' },
];
export function insertionsOf(studies: readonly ToolStudy[]): Insertion[] {
  const mine = studies.filter(s => !s.deletedAt).sort((a, b) => b.updatedAt - a.updatedAt);
  return SLOTS.map(({ take, ...slot }) => {
    const hits = mine.filter(take), s = hits[0];
    return { ...slot, studyCount: hits.length, ...(s ? { says: studyLine(s).text, name: s.name } : {}) };
  });
}
