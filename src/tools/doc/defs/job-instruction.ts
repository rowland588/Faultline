/* TWI JOB INSTRUCTION (FC-223) — the breakdown sheet and the four-step teaching: a job taken apart into important steps, each with its key
 * points and the reason for each, and every learner taught, tried out and signed off by name and day, with the 30-day re-check. Specified in
 * knowledge/specs/FC-223-job-instruction.md; the method in knowledge/methods/people/twi-job-instruction.md (Dinero 2005; Graupp & Wrona 2006).
 * Money is the paid time a job taught well saves (knowledge/MONEY.md, FC-223): typed hours to standard with and without, never invented. */
import { addDays, daysBetween, niceDay } from '../../../lib/weeks';
import { RECHECK_DAYS, pointsOf, hoursSaved, teachingOf, type Learner, type TryOut } from '../figures/ji';
import { fmt, gbp, plural } from '../figures/words';
import { fixed } from '../../calc/format';
import { cellText, numOf, rowsOf, textOf } from '../doc';
import type { DocDef, DocProblem, DocTable, DocValues } from '../types';

/** The breakdown is five to twelve important steps, one to three key points each (the record). */
const STEPS_LOW = 5, STEPS_HIGH = 12, POINTS_HIGH = 3;

const learnersOf = (v: DocValues): Learner[] => rowsOf(v, 'learners').map(r => ({
  name: cellText(r, 'name'),
  ...(cellText(r, 'taught') ? { taught: cellText(r, 'taught') } : {}),
  ...(cellText(r, 'tryout') ? { tryOut: cellText(r, 'tryout') as TryOut } : {}),
  ...(cellText(r, 'signed') ? { signed: cellText(r, 'signed') } : {}),
  ...(cellText(r, 'recheck') ? { recheck: cellText(r, 'recheck') as 'passed' | 'failed' } : {}),
}));
const TRYOUT = [
  { value: 'notyet', label: 'Not tried out yet' },
  { value: 'again', label: 'To try again' },
  { value: 'passed', label: 'Signed off' },
];
const TRYOUT_WORD = (v: string) => TRYOUT.find(o => o.value === v)?.label ?? '—';

const jobInstruction: DocDef = {
  key: 'job-instruction', fc: 'FC-223', title: 'TWI task instruction', noun: 'task breakdown', group: 'Standardise',
  says: 'A task taken apart into important steps, key points and reasons, and every learner taught, tried out and signed off by name and day',
  question: 'How do we teach this task so everyone does it right?',
  signoff: { word: 'Agreed', ready: 'Ready to agree', by: 'the supervisor', ask: 'Agree the breakdown', back: 'Reopen the breakdown' },
  sections: [
    { id: 'job', title: 'The task', help: 'What is taught, to what standard, by whom.', items: [
      { id: 'title', kind: 'text', label: 'The job', required: true, example: 'Splice the film reel on the wrapper', help: 'The task, as the floor names it.' },
      { id: 'where', kind: 'text', label: 'Machine and line', example: 'Ilapak flow wrapper, Line 3', offer: ctx => (ctx.lineName ? { value: ctx.lineName, words: `${ctx.lineName} — this document’s line` } : undefined) },
      { id: 'standard', kind: 'text', label: 'The standard it is taught to', example: 'The Line 3 standard for the Ilapak', help: 'The line standard or the procedure the job is done to. The breakdown teaches the standard; it is not the standard.' },
      { id: 'why', kind: 'long', label: 'Why it needs teaching', example: 'Three film breaks a week trace to a splice made with the leading edge not cut square', help: 'The stop, reject or injury that a badly done job causes — the reason to bother.' },
      { id: 'instructor', kind: 'person', label: 'Instructor', required: true, help: 'Who teaches it — someone who does the job well and has been taught to instruct.' },
      { id: 'helper', kind: 'person', label: 'Who helps afterwards', help: 'Step four: the person a learner goes to when they are on their own.' },
    ] },
    { id: 'breakdown', title: 'The breakdown', help: 'Not every motion: the important steps that advance the job, each with the few things that make or break it, and why.', items: [
      { id: 'steps', kind: 'list', label: 'Important steps', rowWord: 'step', required: true, help: 'Five to twelve, in order. One to three key points a step: safety first, then quality, then ease. Separate several points or reasons with semicolons, in the same order.', columns: [
        { id: 'step', kind: 'text', label: 'Important step', required: true, example: 'Cut the leading edge square', help: 'A logical segment that advances the job.' },
        { id: 'keys', kind: 'long', label: 'Key points', example: 'Cut on the guide line; both hands clear of the clamp', help: 'What would make or break the step if it were left out — the safety, the quality, the knack.' },
        { id: 'reasons', kind: 'long', label: 'Reasons', example: 'A slanted edge catches on the roller; a hand in the clamp is a crush injury', help: 'Why each key point matters, in the same order.' },
        { id: 'safety', kind: 'choice', label: 'Safety?', options: [{ value: 'yes', label: 'A key point is about safety' }, { value: 'no', label: 'No safety key point' }] },
        { id: 'from', kind: 'text', label: 'From', example: 'VFB-240 manual, p.7', maxLength: 120, help: 'Where the step comes from, if it was taken from the maker’s manual — the document and its page.' },
      ] },
    ] },
    { id: 'teaching', title: 'The learners — the four steps', help: 'Prepare them, present one step at a time, let them try it out, then follow up. The try-out is the proof: they do it, and say the steps, key points and reasons back.', items: [
      { id: 'learners', kind: 'list', label: 'Learners', rowWord: 'learner', help: 'Signed off only after a try-out in which they did it and said it back — not at the presentation.', columns: [
        { id: 'name', kind: 'person', label: 'Learner', required: true },
        { id: 'taught', kind: 'date', label: 'Taught on', help: 'The day of the presentation.' },
        { id: 'tryout', kind: 'choice', label: 'Try-out', options: TRYOUT },
        { id: 'signed', kind: 'date', label: 'Signed off on', help: 'The day they did it right and said it back.' },
        { id: 'recheck', kind: 'choice', label: 'Re-check at 30 days', options: [{ value: 'passed', label: 'Still to the standard' }, { value: 'failed', label: 'Not to the standard' }] },
      ] },
    ] },
    { id: 'worth', title: 'What teaching it well is worth', help: 'Paid time to reach the standard. Optional — nothing waits on it.', items: [
      { id: 'without', kind: 'number', label: 'Hours to reach the standard, taught by watching', min: 0, unit: 'h', help: 'What it took the last people learning it the old way.' },
      { id: 'with', kind: 'number', label: 'Hours to reach the standard, taught by the breakdown', min: 0, unit: 'h', help: 'What it took with this breakdown.' },
      { id: 'rate', kind: 'number', label: 'One person’s £ an hour', min: 0, unit: '£ an hour', offer: ctx => (ctx.labourPerHour ? { value: Math.round(ctx.labourPerHour * 100) / 100, words: `£${fmt(ctx.labourPerHour, 2)} an hour — ${ctx.lineName ?? 'the line'}’s wage with on-costs` } : undefined), help: 'The line’s own is offered when it has one.' },
    ] },
  ],
  check: (v, ctx): DocProblem[] => {
    const out: DocProblem[] = [];
    const steps = rowsOf(v, 'steps');
    if (steps.length && steps.length < STEPS_LOW) out.push({ field: 'steps', say: `${plural(steps.length, 'step')} — a breakdown is usually ${STEPS_LOW} to ${STEPS_HIGH}; fewer may be too coarse to teach from.` });
    if (steps.length > STEPS_HIGH) out.push({ field: 'steps', say: `${plural(steps.length, 'step')} — more than ${STEPS_HIGH} is a procedure, not a breakdown. Split the job, or group the steps.` });
    steps.forEach((r, i) => {
      const k = pointsOf(cellText(r, 'keys')), why = pointsOf(cellText(r, 'reasons')), n = i + 1;
      if (!k.length) out.push({ field: 'steps', say: `Step ${n} has no key point — every step has the one thing that makes or breaks it.` });
      if (k.length > POINTS_HIGH) out.push({ field: 'steps', say: `Step ${n} has ${k.length} key points — three at most, or the learner remembers none.` });
      if (k.length && why.length < k.length) out.push({ field: 'steps', say: `Step ${n} has ${plural(k.length, 'key point')} but ${plural(why.length, 'reason')} — each key point has its reason.` });
    });
    const rows = rowsOf(v, 'learners');
    rows.forEach(r => {
      const who = cellText(r, 'name') || 'A learner';
      const taught = cellText(r, 'taught'), signed = cellText(r, 'signed');
      if (cellText(r, 'tryout') === 'passed' && !taught) out.push({ field: 'learners', say: `${who} is signed off but has no day they were taught.` });
      if (cellText(r, 'tryout') === 'passed' && !signed) out.push({ field: 'learners', say: `${who} is signed off with no day — the day is the proof.` });
      if (signed && cellText(r, 'tryout') !== 'passed') out.push({ field: 'learners', say: `${who} has a sign-off day but the try-out is not marked signed off.` });
      if (taught && signed && signed < taught) out.push({ field: 'learners', say: `${who} was signed off before they were taught.` });
      if (taught && taught > ctx.today) out.push({ field: 'learners', say: `${who}’s teaching day has not come yet.` });
    });
    const w = numOf(v, 'without'), h = numOf(v, 'with');
    if (w !== undefined && h !== undefined && h >= w) out.push({ field: 'with', say: 'The breakdown is not shown to be faster: hours with it are not fewer than without. The money is left out.' });
    return out;
  },
  read: (v, ctx) => {
    const steps = rowsOf(v, 'steps');
    const keyN = steps.reduce((a, r) => a + pointsOf(cellText(r, 'keys')).length, 0);
    const safety = steps.filter(r => cellText(r, 'safety') === 'yes').length;
    const t = teachingOf(learnersOf(v), ctx.today);
    const title = textOf(v, 'title') || 'This job';
    const sentence = steps.length
      ? `${title}: ${plural(steps.length, 'step')}, ${plural(keyN, 'key point')}${safety ? ` (${safety} ${safety === 1 ? 'step' : 'steps'} with a safety point)` : ''}${t.trained ? `; ${t.trained} trained, ${t.signedOff} signed off${t.rate !== undefined ? ` (${Math.round(t.rate * 100)}%)` : ''}${t.again ? `, ${t.again} to try again` : ''}${t.waiting ? `, ${t.waiting} not tried out yet` : ''}` : ''}.`
      : '';
    const learners = learnersOf(v);
    const tables: DocTable[] = [];
    /* where a step comes from (13 November): the manual and its page, printed only when a step has one */
    const sourced = steps.some(r => cellText(r, 'from'));
    if (steps.length) tables.push({
      title: 'The breakdown', head: ['#', 'Important step', 'Key points', 'Reasons', ...(sourced ? ['From'] : [])], shares: sourced ? [0.05, 0.23, 0.31, 0.25, 0.16] : [0.05, 0.25, 0.37, 0.33],
      rows: steps.map((r, i) => [String(i + 1), `${cellText(r, 'step')}${cellText(r, 'safety') === 'yes' ? ' (safety)' : ''}`, pointsOf(cellText(r, 'keys')).join('; ') || '—', pointsOf(cellText(r, 'reasons')).join('; ') || '—', ...(sourced ? [cellText(r, 'from') || '—'] : [])]),
    });
    if (learners.length) tables.push({
      title: 'Who has been taught', head: ['Learner', 'Taught', 'Try-out', 'Signed off', 'Re-check at 30 days'], shares: [0.26, 0.17, 0.2, 0.17, 0.2],
      rows: learners.map(l => [l.name, l.taught ? niceDay(l.taught, { year: true }) : '—', l.tryOut ? TRYOUT_WORD(l.tryOut) : '—', l.signed ? niceDay(l.signed, { year: true }) : '—',
        l.signed ? (l.recheck === 'passed' ? 'Still to the standard' : l.recheck === 'failed' ? 'Not to the standard' : addDaysSaid(l.signed, ctx.today)) : '—']),
    });
    const saved = hoursSaved(t.trained, numOf(v, 'without'), numOf(v, 'with'));
    const rate = numOf(v, 'rate');
    const missing: string[] = [];
    let text: string | undefined;
    if (numOf(v, 'without') === undefined || numOf(v, 'with') === undefined) missing.push('Hours to reach the standard with and without the breakdown are not given — add both under “What teaching it well is worth”.');
    else if (!t.trained) missing.push('Nobody is recorded as taught yet — the saving is hours a learner × the learners taught.');
    else if (saved === undefined) { /* with is not fewer — said in the checks */ }
    else if (rate === undefined) missing.push('One person’s £ an hour is not given — add it, or give the line a wage, to put the hours in pounds.');
    else text = `Taught by the breakdown, ${plural(t.trained, 'learner')} reached the standard in ${fmt(numOf(v, 'with') as number, 1)} h instead of ${fmt(numOf(v, 'without') as number, 1)} h: ${fmt(saved, 1)} paid hours × £${fixed(rate, 2)} = ${gbp(saved * rate)}.`;
    return {
      sentence, tone: t.overdue ? 'a' : 'n',
      tiles: [
        { k: 'Steps', v: steps.length ? String(steps.length) : '—', of: `${STEPS_LOW} to ${STEPS_HIGH} usual` },
        { k: 'Key points', v: steps.length ? String(keyN) : '—', of: safety ? `${safety} with a safety point` : 'none marked safety' },
        { k: 'Trained', v: t.trained ? String(t.trained) : '—', of: t.waiting ? `${t.waiting} not tried out yet` : 'taught' },
        { k: 'Signed off', v: t.rate !== undefined ? `${t.signedOff} of ${t.trained}` : '—', of: t.rate !== undefined ? `${Math.round(t.rate * 100)}% after the try-out` : 'after a try-out', ...(t.again ? { tone: 'a' as const } : {}) },
        { k: 'To sign off', v: t.rate !== undefined ? String(t.again + t.waiting) : '—', of: t.again ? `${t.again} to try again` : 'none to try again', ...(t.again ? { tone: 'a' as const } : {}) },
        { k: 'Days to sign off', v: t.days !== undefined ? fmt(t.days, 1) : '—', of: 'taught to signed off, on average' },
        { k: 'Re-checks', v: t.signedOff ? String(t.due + t.overdue) : '—', of: t.overdue ? `${t.overdue} overdue` : t.signedOff ? 'to do, none overdue' : 'at 30 days', ...(t.overdue ? { tone: 'r' as const } : {}) },
      ],
      tables,
      working: t.trained ? [{ label: 'Signed off', value: `${t.signedOff} ÷ ${t.trained} trained = ${fmt((t.signedOff / t.trained) * 100, 1)}%`, note: 'signed off after the try-out, of those taught' }] : [],
      money: text ? { text, figures: [['Paid hours saved', `${fmt(saved as number, 1)} h`], ['At', `£${fixed(rate as number, 2)} an hour`]], missing: [] } : { missing },
      caveats: [
        'Signing off at the presentation, without the try-out, signs off nothing: a person is signed off when they have done it right and said the steps, the key points and the reasons back.',
        'A breakdown is for teaching, not the standard itself: the standard is the line standard or the procedure, and this is taught to it.',
        'Teaching by “watch Dave” passes on Dave’s habits. If the key points were never written, they were never taught.',
        `The hours to standard are as typed from people who learned it each way — not a trial. The saving is paid time, not cash released. The ${RECHECK_DAYS}-day re-check is booked by this page and done by a person.`,
        'A signed-off learner is not yet entered in the skills matrix: the level there is set by the team there.',
      ],
      checks: [],
      closing: sentence ? `${sentence.replace(/\.$/, '')}. ${t.again + t.waiting ? 'Those not yet signed off are the matrix’s learner, not its operator.' : 'Everyone taught is signed off.'}` : 'Break the job into important steps, each with its key points and reasons.',
    };
  },
  examples: [
    {
      name: 'The wrapper’s film splice — six steps, nine key points, nine taught, six signed off',
      source: 'knowledge/methods/people/twi-job-instruction.md worked case; dated and worked in scripts/knowledge/cases-teach.py J1 (9 trained, 6 signed off = 66.7%, days 1,1,2,2,3,5 mean 2.33; 9 × (14 − 8) h × £14.70 = £793.80)',
      values: {
        title: 'Splice the film reel', where: 'Ilapak flow wrapper, Line 3', instructor: 'Sam Patel', without: 14, with: 8, rate: 14.7,
        steps: [
          { id: 'p1', c: { step: 'Stop the wrapper and isolate it', keys: 'Both hands clear before the clamp; isolator locked off', reasons: 'A crushed hand; the machine restarts by itself', safety: 'yes' } },
          { id: 'p2', c: { step: 'Remove the empty core', keys: 'Core off the spindle squarely', reasons: 'A tilted core scratches the spindle' } },
          { id: 'p3', c: { step: 'Cut the leading edge square', keys: 'Cut on the guide line; the cut edge clean', reasons: 'A slanted edge catches on the roller; a ragged edge tears at the splice', safety: 'yes' } },
          { id: 'p4', c: { step: 'Seat the new reel', keys: 'Tension lever at the mark', reasons: 'Too tight breaks the film, too loose wanders' } },
          { id: 'p5', c: { step: 'Join the film to the tail', keys: 'Tape across the full width; no overlap beyond 5 mm', reasons: 'A short tape lets go at speed; overlap jams the former' } },
          { id: 'p6', c: { step: 'Run three packs and check the seal', keys: 'Seal fully closed on all three', reasons: 'A bad splice shows in the first packs, not the tenth' } },
        ],
        learners: [
          { id: 'l1', c: { name: 'Alex', taught: '2026-09-24', tryout: 'passed', signed: '2026-09-25' } },
          { id: 'l2', c: { name: 'Bea', taught: '2026-10-01', tryout: 'passed', signed: '2026-10-02', recheck: 'passed' } },
          { id: 'l3', c: { name: 'Chris', taught: '2026-10-06', tryout: 'passed', signed: '2026-10-08' } },
          { id: 'l4', c: { name: 'Dee', taught: '2026-10-08', tryout: 'passed', signed: '2026-10-10' } },
          { id: 'l5', c: { name: 'Eli', taught: '2026-10-13', tryout: 'passed', signed: '2026-10-16' } },
          { id: 'l6', c: { name: 'Fay', taught: '2026-10-15', tryout: 'passed', signed: '2026-10-20' } },
          { id: 'l7', c: { name: 'Gus', taught: '2026-10-27', tryout: 'again' } },
          { id: 'l8', c: { name: 'Hal', taught: '2026-10-28', tryout: 'again' } },
          { id: 'l9', c: { name: 'Ivy', taught: '2026-10-29', tryout: 'again' } },
        ],
      },
      expect: {
        sentence: 'Splice the film reel: 6 steps, 9 key points (2 steps with a safety point); 9 trained, 6 signed off (67%), 3 to try again.',
        tiles: { 'Filled in': '3 of 3', Steps: '6', 'Key points': '9', Trained: '9', 'Signed off': '6 of 9', 'To sign off': '3', 'Days to sign off': '2.3', 'Re-checks': '5' },
        money: 'Taught by the breakdown, 9 learners reached the standard in 8 h instead of 14 h: 54 paid hours × £14.70 = £793.80.',
        tables: { 'The breakdown': [['1', 'Stop the wrapper and isolate it (safety)', 'Both hands clear before the clamp; isolator locked off', 'A crushed hand; the machine restarts by itself']] },
        needs: [],
      },
    },
    {
      name: 'A breakdown that is really a procedure, and a sign-off with no day',
      source: 'the record: 5–12 steps, 1–3 key points a step, a reason for each; a sign-off without a day is no proof',
      values: {
        title: 'Weekly clean', instructor: 'Sam Patel', without: 6, with: 7,
        steps: [
          { id: 'a', c: { step: 'Wash the hopper', keys: 'Hot water; the corners; behind the guard; under the lip', reasons: 'Residue' } },
          ...Array.from({ length: 12 }, (_, i) => ({ id: `b${i}`, c: { step: `Clean part ${i + 2}`, keys: 'Check it is dry', reasons: 'Wet parts grow' } })),
        ],
        learners: [{ id: 'x', c: { name: 'Jo', tryout: 'passed' } }],
      },
      expect: {
        sentence: 'Weekly clean: 13 steps, 16 key points.',
        tiles: { Steps: '13', 'Key points': '16', Trained: '—' },
        checks: ['13 steps — more than 12 is a procedure', 'Step 1 has 4 key points — three at most', 'Step 1 has 4 key points but 1 reason', 'Jo is signed off but has no day they were taught', 'Jo is signed off with no day', 'hours with it are not fewer than without'],
        needs: [],
      },
    },
    { name: 'A draft — nothing yet', source: 'the shape: a document is saved as typed; the boxes still needed are named', values: {}, expect: { sentence: '', tiles: { 'Filled in': '0 of 3', Steps: '—' }, needs: ['The job', 'Instructor', 'Important steps — at least one step'] } },
  ],
  see: [{ key: 'sop', why: 'the steps with a photo each, to read at the machine' }, { key: 'one-point-lesson', why: 'one fix taught in five minutes' }],
};

function addDaysSaid(signed: string, today: string): string {
  const due = addDays(signed, RECHECK_DAYS);
  const late = daysBetween(due, today);
  return `due ${niceDay(due)}${late > 0 ? ` — ${plural(late, 'day')} overdue` : ''}`;
}

export default jobInstruction;
