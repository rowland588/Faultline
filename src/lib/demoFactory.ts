/* THE DEMO FACTORY — the packing hall made a factory of three lines, so the
 * capacity, the Pareto and the intelligence can be judged on believable data
 * (docs/upgrade-plan.md, D). Built from the account menu's "Build / rebuild
 * the demo line", through the same mutators as real use; every demo line is
 * named "Demo — …" (lib/lines isDemo), so the factory, the control room and
 * every report leave them out.
 *
 *   Demo — Packing Hall   the existing 14 weeks of stops; its products' Line
 *                         capacity (the flow wrapper the clear constraint at
 *                         110 a minute), six weeks of counted day shifts with
 *                         one thin week, its running pattern, next week's
 *                         orders — and the weigher's load-cell breakdowns, an
 *                         expensive loss that is not the constraint
 *   Demo — Punnet Line    six weeks of stops and counts; the filler holds it
 *   Demo — Bakery Wrap    one week only — thin data, said as a range */
import type { Observation, Workspace } from '../types';
import type { Capacity, Station } from '../tools/linebalance/capacity';
import type { LossCount } from './study';
import { addObservation, createWorkspace, putStandard, putStudy, updateWorkspace } from '../db';
import { uid } from './ids';

const DAY = 86_400_000, MIN = 60_000;
let seed = 20261015;
const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const between = (lo: number, hi: number) => lo + rnd() * (hi - lo);

const m = (name: string, unit: string, contains: number, rate: number, x: Partial<Station> = {}): Station =>
  ({ id: uid(), name, kind: 'machine', unit, contains, rate, ratePer: 'min', crew: 1, source: 'plate', runningPct: 100, goodPct: 100, ...x });
const p = (name: string, unit: string, contains: number, cycleSec: number, x: Partial<Station> = {}): Station =>
  ({ id: uid(), name, kind: 'people', unit, contains, cycleSec, perCycle: 1, ratePer: 'min', crew: 1, source: 'standard', goodPct: 100, ...x });

async function product(wsId: string, name: string, capacity: Capacity, t: number): Promise<void> {
  await putStandard({ id: uid(), projectId: '', workspaceId: wsId, product: name, marks: [], capacity, sort: t, createdAt: t, updatedAt: t });
}

/** Counted day shifts, Monday to Friday, over `weeks` — `thin` weeks ago only one. */
async function counts(ws: Workspace, now: number, o: { weeks: number; thinWeek?: number; plannedMin: number; rate: number; machine: string; eff: [number, number]; start: number }) {
  for (let d = o.weeks * 7; d >= 1; d--) {
    const day = new Date(now - d * DAY); day.setHours(0, 0, 0, 0);
    const dow = day.getDay();
    if (dow === 0 || dow === 6) continue;
    const week = Math.floor(d / 7);
    if (o.thinWeek != null && week === o.thinWeek && dow !== 3) continue;
    const from = day.getTime() + o.start * 3_600_000, to = from + 8 * 3_600_000;
    const made = Math.round(o.plannedMin * o.rate * between(o.eff[0], o.eff[1]));
    const losses: LossCount = { shift: 'Days', from, to, plannedMin: o.plannedMin, breakMin: 480 - o.plannedMin, made, rejects: Math.round(made * between(0.002, 0.008)), ratePerMin: o.rate, rateFrom: 'plate', rateMachine: o.machine };
    await putStudy({ id: uid(), tool: 'losses', name: `Days, ${day.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`, workspaceId: ws.id, agreed: {}, facts: { losses }, uses: [], startedAt: from, createdAt: to, updatedAt: to });
  }
}

async function stops(ws: Workspace, now: number, days: number, kinds: { asset: string; category: string; sub: string; meanMin: number; perDay: number }[]) {
  const obs: Observation[] = [];
  for (let d = days; d >= 0; d--) {
    const day = new Date(now - d * DAY); day.setHours(0, 0, 0, 0);
    if (day.getDay() === 0) continue;
    for (const k of kinds) {
      const n = Math.floor(k.perDay * between(0.4, 1.6) + rnd() * 0.6);
      for (let i = 0; i < n; i++) {
        const at = day.getTime() + 6 * 3_600_000 + Math.floor(rnd() * 7.5 * 3_600_000);
        const min = Math.max(0.5, k.meanMin * between(0.45, 1.6));
        obs.push({ id: uid(), workspaceId: ws.id, category: k.category, subcategory: k.sub, asset: k.asset, shift: 'Days', startedAt: at, endedAt: at + min * MIN, durationMs: Math.round(min * MIN), timing: 'stopwatch', count: 1, media: [], createdAt: at, updatedAt: at });
      }
    }
  }
  for (const o of obs.sort((a, b) => a.startedAt - b.startedAt)) await addObservation(o);
}

export async function seedDemoFactory(hall: Workspace, now: number): Promise<void> {
  const t = now;
  /* ---- the packing hall: the flow wrapper holds it ---- */
  const hallLine = (): Station[] => [
    m('Multihead weigher', 'packs', 1, 135), m('Flow wrapper', 'packs', 1, 110), m('Tray sealer', 'packs', 1, 140),
    m('Metal detector', 'packs', 1, 160), m('Checkweigher', 'packs', 1, 150), p('Case packer', 'cases', 12, 5.2, { allowancePct: 9 }),
  ];
  await product(hall.id, 'Salad bowl 200 g', { stations: hallLine(), targetPerMin: 105, plannedHoursPerWeek: 112, demandPerWeek: 520_000, labour: { people: 6, ratePerHour: 14.2 } }, t);
  await product(hall.id, 'Wrap two-pack', { stations: hallLine().map(s => (s.name === 'Flow wrapper' ? { ...s, rate: 95 } : s)), targetPerMin: 90, plannedHoursPerWeek: 112, demandPerWeek: 160_000, labour: { people: 6, ratePerHour: 14.2 } }, t + 1);
  await counts(hall, now, { weeks: 6, thinWeek: 3, plannedMin: 450, rate: 110, machine: 'Flow wrapper', eff: [0.7, 0.86], start: 6 });
  /* an expensive loss that is NOT the constraint: the weigher's load cell, this fortnight */
  await stops(hall, now, 13, [{ asset: 'Multihead weigher', category: 'Breakdown', sub: 'Load cell fault', meanMin: 38, perDay: 0.9 }]);
  /* its running pattern — three shifts, five days — for the week's figures */
  await putStudy({ id: uid(), tool: 'changeover', name: 'Salad bowl → Wrap two-pack', workspaceId: hall.id, agreed: {}, uses: [], startedAt: t - 9 * DAY, createdAt: t - 9 * DAY, updatedAt: t - 9 * DAY,
    facts: { running: { shiftsPerDay: 3, hoursPerShift: 8, breakMin: 30, daysPerWeek: 5 }, fromProduct: 'Salad bowl 200 g', toProduct: 'Wrap two-pack', laps: [] } } as never);

  /* ---- the punnet line: the filler holds it ---- */
  const pun = await createWorkspace('Demo — Punnet Line', 'food-packing');
  await updateWorkspace({ ...pun, shifts: [{ name: 'Days', start: '06:00', end: '14:00', breakMin: 30 }, { name: 'Backs', start: '14:00', end: '22:00', breakMin: 30 }], crew: 5, labourRatePerHour: 13.8, labourBurden: 1.3, marginPerPack: 0.06 });
  await product(pun.id, 'Strawberry 400 g', { stations: [m('Denester', 'punnets', 1, 70), m('Filler', 'punnets', 1, 55), m('Lidder', 'punnets', 1, 66), m('Labeller', 'punnets', 1, 80), p('Packer', 'trays', 10, 9.5, { crew: 2, allowancePct: 9 })], targetPerMin: 55, plannedHoursPerWeek: 75, demandPerWeek: 180_000 }, t);
  await stops(pun, now, 42, [
    { asset: 'Filler', category: 'Minor stop', sub: 'Fruit bridging in the hopper', meanMin: 4, perDay: 3.2 },
    { asset: 'Filler', category: 'Breakdown', sub: 'Gate actuator', meanMin: 30, perDay: 0.25 },
    { asset: 'Labeller', category: 'Minor stop', sub: 'Label web break', meanMin: 6, perDay: 1.6 },
    { asset: 'Whole line', category: 'Changeover', sub: 'Size change', meanMin: 22, perDay: 0.8 },
    { asset: 'Denester', category: 'Minor stop', sub: 'Punnet stack jam', meanMin: 2, perDay: 2.4 },
  ]);
  await counts(pun, now, { weeks: 6, plannedMin: 450, rate: 55, machine: 'Filler', eff: [0.74, 0.9], start: 6 });

  /* ---- the bakery wrap: one week only — thin ---- */
  const bak = await createWorkspace('Demo — Bakery Wrap', 'food-packing');
  await updateWorkspace({ ...bak, shifts: [{ name: 'Days', start: '05:00', end: '13:00', breakMin: 30 }], crew: 3, labourRatePerHour: 13.5 });
  await product(bak.id, 'Sourdough 800 g', { stations: [m('Slicer', 'loaves', 1, 40), m('Bagger', 'loaves', 1, 34), m('Clipper', 'loaves', 1, 45)], targetPerMin: 32 }, t);
  await stops(bak, now, 5, [{ asset: 'Bagger', category: 'Minor stop', sub: 'Bag not opening', meanMin: 3, perDay: 2 }, { asset: 'Slicer', category: 'Hygiene & cleaning', sub: 'Blade clean', meanMin: 12, perDay: 0.6 }]);
  await counts(bak, now, { weeks: 1, plannedMin: 450, rate: 34, machine: 'Bagger', eff: [0.7, 0.85], start: 5 });
}
