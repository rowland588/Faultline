/* FC-222 — the skills matrix and cover (knowledge/specs/FC-222-skills-matrix.md).
 * Independent case: scripts/knowledge/cases-projects-people-ergo-sust.py "Skills matrix" (a second implementation, run with `python3 -I`):
 * target 3 — wrapper set-up days 3 / nights 1, labeller set-up days 2 / nights 1, CCP cook check days 4 / nights 2. */
import { describe, expect, it } from 'vitest';
import def from '../../scored/defs/skills-matrix';
import { studyScored } from '../../scored/scored';
import { analyseSkills, skills, skillsTable, summarizeSkills, type SkillsIn, type SkillsResult } from '../skills';

const ex = def.examples[0];
const input: SkillsIn = { tasks: ex.criteria ?? [], people: ex.rows };
const ok = (i: SkillsIn): SkillsResult => { const r = skills(i); if (!('ok' in r)) throw new Error(r.problems.join(' ')); return r.ok; };
const cell = (r: SkillsResult, task: string, shift: string) => r.cells.find(c => c.task === task && c.shift === shift)!;

describe('cover, by task and shift (the python case)', () => {
  const r = ok(input);
  it('counts the people at U or O on each shift', () => {
    expect(r.shifts).toEqual(['Days', 'Nights']);
    const cover = Object.fromEntries(r.cells.map(c => [`${c.task}|${c.shift}`, c.cover]));
    expect(cover).toEqual({
      'Wrapper set-up|Days': 3, 'Wrapper set-up|Nights': 1,
      'Labeller set-up|Days': 2, 'Labeller set-up|Nights': 1,
      'CCP cook check|Days': 4, 'CCP cook check|Nights': 2,
    });
  });
  it('the single points are the wrapper and the labeller on nights; no one is at none', () => {
    expect(r.singles.map(c => `${c.task} on ${c.shift}`)).toEqual(['Wrapper set-up on Nights', 'Labeller set-up on Nights']);
    expect(r.singles.map(c => c.names)).toEqual([['Eli'], ['Eli']]);
    expect(r.nobody).toEqual([]);
    expect(r.atTarget).toBe(2);
  });
  it('the gaps are the training plan, the biggest first (the two single points lead)', () => {
    expect(r.gaps.map(c => `${c.task}|${c.shift}|${c.gap}`)).toEqual(['Wrapper set-up|Nights|2', 'Labeller set-up|Nights|2', 'Labeller set-up|Days|1', 'CCP cook check|Nights|1']);
  });
  it('a teacher is a person at O; each task here has one', () => {
    expect(r.tasks.map(t => [t.name, t.teachers])).toEqual([['Wrapper set-up', 1], ['Labeller set-up', 1], ['CCP cook check', 1]]);
    expect(r.noTeacher).toEqual([]);
  });
  it('a person’s versatility is the tasks at U or above', () => {
    expect(Object.fromEntries(r.people.map(p => [p.name, p.can]))).toEqual({ Amy: 3, Ben: 3, Cal: 2, Dee: 1, Eli: 3, Fay: 1, Gus: 0 });
  });
});

describe('what it says', () => {
  const r = ok(input);
  const s = summarizeSkills(r, {});
  it('the verdict, sentence and tiles', () => {
    expect(s.verdict).toBe('2 single points of cover');
    expect(s.tone).toBe('a');
    expect(s.sentence).toBe('Wrapper set-up on Nights (Eli) and Labeller set-up on Nights (Eli) rest on one person — a single point of cover: the line stops when that person is off. 2 other cells are below the cover wanted: Labeller set-up on Days (2 of 3) and CCP cook check on Nights (2 of 3).');
    expect(Object.fromEntries(s.tiles.map(t => [t.k, t.v]))).toEqual({ 'Single points': '2', Nobody: '0', 'At the cover wanted': '2 of 6', 'Can teach it': '3 of 3' });
  });
  it('the training to do first, and the closing line', () => {
    expect(s.lists?.[0].title).toBe('Training to do first');
    expect(s.lists?.[0].lines[0]).toBe('1. Wrapper set-up on Nights: 1 person at the standard of 3 wanted — Eli. 2 more people to train.');
    expect(s.closing).toMatch(/^Train first: Wrapper set-up on Nights — 2 more people, Labeller set-up on Nights — 2 more people and Labeller set-up on Days — 1 more person\./);
  });
  it('money: named when missing, said when given, never a yearly figure', () => {
    expect(s.money).toEqual(['Give what a shift of the line not making costs to say what a single point is worth — the training costs hours, the stopped shift costs the margin.']);
    const m = summarizeSkills(r, { dayCost: 4800 }).money?.[0] ?? '';
    expect(m).toBe('Each of the 2 is a shift the line cannot run when that person is off — a shift of the line not making costs £4.8k (the figure you gave); the absence rate is not held, so no yearly figure is guessed.');
  });
  it('the table: levels as letters, cover under each task, the cover wanted and the teachers', () => {
    const t = skillsTable(input, r);
    expect(t.head).toEqual(['Person', 'Shift', 'Wrapper set-up', 'Labeller set-up', 'CCP cook check', 'Can do alone']);
    expect(t.rows[0]).toEqual(['Amy', 'Days', 'O', 'O', 'U', '3 of 3']);
    expect(t.rows[6]).toEqual(['Gus', 'Nights', '—', '—', 'I', '0 of 3']);
    expect(t.foot).toEqual([['Cover on Days', '', '3', '2', '4', ''], ['Cover on Nights', '', '1', '1', '2', ''], ['Cover wanted', '', '3', '3', '3', ''], ['Teachers (O)', '', '1', '1', '1', '']]);
    expect(t.shares.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
  });
  it('the page’s reading is the module’s (studyScored)', () => {
    const x = studyScored({ agreed: { scored: { key: 'skills', rows: ex.rows, criteria: ex.criteria } } });
    expect(x?.result?.verdict).toBe('2 single points of cover');
    expect(x?.table?.head.length).toBe(6);
  });
});

describe('the boundaries', () => {
  it('no shift given: counted across everyone, and said to hide a night gap', () => {
    const r = ok({ tasks: ex.criteria ?? [], people: ex.rows.map(p => ({ ...p, shift: undefined })) });
    expect(r.byShift).toBe(false);
    expect(r.shifts).toEqual(['All shifts']);
    expect(cell(r, 'Wrapper set-up', 'All shifts').cover).toBe(4);
    expect(summarizeSkills(r, {}).sentence).toMatch(/Cover is counted across everyone because no shift was given — a night gap would not show\.$/);
  });
  it('shift names are grouped without case or spacing, and a person with none goes in their own group once others have one', () => {
    const r = ok({ tasks: [{ id: 't', name: 'T' }], people: [{ id: 'a', name: 'A', shift: 'days', scores: { t: 3 } }, { id: 'b', name: 'B', shift: ' Days ', scores: { t: 3 } }, { id: 'c', name: 'C', scores: { t: 4 } }] });
    expect(r.shifts).toEqual(['days', 'No shift given']);
    expect(cell(r, 'T', 'days').cover).toBe(2);
    expect(cell(r, 'T', 'No shift given').cover).toBe(1);
  });
  it('a task’s own cover wanted overrides the matrix’s; a single point needs more than one wanted', () => {
    const r = ok({ target: 3, tasks: [{ id: 't', name: 'T', need: 1 }, { id: 'u', name: 'U' }], people: [{ id: 'a', name: 'A', scores: { t: 3, u: 3 } }] });
    expect(cell(r, 'T', 'All shifts')).toMatchObject({ need: 1, gap: 0, single: false });
    expect(cell(r, 'U', 'All shifts')).toMatchObject({ need: 3, gap: 2, single: true });
  });
  it('nobody at the standard is red; the gaps rank by how much the task matters first', () => {
    const r = ok({ tasks: [{ id: 't', name: 'Minor', weight: 1 }, { id: 'u', name: 'CCP check', weight: 5 }], people: [{ id: 'a', name: 'A', scores: { t: 2, u: 3 } }, { id: 'b', name: 'B', scores: { t: 1, u: 3 } }] });
    const s = summarizeSkills(r, {});
    expect(s.verdict).toBe('1 task with nobody');
    expect(s.tone).toBe('r');
    expect(s.sentence.startsWith('Nobody can run Minor alone.')).toBe(true);
    expect(r.gaps.map(c => c.task)).toEqual(['CCP check', 'Minor']);
  });
  it('a task with cover and nobody who can teach it is named; all at target is green', () => {
    const r = ok({ target: 1, tasks: [{ id: 't', name: 'T' }], people: [{ id: 'a', name: 'A', scores: { t: 3 } }] });
    expect(r.noTeacher).toEqual(['T']);
    const s = summarizeSkills(r, {});
    expect(s.verdict).toBe('Cover at target');
    expect(s.tone).toBe('g');
    expect(s.closing).toMatch(/but T has no one who can teach it/);
  });
  it('someone with nothing marked is named', () => {
    expect(ok({ tasks: [{ id: 't', name: 'T' }], people: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B', scores: { t: 0 } }] }).untrained).toEqual(['A', 'B']);
  });
  it('refuses what cannot be worked out, in words', () => {
    const say = (i: SkillsIn) => { const r = skills(i); return 'problems' in r ? r.problems.join(' ') : ''; };
    expect(say({ tasks: [], people: [] })).toMatch(/Add at least one task.*Add at least one person/);
    expect(say({ target: 0, tasks: [{ id: 't', name: 'T' }], people: [{ id: 'a', name: 'A' }] })).toMatch(/whole number of people, from 1 to 20/);
    expect(say({ tasks: [{ id: 't', name: 'T' }], people: [{ id: 'a', name: 'A', scores: { t: 7 } }] })).toMatch(/A on T: a level is 0 to 4/);
    expect(say({ tasks: [{ id: 't', name: 'T', need: 0 }], people: [{ id: 'a', name: 'A' }] })).toMatch(/the people wanted is a whole number from 1 to 20/);
    expect(say({ tasks: [{ id: 't', name: 'T', weight: 9 }], people: [{ id: 'a', name: 'A' }] })).toMatch(/how much it matters is a whole number from 1 to 5/);
    expect('problems' in analyseSkills({ criteria: [], rows: [] })).toBe(true);
  });
  it('an unnamed row or task is not counted', () => {
    const r = ok({ tasks: [{ id: 't', name: 'T' }, { id: 'x', name: ' ' }], people: [{ id: 'a', name: 'A', scores: { t: 3 } }, { id: 'b', name: '' }] });
    expect(r.tasks.length).toBe(1);
    expect(r.people.length).toBe(1);
  });
});
