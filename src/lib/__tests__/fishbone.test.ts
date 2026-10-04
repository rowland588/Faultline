/* The fishbone engine — what fills each bone, where a problem is on its way,
 * its number before and now, the six bones always drawn, and the "therefore"
 * chain read back. Dates are LOCAL (weeks start on a local Monday). */
import { describe, it, expect } from 'vitest';
import type { Case, Observation, Workspace } from '../../types';
import type { PaceLineRow } from '../../db/rows';
import type { Cause } from '../sixm';
import type { Standard } from '../standard';
import type { Material } from '../materials';
import type { Program } from '../programs';
import type { Measure, Period, Reading, Target } from '../measures';
import type { WalkSnag } from '../walkSnags';
import { SIXM, blamesAPerson, boneOfStop } from '../sixm';
import {
  acceptSuggestion, belongsTo, buildView, causeRefOf, countermeasuresOf, drillOfRef, fishboneData,
  fullWeeks, logGaps, measureOf, parseCauseRef, phaseOf, scopeOf, scopeMsWeek, suggestionsFor, therefore,
  type Countermeasure, type FishboneData,
} from '../fishbone';

/** Wednesday 7 October 2026, midday local. Its week starts Monday 5 October;
 *  the last four full weeks are 7 Sep – 4 Oct. */
const TODAY = new Date(2026, 9, 7, 12).getTime();
const at = (daysAgo: number, hour = 10) => { const d = new Date(TODAY); d.setDate(d.getDate() - daysAgo); d.setHours(hour, 0, 0, 0); return d.getTime(); };
const iso = (daysAgo: number) => { const d = new Date(at(daysAgo)); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

let n = 0;
const ob = (o: Partial<Observation> & { daysAgo: number; mins?: number }): Observation => {
  const { daysAgo, mins = 10, ...rest } = o;
  return {
    id: `o${n++}`, workspaceId: 'ws1', category: 'Minor stop', asset: 'Basketer', shift: 'Days',
    startedAt: at(daysAgo), durationMs: mins * 60_000, timing: 'stopwatch', count: 1, media: [],
    createdAt: 1, updatedAt: 1, ...rest,
  };
};

const line: PaceLineRow = {
  id: 'L1', key: '2A', name: 'Line 2A', projectId: 'P', workspaceId: 'ws1', updatedAt: 1,
  capacity: {
    targetPerMin: 66,
    stations: [
      { id: 'cap-bagger', name: 'Bagger', kind: 'machine', unit: 'bags', contains: 1, rate: 70, ratePer: 'min', source: 'plate' },
      { id: 'cap-basketer', name: 'Basketer', kind: 'machine', unit: 'baskets', contains: 12, rate: 5.5, ratePer: 'min', runningPct: 94, source: 'timed' },
      { id: 'cap-carrier', name: 'Carrier', kind: 'people', unit: 'baskets', contains: 1, cycleSec: 20, perCycle: 2, source: 'timed' },
    ],
  },
};
const other: PaceLineRow = { id: 'L2', key: '7', name: 'Line 7', projectId: 'P', workspaceId: 'ws2', updatedAt: 1 };

const problem = (o: Partial<Case> = {}): Case => ({
  id: 'C1', workspaceId: 'ws1', title: 'Basketer minor stops', path: [], baselineMsWeek: 0,
  status: 'open', openedAt: at(3), updatedAt: 1, projectId: 'P', lineId: 'L1',
  source: { kind: 'pareto', category: 'Minor stop', asset: 'Basketer' }, causes: [], ...o,
});

const cause = (o: Partial<Cause> = {}): Cause => ({
  id: 'k1', m: 'machine', text: 'Guide rail worn', grade: 'observed', status: 'suspected', whys: [], at: 1, ...o,
});

const action = (o: Partial<Countermeasure> = {}): Countermeasure => ({
  uid: 'a1', ref: 'a1', priority: 3, line: 'Line 2A', category: 'Machine', status: 'To do', flag: '', ...o,
});

const data = (o: Partial<FishboneData> = {}): FishboneData => fishboneData({ lines: [line, other], ...o });

/* ============================================================================ */

describe('weeks', () => {
  it('the last four full weeks end at this week’s Monday', () => {
    const { from, to } = fullWeeks(TODAY);
    expect(new Date(to).getDay()).toBe(1);
    expect(new Date(from).getDay()).toBe(1);
    expect(new Date(to).getDate()).toBe(5);
    expect(new Date(from).getDate()).toBe(7);  // 7 September
    expect(new Date(from).getMonth()).toBe(8);
  });
});

describe('scope — what part of the log the head covers', () => {
  it('a Pareto bar: its category and machine', () => {
    const s = scopeOf(problem(), data());
    expect(s.label).toBe('Minor stop on the Basketer');
    expect(s.match(ob({ daysAgo: 1 }))).toBe(true);
    expect(s.match(ob({ daysAgo: 1, asset: 'Bagger' }))).toBe(false);
    expect(s.match(ob({ daysAgo: 1, category: 'Breakdown' }))).toBe(false);
  });
  it('the constraint: the station’s machine', () => {
    const s = scopeOf(problem({ source: { kind: 'constraint', station: 'cap-basketer' } }), data());
    expect(s.label).toBe('Stops on the Basketer');
    expect(s.match(ob({ daysAgo: 1, category: 'Breakdown' }))).toBe(true);
    expect(s.match(ob({ daysAgo: 1, asset: 'Bagger' }))).toBe(false);
  });
  it('the gap: the whole line', () => {
    const s = scopeOf(problem({ source: { kind: 'gap' } }), data());
    expect(s.whole).toBe(true);
    expect(s.label).toBe('Lost time on Line 2A');
  });
  it('a legacy Case: its saved drill path', () => {
    const s = scopeOf(problem({ source: undefined, lineId: undefined, projectId: undefined, path: [{ dimension: 'category', value: 'Changeover' }] }), data());
    expect(s.label).toBe('Changeover');
    expect(s.match(ob({ daysAgo: 1, category: 'Changeover' }))).toBe(true);
    expect(s.match(ob({ daysAgo: 1 }))).toBe(false);
  });
});

describe('suggestionsFor — the timed stops', () => {
  const log = [
    ...Array.from({ length: 6 }, (_, i) => ob({ daysAgo: 8 + i, subcategory: 'Misfeed', mins: 20 })),
    ob({ daysAgo: 9, subcategory: 'Film / packaging snag', mins: 15 }),
    ob({ daysAgo: 10, subcategory: 'Sensor trip', mins: 5, causeM: 'measurement' }),
    ob({ daysAgo: 10, asset: 'Bagger', mins: 90 }),   // outside the bar
    ob({ daysAgo: 60, subcategory: 'Misfeed', mins: 300 }), // outside the window
  ];

  it('groups by bone, reason and machine, with minutes a week over four full weeks', () => {
    const s = suggestionsFor(problem(), data({ observations: log }), TODAY).filter(x => x.source.kind === 'pareto');
    const misfeed = s.find(x => x.text === 'Minor stop — Misfeed on the Basketer');
    expect(misfeed).toBeDefined();
    expect(misfeed?.m).toBe('machine');
    expect(misfeed?.grade).toBe('measured');
    expect(misfeed?.minutesWeek).toBe(30);          // 120 min / 4 weeks
    expect(misfeed?.guessed).toBe(true);
    expect(misfeed?.detail).toMatch(/^6 stops since 7 Sept/);
    // ranked by loss
    expect(s[0].text).toBe('Minor stop — Misfeed on the Basketer');
  });

  it('guesses the bone from the words, and takes the floor’s tap when it was given', () => {
    const s = suggestionsFor(problem(), data({ observations: log }), TODAY);
    const film = s.find(x => x.text.includes('Film'));
    expect(film?.m).toBe('material');
    expect(film?.guessed).toBe(true);
    const sensor = s.find(x => x.text.includes('Sensor trip'));
    expect(sensor?.m).toBe('measurement');
    expect(sensor?.guessed).toBe(false);
  });

  it('carries a stable key and a drill path that opens the bar', () => {
    const a = suggestionsFor(problem(), data({ observations: log }), TODAY);
    const b = suggestionsFor(problem(), data({ observations: [...log].reverse() }), TODAY);
    expect(a.map(x => x.key).sort()).toEqual(b.map(x => x.key).sort());
    const misfeed = a.find(x => x.text.includes('Misfeed'));
    expect(drillOfRef(misfeed?.source.ref)).toEqual([
      { dimension: 'category', value: 'Minor stop' },
      { dimension: 'subcategory', value: 'Misfeed' },
      { dimension: 'asset', value: 'Basketer' },
    ]);
  });

  it('drops a suggestion already accepted as a cause', () => {
    const first = suggestionsFor(problem(), data({ observations: log }), TODAY);
    const misfeed = first.find(x => x.text.includes('Misfeed'));
    if (!misfeed) throw new Error('no misfeed');
    const accepted = acceptSuggestion(misfeed, { id: 'k9', at: 5, by: 'Rob' });
    expect(accepted.status).toBe('suspected');
    expect(accepted.source?.minutesWeek).toBe(30);
    expect(accepted.by).toBe('Rob');
    const again = suggestionsFor(problem({ causes: [accepted] }), data({ observations: log }), TODAY);
    expect(again.find(x => x.key === misfeed.key)).toBeUndefined();
    expect(again.length).toBe(first.length - 1);
  });

  it('counts a stop logged this week as evidence, but not towards the weekly figure', () => {
    const s = suggestionsFor(problem(), data({ observations: [ob({ daysAgo: 1, subcategory: 'Misfeed', mins: 40 })] }), TODAY);
    expect(s[0].detail).toMatch(/^1 stop since/);
    expect(s[0].minutesWeek).toBe(0);
  });
});

describe('suggestionsFor — concentrations by shift', () => {
  const mixed = (nights: number, days: number) => [
    ...Array.from({ length: nights }, (_, i) => ob({ daysAgo: 8 + i, shift: 'Nights' })),
    ...Array.from({ length: days }, (_, i) => ob({ daysAgo: 8 + i, shift: 'Days' })),
  ];
  it('most stops on one shift is a People suggestion', () => {
    const s = suggestionsFor(problem(), data({ observations: mixed(11, 7) }), TODAY).find(x => x.key === 'pareto:shift=Nights');
    expect(s?.m).toBe('people');
    expect(s?.text).toBe('Most stops on Nights');
    expect(s?.detail).toMatch(/^11 of 18 stops/);
  });
  it('not when the split is even, or too few stops, or the line logs one shift', () => {
    expect(suggestionsFor(problem(), data({ observations: mixed(5, 5) }), TODAY).some(x => x.key.includes('shift='))).toBe(false);
    expect(suggestionsFor(problem(), data({ observations: mixed(3, 1) }), TODAY).some(x => x.key.includes('shift='))).toBe(false);
    expect(suggestionsFor(problem(), data({ observations: mixed(0, 9) }), TODAY).some(x => x.key.includes('shift='))).toBe(false);
  });
});

describe('suggestionsFor — the walk, the standard, the balance, materials, programs', () => {
  const snag = (o: Partial<WalkSnag>): WalkSnag => ({ id: 's1', what: 'Guide rail catching', state: 'open', found: iso(4), wsId: 'ws1', frameId: 'f1', frameName: 'Basketer infeed', ...o });

  it('open snags on the machine → Machine, observed', () => {
    const s = suggestionsFor(problem(), data({ snags: [snag({}), snag({ id: 's2', state: 'closed' }), snag({ id: 's3', frameName: 'Palletiser' })] }), TODAY)
      .filter(x => x.source.kind === 'snag');
    expect(s.map(x => x.source.ref)).toEqual(['s1']);
    expect(s[0].m).toBe('machine');
    expect(s[0].grade).toBe('observed');
    expect(s[0].detail).toContain('Basketer infeed');
  });

  it('for the whole line, every open snag on the line’s walk', () => {
    const p = problem({ source: { kind: 'gap' } });
    const s = suggestionsFor(p, data({ snags: [snag({}), snag({ id: 's3', frameName: 'Palletiser' }), snag({ id: 's4', wsId: 'ws2' })] }), TODAY)
      .filter(x => x.source.kind === 'snag');
    expect(s.map(x => x.source.ref).sort()).toEqual(['s1', 's3']);
  });

  const std = (people: number): Standard => ({
    id: 'std1', projectId: 'P', product: 'Finest Red 2kg', sort: 1, createdAt: 1, updatedAt: 1,
    marks: Array.from({ length: people }, (_, i) => ({ id: `m${i}`, kind: 'person', x: 1, y: 1 })),
  });
  const ws = (crew?: number): Workspace => ({
    id: 'ws1', name: 'Line 2A', color: '#000', createdAt: 1, updatedAt: 1, categories: [], subcategories: {}, assets: [], shifts: [], schemaVersion: 1, crew,
  });

  it('the standard’s crew → People, counted', () => {
    const asked = suggestionsFor(problem(), data({ standards: [std(4)] }), TODAY).find(x => x.source.kind === 'standard');
    expect(asked?.m).toBe('people');
    expect(asked?.grade).toBe('counted');
    expect(asked?.text).toContain('needs 4 people');
    const short = suggestionsFor(problem(), data({ standards: [std(4)], workspaces: [ws(3)] }), TODAY).find(x => x.source.kind === 'standard');
    expect(short?.text).toBe('Crew below the standard — 3 on the line, the standard needs 4');
    expect(suggestionsFor(problem(), data({ standards: [std(4)], workspaces: [ws(4)] }), TODAY).some(x => x.source.kind === 'standard')).toBe(false);
  });

  it('the limiting station → Machine, measured, when the head is about it', () => {
    const s = suggestionsFor(problem(), data(), TODAY).find(x => x.source.kind === 'capacity');
    expect(s?.source.ref).toBe('cap-basketer');
    expect(s?.m).toBe('machine');
    expect(s?.grade).toBe('measured');
    expect(s?.text).toMatch(/^Basketer limits the line at 62 bags\/min, 4 short of 66/);
    // a bar on another machine is not about it
    expect(suggestionsFor(problem({ source: { kind: 'pareto', asset: 'Palletiser' } }), data(), TODAY).some(x => x.source.kind === 'capacity')).toBe(false);
  });

  it('a person limiting the line → People', () => {
    const slow = { ...line, capacity: { stations: [
      { id: 'b', name: 'Bagger', kind: 'machine' as const, unit: 'bags', contains: 1, rate: 70, ratePer: 'min' as const },
      { id: 'c', name: 'Packer', kind: 'people' as const, unit: 'bags', contains: 1, rate: 30, ratePer: 'min' as const },
    ] } };
    const s = suggestionsFor(problem({ source: { kind: 'constraint', station: 'c' } }), data({ lines: [slow] }), TODAY).find(x => x.source.kind === 'capacity');
    expect(s?.m).toBe('people');
  });

  it('materials late → Material; programs not proved → Method', () => {
    const mat = (o: Partial<Material>): Material => ({ id: 'm1', projectId: 'P', what: 'Perforated film', sort: 1, createdAt: 1, updatedAt: 1, ...o });
    const prog = (o: Partial<Program>): Program => ({ id: 'p1', projectId: 'P', what: 'P-150', state: 'onMachine', sort: 1, createdAt: 1, updatedAt: 1, ...o });
    const s = suggestionsFor(problem(), data({
      materials: [mat({ due: iso(3) }), mat({ id: 'm2', due: iso(-3) }), mat({ id: 'm3', due: iso(5), here: true }), mat({ id: 'm4', due: iso(5), lineId: 'L2' })],
      programs: [prog({ testOn: iso(6) }), prog({ id: 'p2', testOn: iso(-4) }), prog({ id: 'p3' }), prog({ id: 'p4', provedOn: iso(2) }), prog({ id: 'p5', state: 'needed' })],
    }), TODAY);
    const m = s.filter(x => x.source.kind === 'material');
    expect(m.map(x => x.source.ref)).toEqual(['m1']);
    expect(m[0].text).toBe('Perforated film is 3 days late');
    expect(m[0].m).toBe('material');
    const p = s.filter(x => x.source.kind === 'program');
    expect(p.map(x => x.source.ref)).toEqual(['p1', 'p3']);
    expect(p.every(x => x.m === 'method')).toBe(true);
    expect(p[0].text).toMatch(/test day has passed/);
    expect(p[1].text).toMatch(/no test day/);
  });
});

describe('suggestionsFor — Measurement and Environment', () => {
  it('days with nothing logged on a line that normally logs', () => {
    // logged every weekday for the four weeks before the last two, then silent
    // for most of last week
    const days = Array.from({ length: 42 }, (_, i) => i + 1).filter(d => {
      const wd = new Date(at(d)).getDay();
      return wd >= 1 && wd <= 5 && !(d >= 1 && d <= 7);
    });
    const log = days.map(d => ob({ daysAgo: d, asset: 'Bagger' }));
    const gaps = logGaps(log, TODAY);
    expect(gaps.usual.sort()).toEqual([1, 2, 3, 4, 5]);
    expect(gaps.missing.length).toBe(5);
    const s = suggestionsFor(problem({ source: { kind: 'gap' } }), data({ observations: log }), TODAY).find(x => x.key === 'reading:log-gaps');
    expect(s?.m).toBe('measurement');
    expect(s?.text).toBe('5 days in the last 2 weeks with nothing logged — the Pareto may be short');
  });

  it('no gaps for a line that never logged much', () => {
    expect(logGaps([ob({ daysAgo: 20 }), ob({ daysAgo: 30 })], TODAY).missing).toEqual([]);
  });

  it('a measure nobody has read for a fortnight', () => {
    const ppm: Measure = { id: 'ppm', name: 'Packs per minute', unit: 'ppm', direction: 'up', sort: 1 };
    const r: Reading = { id: 'r1', projectId: 'P', lineId: 'L1', measureId: 'ppm', at: iso(20), value: 50, createdAt: 1, updatedAt: 1 };
    const s = suggestionsFor(problem(), data({ measures: [ppm], readings: [r] }), TODAY).find(x => x.key === 'reading:measure=ppm');
    expect(s?.m).toBe('measurement');
    expect(s?.text).toMatch(/^No Packs per minute reading since/);
    expect(suggestionsFor(problem(), data({ measures: [ppm], readings: [{ ...r, at: iso(3) }] }), TODAY).some(x => x.key === 'reading:measure=ppm')).toBe(false);
  });

  it('notes about heat, humidity, dust, condensation → Environment', () => {
    const s = suggestionsFor(problem(), data({
      observations: [ob({ daysAgo: 8, note: 'condensation on the eye at start-up' }), ob({ daysAgo: 9, note: 'Condensation again' })],
      notes: [{ text: 'Very hot in the hall today', kind: 'action', ref: 'a1', lineId: 'L1' }, { text: 'dusty', kind: 'action', ref: 'a2', lineId: 'L2' }],
    }), TODAY).filter(x => x.m === 'environment');
    const cond = s.find(x => x.key === 'observation:note:condensation');
    expect(cond?.text).toBe('Condensation mentioned in 2 notes');
    expect(cond?.grade).toBe('observed');
    const heat = s.find(x => x.key === 'observation:note:heat');
    expect(heat?.grade).toBe('reported');
    expect(s.some(x => x.key === 'observation:note:dust')).toBe(false);   // another line's note
  });

  it('a machine temperature is not the room', () => {
    const s = suggestionsFor(problem(), data({ observations: [ob({ daysAgo: 8, note: 'Seal jaw temperature drifting' })] }), TODAY);
    expect(s.some(x => x.key.startsWith('observation:note:'))).toBe(false);
  });
});

/* ============================================================================ */

describe('phaseOf — every phase', () => {
  const root = cause({ status: 'confirmed', root: true });
  const cm = (status: string, doneOn?: string) => action({ status, causeRef: causeRefOf('C1', 'k1'), doneOn });
  it('finding — no confirmed root', () => {
    expect(phaseOf(problem(), [], null, TODAY)).toBe('finding');
    expect(phaseOf(problem({ causes: [cause({ root: true })] }), [], null, TODAY)).toBe('finding');          // suspected root
    expect(phaseOf(problem({ causes: [cause({ status: 'confirmed' })] }), [], null, TODAY)).toBe('finding'); // confirmed, not drilled
  });
  it('acting — a root, countermeasures open or none yet', () => {
    expect(phaseOf(problem({ causes: [root] }), [], null, TODAY)).toBe('acting');
    expect(phaseOf(problem({ causes: [root] }), [cm('Done', iso(5)), cm('To do')], null, TODAY)).toBe('acting');
  });
  it('proving — every countermeasure done', () => {
    expect(phaseOf(problem({ causes: [root] }), [cm('Done', iso(5))], null, TODAY)).toBe('proving');
  });
  it('closed — closed with no hold check', () => {
    expect(phaseOf(problem({ status: 'closed' }), [], null, TODAY)).toBe('closed');
  });
  const hold = { what: 'Changeover timed weekly', everyDays: 7, since: iso(10) };
  const m = (moved?: 'better' | 'worse' | 'same') => ({ label: 'x', unit: 'h a week', better: 'lower' as const, ...(moved ? { moved } : {}) });
  it('holding — closed with a check and the number still better (or not yet known)', () => {
    expect(phaseOf(problem({ status: 'closed', hold }), [], m('better'), TODAY)).toBe('holding');
    expect(phaseOf(problem({ status: 'closed', hold }), [], m(), TODAY)).toBe('holding');
    expect(phaseOf(problem({ status: 'closed', hold }), [], null, TODAY)).toBe('holding');
  });
  it('slipped — closed with a check and the number gone back', () => {
    expect(phaseOf(problem({ status: 'closed', hold }), [], m('worse'), TODAY)).toBe('slipped');
    expect(phaseOf(problem({ status: 'closed', hold }), [], m('same'), TODAY)).toBe('slipped');
  });
});

describe('measureOf', () => {
  // 4 full weeks before it opened (opened 3 days ago, in this week): 7 Sep – 4 Oct.
  it('a bar: hours a week, before from the baseline, now over the last four full weeks', () => {
    const log = Array.from({ length: 8 }, (_, i) => ob({ daysAgo: 4 + i * 3, mins: 60 }));   // 8 h in 4 full weeks
    const mm = measureOf(problem({ baselineMsWeek: 3 * 3_600_000 }), data({ observations: log }), TODAY);
    expect(mm).toEqual({ label: 'Minor stop on the Basketer', unit: 'h a week', before: 3, now: 2, better: 'lower' });
  });
  it('before from the four full weeks before it opened when no baseline was kept', () => {
    const log = [ob({ daysAgo: 40, mins: 240 }), ob({ daysAgo: 9, mins: 120 })];
    const mm = measureOf(problem({ openedAt: at(23) }), data({ observations: log }), TODAY);
    expect(mm?.before).toBe(1);   // 240 min over the 4 weeks before 14 Sep
    expect(mm?.now).toBe(0.5);
  });
  it('moved — the full weeks after the last countermeasure against before', () => {
    const before = Array.from({ length: 4 }, (_, i) => ob({ daysAgo: 30 + i * 7, mins: 240 }));  // 4 h/wk
    const after = [ob({ daysAgo: 4, mins: 60 }), ob({ daysAgo: 11, mins: 60 })];                // 1 h/wk
    const p = problem({ openedAt: at(28), baselineMsWeek: 4 * 3_600_000 });
    const acts = [action({ status: 'Done', causeRef: 'C1:k1', doneOn: iso(17) })];
    expect(measureOf(p, data({ observations: [...before, ...after], actions: acts }), TODAY)?.moved).toBe('better');
    const worse = [ob({ daysAgo: 4, mins: 600 }), ob({ daysAgo: 11, mins: 600 })];
    expect(measureOf(p, data({ observations: [...before, ...worse], actions: acts }), TODAY)?.moved).toBe('worse');
    // done this week: no full week since, so not yet known
    const soon = [action({ status: 'Done', causeRef: 'C1:k1', doneOn: iso(1) })];
    expect(measureOf(p, data({ observations: before, actions: soon }), TODAY)?.moved).toBeUndefined();
  });
  it('null when nothing was ever timed and no baseline kept', () => {
    expect(measureOf(problem(), data(), TODAY)).toBeNull();
  });

  const ppm: Measure = { id: 'ppm', name: 'Packs per minute', unit: 'ppm', direction: 'up', sort: 1 };
  const periods: Period[] = [{ id: 'q', name: 'Q4', from: iso(80), to: iso(-30), sort: 1 }];
  const targets: Target[] = [{ id: 't', projectId: 'P', lineId: 'L1', measureId: 'ppm', periodId: 'q', value: 50, updatedAt: 1 }];
  const reading = (daysAgo: number, value: number): Reading => ({ id: `r${daysAgo}`, projectId: 'P', lineId: 'L1', measureId: 'ppm', at: iso(daysAgo), value, createdAt: 1, updatedAt: 1 });
  const readings = [reading(56, 42), reading(49, 41), reading(42, 35), reading(35, 47), reading(28, 44), reading(21, 46), reading(14, 49), reading(7, 52)];

  it('the gap: the line’s measure, before, now and target', () => {
    const p = problem({ source: { kind: 'gap', measureId: 'ppm' }, openedAt: at(50) });
    const mm = measureOf(p, data({ measures: [ppm], periods, targets, readings }), TODAY);
    expect(mm?.label).toBe('Packs per minute on Line 2A');
    expect(mm?.unit).toBe('ppm');
    expect(mm?.better).toBe('higher');
    expect(mm?.before).toBe(42);          // the reading in the 4 weeks before it opened
    expect(mm?.now).toBe(47.75);          // mean of the last 4 weeks: 44, 46, 49, 52
    expect(mm?.target).toBe(50);
    expect(mm?.moved).toBeUndefined();
    const acts = [action({ status: 'Done', causeRef: 'C1:k1', doneOn: iso(25) })];
    expect(measureOf(p, data({ measures: [ppm], periods, targets, readings, actions: acts }), TODAY)?.moved).toBe('better');
  });
  it('the gap with no measure defined is null', () => {
    expect(measureOf(problem({ source: { kind: 'gap' } }), data(), TODAY)).toBeNull();
  });
});

describe('buildView', () => {
  it('always has all six bones, in order, even when empty', () => {
    const v = buildView(problem(), data(), TODAY);
    expect(v.bones.map(b => b.m)).toEqual(SIXM.map(x => x.key));
    expect(v.bones.every(b => Array.isArray(b.causes) && Array.isArray(b.suggestions))).toBe(true);
  });
  it('puts causes on their bones, names the roots, finds the countermeasures, and says the head', () => {
    const root = cause({ id: 'k1', status: 'confirmed', root: true });
    const p = problem({ causes: [root, cause({ id: 'k2', m: 'people', text: 'Nights' })] });
    const acts = [
      action({ uid: 'a1', causeRef: 'C1:k1' }),
      action({ uid: 'a2', caseId: 'C1' }),
      action({ uid: 'a3', causeRef: 'C2:k1' }),
      action({ uid: 'a4' }),
    ];
    const log = [...Array.from({ length: 4 }, (_, i) => ob({ daysAgo: 8 + i, mins: 48 })), ob({ daysAgo: 9, asset: 'Bagger', mins: 288 })];
    const v = buildView(p, data({ observations: log, actions: acts }), TODAY);
    expect(v.bones.find(b => b.m === 'machine')?.causes.map(c => c.id)).toEqual(['k1']);
    expect(v.bones.find(b => b.m === 'people')?.causes.map(c => c.id)).toEqual(['k2']);
    expect(v.roots.map(c => c.id)).toEqual(['k1']);
    expect(v.actions.map(a => a.uid)).toEqual(['a1', 'a2']);
    expect(v.phase).toBe('acting');
    // 192 min of 480 over 4 weeks: 48 min a week, 40%
    expect(v.says).toBe('Minor stop on the Basketer — 48 min a week, 40% of the line’s lost time');
  });
  it('a problem with nothing timed says so', () => {
    expect(buildView(problem({ baselineMsWeek: 3_600_000 }), data(), TODAY).says).toBe('Minor stop on the Basketer — nothing timed in the last 4 full weeks');
  });
  it('the gap says the line against its target', () => {
    const ppm: Measure = { id: 'ppm', name: 'Packs per minute', unit: 'ppm', direction: 'up', sort: 1 };
    const v = buildView(problem({ source: { kind: 'gap' } }), data({ measures: [ppm], readings: [{ id: 'r', projectId: 'P', lineId: 'L1', measureId: 'ppm', at: iso(3), value: 47, createdAt: 1, updatedAt: 1 }] }), TODAY);
    expect(v.says).toBe('Packs per minute on Line 2A: 47 ppm');
  });
});

describe('therefore', () => {
  it('reads the chain back up from the root to the head', () => {
    const c = cause({ text: 'Baskets catch at the transfer.', whys: [
      { id: 'w1', text: 'The guide rail is worn' },
      { id: 'w2', text: 'It is not on the PM schedule' },
      { id: 'w3', text: 'Nobody owns the PM list for moved kit' },
    ] });
    expect(therefore(c, 'Basketer minor stops')).toEqual([
      'Nobody owns the PM list for moved kit, therefore it is not on the PM schedule',
      'It is not on the PM schedule, therefore the guide rail is worn',
      'The guide rail is worn, therefore baskets catch at the transfer',
      'Baskets catch at the transfer, therefore basketer minor stops',
    ]);
  });
  it('keeps an acronym, skips an empty why, and with no whys is one line', () => {
    expect(therefore(cause({ text: 'PLC drops the eye', whys: [{ id: 'w', text: '  ' }] }), 'Stops')).toEqual(['PLC drops the eye, therefore stops']);
    expect(therefore(cause({ whys: [{ id: 'w', text: 'PLC firmware is old' }] }), 'X')[0]).toBe('PLC firmware is old, therefore guide rail worn');
  });
});

describe('legacy Cases still read', () => {
  const legacy: Case = { id: 'old', workspaceId: 'ws1', title: 'seeded case', path: [], baselineMsWeek: 1_200_000, status: 'open', openedAt: at(20), updatedAt: 1, whys: ['because'] };
  it('belongs to the project and the line whose workspace it lives in', () => {
    expect(belongsTo(legacy, 'P', [line, other])).toBe(true);
    expect(belongsTo(legacy, 'P', [line, other], 'L1')).toBe(true);
    expect(belongsTo(legacy, 'P', [line, other], 'L2')).toBe(false);
    expect(belongsTo(legacy, 'P', [other])).toBe(false);
    expect(belongsTo({ ...legacy, deletedAt: 5 }, 'P', [line])).toBe(false);
  });
  it('a new one by its project and line', () => {
    expect(belongsTo(problem(), 'P', [line])).toBe(true);
    expect(belongsTo(problem(), 'Q', [line])).toBe(false);
    expect(belongsTo(problem(), 'P', [line], 'L2')).toBe(false);
    expect(belongsTo(problem({ lineId: undefined }), 'P', [line], 'L1')).toBe(true);    // in the line's workspace
  });
  it('builds a view with no source, no causes and no hold', () => {
    const v = buildView(legacy, data({ observations: [ob({ daysAgo: 8, mins: 60 })] }), TODAY);
    expect(v.bones).toHaveLength(6);
    expect(v.phase).toBe('finding');
    expect(v.measure?.before).toBe(0.3);
    expect(v.measure?.label).toBe('Lost time on Line 2A');
    expect(v.roots).toEqual([]);
  });
});

describe('cause refs and helpers', () => {
  it('round-trips a causeRef', () => {
    expect(parseCauseRef(causeRefOf('C1', 'k1'))).toEqual({ problemId: 'C1', causeId: 'k1' });
    expect(parseCauseRef('')).toBeUndefined();
    expect(parseCauseRef('nocolon')).toBeUndefined();
  });
  it('countermeasuresOf matches the problem’s id prefix, not a longer id', () => {
    const acts = [action({ uid: 'a', causeRef: 'C1:k' }), action({ uid: 'b', causeRef: 'C10:k' })];
    expect(countermeasuresOf(problem(), acts).map(a => a.uid)).toEqual(['a']);
  });
  it('scopeMsWeek is the four-full-week average', () => {
    expect(scopeMsWeek(problem(), data({ observations: [ob({ daysAgo: 8, mins: 120 })] }), TODAY)).toBe(30 * 60_000);
  });
});

describe('sixm — boneOfStop and blamesAPerson', () => {
  it('reads the words first, then the category', () => {
    expect(boneOfStop('Minor stop', 'Film / packaging snag')).toBe('material');
    expect(boneOfStop('Minor stop', 'Checkweigher reject')).toBe('measurement');
    expect(boneOfStop('Breakdown', undefined, 'condensation on the eye')).toBe('environment');
    expect(boneOfStop('Waiting', 'No operator')).toBe('people');
    expect(boneOfStop('Breakdown', 'Changeover parts missing')).toBe('method');
    expect(boneOfStop('Changeover')).toBe('method');
    expect(boneOfStop('Waiting')).toBe('people');
    expect(boneOfStop('Hygiene & cleaning')).toBe('method');
    expect(boneOfStop('Quality')).toBe('material');
    expect(boneOfStop('Breakdown', 'Mechanical')).toBe('machine');
    expect(boneOfStop('Minor stop', 'Misfeed')).toBe('machine');
  });
  it('a why that ends at a person prompts “what let that happen?”', () => {
    expect(blamesAPerson('Operator error')).toMatch(/What let that happen/);
    expect(blamesAPerson('The fitter forgot to tighten it')).toMatch(/What let that happen/);
    expect(blamesAPerson("They didn't follow the SOP")).toMatch(/What let that happen/);
    expect(blamesAPerson('The guide rail is worn')).toBeNull();
    expect(blamesAPerson('No PM schedule for moved kit')).toBeNull();
  });
});
