/* A section's default tools, said honestly (src/project/method/methodTools). */
import { describe, expect, it } from 'vitest';
import { METHODS, toolsOfMethod } from '../../../lib/methods';
import { howTool, openable, toolStateWord } from '../methodTools';

describe('how a default tool stands', () => {
  it('a tool with a page of its own opens, as itself', () => {
    const h = howTool('FC-094'); // capability
    expect(h.how).toBe('tool');
    expect(openable(h)?.key).toBe('capability');
    expect(toolStateWord(h)).toMatch(/^Built/);
  });

  it('impact and effort (a scored register) is a tool with a page of its own, built', () => {
    const h = howTool('FC-144');
    expect(h.how).toBe('tool');
    expect(openable(h)?.key).toBe('impact-effort');
    expect(openable(h)?.to).toBe('/scored/impact-effort');
    expect(toolStateWord(h)).toBe('Built');
  });

  it('a mode of a tool opens that tool and says so', () => {
    const h = howTool('FC-105'); // before and after — in Analysis
    expect(['tool', 'inside']).toContain(h.how);
    expect(openable(h)).toBeDefined();
    const mode = howTool('FC-124'); // defect tally — a mode of the capability/chart tools
    if (mode.how === 'inside') expect(toolStateWord(mode)).toMatch(/^A mode of /);
  });

  it('critical path (FC-215) is a mode of the Calculators that opens at its own page, in the stage gate’s Install section', () => {
    const h = howTool('FC-215');
    expect(h.how).toBe('inside');
    expect(toolStateWord(h)).toBe('A mode of Calculators');
    expect(openable(h)?.key).toBe('calc');
    expect(openable(h)?.to).toBe('/calc/critical-path');
    expect(METHODS.find(m => m.key === 'stage-gate')?.sections.find(s => s.name === 'Install')?.tools).toContain('FC-215');
    /* a mode with no page of its own deeper than the tool opens the tool, as before */
    expect(openable(howTool('FC-105'))?.to).toBe(openable(howTool('FC-105'))?.to);
  });

  it('a tool not built yet has nothing to open and says so in the catalogue’s word', () => {
    const h = howTool('FC-043'); // drum–buffer–rope
    expect(h.how).toBe('notyet');
    expect(openable(h)).toBeUndefined();
    expect(toolStateWord(h)).toBe('Not built yet');
    expect(toolStateWord(howTool('FC-085'))).toBe('Research first');
  });

  it('every default tool of every method resolves — none unknown — and what is not built has no button', () => {
    for (const m of METHODS) for (const id of toolsOfMethod(m)) {
      const h = howTool(id);
      expect(h.how, `${m.name}: ${id}`).not.toBe('unknown');
      if (h.how === 'notyet') expect(openable(h), `${m.name}: ${id}`).toBeUndefined();
      if (h.how === 'tool' || h.how === 'inside') expect(openable(h)?.to, `${m.name}: ${id}`).toBeTruthy();
    }
  });
});
