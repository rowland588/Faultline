/* THE ALL-JOBS BOARD, AS DATA.
 *
 * Rowland: "Line 2B commissioning, and next week Line 2A — how do I manage
 * each of them without going into everything?" One calendar for every job,
 * what is due this week across all of them, and who owes what across them —
 * asserted here, because a board that disagrees with the job it opens is
 * worse than no board. */
import { describe, it, expect } from 'vitest';
import { clusterMarks, jobItems, owedBy, portfolio, shortName, type JobInput } from '../portfolio';
import type { PlacedMark } from '../plan';
import { standing } from '../standing';
import type { Project } from '../../types';
import type { Asset, Test } from '../testing';
import type { Material } from '../materials';

const TODAY = '2026-09-29';
let n = 0;
const project = (o: Partial<Project> & { id: string; name: string }): Project =>
  ({ color: '#2b87d4', workspaceIds: [], createdAt: 1, updatedAt: 1, commissioning: true, ...o }) as Project;
const test = (o: Partial<Test> = {}): Test =>
  ({ id: `t${++n}`, projectId: 'p', title: `Test ${n}`, outcome: 'planned', sort: n, createdAt: 1, updatedAt: 1, ...o });
const mat = (o: Partial<Material> = {}): Material =>
  ({ id: `m${++n}`, projectId: 'p', what: `Material ${n}`, sort: n, createdAt: 1, updatedAt: 1, ...o });
const asset = (o: Partial<Asset> = {}): Asset =>
  ({ id: `a${++n}`, projectId: 'p', name: `Machine ${n}`, state: 'awaited', sort: n, updatedAt: 1, ...o });
const job = (p: Project, o: Partial<JobInput> = {}): JobInput =>
  ({ project: p, tests: [], items: [], materials: [], programs: [], assets: [], ...o });

const twoB = job(project({ id: 'b', name: 'Line 2B', expectedAt: '2026-10-26', plannedAt: '2026-10-18' }), {
  tests: [
    test({ title: 'Changeover', withWhom: 'Ilapak UK', plannedFor: '2026-09-23', outcome: 'notRun' }),
    test({ title: 'Seal', withWhom: 'Ilapak UK', plannedFor: '2026-09-20', ranOn: '2026-09-20', outcome: 'passed' }),
    test({ kind: 'fix', title: 'Re-track the film', withWhom: 'Dave', plannedFor: '2026-10-01' }),
  ],
});
const twoA = job(project({ id: 'a', name: 'Line 2A', color: '#b4632a', expectedAt: '2026-11-16' }), {
  assets: [asset({ name: 'Case erector', oem: 'ilapak uk', dueOn: '2026-09-26' })],
  materials: [mat({ what: 'Lidding film', from: 'Amcor', due: '2026-10-20' })],
  tests: [test({ title: 'Seal — tray', withWhom: 'Multivac UK', plannedFor: '2026-10-08' })],
});

describe('every job, one calendar', () => {
  const pf = portfolio([twoA, twoB], TODAY);

  it('puts the job handing over first, first', () => {
    expect(pf.jobs.map(j => j.name)).toEqual(['Line 2B', 'Line 2A']);
  });

  it('draws every job on the same months', () => {
    const [b, a] = pf.jobs;
    expect(b.axis.from).toBe(a.axis.from);
    expect(b.axis.to).toBe(a.axis.to);
    expect(b.axis.ticks).toEqual(a.axis.ticks);
    expect(pf.axis.today).toBe(b.axis.today);
  });

  it('says of each job exactly what the job says of itself', () => {
    const own = standing({ ...twoB, expectedAt: '2026-10-26', plannedAt: '2026-10-18', today: TODAY });
    const b = pf.jobs.find(j => j.id === 'b');
    expect(b).toMatchObject({ sentence: own.sentence, outstanding: own.outstanding, late: own.late });
  });

  it('fills a job’s bar by how much of it has happened', () => {
    const b = pf.jobs.find(j => j.id === 'b');
    expect(b).toMatchObject({ done: 1, total: 3 });
    expect(b?.from).toBeLessThan(b?.to ?? 0);
  });

  it('reaches the handover date even where nothing else falls', () => {
    const a = pf.jobs.find(j => j.id === 'a');
    expect(a?.to).toBe(a?.axis.expected?.at);
  });
});

describe('this week, across every job', () => {
  const pf = portfolio([twoA, twoB], TODAY);

  it('takes what is late and what falls due inside a week, from every job, late first', () => {
    expect(pf.week.map(x => `${x.job}:${x.what}`)).toEqual([
      'Line 2B:Changeover', 'Line 2A:Case erector', 'Line 2B:Re-track the film',
    ]);
    expect(pf.week.slice(0, 2).every(x => x.late)).toBe(true);
  });

  it('leaves out what is further off than a week', () => {
    expect(pf.week.some(x => x.what === 'Lidding film' || x.what === 'Seal — tray')).toBe(false);
  });

  it('names the record a test or fix opens, and none for a list row', () => {
    expect(pf.week.find(x => x.what === 'Changeover')?.id).toBeDefined();
    expect(pf.week.find(x => x.what === 'Case erector')?.id).toBeUndefined();
  });
});

describe('who owes what, across the jobs', () => {
  const pf = portfolio([twoA, twoB], TODAY);

  it('adds up a party across jobs, whatever case it was typed in', () => {
    const ilapak = pf.owes.find(o => o.who.toLowerCase() === 'ilapak uk');
    expect(ilapak).toMatchObject({ open: 2, late: 2 });
    expect(ilapak?.byJob.map(b => [b.job, b.open])).toEqual([['Line 2B', 1], ['Line 2A', 1]]);
  });

  it('puts whoever is furthest behind first', () => {
    expect(pf.owes[0].who.toLowerCase()).toBe('ilapak uk');
  });

  it('says it in one sentence, naming who carries most of the late', () => {
    expect(pf.says).toBe('2 jobs running · Line 2B hands over first, in 27 days. 2 things past the day — all of them ilapak uk’s.'
      .replace('ilapak uk', pf.owes[0].who));
    expect(pf.totals).toMatchObject({ jobs: 2, late: 2 });
  });
});

describe('the edges', () => {
  it('says so when nothing is past its day', () => {
    const calm = job(project({ id: 'c', name: 'Line 3', expectedAt: '2026-12-01' }),
      { tests: [test({ plannedFor: '2026-10-30' })] });
    expect(portfolio([calm], TODAY).says).toBe('1 job running · Line 3 hands over first, in 63 days. Nothing is past its day.');
  });

  it('puts a job with no handover date last', () => {
    const undated = job(project({ id: 'u', name: 'AAA undated' }));
    expect(portfolio([undated, twoB], TODAY).jobs.map(j => j.id)).toEqual(['b', 'u']);
  });

  it('draws a board with no jobs without falling over', () => {
    const pf = portfolio([], TODAY);
    expect(pf.jobs).toEqual([]);
    expect(pf.says).toBe('No commissioning job running yet.');
  });

  it('never counts a deleted record', () => {
    const j = job(project({ id: 'd', name: 'Line 4' }), { tests: [test({ plannedFor: '2026-09-01', deletedAt: 5 })] });
    expect(jobItems(j, TODAY)).toEqual([]);
  });
});

describe('what the review asked for', () => {
  it('drops "commissioning" from a job’s name on the board, and keeps a name that is only that word', () => {
    expect(shortName('Line 2B commissioning')).toBe('Line 2B');
    expect(shortName('Commissioning — Line 7')).toBe('— Line 7');
    expect(shortName('Commissioning')).toBe('Commissioning');
    expect(shortName('Line 3')).toBe('Line 3');
  });

  it('lists everything owed, late first, so a number on the board opens what it counts', () => {
    const pf = portfolio([twoA, twoB], TODAY);
    expect(pf.items.length).toBe(pf.owes.reduce((n, o) => n + o.open, 0));
    expect(pf.items.findIndex(x => !x.late)).toBe(pf.items.filter(x => x.late).length);
  });

  it('finds what one party owes across jobs, whatever case it was typed in', () => {
    const pf = portfolio([twoA, twoB], TODAY);
    expect(pf.items.filter(x => owedBy(x, 'Ilapak UK')).map(x => x.what).sort()).toEqual(['Case erector', 'Changeover']);
    expect(pf.items.filter(x => owedBy(x, 'Nobody named')).length).toBe(0);
  });

  describe('dots that land on top of each other', () => {
    const m = (at: number, tone: PlacedMark['tone'], label = `m${at}`): PlacedMark => ({ kind: 'test', at, label, when: '1 Oct', tone });

    it('become one dot with the count, when closer than the gap', () => {
      const c = clusterMarks([m(0.5, 'booked'), m(0.505, 'done'), m(0.9, 'booked')]);
      expect(c.map(x => x.marks.length)).toEqual([2, 1]);
    });

    it('take the colour of the most urgent thing inside', () => {
      expect(clusterMarks([m(0.3, 'done'), m(0.301, 'late'), m(0.302, 'booked')])[0].tone).toBe('late');
    });

    it('leave dots apart when they are apart, in date order', () => {
      expect(clusterMarks([m(0.8, 'done'), m(0.2, 'done')]).map(x => x.at)).toEqual([0.2, 0.8]);
    });
  });
});
