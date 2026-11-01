/* KANO ANALYSIS (FC-141) — which requirements are must-be, performance or delighters. Each person is asked each requirement twice, how they
 * would feel if it were there and if it were not; the survey is typed answer by answer or tallied by hand; every pair is classed by the
 * published Kano evaluation table, the class of a requirement is the most frequent among those asked, and the split is shown.
 * Specified in knowledge/specs/FC-141-kano.md; the arithmetic is figures/kano.ts, proved against scripts/knowledge/cases-doc.py. No money of
 * its own (knowledge/MONEY.md, FC-141). */
import { andList, fmt, plural } from '../figures/words';
import { ANSWERS, CLASS_WORD, KANO_TABLE, classify, coefficients, tallyOf, totalOf, type Answer, type KanoClass, type Tally } from '../figures/kano';
import { cellNum, cellText, rowsOf, textOf } from '../doc';
import type { DocDef, DocProblem, DocTable } from '../types';

/** A dozen people is the usual floor (the record: Kano from one interview is an anecdote). */
const FLOOR = 12;
const word = (c: KanoClass) => CLASS_WORD[c];
const pctOf = (x: number) => `${fmt(x * 100, 0)}%`;
const key = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

interface Need { name: string; pairs: { f: Answer; d: Answer }[]; hand: Partial<Tally> }

/** The requirements in the order they first appear, each with its typed pairs and its hand tally. */
function needsOf(v: Parameters<DocDef['read']>[0]): Need[] {
  const out = new Map<string, Need>();
  const get = (name: string) => { const k = key(name); let n = out.get(k); if (!n) { n = { name: name.trim(), pairs: [], hand: {} }; out.set(k, n); } return n; };
  for (const r of rowsOf(v, 'answers')) {
    const name = cellText(r, 'need'), f = cellText(r, 'functional') as Answer, d = cellText(r, 'dysfunctional') as Answer;
    if (name && f && d) get(name).pairs.push({ f, d });
  }
  for (const r of rowsOf(v, 'tally')) {
    const name = cellText(r, 'need');
    if (!name) continue;
    const n = get(name);
    for (const k of ['A', 'O', 'M', 'I', 'R', 'Q'] as KanoClass[]) n.hand[k] = (n.hand[k] ?? 0) + (cellNum(r, k.toLowerCase()) ?? 0);
  }
  return [...out.values()];
}

const kano: DocDef = {
  key: 'kano', fc: 'FC-141', title: 'Kano analysis', noun: 'Kano survey', group: 'Define',
  says: 'Which requirements are must-be, performance or delighters — each asked of customers two ways, classed by Kano’s published table',
  question: 'Which requirements are must-be, performance, or delighters?',
  signoff: { word: 'Agreed', ready: 'Ready to agree', by: 'the sponsor', ask: 'Agree the survey’s reading', back: 'Reopen the survey' },
  sections: [
    { id: 'survey', title: 'The survey', help: 'What was asked, of whom.', items: [
      { id: 'product', kind: 'text', label: 'What the questions are about', required: true, example: 'A resealable lid on the family pack', help: 'The product or pack the requirements belong to.' },
      { id: 'asked', kind: 'long', label: 'Who was asked, and how', example: '14 shoppers at the Leeds panel, paper form, 20 October', help: 'The customers, how many, how they were chosen. A dozen is the usual floor for a requirement.' },
    ] },
    { id: 'answers', title: 'The answers, one pair at a time', help: 'Each row is one person’s two answers to one requirement. Ask: “If the pack had this, how would you feel?” then “If it did not?”', items: [
      { id: 'answers', kind: 'list', label: 'Answers', rowWord: 'answer', required: true, alt: 'tally', help: 'Type each pair, or tally the survey by hand below instead.', columns: [
        { id: 'need', kind: 'text', label: 'Requirement', required: true, example: 'Reclosable lid', help: 'Spell it the same each time — the same words are the same requirement.' },
        { id: 'who', kind: 'text', label: 'Who', example: 'P3' },
        { id: 'functional', kind: 'choice', label: 'If it were there…', required: true, options: ANSWERS },
        { id: 'dysfunctional', kind: 'choice', label: 'If it were not there…', required: true, options: ANSWERS },
      ] },
    ] },
    { id: 'tally', title: 'Or tallied by hand', help: 'When the survey was already classed on paper: how many people fell in each class, for a requirement.', items: [
      { id: 'tally', kind: 'list', label: 'Tallies', rowWord: 'tally', help: 'Added to any typed answers for the same requirement.', columns: [
        { id: 'need', kind: 'text', label: 'Requirement', required: true },
        { id: 'a', kind: 'number', label: 'Attractive', integer: true, min: 0 },
        { id: 'o', kind: 'number', label: 'Performance', integer: true, min: 0 },
        { id: 'm', kind: 'number', label: 'Must-be', integer: true, min: 0 },
        { id: 'i', kind: 'number', label: 'Indifferent', integer: true, min: 0 },
        { id: 'r', kind: 'number', label: 'Reverse', integer: true, min: 0 },
        { id: 'q', kind: 'number', label: 'Questionable', integer: true, min: 0 },
      ] },
    ] },
  ],
  check: (v): DocProblem[] => {
    const out: DocProblem[] = [];
    for (const n of needsOf(v)) {
      const t = tallyOf(n.pairs, n.hand), total = totalOf(t);
      if (total > 0 && total < FLOOR) out.push({ field: 'answers', say: `“${n.name}” has ${plural(total, 'answer')} — a dozen is the usual floor; fewer is an anecdote.` });
      if (t.Q > 0) out.push({ field: 'answers', say: `“${n.name}”: ${plural(t.Q, 'answer')} questionable — the same answer at the extremes both ways; the question may not have been understood.` });
      const c = classify(t);
      if (c.tied.length) out.push({ field: 'answers', say: `“${n.name}” is tied between ${andList(c.tied.map(k => word(k)))} — ask more people before classing it.` });
    }
    return out;
  },
  read: v => {
    const needs = needsOf(v).map(n => { const t = tallyOf(n.pairs, n.hand); return { n, t, total: totalOf(t), c: classify(t), k: coefficients(t) }; }).filter(x => x.total > 0);
    const answers = needs.reduce((a, x) => a + x.total, 0);
    const count = (k: KanoClass) => needs.filter(x => x.c.cls === k).length;
    const tied = needs.filter(x => x.c.tied.length);
    const said = (x: typeof needs[number]) => `“${x.n.name}” ${x.c.cls ? word(x.c.cls) : `tied (${andList(x.c.tied.map(word))})`}`;
    const sentence = needs.length ? `${plural(needs.length, 'requirement')} classed from ${plural(answers, 'answer')}: ${needs.map(said).join(', ')}.` : '';
    const tables: DocTable[] = [];
    if (needs.length) tables.push({
      title: 'The survey by requirement', head: ['Requirement', 'Answers', 'A', 'O', 'M', 'I', 'R', 'Q', 'Class', 'Better', 'Worse'], shares: [0.2, 0.08, 0.06, 0.06, 0.06, 0.06, 0.06, 0.06, 0.16, 0.1, 0.1],
      rows: needs.map(x => [x.n.name, String(x.total), String(x.t.A), String(x.t.O), String(x.t.M), String(x.t.I), String(x.t.R), String(x.t.Q),
        x.c.cls ? word(x.c.cls) : x.c.tied.length ? `tied: ${x.c.tied.map(word).join(' / ')}` : '—', x.k ? pctOf(x.k.better) : '—', x.k ? pctOf(x.k.worse) : '—']),
      note: 'A attractive · O performance · M must-be · I indifferent · R reverse · Q questionable. Better = (A+O)/(A+O+M+I); worse = −(O+M)/(A+O+M+I).',
    });
    const rowsOfTable = (['like', 'expect', 'neutral', 'livewith', 'dislike'] as Answer[]).map(f => [ANSWERS.find(a => a.value === f)?.label ?? f, ...KANO_TABLE[f].map(word)]);
    tables.push({ title: 'How each pair is classed (Kano’s evaluation table)', head: ['If it were there… / if not…', ...ANSWERS.map(a => a.label)], rows: rowsOfTable, shares: [0.24, 0.152, 0.152, 0.152, 0.152, 0.152],
      note: 'The published table (Kano et al. 1984; as Berger et al. 1993 print it) — rows are the answer to “if it were there”, columns to “if it were not”.' });
    return {
      sentence, tone: 'n', ...(textOf(v, 'asked') ? { more: [`Asked: ${textOf(v, 'asked')}`] } : {}),
      tiles: [
        { k: 'Requirements', v: needs.length ? String(needs.length) : '—', of: 'with at least one answer' },
        { k: 'Answers', v: needs.length ? String(answers) : '—', of: 'typed and tallied' },
        { k: 'Must-be', v: needs.length ? String(count('M')) : '—', of: 'never traded' },
        { k: 'Performance', v: needs.length ? String(count('O')) : '—', of: 'more is better' },
        { k: 'Attractive', v: needs.length ? String(count('A')) : '—', of: 'delighters — a decision' },
        { k: 'Tied', v: needs.length ? String(tied.length) : '—', of: tied.length ? 'ask more people' : 'none', ...(tied.length ? { tone: 'a' as const } : {}) },
      ],
      tables,
      working: needs.map(x => ({ label: x.n.name, value: `${(['A', 'O', 'M', 'I', 'R', 'Q'] as KanoClass[]).map(k => `${k} ${x.t[k]}`).join(' · ')} → ${x.c.cls ? word(x.c.cls) : x.c.tied.length ? 'tied' : 'no class'}${x.k ? `; better ${pctOf(x.k.better)}, worse ${pctOf(x.k.worse)}` : ''}`, note: 'the most frequent of A, O, M, I classes it' })),
      money: { missing: [], none: 'A Kano survey has no money of its own: it says which requirements are limits that are never traded and which are choices — the CTQ table and the capability studies that follow carry the pounds (knowledge/MONEY.md, FC-141).' },
      caveats: [
        'Kano from one interview is an anecdote: a dozen people is the usual floor, and the split — not only the class — is what to read.',
        'The class is the most frequent among the people asked, in the table’s own categories; reverse and questionable answers are counted and shown but never classed, and a tie is reported as a tie.',
        'Better and worse are indices of how satisfaction moves if the requirement is met or missed — not shares of customers.',
        'A must-be is never traded against a delighter, and needs move: last year’s delighter is this year’s performance need — run it again.',
      ],
      checks: [],
      closing: sentence ? `${sentence.replace(/\.$/, '')}. The must-be requirements become limits in the CTQ table; the attractive ones are design decisions.` : 'Type each person’s two answers to each requirement, or tally the survey by hand.',
    };
  },
  examples: [
    {
      name: 'A resealable lid — twelve people typed, twelve more on a seal, and a tally by hand',
      source: 'Kano et al. (1984); the evaluation table and coefficients as published guides print them; counts worked in scripts/knowledge/cases-doc.py K1',
      values: {
        product: 'A resealable lid on the family pack',
        answers: [
          ...Array.from({ length: 5 }, (_, i) => ({ id: `a${i}`, c: { need: 'Reclosable lid', functional: 'like', dysfunctional: 'dislike' } })),
          ...Array.from({ length: 2 }, (_, i) => ({ id: `b${i}`, c: { need: 'Reclosable lid', functional: 'like', dysfunctional: 'neutral' } })),
          ...Array.from({ length: 2 }, (_, i) => ({ id: `c${i}`, c: { need: 'Reclosable lid', functional: 'expect', dysfunctional: 'dislike' } })),
          { id: 'd0', c: { need: 'Reclosable lid', functional: 'neutral', dysfunctional: 'neutral' } },
          { id: 'e0', c: { need: 'Reclosable lid', functional: 'like', dysfunctional: 'like' } },
          { id: 'f0', c: { need: 'Reclosable lid', functional: 'dislike', dysfunctional: 'like' } },
          ...Array.from({ length: 10 }, (_, i) => ({ id: `g${i}`, c: { need: 'Seal does not leak', functional: 'expect', dysfunctional: 'dislike' } })),
          ...Array.from({ length: 2 }, (_, i) => ({ id: `h${i}`, c: { need: 'Seal does not leak', functional: 'neutral', dysfunctional: 'dislike' } })),
        ],
        tally: [{ id: 't1', c: { need: 'Easy-peel tab', a: 7, o: 3, m: 0, i: 2, r: 0, q: 0 } }],
      },
      expect: {
        sentence: '3 requirements classed from 36 answers: “Reclosable lid” performance, “Seal does not leak” must-be, “Easy-peel tab” attractive.',
        tiles: { 'Filled in': '2 of 2', Requirements: '3', Answers: '36', 'Must-be': '1', Performance: '1', Attractive: '1', Tied: '0' },
        tables: {
          'The survey by requirement': [['Reclosable lid', '12', '2', '5', '2', '1', '1', '1', 'performance', '70%', '-70%'], ['Seal does not leak', '12', '0', '0', '12', '0', '0', '0', 'must-be', '0%', '-100%'], ['Easy-peel tab', '12', '7', '3', '0', '2', '0', '0', 'attractive', '83%', '-25%']],
          'How each pair is classed (Kano’s evaluation table)': [['I like it that way', 'questionable', 'attractive', 'attractive', 'attractive', 'performance'], ['It must be that way', 'reverse', 'indifferent', 'indifferent', 'indifferent', 'must-be'], ['I am neutral', 'reverse', 'indifferent', 'indifferent', 'indifferent', 'must-be'], ['I can live with it that way', 'reverse', 'indifferent', 'indifferent', 'indifferent', 'must-be'], ['I dislike it that way', 'reverse', 'reverse', 'reverse', 'reverse', 'questionable']],
        },
        checks: ['“Reclosable lid”: 1 answer questionable'],
        needs: [],
      },
    },
    {
      name: 'A tie and too few people',
      source: 'the shape of the record’s misuse list: a tie is reported, a few people is an anecdote',
      values: { product: 'A new tray', tally: [{ id: 't', c: { need: 'Window in the lid', a: 6, m: 6 } }, { id: 'u', c: { need: 'Stackable', a: 1, o: 2 } }] },
      expect: {
        sentence: '2 requirements classed from 15 answers: “Window in the lid” tied (must-be and attractive), “Stackable” performance.',
        tiles: { 'Filled in': '2 of 2', Requirements: '2', Tied: '1' },
        checks: ['“Window in the lid” is tied between must-be and attractive', '“Stackable” has 3 answers — a dozen is the usual floor'],
        needs: [],
      },
    },
    { name: 'A draft — nothing yet', source: 'the shape: a document is saved as typed; the boxes still needed are named', values: {}, expect: { sentence: '', tiles: { 'Filled in': '0 of 2', Requirements: '—' }, needs: ['What the questions are about', 'Answers — at least one answer'] } },
  ],
  see: [{ key: 'voc-ctq', why: 'the must-be and performance requirements become limits' }],
};

export default kano;
