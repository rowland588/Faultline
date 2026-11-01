/* STANDARD OPERATING PROCEDURE WITH PHOTOS (FC-225) — the steps of a set-up, a clean or a changeover, one photo each, with the care a step
 * needs, so the procedure can be read at the machine instead of in a binder. A photo belongs to a step by the number its caption starts
 * with (the app's one mechanism for a photo: a caption). Specified in knowledge/specs/FC-225-sop.md; the method in
 * knowledge/methods/people/twi-job-instruction.md (a long SOP is not a teaching document — twelve steps is the usual ceiling). No money of
 * its own (knowledge/MONEY.md, FC-225). */
import { daysBetween, niceDay } from '../../../lib/weeks';
import { andList, plural } from '../figures/words';
import { durationSaid, numberRanges, photoMatch, stepTimes } from '../figures/sop';
import { cellNum, cellText, rowsOf, textOf } from '../doc';
import type { DocDef, DocTable } from '../types';

/** More steps than this is a binder, not a procedure for the machine (the record: a 14-page procedure is not a teaching document). */
export const STEP_CEILING = 12;
/** A step that is a paragraph is not an instruction. */
const LONG_STEP = 120;

const CARE = [
  { value: 'none', label: 'Nothing special' },
  { value: 'safety', label: 'Safety', help: 'Guards, isolation, hands, lifting.' },
  { value: 'quality', label: 'Quality', help: 'A setting that makes or breaks the pack.' },
  { value: 'food', label: 'Food safety', help: 'Hygiene, foreign bodies, temperature.' },
  { value: 'allergen', label: 'Allergen', help: 'Cross-contact, the right colour of utensil.' },
];
const careLabel = (v: string) => CARE.find(c => c.value === v)?.label ?? v;

const sop: DocDef = {
  key: 'sop', fc: 'FC-225', title: 'Standard operating procedure', noun: 'procedure', group: 'Standardise',
  says: 'The steps of a set-up, a clean or a changeover, a photo for each, with the care each needs — short enough to read at the machine',
  question: 'What are the steps, with a photo each, at the machine?',
  signoff: { word: 'Agreed', ready: 'Ready to agree', by: 'the line manager', ask: 'Agree the procedure', back: 'Reopen the procedure' },
  sections: [
    { id: 'procedure', title: 'The procedure', help: 'What it is, where it is used and who keeps it.', items: [
      { id: 'title', kind: 'text', label: 'Procedure', required: true, example: 'Changeover to the 500 g pack', help: 'The job, as the floor names it.' },
      { id: 'use', kind: 'choice', label: 'What it is for', required: true, options: [
        { value: 'setup', label: 'Set-up' }, { value: 'clean', label: 'Clean' }, { value: 'changeover', label: 'Changeover' }, { value: 'check', label: 'Check' }, { value: 'other', label: 'Something else' },
      ] },
      { id: 'where', kind: 'text', label: 'Machine and line', example: 'Ilapak flow wrapper, Line 3', offer: ctx => (ctx.lineName ? { value: ctx.lineName, words: `${ctx.lineName} — this document’s line` } : undefined), help: 'Where it is used.' },
      { id: 'owner', kind: 'person', label: 'Kept by', required: true, help: 'Who keeps it right when the machine or the pack changes.' },
      { id: 'version', kind: 'text', label: 'Version', example: 'v3', maxLength: 20 },
      { id: 'review', kind: 'date', label: 'Review by', help: 'The day it is read again against the machine. A procedure nobody re-reads drifts from the way the work is done.' },
    ] },
    { id: 'steps', title: 'The steps', help: 'One instruction a step, in the order they are done. Twelve or fewer; more is a binder.', items: [
      { id: 'steps', kind: 'list', label: 'Steps', rowWord: 'step', required: true, help: 'Short enough to read with gloves on. The photo shows the rest.', columns: [
        { id: 'do', kind: 'text', label: 'Do', required: true, example: 'Lower the film guide to the 2 mm mark', help: 'One action, a verb first.' },
        { id: 'how', kind: 'long', label: 'How, and the key point', example: 'Use the 2 mm feeler gauge from the tool board; the guide must not touch the film', help: 'The knack — what makes or breaks the step.' },
        { id: 'care', kind: 'choice', label: 'Take care of', options: CARE },
        { id: 'secs', kind: 'number', label: 'Seconds', integer: true, min: 0, max: 86400, unit: 's', help: 'How long it takes, if you know.' },
      ] },
    ] },
    { id: 'pictures', title: 'The photos', help: 'The picture is the instruction.', items: [
      { id: 'stepPhotos', kind: 'photos', label: 'A photo of each step', max: 40, help: 'Start each caption with its step number — “3 — guide at 2 mm” — so the photo is matched to the step.' },
    ] },
  ],
  read: (v, ctx, photos) => {
    const steps = rowsOf(v, 'steps');
    const n = steps.length;
    const title = textOf(v, 'title') || 'This procedure';
    const m = photoMatch(n, photos.filter(p => p.field === 'stepPhotos').map(p => p.caption));
    const care = steps.map((r, i) => ({ i: i + 1, c: cellText(r, 'care') })).filter(x => x.c && x.c !== 'none');
    const careKinds = [...new Set(care.map(x => careLabel(x.c).toLowerCase()))];
    const t = stepTimes(steps.map(r => cellNum(r, 'secs')));
    const checks: { field?: string; say: string }[] = [];
    if (n > STEP_CEILING) checks.push({ field: 'steps', say: `${plural(n, 'step')} is long for the machine — ${STEP_CEILING} is the usual ceiling. Split it into two procedures, or teach the job from a breakdown.` });
    steps.forEach((r, i) => { if (cellText(r, 'do').length > LONG_STEP) checks.push({ field: 'steps', say: `Step ${i + 1} is a paragraph, not an instruction — keep “Do” to one action and put the knack in “How”.` }); });
    if (n && m.without.length) checks.push({ field: 'stepPhotos', say: `${m.without.length === 1 ? `Step ${m.without[0]} has` : `Steps ${numberRanges(m.without)} have`} no photo — the picture is the instruction.` });
    const careNoPhoto = care.filter(x => m.without.includes(x.i)).map(x => x.i);
    if (careNoPhoto.length) checks.push({ field: 'stepPhotos', say: `${careNoPhoto.length === 1 ? `Step ${careNoPhoto[0]} needs` : `Steps ${numberRanges(careNoPhoto)} need`} care and ${careNoPhoto.length === 1 ? 'has' : 'have'} no photo — those are the ones to show.` });
    if (m.unnumbered) checks.push({ field: 'stepPhotos', say: `${plural(m.unnumbered, 'photo')} ${m.unnumbered === 1 ? 'has' : 'have'} no step number at the start of the caption, so ${m.unnumbered === 1 ? 'it is' : 'they are'} matched to no step.` });
    if (m.beyond.length) checks.push({ field: 'stepPhotos', say: `A photo is captioned ${numberRanges(m.beyond)}, but the procedure has ${plural(n, 'step')}.` });
    const review = textOf(v, 'review');
    const late = review ? daysBetween(review, ctx.today) : undefined;
    if (late !== undefined && late > 0) checks.push({ field: 'review', say: `It was due to be read again on ${niceDay(review, { year: true })}, ${plural(late, 'day')} ago.` });
    const photoPart = !n ? '' : m.have.length === 0 ? 'none with a photo yet' : m.have.length === n ? 'every step with a photo' : `${m.have.length} with a photo`;
    const sentence = n
      ? `${title}: ${plural(n, 'step')}, ${photoPart}${care.length ? `, ${plural(care.length, 'step')} to take care over (${andList(careKinds)})` : ''}${t.all ? `, about ${durationSaid(t.total)}` : ''}.`
      : '';
    const table: DocTable[] = n ? [{
      title: 'The steps', head: ['#', 'Do', 'How, and the key point', 'Take care of', 'Time', 'Photo'], shares: [0.05, 0.27, 0.34, 0.12, 0.1, 0.12],
      rows: steps.map((r, i) => [String(i + 1), cellText(r, 'do'), cellText(r, 'how') || '—', cellText(r, 'care') && cellText(r, 'care') !== 'none' ? careLabel(cellText(r, 'care')) : '—', cellNum(r, 'secs') !== undefined ? durationSaid(cellNum(r, 'secs') as number) : '—', m.have.includes(i + 1) ? 'yes' : 'no']),
      note: 'A photo is matched to a step by the number its caption starts with.',
    }] : [];
    return {
      sentence, tone: 'n',
      tiles: [
        { k: 'Steps', v: n ? String(n) : '—', of: n ? `${STEP_CEILING} or fewer` : 'none yet', ...(n > STEP_CEILING ? { tone: 'a' as const } : {}) },
        { k: 'With a photo', v: n ? `${m.have.length} of ${n}` : '—', of: n && m.without.length ? `${m.without.length} without` : n ? 'every step' : 'none yet', ...(n && m.without.length ? { tone: 'a' as const } : {}) },
        { k: 'To take care over', v: n ? String(care.length) : '—', of: care.length ? andList(careKinds) : 'none marked' },
        { k: 'Time', v: t.all ? durationSaid(t.total) : n ? `${t.given} of ${n} timed` : '—', of: t.all ? 'all the steps' : 'a total needs every step’s seconds' },
        { k: 'Review', v: review ? niceDay(review, { year: true }) : '—', of: late !== undefined && late > 0 ? `${plural(late, 'day')} overdue` : review ? 'not yet due' : 'no day set', ...(late !== undefined && late > 0 ? { tone: 'r' as const } : {}) },
      ],
      tables: table,
      working: t.given ? [{ label: 'Time', value: `${t.given} of ${n} steps timed = ${durationSaid(t.total)}`, note: t.all ? 'the sum of the seconds given' : 'a partial sum — not a total for the procedure' }] : [],
      money: { missing: [], none: 'A procedure has no money of its own: the stops, rejects and injuries it prevents are priced on the problem it fixes, and teaching it is priced in the job breakdown (knowledge/MONEY.md, FC-225).' },
      caveats: [
        'A procedure on paper is not a procedure followed: whether people do it this way is seen at the machine, not on this page.',
        'A photo is matched to a step by the number its caption starts with; a photo without one is kept and shown but matched to no step.',
        'The seconds are as typed. They are not a timed standard — the time study and the line balance are that.',
        'Twelve steps is the usual ceiling for a page at the machine; a longer job is taught from a job breakdown, step by step with its key points.',
      ],
      checks,
      closing: sentence ? `${sentence.replace(/\.$/, '')}. Read it against the machine, then put it where the work is done.` : 'Type the steps, one action each, and add a photo for every step.',
    };
  },
  examples: [
    {
      name: 'A changeover — eight steps, timed, three to take care over',
      source: 'the record’s breakdown rule (5–12 steps); seconds summed by hand in scripts/knowledge/cases-doc.py P1 (30+45+60+20+90+40+35+30 = 350 s = 5 min 50 s)',
      values: {
        title: 'Changeover to the 500 g pack', use: 'changeover', where: 'Ilapak flow wrapper, Line 3', owner: 'Sam Patel', review: '2026-10-20',
        steps: [
          { id: 's1', c: { do: 'Isolate the machine and lock off', care: 'safety', secs: 30 } },
          { id: 's2', c: { do: 'Remove the 250 g forming tube', secs: 45 } },
          { id: 's3', c: { do: 'Fit the 500 g forming tube', how: 'Seat it fully against the stop', care: 'quality', secs: 60 } },
          { id: 's4', c: { do: 'Swap the film reel', secs: 20 } },
          { id: 's5', c: { do: 'Set the film guide to 2 mm', how: 'Use the feeler gauge; the guide must not touch the film', care: 'quality', secs: 90 } },
          { id: 's6', c: { do: 'Select the 500 g recipe on the panel', secs: 40 } },
          { id: 's7', c: { do: 'Clear the product contact parts of the old product', care: 'allergen', secs: 35 } },
          { id: 's8', c: { do: 'Run three packs and check the seal', secs: 30 } },
        ],
      },
      expect: {
        sentence: 'Changeover to the 500 g pack: 8 steps, none with a photo yet, 4 steps to take care over (safety, quality and allergen), about 5 min 50 s.',
        tiles: { 'Filled in': '4 of 4', Steps: '8', 'With a photo': '0 of 8', 'To take care over': '4', Time: '5 min 50 s', Review: '20 Oct 2026' },
        checks: ['Steps 1 to 8 have no photo', 'Steps 1, 3, 5 and 7 need care and have no photo', 'It was due to be read again on 20 Oct 2026, 12 days ago'],
        needs: [],
      },
    },
    {
      name: 'Too long, a step that is a paragraph, and only some steps timed',
      source: 'the record: a 14-page procedure is not a teaching document; thirteen steps is over the usual ceiling of twelve',
      values: {
        title: 'Weekly clean', use: 'clean',
        steps: [
          { id: 'a', c: { do: 'Wash every surface of the machine with the approved detergent, working from the top down, rinsing each part twice, wiping with the blue cloth and checking nothing is left behind', secs: 600 } },
          ...Array.from({ length: 12 }, (_, i) => ({ id: `b${i}`, c: { do: `Step ${i + 2} of the clean` } })),
        ],
      },
      expect: {
        sentence: 'Weekly clean: 13 steps, none with a photo yet.',
        tiles: { 'Filled in': '3 of 4', Steps: '13', Time: '1 of 13 timed' },
        checks: ['13 steps is long for the machine', 'Step 1 is a paragraph'],
        needs: ['Kept by'],
      },
    },
    { name: 'A draft — nothing yet', source: 'the shape: a document is saved as typed; the boxes still needed are named', values: {}, expect: { sentence: '', tiles: { 'Filled in': '0 of 4', Steps: '—' }, needs: ['Procedure', 'What it is for', 'Kept by', 'Steps — at least one step'] } },
  ],
  see: [],
};

export default sop;
