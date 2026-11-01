/* THE WASTE WALK (FC-005) — the independent cases of knowledge/specs/FC-005-waste-walk.md §6, worked by hand in
 * scripts/knowledge/cases-kaizen.py (section W) from the knowledge record's own packing line, never from the code's output. */
import { describe, expect, it } from 'vitest';
import { problemCost } from '../../../lib/problemCost';
import { entryById } from '../../../catalogue';
import { WASTES, WASTE_KINDS, isWaste, placesSays, pointsSays, wasteTag, wasteWalk, type WasteKind, type WasteRow } from '../waste';

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 10, 2, 9, 0, 0);
/* crew 4 at £25 an hour (£100 an hour, £1.6667 a minute), 110 packs a minute, 20p margin a pack, 50p of materials a pack; the Packer is the bottleneck */
const line = { crew: 4, labourRatePerHour: 25, packsPerMin: 110, marginPerPack: 0.2, materialsPerPack: 0.5 };
const neck = { names: ['Packer'] };
const row = (id: string, waste: WasteKind | undefined, machine: string, size: { minutesPerDay?: number; rejectsPerDay?: number; heldPacks?: number }, o: Partial<WasteRow> = {}): WasteRow =>
  ({ id, ...(waste ? { waste } : {}), status: 'open', machine, raisedAt: NOW - 3 * DAY, cost: problemCost(size, machine, line, neck), ...o });
const PACKING: WasteRow[] = [
  row('wait', 'waiting', 'Packer', { minutesPerDay: 360 }),
  row('tran', 'transport', 'Labeller', { minutesPerDay: 48 }),
  row('moti', 'motion', 'Labeller', { minutesPerDay: 20 }),
  row('proc', 'overprocessing', 'Labeller', { minutesPerDay: 30 }),
  row('defe', 'defects', 'Sealer', { rejectsPerDay: 300 }),
  row('inve', 'inventory', 'Chiller', { heldPacks: 36000 }),
  row('over', 'overproduction', 'Wrapper', { rejectsPerDay: 80 }),
];
const walk = wasteWalk(PACKING, { today: NOW });
const of = (k: WasteKind) => walk.lines.find(l => l.kind === k);

describe('the waste walk — the knowledge record’s packing line (cases-kaizen.py W)', () => {
  it('prices each waste by the line’s one cost model, in the two parts, never blended', () => {
    expect(of('waiting')?.labour).toBeCloseTo(600, 9);                 // 360 min × £100 an hour ÷ 60
    expect(of('waiting')?.packs).toBe(39_600);                          // 360 × 110, the Packer being the bottleneck
    expect(of('waiting')?.contribution).toBeCloseTo(7920, 9);           // 39,600 × £0.20
    expect(of('transport')?.labour).toBeCloseTo(80, 9);                 // 48 × £1.6667 — not the bottleneck, so labour only
    expect(of('transport')?.packs).toBe(0);
    expect(of('motion')?.labour).toBeCloseTo(33.3333333, 6);
    expect(of('overprocessing')?.labour).toBeCloseTo(50, 9);
    expect(of('defects')?.materials).toBeCloseTo(150, 9);               // 300 rejects × £0.50
    expect(of('overproduction')?.materials).toBeCloseTo(40, 9);         // 400 a week over five days is 80 a day × £0.50
    expect(of('inventory')?.tiedUp).toBeCloseTo(18_000, 9);             // 36,000 packs held × £0.50 — tied up, not lost
    expect(of('inventory')?.flow).toBe(0);
  });

  it('ranks by what is lost a day, then the money tied up: waiting, defects, transport, over-processing, over-production, motion, inventory', () => {
    expect(walk.lines.map(l => l.kind)).toEqual(['waiting', 'defects', 'transport', 'overprocessing', 'overproduction', 'motion', 'inventory']);
    expect(walk.lines.map(l => Math.round(l.flow * 100) / 100)).toEqual([8520, 150, 80, 50, 40, 33.33, 0]);
  });

  it('ranks the places by what is lost a day: Packer, Labeller, Sealer, Wrapper, Chiller', () => {
    expect(walk.places.map(p => p.machine)).toEqual(['Packer', 'Labeller', 'Sealer', 'Wrapper', 'Chiller']);
    expect(walk.places[1].flow).toBeCloseTo(163.3333333, 6);
    expect(walk.places[1].open).toBe(3);
  });

  it('says the walk in the module’s words', () => {
    expect(walk.says).toBe('7 open problems classed as waste. The biggest is Waiting: £600 labour · 39,600 packs lost · £7.9k contribution a day, most of it at Packer.');
    expect(of('waiting')?.words).toBe('Waiting — 1 problem open: £600 labour · 39,600 packs lost · £7.9k contribution a day.');
    expect(of('transport')?.words).toBe('Transport — 1 problem open: £80 labour a day.');
    expect(of('defects')?.words).toBe('Defects — 1 problem open: £150 materials a day.');
    expect(of('inventory')?.words).toBe('Inventory — 1 problem open: £18.0k of product tied up.');
    expect(walk.foundSays).toBe('Last 4 weeks: 7 wastes raised, 0 put right, 7 still open.');
    expect(walk.next).toBeUndefined();                                  // asked for only when the catalogue's statuses are passed in
  });

  it('says where the wastes are, the biggest place first, three and then how many more', () => {
    expect(placesSays(walk)).toBe('Where: Packer (1 problem, £8.5k a day), Labeller (3 problems, £163 a day), Sealer (1 problem, £150 a day) and 2 more places.');
    expect(placesSays(wasteWalk([PACKING[0]], { today: NOW }))).toBe('Where: Packer (1 problem, £8.5k a day).');
    expect(placesSays(wasteWalk([PACKING[1], PACKING[2]], { today: NOW }))).toBe('Where: Labeller (2 problems, £113 a day).');
    expect(placesSays(wasteWalk([], { today: NOW }))).toBe('');
  });

  it('points each kind at tools the catalogue has — and says honestly which are not built', () => {
    for (const k of WASTE_KINDS) for (const p of WASTES[k].points) expect(entryById(p.id), `${k}: ${p.id}`).toBeTruthy();
    const status = (id: string) => entryById(id)?.status;
    expect(pointsSays('waiting', status)).toBe('Stops Pareto (FC-052) and Andon calls (FC-015)');
    expect(pointsSays('overproduction', status)).toBe('Heijunka box (FC-011, not built yet)');
    expect(wasteWalk(PACKING, { today: NOW, status }).next).toBe('Waiting points to Stops Pareto (FC-052) and Andon calls (FC-015).');
  });
});

describe('what the walk will and will not say', () => {
  it('counts only the open ones in the money; a put-right waste is kept, counted, and costs nothing now', () => {
    const w = wasteWalk([...PACKING, row('old', 'waiting', 'Packer', { minutesPerDay: 100 }, { status: 'closed', closedAt: NOW - DAY })], { today: NOW });
    expect(w.lines.find(l => l.kind === 'waiting')?.labour).toBeCloseTo(600, 9);
    expect(w.lines.find(l => l.kind === 'waiting')?.closed).toBe(1);
    expect(w.lines.find(l => l.kind === 'waiting')?.words).toBe('Waiting — 1 problem open, 1 put right: £600 labour · 39,600 packs lost · £7.9k contribution a day.');
    expect(w.found).toEqual({ raised: 8, closed: 1, open: 7 });
  });

  it('reads the last four weeks only: 27 days is in, 28 days is out', () => {
    const w = wasteWalk([row('a', 'waiting', 'X', { minutesPerDay: 5 }, { raisedAt: NOW - 27 * DAY }), row('b', 'waiting', 'X', { minutesPerDay: 5 }, { raisedAt: NOW - 28 * DAY })], { today: NOW });
    expect(w.found.raised).toBe(1);
    expect(w.foundSays).toBe('Last 4 weeks: 1 waste raised, 0 put right, 1 still open.');
  });

  it('counts a problem not yet classed apart, and does not guess its class', () => {
    const w = wasteWalk([...PACKING, row('x', undefined, 'Packer', { minutesPerDay: 30 })], { today: NOW });
    expect(w.unclassed).toBe(1);
    expect(w.classed).toBe(7);
    expect(w.says.startsWith('7 open problems classed as waste (1 more not yet classed).')).toBe(true);
    expect(wasteWalk([row('x', undefined, 'Packer', {})], { today: NOW }).says).toBe('No problem is classed as a waste yet — open one and pick which of the eight it is.');
    expect(wasteWalk([], { today: NOW }).says).toBe('No problems here to class as waste.');
  });

  it('a problem said not to be a waste is neither classed nor waiting to be', () => {
    const w = wasteWalk([...PACKING, row('n', undefined, 'Packer', { minutesPerDay: 30 }, { notWaste: true })], { today: NOW });
    expect(w.unclassed).toBe(0);
    expect(w.says.startsWith('7 open problems classed as waste. ')).toBe(true);
    expect(wasteWalk([row('n', undefined, 'Packer', {}, { notWaste: true })], { today: NOW }).says).toBe('Every open problem here is said not to be a waste.');
  });

  it('a waste with no size says so and asks for none of the money inputs; a line with no wage names it, and nothing is withheld', () => {
    const w = wasteWalk([{ id: 'u', waste: 'motion', status: 'open', machine: 'Labeller', raisedAt: NOW }], { today: NOW });
    expect(w.lines[0].words).toBe('Motion — 1 problem open: not sized yet — say the minutes, the rejects or the packs on hold on each.');
    expect(w.says).toBe('1 open problem classed as waste. The biggest is Motion — not sized yet.');
    const noWage = wasteWalk([{ id: 'v', waste: 'waiting', status: 'open', machine: 'Packer', raisedAt: NOW, cost: problemCost({ minutesPerDay: 20 }, 'Packer', { crew: 4 }, neck) }], { today: NOW });
    expect(noWage.lines[0].words).toBe('Waiting — 1 problem open: 20 min a day; give the line a wage (Set up the line) to say the labour; give the line a speed to say the packs lost.');
  });

  it('says a mix of sized and unsized in one kind', () => {
    const w = wasteWalk([row('a', 'transport', 'L', { minutesPerDay: 48 }), { id: 'b', waste: 'transport', status: 'open', machine: 'L', raisedAt: NOW }], { today: NOW });
    expect(w.lines[0].words).toBe('Transport — 2 problems open: £80 labour a day; 1 of them not sized yet.');
  });

  it('a problem on no machine is on “the line”; a tie is broken by the eight’s own order', () => {
    const w = wasteWalk([{ id: 'a', waste: 'motion', status: 'open', raisedAt: NOW }, { id: 'b', waste: 'transport', status: 'open', raisedAt: NOW }], { today: NOW });
    expect(w.lines.map(l => l.kind)).toEqual(['transport', 'motion']);
    expect(w.places.map(p => p.machine)).toEqual(['the line']);
  });

  it('knows the eight, and names a problem’s class', () => {
    expect(WASTE_KINDS).toHaveLength(8);
    expect(isWaste('waiting')).toBe(true); expect(isWaste('muda')).toBe(false); expect(isWaste(undefined)).toBe(false);
    expect(wasteTag('overprocessing')).toBe('Over-processing waste');
    expect(Object.keys(WASTES).sort()).toEqual([...WASTE_KINDS].sort());
  });
});

describe('the class in the cloud row — no column (1 November)', () => {
  const base = { id: 'x', workspaceId: 'w', problem: 'p', status: 'open' as const, raisedAt: 1, updatedAt: 1, linkedObsIds: ['o1'] };
  it('goes up as one waste:<kind> entry in linked_obs_ids, only when classed, and comes back out of the links', async () => {
    const { MAPS } = await import('../../../cloud/mappers');
    const up = (w?: 'motion' | 'none') => MAPS.snags.toRow(w ? { ...base, waste: w } : base, 'u');
    expect('waste' in up('motion')).toBe(false);                       // no column
    expect(up().linked_obs_ids).toEqual(['o1']);
    expect(up('motion').linked_obs_ids).toEqual(['o1', 'waste:motion']);
    const back = MAPS.snags.fromRow(up('motion')) as unknown as { waste?: string; linkedObsIds?: string[] };
    expect(back.waste).toBe('motion'); expect(back.linkedObsIds).toEqual(['o1']);
    expect((MAPS.snags.fromRow(up('none')) as unknown as { waste?: string }).waste).toBe('none');
    expect((MAPS.snags.fromRow({ ...up(), linked_obs_ids: ['waste:muda'] }) as unknown as { waste?: string }).waste).toBeUndefined();   // not one of the eight, not believed
    expect((MAPS.snags.fromRow(up()) as unknown as { waste?: string }).waste).toBeUndefined();
  });
});
