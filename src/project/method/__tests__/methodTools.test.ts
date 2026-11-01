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

  it('the Theory of Constraints modes open the tool they live in, and say so', () => {
    for (const [id, tool] of [['FC-046', 'Line capacity'], ['FC-039', 'Line capacity'], ['FC-056', 'Loss count']] as const) {
      const h = howTool(id);
      expect(h.how, id).toBe('inside');
      expect(openable(h)?.label, id).toBe(tool);
      expect(toolStateWord(h), id).toBe(`A mode of ${tool}`);
    }
  });

  it('a calculator is a mode of the Calculators hub, opened and started there — Utilisation and variability among them', () => {
    for (const id of ['FC-045', 'FC-044', 'FC-009']) {
      const h = howTool(id);
      expect(h.how, id).toBe('inside');
      expect(openable(h)?.key, id).toBe('calc');
      expect(toolStateWord(h), id).toBe('A mode of Calculators');
    }
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

  it('the skills matrix (FC-222) is a tool with a page of its own, in the stage gate’s Set up section', () => {
    const h = howTool('FC-222');
    expect(h.how).toBe('tool');
    expect(openable(h)?.key).toBe('skills');
    expect(openable(h)?.to).toBe('/scored/skills');
    expect(toolStateWord(h)).toBe('Built');
    expect(METHODS.find(m => m.key === 'stage-gate')?.sections.find(s => s.name === 'Set up')?.tools).toContain('FC-222');
  });

  it('operational readiness (FC-082) is a tool with a page of its own, in the stage gate’s Set up and Hand over sections', () => {
    const h = howTool('FC-082');
    expect(h.how).toBe('tool');
    expect(openable(h)?.to).toBe('/scored/readiness');
    expect(toolStateWord(h)).toBe('Built');
    const sg = METHODS.find(m => m.key === 'stage-gate');
    expect(sg?.sections.filter(s => s.tools.includes('FC-082')).map(s => s.name)).toEqual(['Set up', 'Hand over']);
  });

  it('a tool not built yet has nothing to open and says so in the catalogue’s word', () => {
    const h = howTool('FC-070'); // changeover sequence
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
