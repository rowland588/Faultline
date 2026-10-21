/* DELETING A STUDY (lib/studyLinks studyRemovingSays, toolListHref).
 * Rowland, 13 October: "always implement deletes and editing in
 * everything". No study could be deleted anywhere; now each says, before it
 * goes, what goes with it — what was put into it — and what stays: the
 * records on its job it was the evidence or the proof for. */
import { describe, expect, it } from 'vitest';
import { studyRemovingSays, toolListHref } from '../studyLinks';
import type { ToolStudy } from '../study';

const base: ToolStudy = { id: 's', tool: 'capability', name: 'Weight accuracy 400 g', facts: {}, uses: [], startedAt: 1, createdAt: 1, updatedAt: 1 };
const use = (kind: ToolStudy['uses'][number]['kind'], role: 'evidence' | 'proof', id: string) => ({ id, kind, ref: `r-${id}`, role, at: 1 });

describe('what a study takes with it', () => {
  it('a capability study: its readings, the struck ones not counted', () => {
    const s = { ...base, facts: { readings: [{ id: 'a', value: 401, at: 1 }, { id: 'b', value: 399, at: 2 }, { id: 'c', value: 4, at: 3, struck: true }] } };
    const said = studyRemovingSays(s);
    expect(said.ask).toContain('Delete the capability study “Weight accuracy 400 g”?');
    expect(said.ask).toContain('Its 2 readings go with it.');
    expect(said.ask).toContain('Undo brings it back');
    expect(said.done).toBe('Deleted the capability study “Weight accuracy 400 g”');
  });
  it('one reading goes, not go', () => {
    expect(studyRemovingSays({ ...base, facts: { readings: [{ id: 'a', value: 401, at: 1 }] } }).ask).toContain('Its 1 reading goes with it.');
  });
  it('nothing put in yet: nothing said to go', () => {
    expect(studyRemovingSays(base).ask).not.toMatch(/with it\./);
  });
  it('each tool says its own', () => {
    const step = { id: 'f', order: 1, name: 'Fill', kind: 'operation' as const };
    expect(studyRemovingSays({ ...base, tool: 'map', name: 'Line 7', facts: { flow: [step, { ...step, id: 'g' }], future: [step] } }).ask)
      .toContain('Delete the value stream map “Line 7”?\n\nIts 2 steps and its future state go with it.');
    expect(studyRemovingSays({ ...base, tool: 'changeover', name: 'Red → Express', facts: { sequence: [{ id: 'e', order: 1, name: 'Jaws', side: 'internal' as const, source: 'timed' as const }] } }).ask)
      .toContain('Delete the SMED “Red → Express”?\n\nIts 1 element goes with it.');
    expect(studyRemovingSays({ ...base, tool: 'sampling', name: 'Day shift', facts: { taps: [{ id: 't', at: 1, who: 'Op 1', activity: 'working' }] } }).ask)
      .toContain('Delete the work sampling study “Day shift”?\n\nIts 1 tap goes with it.');
    expect(studyRemovingSays({ ...base, tool: 'losses', name: 'Shift 1', facts: { losses: { from: 1, to: 2, made: 9000 } } }).ask)
      .toContain('Delete the loss count “Shift 1”?\n\nThe count goes with it.');
  });
  it('what it serves on its job stays, by what it is to each', () => {
    const s = { ...base, uses: [use('fix', 'evidence', '1'), use('cause', 'evidence', '2'), use('cause', 'evidence', '3'), use('test', 'proof', '4')] };
    expect(studyRemovingSays(s).ask).toContain('It is the evidence for 1 fix and 2 causes and the proof of 1 test on its project — they stay, without its figures.');
    expect(studyRemovingSays({ ...base, uses: [use('action', 'proof', '1')] }).ask).toContain('It is the proof of 1 countermeasure on its project — that stays, without its figures.');
  });
  it('a study with no name is said as not named', () => {
    expect(studyRemovingSays({ ...base, name: '  ' }).done).toBe('Deleted the capability study “Not named”');
  });
});

describe('where a deleted study\'s page goes', () => {
  it('its tool\'s list — on its line when it is on one', () => {
    expect(toolListHref({ tool: 'capability' })).toBe('/capability');
    expect(toolListHref({ tool: 'map', workspaceId: 'w 1' })).toBe('/value-stream?line=w%201');
    expect(toolListHref({ tool: 'changeover', workspaceId: 'w' })).toBe('/smed?line=w');
    expect(toolListHref({ tool: 'sampling' })).toBe('/sampling');
    expect(toolListHref({ tool: 'losses', workspaceId: 'w' })).toBe('/losses?line=w');
  });
});
