/* SIPOC (FC-139) — the scope on one page: the process in four to seven steps from where it starts to where it ends, and for each step what it
 * needs and from whom, what it makes and for whom, with the inputs the team suspects marked for the Measure phase. A scope, not a map.
 * Specified in knowledge/specs/FC-139-sipoc.md; the method in knowledge/methods/sixsigma/sipoc.md (Pyzdek & Keller 2014; George et al.
 * 2005). No figure of its own: counts of what was typed, and a money line that says why there is none (knowledge/MONEY.md FC-139). */
import { andList, distinctList, plural } from '../figures/words';
import { cellText, rowsOf, textOf } from '../doc';
import type { DocDef, DocProblem, DocTable } from '../types';

/** Customers named as nobody — the record's examples ("the business", "quality") and the like. */
const VAGUE = /^(the )?(business|company|management|quality|everyone|everybody|customers?|the customer|people|someone|production|operations?)$/i;

const sipoc: DocDef = {
  key: 'sipoc', fc: 'FC-139', title: 'SIPOC', noun: 'SIPOC', group: 'Define',
  says: 'The process in four to seven steps — who supplies each, what goes in, what comes out and who gets it — so the scope is agreed before it is argued',
  question: 'Where does the process start and end, and what is in and out of scope?',
  signoff: { word: 'Agreed', ready: 'Ready to agree', by: 'the sponsor', ask: 'Agree the SIPOC', back: 'Reopen the SIPOC' },
  sections: [
    { id: 'edges', title: 'The edges of the process', help: 'Start and end first — they are the scope’s edges.', items: [
      { id: 'process', kind: 'text', label: 'The process', required: true, example: 'Slicing and packing sliced product', help: 'Its name, as the floor says it.' },
      { id: 'start', kind: 'text', label: 'Where it starts', required: true, example: 'Raw product arrives at intake', help: 'The first thing that happens that is in scope.' },
      { id: 'end', kind: 'text', label: 'Where it ends', required: true, example: 'Pallet leaves the despatch dock', help: 'The last thing that happens that is in scope.' },
    ] },
    { id: 'steps', title: 'The steps, with their suppliers and customers', help: 'Four to seven steps, each a verb phrase. More than seven is a map, not a scope.', items: [
      { id: 'steps', kind: 'list', label: 'Process steps', rowWord: 'step', required: true, min: 4, max: 7, help: 'In the order they happen. Several inputs, outputs, suppliers or customers: separate them with commas.', columns: [
        { id: 'step', kind: 'text', label: 'Step', required: true, example: 'Slice' },
        { id: 'suppliers', kind: 'text', label: 'Suppliers', example: 'Engineering', help: 'Who provides the inputs.' },
        { id: 'inputs', kind: 'text', label: 'Inputs', example: 'Blades, slicer settings', help: 'Materials, information, settings, people.' },
        { id: 'outputs', kind: 'text', label: 'Outputs', example: 'Sliced product', help: 'The product, the record, the pallet.' },
        { id: 'customers', kind: 'text', label: 'Customers', example: 'Packing', help: 'A person or a place — not “the business”.' },
        { id: 'watch', kind: 'text', label: 'Inputs to measure', example: 'Blade sharpness', help: 'The inputs whose variation could cause the problem — marked for the Measure phase.' },
      ] },
    ] },
    { id: 'boundary', title: 'The boundary', help: 'What is outside, and why — parked, not forgotten.', items: [
      { id: 'outside', kind: 'long', label: 'Outside the scope, and why', required: true, example: 'The grower’s field and the depot’s handling — not ours to change', help: 'Anything the team will not touch, with the reason. A scope that leaves out the step where the problem is caused cannot solve it: say so here.' },
    ] },
  ],
  check: (v): DocProblem[] => {
    const out: DocProblem[] = [];
    const steps = rowsOf(v, 'steps');
    if (steps.length && steps.length < 4) out.push({ field: 'steps', say: `A SIPOC is four to seven steps; ${plural(steps.length, 'step')} is too few to bound a process.` });
    steps.forEach((r, i) => {
      const n = i + 1, name = cellText(r, 'step') || `step ${n}`;
      if (cellText(r, 'outputs') && !cellText(r, 'customers')) out.push({ field: 'steps', say: `“${name}” makes something but names no customer for it.` });
      if (cellText(r, 'inputs') && !cellText(r, 'suppliers')) out.push({ field: 'steps', say: `“${name}” needs inputs but names no supplier for them.` });
      for (const c of distinctList(cellText(r, 'customers'))) if (VAGUE.test(c)) out.push({ field: 'steps', say: `“${c}” names nobody whose requirement can be measured — name the person or the place.` });
    });
    if (steps.length >= 4 && !distinctList(...steps.map(r => cellText(r, 'watch'))).length) out.push({ field: 'steps', say: 'No input is marked to measure — say which inputs the team suspects drive the problem.' });
    return out;
  },
  read: v => {
    const steps = rowsOf(v, 'steps');
    const names = steps.map(r => cellText(r, 'step')).filter(Boolean);
    const customers = distinctList(...steps.map(r => cellText(r, 'customers')));
    const suppliers = distinctList(...steps.map(r => cellText(r, 'suppliers')));
    const inputs = distinctList(...steps.map(r => cellText(r, 'inputs')));
    const outputs = distinctList(...steps.map(r => cellText(r, 'outputs')));
    const watch = distinctList(...steps.map(r => cellText(r, 'watch')));
    const sentence = names.length >= 2
      ? `${names.join(' → ')}${customers.length ? `; customers: ${andList(customers)}` : ''}${watch.length ? `; inputs to measure: ${andList(watch)}` : ''}.`
      : '';
    const tables: DocTable[] = steps.length ? [{
      title: 'The SIPOC', head: ['Suppliers', 'Inputs', 'Process step', 'Outputs', 'Customers'], shares: [0.19, 0.21, 0.2, 0.2, 0.2],
      rows: steps.map(r => [cellText(r, 'suppliers') || '—', cellText(r, 'inputs') || '—', cellText(r, 'step') || '—', cellText(r, 'outputs') || '—', cellText(r, 'customers') || '—']),
      note: `From ${textOf(v, 'start') || 'where it starts'} to ${textOf(v, 'end') || 'where it ends'}.`,
    }] : [];
    const more = [
      ...(textOf(v, 'start') && textOf(v, 'end') ? [`In scope: from ${textOf(v, 'start')} to ${textOf(v, 'end')}.`] : []),
      ...(textOf(v, 'outside') ? [`Outside: ${textOf(v, 'outside')}`] : []),
    ];
    return {
      sentence, tone: 'n', ...(more.length ? { more } : {}),
      tiles: [
        { k: 'Steps', v: steps.length ? String(steps.length) : '—', of: steps.length ? 'four to seven is a scope' : 'needs the steps' },
        { k: 'Customers', v: customers.length ? String(customers.length) : '—', of: 'named, whose needs count' },
        { k: 'Suppliers', v: suppliers.length ? String(suppliers.length) : '—', of: 'named, where variation comes from' },
        { k: 'To measure', v: watch.length ? String(watch.length) : '—', of: 'inputs marked for the Measure phase' },
      ],
      tables,
      working: steps.length ? [
        { label: 'Steps', value: `${names.length} named, from ${names[0] ?? '—'} to ${names[names.length - 1] ?? '—'}`, note: 'four to seven, each a verb phrase' },
        { label: 'Distinct, counted', value: `${plural(inputs.length, 'input')}, ${plural(outputs.length, 'output')}, ${plural(suppliers.length, 'supplier')}, ${plural(customers.length, 'customer')}`, note: 'the same name typed twice counts once' },
      ] : [],
      money: { missing: [], none: 'A SIPOC has no money of its own — it bounds the process whose yield, rejects or time the project then values (knowledge/MONEY.md, FC-139).' },
      caveats: [
        'It is a scope, not a map: where the data come from is the Measure phase’s work, and the value stream map or the process flow chart is the detail that comes after.',
        'A SIPOC built by one person settles nothing — the team and the sponsor agree it, and the agreement is on the page.',
        'A scope that leaves out the step where the problem is caused (the supplier’s process) cannot solve the problem: widen it or change the goal.',
        'Customers named as “the business” or “quality” name nobody whose requirement can be measured; name people or places.',
      ],
      checks: [],
      closing: sentence ? `${sentence.replace(/\.$/, '')}. The customers’ requirements go to the CTQ table next.` : 'Name the process’s start and end, then four to seven steps with their suppliers and customers.',
    };
  },
  examples: [
    {
      name: 'A yield project on sliced product — the record’s worked case',
      source: 'knowledge/methods/sixsigma/sipoc.md worked case (Pyzdek & Keller 2014); counts worked in scripts/knowledge/cases-doc.py S1',
      values: {
        process: 'Slicing and packing sliced product', start: 'Raw product arrives at intake', end: 'The pallet leaves the despatch dock',
        steps: [
          { id: 's1', c: { step: 'Intake', suppliers: 'the grower', inputs: 'raw product', outputs: 'checked product', customers: 'the wash line', watch: 'raw product size variation' } },
          { id: 's2', c: { step: 'Wash', suppliers: 'the chemicals supplier', inputs: 'water, chemicals', outputs: 'washed product', customers: 'the slicer' } },
          { id: 's3', c: { step: 'Slice', suppliers: 'engineering', inputs: 'blades, slicer settings', outputs: 'sliced product', customers: 'packing', watch: 'blade sharpness, slicer setting' } },
          { id: 's4', c: { step: 'Pack', suppliers: 'packaging suppliers', inputs: 'film, trays', outputs: 'sealed packs', customers: 'despatch' } },
          { id: 's5', c: { step: 'Despatch', suppliers: 'planning', inputs: 'the schedule', outputs: 'pallets', customers: 'the retailer’s depot' } },
        ],
        outside: 'The grower’s field and the depot’s handling — not ours to change',
      },
      expect: {
        sentence: 'Intake → Wash → Slice → Pack → Despatch; customers: the wash line, the slicer, packing, despatch and the retailer’s depot; inputs to measure: raw product size variation, blade sharpness and slicer setting.',
        tiles: { 'Filled in': '5 of 5', Steps: '5', Customers: '5', Suppliers: '5', 'To measure': '3' },
        tables: { 'The SIPOC': [['the grower', 'raw product', 'Intake', 'checked product', 'the wash line'], ['the chemicals supplier', 'water, chemicals', 'Wash', 'washed product', 'the slicer'], ['engineering', 'blades, slicer settings', 'Slice', 'sliced product', 'packing']] },
        needs: [],
      },
    },
    {
      name: 'Too few steps, a customer named as nobody, an input with no supplier',
      source: 'the record’s misuse list: four to seven steps; “the business” and “quality” name nobody',
      values: {
        process: 'Changeover', start: 'Last good pack', end: 'First good pack', outside: 'Planning’s schedule',
        steps: [
          { id: 'a', c: { step: 'Strip down', inputs: 'tools', outputs: 'a clean line', customers: 'the business' } },
          { id: 'b', c: { step: 'Set up', suppliers: 'engineering', inputs: 'new format parts', outputs: 'a set line', customers: 'quality' } },
        ],
      },
      expect: {
        sentence: 'Strip down → Set up; customers: the business and quality.',
        tiles: { 'Filled in': '4 of 5', Steps: '2', Customers: '2', Suppliers: '1', 'To measure': '—' },
        checks: ['too few to bound a process', '“Strip down” needs inputs but names no supplier', '“the business” names nobody', '“quality” names nobody'],
        needs: ['Process steps — at least 4 steps'],
      },
    },
    {
      name: 'A draft — only the process named',
      source: 'the shape: a document is saved as typed; the boxes still needed are named',
      values: { process: 'Packing' },
      expect: { sentence: '', tiles: { 'Filled in': '1 of 5', Steps: '—', Customers: '—' }, needs: ['Where it starts', 'Where it ends', 'Process steps — at least 4 steps', 'Outside the scope, and why'] },
    },
  ],
  see: [{ key: 'charter', why: 'the SIPOC bounds the process the charter’s problem lives in' }, { key: 'voc-ctq', why: 'the customers named here have requirements to turn into limits' }],
};

export default sipoc;
