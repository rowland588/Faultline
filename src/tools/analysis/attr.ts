/* ATTRIBUTE AGREEMENT — do inspectors agree? (FC-121; knowledge/specs/FC-121-attribute-agreement.md; lib/ie/attributeAgreement). */
import type { AgreedAnalysis, StudyReading } from '../../lib/study';
import type { LeanTile } from '../../lib/lean';
import { attributeAgreement, type AttrJudgment, type AttrReference, type AttrResult } from '../../lib/ie/attributeAgreement';
import type { AnalysisSays, Base, Tone } from './analysis';

export const ATTR_ITEMS_FROM = 10;
export const ATTR_INSP_FROM = 2;
export const ATTR_LOOKS = 2;

export interface AttrFigures extends Base {
  kind: 'attr';
  g: NonNullable<AgreedAnalysis['attr']>;
  refs: AttrReference[];
  judgments: AttrJudgment[];
  n: number;
  enough: boolean;
  firm: boolean;
  problem?: string;
  refusal?: string;
  res?: AttrResult;
}

const pct = (x: number): string => `${Math.round(x * 100)}%`;
const fx = (k: number): string => (Number.isNaN(k) ? '—' : k.toFixed(2));

export function attrRefs(readings: StudyReading[]): AttrReference[] {
  return readings.filter(r => !r.struck && r.arm && r.col === 'reference' && typeof r.value === 'number')
    .map(r => ({ item: r.arm as string, reject: (r.value as number) >= 0.5 }));
}

export function attrJudgments(readings: StudyReading[]): AttrJudgment[] {
  return readings.filter(r => !r.struck && r.arm && r.col && r.col !== 'reference' && typeof r.value === 'number')
    .map(r => ({ item: r.arm as string, inspector: r.col as string, look: r.group ?? 1, reject: (r.value as number) >= 0.5 }));
}

export function attrProblem(name: string, g: AgreedAnalysis['attr']): string {
  if (!name.trim()) return 'What is being judged — a name, "Seal wrinkle check".';
  if (!g?.items?.length) return 'Which pieces — at least ten coded packs spanning the borderline, separated by commas.';
  if (g.items.length < ATTR_ITEMS_FROM) return `At least ${ATTR_ITEMS_FROM} pieces are wanted — ${g.items.length} named.`;
  if (!g.inspectors?.length || g.inspectors.length < ATTR_INSP_FROM) return `At least ${ATTR_INSP_FROM} inspectors — who will judge blind, in random order.`;
  return '';
}

export function attrFigures(a: AgreedAnalysis, readings: StudyReading[], base: Base): AttrFigures {
  const g = a.attr ?? { items: [], inspectors: [], looks: ATTR_LOOKS };
  const refs = attrRefs(readings);
  const judgments = attrJudgments(readings);
  const looks = g.looks ?? ATTR_LOOKS;
  const needJudgments = g.items.length * g.inspectors.length * looks;
  const f: AttrFigures = {
    ...base, kind: 'attr', g, refs, judgments, n: judgments.length,
    enough: refs.length >= g.items.length && judgments.length >= needJudgments && g.items.length >= ATTR_ITEMS_FROM,
    firm: refs.length >= g.items.length && judgments.length >= needJudgments && g.items.length >= 30,
    problem: attrProblem(a.name, g),
  };
  if (f.problem) return f;
  if (refs.length < g.items.length) return f;
  if (!f.enough) return f;
  const res = attributeAgreement(refs, judgments);
  if (!res) { f.refusal = 'The grid is not complete — every piece needs a reference and every inspector’s look.'; return f; }
  f.res = res;
  return f;
}

const NOT_CLAIMED = 'Blind random order and hidden codes are agreed on the page — the app does not shuffle; the team runs it that way on the floor.';

const bandWord = (b: 'good' | 'marginal' | 'poor'): string => (b === 'good' ? 'Good agreement' : b === 'marginal' ? 'Marginal agreement' : 'Poor agreement');
const bandTone = (b: 'good' | 'marginal' | 'poor'): Tone => (b === 'good' ? 'g' : b === 'marginal' ? 'a' : 'r');

export function attrSays(f: AttrFigures, a: AgreedAnalysis): AnalysisSays {
  const name = a.name.trim() || 'The check';
  if (f.problem) return { text: f.problem, tone: 'n', verdict: 'Not set up', more: [], notClaimed: NOT_CLAIMED };
  if (refsMissing(f)) {
    return { text: `${f.refs.length} of ${f.g.items.length} reference verdicts — every piece needs pass or reject from the expert before κ is said.`, tone: 'n', verdict: 'Reference missing', more: [], notClaimed: NOT_CLAIMED };
  }
  if (!f.enough) {
    const looks = f.g.looks ?? ATTR_LOOKS;
    const need = f.g.items.length * f.g.inspectors.length * looks;
    return { text: `${f.n} of ${need} judgments — every piece × inspector × look before agreement is said.`, tone: 'n', verdict: 'Too few', more: [], notClaimed: NOT_CLAIMED };
  }
  if (f.refusal || !f.res) return { text: f.refusal ?? 'The grid is not complete.', tone: 'a', verdict: 'Incomplete', more: [], notClaimed: NOT_CLAIMED };
  const r = f.res;
  const parts = r.inspectors.map(i => {
    const err = i.missRate > 0 || i.falseAlarmRate > 0
      ? ` — misses ${pct(i.missRate)} of rejects, false alarms ${pct(i.falseAlarmRate)} of good`
      : '';
    return `${i.name}: κ ${fx(i.kappaRef)} vs reference (${pct(i.selfAgree)} with self)${err}`;
  });
  const worst = [...r.inspectors].sort((x, y) => x.kappaRef - y.kappaRef)[0];
  const lead = worst.band === 'good'
    ? 'Every inspector’s κ is at least 0.75 against the reference.'
    : `${worst.name} is not there yet (κ ${fx(worst.kappaRef)}) — retrain on the limit samples and repeat for them.`;
  const money = attrMoney(f, a);
  return {
    text: `${name}: Fleiss κ ${fx(r.fleissKappa)} over all looks; ${parts.join('; ')}. ${lead}${money ? ` ${money}` : ''}`,
    tone: bandTone(r.fleissBand), verdict: bandWord(r.fleissBand),
    more: [
      `All ${r.nInspectors * r.looks} looks agree on ${pct(r.allLooksAgree)} of pieces; all right vs reference on ${pct(r.allLooksRight)}.`,
      ...(r.disagreeItems.length ? [`Pieces to review: ${r.disagreeItems.slice(0, 8).join(', ')}${r.disagreeItems.length > 8 ? ` and ${r.disagreeItems.length - 8} more` : ''}.`] : []),
    ],
    notClaimed: NOT_CLAIMED,
  };
}

function refsMissing(f: AttrFigures): boolean {
  return f.refs.length < f.g.items.length;
}

function attrMoney(f: AttrFigures, _a: AgreedAnalysis): string {
  const m = f.g.materialsPerPack;
  const ps = f.g.packsPerShift;
  if (!f.res || m === undefined || m <= 0) return '';
  const good = f.res.nItems - f.refs.filter(x => x.reject).length;
  if (!good) return '';
  let falseTotal = 0;
  for (const i of f.res.inspectors) falseTotal += i.falseAlarmRate * good;
  falseTotal /= f.res.inspectors.length;
  const packs = ps ?? 0;
  if (packs <= 0) return 'Give packs a shift to say false alarms in money.';
  const pounds = falseTotal * packs * m;
  return `In money: about ${Math.round(falseTotal * packs)} good packs a shift wrongly rejected — £${pounds.toFixed(0)} a shift in materials at £${m.toFixed(2)} a pack.`;
}

export function attrGrids(f: AttrFigures): import('./measure').Grid[] {
  if (!f.res) return [];
  const r = f.res;
  return [{
    label: 'Each inspector',
    head: ['Inspector', 'Self', 'Both right', 'κ vs ref', 'Misses', 'False alarms', 'Verdict'],
    rows: r.inspectors.map(i => [
      i.name, pct(i.selfAgree), pct(i.bothRight), fx(i.kappaRef),
      pct(i.missRate), pct(i.falseAlarmRate), bandWord(i.band),
    ]),
    widths: [14, 12, 14, 12, 12, 14, 22],
  }];
}

export function attrTiles(f: AttrFigures): LeanTile[] {
  if (!f.res) return [{ k: 'Judgments', v: String(f.n), of: 'in' }];
  const r = f.res;
  const worst = [...r.inspectors].sort((x, y) => x.kappaRef - y.kappaRef)[0];
  return [
    { k: 'Fleiss κ', v: fx(r.fleissKappa), of: bandWord(r.fleissBand) },
    { k: 'All agree', v: pct(r.allLooksAgree), of: 'of pieces' },
    { k: 'All right', v: pct(r.allLooksRight), of: 'vs reference' },
    { k: 'Lowest κ', v: fx(worst.kappaRef), of: worst.name },
    { k: 'To review', v: String(r.disagreeItems.length), of: 'pieces' },
  ];
}
