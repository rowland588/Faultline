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
} from '../db';
import type { Asset, Test, TestItem } from '../lib/testing';
import type { Material } from '../lib/materials';
import type { Program } from '../lib/programs';

const uid = () => crypto.randomUUID();
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
const WHO = ['Ilapak UK', 'Ishida Europe', 'Domino UK', 'Mettler-Toledo', 'Brillopak', 'the site', 'Dave (shift fitter)', 'Herma UK'];

export interface ReportJob { projectId: string; testId: string; fixId?: string }

export async function seedReportJob(size: 'tiny' | 'huge'): Promise<ReportJob> {
  r = 7;
  const t = Date.now();
  const proj = await createProject(size === 'tiny' ? 'Line 9 new labeller' : 'Line 2 — complete rebuild: bagging, weighing, coding, inspection, case packing and palletising',
    '#1f63e0', 'Rowland', undefined, 'commissioning');
  await updateProject({ ...proj, plannedAt: iso(size === 'tiny' ? 40 : 20), expectedAt: iso(size === 'tiny' ? 40 : 34), updatedAt: t,
    description: size === 'huge' ? 'Full line rebuild with eight suppliers on site at once' : undefined });

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
    T({ kind: 'install', title: 'Positioned and levelled', assetId: machines[0].id, plannedFor: iso(3) });
    const only = tests[0];
    for (const x of tests) await putTest(x);
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
      T({
        kind: 'install', gate: g, title, assetId: a.id, withWhom: a.oem,
        plannedFor: roll < 0.15 ? undefined : iso(day),
        ranOn: done ? iso(day) : undefined,
        outcome: done ? (roll < 0.08 ? 'failed' : 'passed') : 'planned',
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
  // One test with everything long — the card that has to take it.
  const longest = T({
    title: 'Full line rate trial at 65 ppm on the 2kg Finest Red bag with the new perforation plan and the upgraded jaw heater fitted',
    assetId: machines[0].id, withWhom: 'Ilapak UK with Ishida Europe and Domino UK on site', plannedFor: iso(-3), ranOn: iso(-3),
    passesIf: LONG.join(' — and '), product: 'Finest Red 2kg — 60 micron perforated film, reel batch 4471',
    result: RESULTS.slice(0, 3).join(' Then: ') + ' ' + LONG[2], outcome: 'failed',
  });

  /* Fixes: thirty, long problems, due across the month. */
  let fixId: string | undefined;
  for (let i = 0; i < 30; i++) {
    const a = machines[i % machines.length];
    const due = -8 + i;
    const f = T({
      kind: 'fix', title: pick(['Re-cut the seal jaw', 'Send the regulator', 'Re-track the film and re-splice', 'Fit the upgraded jaw heater', 'Replace the worn timing belt on the infeed', 'Re-teach the robot pick positions for the 1.25kg case']),
      assetId: a.id, withWhom: pick(WHO), plannedFor: iso(due), fromTestId: tests.find(x => !x.kind && x.assetId === a.id)?.id,
      passesIf: i % 3 ? pick(RESULTS) : LONG[i % LONG.length], outcome: due < -2 ? 'passed' : 'planned', ranOn: due < -2 ? iso(due) : undefined,
    });
    fixId ??= f.id;
  }
  for (const x of tests) await putTest(x);

  /* What was found: sixty, on tests and steps, some long. */
  const items: TestItem[] = [];
  for (let i = 0; i < 60; i++) {
    const on = tests[(i * 7) % tests.length];
    items.push({
      id: uid(), projectId: proj.id, testId: on.id, kind: 'found',
      what: i % 4 ? pick(['Guard bracket the wrong size', 'Film tracking off to the left after a splice', 'E-stop label peeling', 'Regulator missing from the kit', 'No guard on the infeed shelf']) : LONG[i % LONG.length],
      owner: pick(WHO), sort: i, createdAt: t - (60 - i) * 3_600_000, updatedAt: t,
    });
  }
  items.push(...[0, 1, 2].map(i => ({ id: uid(), projectId: proj.id, testId: longest.id, kind: 'found' as const, what: LONG[i], owner: 'Ilapak UK', sort: 100 + i, createdAt: t, updatedAt: t })));
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
  await updateProject({ ...proj, plannedAt: rand() < 0.8 ? iso(-20 + Math.floor(rand() * 80)) : undefined, expectedAt: rand() < 0.85 ? iso(-10 + Math.floor(rand() * 90)) : undefined, updatedAt: t });

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
      T({ kind: 'install', gate: g === 'install' ? undefined : g as Test['gate'], title, assetId: a.id, plannedFor: day(), outcome: o, ranOn: o === 'planned' ? undefined : day() });
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
    items.push({ id: uid(), projectId: proj.id, testId: pick(tests).id, kind: 'found', what: say() || 'Something seen', owner: rand() < 0.6 ? pick([...WHO, ...AWKWARD]) : undefined, sort: i, createdAt: t - i * 3_600_000, updatedAt: t });
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
