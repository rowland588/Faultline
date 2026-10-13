/* A LINE'S OWN WORK IN THE CONTROL ROOM (lib/lineWork, lib/portfolio).
 *
 * The flow audit, 13 October (finding 1): a Critical problem on Line 7, three
 * days late and owed by Priya, changed none of the control room's late, its
 * critical, Who owes what, This week or its report — and a line's program
 * past its test day was in none of them either. Asserted here: the line's own
 * problems and programs are counted by the one rule, beside the jobs', never
 * twice, and on paper. */
import { describe, it, expect } from 'vitest';
import { lineItems, lineProblems, lineProblemsSaid, type LineInput } from '../lineWork';
import { portfolio, type JobInput } from '../portfolio';
import { controlRoomReport, CR_STEPS } from '../controlRoomReport';
import type { Snag } from '../../snag/types';
import type { Program } from '../programs';
import type { Project } from '../../types';
import type { Test } from '../testing';

const TODAY = '2026-10-13';
const REF = new Date(2026, 9, 13, 12).getTime();
const day = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d).getTime(); };
let n = 0;
const snag = (o: Partial<Snag> = {}): Snag => ({
  id: `s${++n}`, workspaceId: 'L7', problem: `Problem ${n}`, status: 'open', raisedAt: day('2026-10-08'), updatedAt: 1, media: [], ...o,
});
const program = (o: Partial<Program> = {}): Program => ({
  id: `p${++n}`, projectId: '', workspaceId: 'L7', what: `P-${n}`, state: 'needed', sort: n, createdAt: 1, updatedAt: 1, ...o,
});
const line7 = (snags: Snag[], programs: Program[] = []): LineInput => ({ line: { id: 'L7', name: 'Line 7' }, snags, programs });

const crit = snag({ problem: 'Bagger jaw jams on 2kg film', priority: 'critical', owner: 'Priya Shah', dueAt: day('2026-10-10'), targetAsset: 'Bagger', proposedSolution: 'Run the 1.25 kg film' });
const lateProgram = program({ what: 'P-200 Express', from: 'Ishida Europe', testOn: '2026-10-09' });

describe("a line's own problems", () => {
  it('reads the register: open, not put away, not moved — critical and late counted', () => {
    const p = lineProblems([
      crit, snag({ status: 'closed' }), snag({ archivedAt: 1 }), snag({ deletedAt: 1 }),
      snag({ sent: [{ projectId: 'j', itemId: 'i', at: 1 }] }), snag({ workspaceId: 'L2' }), snag({ priority: 'high' }),
    ], { id: 'L7', name: 'Line 7' }, { ref: REF });
    expect(p).toMatchObject({ open: 2, critical: 1, late: 1 });
    expect(p.rows[0].what).toBe('Bagger jaw jams on 2kg film');
  });

  it('says the abnormal in red, every piece with its word', () => {
    expect(lineProblemsSaid({ open: 3, critical: 1, late: 2 })).toEqual([
      { text: '3 problems open' }, { text: ' · ' }, { text: '1 critical', red: true }, { text: ' · ' }, { text: '2 late', red: true },
    ]);
    expect(lineProblemsSaid({ open: 0, critical: 0, late: 0 })).toEqual([{ text: 'No problems open' }]);
  });

  it('chases a problem once somebody or a day is on it, and a critical one always', () => {
    const { items, critical } = lineItems(line7([crit, snag({ owner: 'Dave' }), snag({ dueAt: day('2026-10-20') }), snag(), snag({ priority: 'critical' })]), TODAY, REF);
    expect(items.map(x => x.who || x.on)).toEqual(['Priya Shah', 'Dave', '2026-10-20']);
    expect(items[0]).toMatchObject({ kind: 'problem', line: 'L7', job: 'Line 7', on: '2026-10-10', late: true });
    expect(critical).toHaveLength(2);
    expect(critical[0].critical).toMatchObject({ where: 'Bagger', word: '3 days late', more: 'going with: Run the 1.25 kg film' });
  });
});

describe("a line's own programs", () => {
  it('owes every one not proved, late past its test day — a job\'s program is the job\'s, never the line\'s', () => {
    const { items } = lineItems(line7([], [lateProgram, program({ provedOn: '2026-10-01' }), program({ projectId: 'job', testOn: '2026-10-01' }), program({ workspaceId: 'L2' })]), TODAY, REF);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ kind: 'program', what: 'P-200 Express', who: 'Ishida Europe', on: '2026-10-09', late: true });
  });
});

describe('the control room counts the line beside the jobs', () => {
  const project = (o: Partial<Project> & { id: string; name: string }): Project =>
    ({ color: '#2b87d4', workspaceIds: [], createdAt: 1, updatedAt: 1, commissioning: true, ...o }) as Project;
  const test = (o: Partial<Test> = {}): Test =>
    ({ id: `t${++n}`, projectId: 'b', title: `Test ${n}`, outcome: 'planned', sort: n, createdAt: 1, updatedAt: 1, ...o });
  const jobs: JobInput[] = [{
    project: project({ id: 'b', name: 'Line 2B', expectedAt: '2026-11-26' }),
    tests: [test({ title: 'Changeover', withWhom: 'Ilapak UK', plannedFor: '2026-10-07', outcome: 'notRun' })],
    items: [], materials: [], programs: [], assets: [],
  }];
  const quiet = line7([snag()]);
  const before = portfolio(jobs, TODAY, [], [quiet], REF);
  const after = portfolio(jobs, TODAY, [], [line7([crit, snag()], [lateProgram])], REF);

  it('a line with nothing to chase is not drawn, and changes nothing', () => {
    expect(before.lines).toEqual([]);
    expect(before.totals).toMatchObject({ late: 1, critical: 0, lineLate: 0 });
  });

  it('a late Critical problem and a late program move late, critical, the week and who owes what', () => {
    expect(after.totals).toMatchObject({ late: 3, critical: 1, lineLate: 2, week: before.totals.week + 2 });
    expect(after.lines).toHaveLength(1);
    expect(after.lines[0]).toMatchObject({ name: 'Line 7', late: 2 });
    expect(after.critical.map(x => x.what)).toEqual(['Bagger jaw jams on 2kg film']);
    expect(after.items.filter(x => x.late).map(x => x.what)).toEqual(expect.arrayContaining(['Bagger jaw jams on 2kg film', 'P-200 Express']));
    /* Priya is the site's; Ishida Europe a supplier, its share on Line 7 */
    const site = after.owes.find(o => o.who === 'The site');
    expect(site).toMatchObject({ open: 1, late: 1 });
    const ishida = after.owes.find(o => o.who === 'Ishida Europe');
    expect(ishida?.byJob).toEqual([{ jobId: 'line:L7', job: 'Line 7', color: 'var(--ink-2)', open: 1, late: 1 }]);
  });

  it('says where the late is', () => {
    expect(after.says).toMatch(/3 things late.*2 on Line 7, outside any job\.$/);
    expect(portfolio([], TODAY, [], [line7([crit])], REF).says).toBe('No job running yet. 1 thing late — 1 on Line 7, outside any job · 1 critical on the lines.');
  });

  it('prints the line on the report, beside every job, at every step — a row, and at the very last a line', () => {
    for (const step of CR_STEPS) {
      const r = controlRoomReport(after, TODAY, step);
      if (step.lineRows) {
        expect(r.lines.map(l => l.name)).toEqual(['Line 7']);
        expect(r.lines[0]).toMatchObject({ word: '2 late', tone: 'behind', late: 2 });
      } else {
        expect(r.lines).toEqual([]);
        expect(r.linesSaid).toBe('Line 7: 2 late, 1 critical');
      }
      expect(r.totals).toEqual(after.totals);
    }
    expect(controlRoomReport(after, TODAY).lines[0].critical).toBe('1 critical: Bagger jaw jams on 2kg film');
    expect(controlRoomReport(after, TODAY).late.map(l => l.job)).toEqual(expect.arrayContaining(['Line 7']));
  });

  it('a line owing work with nothing late or critical is counted under the rows, never a row of its own', () => {
    const owing = portfolio(jobs, TODAY, [], [line7([crit], [lateProgram]), { line: { id: 'L2', name: 'Line 2' }, snags: [snag({ workspaceId: 'L2', owner: 'Dave' })], programs: [] }], REF);
    const r = controlRoomReport(owing, TODAY);
    expect(r.lines.map(l => l.name)).toEqual(['Line 7']);
    expect(r.linesQuiet).toBe('and 1 more line owes 1, none of it late — on the control room.');
  });
});
