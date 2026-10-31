import { describe, expect, it } from 'vitest';
import { WORLDS, unplaced, worldById, worldEntries, worldOfTool, worldRoutes, worldTools } from '../worlds';
import { DISCIPLINES } from '../types';
import { APP_TOOLS } from '../registry';
import { ENTRIES } from '../index';

describe('the worlds', () => {
  it('name only disciplines the catalogue has, each in one world', () => {
    const known = new Set(DISCIPLINES.map(d => d.id));
    const seen = new Map<string, string>();
    for (const w of WORLDS) for (const d of w.disciplines) {
      expect(known.has(d), `${w.id} names ${d}`).toBe(true);
      expect(seen.has(d), `${d} is in ${seen.get(d)} and ${w.id}`).toBe(false);
      seen.set(d, w.id);
    }
  });

  it('place every discipline — a new one is a decision, not a hole', () => {
    expect(unplaced()).toEqual([]);
  });

  it('give every tool a person can open a world', () => {
    for (const t of APP_TOOLS) {
      expect(worldOfTool(t), t.key).toBeDefined();
    }
  });

  it('hold Capability, Control chart and Analysis in Statistics — the first world', () => {
    const keys = worldTools(worldById('statistics')!).map(t => t.key);
    expect(keys).toEqual(expect.arrayContaining(['capability', 'chart', 'analysis']));
    expect(keys).not.toContain('valuestream');
  });

  it('put a tool where most of it lives — Check logs with the food-safety logs inside it, in Quality and food safety', () => {
    expect(worldOfTool({ id: 'FC-236' })?.id).toBe('quality');
    expect(worldOfTool({ id: 'FC-094' })?.id).toBe('statistics');
    expect(worldOfTool({ id: 'FC-001' })?.id).toBe('lean');
    const total = WORLDS.reduce((n, w) => n + worldTools(w).length, 0);
    expect(total).toBe(APP_TOOLS.length);
  });

  it('count entries per world to the whole catalogue', () => {
    expect(WORLDS.reduce((n, w) => n + worldEntries(w).length, 0)).toBe(ENTRIES.length);
  });

  it('tell each route in one world at most per majority, and the rejects route in Statistics', () => {
    const stat = worldRoutes(worldById('statistics')!).map(p => p.id);
    expect(stat).toContain('rejects');
    expect(stat).toContain('giveaway');
  });
});
