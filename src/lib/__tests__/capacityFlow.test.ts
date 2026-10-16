/* THE LINE, DRAWN — the model behind the capacity page's right-hand pictures
 * (Rowland, 16 October: "being able to see what you're doing makes no sense"). */
import { describe, expect, it } from 'vitest';
import { analyse, type Capacity, type Station } from '../capacity';
import { reshape, lanesAlike } from '../capacityLines';
import { barGroups, flowModel, perMinWords } from '../capacityFlow';

const machine = (id: string, name: string, rate?: number): Station => ({ id, name, kind: 'machine', unit: 'units', contains: 1, ...(rate != null ? { rate } : {}), ratePer: 'min', crew: 1, source: 'plate', runningPct: 100, goodPct: 100 });
const chain: Capacity = { targetPerMin: 150, stations: [machine('a', 'bagger', 160), machine('b', 'Pick & place', 140), machine('c', 'wrapper', 90)] };
let n = 0; const uid = () => `u${++n}`;

describe('the line, drawn', () => {
  it('one chain: one column, every station in order, the slowest the bottleneck, what it makes beside the target', () => {
    const m = flowModel(chain, analyse(chain));
    expect(m.laned).toBe(false);
    expect(m.columns).toHaveLength(1);
    expect(m.columns[0].nodes.map(x => [x.name, x.perMin, x.isLimit])).toEqual([['bagger', 160, false], ['Pick & place', 140, false], ['wrapper', 90, true]]);
    expect(m.makes).toBe(90);
    expect(m.target).toBe(150);
  });
  it('a station with no speed yet is drawn, saying so — never left out while it is typed', () => {
    const typed: Capacity = { stations: [machine('a', 'bagger', 160), machine('b', '')] };
    const m = flowModel(typed, analyse(typed));
    expect(m.columns[0].nodes.map(x => x.name)).toEqual(['bagger', 'Station 2']);
    expect(m.columns[0].nodes[1].perMin).toBeUndefined();
  });
  it('two lines into one wrapper: a column a line, the merge, what comes after, the wrapper the bottleneck', () => {
    const two = reshape(chain, 2, 2, uid);
    const r = analyse(two);
    const m = flowModel(two, r, lanesAlike(two));
    expect(m.laned).toBe(true);
    expect(m.alike).toBe(true);
    expect(m.columns.map(c => [c.name, c.nodes.map(x => x.name)])).toEqual([['Line A', ['bagger', 'Pick & place']], ['Line B', ['bagger', 'Pick & place']]]);
    expect(m.shared.map(x => [x.name, x.isLimit])).toEqual([['wrapper', true]]);
    expect(m.sends).toBe(280);
    expect(m.makes).toBe(90);
    expect(m.shared[0].index).toBe(two.stations.findIndex(s => s.name === 'wrapper'));
  });
  it('a line that sets its own pace but not the whole is marked as such', () => {
    const two = reshape(chain, 2, 2, uid);
    const m = flowModel(two, analyse(two));
    expect(m.columns[0].nodes.find(x => x.name === 'Pick & place')).toMatchObject({ isLimit: false, isOwnLimit: true });
  });
});

describe('the bars', () => {
  it('one chain: one group, measured against what the line makes and the target', () => {
    const g = barGroups(flowModel(chain, analyse(chain)));
    expect(g).toHaveLength(1);
    expect(g[0]).toMatchObject({ ref: 90, refSays: 'the line makes 90', target: 150 });
  });
  it('lines alike are one group for every line, then where they merge, its first row what they send', () => {
    const two = reshape(chain, 2, 2, uid);
    const g = barGroups(flowModel(two, analyse(two), true));
    expect(g.map(x => x.title)).toEqual(['Each line — Line A, Line B', 'After the lines merge']);
    expect(g[0]).toMatchObject({ ref: 140, refSays: 'each line can send 140' });
    expect(g[1].rows[0]).toMatchObject({ name: 'Line A + Line B send', perMin: 280, isInflow: true });
    expect(g[1]).toMatchObject({ ref: 90, target: 150 });
  });
  it('lines that differ are a group each', () => {
    const two = reshape(chain, 2, 2, uid);
    const lb = two.lanes?.[1].id;
    const diff: Capacity = { ...two, stations: two.stations.map(s => (s.lane === lb && s.name === 'Pick & place' ? { ...s, rate: 120 } : s)) };
    const g = barGroups(flowModel(diff, analyse(diff), lanesAlike(diff)));
    expect(g.map(x => x.title)).toEqual(['Line A', 'Line B', 'After the lines merge']);
    expect(g[1].refSays).toBe('Line B can send 120');
  });
  it('figures as the floor reads them', () => {
    expect(perMinWords(68.7999)).toBe('68.8');
    expect(perMinWords(1240.4)).toBe('1,240');
  });
});
