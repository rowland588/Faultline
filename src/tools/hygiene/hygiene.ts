/* HYGIENIC DESIGN REVIEW OF NEW EQUIPMENT — FC-178 (knowledge/specs/FC-178-hygienic-design.md; knowledge/methods/foodsafety/hygienic-design.md).
 *
 * A machine that cannot be cleaned will not be clean. The review walks a new or changed machine, zone by zone — product contact, splash, non-product —
 * against hygienic-design principles (EHEDG Guideline 8; EN 1672-2; EN ISO 14159), records what was seen, and keeps the findings until they are closed.
 *
 * WHAT IS PUBLIC AND WHAT IS FAULTLINE'S, said on the page: the principles are EHEDG's and the standards'; the grades (critical, major, minor) and the
 * gates each must close by (critical before shipment, major before SAT, minor before handover) are Faultline's own way of using them in a stage gate —
 * neither EHEDG nor EN 1672-2 prescribes them. This is a checklist and a findings register, never an assessment, a certification or a statement of
 * conformity. The standards are paid and unread here; Guideline 8's text could not be opened by the builder, so no section or number is quoted and
 * no roughness or radius limit is used.
 *
 * Pure counts of what the reviewers typed — no AI, nothing invented. */
import type { LeanTile, LeanTone } from '../../lib/lean';
import type { ScoredRow } from '../../lib/study';
import { niceDay, todayISO } from '../../lib/weeks';
import type { ScoredChecklist, ScoredMatrixOut, ScoredResult, ScoredTable } from '../scored/types';

export const CHECKLIST: ScoredChecklist = {
  noun: 'point',
  groupLabel: 'Zone',
  states: [
    { key: 'unchecked', label: 'Not checked yet' }, { key: 'meets', label: 'Meets' }, { key: 'finding', label: 'Finding — to put right' },
    { key: 'closed', label: 'Finding closed — re-checked' }, { key: 'na', label: 'Does not apply' },
  ],
  fields: ['source', 'severity', 'owner', 'due', 'note'],
  labels: { source: 'The principle it comes from', note: 'What was seen, and what the OEM must change', severity: 'Grade (Luna’s)' },
  severities: [{ key: 'critical', label: 'Critical' }, { key: 'major', label: 'Major' }, { key: 'minor', label: 'Minor' }],
};

export type Grade = 'critical' | 'major' | 'minor';
/** Faultline's gates — its own rule, not EHEDG's. */
export const GATE_OF: Record<Grade, string> = { critical: 'shipment (FAT)', major: 'site acceptance (SAT)', minor: 'handover' };
const RANK: Record<Grade, number> = { critical: 0, major: 1, minor: 2 };
const STATE = ['unchecked', 'meets', 'finding', 'closed', 'na'] as const;
type State = typeof STATE[number];
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const list = (xs: string[]): string => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const plural = (n: number, one: string, many = `${one}s`): string => `${n} ${n === 1 ? one : many}`;

export interface HygienePoint {
  id: string; name: string; zone: string; source: string; state: State; grade?: Grade; owner: string; due?: string; note: string; late: boolean;
}
export interface HygieneResult {
  points: HygienePoint[];
  total: number;
  checked: number;
  meets: number;
  na: number;
  unchecked: number;
  /** findings still open, worst first, then by day */
  open: HygienePoint[];
  closed: HygienePoint[];
  byGrade: Record<Grade, HygienePoint[]>;
  ungraded: HygienePoint[];
  late: HygienePoint[];
  /** closed with nothing written about the re-check */
  closedBare: HygienePoint[];
  zones: { zone: string; total: number; checked: number; open: number }[];
}

export function hygiene(input: { rows: ScoredRow[]; today?: string }): { ok: HygieneResult } | { problems: string[] } {
  const today = input.today ?? todayISO();
  const named = input.rows.filter(r => r.name.trim());
  const problems: string[] = [];
  if (!named.length) problems.push('Add at least one point to check — a feature of the machine, in the zone it sits in.');
  for (const r of named) {
    const nm = `“${r.name.trim()}”`;
    if (r.status !== undefined && !STATE.includes(r.status as State)) problems.push(`${nm}: its state is not one the review knows.`);
    if (r.severity !== undefined && r.severity !== '' && !(r.severity in RANK)) problems.push(`${nm}: a grade is critical, major or minor.`);
    if (r.due && !ISO.test(r.due)) problems.push(`${nm}: the day is not a date.`);
  }
  if (problems.length) return { problems };
  const points: HygienePoint[] = named.map(r => {
    const state = (r.status ?? 'unchecked') as State;
    const due = r.due && ISO.test(r.due) ? r.due : undefined;
    return { id: r.id, name: r.name.trim(), zone: (r.group ?? '').trim() || 'Other', source: (r.source ?? '').trim(), state, ...(r.severity ? { grade: r.severity as Grade } : {}),
      owner: (r.owner ?? '').trim(), ...(due ? { due } : {}), note: (r.note ?? '').trim(), late: state === 'finding' && !!due && due < today };
  });
  const open = points.filter(p => p.state === 'finding').sort((a, b) => (a.grade ? RANK[a.grade] : 3) - (b.grade ? RANK[b.grade] : 3) || (a.due ?? '9999').localeCompare(b.due ?? '9999') || points.indexOf(a) - points.indexOf(b));
  const zoneOrder: string[] = [];
  for (const p of points) if (!zoneOrder.includes(p.zone)) zoneOrder.push(p.zone);
  return { ok: {
    points, total: points.length, checked: points.filter(p => p.state !== 'unchecked').length, meets: points.filter(p => p.state === 'meets').length,
    na: points.filter(p => p.state === 'na').length, unchecked: points.filter(p => p.state === 'unchecked').length,
    open, closed: points.filter(p => p.state === 'closed'),
    byGrade: { critical: open.filter(p => p.grade === 'critical'), major: open.filter(p => p.grade === 'major'), minor: open.filter(p => p.grade === 'minor') },
    ungraded: open.filter(p => !p.grade), late: open.filter(p => p.late), closedBare: points.filter(p => p.state === 'closed' && !p.note),
    zones: zoneOrder.map(z => { const m = points.filter(p => p.zone === z); return { zone: z, total: m.length, checked: m.filter(p => p.state !== 'unchecked').length, open: m.filter(p => p.state === 'finding').length }; }),
  } };
}

const GRADE_WORD: Record<Grade, string> = { critical: 'Critical', major: 'Major', minor: 'Minor' };
const lineOf = (p: HygienePoint): string =>
  `${p.grade ? GRADE_WORD[p.grade] : 'Not graded'} — ${p.name}${p.zone !== 'Other' ? ` (${p.zone})` : ''}${p.note ? `: ${p.note}` : ''}${p.owner ? ` — ${p.owner}` : ' — no owner yet'}${p.due ? `, by ${niceDay(p.due)}${p.late ? ' (late)' : ''}` : ''}.`;

export function summarizeHygiene(r: HygieneResult): ScoredResult {
  const c = r.byGrade.critical.length, m = r.byGrade.major.length, i = r.byGrade.minor.length;
  const gate = c + m;
  const verdict = r.checked === 0 ? 'Not started' : gate ? `${gate} to close before SAT` : r.open.length ? `${plural(r.open.length, 'finding')} open` : r.unchecked ? `${r.unchecked} still to check` : 'Clear for SAT';
  const tone: LeanTone = gate || r.late.length ? 'r' : r.open.length || r.unchecked || r.ungraded.length ? 'a' : r.checked ? 'g' : 'n';
  const parts = [`${r.checked} of ${r.total} points checked${r.na ? `, ${r.na} do not apply` : ''}.`];
  if (r.open.length) parts.push(`${plural(r.open.length, 'finding')} open — ${c} critical, ${m} major, ${i} minor${r.ungraded.length ? `, ${r.ungraded.length} not graded yet` : ''}${r.late.length ? `; ${r.late.length} past their day` : ''}.`);
  else if (r.checked) parts.push('No finding is open.');
  if (r.closed.length) parts.push(`${plural(r.closed.length, 'finding')} closed and re-checked.`);
  if (c) parts.push(`${plural(c, 'critical finding')} must close before shipment (FAT) — or the design changes.`);
  if (m) parts.push(`${plural(m, 'major finding')} must close before site acceptance (SAT).`);
  if (!gate && r.unchecked) parts.push(`${plural(r.unchecked, 'point')} not checked yet, so SAT cannot yet be called clear.`);
  const tiles: LeanTile[] = [
    { k: 'Checked', v: `${r.checked} of ${r.total}`, of: r.na ? `${r.na} do not apply` : 'points', tone: r.unchecked ? 'a' : 'n' },
    { k: 'Open findings', v: String(r.open.length), of: r.open.length ? `${c} critical · ${m} major · ${i} minor` : 'none open', tone: r.open.length ? 'a' : 'n' },
    { k: 'To close before SAT', v: String(gate), of: 'critical and major (Luna’s rule)', tone: gate ? 'r' : 'n' },
    { k: 'Closed', v: String(r.closed.length), of: 're-checked', tone: 'n' },
    { k: 'Past their day', v: String(r.late.length), of: r.late.length ? `${r.late[0].name}${r.late.length > 1 ? ` and ${r.late.length - 1} more` : ''}` : 'none late', tone: r.late.length ? 'r' : 'n' },
  ];
  const closing = r.checked === 0
    ? 'Walk the machine zone by zone — product contact first — and mark each point. Nothing here says it is clean.'
    : gate ? `Not clear for SAT: ${plural(gate, 'critical or major finding')} open — the OEM changes them, the site re-checks and closes them with what was seen. ${c ? 'Criticals belong before shipment; if they are on site, the machine is not accepted as designed.' : ''}`.trim()
      : r.open.length || r.unchecked ? `No critical or major finding is open${r.unchecked ? `, but ${plural(r.unchecked, 'point')} ${r.unchecked === 1 ? 'is' : 'are'} not checked` : ''}${i ? `; ${plural(i, 'minor finding')} close by handover` : ''}.`
        : 'Every point is checked and every finding closed — clear for SAT on this review. It is a review against principles, not a certification.';
  const lists: NonNullable<ScoredResult['lists']> = [];
  if (r.open.length) lists.push({ title: 'Open findings, worst first', lines: r.open.map(lineOf) });
  if (r.open.length) lists.push({ title: 'Each closes by', lines: (['critical', 'major', 'minor'] as Grade[]).filter(g => r.byGrade[g].length).map(g => `${GRADE_WORD[g]}: ${plural(r.byGrade[g].length, 'finding')} — before ${GATE_OF[g]}.`) });
  lists.push({ title: 'By zone', lines: r.zones.map(z => `${z.zone}: ${z.checked} of ${z.total} checked${z.open ? `, ${z.open} open` : ''}.`) });
  const caveats = [
    'This is a checklist and a findings register. It is not an EHEDG, EN 1672-2 or EN ISO 14159 assessment, certification or declaration of conformity, and a machine that is certified is certified for its tested configuration — the site’s changes are not.',
    'The principles are EHEDG’s and the standards’; the grades — critical, major, minor — and the gates they close by — shipment, SAT, handover — are Luna’s own, and neither EHEDG nor EN 1672-2 prescribes them.',
    'It records what the reviewers saw. A review from drawings misses what the build added; the walk at FAT is the review. A closed finding is only as good as the re-check written beside it — and a photo, which is not kept here.',
    'The standards are paid and were not read; the points are written in plain words from the published principles with no clause quoted and no roughness, radius or gap limit — where the machine’s makers or EHEDG give one, use theirs.',
  ];
  if (r.closedBare.length) caveats.push(`${plural(r.closedBare.length, 'finding')} closed with nothing written about the re-check: ${list(r.closedBare.map(p => p.name))}. A finding closed without evidence is still open.`);
  return { verdict, tone, sentence: parts.join(' '), tiles, closing, caveats, lists };
}

const STATE_WORD: Record<State, string> = Object.fromEntries(CHECKLIST.states.map(s => [s.key, s.label])) as Record<State, string>;

export function hygieneTable(r: HygieneResult): ScoredTable {
  const dash = '—';
  const ordered = r.zones.flatMap(z => r.points.filter(p => p.zone === z.zone));
  const rows = ordered.map(p => [p.zone, p.name, p.source || dash, p.grade ? GRADE_WORD[p.grade] : dash, `${STATE_WORD[p.state]}${p.late ? ' — late' : ''}`, [p.owner, p.due ? niceDay(p.due) : ''].filter(Boolean).join(', ') || dash, p.note || dash]);
  return { head: ['Zone', 'Point', 'Principle', 'Grade', 'State', 'Owner, day', 'What was seen'], rows, foot: r.zones.map(z => [z.zone, `${z.checked} of ${z.total} checked`, '', '', z.open ? `${z.open} open` : 'none open', '', '']), shares: [0.11, 0.2, 0.15, 0.07, 0.12, 0.13, 0.22], columnIds: ordered.map(p => p.id) };
}

export const START = {
  name: 'Which machine is this review of?',
  placeholder: 'e.g. Line 2 — new slicer, design review at FAT',
  empty: 'No hygienic design review yet — start one for a machine, walk it zone by zone and mark each point.',
};

export function analyseHygiene(a: { rows: ScoredRow[]; today?: string }): ScoredMatrixOut {
  const out = hygiene({ rows: a.rows, ...(a.today ? { today: a.today } : {}) });
  if (!('ok' in out)) return { problems: out.problems };
  return { result: summarizeHygiene(out.ok), table: hygieneTable(out.ok), leaders: [] };
}

/* ------------------------------------------------------------------ the starter list */
type Starter = Omit<ScoredRow, 'id'>;
const SRC = 'EHEDG Guideline 8, hygienic design principles';
const pt = (group: string, severity: Grade, name: string, topic: string): Starter => ({ group, severity, name, source: `${SRC} — ${topic}`, status: 'unchecked' });
const P = 'Product contact', S = 'Splash zone', N = 'Non-product zone';

/** Points in plain words from the principles the knowledge record names (materials, surfaces and joints, draining, dead areas, access, fasteners, hollow bodies, seals,
 *  lubricants, drives and bearings, ledges and feet) — a starting point for the review, never the standard; no clause, number or limit is quoted. */
export const STARTER: Starter[] = [
  pt(P, 'critical', 'Materials that touch food are food-grade and survive the product and the cleaning chemicals', 'materials'),
  pt(P, 'critical', 'Surfaces that touch food are smooth, without pits, cracks or flaking coatings', 'surface finish'),
  pt(P, 'critical', 'Joints in the product zone are continuous and smooth — no crevices, gaps or laps where product can lodge', 'joints and welds'),
  pt(P, 'critical', 'Every product-contact surface drains and nothing pools', 'drainability'),
  pt(P, 'critical', 'No dead legs, blind ends or pockets where product or cleaning liquid can sit', 'dead areas'),
  pt(P, 'critical', 'No hollow rollers, tubes or frames open to the product zone — sealed, or solid', 'hollow bodies'),
  pt(P, 'critical', 'No exposed threads, bolt heads or fixings in the product zone; fixings are hygienic and cannot fall in', 'fasteners'),
  pt(P, 'critical', 'Seals and gaskets are food-grade, fit flush, can be reached and are replaceable', 'seals and gaskets'),
  pt(P, 'critical', 'Bearings, drives and lubricants are outside the product zone or sealed from it; any lubricant that could touch food is food-grade', 'drives, bearings and lubricants'),
  pt(P, 'major', 'Every product-contact part can be reached for cleaning and inspection, and opened without a long strip-down', 'accessibility'),
  pt(S, 'major', 'Surfaces in the splash zone are smooth, corrosion-resistant and slope so water runs off', 'surfaces and draining'),
  pt(S, 'major', 'No horizontal ledges, shelves or flat tops that hold water or product', 'ledges'),
  pt(S, 'major', 'Guards, covers and brackets can be cleaned round and behind, or come off without tools that are hard to find', 'accessibility'),
  pt(S, 'major', 'Cable, pipe and hose runs, junction boxes and sensors are off the surfaces they sit on, not boxed in against them', 'enclosures and fittings'),
  pt(N, 'minor', 'Frames, legs and feet are sealed or open so nothing lodges beneath and the floor can be cleaned round them', 'frames and feet'),
  pt(N, 'minor', 'Painted or coated surfaces outside the food zones are sound and cannot flake into it', 'coatings'),
  pt(N, 'minor', 'Electrical cabinets, motors and gearboxes are placed and sealed so they do not shed into the food zones', 'enclosures'),
  pt(N, 'minor', 'Drip trays, drains and the machine’s waste routes lead away from the product zones and can be cleaned', 'draining'),
];
