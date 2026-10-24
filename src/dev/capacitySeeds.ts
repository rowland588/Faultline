/* LINE CAPACITY AT THE EDGES — for proving its paper at every size
 * (scripts/report-stress.mjs; lib/capacityPaper, lib/capacityPaperPdf).
 *
 * TINY: one line, a product made in Line capacity with nothing written yet
 * and one with a single station — what the page says before there is a
 * finding. HUGE: three lines and seven products, one of them a long way in
 * — twenty stations in four units, every way a speed is known, rejects and
 * stops, a station whose chain breaks and one counted one-for-one, the V's
 * margin agreed, four what-ifs (one on the board), three shifts that differ,
 * an agreed changeover, the labour typed, the bottleneck walked six times
 * and the people's work timed over takt — with long names and the letters a
 * European site writes them in. RANDOM-n: any number of products and
 * stations, names from the awkward list, by seed.
 *
 * The ordinary seed (seed.ts) carries the middle: Line 7's products.
 * TypeScript on purpose, for the reason seed.ts gives; nothing in the app
 * imports this, so it is not in the bundle. */
import { putStandard, putStudy, updateWorkspace } from '../db';
import { addLineToFactory } from '../lib/lines';
import { withWhatIfStations, type Capacity, type Station, type WhatIf } from '../tools/linebalance/capacity';
import type { Standard, StandardMark } from '../tools/linestandard/standard';
import type { Shift } from '../types';
import { uid } from '../lib/ids';

export interface CapacitySeed {
  /** Every product seeded, by line. */
  lines: { wsId: string; name: string; standardIds: string[] }[];
  /** The product whose own page is opened. */
  one: { wsId: string; id: string };
}

const AWKWARD = [
  'PN-4471-0098-2231-ABCD-EFGH-IJKL-MNOP-QRST-UVWX-REV-C-FINAL-FINAL2',
  'Łukasz Wójcik', 'Zoë Brontë', 'Ştefan Ionescu', 'Agnieszka Szczęsna', 'Ørjan Høgh',
  'Seal "A" & seal "B" — both re-cut', 'Line 2 <infeed> & outfeed',
  'Guard fitted ✅ — retest 🔧', 'Two lines\npasted from a cell', '   ', '',
  'Within ±1.5 g · 2 m² · 50 µm · ½ turn · 90°', 'Gap ≤ 0.5 mm, speed ≥ 120 ppm', '€12,400 of spares', 'Antonín Dvořák', 'Gülşen Öztürk',
];
const MACHINES = [
  'Ilapak Vegatronic 6000 vertical form-fill-seal bagger', 'Ishida CCW-RV-214W multihead weigher', 'Domino Ax350i continuous inkjet coder',
  'Mettler-Toledo C33 PlusLine checkweigher', 'Loma IQ4 metal detector', 'Brillopak UniPAKer robotic case packer', 'Herma 500 top-and-bottom labeller',
  'Robopac Helix 4 stretch wrapper', 'Fanuc M-410 palletising robot', 'Interroll infeed and accumulation conveyors', 'Cama IF318 top-load cartoner', 'Sick vision inspection station',
];

const person = (label: string, task?: string, x = 30, y = 40): StandardMark => ({ id: uid(), kind: 'person', x, y, label, ...(task ? { task } : {}) });

async function product(wsId: string, name: string, capacity: Capacity | undefined, o: Partial<Standard> = {}): Promise<string> {
  const t = Date.now(), id = uid();
  await putStandard({ id, projectId: '', workspaceId: wsId, product: name, marks: [], ...(capacity ? { capacity } : {}), sort: t, createdAt: t, updatedAt: t, ...o });
  return id;
}

const m = (name: string, unit: string, contains: number, speed: Partial<Station>, x: Partial<Station> = {}): Station =>
  ({ id: uid(), name, kind: 'machine', unit, contains, ...speed, ...x });
const p = (name: string, unit: string, contains: number, speed: Partial<Station>, x: Partial<Station> = {}): Station =>
  ({ id: uid(), name, kind: 'people', unit, contains, ...speed, ...x });

/** A what-if with these stations, stored as its changes against the line. */
const whatIf = (asRun: Station[], name: string, change: (s: Station[]) => Station[], x: Partial<WhatIf> = {}): WhatIf =>
  withWhatIfStations(asRun, { id: uid(), name, stations: [], createdAt: Date.now(), ...x }, change(asRun.map(s => ({ ...s }))));

export async function seedCapacityFor(size: string): Promise<CapacitySeed> {
  if (size === 'tiny') {
    const ws = await addLineToFactory('Line 1', 'Packing');
    const empty = await product(ws.id, 'Spuds 1kg', { stations: [] });
    const one = await product(ws.id, 'Spuds 2.5kg', { stations: [m('Bagger', 'bags', 1, { rate: 40, ratePer: 'min', source: 'plate' })] });
    return { lines: [{ wsId: ws.id, name: ws.name, standardIds: [empty, one] }], one: { wsId: ws.id, id: one } };
  }
  if (size.startsWith('random-')) return seedRandomCapacity(Number(size.slice(7)) || 1);

  /* ------------------------------- HUGE ------------------------------- */
  const t = Date.now();
  const A = await addLineToFactory('Line 2 <infeed> & outfeed — the long packing hall by the goods-in doors', 'Packing');
  const SHIFTS: Shift[] = [
    { name: 'Days — Łukasz Wójcik’s crew', start: '06:00', end: '14:00', breakMin: 30 },
    { name: 'Lates', start: '14:00', end: '22:00', breakMin: 45 },
    { name: 'Nights (relief covers the breaks)', start: '22:00', end: '06:00', relief: true },
    { name: 'Weekend overtime', start: '07:00', end: '12:00' },
  ];
  await updateWorkspace({ ...A, shifts: SHIFTS, crew: 9, labourRatePerHour: 13.2, labourBurden: 1.25 });
  /* twenty stations in four units: bags, trays of 8, cases of 4 trays, pallets of 60 cases */
  const st: Station[] = [
    m(MACHINES[0], 'bags', 1, { rate: 72, ratePer: 'min', source: 'plate' }, { runningPct: 88, note: 'Plate on the frame, read 2 Oct' }),
    m(MACHINES[1], 'bags', 1, { rate: 80, ratePer: 'min', source: 'plate' }, { runningPct: 96 }),
    m(MACHINES[2], 'bags', 1, { rate: 1.6, ratePer: 'sec', source: 'timed' }, { note: 'Timed over 200 packs — Within ±1.5 g · 50 µm' }),
    m(MACHINES[3], 'bags', 1, { rate: 95, ratePer: 'min', source: 'plate' }, { goodPct: 98.5, runningPct: 97 }),
    m(MACHINES[4], 'bags', 1, { rate: 6000, ratePer: 'hour', source: 'plate' }, { goodPct: 99.6 }),
    m(MACHINES[9], 'bags', 1, { rate: 110, ratePer: 'min', source: 'estimate' }, { bufferAfter: 120, note: 'A guess until the conveyor’s plate is found' }),
    p('Tray loader — Zoë Brontë', 'trays', 8, { cycleSec: 6.5, perCycle: 1, source: 'timed' }, { crew: 2, note: 'Sustained pace, not best lap' }),
    p('Tray checker', 'trays', 1, { cycleSec: 3, perCycle: 1, source: 'standard' }, { note: 'standard time, from the line balance' }),
    m(MACHINES[10], 'trays', 1, { rate: 18, ratePer: 'min', source: 'plate' }, { runningPct: 91 }),
    m(MACHINES[5], 'cases', 4, { rate: 5, ratePer: 'min', source: 'timed' }, { runningPct: 90, note: 'Seal "A" & seal "B" — both re-cut, timed after' }),
    m(MACHINES[6], 'cases', 1, { rate: 6.5, ratePer: 'min', source: 'plate' }, { bufferAfter: 20 }),
    p('Case checker — Ştefan Ionescu', 'cases', 1, { cycleSec: 8, perCycle: 1, source: 'timed' }),
    m(MACHINES[11], 'cases', 1, { rate: 9, ratePer: 'min', source: 'plate' }),
    m('Case conveyor to the robot cell', 'cases', 1, { rate: 12, ratePer: 'min', source: 'plate' }),
    m(MACHINES[8], 'pallets', 60, { rate: 9, ratePer: 'hour', source: 'plate' }, { runningPct: 95 }),
    m(MACHINES[7], 'pallets', 1, { rate: 14, ratePer: 'hour', source: 'plate' }),
    p('Pallet labeller — Gülşen Öztürk', 'pallets', 1, { cycleSec: 90, perCycle: 1, source: 'timed' }),
    p('FLT driver to dispatch', 'pallets', 1, { cycleSec: 240, perCycle: 1, source: 'estimate' }, { crew: 2 }),
    /* a station counted one-for-one in a new word: a missing number, said so */
    m('Dispatch wrap check', 'loads', 1, { rate: 20, ratePer: 'hour', source: 'plate' }),
    /* and one with no conversion: the chain breaks there, said so */
    m('Trailer loading bay', 'trailers', 0, { rate: 2, ratePer: 'hour', source: 'estimate' }),
  ];
  const cap: Capacity = {
    targetPerMin: 70, plannedHoursPerWeek: 120, vMarginPct: 10, stations: st,
    labour: { people: 14, ratePerHour: 14.75 },
    changeovers: [{ id: uid(), from: 'Maris Piper 2kg — Tall', steps: [], minutes: 24, agreedAt: t - 3 * 86_400_000, by: 'Agnieszka Szczęsna', fromStudyId: 'gone' }],
  };
  cap.whatIfs = [
    whatIf(st, 'Second case packer beside the first', s => s.map(x => (x.name === MACHINES[5] ? { ...x, crew: 2 } : x)), { action: { id: uid(), raisedAt: t } }),
    whatIf(st, 'Tray loader at 5 s — the new tray magazine', s => s.map(x => (x.name.startsWith('Tray loader') ? { ...x, cycleSec: 5 } : x))),
    whatIf(st, 'Robot cell taken out — palletised by hand (Ørjan Høgh’s idea)', s => s.filter(x => x.name !== MACHINES[8])
      .map(x => (x.name === MACHINES[7] ? { ...x, contains: 60 } : x)), { targetPerMin: 60 }),
    whatIf(st, 'Changes nothing', s => s),
  ];
  const marks = [person('Op 1', 'Load film, splice at the end of each reel'), person('Zoë Brontë', 'Tray loading', 50, 60), person('Op 3', 'Case check'), person('Op 4')];
  const big = await product(A.id, 'Finest Red 2kg — Ilapak Vegatronic 6000 with the new µ-perforated film, PN-4471-0098-2231-ABCD', cap, { marks });
  /* the bottleneck walked six times: the case packer blocked rarely, the stations before it blocked, after it starved */
  const who = st.map(x => x.name);
  const taps = [0, 1, 2, 3, 4, 5].flatMap(k => who.map((w, i) => ({ id: uid(), at: t - (6 - k) * 3_600_000, who: w,
    activity: i < 9 ? (k % 3 ? 'blocked' : 'working') : i === 9 ? 'working' : (k % 2 ? 'starved' : 'working') })));
  await putStudy({ id: uid(), tool: 'sampling', name: 'Bottleneck walk — Finest Red 2kg', product: 'Finest Red 2kg', standardId: big, workspaceId: A.id,
    agreed: { sampling: { who, activities: ['working', 'starved', 'blocked', 'down'], marginPts: 10, from: t - 8 * 3_600_000, to: t, prompts: [], walk: true } },
    facts: { taps }, uses: [], startedAt: t - 8 * 3_600_000, createdAt: t, updatedAt: t });
  /* the people's work, timed against takt — Op 1 over it */
  const laps = (xs: number[]) => xs.map((sec, k) => ({ id: uid(), sec, at: t - (40 - k) * 60_000, who: 'Łukasz Wójcik' }));
  await putStudy({ id: uid(), tool: 'balance', name: 'Finest Red 2kg', standardId: big, workspaceId: A.id,
    agreed: { balance: { taktSec: 7, allowance: 0.1 } }, uses: [], startedAt: t - 3_600_000, createdAt: t, updatedAt: t,
    facts: { steps: [
      { id: uid(), order: 0, name: 'Load film, splice at the end of each reel', who: 'Op 1', laps: laps([7.6, 7.9, 7.7, 7.8, 7.6]) },
      { id: uid(), order: 1, name: 'Load trays — Zoë’s side', who: 'Zoë Brontë', laps: laps([5.1, 5.2, 5.0, 5.3, 5.1]) },
      { id: uid(), order: 2, name: 'Case check', who: 'Op 3', typedSec: 4 },
      { id: uid(), order: 3, name: 'Pallet labels and the paperwork for dispatch, every pallet, both sides', who: 'Op 4', laps: laps([6.9, 7.2, 7.1, 7.0, 7.3]) },
    ] } });
  /* more products on the same line: one short, one met, one with nothing yet */
  const a2 = await product(A.id, 'Maris Piper 2kg — Tall', { targetPerMin: 60, stations: [
    m('Bagger', 'bags', 1, { rate: 70, ratePer: 'min', source: 'plate' }),
    m('Basketer', 'baskets', 12, { rate: 5, ratePer: 'min', source: 'timed' }, { runningPct: 92 }),
    p('Packer', 'baskets', 1, { cycleSec: 15, perCycle: 1, source: 'timed' }),
  ] });
  const a3 = await product(A.id, 'Tesco Express 1.25 kg', { targetPerMin: 40, stations: [
    m('Bagger', 'bags', 1, { rate: 70, ratePer: 'min', source: 'plate' }), m('Checkweigher', 'bags', 1, { rate: 90, ratePer: 'min', source: 'plate' }),
  ] });
  const a4 = await product(A.id, '€12,400 of spares — not yet a product', { stations: [] });
  /* TWO LINES INTO ONE WRAPPER (Rowland's Line 2a & 2b, 15 October): the lanes
     on the page and the paper, the way to the target worked out — and its map
     with the wrapper's analysis typed as what they do, paragraphs and bullets
     longer than any card, and tall narrow shapes whose words run up them, so
     every gate prints the notes page and draws them. */
  const LA = uid(), LB = uid();
  const lane = (id: string): Station[] => [
    { ...m('bagger', 'units', 1, { rate: 160, ratePer: 'min', source: 'plate' }), lane: id },
    /* Zoë's side runs the older pick & place — the two lines differ, so each is drawn */
    { ...m('P160 Pick & Place', 'units', 1, { rate: id === LB ? 130 : 140, ratePer: 'min', source: 'plate' }), lane: id },
    { ...p('palletiser', 'baskets', 10, { cycleSec: 16, perCycle: 2, source: 'standard' }, { runningPct: 91, allowancePct: 10 }), lane: id },
  ];
  const ANALYSIS = 'BOTTLENECK – PALLET WRAPPER (ONE OPERATOR SERVING BOTH LINES)\n\nWrapper cycle: 10 min to wrap a pair of pallets (one from each line) + 2 min transfer = 12 min per pair → maximum 10 pallets/hr.\n\n'
    + '• Tesco Express – 1200 units/pallet, 2 pallets = 2400 units ÷ 70 = 34 min to fill a pair. Not a bottleneck.\n\n• Large crate – 360/pallet, 720 units ÷ 70 = 10.3 min to fill a pair; the wrapper needs 12. Loss 10 ppm (14%).\n\n'
    + '• Crate – 240/pallet, 480 units ÷ 70 = 6.9 min to fill a pair. Loss 30 ppm (43%).\n\nConclusion: on crate formats the wrapper operator’s 12-minute cycle sets the output, not line speed — Łukasz Wójcik’s crew agreed it 14 Oct.';
  const lanes2 = await product(A.id, 'Line 2a & 2b — two lines into one pallet wrapper', {
    targetPerMin: 150, lanes: [{ id: LA, name: 'Line A' }, { id: LB, name: 'Line B — Zoë Brontë’s side' }],
    stations: [...lane(LA), ...lane(LB), p('Pallet wrapper', 'pallets', 36, { cycleSec: 720, perCycle: 2, source: 'estimate' }, { cycleIn: 'min', runningPct: 91 })],
    labour: { people: 8, ratePerHour: 21.8 },
  }, { board: 'square', marks: [
    { id: uid(), kind: 'shape', shape: 'rect', tone: 'blue', label: 'Destaker', x: 8, y: 45, w: 5.7, h: 26 },
    { id: uid(), kind: 'shape', shape: 'rect', tone: 'blue', label: 'Bagger B', x: 20, y: 64, w: 5.3, h: 18 },
    { id: uid(), kind: 'shape', shape: 'text', tone: 'green', label: 'Q4 budget labour is 8 people. This labour model is to be used in Q1, Q2, Q3 and Q4 — and again when the second wrapper is costed, with the overtime on Saturdays.', x: 62, y: 64, w: 22, h: 8 },
    { ...person('Robot op', 'Pick & place + destaker + palletising', 14, 44) },
    { ...person('Pallet wrapper', ANALYSIS, 26, 8), bottleneck: true, colour: 'teal' },
    { ...person('Grader', 'Grade', 48, 84) },
  ] });
  /* a second line and a third, with their own */
  const B = await addLineToFactory('Line 9 — packing hall', 'Packing');
  await updateWorkspace({ ...B, shifts: [{ name: 'Shift 1', start: '06:00', end: '14:00', breakMin: 30 }, { name: 'Shift 2', start: '14:00', end: '22:00', breakMin: 30 }] });
  const b1 = await product(B.id, 'Agnieszka Szczęsna’s 500 g punnet', { targetPerMin: 45, vMarginPct: 15, stations: [
    m('Punnet denester', 'punnets', 1, { rate: 60, ratePer: 'min', source: 'plate' }),
    m('Filler', 'punnets', 1, { rate: 50, ratePer: 'min', source: 'plate' }, { runningPct: 85 }),
    m('Lidder', 'punnets', 1, { rate: 52, ratePer: 'min', source: 'timed' }),
    p('Packer', 'trays', 10, { cycleSec: 11, perCycle: 1, source: 'timed' }, { crew: 2 }),
  ] }, { marks: [person('Op 1'), person('Op 2'), person('Op 3')] });
  const b2 = await product(B.id, 'Within ±1.5 g · 2 m² · 50 µm · ½ turn · 90°', { stations: [m('', 'packs', 1, { rate: 30, ratePer: 'min', source: 'plate' }), p('   ', 'packs', 1, { cycleSec: 1.5, perCycle: 1, source: 'timed' })] });
  const C = await addLineToFactory('Antonín Dvořák’s cell', 'Palletising');
  const c1 = await product(C.id, 'Gap ≤ 0.5 mm, speed ≥ 120 ppm', { targetPerMin: 120, stations: [
    m('Infeed', 'packs', 1, { rate: 130, ratePer: 'min', source: 'plate' }), m('Wrapper', 'packs', 1, { rate: 118, ratePer: 'min', source: 'plate' }, { runningPct: 93 }),
  ] });
  return {
    lines: [{ wsId: A.id, name: A.name, standardIds: [big, a2, a3, a4, lanes2] }, { wsId: B.id, name: B.name, standardIds: [b1, b2] }, { wsId: C.id, name: C.name, standardIds: [c1] }],
    one: { wsId: A.id, id: big },
  };
}

/** RANDOM-n — any number of products and stations, by seed: no stations or
 *  twenty-four, any unit chain, any way a speed is known, awkward names. */
async function seedRandomCapacity(seed: number): Promise<CapacitySeed> {
  let r = (seed * 7919) % 2147483647 || 7;
  const rand = () => { r = (r * 16807) % 2147483647; return (r - 1) / 2147483646; };
  const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)];
  const UNITS = ['bags', 'trays', 'cases', 'pallets', 'punnets', 'boxes'];
  const SOURCES = ['plate', 'timed', 'standard', 'estimate'] as const;
  const lines: CapacitySeed['lines'] = [];
  const nLines = 1 + Math.floor(rand() * 3);
  let one: CapacitySeed['one'] | undefined;
  for (let l = 0; l < nLines; l++) {
    const ws = await addLineToFactory(rand() < 0.3 ? `${pick(AWKWARD).trim() || 'Line'} ${l + 1}` : `Line ${l + 1}`, 'Packing');
    if (rand() < 0.7) await updateWorkspace({ ...ws, shifts: [{ name: pick(['Shift 1', 'Days', 'Łukasz’s shift']), start: '06:00', end: '14:00', ...(rand() < 0.7 ? { breakMin: pick([0, 20, 30, 45]) } : {}) }, ...(rand() < 0.5 ? [{ name: 'Nights', start: '22:00', end: '06:00', relief: true }] : [])],
      ...(rand() < 0.5 ? { crew: 1 + Math.floor(rand() * 12), labourRatePerHour: 11 + Math.round(rand() * 800) / 100 } : {}) });
    const ids: string[] = [];
    const nProducts = 1 + Math.floor(rand() * 4);
    for (let k = 0; k < nProducts; k++) {
      const n = pick([0, 1, 2, 3, 5, 8, 12, 24]);
      let unit = pick(UNITS);
      const st: Station[] = [];
      for (let i = 0; i < n; i++) {
        const next = i === 0 || rand() < 0.6 ? unit : pick(UNITS);
        const contains = i === 0 ? 1 : next === unit ? 1 : pick([2, 4, 8, 12, 60, 0.5]);
        unit = next;
        const name = rand() < 0.3 ? pick(AWKWARD) : rand() < 0.5 ? pick(MACHINES) : `Station ${i + 1}`;
        const speed: Partial<Station> = rand() < 0.6 ? { rate: Math.round((5 + rand() * 120) * 10) / 10, ratePer: pick(['sec', 'min', 'hour'] as const) } : rand() < 0.9 ? { cycleSec: Math.round((1 + rand() * 30) * 10) / 10, perCycle: pick([1, 1, 2, 3]) } : {};
        st.push({ id: uid(), name, kind: rand() < 0.3 ? 'people' : 'machine', unit, contains, ...speed, source: pick(SOURCES),
          ...(rand() < 0.4 ? { runningPct: 70 + Math.round(rand() * 29) } : {}), ...(rand() < 0.2 ? { goodPct: 95 + Math.round(rand() * 4) } : {}),
          ...(rand() < 0.2 ? { crew: 2 + Math.floor(rand() * 3) } : {}), ...(rand() < 0.2 ? { note: pick(AWKWARD) } : {}) });
      }
      const cap: Capacity = { stations: st, ...(rand() < 0.6 ? { targetPerMin: Math.round(10 + rand() * 100) } : {}), ...(rand() < 0.4 ? { vMarginPct: pick([5, 10, 15]) } : {}),
        ...(rand() < 0.3 ? { labour: { people: 1 + Math.floor(rand() * 10), ratePerHour: 12.5 } } : {}) };
      if (st.length >= 2 && rand() < 0.5) cap.whatIfs = [whatIf(st, pick(AWKWARD).trim() || 'What if 1', s => s.map((x, i) => (i === 0 ? { ...x, crew: (x.crew ?? 1) + 1 } : x)), rand() < 0.5 ? { action: { id: uid(), raisedAt: Date.now() } } : {})];
      const id = await product(ws.id, (rand() < 0.4 ? pick(AWKWARD).trim() : '') || `Product ${l + 1}.${k + 1}`, cap);
      ids.push(id);
      if (!one || st.length > 2) one = { wsId: ws.id, id };
    }
    lines.push({ wsId: ws.id, name: ws.name, standardIds: ids });
  }
  return { lines, one: one as CapacitySeed['one'] };
}
