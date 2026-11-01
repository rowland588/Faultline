/* TIERED DAILY MEETING (FC-198) — one meeting's record: yesterday by safety, quality, delivery, cost and people, each on or off its target;
 * the actions raised (every red gets an action or the reason there is none), what was escalated to the tier above and whether it was answered,
 * and what closed since the last meeting. The day's update, agreed by the leader, with its paper. Specified in knowledge/specs/FC-198-daily-meeting.md;
 * the method in knowledge/methods/visual/daily-management.md (Mann 2015). The figures are typed from the day's records — they are not yet read
 * from the loss count, the register or the actions. */
import { niceDay } from '../../../lib/weeks';
import { LETTERS, letterWord, ruleOf, unanswered, waitDays, type Raised } from '../figures/meeting';
import { andList, fmt, plural } from '../figures/words';
import { fixed } from '../../calc/format';
import { cellNum, cellText, rowsOf, textOf } from '../doc';
import type { DocDef, DocProblem, DocTable } from '../types';

/** The record: ten minutes at the board — a meeting that runs long has stopped being a stand-up. */
const MINUTES_HIGH = 15;
const TIERS = [
  { value: '1', label: 'Tier 1 — the line' },
  { value: '2', label: 'Tier 2 — the area' },
  { value: '3', label: 'Tier 3 — the site' },
];
const tierWord = (v: string) => TIERS.find(t => t.value === v)?.label ?? '';

const meeting: DocDef = {
  key: 'daily-meeting', fc: 'FC-198', title: 'Tiered daily meeting', noun: 'meeting', group: 'Run the day',
  says: 'Yesterday by safety, quality, delivery, cost and people — what went wrong, who is fixing it by when, and what went up a tier',
  question: 'What went wrong yesterday, who is fixing it, by when?',
  signoff: { word: 'Closed', ready: 'Ready to close', by: 'the leader', ask: 'Close the meeting', back: 'Reopen the meeting' },
  sections: [
    { id: 'meeting', title: 'The meeting', help: 'Which tier, which day, who led it. Ten minutes, standing, at the board.', items: [
      { id: 'tier', kind: 'choice', label: 'Which tier', required: true, options: TIERS },
      { id: 'day', kind: 'date', label: 'The day of the meeting', required: true },
      { id: 'where', kind: 'text', label: 'Line or area', example: 'Line 3, packing', offer: ctx => (ctx.lineName ? { value: ctx.lineName, words: `${ctx.lineName} — this document’s line` } : undefined) },
      { id: 'leader', kind: 'person', label: 'Led by', required: true },
      { id: 'present', kind: 'long', label: 'Who was there', example: 'Sam (leader), Priya (QA), the two setters, the fitter', help: 'Names or roles.' },
      { id: 'minutes', kind: 'number', label: 'How long it ran', min: 0, unit: 'min', help: 'About ten.' },
    ] },
    { id: 'letters', title: 'Yesterday, by letter', help: 'Each letter on target or off, in words and, where there is a number, the number against its target — so a green that is really a red is caught.', items: [
      { id: 'letters', kind: 'list', label: 'The letters', rowWord: 'letter', required: true, min: 1, help: 'Safety, quality, delivery, cost, people. Off target is red; on target is green. “Delivery 410 of 480” is a figure; “Safety: no accidents” is words.', columns: [
        { id: 'letter', kind: 'choice', label: 'Letter', required: true, options: LETTERS },
        { id: 'status', kind: 'choice', label: 'Yesterday was', required: true, options: [{ value: 'green', label: 'On target' }, { value: 'red', label: 'Off target' }] },
        { id: 'what', kind: 'long', label: 'What happened', example: 'Film change ran 40 minutes over; sealer jaw failed at 11:00', help: 'In words, with the cause if it is known.' },
        { id: 'actual', kind: 'number', label: 'Actual', help: 'The figure: packs made, rejects, £ lost, accidents, people short.' },
        { id: 'target', kind: 'number', label: 'Target or limit' },
        { id: 'dir', kind: 'choice', label: 'The target is', options: [{ value: 'atleast', label: 'At least' }, { value: 'atmost', label: 'At most' }] },
      ] },
    ] },
    { id: 'actions', title: 'The actions raised', help: 'Every red gets an action — or the reason there is none. An action has one name and one day.', items: [
      { id: 'actions', kind: 'list', label: 'Actions', rowWord: 'action', help: 'Raised at this meeting.', columns: [
        { id: 'letter', kind: 'choice', label: 'For letter', required: true, options: LETTERS },
        { id: 'type', kind: 'choice', label: 'It is', required: true, options: [{ value: 'do', label: 'An action' }, { value: 'why', label: 'The reason there is none' }] },
        { id: 'what', kind: 'long', label: 'What', required: true, example: 'Find the jaw’s root cause' },
        { id: 'who', kind: 'person', label: 'Who' },
        { id: 'due', kind: 'date', label: 'By when' },
      ] },
      { id: 'closed', kind: 'number', label: 'Actions closed since the last meeting', min: 0, integer: true },
      { id: 'carried', kind: 'number', label: 'Actions still open from before', min: 0, integer: true },
    ] },
    { id: 'escalated', title: 'Escalated to the tier above', help: 'What this tier cannot fix goes up the same morning, and the tier above answers the same day.', items: [
      { id: 'escalated', kind: 'list', label: 'Escalations', rowWord: 'escalation', columns: [
        { id: 'what', kind: 'long', label: 'What', required: true, example: 'Sealer jaw — the third failure this month' },
        { id: 'raised', kind: 'date', label: 'Raised on' },
        { id: 'answer', kind: 'choice', label: 'Answered?', options: [{ value: 'waiting', label: 'Waiting' }, { value: 'answered', label: 'Answered' }] },
        { id: 'answeredOn', kind: 'date', label: 'Answered on' },
        { id: 'reply', kind: 'text', label: 'The answer' },
      ] },
    ] },
  ],
  check: (v, ctx): DocProblem[] => {
    const out: DocProblem[] = [];
    const m = cellNumOf(v);
    if (m !== undefined && m > MINUTES_HIGH) out.push({ field: 'minutes', say: `${fmt(m, 0)} minutes — a tiered meeting is about ten, standing at the board; longer reports and does not act.` });
    const day = textOf(v, 'day');
    if (day && day > ctx.today) out.push({ field: 'day', say: 'The day of the meeting has not come yet.' });
    const seen = new Set<string>();
    for (const r of rowsOf(v, 'letters')) {
      const l = cellText(r, 'letter');
      if (seen.has(l)) out.push({ field: 'letters', say: `${letterWord(l)} appears twice — one row a letter.` });
      seen.add(l);
      const rule = ruleOf(cellNum(r, 'actual'), cellNum(r, 'target'), cellText(r, 'dir'));
      const st = cellText(r, 'status');
      if (rule === 'off' && st === 'green') out.push({ field: 'letters', say: `${letterWord(l)} is marked on target but ${fmt(cellNum(r, 'actual') as number, 2)} is ${cellText(r, 'dir') === 'atleast' ? 'under' : 'over'} the ${fmt(cellNum(r, 'target') as number, 2)} it should be ${cellText(r, 'dir') === 'atleast' ? 'at least' : 'at most'}.` });
      if (rule === 'met' && st === 'red') out.push({ field: 'letters', say: `${letterWord(l)} is marked off target but ${fmt(cellNum(r, 'actual') as number, 2)} meets its ${fmt(cellNum(r, 'target') as number, 2)}.` });
    }
    const raised = raisedOf(v);
    const reds = redsOf(v);
    for (const l of unanswered(reds, raised)) out.push({ field: 'actions', say: `${letterWord(l)} is off target with no action and no reason — every red gets an action or the reason there is none.` });
    for (const r of rowsOf(v, 'actions')) if (cellText(r, 'type') === 'do' && !cellText(r, 'who')) out.push({ field: 'actions', say: `“${cellText(r, 'what').slice(0, 40)}” has no name — an action without one person is nobody’s.` });
    else if (cellText(r, 'type') === 'do' && !cellText(r, 'due')) out.push({ field: 'actions', say: `“${cellText(r, 'what').slice(0, 40)}” has no day.` });
    const rows = rowsOf(v, 'escalated');
    if (rows.length && textOf(v, 'tier') === '3') out.push({ field: 'escalated', say: 'Tier 3 is the top of the ladder — nothing goes above it. Make it an action here.' });
    rows.forEach(r => {
      const raisedOn = cellText(r, 'raised'), ans = cellText(r, 'answer'), on = cellText(r, 'answeredOn');
      if (ans === 'answered' && !on) out.push({ field: 'escalated', say: `“${cellText(r, 'what').slice(0, 40)}” is answered but has no day.` });
      if (raisedOn && ans !== 'answered') {
        const w = waitDays(raisedOn, undefined, ctx.today);
        if (w >= 1) out.push({ field: 'escalated', say: `“${cellText(r, 'what').slice(0, 40)}” has waited ${plural(w, 'day')} for an answer — the tier above answers the same day; no answer teaches the floor not to escalate.` });
      }
    });
    return out;
  },
  read: (v, ctx) => {
    const letters = rowsOf(v, 'letters');
    const reds = redsOf(v);
    const raised = raisedOf(v);
    const open = unanswered(reds, raised);
    const acts = rowsOf(v, 'actions').filter(r => cellText(r, 'type') !== 'why');
    const esc = rowsOf(v, 'escalated');
    const waiting = esc.filter(r => cellText(r, 'answer') !== 'answered');
    const tier = tierWord(textOf(v, 'tier')), day = textOf(v, 'day'), where = textOf(v, 'where');
    const head = [tier.split(' — ')[0], where, day ? niceDay(day) : ''].filter(Boolean).join(' · ');
    const nLetters = new Set(letters.map(r => cellText(r, 'letter'))).size;
    const sentence = letters.length
      ? `${head ? `${head}: ` : ''}${plural(nLetters, 'letter')} read, ${reds.length ? `${reds.length} off target (${andList(reds.map(letterWord))})` : 'none off target'}, ${plural(acts.length, 'action')} raised${reds.length ? (open.length ? `, ${plural(open.length, 'red')} with no action` : ', every red with an action') : ''}${esc.length ? `, ${esc.length} escalated${waiting.length ? ` (${waiting.length} waiting for an answer)` : ' and answered'}` : ''}.`
      : '';
    const table: DocTable[] = letters.length ? [{
      title: 'Yesterday, by letter', head: ['Letter', 'Was', 'What happened', 'Actual', 'Target', 'Rule'], shares: [0.12, 0.12, 0.38, 0.12, 0.13, 0.13],
      rows: letters.map(r => {
        const rule = ruleOf(cellNum(r, 'actual'), cellNum(r, 'target'), cellText(r, 'dir'));
        return [letterWord(cellText(r, 'letter')), cellText(r, 'status') === 'red' ? 'Off target' : cellText(r, 'status') === 'green' ? 'On target' : '—', cellText(r, 'what') || '—',
          cellNum(r, 'actual') !== undefined ? fmt(cellNum(r, 'actual') as number, 2) : '—',
          cellNum(r, 'target') !== undefined ? `${cellText(r, 'dir') === 'atleast' ? '≥ ' : cellText(r, 'dir') === 'atmost' ? '≤ ' : ''}${fmt(cellNum(r, 'target') as number, 2)}` : '—',
          rule === 'met' ? 'met' : rule === 'off' ? 'not met' : '—'];
      }),
    }] : [];
    if (rowsOf(v, 'actions').length) table.push({
      title: 'The actions raised', head: ['Letter', 'It is', 'What', 'Who', 'By when'], shares: [0.12, 0.18, 0.4, 0.15, 0.15],
      rows: rowsOf(v, 'actions').map(r => [letterWord(cellText(r, 'letter')), cellText(r, 'type') === 'why' ? 'Reason for none' : 'Action', cellText(r, 'what'), cellText(r, 'who') || '—', cellText(r, 'due') ? niceDay(cellText(r, 'due'), { year: true }) : '—']),
    });
    if (esc.length) table.push({
      title: 'Escalated', head: ['What', 'Raised', 'Answered', 'The answer'], shares: [0.4, 0.17, 0.18, 0.25],
      rows: esc.map(r => [cellText(r, 'what'), cellText(r, 'raised') ? niceDay(cellText(r, 'raised'), { year: true }) : '—', cellText(r, 'answer') === 'answered' ? (cellText(r, 'answeredOn') ? niceDay(cellText(r, 'answeredOn'), { year: true }) : 'yes') : 'waiting', cellText(r, 'reply') || '—']),
    });
    const cost = letters.find(r => cellText(r, 'letter') === 'C');
    const lost = cost ? cellNum(cost, 'actual') : undefined, limit = cost ? cellNum(cost, 'target') : undefined;
    const money = lost !== undefined
      ? { text: `Yesterday’s losses on the cost letter: £${fixed(lost, 2)}${limit !== undefined ? `, ${lost > limit ? `£${fixed(lost - limit, 2)} over` : `inside`} the £${fixed(limit, 2)} a day it may lose` : ''}.`, figures: [['Lost yesterday', `£${fixed(lost, 2)}`]] as [string, string][], missing: [] }
      : { missing: [cost ? 'The cost letter has no figure — type yesterday’s £ lost (from the loss count) in its Actual box to put the day in pounds.' : 'The cost letter is not on the list — add a Cost row with yesterday’s £ lost (from the loss count) to put the day in pounds.'] };
    return {
      sentence, tone: open.length || waiting.some(r => cellText(r, 'raised') && waitDays(cellText(r, 'raised'), undefined, ctx.today) >= 1) ? 'a' : 'n',
      tiles: [
        { k: 'Letters read', v: letters.length ? `${nLetters} of 5` : '—', of: 'safety, quality, delivery, cost, people' },
        { k: 'Off target', v: letters.length ? String(reds.length) : '—', of: reds.length ? andList(reds.map(letterWord)) : 'none', ...(reds.length ? { tone: 'r' as const } : {}) },
        { k: 'Actions raised', v: letters.length ? String(acts.length) : '—', of: 'this meeting' },
        { k: 'Reds answered', v: reds.length ? `${reds.length - open.length} of ${reds.length}` : letters.length ? 'no reds' : '—', of: open.length ? `${open.length} with no action` : reds.length ? 'every red has an action or a reason' : 'nothing to answer', ...(open.length ? { tone: 'a' as const } : {}) },
        { k: 'Escalated', v: esc.length ? String(esc.length) : letters.length ? '0' : '—', of: esc.length ? `${waiting.length} waiting for an answer` : 'nothing went up', ...(waiting.length ? { tone: 'a' as const } : {}) },
        { k: 'Closed since last', v: numOrDash(v, 'closed'), of: numOf2(v, 'carried') !== undefined ? `${numOf2(v, 'carried')} still open from before` : 'actions closed' },
      ],
      tables: table,
      working: reds.length ? [{ label: 'Reds answered', value: `${reds.length - open.length} of ${reds.length} off-target letters have an action or a reason`, note: 'every red gets an action, or the reason there is none' }] : [],
      money,
      caveats: [
        'The figures are typed from the day’s records; this page does not read the loss count, the register or the actions, so it can disagree with them.',
        'A meeting that reports without acting decays into a reading of yesterday’s numbers: the test is the actions with a name and a day, not the colours.',
        'On target or off target is the team’s call against the target typed; the rule column only catches a figure that contradicts the colour.',
        'The hour-by-hour board and the meetings’ adherence (held ÷ scheduled) are not here.',
      ],
      checks: [],
      closing: sentence ? `${sentence.replace(/\.$/, '')}. ${open.length ? 'Every red still needs an action or the reason there is none.' : 'Actions have a name and a day: the next meeting starts from them.'}` : 'Read each letter for yesterday, then raise an action for every red.',
    };
  },
  examples: [
    {
      name: 'A tier 1 meeting at the line — the hour-by-hour shift of 3,535 of 3,840 and a failed sealer jaw',
      source: 'knowledge/methods/visual/daily-management.md worked case (plan 480 an hour; 3,535 of 3,840 = 92%, gap 305, the jaw hour 180 = 59%); the 95% of plan rule: 3,840 × 0.95 = 3,648 — worked in scripts/knowledge/cases-teach.py M1',
      values: {
        tier: '1', day: '2026-10-30', where: 'Line 3 packing', leader: 'Sam Patel', minutes: 10, closed: 2, carried: 5,
        letters: [
          { id: 'l1', c: { letter: 'S', status: 'green', what: 'No accidents or near misses', actual: 0, target: 0, dir: 'atmost' } },
          { id: 'l2', c: { letter: 'Q', status: 'green', what: 'Rejects 1.2% of packs', actual: 1.2, target: 2, dir: 'atmost' } },
          { id: 'l3', c: { letter: 'D', status: 'red', what: 'Made 3,535 of 3,840; the sealer jaw hour lost 180', actual: 3535, target: 3648, dir: 'atleast' } },
          { id: 'l4', c: { letter: 'C', status: 'red', what: 'Downtime and rework', actual: 1250, target: 1000, dir: 'atmost' } },
          { id: 'l5', c: { letter: 'P', status: 'green', what: 'Crew complete', actual: 0, target: 0, dir: 'atmost' } },
        ],
        actions: [
          { id: 'a1', c: { letter: 'D', type: 'do', what: 'Find the sealer jaw’s root cause', who: 'Engineering lead', due: '2026-11-06' } },
          { id: 'a2', c: { letter: 'D', type: 'do', what: 'SMED on the film change', who: 'Priya Shah', due: '2026-11-13' } },
          { id: 'a3', c: { letter: 'C', type: 'why', what: 'Cost follows the jaw’s downtime; no separate action' } },
        ],
        escalated: [{ id: 'e1', c: { what: 'Sealer jaw — the third failure this month', raised: '2026-10-30', answer: 'waiting' } }],
      },
      expect: {
        sentence: 'Tier 1 · Line 3 packing · 30 Oct: 5 letters read, 2 off target (Delivery and Cost), 2 actions raised, every red with an action, 1 escalated (1 waiting for an answer).',
        tiles: { 'Filled in': '4 of 4', 'Letters read': '5 of 5', 'Off target': '2', 'Actions raised': '2', 'Reds answered': '2 of 2', Escalated: '1', 'Closed since last': '2' },
        money: 'Yesterday’s losses on the cost letter: £1,250.00, £250.00 over the £1,000.00 a day it may lose.',
        tables: { 'Yesterday, by letter': [['Safety', 'On target', 'No accidents or near misses', '0', '≤ 0', 'met'], ['Quality', 'On target', 'Rejects 1.2% of packs', '1.2', '≤ 2', 'met'], ['Delivery', 'Off target', 'Made 3,535 of 3,840; the sealer jaw hour lost 180', '3,535', '≥ 3,648', 'not met']] },
        checks: ['has waited 2 days for an answer'],
        needs: [],
      },
    },
    {
      name: 'A green that is really a red, a red with no action, an action with no name, and a tier 3 meeting that escalates',
      source: 'the record’s misuse list: every red gets an action or a reason; escalation without a reply; tier 3 is the top; 410 is under the 456 (95% of 480)',
      values: {
        tier: '3', day: '2026-11-01', leader: 'Sam Patel', minutes: 25,
        letters: [
          { id: 'a', c: { letter: 'S', status: 'red', what: 'A near miss at the slicer' } },
          { id: 'b', c: { letter: 'D', status: 'green', actual: 410, target: 456, dir: 'atleast' } },
          { id: 'c', c: { letter: 'S', status: 'green' } },
        ],
        actions: [{ id: 'x', c: { letter: 'D', type: 'do', what: 'Chase the film supplier' } }],
        escalated: [{ id: 'y', c: { what: 'Line stop policy' } }],
      },
      expect: {
        sentence: 'Tier 3 · 1 Nov: 2 letters read, 1 off target (Safety), 1 action raised, 1 red with no action, 1 escalated (1 waiting for an answer).',
        tiles: { 'Letters read': '2 of 5', 'Off target': '1', 'Reds answered': '0 of 1' },
        checks: ['Delivery is marked on target but 410 is under the 456 it should be at least', 'Safety appears twice', 'Safety is off target with no action and no reason', '“Chase the film supplier” has no name', 'Tier 3 is the top of the ladder', '25 minutes'],
        needs: [],
      },
    },
    { name: 'A draft — nothing yet', source: 'the shape: a document is saved as typed; the boxes still needed are named', values: {}, expect: { sentence: '', tiles: { 'Filled in': '0 of 4', 'Letters read': '—' }, needs: ['Which tier', 'The day of the meeting', 'Led by', 'The letters — at least one letter'] } },
  ],
  see: [],
};

function cellNumOf(v: Parameters<DocDef['read']>[0]): number | undefined { return typeof v.minutes === 'number' ? v.minutes : undefined; }
function numOf2(v: Parameters<DocDef['read']>[0], id: string): number | undefined { return typeof v[id] === 'number' ? (v[id] as number) : undefined; }
function numOrDash(v: Parameters<DocDef['read']>[0], id: string): string { const n = numOf2(v, id); return n === undefined ? '—' : String(n); }
function redsOf(v: Parameters<DocDef['read']>[0]): string[] { return rowsOf(v, 'letters').filter(r => cellText(r, 'status') === 'red').map(r => cellText(r, 'letter')).filter((l, i, a) => a.indexOf(l) === i); }
function raisedOf(v: Parameters<DocDef['read']>[0]): Raised[] { return rowsOf(v, 'actions').map(r => ({ letter: cellText(r, 'letter'), type: cellText(r, 'type') === 'why' ? 'why' as const : 'do' as const })); }

export default meeting;
