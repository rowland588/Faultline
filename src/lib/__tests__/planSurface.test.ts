/* WHAT A PROJECT IS ALLOWED TO SHOW, BY THE PLAN IT RUNS ON.
 *
 * A commissioning job was still wearing the tracker. The lens ROW was filtered
 * for it and the page BODIES underneath never were, so the front page of a
 * handover opened on "0/2 lines at target — latest week vs Q1", a 3P board
 * asking for a weekly workbook, and a Line pace chart per line. Typing
 * ?view=data straight into the URL brought the numbers panel back even after the row
 * hid it, because the body read the URL rather than the row.
 *
 * So the rule is written down once, here, and both screens resolve their lens
 * through it: a lens a project has not got falls back to its overview. Hiding a
 * door is not the same as closing it.
 */
import { describe, it, expect } from 'vitest';
import { planModel, setPlanModel } from '../planModel';
import type { Project } from '../../types';

const project = (over: Partial<Project> = {}): Project => ({
  id: 'p1', name: 'Line 2', color: '#0b7d68', workspaceIds: [],
  createdAt: 1, updatedAt: 1, ...over,
});

/* The two lens tables, mirrored from the screens. Kept as data so the rule can
   be tested without mounting React — the screens filter with exactly these. */
const PROJECT_LENSES = ['overview', 'lines', 'next', 'wins', 'snags', 'data'] as const;
const LINE_LENSES = ['overview', 'meeting', 'next', 'wins', 'snags', 'data'] as const;
type L = string;

const projectLensesFor = (p: Project): L[] =>
  planModel(p) === 'commissioning'
    ? PROJECT_LENSES.filter(l => l === 'overview' || l === 'snags')
    : [...PROJECT_LENSES];

const lineLensesFor = (p: Project): L[] =>
  planModel(p) === 'commissioning'
    ? LINE_LENSES.filter(l => ['overview', 'next', 'wins', 'snags'].includes(l))
    : [...LINE_LENSES];

/** The fallback both screens apply. */
const resolve = (asked: L, shown: L[]): L => (shown.includes(asked) ? asked : 'overview');

describe('a commissioning job has none of the tracker', () => {
  const job = project(setPlanModel('commissioning'));

  it('is a commissioning project, not a board or a tree', () => {
    expect(planModel(job)).toBe('commissioning');
    expect(job.leverTree).toBeUndefined();
  });

  it('drops the measures, the per-line packs and the weekly upload', () => {
    const lenses = projectLensesFor(job);
    expect(lenses).toEqual(['overview', 'snags']);
    // The three that only exist because of the weekly tracker.
    for (const gone of ['data', 'lines']) expect(lenses).not.toContain(gone);
  });

  it('keeps the walk — filming is how a defect gets proved', () => {
    expect(projectLensesFor(job)).toContain('snags');
    expect(lineLensesFor(job)).toContain('snags');
  });

  it('drops the tracker slice and the numbers from a line, keeping its own work', () => {
    const lenses = lineLensesFor(job);
    expect(lenses).toEqual(['overview', 'next', 'wins', 'snags']);
    expect(lenses).not.toContain('meeting');   // this line's slice of the tracker
    expect(lenses).not.toContain('data');      // the readings
  });

  it('SENDS A HIDDEN LENS TO THE OVERVIEW rather than rendering it anyway', () => {
    /* The actual bug. ?view=data drew the workbook upload and the numbers panel on
       a handover for as long as the body read the URL instead of the row. */
    for (const asked of ['data', 'lines', 'meeting']) {
      expect(resolve(asked, projectLensesFor(job)), `project ?view=${asked}`).toBe('overview');
      expect(resolve(asked, lineLensesFor(job)), `line ?view=${asked}`).toBe('overview');
    }
  });

  it('leaves a lens it DOES have alone', () => {
    expect(resolve('snags', projectLensesFor(job))).toBe('snags');
    expect(resolve('wins', lineLensesFor(job))).toBe('wins');
  });
});

describe('an improvement project is untouched by any of this', () => {
  const board = project(setPlanModel('board'));

  it('keeps every lens it always had', () => {
    expect(projectLensesFor(board)).toEqual([...PROJECT_LENSES]);
    expect(lineLensesFor(board)).toEqual([...LINE_LENSES]);
  });

  it('still resolves a real lens to itself', () => {
    expect(resolve('data', projectLensesFor(board))).toBe('data');
    expect(resolve('meeting', lineLensesFor(board))).toBe('meeting');
  });

  it('and a lever tree is a board for this purpose — it has the tracker too', () => {
    const tree = project(setPlanModel('tree'));
    expect(planModel(tree)).toBe('tree');
    expect(projectLensesFor(tree)).toEqual([...PROJECT_LENSES]);
  });
});
