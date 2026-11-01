/* 8D REPORT (FC-150) — the structured report for a significant problem, usually a customer's complaint or an incident: the eight disciplines
 * D0 to D8, each with its evidence, owner and date; the elapsed days from D0 to each; the containment in money; the way the problem has
 * stayed away since the fix. It READS what the project already holds — the register's problems, the causes on the fishbone, the project's
 * actions, the studies — and types only what no record holds (the team, the is / is-not, the containment, how the cause was verified, what
 * was changed in the system); the page says which is which. Specified in knowledge/specs/FC-150-eight-d-report.md; the method in
 * knowledge/methods/rca/eight-d.md (Ford TOPS 1987; the automotive practice; Rambaud 2011 — from knowledge, texts not read). */
import { daysBetween, niceDay } from '../../../lib/weeks';
import { andList, brief, fmt, gbp, lowerFirst, plural } from '../figures/words';
import { WEAK_CAUSE, elapsed, expectedWithout, heldValue, sortingCost } from '../figures/eightd';
import { cellText, numOf, offerAnswer, rowsOf, textOf } from '../doc';
import type { DocDef, DocProblem, DocTable } from '../types';

const DIMS = [{ value: 'what', label: 'What' }, { value: 'where', label: 'Where' }, { value: 'when', label: 'When' }, { value: 'howmuch', label: 'How much' }];
const PREVENT = [
  { value: 'fmea', label: 'FMEA rating changed' }, { value: 'plan', label: 'Control plan check added' }, { value: 'standard', label: 'Standard or SOP rewritten' },
  { value: 'lines', label: 'Offered to the other lines' }, { value: 'poka', label: 'Mistake-proofing fitted' }, { value: 'training', label: 'Training only' },
];
const label = (list: { value: string; label: string }[], v: string) => list.find(x => x.value === v)?.label ?? v;
const STATE = { todo: 'to do', waiting: 'waiting', done: 'done' } as const;

const eightD: DocDef = {
  key: 'eight-d', fc: 'FC-150', title: '8D report', noun: '8D report', group: 'Problem solving',
  says: 'The corrective-action report a customer asks for — D0 to D8, each with its evidence, owner and day — read from the project’s own records where they hold it',
  question: 'What did we contain, what is the root cause, and how do we stop it coming back?',
  reads: 'This 8D report is not on a project, so nothing is read from the register, the fishbone, the actions or the studies — type D4 to D7 here, or start it inside the project.',
  signoff: { word: 'Closed', ready: 'Ready to close', by: 'the lead', ask: 'Close the 8D report', back: 'Reopen the 8D report' },
  sections: [
    { id: 'd0', title: 'D0 · The symptom and the emergency response', help: 'What happened, and what was done at once.', items: [
      { id: 'raisedOn', kind: 'date', label: 'The day it was raised', required: true, help: 'D0 — every elapsed day below is counted from it.' },
      { id: 'source', kind: 'choice', label: 'Where it came from', required: true, options: [{ value: 'complaint', label: 'Customer complaint' }, { value: 'internal', label: 'Found inside' }, { value: 'audit', label: 'Audit finding' }, { value: 'incident', label: 'Incident' }] },
      { id: 'ref', kind: 'text', label: 'Complaint or incident reference', example: 'Retailer CAR 4471', help: 'The customer’s own number, so the report can be matched to their request.' },
      { id: 'symptom', kind: 'long', label: 'What happened', offer: ctx => offerAnswer(ctx, ['eight-d:symptom'], 'the 8D method’s sheet'), required: true, example: 'Leaking seals on lane 3 trays, found by the customer on delivery', help: 'The symptom as seen, in plain words.' },
      { id: 'response', kind: 'long', label: 'The emergency response', offer: ctx => offerAnswer(ctx, ['eight-d:response'], 'the 8D method’s sheet'), required: true, example: 'Lane 3 stopped; the last two pallets held', help: 'What was done in the first hours to protect the customer and stop more being made.' },
    ] },
    { id: 'd1', title: 'D1 · The team', help: 'Typed — the project’s members are not kept on the device.', items: [
      { id: 'leader', kind: 'person', label: 'Team leader', required: true, offer: ctx => (ctx.lead ? { value: ctx.lead, words: `${ctx.lead} — the project’s lead` } : undefined) },
      { id: 'champion', kind: 'person', label: 'Champion', help: 'The manager who clears the way.' },
      { id: 'team', kind: 'list', label: 'Team members', rowWord: 'member', help: 'A person from each place the problem touches.', columns: [
        { id: 'name', kind: 'person', label: 'Name', required: true }, { id: 'role', kind: 'text', label: 'Role or function', example: 'Maintenance' },
      ] },
    ] },
    { id: 'd2', title: 'D2 · The problem described', help: 'Is and is not — what, where, when, how much. Typed here; where the project holds an Is / is not page its lines are shown beside, read from it.', items: [
      { id: 'problem', kind: 'long', label: 'The problem, in one statement', required: true, example: 'Seals on lane 3, from 12 October, 4% of trays leaking', help: 'Drawn from the rows below.' },
      { id: 'isnot', kind: 'list', label: 'Is and is not', rowWord: 'row', required: true, help: 'One row each for what, where, when and how much. What it is NOT is what points at the cause.', columns: [
        { id: 'dim', kind: 'choice', label: 'About', required: true, options: DIMS },
        { id: 'is', kind: 'text', label: 'It is', required: true, example: 'Lane 3, new jaw' },
        { id: 'isnot', kind: 'text', label: 'It is not', example: 'Lanes 1, 2 and 4' },
      ] },
      { id: 'problemPhotos', kind: 'photos', label: 'Photos of the problem', help: 'The leaking seal, the label, the pallet — what the customer saw.' },
    ] },
    { id: 'd3', title: 'D3 · Interim containment', help: 'Protects the customer; fixes nothing. Typed: the hold is not a tool yet.', items: [
      { id: 'containment', kind: 'list', label: 'Containment actions', rowWord: 'action', required: true, help: 'Product held, sorted, recalled or reworked — and who did it, when.', columns: [
        { id: 'action', kind: 'text', label: 'Action', required: true, example: 'Hold and sort the 14 pallets on site' },
        { id: 'owner', kind: 'person', label: 'Owner' },
        { id: 'date', kind: 'date', label: 'Done on' },
        { id: 'checked', kind: 'choice', label: 'Checked that it works', options: [{ value: 'yes', label: 'Yes' }, { value: 'notyet', label: 'Not yet' }] },
      ] },
      { id: 'containmentCheck', kind: 'long', label: 'How it was checked that nothing more escaped', required: true, example: 'Every held tray leak-tested; the next three days’ output sampled 50 an hour', help: 'The checks on the held product and on what reached the customer after.' },
      { id: 'heldUnits', kind: 'number', label: 'Units held', min: 0, unit: 'units', help: 'Money — optional. Packs, trays or cases held, counted.' },
      { id: 'unitCost', kind: 'number', label: 'What one held unit has cost so far', min: 0, unit: '£', offer: ctx => (ctx.materialsPerPack ? { value: ctx.materialsPerPack, words: `£${fmt(ctx.materialsPerPack, 2)} — ${ctx.lineName ?? 'the line'}’s materials for a pack` } : undefined), help: 'Money — optional. Said as money tied up, never as a loss.' },
      { id: 'sortHours', kind: 'number', label: 'Hours of sorting or rework', min: 0, unit: 'hours', help: 'Money — optional. People-hours, all together.' },
      { id: 'rate', kind: 'number', label: 'One person’s £ an hour', min: 0, unit: '£ an hour', offer: ctx => (ctx.labourPerHour ? { value: Math.round(ctx.labourPerHour * 100) / 100, words: `£${fmt(ctx.labourPerHour, 2)} an hour — ${ctx.lineName ?? 'the line'}’s wage with on-costs` } : undefined), help: 'Money — optional. The line’s own is offered when it has one.' },
    ] },
    { id: 'd4', title: 'D4 · Root cause and escape point', help: 'Why it happened, and why it was not caught — verified, turned on and off. The project’s fishbone is read below.', items: [
      { id: 'rootCause', kind: 'long', label: 'The root cause', offer: ctx => offerAnswer(ctx, ['eight-d:why'], 'the 8D method’s sheet'), required: true, example: 'The new jaw’s heater reads 12 °C low', help: 'A system cause. “Operator error” is a reason to look again.' },
      { id: 'verifiedHow', kind: 'long', label: 'How it was verified', offer: ctx => offerAnswer(ctx, ['eight-d:verified'], 'the 8D method’s sheet'), required: true, example: 'Swapped the jaw to lane 2 and the leaks moved with it', help: 'The cause turned on reproduces the problem and turned off removes it — or the stratification shows it only where the cause is.' },
      { id: 'verifiedOn', kind: 'date', label: 'The day it was verified', required: true },
      { id: 'escape', kind: 'long', label: 'The escape point', offer: ctx => offerAnswer(ctx, ['eight-d:escape'], 'the 8D method’s sheet'), required: true, example: 'No heater check at jaw change; the end-of-line leak test samples 1 in 200', help: 'Why the checks did not catch it. Half of D4, and usually skipped.' },
    ] },
    { id: 'd5', title: 'D5 · The permanent corrective action', help: 'Chosen and shown to work. The project’s actions are read below.', items: [
      { id: 'chosen', kind: 'long', label: 'The corrective action chosen, and why it will work', required: true, example: 'A heater calibration check at every jaw change', help: 'The permanent fix, not the containment.' },
      { id: 'chosenOn', kind: 'date', label: 'The day it was chosen', required: true },
    ] },
    { id: 'd6', title: 'D6 · Implemented and validated', help: 'Put in, and proved on the number. The project’s studies are read below.', items: [
      { id: 'implementedOn', kind: 'date', label: 'The day it was in place', required: true },
      { id: 'validation', kind: 'long', label: 'How it was validated', required: true, example: 'Leak rate on lane 3 from 4% to 0 over six weeks (the capability study)', help: 'Before → after on the number, and the time without recurrence.' },
      { id: 'oldPerWeek', kind: 'number', label: 'Events a week before the fix', min: 0, help: 'Optional — leakers, complaints, rejects a week as it was.' },
      { id: 'weeksHeld', kind: 'number', label: 'Weeks since the fix', min: 0, unit: 'weeks', help: 'Optional.' },
      { id: 'eventsSince', kind: 'number', label: 'Events since the fix', integer: true, min: 0, help: 'Optional — counted, not remembered.' },
    ] },
    { id: 'd7', title: 'D7 · Preventing recurrence', help: 'The system changed — not “retrained”. Typed: the FMEA and the control plan are not built yet.', items: [
      { id: 'prevent', kind: 'list', label: 'What was changed in the system', rowWord: 'change', required: true, help: 'The FMEA, the control plan, the standard, the other lines.', columns: [
        { id: 'kind', kind: 'choice', label: 'Kind', required: true, options: PREVENT },
        { id: 'what', kind: 'text', label: 'What was changed', required: true, example: 'Detection rating on “seal temperature” changed from 6 to 3' },
        { id: 'owner', kind: 'person', label: 'Owner' },
        { id: 'date', kind: 'date', label: 'Done on' },
      ] },
    ] },
    { id: 'd8', title: 'D8 · Closure', help: 'Evidence for each discipline; the team recognised; the report sent.', items: [
      { id: 'closedOn', kind: 'date', label: 'The day it was closed', required: true },
      { id: 'recognition', kind: 'long', label: 'How the team was recognised', example: 'Thanked at the Monday meeting; the jaw-change check named after the team', help: 'Optional.' },
    ] },
    { id: 'cost', title: 'What the problem costs', help: 'Optional, in money, from the tool that measured it — never a figure made up for the report.', items: [
      { id: 'problemCost', kind: 'number', label: 'What the problem cost', min: 0, unit: '£', help: 'As the tool that measured it says — the problem’s money line, a complaint cost, the loss count.' },
      { id: 'problemCostFrom', kind: 'text', label: 'Which tool or record said so', example: 'Complaints per million, October', help: 'Name it, so the customer can ask.' },
    ] },
  ],
  check: (v, ctx): DocProblem[] => {
    const out: DocProblem[] = [];
    const raised = textOf(v, 'raisedOn');
    const dates: [string, string][] = [
      ['D3', rowsOf(v, 'containment').map(r => cellText(r, 'date')).filter(Boolean).sort()[0] ?? ''], ['D4', textOf(v, 'verifiedOn')], ['D5', textOf(v, 'chosenOn')],
      ['D6', textOf(v, 'implementedOn')], ['D7', rowsOf(v, 'prevent').map(r => cellText(r, 'date')).filter(Boolean).sort().slice(-1)[0] ?? ''], ['D8', textOf(v, 'closedOn')],
    ];
    const given = dates.filter(([, d]) => d);
    for (const [k, d] of given) if (raised && d < raised) out.push({ say: `${k} (${niceDay(d, { year: true })}) is before the day it was raised.` });
    given.forEach(([k, d], i) => { const prev = given[i - 1]; if (prev && d < prev[1] && k !== 'D7') out.push({ say: `${k} (${niceDay(d, { year: true })}) is before ${prev[0]} (${niceDay(prev[1], { year: true })}) — the disciplines run in order.` }); });
    const dims = new Set(rowsOf(v, 'isnot').map(r => cellText(r, 'dim')));
    const lacking = DIMS.filter(d => !dims.has(d.value));
    if (rowsOf(v, 'isnot').length && lacking.length) out.push({ field: 'isnot', say: `D2 has no row for ${andList(lacking.map(d => `“${d.label.toLowerCase()}”`))} — is / is not asks all four.` });
    if (WEAK_CAUSE.test(textOf(v, 'rootCause'))) out.push({ field: 'rootCause', say: 'A root cause of “operator error” is the signature of a closed complaint, not a solved problem — the system cause is required.' });
    const prevent = rowsOf(v, 'prevent');
    if (prevent.length && prevent.every(r => cellText(r, 'kind') === 'training')) out.push({ field: 'prevent', say: 'D7 is training only — retraining is not a change to the system; the FMEA, the control plan or the standard must change.' });
    for (const r of rowsOf(v, 'containment')) if (cellText(r, 'checked') === 'notyet') out.push({ field: 'containment', say: `Containment “${cellText(r, 'action')}” is not yet checked as working.` });
    const wk = numOf(v, 'weeksHeld'), impl = textOf(v, 'implementedOn');
    if (wk !== undefined && impl) {
      const end = textOf(v, 'closedOn') || ctx.today, days = daysBetween(impl, end);
      if (wk * 7 > days + 0.5) out.push({ field: 'weeksHeld', say: `${fmt(wk, 1)} weeks since the fix runs past ${textOf(v, 'closedOn') ? 'the day it was closed' : 'today'}: only ${fmt(days / 7, 1)} weeks have passed since ${niceDay(impl, { year: true })}.` });
    }
    if (numOf(v, 'problemCost') !== undefined && !textOf(v, 'problemCostFrom')) out.push({ field: 'problemCostFrom', say: `Say which tool or record put ${gbp(numOf(v, 'problemCost') as number)} on the problem.` });
    return out;
  },
  read: (v, ctx) => {
    const raised = textOf(v, 'raisedOn');
    const containment = rowsOf(v, 'containment'), prevent = rowsOf(v, 'prevent');
    const held = numOf(v, 'heldUnits'), unit = numOf(v, 'unitCost'), hours = numOf(v, 'sortHours');
    const rate = numOf(v, 'rate') ?? ctx.labourPerHour;
    const tied = held !== undefined && unit !== undefined ? heldValue(held, unit) : undefined;
    const sort = hours !== undefined && rate !== undefined ? sortingCost(hours, rate) : undefined;
    const old = numOf(v, 'oldPerWeek'), wk = numOf(v, 'weeksHeld'), ev = numOf(v, 'eventsSince');
    const exp = old !== undefined && wk !== undefined ? expectedWithout(old, wk) : undefined;
    const day = (d: string) => (raised && d ? elapsed(raised, d) : undefined);
    const earliest = containment.map(r => cellText(r, 'date')).filter(Boolean).sort()[0] ?? '';
    const latest = prevent.map(r => cellText(r, 'date')).filter(Boolean).sort().slice(-1)[0] ?? '';
    const closed = textOf(v, 'closedOn');
    const closedDay = day(closed);

    const parts: string[] = [];
    if (held !== undefined) parts.push(`D3 held ${fmt(held, 0)} units${tied !== undefined ? ` (${gbp(tied)} tied up)` : ''}`); else if (containment.length) parts.push(`D3 ${plural(containment.length, 'containment action')}`);
    if (textOf(v, 'rootCause')) parts.push(`D4 root cause: ${brief(textOf(v, 'rootCause'))}${textOf(v, 'verifiedHow') ? ` (verified: ${lowerFirst(brief(textOf(v, 'verifiedHow'), 90))})` : ''}`);
    if (wk !== undefined && ev !== undefined) parts.push(`D6: ${fmt(ev, 0)} in ${fmt(wk, 1)} weeks${exp !== undefined ? ` against about ${fmt(exp, 0)} expected` : ''}`);
    if (prevent.length) parts.push(`D7: ${andList([...new Set(prevent.map(r => lowerFirst(label(PREVENT, cellText(r, 'kind')))))])}`);
    const sentence = parts.length ? `${parts.join('; ')}.${closedDay !== undefined ? ` Closed day ${closedDay}.` : ''}` : '';

    const timeline: [string, string, string][] = [
      ['D0 Raised', raised, ''], ['D3 Contained', earliest, 'within a day'], ['D4 Root cause verified', textOf(v, 'verifiedOn'), 'within two weeks'],
      ['D5 Action chosen', textOf(v, 'chosenOn'), ''], ['D6 Implemented', textOf(v, 'implementedOn'), ''], ['D7 Prevention in place', latest, ''], ['D8 Closed', closed, '30 to 60 days'],
    ];
    const tables: DocTable[] = [];
    const dated = timeline.filter(([, d]) => d);
    if (dated.length) tables.push({ title: 'How long each discipline took', head: ['Discipline', 'Done on', 'Days from D0', 'A usual expectation'], shares: [0.34, 0.22, 0.18, 0.26],
      rows: dated.map(([k, d, u]) => [k, niceDay(d, { year: true }), `day ${day(d) ?? '—'}`, u || '—']), note: 'Common expectations, not rules: the customer’s or the standard’s timetable governs.' });
    if (ctx.problems?.length) tables.push({ title: 'From the register — the project’s problems', head: ['Problem', 'State', 'Owner', 'Raised', 'Closed'], shares: [0.38, 0.14, 0.18, 0.15, 0.15],
      rows: ctx.problems.map(p => [p.problem, p.status.replace('_', ' '), p.owner ?? '—', p.raisedOn ? niceDay(p.raisedOn, { year: true }) : '—', p.closedOn ? niceDay(p.closedOn, { year: true }) : '—']) });
    if (ctx.isIsNot) tables.push({ title: 'D2 — the project’s is / is not', head: ['About', 'It is', 'It is not'], shares: [0.16, 0.42, 0.42], rows: ctx.isIsNot.lines.map(l => [DIMS.find(d => d.value === l.dim)?.label ?? l.dim, l.is, l.isnot || '—']), note: `Read from “${ctx.isIsNot.name}”${ctx.isIsNot.since ? `, which began ${niceDay(ctx.isIsNot.since, { year: true })}` : ''} — the specification is kept there, not here.` });
    if (ctx.causes?.length) tables.push({ title: 'D4 — causes on the project’s fishbone', head: ['Bone', 'Cause', 'Whys', 'Root cause'], shares: [0.18, 0.5, 0.12, 0.2], rows: ctx.causes.map(c => [c.bone, c.text, String(c.whys), c.root ? 'yes' : 'no']) });
    if (ctx.actions?.length) tables.push({ title: 'D5 to D7 — the project’s actions', head: ['Action', 'Who', 'Due', 'State'], shares: [0.46, 0.2, 0.17, 0.17], rows: ctx.actions.map(a => [a.what, a.who || '—', a.due ? niceDay(a.due, { year: true }) : '—', STATE[a.state]]) });
    if (ctx.studies?.length) tables.push({ title: 'D6 — the project’s studies', head: ['Study', 'Verdict', 'What it says'], shares: [0.34, 0.16, 0.5], rows: ctx.studies.map(s => [s.title, s.verdict || '—', s.says || '—']) });

    const actionsDone = ctx.actions ? ctx.actions.filter(a => a.state === 'done').length : undefined;
    const open = raised ? (closed ? undefined : daysBetween(raised, ctx.today)) : undefined;
    const missing: string[] = [];
    if (held !== undefined && unit === undefined) missing.push('Give what one held unit has cost so far to say the product held in money.');
    if (hours !== undefined && rate === undefined) missing.push('Give the line a wage (Set up the line), or type one person’s £ an hour, to cost the sorting.');
    if (held === undefined && hours === undefined) missing.push('Give the units held and what one cost, and the hours of sorting, to say the containment in money — held product is money tied up, never a daily loss.');
    if (numOf(v, 'problemCost') === undefined) missing.push('Measure the problem with its tool to say what it costs — type what it cost and which tool said so.');
    const moneyParts = [
      tied !== undefined ? `${fmt(held as number, 0)} units held is ${gbp(tied)} tied up (not lost)` : '',
      sort !== undefined ? `sorting took ${fmt(hours as number, 1)} hours, ${gbp(sort)} of labour` : '',
      numOf(v, 'problemCost') !== undefined ? `the problem itself cost ${gbp(numOf(v, 'problemCost') as number)}${textOf(v, 'problemCostFrom') ? ` (${textOf(v, 'problemCostFrom')})` : ''}` : '',
    ].filter(Boolean);
    const more = [
      ...(ctx.problems === undefined ? ['Not read from a project: type D4 to D7 here, or start the 8D report inside the project to have its register, fishbone, actions and studies read.'] : []),
      ...(textOf(v, 'symptom') ? [`D0: ${textOf(v, 'symptom')}${textOf(v, 'ref') ? ` (${textOf(v, 'ref')})` : ''}.`] : []),
      ...(textOf(v, 'escape') ? [`Escape point: ${textOf(v, 'escape')}`] : []),
    ];
    return {
      sentence, tone: 'n', ...(more.length ? { more } : {}),
      tiles: [
        closedDay !== undefined ? { k: 'Days to close', v: plural(closedDay, 'day'), of: 'D0 to D8' } : open !== undefined ? { k: 'Days to close', v: `open ${plural(open, 'day')}`, of: 'since D0, not closed' } : { k: 'Days to close', v: '—', of: 'needs the day it was raised' },
        held !== undefined ? { k: 'Contained', v: `${fmt(held, 0)} units`, of: tied !== undefined ? `${gbp(tied)} tied up` : 'needs what one cost' } : { k: 'Contained', v: '—', of: 'needs the units held' },
        sort !== undefined ? { k: 'Sorting', v: gbp(sort), of: `${fmt(hours as number, 1)} hours of labour` } : { k: 'Sorting', v: '—', of: hours !== undefined ? 'needs £ an hour' : 'needs the hours' },
        wk !== undefined && ev !== undefined ? { k: 'Since the fix', v: `${fmt(ev, 0)} in ${fmt(wk, 1)} weeks`, of: exp !== undefined ? `about ${fmt(exp, 0)} expected at the old rate` : 'needs the old rate' } : { k: 'Since the fix', v: '—', of: 'needs weeks and events' },
        actionsDone !== undefined ? { k: 'Project actions', v: `${actionsDone} of ${ctx.actions?.length ?? 0} done`, of: 'read from the project' } : { k: 'Project actions', v: '—', of: 'not on a project' },
      ],
      tables,
      working: [
        ...(dated.length > 1 ? [{ label: 'Elapsed days', value: dated.filter(([k]) => k !== 'D0 Raised').map(([k, d]) => `${k.split(' ')[0]} day ${day(d)}`).join(' · '), note: 'each discipline’s day − the day it was raised' }] : []),
        ...(tied !== undefined ? [{ label: 'Held', value: `${fmt(held as number, 0)} units × ${gbp(unit as number)} = ${gbp(tied)}`, note: 'money tied up, not a loss' }] : []),
        ...(sort !== undefined ? [{ label: 'Sorting', value: `${fmt(hours as number, 1)} hours × ${gbp(rate as number)} = ${gbp(sort)}`, note: 'labour, kept apart from the product held' }] : []),
        ...(exp !== undefined && ev !== undefined ? [{ label: 'Expected without the fix', value: `${fmt(old as number, 1)} a week × ${fmt(wk as number, 1)} weeks = ${fmt(exp, 0)}; ${fmt(ev, 0)} came`, note: 'a comparison, not a significance test' }] : []),
      ],
      money: { ...(moneyParts.length ? { text: `Containment: ${moneyParts.join('; ')}.` } : {}), ...(tied !== undefined || sort !== undefined ? { figures: [...(tied !== undefined ? [['Held, tied up', gbp(tied)] as [string, string]] : []), ...(sort !== undefined ? [['Sorting labour', gbp(sort)] as [string, string]] : [])] } : {}), missing },
      caveats: [
        'An 8D written to close a complaint rather than solve the problem shows itself: a D4 of “human error” and a D7 of “retraining”. The system cause and the system change are required.',
        'D3 protects the customer and fixes nothing; reporting containment as corrective action is the commonest fault.',
        'A root cause not verified — turned on and off — is a hypothesis in a box. “None in six weeks” says what did not happen against the old rate; it does not prove the cause on its own.',
        'The money is stated apart: product held is tied up, not lost; sorting is labour; the problem’s own cost is the measuring tool’s figure — none is added to another, and none is invented.',
        'The D0 to D8 steps are from the automotive practice (Ford TOPS; AIAG; VDA) as the knowledge record states them — to confirm against the texts.',
      ],
      checks: [],
      closing: sentence ? `${sentence}${closedDay === undefined ? ' Not closed yet.' : ''}` : 'Start with D0: the day it was raised, what happened and what was done at once.',
    };
  },
  examples: [
    {
      name: 'Leaking seals from lane 3 — the record’s worked case, read against the project’s records',
      source: 'knowledge/methods/rca/eight-d.md worked case (Ford TOPS 1987; Rambaud 2011); days, held, sorting and expected counted in scripts/knowledge/cases-doc.py E1 (the record closes at day 30 yet counts six weeks held after day 19: the example closes at day 62 so the six weeks fit)',
      values: {
        raisedOn: '2026-10-01', source: 'complaint', ref: 'Retailer CAR 4471', symptom: 'Leaking seals on lane 3 trays, found by the customer on delivery', response: 'Lane 3 stopped; the last two pallets held',
        leader: 'Sam Patel', champion: 'Priya Shah', team: [{ id: 'm1', c: { name: 'Dev Rao', role: 'Maintenance' } }, { id: 'm2', c: { name: 'Jo Marsh', role: 'Line leader' } }],
        problem: 'Seals on lane 3, from 12 September, leaking on a share of trays',
        isnot: [{ id: 'i1', c: { dim: 'what', is: 'Leaking seals', isnot: 'Crushed trays' } }, { id: 'i2', c: { dim: 'where', is: 'Lane 3', isnot: 'Lanes 1, 2 and 4' } }, { id: 'i3', c: { dim: 'when', is: 'Since the new jaw', isnot: 'Before it' } }, { id: 'i4', c: { dim: 'howmuch', is: '14 pallets', isnot: 'Every pallet' } }],
        containment: [{ id: 'c1', c: { action: 'Hold and sort the 14 pallets on site', owner: 'Jo Marsh', date: '2026-10-02', checked: 'yes' } }],
        containmentCheck: 'Every held tray leak-tested; three days’ output sampled', heldUnits: 16800, unitCost: 0.42, sortHours: 24, rate: 14.7,
        rootCause: 'The new jaw’s heater reads 12 °C low. It was not found because there is no heater check at jaw change.', verifiedHow: 'Swapped the jaw to lane 2 and the leaks moved with it', verifiedOn: '2026-10-10', escape: 'No heater check at jaw change; the end-of-line leak test samples 1 in 200',
        chosen: 'A heater calibration check at every jaw change', chosenOn: '2026-10-13',
        implementedOn: '2026-10-20', validation: 'Leak rate on lane 3 from 4% to 0, six weeks', oldPerWeek: 90, weeksHeld: 6, eventsSince: 0,
        prevent: [{ id: 'p1', c: { kind: 'fmea', what: 'Detection rating on seal temperature changed from 6 to 3', date: '2026-10-25' } }, { id: 'p2', c: { kind: 'plan', what: 'Heater check added to the jaw-change checklist', date: '2026-10-27' } }, { id: 'p3', c: { kind: 'lines', what: 'The check offered to the other sealers', date: '2026-10-27' } }],
        closedOn: '2026-12-02', problemCost: 9400, problemCostFrom: 'Complaints per million, October',
      },
      ctx: {
        today: '2026-12-05',
        problems: [{ id: 'p1', problem: 'Leaking seals from lane 3', status: 'closed', priority: 'critical', owner: 'Dev Rao', raisedOn: '2026-10-01', closedOn: '2026-12-02' }],
        actions: [
          { id: 'a1', what: 'Calibrate the new jaw heater', who: 'Dev Rao', due: '2026-10-13', state: 'done', doneOn: '2026-10-12' },
          { id: 'a2', what: 'Add a heater check to the jaw-change checklist', who: 'Jo Marsh', due: '2026-10-27', state: 'done' },
          { id: 'a3', what: 'Offer the check to the other sealers', who: 'Jo Marsh', due: '2026-12-20', state: 'todo' },
        ],
        studies: [{ id: 's1', name: 'Lane 3 seal strength', tool: 'capability', title: 'Capability study — Lane 3 seal strength', verdict: 'Capable', tone: 'g', says: 'Ppk 1.52', href: '/capability/s1' }],
        causes: [{ id: 'c1', bone: 'Machine', text: 'New jaw heater reads 12 °C low', root: true, whys: 3 }],
      },
      expect: {
        sentence: 'D3 held 16,800 units (£7,056 tied up); D4 root cause: The new jaw’s heater reads 12 °C low (verified: swapped the jaw to lane 2 and the leaks moved with it); D6: 0 in 6 weeks against about 540 expected; D7: FMEA rating changed, control plan check added and offered to the other lines. Closed day 62.',
        tiles: { 'Filled in': '19 of 19', 'Days to close': '62 days', Contained: '16,800 units', Sorting: '£352.80', 'Since the fix': '0 in 6 weeks', 'Project actions': '2 of 3 done' },
        money: 'Containment: 16,800 units held is £7,056 tied up (not lost); sorting took 24 hours, £352.80 of labour; the problem itself cost £9,400 (Complaints per million, October).',
        tables: {
          'How long each discipline took': [['D0 Raised', '1 Oct 2026', 'day 0'], ['D3 Contained', '2 Oct 2026', 'day 1'], ['D4 Root cause verified', '10 Oct 2026', 'day 9'], ['D5 Action chosen', '13 Oct 2026', 'day 12'], ['D6 Implemented', '20 Oct 2026', 'day 19'], ['D7 Prevention in place', '27 Oct 2026', 'day 26'], ['D8 Closed', '2 Dec 2026', 'day 62']],
          'From the register — the project’s problems': [['Leaking seals from lane 3', 'closed', 'Dev Rao', '1 Oct 2026', '2 Dec 2026']],
          'D4 — causes on the project’s fishbone': [['Machine', 'New jaw heater reads 12 °C low', '3', 'yes']],
          'D5 to D7 — the project’s actions': [['Calibrate the new jaw heater', 'Dev Rao', '13 Oct 2026', 'done'], ['Add a heater check to the jaw-change checklist', 'Jo Marsh', '27 Oct 2026', 'done'], ['Offer the check to the other sealers', 'Jo Marsh', '20 Dec 2026', 'to do']],
          'D6 — the project’s studies': [['Capability study — Lane 3 seal strength', 'Capable', 'Ppk 1.52']],
        },
        needs: [],
      },
    },
    {
      name: 'A weak report — human error, training only, a hold not yet checked, weeks that have not passed',
      source: 'the record’s misuse list: a D4 of “human error” and a D7 of “retraining” is the signature of a report written to close a complaint',
      values: {
        raisedOn: '2026-11-01', source: 'complaint', symptom: 'Foreign body in a pack', response: 'Line stopped',
        isnot: [{ id: 'i1', c: { dim: 'what', is: 'A piece of blue plastic' } }],
        containment: [{ id: 'c1', c: { action: 'Hold the batch', checked: 'notyet', date: '2026-11-02' } }],
        rootCause: 'Operator error at the packing table', implementedOn: '2026-11-20', weeksHeld: 3,
        prevent: [{ id: 'p1', c: { kind: 'training', what: 'Retrained the operator' } }],
      },
      ctx: { today: '2026-11-30' },
      expect: {
        sentence: 'D3 1 containment action; D4 root cause: Operator error at the packing table; D7: training only.',
        tiles: { 'Days to close': 'open 29 days', Contained: '—', 'Project actions': '—' },
        checks: ['D2 has no row for “where”, “when” and “how much”', 'signature of a closed complaint', 'D7 is training only', 'Containment “Hold the batch” is not yet checked as working', '3 weeks since the fix runs past today'],
        needs: ['Team leader', 'The problem, in one statement', 'How it was checked that nothing more escaped', 'How it was verified', 'The day it was verified', 'The escape point', 'The corrective action chosen, and why it will work', 'The day it was chosen', 'How it was validated', 'The day it was closed'],
      },
    },
    { name: 'A draft — only the day it was raised', source: 'the shape: a document is saved as typed; the boxes still needed are named', values: { raisedOn: '2026-11-01' }, ctx: { today: '2026-11-03' }, expect: { sentence: '', tiles: { 'Filled in': '1 of 19', 'Days to close': 'open 2 days' }, needs: ['Where it came from', 'What happened', 'The emergency response', 'Team leader', 'The problem, in one statement', 'Is and is not — at least one row', 'Containment actions — at least one action', 'How it was checked that nothing more escaped', 'The root cause', 'How it was verified', 'The day it was verified', 'The escape point', 'The corrective action chosen, and why it will work', 'The day it was chosen', 'The day it was in place', 'How it was validated', 'What was changed in the system — at least one change', 'The day it was closed'] } },
  ],
  see: [{ key: 'is-is-not', why: 'the specification of the problem — D2 reads it when the project holds one' }, { key: 'charter', why: 'a corrective action that grows into a project starts from a charter' }],
};

export default eightD;
