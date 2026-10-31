import { describe, expect, it } from 'vitest';
import { insideByTool, ownerOf, toolCounts } from '../counts';
import { ENTRIES } from '../index';
import { APP_TOOLS } from '../registry';

describe('how many tools, said truly', () => {
  it('counts a tool only when a person can open it on a page of its own', () => {
    expect(toolCounts().tools).toBe(APP_TOOLS.length);
    expect(toolCounts().tools).toBeLessThan(25);
  });
  it('adds up: every entry is a tool, inside a tool, a part, not built, in research or left out', () => {
    const c = toolCounts();
    expect(c.tools + c.inside + c.parts + c.notBuilt + c.research + c.leftOut).toBe(ENTRIES.length);
  });
  it('never calls a method a tool: far fewer tools than the old "available" count of every built entry', () => {
    const builtAll = ENTRIES.filter(e => e.status === 'available' || e.status === 'partial').length;
    const c = toolCounts();
    expect(c.tools + c.inside + c.parts).toBe(builtAll);
    expect(c.tools).toBeLessThan(builtAll / 5);
  });
  it('puts a capability mode, a check-log kind and a calculator inside their tools, and the problems register outside any', () => {
    expect(ownerOf(ENTRIES.find(e => e.id === 'FC-095')!)).toBe('FC-094');
    expect(ownerOf(ENTRIES.find(e => e.id === 'FC-170')!)).toBe('FC-236');
    expect(ownerOf(ENTRIES.find(e => e.id === 'FC-154')!)).toBeUndefined();
  });
  it('says how many methods each tool holds', () => {
    const by = insideByTool();
    expect(by['FC-094']).toBeGreaterThan(10);
    expect(Object.values(by).reduce((a, b) => a + b, 0)).toBe(toolCounts().inside);
  });
});
