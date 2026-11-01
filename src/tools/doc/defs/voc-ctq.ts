/* VOICE OF THE CUSTOMER TO CTQs (FC-140) — what the customer says, in their words, taken down to what the line can measure: need → driver →
 * critical-to-quality characteristic with a unit, a limit (between, at least, at most, or yes/no) and where the limit comes from. A need with no
 * measure and limit is not yet a CTQ and is listed as a gap; each CTQ says where it goes next (a capability study, a control plan row, a design
 * decision). Specified in knowledge/specs/FC-140-voc-ctq.md; the method in knowledge/methods/sixsigma/voc-ctq.md (Pyzdek & Keller 2014;
 * George et al. 2005; Kano et al. 1984 for the class). No money of its own (knowledge/MONEY.md, FC-140). */
import { andList, fmt, plural, sayN } from '../figures/words';
import { cellNum, cellText, rowsOf, textOf } from '../doc';
import type { DocDef, DocProblem, DocRow, DocTable } from '../types';

export type LimitKind = 'between' | 'atleast' | 'atmost' | 'yesno';
const KINDS = [
  { value: 'between', label: 'Between two limits' }, { value: 'atleast', label: 'At least' },
  { value: 'atmost', label: 'At most' }, { value: 'yesno', label: 'Yes or no' },
];
const CLASSES = [
  { value: 'must-be', label: 'Must-be', help: 'Expected: absent, the customer is angry; present, nobody notices' },
  { value: 'performance', label: 'Performance', help: 'More is better, in proportion' },
  { value: 'attractive', label: 'Attractive', help: 'Unexpected and pleasing — a delighter' },
];
const CLASS_WORD: Record<string, string> = { 'must-be': 'must-be', performance: 'performance', attractive: 'attractive' };

/** What a CTQ's limit says, in its unit — or undefined when the limit its kind needs is not there. */
export function limitSaid(kind: LimitKind | undefined, lower: number | undefined, upper: number | undefined, unit: string): string | undefined {
  if (kind === 'yesno') return 'yes';
  if (kind === 'between' && lower !== undefined && upper !== undefined && lower < upper) return `${sayN(lower, '', 6).replace(/ $/, '')} to ${sayN(upper, unit, 6)}`;
  if (kind === 'atleast' && lower !== undefined) return `at least ${sayN(lower, unit, 6)}`;
  if (kind === 'atmost' && upper !== undefined) return `at most ${sayN(upper, unit, 6)}`;
  return undefined;
}

/** Where a CTQ goes next, by its class and the kind of limit — the record's procedure (a capability study against the limit, a control plan row). */
export function nextFor(cls: string | undefined, kind: LimitKind | undefined): string {
  const study = kind === 'yesno' ? 'a pass-or-fail capability study' : 'a capability study against the limit';
  if (cls === 'must-be') return `${study} and a control plan row — a limit that is never traded`;
  if (cls === 'performance') return `a target inside the limit, and ${study}`;
  if (cls === 'attractive') return 'a design decision — a choice, not a limit to hold';
  return `${study}; say its Kano class to decide how hard to hold it`;
}

const ctq = (r: DocRow) => {
  const kind = cellText(r, 'kind') as LimitKind | '';
  const unit = cellText(r, 'unit');
  const limit = cellText(r, 'measure') && kind ? limitSaid(kind, cellNum(r, 'lower'), cellNum(r, 'upper'), unit) : undefined;
  return { need: cellText(r, 'need'), driver: cellText(r, 'driver'), measure: cellText(r, 'measure'), unit, kind: kind || undefined, limit, source: cellText(r, 'source'), cls: cellText(r, 'class') || undefined };
};

const vocCtq: DocDef = {
  key: 'voc-ctq', fc: 'FC-140', title: 'Customer needs to CTQs', noun: 'CTQ table', group: 'Define',
  says: 'What the customer says, in their words, taken down to what the line measures — with a unit, a limit and where the limit comes from',
  question: 'What exactly must we measure, in what unit, to what limit, to meet each thing the customer asks for?',
  signoff: { word: 'Agreed', ready: 'Ready to agree', by: 'the sponsor', ask: 'Agree the CTQs', back: 'Reopen the CTQs' },
  sections: [
    { id: 'customer', title: 'Whose needs', help: 'The customer and where their words came from.', items: [
      { id: 'customer', kind: 'text', label: 'The customer', required: true, example: 'The retailer’s chilled-ready-meals buyer', help: 'A person, a retailer or a place — not “the business”.' },
      { id: 'words', kind: 'long', label: 'Where the words came from', example: 'Retailer specification v4, last year’s complaints, two buyer interviews', help: 'The specification, complaints by theme, interviews, the consumer panel. Keep the customer’s own words below.' },
    ] },
    { id: 'tree', title: 'The needs, down to what is measured', help: 'One row a need: what they say, what drives it, what is measured and the limit. A need you cannot yet measure still goes in — it is listed as a gap.', items: [
      { id: 'ctqs', kind: 'list', label: 'Needs and their CTQs', rowWord: 'need', required: true, help: 'The customer’s words, not yours. A CTQ without a limit controls nothing.', columns: [
        { id: 'need', kind: 'text', label: 'What the customer says', required: true, example: 'Easy to open', help: 'Their words, as they said them.' },
        { id: 'driver', kind: 'text', label: 'What drives it', example: 'The peel force', help: 'What on the pack or the line makes it so.' },
        { id: 'measure', kind: 'text', label: 'What is measured (the CTQ)', example: 'Peel force', help: 'Blank if it cannot be measured yet.' },
        { id: 'unit', kind: 'text', label: 'Unit', example: 'N' },
        { id: 'kind', kind: 'choice', label: 'The kind of limit', options: KINDS },
        { id: 'lower', kind: 'number', label: 'Lower limit' },
        { id: 'upper', kind: 'number', label: 'Upper limit' },
        { id: 'source', kind: 'text', label: 'Where the limit comes from', example: 'Retailer specification', help: 'The specification, a complaint, a test. A limit with no source is a guess.' },
        { id: 'class', kind: 'choice', label: 'Kano class', options: CLASSES, help: 'Optional — from the Kano survey, or your judgement.' },
      ] },
    ] },
  ],
  check: (v): DocProblem[] => {
    const out: DocProblem[] = [];
    rowsOf(v, 'ctqs').forEach((r, i) => {
      const c = ctq(r), n = `Need ${i + 1}`, lo = cellNum(r, 'lower'), up = cellNum(r, 'upper');
      if (c.measure && !c.kind) out.push({ field: 'ctqs', say: `${n}: “${c.measure}” is measured but has no kind of limit.` });
      if (c.kind === 'between' && (lo === undefined || up === undefined)) out.push({ field: 'ctqs', say: `${n}: “between two limits” needs both the lower and the upper.` });
      if (c.kind === 'between' && lo !== undefined && up !== undefined && lo >= up) out.push({ field: 'ctqs', say: `${n}: the lower limit must be below the upper.` });
      if (c.kind === 'atleast' && lo === undefined) out.push({ field: 'ctqs', say: `${n}: “at least” needs the lower limit.` });
      if (c.kind === 'atmost' && up === undefined) out.push({ field: 'ctqs', say: `${n}: “at most” needs the upper limit.` });
      if (c.limit && !c.source) out.push({ field: 'ctqs', say: `${n}: “${c.measure}” has a limit but no source — where does it come from?` });
    });
    return out;
  },
  read: v => {
    const rows = rowsOf(v, 'ctqs').map(ctq).filter(c => c.need);
    const ctqs = rows.filter(c => c.limit);
    const gaps = rows.filter(c => !c.limit);
    const count = (k: string) => rows.filter(c => c.cls === k).length;
    const sentence = rows.length
      ? `${ctqs.length} of ${plural(rows.length, 'need')} ${ctqs.length === 1 ? 'is' : 'are'} written as a measure with a limit${gaps.length ? `; ${gaps.length === 1 ? 'one has' : `${gaps.length} have`} none yet: ${andList(gaps.map(g => `“${g.need}”`))}` : ''}.`
      : '';
    const tables: DocTable[] = [];
    if (rows.length) {
      tables.push({ title: 'The CTQ tree', head: ['Need — their words', 'Driver', 'CTQ', 'Limit', 'Where from', 'Class'], shares: [0.2, 0.14, 0.15, 0.2, 0.17, 0.14],
        rows: rows.map(c => [c.need, c.driver || '—', c.measure || '— not measured yet', c.limit ?? '— no limit yet', c.source || '—', c.cls ? CLASS_WORD[c.cls] : '—']) });
      tables.push({ title: 'Where each goes next', head: ['CTQ', 'Next'], shares: [0.3, 0.7],
        rows: ctqs.map(c => [c.measure, nextFor(c.cls, c.kind)]).concat(gaps.map(g => [`“${g.need}”`, 'a gap — find what to measure, or say it cannot be measured']) ) });
    }
    return {
      sentence, tone: 'n',
      tiles: [
        { k: 'Needs', v: rows.length ? String(rows.length) : '—', of: 'in the customer’s words' },
        { k: 'CTQs with a limit', v: rows.length ? `${ctqs.length} of ${rows.length}` : '—', of: gaps.length ? `${gaps.length} still a gap` : rows.length ? 'every need has one' : 'needs the needs', ...(gaps.length ? { tone: 'a' as const } : {}) },
        { k: 'Must-be', v: rows.length ? String(count('must-be')) : '—', of: 'limits never traded' },
        { k: 'Performance', v: rows.length ? String(count('performance')) : '—', of: 'targets to optimise' },
        { k: 'Attractive', v: rows.length ? String(count('attractive')) : '—', of: 'choices, not limits' },
      ],
      tables,
      working: rows.length ? [{ label: 'The count', value: `${ctqs.length} with a measure and a limit, ${gaps.length} without, of ${rows.length}`, note: 'a CTQ without a limit is not a CTQ' }] : [],
      money: { missing: [], none: 'A CTQ table has no money of its own: a must-be missed shows as complaints and returns (Complaints per million), and a performance CTQ’s capability as rejects (Capability’s money line) — those tools carry the pounds (knowledge/MONEY.md, FC-140).' },
      caveats: [
        'A CTQ without a limit controls nothing: the limit and where it comes from are the method, and a “good seal” is not one.',
        'The customer’s words paraphrased by the engineer become the engineer’s needs: keep the words as they were said.',
        'A must-be is never traded against a delighter — a leak-free pack is not given up for a reclose — and last year’s delighter is this year’s performance need.',
        'It says what to measure and to what limit; whether the line meets it is the capability study’s answer, not this page’s.',
      ],
      checks: [],
      closing: sentence ? `${sentence.replace(/\.$/, '')}. ${ctqs.length ? 'Each CTQ goes to a capability study and a control plan row.' : 'Find a measure and a limit for each need.'}` : 'Write each thing the customer says in their words, then what is measured and to what limit.',
    };
  },
  examples: [
    {
      name: 'A lidded tray — the record’s worked case',
      source: 'knowledge/methods/sixsigma/voc-ctq.md worked case (Pyzdek & Keller 2014; Kano et al. 1984); scripts/knowledge/cases-doc.py V1',
      values: {
        customer: 'The retailer’s chilled-meals buyer', words: 'Retailer specification v4; last year’s complaints',
        ctqs: [
          { id: 'n1', c: { need: 'Easy to open', driver: 'the peel force', measure: 'Peel force', unit: 'N', kind: 'between', lower: 8, upper: 15, source: 'consumer panel', class: 'performance' } },
          { id: 'n2', c: { need: 'Doesn’t leak', driver: 'the seal', measure: 'Seal strength', unit: 'N/15 mm', kind: 'atleast', lower: 1.5, source: 'retailer specification', class: 'must-be' } },
          { id: 'n3', c: { need: 'Looks fresh', driver: 'oxygen left in the pack', measure: 'Residual oxygen', unit: '%', kind: 'atmost', upper: 2, source: 'retailer specification', class: 'must-be' } },
          { id: 'n4', c: { need: 'I can reseal it', driver: 'a zipper', measure: 'Zipper present', kind: 'yesno', source: 'pack design brief', class: 'attractive' } },
        ],
      },
      expect: {
        sentence: '4 of 4 needs are written as a measure with a limit.',
        tiles: { 'Filled in': '2 of 2', Needs: '4', 'CTQs with a limit': '4 of 4', 'Must-be': '2', Performance: '1', Attractive: '1' },
        tables: {
          'The CTQ tree': [['Easy to open', 'the peel force', 'Peel force', '8 to 15 N'], ['Doesn’t leak', 'the seal', 'Seal strength', 'at least 1.5 N/15 mm'], ['Looks fresh', 'oxygen left in the pack', 'Residual oxygen', 'at most 2%'], ['I can reseal it', 'a zipper', 'Zipper present', 'yes']],
          'Where each goes next': [['Peel force', 'a target inside the limit, and a capability study against the limit'], ['Seal strength', 'a capability study against the limit and a control plan row — a limit that is never traded'], ['Residual oxygen', 'a capability study against the limit and a control plan row — a limit that is never traded'], ['Zipper present', 'a design decision — a choice, not a limit to hold']],
        },
        needs: [],
      },
    },
    {
      name: 'A gap, a limit with no source, a limit the wrong way round',
      source: 'the record’s misuse list: CTQs without limits control nothing; the source of the limit is the method',
      values: {
        customer: 'The depot',
        ctqs: [
          { id: 'a', c: { need: 'Tastes like homemade' } },
          { id: 'b', c: { need: 'Pallet arrives upright', measure: 'Lean angle', unit: 'degrees', kind: 'between', lower: 5, upper: 2 } },
          { id: 'c', c: { need: 'Looks fresh', measure: 'Residual oxygen', unit: '%', kind: 'atmost', upper: 2 } },
        ],
      },
      expect: {
        sentence: '1 of 3 needs is written as a measure with a limit; 2 have none yet: “Tastes like homemade” and “Pallet arrives upright”.',
        tiles: { Needs: '3', 'CTQs with a limit': '1 of 3' },
        checks: ['the lower limit must be below the upper', 'has a limit but no source'],
        needs: [],
      },
    },
    { name: 'A draft — nothing yet', source: 'the shape: a document is saved as typed; the boxes still needed are named', values: {}, expect: { sentence: '', tiles: { 'Filled in': '0 of 2', Needs: '—' }, needs: ['The customer', 'Needs and their CTQs — at least one need'] } },
  ],
  see: [{ key: 'kano', why: 'the class of each need comes from asking customers two ways' }, { key: 'sipoc', why: 'the customers named in the SIPOC are whose needs these are' }],
};

void fmt; void textOf;
export default vocCtq;
