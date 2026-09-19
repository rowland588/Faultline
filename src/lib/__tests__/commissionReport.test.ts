/* THE SHEET MUST NOT HAVE ITS OWN OPINION.
 *
 * The one failure that matters here is divergence. If the A3 says "ready" and the
 * screen says "five things in the way", the sheet is the copy that gets printed
 * and read out in front of the OEM, and the argument that follows is about the
 * paperwork rather than the line. That is why buildCommissionReport is allowed to
 * FORMAT and not to decide — and why the first test below compares its verdict,
 * blocker list and every count against readiness() itself rather than against a
 * hardcoded expectation. A hardcoded expectation would pass happily while the two
 * drifted apart.
 *
 * Everything after it is wording, which is the sheet's real work: a handover
 * argument is always the same shape — this is what we agreed, this is what it
 * actually did — so every row has to print both, and neither cell may ever come
 * out blank. A blank reads as an oversight by whoever filled the sheet in, not as
 * a gap in the handover.
 */
import { describe, it, expect } from 'vitest';
import { buildCommissionReport, headlineFor, whereItStands } from '../buildCommissionReport';
import {
  LINE_ITSELF, readiness,
  type CommissionItem, type Program, type Material, type Check, type Punch, type Task, type Run,
} from '../commissioning';

const AT = Date.parse('2026-09-14T08:00:00Z');
const NOW = Date.parse('2026-09-19T09:00:00Z');
const DAY = 86_400_000;
const iso = (offsetDays: number) => new Date(NOW + offsetDays * DAY).toISOString().slice(0, 10);

let n = 0;
const base = () => {
  n += 1;
  return { id: `i${n}`, projectId: 'p1', title: `Item ${n}`, sort: n, createdAt: 1, updatedAt: 1 };
};
const run = (achieved: number, extra: Partial<Run> = {}): Run => ({ id: `r${n}-${achieved}`, at: AT, achieved, ...extra });
const program = (p: Partial<Program> = {}): Program => ({ ...base(), kind: 'program', agreedRate: 60, written: true, ...p });
const material = (m: Partial<Material> = {}): Material => ({ ...base(), kind: 'material', need: 10, have: 10, ...m });
const check = (c: Partial<Check> = {}): Check => ({ ...base(), kind: 'check', criterion: 'no metal above 2.0mm passes', outcome: 'pass', ...c });
const punch = (p: Partial<Punch> = {}): Punch => ({ ...base(), kind: 'punch', severity: 'C', raisedAt: AT, ...p });
const task = (t: Partial<Task> = {}): Task => ({ ...base(), kind: 'task', state: 'done', ...t });

const build = (items: CommissionItem[]) =>
  buildCommissionReport({ title: 'Line 2 — Brillopack upgrade', lead: 'Rowland Glew', items, now: NOW });

/** One item of each kind, mid-handover: two blockers, a bit of everything. */
const realistic = (): CommissionItem[] => [
  program({ asset: 'Brillopack bagger', title: '500g tray', agreedRate: 60, rateUnit: 'ppm', runs: [run(51, { by: 'A. Shaw', minutes: 30 })] }),
  program({ asset: 'Ishida multihead', title: '1kg bag', written: false, agreedRate: 40 }),
  material({ asset: 'Brillopack bagger', title: 'Film 320mm', need: 12, have: 4, onOrder: 8, unit: 'rolls', due: iso(5) }),
  check({ asset: 'Ishida multihead', title: 'Metal detection', outcome: 'fail', result: '2.5mm ferrous passed', witnessedBy: 'QA', at: AT }),
  punch({ asset: 'Brillopack bagger', title: 'Former roller misaligned', severity: 'A' }),
  task({ title: 'Operators trained on changeover', state: 'todo', owner: 'Rowland' }),
];

describe('the sheet reads the app’s verdict, never its own', () => {
  it('carries canSignOff, the blockers and every count straight off readiness()', () => {
    const items = realistic();
    const truth = readiness(items);
    const report = build(items);

    expect(report.canSignOff).toBe(truth.canSignOff);
    expect(report.ready).toEqual(truth);
    // Same blockers, same order. The order IS the judgement — worst first,
    // because the list is read from the top in a meeting.
    expect(report.blockers.map(b => b.what)).toEqual(truth.blockers.map(b => b.what));
    expect(report.blockers.map(b => b.asset)).toEqual(truth.blockers.map(b => b.asset));
  });

  it('agrees with readiness() on a job that IS ready', () => {
    const items = [program({ runs: [run(61) ] }), check({ outcome: 'pass' }), material()];
    const report = build(items);
    expect(report.canSignOff).toBe(true);
    expect(report.blockers).toEqual([]);
    expect(report.ready.pct).toBe(1);
  });

  it('never reads an empty file as ready', () => {
    const report = build([]);
    expect(report.canSignOff).toBe(false);
    expect(report.rows).toEqual([]);
    expect(report.assets).toEqual([]);
    expect(report.headline).toContain('empty');
  });

  it('leaves deleted records off the sheet entirely', () => {
    const report = build([
      program({ title: 'Live', runs: [run(61)] }),
      program({ title: 'Deleted', written: false, deletedAt: 5 }),
    ]);
    expect(report.rows.map(r => r.title)).toEqual(['Live']);
    expect(report.canSignOff).toBe(true);
  });

  it('marks the rows that are in the way, so the detail sheet stands alone', () => {
    const report = build(realistic());
    const blocking = report.rows.filter(r => r.blocking).map(r => r.title).sort();
    // Film is NOT among them: eight rolls are on order and not yet due, which is
    // a thing to watch rather than a thing stopping the handover. The screen
    // draws exactly the same distinction, off exactly the same function.
    expect(blocking).toEqual([
      '1kg bag', '500g tray', 'Former roller misaligned',
      'Metal detection', 'Operators trained on changeover',
    ]);
    // …and nothing that is fine is marked.
    const fine = build([program({ title: 'Proven', runs: [run(61)] })]);
    expect(fine.rows[0].blocking).toBe(false);
  });
});

describe('every row prints what was agreed beside what happened', () => {
  const rowFor = (i: CommissionItem) => build([i]).rows[0];

  it('a program: the contractual rate against the best witnessed run', () => {
    const r = rowFor(program({ title: '500g tray', agreedRate: 60, rateUnit: 'ppm', runs: [run(51, { by: 'A. Shaw', minutes: 30, wastePct: 2.4 })] }));
    expect(r.agreed).toBe('60 ppm');
    expect(r.evidence).toBe('51 ppm · over 30 min · 2.4% waste · 14 Sept · witnessed by A. Shaw');
    expect(r.stateLabel).toBe('Below rate');
    expect(r.kindLabel).toBe('Program');
  });

  it('a program nobody wrote says so, rather than showing a blank', () => {
    const r = rowFor(program({ written: false }));
    expect(r.evidence).toBe('Not written on the machine');
    expect(r.stateLabel).toBe('No program');
  });

  it('a program written but never run says that instead', () => {
    expect(rowFor(program({ runs: [] })).evidence).toBe('No run recorded');
  });

  it('shows the previous best too, because that is the only movement on the sheet', () => {
    const r = rowFor(program({ agreedRate: 60, rateUnit: 'ppm', runs: [run(61), run(48)] }));
    expect(r.evidence).toContain('61 ppm');
    expect(r.was).toBe('48 ppm');
    expect(r.passes).toBe(2);
  });

  it('a single run has no "was" — there is nothing to compare it with', () => {
    expect(rowFor(program({ runs: [run(61)] })).was).toBeUndefined();
  });

  it('material: what the line needs against what is actually here', () => {
    const r = rowFor(material({ title: 'Film 320mm', need: 12, have: 4, onOrder: 8, unit: 'rolls', due: iso(5) }));
    expect(r.agreed).toBe('12 rolls');
    expect(r.evidence).toBe('4 of 12 here · 8 on order · wanted 24 Sept');
    expect(r.stateLabel).toBe('On order');
  });

  it('material with nothing on order says nothing is on order, in those words', () => {
    expect(rowFor(material({ need: 12, have: 0 })).evidence).toContain('nothing on order');
  });

  it('material that is in reads as in, not as a fraction of itself', () => {
    expect(rowFor(material({ need: 12, have: 12, unit: 'rolls' })).evidence).toBe('All 12 rolls on site');
  });

  it('a check: the criterion agreed in advance against the result and the witness', () => {
    const r = rowFor(check({ title: 'Metal detection', criterion: 'no metal above 2.0mm passes', outcome: 'fail', result: '2.5mm ferrous passed', witnessedBy: 'QA', at: AT }));
    expect(r.agreed).toBe('no metal above 2.0mm passes');
    expect(r.evidence).toBe('2.5mm ferrous passed · 14 Sept · witnessed by QA');
    expect(r.stateLabel).toBe('FAILED');
    expect(r.who).toBe('QA');
  });

  it('a passed check with no witness recorded says so — that is a finding', () => {
    const r = rowFor(check({ outcome: 'pass', at: AT }));
    expect(r.evidence).toBe('Met the criterion · 14 Sept · no witness recorded');
  });

  it('an unrun check says not run rather than printing an empty result', () => {
    expect(rowFor(check({ outcome: 'notRun' })).evidence).toBe('Not run yet');
  });

  it('a defect: the grade and what it means, then how long it has been open', () => {
    const r = rowFor(punch({ severity: 'A', raisedAt: AT, fixBy: 'OEM' }));
    expect(r.kindLabel).toBe('Defect A');
    expect(r.agreed).toBe('A — blocks sign-off');
    expect(r.evidence).toBe('Open since 14 Sept');
    expect(r.who).toBe('OEM');
    expect(r.stateLabel).toBe('Open (A)');
  });

  it('a closed defect says when, so the sheet is a record and not just a to-do', () => {
    const r = rowFor(punch({ severity: 'B', raisedAt: AT, closedAt: NOW }));
    expect(r.evidence).toBe('Closed 19 Sept');
    expect(r.stateLabel).toBe('Closed');
  });

  it('never leaves either half of the argument blank, whatever the record', () => {
    const rows = build([
      program({ written: false }), program({ runs: [] }), program({ runs: [run(1)] }),
      material({ need: 1, have: 0 }), material({ need: 1, have: 1 }),
      check({ outcome: 'notRun' }), check({ outcome: 'pass' }), check({ outcome: 'fail' }),
      punch({ severity: 'A' }), punch({ severity: 'C', closedAt: NOW }),
      task({ state: 'todo' }), task({ state: 'done' }),
    ]).rows;
    for (const r of rows) {
      expect(r.agreed.length, `${r.title} has no agreed figure`).toBeGreaterThan(0);
      expect(r.evidence.length, `${r.title} has no evidence`).toBeGreaterThan(0);
      expect(r.stateLabel.length).toBeGreaterThan(0);
      expect(r.kindLabel.length).toBeGreaterThan(0);
    }
  });

  it('gives every kind its own word, and the defect grade is part of it', () => {
    expect(build([
      program(), material(), check(), punch({ severity: 'B' }), task(),
    ]).rows.map(r => r.kindLabel)).toEqual(['Program', 'Material', 'Acceptance', 'Defect B', 'Obligation']);
  });
});

describe('the sheet is laid out the way a handover meeting runs', () => {
  it('groups by machine, alphabetically, with the line’s own work last', () => {
    const report = build([
      task({ asset: undefined, title: 'Safety file' }),
      program({ asset: 'Palletiser', runs: [run(61)] }),
      program({ asset: 'Bagger', runs: [run(61)] }),
    ]);
    expect(report.rows.map(r => r.asset)).toEqual(['Bagger', 'Palletiser', LINE_ITSELF]);
    expect(report.assets.map(a => a.name)).toEqual(['Bagger', 'Palletiser', LINE_ITSELF]);
    expect(report.assets[report.assets.length - 1].isLine).toBe(true);
  });

  it('orders within a machine: what it must run, what it needs, tests, defects, paperwork', () => {
    const report = build([
      task({ asset: 'Bagger', title: 'T' }),
      punch({ asset: 'Bagger', title: 'P' }),
      check({ asset: 'Bagger', title: 'C' }),
      material({ asset: 'Bagger', title: 'M' }),
      program({ asset: 'Bagger', title: 'G' }),
    ]);
    expect(report.rows.map(r => r.title)).toEqual(['G', 'M', 'C', 'P', 'T']);
  });

  it('gives each machine its own verdict rather than one number for the line', () => {
    const report = build([
      program({ asset: 'Bagger', runs: [run(61)] }),
      program({ asset: 'Palletiser', written: false }),
    ]);
    const bagger = report.assets.find(a => a.name === 'Bagger')!;
    const pal = report.assets.find(a => a.name === 'Palletiser')!;
    expect(bagger).toMatchObject({ canSignOff: true, blockers: 0, pct: 1 });
    expect(pal).toMatchObject({ canSignOff: false, blockers: 1, pct: 0 });
  });

  it('attaches the pictures it was handed, by record id', () => {
    const p = program({ title: 'With a photo', runs: [run(61)] });
    const report = buildCommissionReport({
      title: 'x', items: [p, material()], now: NOW,
      shots: new Map([[p.id, [{ data: 'data:image/jpeg;base64,AA', w: 100, h: 60, caption: 'the crease' }]]]),
    });
    expect(report.rows.find(r => r.title === 'With a photo')!.shots).toHaveLength(1);
    expect(report.rows.find(r => r.title !== 'With a photo')!.shots).toBeUndefined();
  });
});

describe('the headline says what the problem is MADE of', () => {
  it('leads with the grades that stop a handover', () => {
    const r = readiness([
      punch({ severity: 'A' }), punch({ severity: 'A' }),
      check({ outcome: 'fail' }),
      program({ written: false }),
    ]);
    expect(headlineFor(r, true)).toBe('2 grade-A defects open · 1 acceptance test failed · 1 program not written');
  });

  it('says it plainly when the line can be accepted', () => {
    expect(headlineFor(readiness([program({ runs: [run(61)] })]), true))
      .toBe('Every obligation met. This line can be accepted.');
  });

  it('says the file is empty rather than implying the job is done', () => {
    expect(headlineFor(readiness([]), false)).toContain('empty');
  });

  it('counts outstanding obligations, which is what actually holds most handovers up', () => {
    const r = readiness([task({ state: 'todo' }), task({ state: 'doing' }), task({ state: 'done' })]);
    expect(headlineFor(r, true)).toBe('2 obligations outstanding');
  });

  it('stops at four, because the panel beside it carries the rest', () => {
    const r = readiness([
      punch({ severity: 'A' }), check({ outcome: 'fail' }), program({ written: false }),
      program({ agreedRate: 60, runs: [run(10)] }), material({ need: 2, have: 0 }),
      program({ runs: [] }), check({ outcome: 'notRun' }), task({ state: 'todo' }),
    ]);
    expect(headlineFor(r, true).split(' · ')).toHaveLength(4);
  });
});

describe('whereItStands uses the domain word, not the colour', () => {
  it('tells "No program" and "Below rate" apart, which both draw red', () => {
    expect(whereItStands(program({ written: false }))).toBe('No program');
    expect(whereItStands(program({ agreedRate: 60, runs: [run(10)] }))).toBe('Below rate');
  });

  it('has a word for every state of every kind', () => {
    const words = [
      program({ written: false }), program({ runs: [] }), program({ agreedRate: 60, runs: [run(1)] }), program({ runs: [run(99)] }),
      material({ need: 1, have: 1 }), material({ need: 1, have: 0 }), material({ need: 1, have: 0, onOrder: 1, due: iso(9) }), material({ need: 1, have: 0, onOrder: 1, due: '2001-01-01' }),
      check({ outcome: 'pass' }), check({ outcome: 'fail' }), check({ outcome: 'notRun' }),
      punch({ severity: 'A' }), punch({ severity: 'A', closedAt: NOW }),
      task({ state: 'todo' }), task({ state: 'doing' }), task({ state: 'waiting' }), task({ state: 'done' }),
    ].map(whereItStands);
    expect(words.every(w => w.length > 0)).toBe(true);
    expect(new Set(words).size).toBe(words.length - 1);   // only the two 'Open (A)' repeat
  });
});
