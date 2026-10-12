/* TWO JOBS AT THE EDGES — for proving the reports at every size.
 *
 * Rowland, 4 October: "information can flex — a small amount or a vast
 * amount ... a report system that can handle large and small and still look
 * beautifully designed, regardless of how much has been pulled into it."
 *
 * The ordinary seed (seed.ts) is one tidy job. These are the two ends of the
 * range: TINY, a job just started — one machine, one step, nothing run — and
 * HUGE, a job a long way in — a dozen machines on all four gates, dozens of
 * tests and fixes, long words, long sentences, the symbols a tolerance is
 * written in. scripts/report-stress.mjs renders every report from both and
 * checks the pages. TypeScript on purpose, for the reason seed.ts gives.
 *
 * Nothing in the app imports this, so it is not in the bundle. */
import {
  createProject, updateProject, putAsset, putTest, putTestItem, putMaterials, putPrograms,
  addCase, addObservation, addPaceLine, addSegment, addSnag, addSnagAsset, createWorkspace, updateWorkspace,
  putPaceTodo, putReadings, putStandard, putTarget, putBlob, putStudy,
} from '../db';
import type { LossCount } from '../lib/study';
import type { Case, MediaRef, Observation } from '../types';
import type { PaceTodoRow } from '../db';
import type { Measure, Period, Reading, Target } from '../lib/measures';
import { quarters } from '../lib/measures';
import type { Cause, CauseStatus, Grade, SixM, Why } from '../lib/sixm';
import type { Segment, SnagAsset, Snag } from '../snag/types';

import type { Asset, DocRef, Test, TestItem } from '../lib/testing';
import type { Material } from '../lib/materials';
import type { Program } from '../lib/programs';
import type { ChangeoverProduct, ChangeoverSide, ChangeoverStep } from '../lib/study';

/* A SMED's elements for the report jobs (lib/ie/changeover, tool 6): each
   [what is done, minutes, side, how known, and — optional — who, where,
   Shingo's function and the plan], in order. */
type CoRow = [string, number | undefined, ChangeoverSide, ChangeoverStep['source'], Partial<Pick<ChangeoverStep, 'crew' | 'where' | 'fn' | 'plan' | 'alongside'>>?];
const coSeq = (rows: CoRow[], at: number, who?: string): ChangeoverStep[] =>
  rows.map(([name, min, side, source, x], i) => ({ id: `co${i}`, order: i, name, side, source, ...(x ?? {}),
    ...(min !== undefined ? { sec: min * 60 } : {}), ...(source === 'timed' ? { at: at + i * 120_000, ...(who ? { who } : {}) } : {}) }));

const uid = () => crypto.randomUUID();

/* FILES ON A STAGE (docs/PANELS.md) — only their names reach paper, so a
   reference is enough; no bytes are stored. */
const docsNamed = (names: string[]): DocRef[] =>
  names.map((name, i) => ({ id: uid(), name, blobKey: `doc-seed-${uid()}`, mime: 'application/pdf', bytes: 180_000 + i * 7_000, savedAt: Date.now() }));
const DRAWINGS = [
  'GA drawing rev C.pdf', 'Electrical schematics — panel 1 and 2, rev F (as built).pdf', 'Pneumatic circuit.pdf',
  'Spares list with supplier part numbers and lead times, agreed at the FAT.pdf', 'Declaration of conformity.pdf',
  'Operating manual, English, issue 3.pdf', 'Maintenance schedule.pdf', 'Risk assessment (PUWER) signed.pdf', 'Training register.pdf',
];
const DAY = 86_400_000;
const iso = (days: number) => new Date(Date.now() + days * DAY).toISOString().slice(0, 10);

/* A fixed sequence, so a failure is the same failure on the next run. */
let r = 7;
const rand = () => { r = (r * 16807) % 2147483647; return (r - 1) / 2147483646; };
const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)];

const MACHINES = [
  ['Ilapak Vegatronic 6000 vertical form-fill-seal bagger', 'Ilapak UK'],
  ['Ishida CCW-RV-214W multihead weigher', 'Ishida Europe'],
  ['Domino Ax350i continuous inkjet coder', 'Domino UK'],
  ['Mettler-Toledo C33 PlusLine checkweigher', 'Mettler-Toledo'],
  ['Loma IQ4 metal detector', 'Loma Systems'],
  ['Brillopak UniPAKer robotic case packer', 'Brillopak'],
  ['Herma 500 top-and-bottom labeller', 'Herma UK'],
  ['Robopac Helix 4 stretch wrapper', 'Robopac'],
  ['Fanuc M-410 palletising robot', 'Fanuc UK'],
  ['Interroll infeed and accumulation conveyors', 'Interroll'],
  ['Cama IF318 top-load cartoner', 'Cama Group'],
  ['Sick vision inspection station', 'Sick UK'],
] as const;

const LONG = [
  'Seal integrity held at 65 ppm for 30 minutes with under 2% waste, tested off the running machine on the 2kg Finest Red bag with the new perforation plan',
  'Within ±1.5 g over 200 packs, mean within 0.3 g of target, no pack below the T1 limit, and the reject arm confirmed on every under-weight',
  'Line ran 4 hours at rate with two stops over 5 minutes — film splice and a jam at the 90° transfer; both written up as fixes with the OEM',
  'Changeover 2kg → 1.25kg in under 20 minutes by our own people, twice in a row, with the changeover parts kit complete and labelled',
  'Coder prints legible on 100% of a 500-pack sample at full speed: date, batch and line, 2 mm from the seal, no smear on the µ-perforated film',
];
const SHORT = ['Guard fitted', 'Air on', 'E-stop proved', 'Labels loaded', 'Belt tracked'];
const RESULTS = [
  '3 leaked in 20 at the jaw — seal jaw ran 8 °C cool on the rear face; jaw heater swapped, re-test booked with Ilapak for next week',
  'Held ±0.9 g over 200; two rejects, both genuine under-weights, confirmed by hand on the bench scale',
  'Ran clean for the full four hours. Operators happy with the HMI. No stops over two minutes.',
  'Did not happen — OEM engineer off site with Covid; rebooked',
  'Passed',
];
/* What the team said about how a stage went ("Say how it went") — the step's
   account, which the client report prints under each gate. Short and long,
   and one that runs past a page, to prove it wraps and breaks whole. */
const ACCOUNTS = [
  'Done to plan.',
  'Levelled to within 1 mm across the frame. Took two hours longer than planned — the floor dips by the drain and we had to shim the rear feet.',
  'Air on and tested at 6 bar. Regulator missing from the kit — fitted a loan one until Ishida send the right part.',
  'Programs loaded from the OEM laptop; two recipes had the old 1.25 kg weights in them and were corrected on site with the engineer.',
  'Operators on both shifts walked through start-up, changeover and clearing a jam. Nights want a second session before handover.',
  'Started, then stopped — the panel door would not close over the new drive. Electrician back Thursday to re-route the cable.',
];
/** One account long enough to run over a page break on its own. Its last
 *  sentence is what the stress run looks for at the end. */
const LONG_ACCOUNT = [
  'Arrived on the Monday on two artics, an hour late because of the roadworks on the ring road. Unloaded with the hired forklift and the site crane; the main frame came off first and went straight onto its feet in the bay we had marked out the week before.',
  'Positioning went well until we found the floor falls by nearly 9 mm towards the drain on the operator side. Ilapak would not accept more than 2 mm across the frame, so we stopped, borrowed shims from maintenance and levelled each foot in turn with the laser. That cost most of the afternoon.',
  'The infeed conveyor then fouled the existing guard rail by about 40 mm. We agreed with the OEM engineer to cut the rail back rather than move the machine, and the site fabricator did it the same evening with a permit; the cut ends are capped and painted.',
  'Day two was the anchors. The drawings showed M16 resin anchors at 200 mm embedment; the floor is only 180 mm thick at that end, so we went to 150 mm with a wider base plate after a call with their structural engineer, who confirmed it by email the same day. That email is filed under the machine.',
  'By the Wednesday the frame was square, level and anchored, the infeed and outfeed were lined up within 1 mm of the conveyors either side, and the OEM signed the positioning sheet. The only thing still open from this stage is the drain cover, which now sits under a foot and has to be moved before the hygiene audit.',
  'Lessons for the next machine on this line: survey the floor level and thickness before the drawings are signed, and have shims and a fabricator on standby for the first two days. End of account: drain cover still to move before the audit.',
].join(' ');

const WHO = ['Ilapak UK', 'Ishida Europe', 'Domino UK', 'Mettler-Toledo', 'Brillopak', 'the site', 'Dave (shift fitter)', 'Herma UK'];

/** A PHOTO WITH MARKS ON IT (MediaRef.pins, ui/Evidence) — a real picture in
 *  the store, so every document that prints it draws the numbered marks on
 *  it and lists their words beside it: the fix card, the client report's fix
 *  card and the day's pictures. One mark is long, to prove it wraps whole. */
async function markedPhoto(notes: string[]): Promise<MediaRef> {
  const cv = document.createElement('canvas');
  cv.width = 480; cv.height = 360;
  const g = cv.getContext('2d') as CanvasRenderingContext2D;
  g.fillStyle = '#c9d3df'; g.fillRect(0, 0, 480, 360);
  g.fillStyle = '#6b7c93'; g.fillRect(60, 130, 360, 150);
  g.fillStyle = '#3d4a5c'; g.fillRect(90, 90, 90, 40); g.fillRect(300, 90, 90, 40);
  const blob = await new Promise<Blob>((res, rej) => cv.toBlob(b => (b ? res(b) : rej(new Error('no blob'))), 'image/jpeg', 0.85));
  const key = `seed-photo-${uid()}`;
  await putBlob(key, blob);
  return {
    id: uid(), kind: 'photo', blobKey: key, mime: 'image/jpeg', capturedAt: Date.now(),
    pins: notes.map((note, i) => ({ id: uid(), x: 22 + i * 26, y: 34 + (i % 2) * 30, note })),
  };
}

export interface ReportJob { projectId: string; testId: string; fixId?: string }

/** The worked example's thirty packs (docs/LEAN40.md appendix): mean 401.2 g,
 *  all within 400–404, Cpk 0.67. */
const THIRTY = [400.1, 402.6, 401.6, 400.8, 401.5, 401.3, 400.2, 401.9, 400.6, 400.4, 400.6, 401.2, 401.9, 400.9, 401.8,
  401.0, 401.9, 400.8, 401.9, 401.1, 401.2, 401.6, 401.3, 400.7, 401.3, 400.4, 401.1, 401.5, 401.9, 400.8];

/* A SHIFT'S LOSSES (lib/ie/losses) — a line's shift, the stops timed in it
   (Observation, on the line's workspace) and the count at its end. */
const at6 = (daysAgo: number) => { const d = new Date(Date.now() - daysAgo * DAY); d.setHours(6, 0, 0, 0); return d.getTime(); };
const shiftOf = (daysAgo: number, o: Partial<LossCount> = {}): LossCount =>
  ({ shift: 'Shift 1', from: at6(daysAgo), to: at6(daysAgo) + 8 * 3_600_000, plannedMin: 450, ratePerMin: 100, rateFrom: 'standard', ...o });
const lossStop = (wsId: string, from: number, hour: number, mins: number, category: string, subcategory: string, asset: string, note?: string): Observation => ({
  id: uid(), workspaceId: wsId, category, subcategory, asset, shift: 'Shift 1', startedAt: from + hour * 3_600_000, endedAt: from + hour * 3_600_000 + mins * 60_000,
  durationMs: Math.round(mins * 60_000), timing: 'stopwatch', count: 1, ...(note ? { note } : {}), media: [], createdAt: Date.now(), updatedAt: Date.now(),
});

export async function seedReportJob(size: 'tiny' | 'huge'): Promise<ReportJob> {
  r = 7;
  const t = Date.now();
  const proj = await createProject(size === 'tiny' ? 'Line 9 new labeller' : 'Line 2 — complete rebuild: bagging, weighing, coding, inspection, case packing and palletising',
    '#1f63e0', 'Rowland', undefined, 'commissioning');
  await updateProject({ ...proj, plannedAt: iso(size === 'tiny' ? 40 : 20), expectedAt: iso(size === 'tiny' ? 40 : 34), updatedAt: t,
    description: size === 'huge' ? 'Full line rebuild with eight suppliers on site at once' : undefined,
    /* The lead's commentary (supabase/REPORT_COMMENTARY.sql): none on the
       job just started, a sentence on the ordinary one, a long paragraph on
       the huge one — so the one page is proved to hold it. */
    ...(size === 'tiny' ? {} : { reportNoteAt: t, reportNote: size === 'huge'
      ? 'Install is two days behind on the checkweigher and the case packer, both down to the regulator kit that arrived short; Ishida have a second kit on the van and expect to be caught up by Friday. Set up is on plan except the programs: three of the twelve still fail on the 2 kg film, and Ilapak are rewriting them on site this week rather than copying them over. Commission cannot start on the bagger until those three pass, so the handover date is at risk by about a week unless the rewrite lands by Wednesday. Everything else is on the dates agreed, and every fix below has a name and a day against it — the ones that matter most are the jaw heater and the regulator.'
      : 'Two days behind on the checkweigher, caught up by Friday; programs on track for the Tesco trial.' }) });

  const machines = (size === 'tiny' ? MACHINES.slice(0, 1) : MACHINES).map(([name, oem], i): Asset => ({
    id: uid(), projectId: proj.id, name, oem, state: i < 8 ? 'running' : 'awaited',
    dueOn: iso(-40 + i * 4), onSiteOn: i < 9 ? iso(-38 + i * 4) : undefined, sort: i, updatedAt: t,
  }));
  for (const a of machines) await putAsset(a);

  const tests: Test[] = [];
  const T = (o: Partial<Test> & { title: string }): Test => {
    const x: Test = { id: uid(), projectId: proj.id, outcome: 'planned', sort: tests.length, createdAt: t, updatedAt: t, ...o };
    tests.push(x); return x;
  };

  if (size === 'tiny') {
    T({ kind: 'install', title: 'Positioned and levelled', assetId: machines[0].id, plannedFor: iso(3),
      result: 'Floor marked out and the fixings drilled; the labeller itself arrives Thursday.' });
    const only = tests[0];
    for (const x of tests) await putTest(x);
    /* A part of the plan on the stage, with a day — a branch under it on the plan. */
    await putTestItem({ id: uid(), projectId: proj.id, testId: only.id, kind: 'next', what: 'Mark out the guarding line with the safety officer',
      owner: 'Site electrician', due: iso(2), sort: 1, createdAt: t, updatedAt: t });
    /* A CHANGEOVER JUST STARTED (tool 6): two steps typed, one with no time
       yet, no products — the minutes "at least", the interval asking for them. */
    await putStudy({ id: uid(), tool: 'changeover', name: 'Labels 4 × 6 → 6 × 8', projectId: proj.id,
      facts: { fromProduct: 'Labels 4 × 6', toProduct: 'Labels 6 × 8', sequence: coSeq([['Swap the label reel', 6, 'internal', 'typed'], ['Load the new label template', undefined, 'external', 'typed']], t) },
      uses: [], startedAt: t - 600_000, createdAt: t, updatedAt: t });
    /* A loss count set up and not yet counted — the paper says what is still to put in. */
    await putStudy({ id: uid(), tool: 'losses', name: 'Loss count', projectId: proj.id, facts: { losses: shiftOf(1, { rateFrom: undefined, ratePerMin: undefined }) },
      uses: [], startedAt: t, createdAt: t, updatedAt: t });
    return { projectId: proj.id, testId: only.id };
  }

  /* Every machine on every gate, in every state the grid draws. */
  const INSTALL = ['Positioned and levelled', 'Mechanically complete', 'Air and power connected', 'Electrically complete', 'Sensors and controls checked (I/O)', 'Dry run'];
  const SETUP = ['Programs loaded', 'Recipes and settings set', 'Change parts fitted', 'HMI and alarms checked', 'Guards and interlocks on'];
  const HAND = ['Manuals and drawings handed over', 'Operators and engineers trained', 'Spares list agreed', 'Safety sign-off (PUWER)', 'Client signed off'];
  machines.forEach((a, mi) => {
    const progress = 1 - mi / machines.length; // the first machines are furthest on
    const gate = (names: string[], g: Test['gate'], start: number, share: number) => names.forEach((title, si) => {
      const day = start + mi * 2 + si * 2;
      const done = si / names.length < share;
      const roll = rand();
      const outcome: Test['outcome'] = done ? (roll < 0.08 ? 'failed' : 'passed') : 'planned';
      /* Most stages that were worked on were talked about; the first machine's
         first stage carries the account that runs past a page. */
      const k = mi * 7 + si * 3 + (g === 'setup' ? 1 : g === 'handover' ? 2 : 0);
      const result = mi === 0 && si === 0 && !g ? LONG_ACCOUNT
        : outcome === 'failed' ? ACCOUNTS[5]
        : done && k % 3 !== 0 ? ACCOUNTS[k % 5] : undefined;
      T({
        kind: 'install', gate: g, title, assetId: a.id, withWhom: a.oem,
        plannedFor: roll < 0.15 ? undefined : iso(day),
        ranOn: done ? iso(day) : undefined,
        outcome, result,
        /* The first hand-over line, done, carries what was handed over —
           every drawing on the first machine, two on the rest. */
        ...(g === 'handover' && si === 0 && done ? { docs: docsNamed(mi === 0 ? DRAWINGS : DRAWINGS.slice(0, 2)) } : {}),
      });
    });
    gate(INSTALL, undefined, -45, progress * 1.4);
    gate(SETUP, 'setup', -25, progress * 0.9);
    gate(HAND, 'handover', 5, progress * 0.3);
  });

  /* Tests: four per machine, long and short, every outcome, a re-test chain. */
  let firstTest: Test | undefined;
  machines.forEach((a, mi) => {
    for (let k = 0; k < 4; k++) {
      const ran = rand() < 0.7 - mi * 0.04;
      const outcome: Test['outcome'] = !ran ? 'planned' : pick(['passed', 'passed', 'failed', 'notRun'] as const);
      const x = T({
        title: `${pick(['Seal integrity', 'Weight accuracy', 'Rate trial', 'Changeover', 'Print quality', 'Reject function'])} — ${pick(['Finest Red 2kg', 'Jacks Piper 1.25kg', 'Express White 500g', 'Organic Baby 750g'])}${k === 3 ? ' — re-test' : ''}`,
        assetId: a.id, withWhom: a.oem, plannedFor: iso(-20 + mi * 3 + k * 4),
        passesIf: k % 2 ? pick(SHORT) : pick(LONG), product: 'Finest Red 2kg',
        ranOn: ran ? iso(-20 + mi * 3 + k * 4) : undefined,
        result: ran ? pick(RESULTS) : undefined, outcome,
        fromTestId: k === 3 ? tests[tests.length - 1]?.id : undefined,
      });
      firstTest ??= x;
    }
  });
  /* PERFORMANCE RUNS (lib/run) — one per machine, each MANY PRODUCTS: all
     met; one run kept the old single way, short; and a run part-way through
     — met, short, that one run again and met, one still to run — with long
     products: the Performance runs table, the card and the status page at
     their fullest. */
  const LONG_PRODUCTS = ['Finest Red 2kg', 'Jacks Piper 1.25kg', 'Express White 500g', 'Finest Red 2kg — 60 micron perforated film, reel batch 4471, export labels for the Irish market'];
  machines.forEach((a, mi) => {
    const k = mi % 3;
    const agreed = { rate: 60 + mi, minutes: 60, rejectsMax: 1 };
    const met = { minutes: 60, packs: 3900 + mi * 60, rejects: 12, speed: 66 + mi, stops: 2 };
    const short = { minutes: 45, packs: 2300, rejects: 61, speed: 60, stops: 11 };
    T({
      title: k === 1 ? 'Runs with product at the agreed speed' : 'Performance run at the agreed rate',
      assetId: a.id, withWhom: a.oem, plannedFor: iso(-6 + mi),
      ...(k === 1 ? {
        product: `${pick(['Finest Red 2kg', 'Jacks Piper 1.25kg', 'Express White 500g'])} — 60 micron perforated film, reel batch ${4400 + mi}`,
        runAgreed: agreed, ranOn: iso(-6 + mi), outcome: 'failed' as const, run: short,
      } : k === 0 ? {
        ranOn: iso(-6 + mi), outcome: 'passed' as const,
        runs: LONG_PRODUCTS.slice(0, 3).map((product, j) => ({ id: uid(), product, agreed, day: { ...met, packs: met.packs + j * 20 }, ranOn: iso(-6 + mi) })),
      } : {
        ranOn: iso(-6 + mi), plannedTo: iso(4 + mi), outcome: 'planned' as const,
        runs: [
          { id: uid(), product: LONG_PRODUCTS[3], agreed, day: met, ranOn: iso(-6 + mi) },
          { id: uid(), product: LONG_PRODUCTS[1], agreed, day: short, ranOn: iso(-6 + mi) },
          { id: uid(), product: LONG_PRODUCTS[1], agreed, day: met, ranOn: iso(-5 + mi) },
          { id: uid(), product: `${LONG_PRODUCTS[2]} — the new sleeve, trial reel from the second film supplier`, agreed: { ...agreed, rate: 45 } },
        ],
      }),
    });
  });
  // One test with everything long — the card that has to take it.
  const longest = T({
    title: 'Full line rate trial at 65 ppm on the 2kg Finest Red bag with the new perforation plan and the upgraded jaw heater fitted',
    assetId: machines[0].id, withWhom: 'Ilapak UK with Ishida Europe and Domino UK on site', plannedFor: iso(-3), ranOn: iso(-3),
    passesIf: LONG.join(' — and '), product: 'Finest Red 2kg — 60 micron perforated film, reel batch 4471',
    result: RESULTS.slice(0, 3).join(' Then: ') + ' ' + LONG[2], outcome: 'failed',
  });

  /* Fixes: thirty, long problems, due across the month. The first (the fix
     card's) and one still open (the client report's) each carry a photo with
     marks on it. */
  const marked = [
    await markedPhoto(['Seal jaw face scored across the middle', 'Heater lead chafed where it passes the guard']),
    await markedPhoto(['Belt worn through to the cords here', 'Tension arm bracket cracked', LONG[1]]),
  ];
  let fixId: string | undefined, openFixId: string | undefined, balanceFixId: string | undefined, mapFixId: string | undefined, coFixId: string | undefined, lossFixId: string | undefined;
  for (let i = 0; i < 30; i++) {
    const a = machines[i % machines.length];
    const due = -8 + i;
    const f = T({
      kind: 'fix', title: pick(['Re-cut the seal jaw', 'Send the regulator', 'Re-track the film and re-splice', 'Fit the upgraded jaw heater', 'Replace the worn timing belt on the infeed', 'Re-teach the robot pick positions for the 1.25kg case']),
      assetId: a.id, withWhom: pick(WHO), plannedFor: iso(due), fromTestId: tests.find(x => !x.kind && x.assetId === a.id)?.id,
      passesIf: i % 3 ? pick(RESULTS) : LONG[i % LONG.length], outcome: due < -2 ? 'passed' : 'planned', ranOn: due < -2 ? iso(due) : undefined,
      ...(i === 0 ? { media: [marked[0]] } : i === 12 ? { media: [marked[1]] } : {}),
    });
    fixId ??= f.id;
    if (i === 6) openFixId = f.id;
    if (i === 9) balanceFixId = f.id;
    if (i === 11) mapFixId = f.id;
    if (i === 13) coFixId = f.id;
    /* the loss count's fix: its own, so each fix's before → after reads one tool */
    if (i === 14) lossFixId = f.id;
  }
  for (const x of tests) await putTest(x);

  /* STUDIES (lib/study): the thirty packs as an open fix's evidence and the
     same study after as its proof — before → after on the fix's card — and a
     study still short proving the longest test. The Evidence appendix lists
     all three. */
  if (size === 'huge' && openFixId) {
    const agreed = { readings: { kind: 'limits' as const, unit: 'g', nominal: 400, lower: 400, upper: 404, count: 30 } };
    const at = (k: number) => t - k * 60_000;
    const scope = { tool: 'capability' as const, name: 'Weight accuracy 400 g', projectId: proj.id, machine: machines[1].name, assetId: machines[1].id, agreed };
    await putStudy({ id: uid(), ...scope, facts: { readings: THIRTY.map((value, k) => ({ id: uid(), value, at: at(90 - k), who: 'K. Ahmed' })) },
      uses: [{ id: uid(), kind: 'fix', ref: openFixId, role: 'evidence', at: at(60) }], startedAt: at(120), createdAt: t, updatedAt: t });
    await putStudy({ id: uid(), ...scope, facts: { readings: THIRTY.map((v, k) => ({ id: uid(), value: Math.round((v + 1) * 10) / 10, at: at(40 - k), who: 'Łukasz Wójcik' })) },
      uses: [{ id: uid(), kind: 'fix', ref: openFixId, role: 'proof', at: at(40) }], startedAt: at(45), createdAt: t, updatedAt: t });
    await putStudy({ id: uid(), tool: 'capability', name: longest.title, projectId: proj.id, machine: machines[0].name, assetId: machines[0].id, agreed,
      facts: { readings: THIRTY.slice(0, 12).map((value, k) => ({ id: uid(), value, at: at(20 - k) })) },
      uses: [{ id: uid(), kind: 'test', ref: longest.id, role: 'proof', at: at(20) }], startedAt: at(25), createdAt: t, updatedAt: t });
  }

  /* A LINE STANDARD'S WORK BALANCE (lib/ie/balance), timed before and after a fix: Op 1
     over takt as the fix's evidence, the same elements timed again as its
     proof — before → after on the fix's card and in the Evidence appendix. */
  if (size === 'huge' && balanceFixId) {
    const standardId = uid();
    await putStandard({
      id: standardId, projectId: proj.id, product: 'Finest Red 2kg',
      marks: [
        { id: uid(), kind: 'person', x: 20, y: 40, label: 'Op 1', task: 'Load film, splice at the end of each reel' },
        { id: uid(), kind: 'person', x: 50, y: 60, label: 'Op 2', task: 'Infeed — keep the weigher fed' },
        { id: uid(), kind: 'person', x: 80, y: 50, label: 'Op 3', task: 'Basketer and carrying' },
      ],
      sort: 1, createdAt: t, updatedAt: t,
    });
    const at = (k: number) => t - k * 60_000;
    const laps = (xs: number[], from: number) => xs.map((sec, k) => ({ id: uid(), sec, at: at(from - k), who: 'Zoë Brontë' }));
    const els = (op1: number[]) => [
      { id: uid(), order: 0, name: 'Load film, splice at the end of each reel', who: 'Op 1', laps: laps(op1, 300), rating: 110 },
      { id: uid(), order: 1, name: 'Infeed — keep the weigher fed', who: 'Op 2', laps: laps([7.9, 8.1, 8.0, 8.2, 7.8], 280) },
      { id: uid(), order: 2, name: 'Basketer and carrying', who: 'Op 3', typedSec: 7 },
    ];
    const scope = { tool: 'balance' as const, name: 'Finest Red 2kg', projectId: proj.id, standardId, agreed: { balance: { taktSec: 12, allowance: 0.1 } } };
    await putStudy({ id: uid(), ...scope, facts: { steps: els([11.2, 11.0, 11.4, 11.1, 11.3]) },
      uses: [{ id: uid(), kind: 'fix', ref: balanceFixId, role: 'evidence', at: at(200) }], startedAt: at(320), createdAt: t, updatedAt: t });
    await putStudy({ id: uid(), ...scope, facts: { steps: els([9.4, 9.6, 9.5, 9.3, 9.7]) },
      uses: [{ id: uid(), kind: 'fix', ref: balanceFixId, role: 'proof', at: at(100) }], startedAt: at(150), createdAt: t, updatedAt: t });
  }

  /* A VALUE STREAM MAP (lib/ie/steps), and a fix raised from one of its
     steps — the pallet waiting for QA release — walked again as its proof:
     that step's wait before → after, then the lead time, and the steps still
     carried from before said, on the fix's card, the client report and the
     Evidence appendix. */
  if (size === 'huge' && mapFixId) {
    const at = (k: number) => t - k * 60_000, H = 3600;
    const step = (id: string, order: number, name: string, who: string[], where: string, kind: 'operation' | 'move' | 'check' | 'wait', o: Record<string, unknown> = {}) =>
      ({ id, order, name, who, where, lane: who[0], kind, ...o });
    const flow = (qa: number) => [
      step('rel', 0, 'Release the run to the line', ['Planning'], 'Office', 'operation', { value: 'needed', cycleSec: 600, batch: 9600, waitSec: 20 * H }),
      step('iss', 1, 'Issue the film and the cases', ['Stores', 'Forklift driver'], 'Stores', 'move', { value: 'waste', cycleSec: 900, batch: 9600, waitSec: 3 * H }),
      step('bag', 2, 'Bag and seal', ['Machine', 'Op 1'], 'Bagger', 'operation', { value: 'adds', cycleSec: 1.4 }),
      step('fst', 3, 'First-off check', ['Quality', 'Team leader'], 'Checkweigher', 'check', { value: 'needed', cycleSec: 300, batch: 9600 }),
      step('pak', 4, 'Pack the bags into the case', ['Op 2'], 'Case packer', 'operation', { value: 'adds', cycleSec: 8, batch: 6 }),
      step('qa', 5, 'Pallet waits for QA release — the release sheet is walked to the lab and back by hand', ['Quality'], 'Palletiser', 'wait', { waitSec: qa }),
      step('dsp', 6, 'Pallet to despatch', ['Forklift driver'], 'Despatch', 'move', { value: 'needed', cycleSec: 180, batch: 720 }),
    ];
    const scope = { tool: 'map' as const, name: 'Run released to pallet away — Finest Red 2kg', projectId: proj.id, product: 'Finest Red 2kg',
      ...(proj.workspaceIds?.[0] ? { workspaceId: proj.workspaceIds[0] } : {}),
      agreed: { map: { scope: 'line' as const, supplier: 'Run released', customer: 'Pallet to despatch', demandPerDay: 9600, availableSecPerDay: 16 * H } } };
    await putStudy({ id: uid(), ...scope, facts: { flow: flow(7 * H) },
      uses: [{ id: uid(), kind: 'fix', ref: mapFixId, role: 'evidence', at: at(400), step: 'qa' }], startedAt: at(480), createdAt: t, updatedAt: t });
    await putStudy({ id: uid(), ...scope,
      facts: { flow: flow(1.5 * H).map(x => ({ ...x, source: (x.id === 'qa' || x.id === 'bag' || x.id === 'pak' ? 'timed' : 'carried') as 'timed' | 'carried' })) },
      uses: [{ id: uid(), kind: 'fix', ref: mapFixId, role: 'proof', at: at(60) }], startedAt: at(90), createdAt: t, updatedAt: t });
  }

  /* A SMED (lib/ie/changeover, tool 6), timed before and after a fix:
     twenty elements, one with the longest name there is, who did each (one
     the longest name there is) and where, a plan on six of them — two
     converted, three streamlined with targets (one in parallel by the
     fitter), one eliminated — the film reels pre-staged inside the stop as
     the fix's evidence (the element it was raised from), timed again as its
     proof with that element taken out and most of the rest still carried —
     before → after on the fix's card, the grid as a table in the Evidence
     appendix with the ladder, what the changeovers cost on three different
     shifts six days a week, and the interval read from six products. */
  if (size === 'huge' && coFixId) {
    const OP = { crew: ['Op 1'] }, OP2 = { crew: ['Op 2'] }, FIT = { crew: ['Fitter'] };
    const ROWS: CoRow[] = [
      ['Run out the last bags of Finest Red', 3, 'internal', 'timed', { ...OP, where: 'Bagger', fn: 'trial' }], ['Stop the line and isolate the bagger', 1, 'internal', 'timed', { ...OP, where: 'Bagger', fn: 'prepare' }],
      ['Fetch the 1.25 kg former from the store', 6, 'external', 'timed', { ...OP2, where: 'Stores', fn: 'prepare' }],
      ['Remove the 2 kg former tube', 7, 'internal', 'timed', { ...OP, where: 'Former', fn: 'mount', plan: { kind: 'streamline', how: 'clamps', targetSec: 3 * 60, note: 'quick-release collar' } }],
      ['Fit the 1.25 kg former tube and the collar', 9, 'internal', 'timed', { ...OP, where: 'Former', fn: 'mount', plan: { kind: 'streamline', how: 'clamps', targetSec: 4 * 60 } }],
      ['Pre-stage the film reels for Express — 2 reels, checked against the spec', 8, 'external', 'timed', { ...OP2, where: 'Film unit', fn: 'prepare' }],
      ['Change the film reel and thread it', 6, 'internal', 'timed', { crew: ['Łukasz Wójcik-Brontë, shift engineer (agency, nights cover)'], where: 'Film unit', fn: 'mount', plan: { kind: 'streamline', how: 'parallel', alongside: 'co4', crew: ['Fitter'], targetSec: 5 * 60 } }],
      ['Splice the new film', 2, 'internal', 'timed', { ...FIT, where: 'Film unit', fn: 'mount' }],
      [LONG[0], 4, 'internal', 'typed', { ...OP, where: 'The sealing jaws and the long name of the part on the drawing', fn: 'adjust', plan: { kind: 'convert', how: 'prepare', note: 'pre-heat the spare jaws' } }],
      ['Set the jaw temperature and the dwell', 3, 'internal', 'timed', { ...OP, where: 'Jaws', fn: 'adjust', plan: { kind: 'eliminate', how: 'no-adjust', note: 'settings recorded on the recipe' } }],
      ['Change the coder message for the Express date', 2, 'internal', 'timed', { ...OP, where: 'Coder', fn: 'adjust', plan: { kind: 'convert', how: 'standardise' } }],
      ['Print the Express labels', 4, 'external', 'timed', { ...OP2, where: 'Labeller', fn: 'prepare' }],
      ['Swap the case size on the case packer', 8, 'internal', 'timed', { ...FIT, where: 'Case packer', fn: 'mount' }], ['Fetch the Express cases (Łukasz Wójcik, stores)', 5, 'external', 'timed', { ...OP2, where: 'Stores', fn: 'prepare' }],
      ['Change the checkweigher programme', 2, 'internal', 'timed', { ...OP, where: 'Checkweigher', fn: 'adjust' }], ['Reset the metal detector for the new pack', 2, 'internal', 'timed', { ...OP, where: 'Metal detector', fn: 'adjust' }],
      ['First bags off — check the seal and the weight', 5, 'internal', 'timed', { crew: ['Op 1', 'Team leader'], where: 'Bagger', fn: 'trial' }], ['QA sign-off of the first pallet', 6, 'internal', 'typed', { crew: ['Quality'], where: 'Palletiser', fn: 'trial' }],
      ['Clean down the old film off-cuts', 3, 'external', 'timed', { ...OP2, where: 'Film unit', fn: 'prepare' }], ['Restart and run up to rate', 4, 'internal', 'timed', { ...OP, where: 'Bagger', fn: 'trial' }],
    ];
    const products: ChangeoverProduct[] = [
      { id: 'p1', product: 'Finest Red 2kg', demandPerDay: 9600, ratePerMin: 60 }, { id: 'p2', product: 'Tesco Express 1.25 kg', demandPerDay: 4500, ratePerMin: 50 },
      { id: 'p3', product: 'Maris Piper 2kg', runMinPerDay: 70 }, { id: 'p4', product: 'King Edward 2.5kg', runMinPerDay: 40 },
      { id: 'p5', product: 'Baby potatoes 1kg — "Jersey Royal" style, the long name on the spec', runMinPerDay: 25 }, { id: 'p6', product: 'Organic Rooster 2kg', runMinPerDay: 20 },
    ];
    const at = (k: number) => t - k * 60_000;
    const scope = { tool: 'changeover' as const, name: 'Finest Red 2kg → Tesco Express 1.25 kg', projectId: proj.id, product: 'Tesco Express 1.25 kg', machine: machines[0].name,
      ...(proj.workspaceIds?.[0] ? { workspaceId: proj.workspaceIds[0] } : {}) };
    const facts = { fromProduct: 'Finest Red 2kg', toProduct: 'Tesco Express 1.25 kg', products,
      running: { shiftsPerDay: 3, shiftHours: [8, 8, 6], shiftBreaks: [30, 30, 20], daysPerWeek: 6, weeksPerYear: 50 }, changeovers: { count: 3, per: 'day' as const },
      ratePerMin: 50, rateFrom: 'plate' as const, rateStation: 'Bagger' };
    await putStudy({ id: uid(), ...scope, facts: { ...facts, sequence: coSeq(ROWS, at(600), 'Zoë Brontë') },
      uses: [{ id: uid(), kind: 'fix', ref: coFixId, role: 'evidence', at: at(500), step: 'co5' }], startedAt: at(620), createdAt: t, updatedAt: t });
    /* timed again: the reels pre-staged outside — gone from the stop; the first
       four steps timed again, the rest still carried from before */
    const again = coSeq(ROWS, at(100), 'Zoë Brontë').filter(x => x.id !== 'co5')
      .map((x, i) => (i < 4 ? { ...x, source: 'timed' as const, ...(x.id === 'co4' ? { sec: 7 * 60 } : {}) } : (({ at: _a, who: _w, ...rest }) => { void _a; void _w; return { ...rest, source: 'carried' as const }; })(x)))
      .map(({ plan: _p, ...x }) => { void _p; return x; });
    await putStudy({ id: uid(), ...scope, facts: { ...facts, sequence: again },
      uses: [{ id: uid(), kind: 'fix', ref: coFixId, role: 'proof', at: at(60) }], startedAt: at(120), createdAt: t, updatedAt: t });
  }
  /* A SHIFT'S LOSSES on the rebuilt line (lib/ie/losses): a crowded shift —
     ten causes, long and awkward names, a cost model — the evidence for a fix
     raised from its biggest bar, and the next day's Shift 1 counted as its
     proof: before → after on the fix's card and the waterfall as a table in
     the Evidence appendix, twice. */
  if (size === 'huge' && lossFixId) {
    const ws = await createWorkspace('Line 2 — rebuild');
    await updateWorkspace({ ...ws, shifts: [{ name: 'Shift 1', start: '06:00', end: '14:00' }], crew: 6, labourRatePerHour: 15.2, labourBurden: 1.32, packsPerMin: 100, marginPerPack: 0.05 });
    const day = shiftOf(3), next = shiftOf(2);
    const CAUSES: [string, string, string, number][] = [
      ['Breakdown', 'Mechanical', 'Ilapak Vegatronic 6000 vertical form-fill-seal bagger', 26], ['Minor stop', 'Misfeed', 'Ishida CCW-RV-214W multihead weigher', 7],
      ['Minor stop', 'Sensor trip', 'Ishida CCW-RV-214W multihead weigher', 5], ['Waiting', 'No packaging / consumables', 'Brillopak UniPAKer robotic case packer', 9],
      ['Quality', 'Seal fault', 'Ilapak Vegatronic 6000 vertical form-fill-seal bagger', 4], ['Speed loss', 'Running below rated', 'Fanuc M-410 palletising robot', 6],
      ['Hygiene & cleaning', 'Unscheduled clean', 'Loma IQ4 metal detector', 8], ['Seal "A" & seal "B" — both re-cut', 'Rework', 'Herma 500 top-and-bottom labeller', 3],
      ['PN-4471-0098-2231-ABCD-EFGH-IJKL-MNOP-QRST-UVWX-REV-C-FINAL-FINAL2', 'Jam / blockage', 'Interroll infeed and accumulation conveyors', 2],
      ['Changeover', 'Size / format change', 'Ilapak Vegatronic 6000 vertical form-fill-seal bagger', 22],
    ];
    for (const [k, [cat, sub, asset, mins]] of CAUSES.entries()) await addObservation(lossStop(ws.id, day.from, 0.5 + k * 0.7, mins, cat, sub, asset, k === 0 ? 'Jaw heater tripped twice — Łukasz reset it' : undefined));
    for (const [k, [cat, sub, asset, mins]] of CAUSES.slice(1, 6).entries()) await addObservation(lossStop(ws.id, next.from, 1 + k, mins - 1, cat, sub, asset));
    await addObservation(lossStop(ws.id, next.from, 6.5, 18, 'Changeover', 'Size / format change', CAUSES[0][2]));
    const lossName = (c: LossCount) => `Shift 1, ${new Date(c.from).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
    await putStudy({ id: uid(), tool: 'losses', name: lossName(day), projectId: proj.id, workspaceId: ws.id, product: 'Finest Red 2kg — 60 micron perforated film',
      facts: { losses: { ...day, made: 33_400, rejects: 820 } }, uses: [{ id: uid(), kind: 'fix', ref: lossFixId, role: 'evidence', at: day.to, step: 'cause:Breakdown' }],
      startedAt: day.to, createdAt: t, updatedAt: t });
    await putStudy({ id: uid(), tool: 'losses', name: lossName(next), projectId: proj.id, workspaceId: ws.id, product: 'Finest Red 2kg — 60 micron perforated film',
      facts: { losses: { ...next, made: 38_900, rejects: 410 } }, uses: [{ id: uid(), kind: 'fix', ref: lossFixId, role: 'proof', at: next.to }],
      startedAt: next.to, createdAt: t, updatedAt: t });
  }

  /* What was found: sixty, on tests and steps, some long. */
  const items: TestItem[] = [];
  for (let i = 0; i < 60; i++) {
    const on = tests[(i * 7) % tests.length];
    items.push({
      id: uid(), projectId: proj.id, testId: on.id, kind: 'found',
      what: i % 4 ? pick(['Guard bracket the wrong size', 'Film tracking off to the left after a splice', 'E-stop label peeling', 'Regulator missing from the kit', 'No guard on the infeed shelf']) : LONG[i % LONG.length],
      owner: pick(WHO), sort: i, createdAt: t - (60 - i) * 3_600_000, updatedAt: t,
      /* Hours lost on some (lib/hoursLost) — so the plan's paper carries them. */
      ...(i % 3 === 0 ? { hoursLost: [0.5, 2, 1.5, 5, 3][i % 5] } : {}),
    });
  }
  items.push(...[0, 1, 2].map(i => ({ id: uid(), projectId: proj.id, testId: longest.id, kind: 'found' as const, what: LONG[i], owner: 'Ilapak UK', sort: 100 + i, createdAt: t, updatedAt: t })));
  /* CRITICAL PROBLEMS (lib/critical) — two open, one long in every field, and
     one sorted — so "Critical issues" under the answer runs long on paper. */
  items.push(
    { id: uid(), projectId: proj.id, testId: longest.id, kind: 'found', what: LONG[0], owner: 'Ilapak UK', critical: true, hoursLost: 6, impact: LONG[1],
      ways: [{ id: 'w1', what: LONG[2], agreed: true }, { id: 'w2', what: 'Ilapak send a second engineer to rewrite the programs in parallel' }], sort: 200, createdAt: t, updatedAt: t },
    { id: uid(), projectId: proj.id, testId: tests[0].id, kind: 'found', what: 'Programs cannot be copied over from the old line', critical: true, sort: 201, createdAt: t, updatedAt: t },
    { id: uid(), projectId: proj.id, testId: tests[1].id, kind: 'found', what: 'Power supply to the line undersized', critical: true, impact: 'Line could not run at speed.', doneAt: t, sort: 202, createdAt: t, updatedAt: t },
    { id: uid(), projectId: proj.id, testId: longest.id, kind: 'found', what: LONG[1], risk: true, couldLose: 100, impact: LONG[2],
      ways: [{ id: 'r1', what: 'Ask the client now whether the old validation carries over' }], sort: 203, createdAt: t, updatedAt: t },
  );
  /* PARTS OF THE PLAN on the first machine's Programs loaded — one with a
     day, one done, one with no day — so the plan's branches reach the paper. */
  const loaded = tests.find(x => x.kind === 'install' && x.gate === 'setup' && x.title === 'Programs loaded' && x.assetId === machines[0].id);
  if (loaded) items.push(
    { id: uid(), projectId: proj.id, testId: loaded.id, kind: 'next', what: 'First program to verify Tesco Express 1.25 packs through the de-nester and the pick and place', owner: 'Ilapak UK', due: iso(2), sort: 1, createdAt: t, updatedAt: t },
    { id: uid(), projectId: proj.id, testId: loaded.id, kind: 'next', what: 'Back up every program to the site server', owner: 'Dave', due: iso(-6), doneAt: t - 5 * 86_400_000, sort: 2, createdAt: t, updatedAt: t },
    { id: uid(), projectId: proj.id, testId: loaded.id, kind: 'next', what: 'Agree the recipe naming with the planners', sort: 3, createdAt: t, updatedAt: t },
    /* Programs with a status and what was seen — the commentary at its
       longest, so its end has to reach the paper. */
    { id: uid(), projectId: proj.id, testId: loaded.id, kind: 'next', what: 'PR-12 Express 1.25 kg', owner: 'Ilapak UK', sort: 4, createdAt: t, updatedAt: t,
      results: [{ is: 'baseline', on: iso(0), note: LONG[0], at: t }] },
    { id: uid(), projectId: proj.id, testId: loaded.id, kind: 'next', what: 'PR-04 Finest Red 2 kg', owner: 'Ilapak UK', sort: 5, createdAt: t, updatedAt: t,
      results: [{ is: 'failed', on: iso(0), note: LONG[1], at: t }] },
    { id: uid(), projectId: proj.id, testId: loaded.id, kind: 'next', what: 'PR-07 Baking Potatoes 2 kg', sort: 6, createdAt: t, updatedAt: t, doneAt: t,
      results: [{ is: 'passed', on: iso(0), note: 'Ran 45 ppm for the hour, no rejects', at: t }] },
  );
  for (const i of items) await putTestItem(i);

  /* Materials and programs: enough to run past a page. */
  await putMaterials(Array.from({ length: 25 }, (_, i): Material => ({
    id: uid(), projectId: proj.id, what: i % 5 ? `${pick(['Perforated film', 'Labels', 'Change parts', 'Spare belts', 'Ink and make-up'])} — ${pick(['2kg', '1.25kg', 'export run', 'set A'])}` : 'Changeover parts kit — 2kg to 1.25kg, complete and labelled, with the torque settings sheet',
    howMuch: `${2 + i} off`, from: pick(WHO), due: i % 6 ? iso(-10 + i * 2) : undefined, here: i < 8, sort: i, createdAt: t, updatedAt: t,
  })));
  await putPrograms(Array.from({ length: 40 }, (_, i): Program => ({
    id: uid(), projectId: proj.id, what: `P-${100 + i} ${pick(['perforation', 'recipe', 'case pattern', 'label layout'])} — ${pick(['2kg', '1.25kg', '500g'])}`,
    runs: pick(['Finest Red 2kg', 'Jacks Piper 1.25kg', 'Express White 500g']), assetId: machines[i % machines.length].id,
    state: pick(['needed', 'onMachine', 'proved'] as const), testOn: i % 4 ? iso(-6 + i) : undefined, from: pick(WHO), sort: i, createdAt: t, updatedAt: t,
  })));

  return { projectId: proj.id, testId: longest.id, fixId };
}


/* ---------------------------------------------------------------------------
 * A RANDOM JOB — for proving the reports on jobs nobody hand-picked.
 *
 * Every count from none to hundreds, every field sometimes empty, and the
 * things people actually type: a part number with no spaces in it, an emoji, a
 * name from the shop floor (Łukasz, Zoë, Ştefan), quotes and ampersands, a line
 * break pasted from a spreadsheet cell. scripts/report-stress.mjs --fuzz runs
 * these by seed, so a failure is the same failure on the next run.
 * ------------------------------------------------------------------------- */
const AWKWARD = [
  'PN-4471-0098-2231-ABCD-EFGH-IJKL-MNOP-QRST-UVWX-REV-C-FINAL-FINAL2',
  'Łukasz Wójcik', 'Zoë Brontë', 'Ştefan Ionescu', 'Agnieszka Szczęsna', 'Ørjan Høgh',
  'Seal "A" & seal "B" — both re-cut', 'Line 2 <infeed> & outfeed',
  'Guard fitted ✅ — retest 🔧', 'Two lines\npasted from a cell', '   ', '',
  'Within ±1.5 g · 2 m² · 50 µm · ½ turn · 90°',
  'Gap ≤ 0.5 mm, speed ≥ 120 ppm', '€12,400 of spares', 'Antonín Dvořák', 'Gülşen Öztürk',
];

export async function seedRandomJob(seed: number): Promise<ReportJob> {
  r = seed * 7919 % 2147483646 + 1;
  const t = Date.now();
  const many = (max: number) => (rand() < 0.15 ? 0 : rand() < 0.2 ? max : Math.floor(rand() * max * 0.5));
  const words = (n: number) => Array.from({ length: n }, () => pick(['seal', 'jaw', 'film', 'guard', 'belt', 'infeed', 'reject', 'weigher', 'coder', 'pallet', 'splice', 'tracking'])).join(' ');
  const say = () => { const x = rand(); return x < 0.12 ? pick(AWKWARD) : x < 0.2 ? '' : x < 0.35 ? words(40 + Math.floor(rand() * 60)) : words(3 + Math.floor(rand() * 12)); };
  const name = () => (rand() < 0.15 ? pick(AWKWARD) : pick(MACHINES)[0]);
  const proj = await createProject(rand() < 0.2 ? pick(AWKWARD) || 'Line X' : `Line ${seed} ${words(1 + Math.floor(rand() * 8))}`, '#1f63e0', rand() < 0.3 ? pick(AWKWARD) : 'Rowland', undefined, 'commissioning');
  await updateProject({ ...proj, plannedAt: rand() < 0.8 ? iso(-20 + Math.floor(rand() * 80)) : undefined, expectedAt: rand() < 0.85 ? iso(-10 + Math.floor(rand() * 90)) : undefined, updatedAt: t,
    ...(rand() < 0.5 ? { reportNote: rand() < 0.3 ? pick(AWKWARD) || 'Commentary' : words(5 + Math.floor(rand() * 120)), reportNoteAt: t } : {}) });

  const machines: Asset[] = Array.from({ length: many(16) }, (_, i) => ({
    id: uid(), projectId: proj.id, name: name() || `Machine ${i + 1}`, oem: rand() < 0.2 ? pick(AWKWARD) : pick(WHO),
    state: pick(['awaited', 'running', 'installed'] as const), sort: i, updatedAt: t,
  }));
  for (const a of machines) await putAsset(a);

  const tests: Test[] = [];
  const T = (o: Partial<Test> & { title: string }): Test => {
    const x: Test = { id: uid(), projectId: proj.id, outcome: 'planned', sort: tests.length, createdAt: t, updatedAt: t, ...o };
    tests.push(x); return x;
  };
  const day = () => (rand() < 0.2 ? undefined : iso(-40 + Math.floor(rand() * 90)));
  const outcome = () => pick(['planned', 'planned', 'passed', 'passed', 'failed', 'notRun'] as const);
  const STAGES = { install: ['Positioned and levelled', 'Air and power connected', 'Dry run', 'Sensors and controls checked (I/O)'], setup: ['Programs loaded', 'Change parts fitted'], handover: ['Manuals handed over', 'Operators trained'] };
  for (const a of machines) for (const [g, names] of Object.entries(STAGES)) {
    if (rand() < 0.25) continue;
    for (const title of names) {
      const o = outcome();
      T({ kind: 'install', gate: g === 'install' ? undefined : g as Test['gate'], title, assetId: a.id, plannedFor: day(), outcome: o, ranOn: o === 'planned' ? undefined : day(),
        // How it went, as the team said it — sometimes nothing, sometimes awkward, sometimes very long.
        result: rand() < 0.45 ? say() || undefined : undefined,
        // Files on it, now and then, named anything at all (docs/PANELS.md).
        ...(rand() < 0.2 ? { docs: docsNamed(Array.from({ length: 1 + Math.floor(rand() * 4) }, (_, i) => `${say() || 'file'}${i}.pdf`)) } : {}) });
    }
  }
  let firstProof: Test | undefined;
  for (let i = 0; i < many(60); i++) {
    const o = outcome();
    const x = T({ title: say() || `Test ${i + 1}`, assetId: machines.length && rand() < 0.85 ? pick(machines).id : undefined, withWhom: rand() < 0.5 ? pick(WHO) : undefined,
      plannedFor: day(), passesIf: say() || undefined, result: o === 'planned' ? undefined : say() || undefined, outcome: o, ranOn: o === 'planned' ? undefined : day(),
      product: rand() < 0.5 ? say() || undefined : undefined });
    firstProof ??= x;
  }
  let fixId: string | undefined;
  for (let i = 0; i < many(50); i++) {
    const o = pick(['planned', 'planned', 'passed', 'failed'] as const);
    const f = T({ kind: 'fix', title: say() || `Fix ${i + 1}`, assetId: machines.length ? pick(machines).id : undefined, withWhom: rand() < 0.7 ? pick([...WHO, ...AWKWARD]) : undefined,
      plannedFor: day(), passesIf: say() || undefined, outcome: o, ranOn: o === 'planned' ? undefined : day(), fromTestId: firstProof && rand() < 0.5 ? firstProof.id : undefined });
    fixId ??= f.id;
  }
  // A card always has one test to open, even on a job with none.
  const card = firstProof ?? T({ title: 'The only test', plannedFor: day() });
  for (const x of tests) await putTest(x);
  const items: TestItem[] = [];
  for (let i = 0; i < many(80); i++) {
    items.push({ id: uid(), projectId: proj.id, testId: pick(tests).id, kind: 'found', what: say() || 'Something seen', owner: rand() < 0.6 ? pick([...WHO, ...AWKWARD]) : undefined, sort: i, createdAt: t - i * 3_600_000, updatedAt: t,
      ...(i % 4 === 1 ? { hoursLost: [0.5, 1, 2, 3.5, 12.25][i % 5] } : {}),
      /* Now and then critical (lib/critical), with or without its story. */
      ...(i % 11 === 5 ? { risk: true, ...(rand() < 0.6 ? { couldLose: [4, 16, 100, 2.5][i % 4] } : {}), ...(rand() < 0.5 ? { impact: say() || 'Launch could slip' } : {}) } : {}),
      ...(i % 9 === 2 ? { critical: true, ...(rand() < 0.7 ? { impact: say() || 'Launch at risk' } : {}),
        ...(rand() < 0.6 ? { ways: [{ id: 'a', what: say() || 'A way round it', agreed: rand() < 0.5 }, { id: 'b', what: say() || 'Another way' }] } : {}) } : {}) });
  }
  for (const i of items) await putTestItem(i);
  await putMaterials(Array.from({ length: many(30) }, (_, i): Material => ({
    id: uid(), projectId: proj.id, what: say() || `Material ${i + 1}`, howMuch: rand() < 0.5 ? `${i} off` : undefined, from: rand() < 0.5 ? pick(WHO) : undefined, due: day(), here: rand() < 0.3, sort: i, createdAt: t, updatedAt: t,
  })));
  await putPrograms(Array.from({ length: many(40) }, (_, i): Program => ({
    id: uid(), projectId: proj.id, what: say() || `P-${i}`, assetId: machines.length ? pick(machines).id : undefined, state: pick(['needed', 'onMachine', 'proved'] as const), testOn: day(), sort: i, createdAt: t, updatedAt: t,
  })));
  return { projectId: proj.id, testId: card.id, fixId };
}


/* ---------------------------------------------------------------------------
 * A 6M JOB AT THE TWO EDGES — for proving the running line's client report.
 *
 * TINY is a job just started: one line, its measure and target, two readings,
 * two actions nobody has tied to a cause yet, and one problem just opened
 * from what was seen — one chain, a single answer someone told, still being
 * found; no fix yet — so each of its four parts (Problem · Why · Fix · Did it
 * work) has to say "not yet" honestly in a line rather than print empty
 * sections. (A job with no problem at all is the random jobs' and the unit
 * test's.)
 *
 * HUGE is a job a long way in: three lines (one named the way people really
 * type), two measures pulling opposite ways, twelve weeks of readings, a line
 * balance, two hundred timed stops (some tapped with their bone, most not),
 * six problems in every phase — one with thirty causes that cannot all be
 * drawn on the fish, one with none, one with the five whys written before
 * the fishbone and no cause on a bone, one removed by its owner whose
 * countermeasure stays on the board, one opened from a bar outside the vital
 * few for a reason (Case.source.why) — why-chains to roots (one ending in an
 * answer someone told), chains still being found and ruled out, causes
 * accepted from suggestions, countermeasures with their predictions, their
 * day in words and what happened (a prediction met, and one missed), a hold
 * that is holding, sixty actions on every bone and none, and the walk's snags. The awkward strings from the random jobs are in there too.
 * ------------------------------------------------------------------------- */
export interface SixMJob { projectId: string; lineId: string }

export async function seedSixMJob(size: 'tiny' | 'huge'): Promise<SixMJob> {
  r = 11;
  const t = Date.now();
  const huge = size === 'huge';
  const proj = await createProject(huge
    ? 'Site improvement — Lines 2A, 2B and the infeed: rate to 60 ppm and waste under 2% before the Christmas peak'
    : 'Line 4 — bagger to 60 ppm', '#1b7f5a', huge ? 'Łukasz Wójcik' : 'Rowland', undefined, 'board');
  const ppm: Measure = { id: uid(), name: 'Packs per minute', unit: 'ppm', direction: 'up', sort: 10 };
  const waste: Measure = { id: uid(), name: 'Waste', unit: '%', direction: 'down', sort: 20 };
  const periods: Period[] = quarters(iso(-60), uid);
  await updateProject({ ...proj, measures: huge ? [ppm, waste] : [ppm], periods, pareto: true, updatedAt: t });

  const target = (lineId: string, measureId: string, periodId: string, value: number): Target =>
    ({ id: uid(), projectId: proj.id, lineId, measureId, periodId, value, updatedAt: t });
  const reading = (lineId: string, measureId: string, at: string, value: number, note?: string): Reading =>
    ({ id: uid(), projectId: proj.id, lineId, measureId, at, value, note, createdAt: t, updatedAt: t });
  const act = (what: string, a: Partial<PaceTodoRow>): PaceTodoRow => ({
    id: uid(), projectId: proj.id, what, where: '', why: '', who: '', when: '', state: 'todo',
    createdAt: t, updatedAt: t, ...a,
  });

  if (!huge) {
    const ws = await createWorkspace('Line 4 — 6M');
    const line = await addPaceLine({ projectId: proj.id, key: '4', name: 'Line 4', owner: 'Rob Scott', sponsor: 'Tanya', sort: 0, workspaceId: ws.id });
    for (const p of periods) await putTarget(target(line.id, ppm.id, p.id, 60));
    await putReadings([reading(line.id, ppm.id, iso(-8), 47), reading(line.id, ppm.id, iso(-1), 49)]);
    for (const a of [
      act('Time the bagger stops for a week', { lineId: line.id, pillar: 'machine', who: 'Rob Scott', due: iso(6), why: 'So the Pareto says where the time goes' }),
      act('Walk the line with the night shift', { lineId: line.id, who: 'Tanya', when: 'next week' }),
    ]) await putPaceTodo(a);
    /* Just opened: one chain of one answer, told by the night shift. */
    await addCase({
      id: uid(), workspaceId: ws.id, title: 'Bagger stops at every film splice', path: [], baselineMsWeek: 0, status: 'open',
      openedAt: t - DAY, updatedAt: t, projectId: proj.id, lineId: line.id, source: { kind: 'observed' },
      causes: [{ id: uid(), m: 'material', text: 'The night shift say the new film reels are wound loose', grade: 'reported', status: 'suspected', whys: [], at: t - DAY, by: 'Rob Scott' }],
    });
    /* Yesterday's Shift 1 counted, two stops timed in it, no cost model on the
       line — the paper's table with no £ column, and most of it not yet explained. */
    const c = shiftOf(1, { ratePerMin: 60, plannedMin: 420, made: 23_100, rejects: 90, rateFrom: 'typed' });
    await addObservation(lossStop(ws.id, c.from, 2, 14, 'Minor stop', 'Film / packaging snag', 'Bagger', 'film splice'));
    await addObservation(lossStop(ws.id, c.from, 5, 6, 'Breakdown', 'Mechanical', 'Bagger'));
    await putStudy({ id: uid(), tool: 'losses', name: 'Shift 1, yesterday', projectId: proj.id, workspaceId: ws.id, facts: { losses: c }, uses: [], startedAt: c.to, createdAt: t, updatedAt: t });
    return { projectId: proj.id, lineId: line.id };
  }

  /* ------------------------------ the lines ------------------------------ */
  const wsA = await createWorkspace('Line 2A — 6M');
  const wsB = await createWorkspace('Line 2B — 6M');
  const wsC = await createWorkspace('Infeed — 6M');
  const lineA = await addPaceLine({
    projectId: proj.id, key: '2A', name: 'Line 2A', owner: 'Rob Scott', sponsor: 'Tanya', sort: 0, workspaceId: wsA.id,
    capacity: {
      targetPerMin: 60, plannedHoursPerWeek: 80,
      stations: [
        { id: 'c-bag', name: 'Ilapak Vegatronic 6000 vertical form-fill-seal bagger', kind: 'machine', unit: 'bags', contains: 1, rate: 70, ratePer: 'min', runningPct: 82, source: 'timed', note: 'Timed over a week of nights' },
        { id: 'c-wgh', name: 'Ishida multihead weigher', kind: 'machine', unit: 'bags', contains: 1, rate: 75, ratePer: 'min', source: 'plate' },
        { id: 'c-chk', name: 'Checkweigher', kind: 'machine', unit: 'bags', contains: 1, rate: 90, ratePer: 'min', runningPct: 97, source: 'plate' },
        { id: 'c-bsk', name: 'Basketer', kind: 'machine', unit: 'baskets', contains: 12, rate: 5.5, ratePer: 'min', runningPct: 94, source: 'timed' },
        { id: 'c-car', name: 'Carrier', kind: 'people', unit: 'baskets', contains: 1, cycleSec: 20, perCycle: 2, source: 'timed', note: 'Sustained pace, not best lap' },
        { id: 'c-pal', name: 'Palletiser', kind: 'machine', unit: 'pallets', contains: 40, rate: 8, ratePer: 'hour', source: 'plate' },
      ],
    },
  });
  const lineB = await addPaceLine({ projectId: proj.id, key: '2B', name: 'Line 2B', owner: 'Agnieszka Szczęsna', sponsor: 'Tanya', sort: 1, workspaceId: wsB.id });
  const lineC = await addPaceLine({ projectId: proj.id, key: 'IN', name: 'Line 2 <infeed> & outfeed', owner: 'Ştefan Ionescu', sponsor: 'Gülşen Öztürk', sort: 2, workspaceId: wsC.id });
  const lines = [lineA, lineB, lineC];

  for (const [i, p] of periods.entries()) {
    await putTarget(target(lineA.id, ppm.id, p.id, 58 + i * 2));
    await putTarget(target(lineB.id, ppm.id, p.id, 48 + i * 3));
    await putTarget(target(lineC.id, ppm.id, p.id, 55));
    await putTarget(target(lineA.id, waste.id, p.id, 2));
    await putTarget(target(lineB.id, waste.id, p.id, 2));
  }
  const rows: Reading[] = [];
  for (let w = 0; w < 12; w++) {
    const at = iso(-7 * (12 - w));
    rows.push(reading(lineA.id, ppm.id, at, Math.round((44 + w * 0.9 + (rand() - 0.5) * 4) * 10) / 10, w === 5 ? 'Film supplier changed this week — Within ±1.5 g · 50 µm' : undefined));
    rows.push(reading(lineB.id, ppm.id, at, Math.round((45 + w * 0.3 + (rand() - 0.5) * 3) * 10) / 10));
    rows.push(reading(lineC.id, ppm.id, at, Math.round((58 + (rand() - 0.5) * 3) * 10) / 10));
    if (w % 2 === 0) rows.push(reading(lineA.id, waste.id, at, Math.round((3.4 - w * 0.12) * 100) / 100));
    if (w % 3 === 0) rows.push(reading(lineB.id, waste.id, at, 2.6 - w * 0.05));
  }
  await putReadings(rows);

  /* ----------------------------- timed stops ----------------------------- */
  const CATS: [string, string, string, string][] = [
    ['Minor stop', 'Film tracking', 'Bagger', 'film wandered off the former after a splice'],
    ['Minor stop', 'Bag jam at the jaws', 'Bagger', ''],
    ['Minor stop', 'Photo-eye missed the print mark', 'Bagger', ''],
    ['Breakdown', 'Seal jaw heater', 'Bagger', 'jaw ran cool on the rear face'],
    ['Breakdown', 'Weigher bucket stuck', 'Weigher', ''],
    ['Changeover', 'Size change 2kg to 1.25kg', 'Bagger', 'parts kit incomplete'],
    ['Waiting', 'Starved upstream', 'Weigher', 'no operator on the infeed at start-up'],
    ['Quality', 'Checkweigher rejecting good packs', 'Checkweigher', 'not calibrated since the move'],
    ['Hygiene & cleaning', 'Product build-up on the chute', 'Weigher', 'humid in the hall, product sticks'],
    ['Speed loss', 'Running below rated speed', 'Bagger', 'rated speed on the HMI is wrong'],
  ];
  const BONES: SixM[] = ['people', 'machine', 'method', 'material', 'measurement', 'environment'];
  for (let i = 0; i < 200; i++) {
    const [category, subcategory, asset, note] = CATS[Math.floor(Math.pow(rand(), 1.6) * CATS.length)];
    const ws = [wsA, wsA, wsA, wsB, wsC][i % 5];
    const at = t - Math.floor(rand() * 27) * DAY - Math.floor(rand() * 20) * 3_600_000;
    const mins = category === 'Breakdown' ? 20 + rand() * 60 : category === 'Changeover' ? 30 + rand() * 30 : 1 + rand() * 8;
    const o: Observation = {
      id: uid(), workspaceId: ws.id, category, subcategory, asset, shift: rand() < 0.6 ? 'Nights' : 'Days',
      startedAt: at, endedAt: at + mins * 60_000, durationMs: Math.round(mins * 60_000), timing: 'stopwatch', count: 1,
      note: note && rand() < 0.5 ? note : undefined, media: [], createdAt: t, updatedAt: t,
      causeM: rand() < 0.3 ? pick(BONES) : undefined,
    };
    await addObservation(o);
  }

  /* ------------------------------ the walk ------------------------------- */
  const snagIds: string[] = [];
  for (const [li, ws] of [wsA, wsB, wsC].entries()) {
    const seg: Segment = { id: uid(), workspaceId: ws.id, name: `walk ${li + 1}`, durationS: 120, sequence: 1, videoKey: `seed-video-${uid()}`, createdAt: t, updatedAt: t };
    await addSegment(seg);
    const frames: SnagAsset[] = ['Bagger former', 'Weigher discharge chute', 'Checkweigher reject arm', 'Line 2 <infeed> & outfeed'].map((name, k) => ({
      id: uid(), workspaceId: ws.id, segmentId: seg.id, name, timestampS: 10 + k * 20, stillKey: `seed-still-${uid()}`, createdAt: t, updatedAt: t,
    }));
    for (const fr of frames) await addSnagAsset(fr);
    const N = li === 0 ? 14 : 6;
    for (let k = 0; k < N; k++) {
      const st = (['open', 'open', 'in_progress', 'closed'] as const)[k % 4];
      const s: Snag = {
        id: uid(), workspaceId: ws.id, assetId: frames[k % frames.length].id, xPct: 20 + k * 3, yPct: 40,
        problem: k % 5 === 0 ? pick(AWKWARD.filter(x => x.trim())) : k % 3 === 0 ? LONG[k % LONG.length]
          : pick(['Guard on the infeed shelf missing', 'Film reel brake worn', 'Photo-eye bracket loose — vibrates', 'Air leak at the jaw cylinder', 'Product build-up under the chute', 'No standard for the splice']),
        proposedSolution: k % 2 ? pick(['Fit the guard', 'Replace the brake pads', 'Re-bracket and lock', 'Clean down at every break']) : undefined,
        status: st, owner: pick(['Dave (shift fitter)', 'Łukasz Wójcik', 'Engineering', 'Zoë Brontë']), raisedAt: t - (k + 1) * 2 * DAY,
        closedAt: st === 'closed' ? t - k * DAY : undefined, linkedObsIds: [], updatedAt: t,
      };
      await addSnag(s);
      snagIds.push(s.id);
    }
  }

  /* A LINE STANDARD — its crew is what the People bone is counted against —
     and, on the huge job, its work timed (lib/ie/balance): Op 1 over takt,
     a cause on the Method bone accepted from it. */
  const sixStdId = uid(), sixBalId = uid();
  await putStandard({
    id: sixStdId, projectId: proj.id, product: 'Finest Red 2kg', ...(huge && lineA.workspaceId ? { workspaceId: lineA.workspaceId } : {}),
    marks: [
      { id: uid(), kind: 'person', x: 20, y: 40, label: 'Op 1', task: 'Load film, splice at the end of each reel' },
      { id: uid(), kind: 'person', x: 50, y: 60, label: 'Op 2', task: 'Infeed — keep the weigher fed' },
      { id: uid(), kind: 'person', x: 80, y: 50, label: 'Op 3', task: 'Basketer and carrying' },
    ],
    sort: 1, createdAt: t, updatedAt: t,
  });
  if (huge) {
    const laps = (xs: number[]) => xs.map((sec, k) => ({ id: uid(), sec, at: t - (40 - k) * 60_000, who: 'Zoë Brontë' }));
    await putStudy({ id: sixBalId, tool: 'balance', name: 'Finest Red 2kg', projectId: proj.id, standardId: sixStdId,
      agreed: { balance: { taktSec: 12, allowance: 0.1 } }, uses: [], startedAt: t - 3_600_000, createdAt: t, updatedAt: t,
      facts: { steps: [
        { id: uid(), order: 0, name: 'Load film, splice at the end of each reel', who: 'Op 1', laps: laps([11.6, 11.8, 11.7, 11.9, 11.6]) },
        { id: uid(), order: 1, name: 'Infeed — keep the weigher fed', who: 'Op 2', laps: laps([8.0, 8.1, 7.9, 8.2, 8.0]) },
        { id: uid(), order: 2, name: 'Basketer and carrying', who: 'Op 3', typedSec: 7 },
      ] } });
  }

  /* ------------------------------ problems ------------------------------- */
  const why = (text: string, grade?: Grade): Why => ({ id: uid(), text, grade });
  const cause = (m: SixM, text: string, o: Partial<Cause> = {}): Cause => ({
    id: uid(), m, text, grade: 'reported', status: 'suspected', whys: [], at: t - Math.floor(rand() * 20) * DAY, by: pick(['Rob Scott', 'Łukasz Wójcik', 'Zoë Brontë']), ...o,
  });
  const problem = (title: string, line: typeof lineA, o: Partial<Case>): Case => ({
    id: uid(), workspaceId: line.workspaceId as string, title, path: [], baselineMsWeek: 3 * 3_600_000, status: 'open',
    openedAt: t - 30 * DAY, updatedAt: t, projectId: proj.id, lineId: line.id, causes: [], ...o,
  });

  // 1 — the biggest bar: drilled to roots, countermeasures open.
  const c1 = [
    cause('machine', 'Film tracks off the former after every splice', {
      grade: 'measured', status: 'confirmed', root: true, source: { kind: 'pareto', label: 'Minor stop · Film tracking · Bagger', minutesWeek: 96 },
      whys: [
        why('The splice leaves a step in the film edge', 'observed'),
        why('Operators splice by hand with no jig', 'observed'),
        why('The operator didn\'t follow the splice method', 'reported'),
        why('There is no written splice standard and nobody was trained on one', 'counted'),
      ],
    }),
    cause('people', 'Night shift is one short at the infeed for the first hour', {
      grade: 'counted', status: 'confirmed', root: true, source: { kind: 'standard', label: 'Line standard — 3 people, 2 on shift' },
      whys: [why('Agency cover not booked for the 22:00 start', 'counted'), why('Nobody owns the night rota since the reorganisation', 'reported')],
    }),
    cause('method', 'Op 1 carries 12.9 s against a 12.0 s takt — over by 0.9 s', { grade: 'measured', status: 'confirmed', source: { kind: 'study', ref: `${sixBalId}#Op 1`, label: 'Finest Red 2kg' } }),
    cause('material', 'New film from the second supplier is 3 µm thinner', { grade: 'measured', status: 'suspected', source: { kind: 'material', label: 'Perforated film — 2kg' } }),
    cause('machine', 'Photo-eye bracket loose — vibrates', { grade: 'observed', status: 'confirmed', source: { kind: 'snag', label: 'Bagger former' } }),
    cause('method', 'No standard for the splice', { grade: 'observed', status: 'confirmed' }),
    cause('measurement', 'Short stops under a minute are not logged on days', { grade: 'counted', status: 'suspected', source: { kind: 'reading', label: '4 days with nothing logged' } }),
    cause('environment', 'Hall humidity over 80% when the doors are open', { grade: 'reported', status: 'ruled_out' }),
    cause('people', 'Łukasz Wójcik — only trained splicer on nights', { grade: 'counted', status: 'suspected' }),
    cause('method', 'Seal "A" & seal "B" — both re-cut', { grade: 'reported', status: 'ruled_out' }),
  ];
  const p1 = problem('Bagger minor stops — film tracking', lineA, {
    source: { kind: 'pareto', category: 'Minor stop', subcategory: 'Film tracking', asset: 'Bagger' },
    path: [{ dimension: 'category', value: 'Minor stop' }], causes: c1,
  });

  // 2 — closed, the check set and looked at: holding.
  const c2 = [
    cause('method', 'Changeover 2kg → 1.25kg done three different ways', {
      grade: 'measured', status: 'confirmed', root: true,
      whys: [why('Each shift learned it from whoever showed them', 'observed'), why('No changeover standard existed for the bagger', 'counted')],
    }),
    cause('material', 'Changeover parts kit incomplete — the 1.25kg former kept in stores', { grade: 'observed', status: 'confirmed' }),
    cause('people', 'Fitter called from another line mid-change', { grade: 'reported', status: 'ruled_out' }),
  ];
  const p2 = problem('Changeover 2kg → 1.25kg takes 48 minutes', lineA, {
    source: { kind: 'gap', measureId: ppm.id }, causes: c2, status: 'closed', closedAt: t - 12 * DAY,
    hold: { what: 'Time one changeover a week against the 25-minute standard', who: 'Rob Scott', everyDays: 7, since: iso(-12), lastChecked: iso(-2), standardUpdated: true },
  });

  // 3 — closed, the check not looked at for weeks.
  const c3 = [
    cause('measurement', 'Checkweigher not calibrated since the line was moved', {
      grade: 'measured', status: 'confirmed', root: true,
      whys: [why('Calibration is on the old asset number', 'counted'), why('The move did not carry the calibration schedule across', 'counted')],
    }),
  ];
  /* A bar outside the vital few, opened for a reason that is not minutes. */
  const p3 = problem('Checkweigher rejects good packs', lineB, {
    source: { kind: 'pareto', category: 'Quality', subcategory: 'Checkweigher rejecting good packs', asset: 'Checkweigher', why: 'quality — good packs thrown away, and a customer complaint about short weights.' },
    causes: c3, status: 'closed', closedAt: t - 40 * DAY, openedAt: t - 70 * DAY,
    hold: { what: 'Calibration check every Monday with the test weights', who: 'Agnieszka Szczęsna', everyDays: 7, since: iso(-40), lastChecked: iso(-30) },
  });

  // 4 — seen on the floor, still finding the cause; awkward words.
  const p4 = problem('Line 2 <infeed> & outfeed starves the weigher at start-up', lineC, {
    source: { kind: 'observed' },
    causes: [
      cause('people', 'Two lines\npasted from a cell — no operator on the infeed', { grade: 'observed', status: 'suspected' }),
      cause('machine', 'Gap ≤ 0.5 mm, speed ≥ 120 ppm on the infeed belt', { grade: 'reported', status: 'suspected' }),
      cause('environment', 'Within ±1.5 g · 2 m² · 50 µm · ½ turn · 90°', { grade: 'reported', status: 'suspected' }),
    ],
  });

  // 5 — a fishbone with far more than fits on the drawing.
  const many: Cause[] = [];
  for (let i = 0; i < 30; i++) {
    const m = BONES[i % 6];
    const status: CauseStatus = i % 7 === 0 ? 'ruled_out' : i % 3 === 0 ? 'confirmed' : 'suspected';
    many.push(cause(m, i % 4 === 0 ? LONG[i % LONG.length] : `${pick(['Weigher bucket', 'Discharge chute', 'Timing hopper', 'Infeed vibrator', 'Product feed'])} ${pick(['sticks', 'runs dry', 'overfills', 'jams', 'bridges'])} — case ${i + 1}`, {
      grade: (['measured', 'counted', 'observed', 'reported'] as const)[i % 4], status,
      root: i === 3 || i === 9,
      whys: i === 3 || i === 9 ? [why(LONG[(i + 1) % LONG.length], 'observed'), why('Nobody checks the chute at the break', 'counted'), why('The cleaning standard does not mention the chute', 'counted')] : [],
      source: i % 5 === 0 ? { kind: 'pareto', label: 'Breakdown · Weigher bucket stuck · Weigher', minutesWeek: 40 + i } : undefined,
    }));
  }
  const p5 = problem('Weigher breakdowns and build-up on the chute — PN-4471-0098-2231-ABCD-EFGH-IJKL-MNOP-QRST-UVWX-REV-C-FINAL-FINAL2', lineB, {
    source: { kind: 'pareto', category: 'Breakdown', subcategory: 'Weigher bucket stuck', asset: 'Weigher' }, causes: many,
  });

  // 6 — just opened from the constraint: nothing on any bone yet.
  const p6 = problem('Basketer limits Line 2A', lineA, { source: { kind: 'constraint', station: 'Basketer' }, causes: [], openedAt: t - DAY });

  // 7 — written before the fishbone: the old five whys and no cause on a bone yet.
  const p7 = problem('Labels peel off the 1.25kg bag in the chiller', lineB, {
    source: { kind: 'observed' }, openedAt: t - 50 * DAY,
    whys: ['The label adhesive is not rated for 2 °C', 'The label spec was copied from the ambient range', '', 'Nobody signs off a label spec against where the pack is stored.'],
  });

  // 8 — removed by its owner; its countermeasure stays on the board by bone.
  const gone = problem('Opened by mistake — a duplicate of the film tracking', lineA, { source: { kind: 'observed' }, deletedAt: t - DAY,
    causes: [cause('machine', 'Duplicate cause', { status: 'confirmed' })] });

  for (const p of [p1, p2, p3, p4, p5, p6, p7, gone]) await addCase(p);

  /* --------------------------- countermeasures --------------------------- */
  const ref = (p: Case, c: Cause) => `${p.id}:${c.id}`;
  const counter: PaceTodoRow[] = [
    act('Make a splice jig and fit it at the reel stand', { lineId: lineA.id, pillar: 'machine', who: 'Engineering', due: iso(-3), causeRef: ref(p1, c1[0]), caseId: p1.id, expect: 'Film tracking stops down from 18 a week to under 5', why: 'The splice leaves a step in the film edge' }),
    act('Write the splice standard and train every shift on it', { lineId: lineA.id, pillar: 'method', who: 'Rob Scott', due: iso(9), causeRef: ref(p1, c1[0]), caseId: p1.id, expect: 'Every splicer signed off by the end of the month' }),
    // A prediction missed: done, and what happened says it did not do what was expected.
    act('Slow the bagger to 55 ppm for a minute after each splice', { lineId: lineA.id, pillar: 'method', who: 'Rob Scott', due: iso(-10), state: 'done', doneOn: iso(-9), causeRef: ref(p1, c1[0]), caseId: p1.id, expect: 'No tracking stop after a splice', outcome: 'Still nine tracking stops a week — slowing down did not stop the film wandering' }),
    // A prediction met.
    act('Book agency cover for the 22:00 start', { lineId: lineA.id, pillar: 'people', who: 'Tanya', due: iso(-6), state: 'done', doneOn: iso(-5), causeRef: ref(p1, c1[1]), caseId: p1.id, expect: 'Three on the infeed from the first minute', outcome: 'Booked to Christmas — first week ran with three from 22:00' }),
    act('Re-bracket the photo-eye and lock it', { lineId: lineA.id, pillar: 'machine', who: 'Dave (shift fitter)', due: iso(2), state: 'waiting', causeRef: ref(p1, c1[3]), caseId: p1.id, expect: 'No missed print marks over a week' }),
    act('One changeover standard for 2kg to 1.25kg, on the line', { lineId: lineA.id, pillar: 'method', who: 'Rob Scott', due: iso(-20), state: 'done', doneOn: iso(-14), causeRef: ref(p2, c2[0]), caseId: p2.id, expect: 'Changeover 48 → 25 minutes', outcome: 'Down to 22 minutes, three changeovers in a row' }),
    act('Keep the 1.25kg former kit at the line, shadow-boarded', { lineId: lineA.id, pillar: 'material', who: 'Stores', due: iso(-18), state: 'done', doneOn: iso(-16), causeRef: ref(p2, c2[1]), caseId: p2.id, expect: 'Nothing fetched from stores during a changeover' }),
    act('Move the calibration schedule to the new asset number', { lineId: lineB.id, pillar: 'measurement', who: 'Agnieszka Szczęsna', due: iso(-45), state: 'done', doneOn: iso(-42), causeRef: ref(p3, c3[0]), caseId: p3.id, expect: 'Good packs rejected: 40 a shift → under 5', outcome: 'Rejects fell to 3 a shift for a fortnight' }),
    act('Clean the chute at every break and add it to the standard', { lineId: lineB.id, pillar: 'method', who: 'Zoë Brontë', due: iso(-1), causeRef: ref(p5, many[3]), caseId: p5.id, expect: LONG[1] }),
    act('Check the spare film reels for edge damage', { lineId: lineA.id, pillar: 'material', who: 'Stores', when: 'after the stock count', causeRef: ref(gone, (gone.causes as Cause[])[0]), caseId: gone.id, expect: 'No damaged reel reaches the line' }),
    act('Trial a chiller-rated label on one shift', { lineId: lineB.id, pillar: 'material', who: 'Agnieszka Szczęsna', state: 'waiting', when: 'when the samples land', caseId: p7.id, expect: 'No peeled labels over a week in the chiller' }),
    act('Guard fitted ✅ — retest 🔧', { lineId: lineB.id, pillar: 'machine', who: 'Ørjan Høgh', due: iso(4), causeRef: ref(p5, many[9]), caseId: p5.id, expect: 'Gap ≤ 0.5 mm, speed ≥ 120 ppm' }),
  ];
  for (const a of counter) await putPaceTodo(a);

  /* A CAPABILITY STUDY ON THE RUNNING LINE (lib/study): the checkweigher's
     thirty packs as how we know the calibration cause and the countermeasure
     was needed, and the same thirty after as its proof — before → after on
     the board's action, the cause's panel and the report's countermeasure. */
  const calib = counter.find(a => a.causeRef === ref(p3, c3[0]));
  if (huge && calib) {
    const agreed = { readings: { kind: 'limits' as const, unit: 'g', nominal: 400, lower: 400, upper: 404, count: 30 } };
    const scope = { tool: 'capability' as const, name: 'Weight accuracy 400 g', projectId: proj.id, machine: 'Checkweigher', agreed };
    await putStudy({ id: uid(), ...scope, facts: { readings: THIRTY.map((value, k) => ({ id: uid(), value, at: t - (90 - k) * 60_000, who: 'Agnieszka Szczęsna' })) },
      uses: [{ id: uid(), kind: 'cause', ref: ref(p3, c3[0]), role: 'evidence', at: t - 60 * 60_000 }, { id: uid(), kind: 'action', ref: calib.id, role: 'evidence', at: t - 60 * 60_000 }],
      startedAt: t - 120 * 60_000, createdAt: t, updatedAt: t });
    await putStudy({ id: uid(), ...scope, facts: { readings: THIRTY.map((v, k) => ({ id: uid(), value: Math.round((v + 1) * 10) / 10, at: t - (40 - k) * 60_000, who: 'Zoë Brontë' })) },
      uses: [{ id: uid(), kind: 'action', ref: calib.id, role: 'proof', at: t - 40 * 60_000 }], startedAt: t - 45 * 60_000, createdAt: t, updatedAt: t });
  }

  /* A VALUE STREAM MAP ON THE RUNNING LINE, and a countermeasure raised from
     its biggest wait — the pallet held for QA release — on the Measurement
     bone (whose work it is), walked again as its proof: before → after on
     the board's action and the report's countermeasure. */
  if (huge) {
    const H = 3600;
    const flow = (qa: number) => [
      { id: 'rel', order: 0, name: 'Release the run to the line', who: ['Planning'], where: 'Office', kind: 'operation' as const, value: 'needed' as const, cycleSec: 600, batch: 9600, waitSec: 20 * H },
      { id: 'bag', order: 1, name: 'Bag and seal', who: ['Machine'], where: 'Bagger', kind: 'operation' as const, value: 'adds' as const, cycleSec: 1.3 },
      { id: 'pak', order: 2, name: 'Pack the bags into the case', who: ['Op 2'], where: 'Case packer', kind: 'operation' as const, value: 'adds' as const, cycleSec: 8, batch: 6 },
      { id: 'qa', order: 3, name: 'Pallet waits for QA release', who: ['Quality'], where: 'Palletiser', kind: 'wait' as const, waitSec: qa },
      { id: 'dsp', order: 4, name: 'Pallet to despatch', who: ['Forklift driver'], where: 'Despatch', kind: 'move' as const, value: 'needed' as const, cycleSec: 180, batch: 720 },
    ];
    const qaAct = act('Pallet waits for QA release (Palletiser) — 6.0 h wait', { lineId: lineA.id, pillar: 'measurement', where: 'Palletiser', who: 'Agnieszka Szczęsna', due: iso(5),
      why: 'Value stream map — Run released to pallet away', expect: 'Pallet waits for QA release: 6.0 h wait — shorter or gone, walked again on the same map' });
    await putPaceTodo(qaAct);
    const scope = { tool: 'map' as const, name: 'Run released to pallet away', projectId: proj.id, ...(lineA.workspaceId ? { workspaceId: lineA.workspaceId } : {}),
      agreed: { map: { scope: 'line' as const, supplier: 'Run released', customer: 'Pallet to despatch', demandPerDay: 9600, availableSecPerDay: 16 * H } } };
    await putStudy({ id: uid(), ...scope, facts: { flow: flow(6 * H) },
      uses: [{ id: uid(), kind: 'action', ref: qaAct.id, role: 'evidence', at: t - 300 * 60_000, step: 'qa' }], startedAt: t - 360 * 60_000, createdAt: t, updatedAt: t });
    await putStudy({ id: uid(), ...scope, facts: { flow: flow(2 * H).map(x => ({ ...x, source: (x.id === 'qa' ? 'typed' : 'carried') as 'typed' | 'carried' })) },
      uses: [{ id: uid(), kind: 'action', ref: qaAct.id, role: 'proof', at: t - 30 * 60_000 }], startedAt: t - 40 * 60_000, createdAt: t, updatedAt: t });
  }

  /* A CHANGEOVER ON THE RUNNING LINE (tool 6): on the tiny job one step,
     typed; on the huge job eight steps timed, a countermeasure raised from
     the external work inside the stop (on Method), timed again as its proof
     with that step outside — before → after on the board's action and the
     report's countermeasure, the steps as a table in the Evidence appendix. */
  {
    const coScope = { tool: 'changeover' as const, name: huge ? 'Finest Red 2kg → Express 1.25 kg' : '2 kg → 1.25 kg', projectId: proj.id, product: 'Express 1.25 kg',
      ...(lineA.workspaceId ? { workspaceId: lineA.workspaceId } : {}) };
    if (!huge) {
      await putStudy({ id: uid(), ...coScope, facts: { fromProduct: '2 kg', toProduct: '1.25 kg', sequence: coSeq([['Change the former tube', 12, 'internal', 'typed']], t) },
        uses: [], startedAt: t - 900_000, createdAt: t, updatedAt: t });
    } else {
      const ROWS: CoRow[] = [
        ['Stop and clear the former', 4, 'internal', 'timed', { crew: ['Op 1'], where: 'Former', fn: 'mount' }],
        ['Fetch the next former from the store', 5, 'external', 'timed', { crew: ['Op 2'], where: 'Stores', fn: 'prepare' }],
        ['Change the former tube', 10, 'internal', 'timed', { crew: ['Op 1'], where: 'Former', fn: 'mount', plan: { kind: 'streamline', how: 'clamps', targetSec: 4 * 60 } }],
        ['Pre-stage the film reels', 7, 'external', 'timed', { crew: ['Op 2'], where: 'Film unit', fn: 'prepare' }],
        ['Change the film reel', 6, 'internal', 'timed', { crew: ['Op 1'], where: 'Film unit', fn: 'mount', plan: { kind: 'streamline', how: 'parallel', alongside: 'co2', crew: ['Fitter'], targetSec: 5 * 60 } }],
        ['Set the jaw temperature', 3, 'internal', 'timed', { crew: ['Op 1'], where: 'Jaws', fn: 'adjust', plan: { kind: 'convert', how: 'prepare', note: 'pre-heat the spare jaws' } }],
        ['Print the new labels', 3, 'external', 'timed', { crew: ['Op 2'], where: 'Labeller', fn: 'prepare' }],
        ['First bags and check the seal', 4, 'internal', 'timed', { crew: ['Op 1', 'Team leader'], where: 'Jaws', fn: 'trial' }],
      ];
      const products: ChangeoverProduct[] = [
        { id: 'p1', product: 'Finest Red 2kg', demandPerDay: 7200, ratePerMin: 60 }, { id: 'p2', product: 'Express 1.25 kg', demandPerDay: 3000, ratePerMin: 50 },
        { id: 'p3', product: 'Maris Piper 2kg', runMinPerDay: 50 }, { id: 'p4', product: 'King Edward 2.5kg', runMinPerDay: 40 }, { id: 'p5', product: 'Baby potatoes 1kg', runMinPerDay: 30 },
      ];
      const facts = { fromProduct: 'Finest Red 2kg', toProduct: 'Express 1.25 kg', products,
        running: { shiftsPerDay: 2, hoursPerShift: 8, breakMin: 30, daysPerWeek: 5, weeksPerYear: 48 }, changeovers: { count: 6, per: 'week' as const },
        ratePerMin: 100, rateFrom: 'plate' as const, rateStation: 'Bagger' };
      const coAct = act('Pre-stage the film reels — external, 7 min', { lineId: lineA.id, pillar: 'method', who: 'Rob Scott', due: iso(6),
        why: 'Changeover — Finest Red 2kg → Express 1.25 kg', expect: 'Pre-stage the film reels: done while the line runs — the changeover timed again without it inside' });
      await putPaceTodo(coAct);
      await putStudy({ id: uid(), ...coScope, facts: { ...facts, sequence: coSeq(ROWS, t - 500 * 60_000, 'Rob Scott') },
        uses: [{ id: uid(), kind: 'action', ref: coAct.id, role: 'evidence', at: t - 400 * 60_000, step: 'co3' }], startedAt: t - 520 * 60_000, createdAt: t, updatedAt: t });
      await putStudy({ id: uid(), ...coScope, facts: { ...facts, sequence: coSeq(ROWS, t - 50 * 60_000, 'Rob Scott').filter(x => x.id !== 'co3').map(({ plan: _p, ...x }) => { void _p; return x; }) },
        uses: [{ id: uid(), kind: 'action', ref: coAct.id, role: 'proof', at: t - 20 * 60_000 }], startedAt: t - 60 * 60_000, createdAt: t, updatedAt: t });
    }
  }
  /* A SHIFT'S LOSSES ON LINE 2A (lib/ie/losses): a shift four days ago with
     its own stops on top of whatever the random log put in its window, a cost
     model on the line, a countermeasure raised from its changeovers and the
     next day's count as its proof — before → after on the board and in the
     report, the waterfall as a table in the Evidence appendix. */
  if (huge) {
    await updateWorkspace({ ...wsA, shifts: [{ name: 'Shift 1', start: '06:00', end: '14:00' }], crew: 5, labourRatePerHour: 14.8, labourBurden: 1.3, packsPerMin: 60, marginPerPack: 0.06 });
    const day = shiftOf(4, { ratePerMin: 70 }), next = shiftOf(3, { ratePerMin: 70 });
    for (const [h, mins, cat, sub, asset] of [[1, 34, 'Changeover', 'Size change 2kg to 1.25kg', 'Bagger'], [2.5, 12, 'Minor stop', 'Film tracking', 'Bagger'], [4, 21, 'Breakdown', 'Seal jaw heater', 'Bagger'],
      [5.5, 6, 'Waiting', 'Starved upstream', 'Weigher']] as const) await addObservation(lossStop(wsA.id, day.from, h, mins, cat, sub, asset));
    await addObservation(lossStop(wsA.id, next.from, 1, 19, 'Changeover', 'Size change 2kg to 1.25kg', 'Bagger'));
    const coAct = act('Changeovers on the Bagger — one changeover standard, kit at the line', { lineId: lineA.id, pillar: 'method', where: 'Bagger', who: 'Rob Scott', due: iso(6),
      why: 'Loss count — Shift 1', expect: 'Changeovers on the Bagger: 34 min a shift — fewer on the next shift counted' });
    await putPaceTodo(coAct);
    const name = (c: LossCount) => `Shift 1, ${new Date(c.from).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
    await putStudy({ id: uid(), tool: 'losses', name: name(day), projectId: proj.id, workspaceId: wsA.id, product: 'Finest Red 2kg',
      facts: { losses: { ...day, made: 24_600, rejects: 350 } }, uses: [{ id: uid(), kind: 'action', ref: coAct.id, role: 'evidence', at: day.to, step: 'changeover' }],
      startedAt: day.to, createdAt: t, updatedAt: t });
    await putStudy({ id: uid(), tool: 'losses', name: name(next), projectId: proj.id, workspaceId: wsA.id, product: 'Finest Red 2kg',
      facts: { losses: { ...next, made: 27_300, rejects: 280 } }, uses: [{ id: uid(), kind: 'action', ref: coAct.id, role: 'proof', at: next.to }],
      startedAt: next.to, createdAt: t, updatedAt: t });
  }

  /* ------------------------------ the board ------------------------------ */
  const PILLARS: (PaceTodoRow['pillar'] | undefined)[] = ['people', 'machine', 'method', 'material', 'measurement', 'environment', 'plant', 'process', undefined];
  const WHATS = ['Weekly 5S walk on the line', 'Replace the worn sealing jaw', 'Second operator on the infeed at start-up', 'Order the thicker film for trial', 'Fix the stop logging on the HMI',
    'Close the hall doors on humid days', 'Re-teach the robot pick positions for the 1.25kg case', 'Audit the crew against the standard every Monday', LONG[0], 'Seal "A" & seal "B" — both re-cut', '€12,400 of spares'];
  for (let i = 0; i < 50; i++) {
    const done = i % 5 === 0, waiting = i % 7 === 0 && !done;
    const due = i % 9 === 0 ? undefined : iso(-12 + i);
    await putPaceTodo(act(pick(WHATS), {
      lineId: i % 4 === 3 ? undefined : lines[i % 3].id, pillar: PILLARS[i % PILLARS.length],
      who: i % 11 === 0 ? '' : pick(['Rob Scott', 'Engineering', 'Tanya', 'Łukasz Wójcik', 'Antonín Dvořák', 'Gülşen Öztürk']),
      due, when: due ? '' : pick(['before the Christmas peak', 'when the part lands', '']),
      why: i % 3 === 0 ? pick(['Film breaks at the splice', 'Losing rate at start-up', LONG[2], 'Within ±1.5 g · 2 m² · 50 µm · ½ turn · 90°']) : '',
      state: done ? 'done' : waiting ? 'waiting' : 'todo', doneOn: done ? iso(-1 - (i % 25)) : undefined,
      outcome: done && i % 2 === 0 ? 'Worked — two fewer stops a shift' : undefined,
      caseId: i % 13 === 0 ? p4.id : undefined,
    }));
  }
  return { projectId: proj.id, lineId: lineA.id };
}

/* ---------------------------------------------------------------------------
 * A RANDOM 6M JOB — for `report-stress.mjs --fuzz`, as seedRandomJob is for
 * stage gate. Any shape: no line or four, a measure or none, no problem or
 * eight, a fishbone empty or crowded (up to forty causes, long and awkward
 * words, roots with long why-chains), old whys written before the fishbone,
 * a problem removed with its countermeasure left behind, up to seventy
 * actions on every bone and none with dates, no dates and days in words,
 * timed stops, a line balance, and the walk's snags.
 * ------------------------------------------------------------------------- */
export async function seedRandomSixMJob(seed: number): Promise<SixMJob & { lineId?: string }> {
  r = seed * 104729 % 2147483646 + 1;
  const t = Date.now();
  const many = (max: number) => (rand() < 0.15 ? 0 : rand() < 0.2 ? max : Math.floor(rand() * max * 0.5));
  const words = (n: number) => Array.from({ length: n }, () => pick(['seal', 'jaw', 'film', 'guard', 'belt', 'infeed', 'reject', 'weigher', 'coder', 'pallet', 'splice', 'tracking', 'chute', 'basket'])).join(' ');
  const say = () => { const x = rand(); return x < 0.12 ? pick(AWKWARD) : x < 0.18 ? '' : x < 0.3 ? words(30 + Math.floor(rand() * 50)) : words(3 + Math.floor(rand() * 10)); };
  const some = () => say() || words(4);
  const who = () => (rand() < 0.15 ? '' : rand() < 0.3 ? pick(AWKWARD) : pick(['Rob Scott', 'Tanya', 'Engineering', 'Łukasz Wójcik', 'Stores']));
  const proj = await createProject(rand() < 0.2 ? pick(AWKWARD).trim() || 'Line X' : `Line ${seed} ${words(1 + Math.floor(rand() * 8))}`, '#1b7f5a', rand() < 0.3 ? pick(AWKWARD) : 'Rowland', undefined, 'board');
  const ppm: Measure = { id: uid(), name: 'Packs per minute', unit: 'ppm', direction: 'up', sort: 10 };
  const waste: Measure = { id: uid(), name: 'Waste', unit: '%', direction: 'down', sort: 20 };
  const measures = rand() < 0.2 ? [] : rand() < 0.5 ? [ppm] : [ppm, waste];
  const periods: Period[] = quarters(iso(-60), uid);
  await updateProject({ ...proj, measures, periods, pareto: true, updatedAt: t });

  const lines = [];
  const nLines = rand() < 0.1 ? 0 : 1 + Math.floor(rand() * 4);
  for (let i = 0; i < nLines; i++) {
    const ws = await createWorkspace(`Line ${i + 1} — 6M`);
    const st = Array.from({ length: rand() < 0.5 ? 0 : 2 + Math.floor(rand() * 8) }, () => ({
      id: uid(), name: rand() < 0.2 ? pick(AWKWARD) : pick(MACHINES)[0], kind: 'machine' as const, unit: 'bags', contains: 1,
      rate: 40 + Math.floor(rand() * 60), ratePer: 'min' as const, runningPct: rand() < 0.5 ? 70 + Math.floor(rand() * 30) : undefined, source: 'plate' as const,
    }));
    lines.push(await addPaceLine({
      projectId: proj.id, key: String(i + 1), name: rand() < 0.2 ? pick(AWKWARD).trim() || `Line ${i + 1}` : `Line ${i + 1}`, owner: who(), sort: i, workspaceId: ws.id,
      ...(st.length ? { capacity: { targetPerMin: 60, plannedHoursPerWeek: 80, stations: st } } : {}),
    }));
  }
  for (const l of lines) {
    for (const m of measures) {
      if (rand() < 0.2) continue;
      for (const p of periods) if (rand() < 0.8) await putTarget({ id: uid(), projectId: proj.id, lineId: l.id, measureId: m.id, periodId: p.id, value: m === ppm ? 50 + Math.floor(rand() * 20) : 2, updatedAt: t });
      const n = many(16);
      await putReadings(Array.from({ length: n }, (_, k) => ({ id: uid(), projectId: proj.id, lineId: l.id, measureId: m.id, at: iso(-7 * (n - k)), value: Math.round((m === ppm ? 40 + rand() * 25 : 1 + rand() * 3) * 10) / 10, createdAt: t, updatedAt: t })));
    }
    for (let k = 0; k < many(80); k++) {
      const at = t - Math.floor(rand() * 27) * DAY - Math.floor(rand() * 20) * 3_600_000, mins = 1 + rand() * 50;
      await addObservation({
        id: uid(), workspaceId: l.workspaceId as string, category: rand() < 0.1 ? pick(AWKWARD).trim() || 'Minor stop' : pick(['Minor stop', 'Breakdown', 'Changeover', 'Waiting', 'Quality']),
        subcategory: words(2), asset: pick(['Bagger', 'Weigher', 'Checkweigher']), shift: rand() < 0.5 ? 'Nights' : 'Days',
        startedAt: at, endedAt: at + mins * 60_000, durationMs: Math.round(mins * 60_000), timing: 'stopwatch', count: 1, media: [], createdAt: t, updatedAt: t,
      });
    }
    for (let k = 0; k < many(14); k++) {
      const seg: Segment = { id: uid(), workspaceId: l.workspaceId as string, name: 'walk', durationS: 60, sequence: k, videoKey: `seed-video-${uid()}`, createdAt: t, updatedAt: t };
      if (k === 0) await addSegment(seg);
      const fr: SnagAsset = { id: uid(), workspaceId: l.workspaceId as string, segmentId: seg.id, name: rand() < 0.2 ? pick(AWKWARD) : 'Bagger former', timestampS: k, stillKey: `seed-still-${uid()}`, createdAt: t, updatedAt: t };
      await addSnagAsset(fr);
      const stt = pick(['open', 'in_progress', 'closed'] as const);
      await addSnag({ id: uid(), workspaceId: l.workspaceId as string, assetId: fr.id, xPct: 30, yPct: 40, problem: some(), status: stt, owner: who() || undefined,
        raisedAt: t - Math.floor(rand() * 40) * DAY, closedAt: stt === 'closed' ? t - DAY : undefined, linkedObsIds: [], updatedAt: t });
    }
  }

  const BONES: SixM[] = ['people', 'machine', 'method', 'material', 'measurement', 'environment'];
  const cases: Case[] = [];
  for (let i = 0; i < (lines.length ? many(8) : 0); i++) {
    const line = pick(lines);
    const causes: Cause[] = Array.from({ length: many(40) }, () => {
      const status = pick(['confirmed', 'suspected', 'suspected', 'ruled_out'] as const);
      const root = status === 'confirmed' && rand() < 0.4;
      return {
        id: uid(), m: pick(BONES), text: some(), grade: pick(['measured', 'counted', 'observed', 'reported'] as const), status, root,
        whys: root || rand() < 0.3 ? Array.from({ length: 1 + Math.floor(rand() * 6) }, () => ({ id: uid(), text: some(), grade: rand() < 0.5 ? pick(['measured', 'counted', 'observed', 'reported'] as const) : undefined })) : [],
        at: t - Math.floor(rand() * 30) * DAY, by: who() || undefined,
      };
    });
    const closed = rand() < 0.3;
    cases.push({
      id: uid(), workspaceId: line.workspaceId as string, title: some(), path: [], baselineMsWeek: rand() < 0.5 ? Math.floor(rand() * 5 * 3_600_000) : 0,
      status: closed ? 'closed' : 'open', openedAt: t - Math.floor(rand() * 60) * DAY, closedAt: closed ? t - DAY : undefined, updatedAt: t,
      projectId: proj.id, lineId: line.id, causes: rand() < 0.15 ? [] : causes,
      source: rand() < 0.3 && measures.length ? { kind: 'gap', measureId: ppm.id } : rand() < 0.5 ? { kind: 'pareto', category: 'Minor stop', asset: 'Bagger', ...(rand() < 0.4 ? { why: some() } : {}) } : { kind: 'observed' },
      ...(rand() < 0.2 ? { whys: Array.from({ length: 1 + Math.floor(rand() * 5) }, () => (rand() < 0.1 ? '' : some())) } : {}),
      ...(closed && rand() < 0.7 ? { hold: { what: some(), who: who() || undefined, everyDays: pick([1, 7, 14]), since: iso(-20), lastChecked: rand() < 0.6 ? iso(-Math.floor(rand() * 30)) : undefined } } : {}),
      ...(rand() < 0.1 ? { deletedAt: t - DAY } : {}),
    });
  }
  for (const c of cases) await addCase(c);

  const PILLARS: (PaceTodoRow['pillar'] | undefined)[] = ['people', 'machine', 'method', 'material', 'measurement', 'environment', 'plant', 'process', undefined];
  for (let i = 0; i < many(70); i++) {
    const c = cases.length && rand() < 0.4 ? pick(cases) : undefined;
    const cause = c?.causes?.length && rand() < 0.7 ? pick(c.causes) : undefined;
    const state = pick(['todo', 'todo', 'waiting', 'done'] as const);
    const due = rand() < 0.4 ? undefined : iso(-20 + Math.floor(rand() * 50));
    await putPaceTodo({
      id: uid(), projectId: proj.id, lineId: lines.length && rand() < 0.8 ? pick(lines).id : undefined, what: some(), where: '', why: rand() < 0.3 ? say() : '',
      who: who(), when: due ? '' : rand() < 0.6 ? say() : '', due, state, doneOn: state === 'done' ? iso(-Math.floor(rand() * 20)) : undefined,
      outcome: state === 'done' && rand() < 0.6 ? say() : undefined, pillar: pick(PILLARS),
      caseId: c?.id, causeRef: c && cause ? `${c.id}:${cause.id}` : undefined, expect: rand() < 0.5 ? say() : undefined,
      createdAt: t, updatedAt: t,
    });
  }
  /* A shift's loss count, now and then (lib/ie/losses): any line, any day in
     the log's four weeks, sometimes not yet counted, sometimes made more than
     the rate allows, the stops in its window whatever the log holds — every
     figure it puts on paper reconciled by the stress run. */
  if (lines.length && rand() < 0.6) {
    const l = pick(lines);
    const c = shiftOf(Math.floor(rand() * 27), { ratePerMin: 40 + Math.floor(rand() * 60), plannedMin: 300 + Math.floor(rand() * 180), rateFrom: rand() < 0.5 ? 'standard' : 'typed',
      ...(rand() < 0.15 ? {} : { made: Math.floor(rand() * 40_000) }), ...(rand() < 0.5 ? { rejects: Math.floor(rand() * 900) } : {}), ...(rand() < 0.3 ? { shift: pick(AWKWARD).trim() || undefined } : {}) });
    await putStudy({ id: uid(), tool: 'losses', name: rand() < 0.2 ? pick(AWKWARD) || 'Loss count' : 'Loss count', projectId: proj.id, workspaceId: l.workspaceId as string,
      facts: { losses: c }, uses: [], startedAt: c.to, createdAt: t, updatedAt: t });
  }
  return { projectId: proj.id, lineId: lines[0]?.id as string };
}
