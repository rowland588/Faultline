import { describe, expect, it } from 'vitest';
import { methodByKey } from '../methods';
import { placementNote } from '../methodPlacement';
import { fieldsOf } from '../methodSheet';
import { methodDashboard, type DashIn } from '../methodDashboard';
import type { ToolStudy } from '../study';

const m = methodByKey('pdca')!;
const base = (o: Partial<DashIn> = {}): DashIn => ({ method: m, answers: {}, studies: [], owed: [], today: '2026-11-10', readsOf: id => (id === 'FC-094' ? 'capability' : undefined), nameOf: id => (id === 'FC-094' ? 'Capability study' : undefined), ...o });
const cap = (over: Partial<ToolStudy> = {}): ToolStudy => ({ id: 's1', tool: 'capability', name: 'Seal temp', createdAt: 1, updatedAt: 5, startedAt: 1, facts: { sample: { values: [], limits: {} } }, uses: [], ...over } as unknown as ToolStudy);

describe('where a project is on its method’s journey', () => {
  it('a new project is at step 1 with nothing written, no tool used, and says what to write next', () => {
    const d = methodDashboard(base());
    expect(d.sections.map(s => [s.name, s.state, s.here])).toEqual([['Plan', 'Not started', true], ['Do', 'Not started', false], ['Check', 'Not started', false], ['Act', 'Not started', false]]);
    expect(d.written).toBe(0);
    expect(d.next).toBe('Next: in Plan, write “The number we are improving”.');
    expect(d.says).toBe('PDCA. 0 of 4 worksheets written. No saved tool results. Next: in Plan, write “The number we are improving”.');
    expect(d.tone).toBe('n');
  });
  it('the journey moves on as sections are written: Plan all written puts you in Do', () => {
    const plan: Record<string, string> = {};
    for (const f of fieldsOf('pdca', 'Plan')) plan[f.id] = 'written';
    const d = methodDashboard(base({ answers: plan }));
    expect(d.sections[0]).toMatchObject({ state: 'All written', written: fieldsOf('pdca', 'Plan').length, here: false });
    expect(d.sections[1]).toMatchObject({ here: true });
    expect(d.written).toBe(1);
    expect(d.tone).toBe('w');
  });
  it('a tool result nobody has written up is flagged, with the tool’s own sentence; a tool unused where a number is claimed is noted', () => {
    const d = methodDashboard(base({ studies: [cap()], owed: [placementNote({ projectId: 'p', method: 'pdca', section: 'Plan' }, 'study', 's1', 1)] }));
    expect(d.findings).toHaveLength(1);
    expect(d.findings[0]).toMatchObject({ tool: 'Capability study', section: 'Plan', title: 'Capability study — Seal temp' });
    expect(d.attention.some(a => a.kind === 'unwritten' && /Plan has 1 tool result but nothing written/.test(a.text))).toBe(true);
    const claimed = methodDashboard(base({ answers: { number: 'Packs a minute' } }));
    expect(claimed.attention.some(a => a.kind === 'unproved' && /Plan is written with no number from a tool behind it — Capability study would show how you know\./.test(a.text))).toBe(true);
  });
  it('recognises out-of-order phase work without presenting the first empty worksheet as the project phase', () => {
    const method = methodByKey('dmaic')!;
    const trial = cap({ id: 'baseline' });
    const d = methodDashboard(base({
      method, studies: [trial], answers: { rv_analyse_note: 'Review requested by shift lead' },
      owed: [
        placementNote({ projectId: 'p', method: 'dmaic', section: 'Measure' }, 'study', trial.id, 1),
        { kind: 'next', projectId: 'p', what: 'Trial the new setting', sources: [{ kind: 'method', how: 'record', id: 'p', part: 'dmaic:Improve', href: '/project/p/method?phase=Improve', label: 'Improve' }] },
      ],
    }));
    expect(d.sections.map(s => [s.name, s.progress])).toEqual([
      ['Define', 'No activity recorded'], ['Measure', 'Activity recorded'], ['Analyse', 'Activity recorded'],
      ['Improve', 'Activity recorded'], ['Control', 'No activity recorded'],
    ]);
    expect(d.sections[d.here].name).toBe('Define');
    expect(d.says).toContain('Activity recorded in Measure, Analyse, Improve.');
    expect(d.says).not.toMatch(/you are in/i);
    expect(d.written).toBe(0);
  });
  it('late actions are counted and said; done ones and the method’s own answers are not', () => {
    const owed = [
      { kind: 'next', what: 'Re-set the dancer', due: '2026-11-03', doneAt: null },
      { kind: 'next', what: 'Order film', due: '2026-11-20', doneAt: null },
      { kind: 'next', what: 'Done one', due: '2026-11-01', doneAt: 9 },
      { kind: 'note', what: 'x', due: '2026-10-01', doneAt: null },
      { kind: 'next', what: 'an answer', due: '2026-10-01', doneAt: null, testId: 'method:pdca:number' },
    ];
    const d = methodDashboard(base({ owed }));
    expect(d.actions).toEqual({ open: 2, late: 1 });
    expect(d.attention[0]).toMatchObject({ kind: 'late', tone: 'r', text: '1 action is late: Re-set the dancer.' });
    expect(d.tone).toBe('r');
    expect(d.closing).toBe('0 of 4 worksheets written · 0 tools reporting · 1 thing to look at · 1 late.');
  });
  it('recognises a partial answer, or an action outside a phase, as project activity', () => {
    expect(methodDashboard(base({ answers: { number: 'Good packs per shift' } })).tone).toBe('w');
    expect(methodDashboard(base({ owed: [{ kind: 'next', what: 'Aligned guide rails', doneAt: 42 }] })).tone).toBe('w');
  });
  it('every section written and nothing wrong reads green and says to print the report', () => {
    const all: Record<string, string> = {};
    for (const sec of m.sections) for (const f of fieldsOf('pdca', sec.name)) all[f.id] = 'written';
    const d = methodDashboard(base({ answers: all }));
    expect(d.next).toBe('Every section is written — view the report and print it for the meeting.');
    expect(d.written).toBe(4);
    expect(d.here).toBe(-1);
    expect(d.sections.every(s => s.progress === 'Worksheet written')).toBe(true);
  });
});
