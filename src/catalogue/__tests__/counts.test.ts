import { describe, expect, it } from 'vitest';
import { DOOR_TOOLS, GALLERY_TOOLS, MENU_PAGES, holdings, insideByTool, ownerOf, toolCounts } from '../counts';
import { ENTRIES } from '../index';
import { APP_TOOLS } from '../registry';

describe('how many tools, said truly', () => {
  it('counts a tool only when a person can open it on a page of its own', () => {
    expect(toolCounts().tools).toBe(GALLERY_TOOLS.length + DOOR_TOOLS.size);
    expect(GALLERY_TOOLS.length).toBe(APP_TOOLS.length - MENU_PAGES.size);
    expect(toolCounts().tools).toBeLessThan(38);   // 25 → 30 on 1 November: four register tools (m6-registers) are tools of their own
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
  it('puts a capability mode, a check-log kind and a calculator inside their tools, and a part no tool owns outside any', () => {
    expect(ownerOf(ENTRIES.find(e => e.id === 'FC-095')!)).toBe('FC-094');
    expect(ownerOf(ENTRIES.find(e => e.id === 'FC-170')!)).toBe('FC-236');
    expect(ownerOf(ENTRIES.find(e => e.id === 'FC-193')!)).toBeUndefined();
  });
  it('says how many methods each tool holds', () => {
    const by = insideByTool();
    expect(by['FC-094']).toBeGreaterThan(10);
    expect(Object.values(by).reduce((a, b) => a + b, 0)).toBe(toolCounts().inside);
  });
  it('Problems and Actions are the menu\u2019s pages, never tools; 6M is a tool and the fishbone and five whys are inside it (7 November)', () => {
    expect(GALLERY_TOOLS.some(t => t.key === 'problems' || t.key === 'actions')).toBe(false);
    expect(GALLERY_TOOLS.some(t => t.key === 'talk')).toBe(true);
    expect(ownerOf(ENTRIES.find(e => e.id === 'FC-147')!)).toBe('FC-146');
    expect(ownerOf(ENTRIES.find(e => e.id === 'FC-148')!)).toBe('FC-146');
  });
  it('says what we have and what we still need to build, every entry in one place', () => {
    const h = holdings(), c = toolCounts();
    const built = h.tools.reduce((n, t) => n + t.built.length, 0), toBuild = h.tools.reduce((n, t) => n + t.toBuild.length, 0);
    expect(h.tools.length).toBe(c.tools);
    expect(built).toBe(c.inside);
    expect(h.parts.length).toBe(c.parts);
    expect(toBuild + h.newTools.length).toBe(c.notBuilt);
  });
});
