/* THE TOOL INTELLIGENCE, HELD TO THE CODE (docs/AI-TOOL-INTELLIGENCE.md). Rowland, 10 November: "A tool's capability assessment must
 * reflect what is genuinely implemented and available today." So every definition is checked against what exists: every tool the AI can
 * reach has one; a level 1 or 2 operation names capabilities the registry runs; a level 2 says the evidence it needs; a level 3 says what
 * the person does, where, the words to hand it over and what is read back after; a level 4 says why and the manual way; a live route
 * only where a measure adapter exists; a photo or footage never claimed as a measurement. */
import { describe, it, expect } from 'vitest';
import { CAPABILITIES, capabilityByName } from '../registry';
import { CAPABILITY_SCHEMAS } from '../schemas';
import { CONNECTORS } from '../connectors';
import { MEASURE_TOOLS } from '../connectors/measure';
import { TOOL_INTEL, intelOf } from '../intel/tools';
import { intelSaid } from '../intel/caps';

const CAP_WORD = /\b[a-z]+_[a-z_]+\b/g;
const LIVE_OF: Record<string, string> = { linework: 'balance' };

describe('tool intelligence — every definition true to the code', () => {
  it('every tool the AI can reach (every connector) has a definition, and no definition is of a tool that is not there', () => {
    const keys = CONNECTORS.map(c => c.key);
    expect(keys.filter(k => !intelOf(k))).toEqual([]);
    expect(TOOL_INTEL.map(t => t.key).filter(k => !keys.includes(k))).toEqual([]);
    expect(new Set(TOOL_INTEL.map(t => t.key)).size).toBe(TOOL_INTEL.length);
  });

  it('each definition is substantive: what it does, answers, cannot answer, when, its inputs, assumptions, quality, routes, operations', () => {
    for (const t of TOOL_INTEL) {
      expect(t.does.length, t.key).toBeGreaterThan(40);
      expect(t.answers.length, t.key).toBeGreaterThan(0);
      expect(t.cannot.length, `${t.key} says what it cannot answer`).toBeGreaterThan(0);
      expect(t.when.length, t.key).toBeGreaterThan(0);
      expect(t.fields.filter(f => f.required && !f.derived).length, `${t.key} names a required input`).toBeGreaterThan(0);
      expect(t.acquire.some(a => a.status === 'supported'), `${t.key} has a supported way in`).toBe(true);
      expect(t.ops.length, t.key).toBeGreaterThan(1);
      expect(new Set(t.ops.map(o => o.id)).size, `${t.key} operation ids unique`).toBe(t.ops.length);
      for (const i of t.instead) expect(intelOf(i.key), `${t.key} → instead ${i.key}`).toBeDefined();
    }
  });

  it('levels are assessed per operation and each is backed: 1 · 2 by real capabilities, 2 with its evidence, 3 with the person’s part, 4 with why', () => {
    for (const t of TOOL_INTEL) for (const o of t.ops) {
      const at = `${t.key}.${o.id}`;
      if (o.level === 1 || o.level === 2) {
        expect(o.how?.length, `${at} names its capabilities`).toBeGreaterThan(0);
        for (const n of o.how ?? []) expect(capabilityByName(n), `${at}: ${n} is in the registry`).toBeDefined();
      }
      if (o.level === 2) expect(o.needs, `${at} says the evidence it needs`).toBeTruthy();
      if (o.level === 3) {
        expect(o.interaction?.length, `${at} says what the person does`).toBeGreaterThan(0);
        expect(o.page, `${at} names the page`).toBeTruthy();
        expect(o.handover && o.handover.length > 20, `${at} has its hand-over words`).toBe(true);
        expect(o.after, `${at} says what is read back`).toBeTruthy();
        expect(o.why, `${at} says why the AI cannot`).toBeTruthy();
        for (const n of o.how ?? []) expect(capabilityByName(n), `${at}: ${n}`).toBeDefined();
      }
      if (o.level === 4) expect(o.why, `${at} says why, and the manual way`).toBeTruthy();
    }
    /* the AI never claims a visual act: no level 1 or 2 operation draws, drags, places or films */
    const visual = /\b(drag|draw|place on|film|pinch|tap the)\b/i;
    for (const t of TOOL_INTEL) for (const o of t.ops) if (o.level < 3) expect(visual.test(o.does), `${t.key}.${o.id} is visual yet level ${o.level}`).toBe(false);
  });

  it('every supported way in names a capability that exists or the page it is done on; live only where a measure adapter exists', () => {
    for (const t of TOOL_INTEL) for (const a of t.acquire) {
      if (a.status !== 'supported') { expect(a.how.length, `${t.key} ${a.route} says why not`).toBeGreaterThan(10); continue; }
      const caps = a.how.match(CAP_WORD) ?? [];
      for (const n of caps) expect(capabilityByName(n), `${t.key} ${a.route}: ${n}`).toBeDefined();
      if (!caps.length) expect(/page|by hand|Manual Mode|record|line|board|log|study|sheet|plan|kept|reads?|said/i.test(a.how), `${t.key} ${a.route}: “${a.how}” names where`).toBe(true);
      if (a.route === 'live') expect((MEASURE_TOOLS as readonly string[]).includes(LIVE_OF[t.key] ?? t.key), `${t.key} live needs a measure adapter`).toBe(true);
    }
    /* every measure adapter is somebody's live route */
    for (const m of MEASURE_TOOLS) expect(TOOL_INTEL.some(t => (LIVE_OF[t.key] ?? t.key) === m && t.acquire.some(a => a.route === 'live' && a.status === 'supported')), m).toBe(true);
  });

  it('a photo or footage is never claimed as a measurement', () => {
    for (const t of TOOL_INTEL) for (const a of t.acquire) {
      if ((a.route === 'photo' || a.route === 'video') && a.status === 'supported' && t.key !== 'video' && t.key !== 'linework')
        expect(/never|described by the person|shown|evidence|labelled|by hand|captioned/i.test(a.how), `${t.key} ${a.route}: “${a.how}”`).toBe(true);
    }
  });

  it('the new capabilities are in the registry and the gateway’s schemas, each said once', () => {
    for (const n of ['tool_intel', 'assess_evidence', 'pareto', 'import_table', 'hand_over', 'handover_state']) {
      expect(capabilityByName(n)).toBeDefined();
      expect(CAPABILITY_SCHEMAS.filter(s => s.name === n)).toHaveLength(1);
    }
    expect(new Set(CAPABILITIES.map(c => c.name)).size).toBe(CAPABILITIES.length);
  });

  it('a tool is said in words: its limits, its routes not possible yet, and each operation’s level', () => {
    const s = intelSaid(intelOf('linestandard')!);
    expect(s).toMatch(/Cannot answer: Times or speeds/);
    expect(s).toMatch(/Place people, machines and areas where they stand: with you on the page \(dragging things on the page, placing things on the page, drawing on the page\)/);
    expect(s).toMatch(/Not by: photo — not yet/);
    const st = intelSaid(intelOf('stops')!);
    expect(st).toMatch(/Enough: 20 stops over at least a week/);
    expect(st).toMatch(/Rank the reasons by minutes lost .*: by conversation, with evidence/);
  });
});
