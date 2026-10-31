import { describe, expect, it } from 'vitest';
import { copiedSays, shareInto, shareName, shareOffer } from '../sharedReadings';
import type { StudyReading, ToolStudy } from '../study';

const reading = (i: number, v: number, extra: Partial<StudyReading> = {}): StudyReading => ({ id: `r${i}`, value: v, at: 1000 + i, ...extra });
const study = (tool: ToolStudy['tool'], agreed: ToolStudy['agreed'], readings: StudyReading[], extra: Partial<ToolStudy> = {}): ToolStudy =>
  ({ id: 'src', tool, name: 'Fill weight', workspaceId: 'ws1', projectId: 'p1', machine: 'Filler', product: 'Crisps 400 g', agreed, facts: { readings }, uses: [], startedAt: 1, createdAt: 1, updatedAt: 1, ...extra });
const thirty = (): StudyReading[] => Array.from({ length: 30 }, (_, i) => reading(i, 400 + (i % 5) - 2, i === 3 || i === 17 ? { struck: true } : {}));
const seq = () => { let n = 0; return () => `n${++n}`; };

describe('readings shared between the statistics tools — independent cases', () => {
  it('(a) copies 28 of 30 readings: struck ones left, order kept, fresh ids', () => {
    const s = study('capability', { readings: { kind: 'limits', count: 30, unit: 'g', nominal: 400, lower: 395, upper: 405 } }, thirty());
    const c = shareInto(s, 'chart', { name: 'x', at: 9, ids: seq() })!;
    const rs = c.facts.readings!;
    expect(rs).toHaveLength(28);
    expect(rs.some(r => r.struck)).toBe(false);
    expect(rs.map(r => r.at)).toEqual([...rs.map(r => r.at)].sort((a, b) => a - b));
    expect(new Set(rs.map(r => r.id)).size).toBe(28);
    expect(rs.every(r => !s.facts.readings!.some(o => o.id === r.id))).toBe(true);
    expect(c.facts.copiedFrom).toEqual({ id: 'src', tool: 'capability', name: 'Fill weight', n: 28, at: 9 });
  });

  it('(b) a capability study with limits 395–405 g, nominal 400 → a chart with name, unit, target and both limits', () => {
    const s = study('capability', { readings: { kind: 'limits', count: 30, unit: 'g', nominal: 400, lower: 395, upper: 405 } }, thirty());
    const c = shareInto(s, 'chart', { name: 'Fill weight — chart', at: 9, ids: seq() })!;
    expect(c.tool).toBe('chart');
    expect(c.agreed?.chart).toEqual({ kind: 'xmr', name: 'Fill weight', unit: 'g', target: 400, lower: 395, upper: 405 });
    expect([c.workspaceId, c.projectId, c.machine, c.product]).toEqual(['ws1', 'p1', 'Filler', 'Crisps 400 g']);
  });

  it('(c) a chart with a unit and no limits → capability with NO agreed record (its set-up asks), readings kept', () => {
    const s = study('chart', { chart: { kind: 'xmr', name: 'Seal temperature', unit: '°C' } }, thirty());
    const c = shareInto(s, 'capability', { name: 'Seal — capability', at: 9, ids: seq() })!;
    expect(c.agreed).toBeUndefined();
    expect(c.facts.readings).toHaveLength(28);
  });

  it('(c2) a chart WITH limits → capability agreed on them, the wanted count never below 30', () => {
    const s = study('chart', { chart: { kind: 'xmr', name: 'Seal temperature', unit: '°C', lower: 180, upper: 200, target: 190 } }, thirty().slice(0, 12));
    const c = shareInto(s, 'capability', { name: 'x', at: 9, ids: seq() })!;
    expect(c.agreed?.readings).toEqual({ kind: 'limits', count: 30, unit: '°C', nominal: 190, lower: 180, upper: 200 });
  });

  it('(d) a pack by weight → a chart with the nominal as target and no invented limits', () => {
    const s = study('capability', { readings: { kind: 'packers', count: 30, unit: 'g', nominal: 400 } }, thirty());
    const c = shareInto(s, 'chart', { name: 'x', at: 9, ids: seq() })!;
    expect(c.agreed?.chart).toEqual({ kind: 'xmr', name: 'Fill weight', unit: 'g', target: 400 });
  });

  it('(e) counts, pass-or-fail, a share, a pair, a table: not offered, with a reason', () => {
    for (const a of [{ readings: { kind: 'rejects' as const, count: 6 } }, { readings: { kind: 'ticks' as const, count: 20 } }]) {
      const o = shareOffer(study('capability', a, thirty()))!;
      expect(o.targets).toEqual([]); expect(o.why).toMatch(/counts or passes/);
    }
    for (const a of [{ analysis: { kind: 'sure' as const, name: 'x', of: 'share' as const } }, { analysis: { kind: 'paired' as const, name: 'x' } }, { analysis: { kind: 'table' as const, name: 'x' } }]) {
      const o = shareOffer(study('analysis', a, thirty()))!;
      expect(o.targets).toEqual([]); expect(o.why).toMatch(/counts, pairs, groups or a table/);
    }
    expect(shareOffer(study('analysis', undefined, thirty()))!.why).toMatch(/Set the question first/);
  });

  it('(f) one reading, or all struck: disabled with its reason', () => {
    expect(shareOffer(study('chart', { chart: { kind: 'xmr', name: 'x' } }, [reading(1, 5)]))!.why).toMatch(/Nothing to share yet/);
    expect(shareOffer(study('chart', { chart: { kind: 'xmr', name: 'x' } }, [reading(1, 5, { struck: true }), reading(2, 6, { struck: true })]))!.targets).toEqual([]);
  });

  it('(g) a program criterion is never inherited, nor is a standard or a receipt', () => {
    const s = study('chart', { chart: { kind: 'xmr', name: 'x' } }, thirty(), { programId: 'prog1', standardId: 'st1', closedAt: 5 });
    const c = shareInto(s, 'analysis', { name: 'x', at: 9, ids: seq() })!;
    expect(c.programId).toBeUndefined(); expect(c.standardId).toBeUndefined(); expect(c.closedAt).toBeUndefined();
  });

  it('(h) an analysis "how sure about a mean" offers the other two; a shape too; an arm is not a column', () => {
    const sure = study('analysis', { analysis: { kind: 'sure', name: 'Fill', of: 'mean', unit: 'g' } }, thirty());
    expect(shareOffer(sure)!.targets).toEqual(['chart', 'capability']);
    expect(shareOffer(study('analysis', { analysis: { kind: 'shape', name: 'Fill' } }, thirty()))!.targets).toEqual(['chart', 'capability']);
    const arms = thirty().map(r => ({ ...r, arm: 'before' }));
    expect(shareOffer(study('analysis', { analysis: { kind: 'sure', name: 'Fill', of: 'mean' } }, arms))!.targets).toEqual([]);
  });

  it('into an analysis: how sure of the mean, 95%, name and unit carried', () => {
    const s = study('capability', { readings: { kind: 'limits', count: 30, unit: 'g', lower: 395 } }, thirty());
    const c = shareInto(s, 'analysis', { name: 'x', at: 9, ids: seq() })!;
    expect(c.agreed?.analysis).toEqual({ kind: 'sure', name: 'Fill weight', unit: 'g', of: 'mean', confidence: 0.95 });
  });

  it('never offers the study its own tool, and refuses a target it was not offered', () => {
    const s = study('chart', { chart: { kind: 'xmr', name: 'x' } }, thirty());
    expect(shareOffer(s)!.targets).not.toContain('chart');
    expect(shareInto(s, 'chart', { name: 'x', at: 9 })).toBeUndefined();
  });

  it('names the copy for its tool and says where it came from, and that the source has moved', () => {
    const s = study('capability', { readings: { kind: 'limits', count: 30 } }, thirty());
    expect(shareName(s, 'chart')).toBe('Fill weight — chart');
    const c = shareInto(s, 'chart', { name: 'x', at: 9, ids: seq() })!;
    const day = () => '12 Oct';
    expect(copiedSays(c.facts.copiedFrom, s, day)).toEqual({ head: 'Readings copied from “Fill weight”, 28 on 12 Oct' });
    const more = { ...s, facts: { readings: [...thirty(), reading(40, 401), reading(41, 402)] } };
    expect(copiedSays(c.facts.copiedFrom, more, day)?.moved).toBe('The source now has 30 — this copy has 28.');
    expect(copiedSays(c.facts.copiedFrom, null, day)?.moved).toMatch(/since been deleted/);
    expect(copiedSays(undefined, s, day)).toBeUndefined();
  });
});
