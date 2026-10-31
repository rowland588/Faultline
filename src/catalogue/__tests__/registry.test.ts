/* THE REGISTRY — the catalogue as the one list of the app's tools (docs/STRUCTURE.md §14, B1). */
import { describe, expect, it } from 'vitest';
import { ENTRIES } from '../index';
import { KINDS } from '../types';
import { APP_TOOLS, startsOf, toolByKey, toolsOfKind } from '../registry';
import { parseRoute } from '../../state/useRoute';
import { TOOLS } from '../../screens/ProductionLineScreen';

describe('every tool says how its records behave', () => {
  it('every entry of form "tool" not left out has a kind, and where one is started', () => {
    const tools = ENTRIES.filter(e => e.form === 'tool' && e.status !== 'left-out');
    expect(tools.filter(e => !e.kind || !KINDS.includes(e.kind)).map(e => e.id)).toEqual([]);
    expect(tools.filter(e => !['anywhere', 'line', 'product'].includes(startsOf(e) ?? '')).map(e => e.id)).toEqual([]);
  });

  it('nothing but a tool carries a kind or a face in the app', () => {
    expect(ENTRIES.filter(e => e.form !== 'tool' && (e.kind || e.app)).map(e => e.id)).toEqual([]);
  });

  it('a value stream map and a loss count start on a line; a study elsewhere anywhere; a standard on a product', () => {
    const byId = (id: string) => ENTRIES.find(e => e.id === id)!;
    expect(startsOf(byId('FC-001'))).toBe('line');
    expect(startsOf(byId('FC-049'))).toBe('line');
    expect(startsOf(byId('FC-094'))).toBe('anywhere');
    expect(startsOf(byId('FC-006'))).toBe('product');
  });
});

describe('the app\'s tools, from the catalogue', () => {
  it('are the twenty a person can open, each built, available or partly, at an address the router answers', () => {
    expect(APP_TOOLS.map(t => t.label)).toEqual(['Line standard', 'Line balance', 'Line capacity', 'Capability', 'Control chart', 'Analysis', 'Calculators', 'Value stream', 'SMED', 'Work sampling', 'Loss count', 'Reliability', 'Video study', 'Line Talk', 'Check logs', 'Problems register', 'Actions', 'Equipment criticality', 'Pugh matrix', 'Maintenance measures']);
    for (const t of APP_TOOLS) {
      const e = ENTRIES.find(x => x.id === t.id)!;
      expect(['available', 'partial'], t.id).toContain(e.status);
      expect(parseRoute(`#${t.to}`).name, t.to).not.toBe('home');
    }
    expect(new Set(APP_TOOLS.map(t => t.key)).size).toBe(APP_TOOLS.length);
    expect(new Set(APP_TOOLS.map(t => t.order)).size).toBe(APP_TOOLS.length);
  });

  it('are found by kind and by key', () => {
    expect(toolsOfKind('standard').map(t => t.label)).toEqual(['Line standard', 'Line balance', 'Line capacity']);
    expect(toolsOfKind('document').map(t => t.label)).toEqual(['Line Talk']);
    expect(toolByKey('changeover')?.to).toBe('/smed');
  });

  it('give a line\'s page the ten it listed by hand before 23 October, and the video study the control chart and the analysis since (Rowland, 23 October: "I add a tool to a line it doesn\'t go there")', () => {
    expect(TOOLS.map(t => [t.key, t.label, t.to, t.study ?? (t.standard ? 'standard' : ''), t.what])).toEqual([
      ['linestandard', 'Line standard', '/standards', 'standard', 'who stands where, product by product'],
      ['linework', 'Line balance', '/linebalance', 'balance', 'what each person does, timed against takt, and what it costs'],
      ['linebalance', 'Line capacity', '/balances', 'standard', 'where the line is limited, and the V-curve'],
      ['capability', 'Capability', '/capability', 'capability', 'readings against the limits agreed'],
      ['chart', 'Control chart', '/chart', 'chart', 'readings in order against limits, and what moved'],
      ['analysis', 'Analysis', '/analysis', 'analysis', 'is it sure, did it change, do two ways agree'],
      ['calc', 'Calculators', '/calc', 'calc', 'sums saved for this line, each with what it says'],
      ['valuestream', 'Value stream', '/value-stream', 'map', 'every step, who does it, the waits'],
      ['changeover', 'SMED', '/smed', 'changeover', 'a changeover timed and cut down'],
      ['sampling', 'Work sampling', '/sampling', 'sampling', 'what people are doing, at random moments'],
      ['losses', 'Loss count', '/losses', 'losses', 'a shift’s losses, in minutes and pounds'],
      ['reliability', 'Reliability', '/reliability', 'reliability', 'a machine watched running: MTBF and the failure rate'],
      ['video', 'Video study', '/video', 'video', 'the line filmed, the work at each station read from the footage'],
      ['talk', 'Line Talk', '/talk', 'talk', 'talk or type on the line, as in a chat — it answers and writes the reports'],
    ]);
  });
});
