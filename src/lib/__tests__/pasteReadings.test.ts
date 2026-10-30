/* Pasted readings — ONE parser for the Analysis, the Capability study and the Control chart (tools audit, 30 October 2026:
 * "readings only by keypad" — 30 readings were ~180 taps). Hand-worked cases; nothing here depends on a tool's module. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parsePasted, subgroupOf, MAX_PASTED } from '../pasteReadings';
import { parsePasted as fromAnalysis } from '../../tools/analysis/analysis';
import { sample, sampleSays } from '../../tools/capability/sample';
import { chartFigures, chartSays } from '../../tools/chart/chart';
import { analysisFigures, analysisSays, KIND_WORDS } from '../../tools/analysis/analysis';
import { USUAL_UNITS } from '../../ui/UnitField';
import type { AgreedChart, AgreedReadings, StudyReading } from '../study';

describe('one parser, shared', () => {
  it('the Analysis exports this very parser — no second one', () => { expect(fromAnalysis).toBe(parsePasted); });
  it('a number to a line, spaced, comma- or semicolon-separated; blank lines ignored; signs and bare decimals read', () => {
    const p = parsePasted('401.2\n401.6, 400.8  402;403\n\n-3 .5\r\n+7');
    expect(p.values).toEqual([401.2, 401.6, 400.8, 402, 403, -3, 0.5, 7]); expect(p.skipped).toEqual([]);
  });
  it('what is not a number is listed, never dropped silently, and the numbers around it go in', () => {
    const p = parsePasted('401.2\nabc 12,\n4o1\n1e3\n401.9');
    expect(p.values).toEqual([401.2, 12, 401.9]); expect(p.skipped).toEqual(['abc', '4o1', '1e3']);
  });
  it('a wild reading is a number and is kept — the tool flags it', () => {
    const p = parsePasted('400.1 400.3 400.2 4002 400.4');
    expect(p.values).toEqual([400.1, 400.3, 400.2, 4002, 400.4]);
  });
  it('pairs: two numbers to a line, a bad line skipped whole', () => {
    const p = parsePasted('1 2\n3,4\n5\n6 7 8\nx 9', 2);
    expect(p.pairs).toEqual([[1, 2], [3, 4]]); expect(p.skipped).toEqual(['5', '6 7 8', 'x 9']);
  });
  it('a paste is capped at a sane size', () => { expect(MAX_PASTED).toBe(500); });
});

describe('subgroups filled in order', () => {
  it('reading i (0-based) of subgroups of 4 falls in subgroup floor(i/4)+1', () => {
    expect([0, 3, 4, 7, 8].map(i => subgroupOf(i, 4))).toEqual([1, 1, 2, 2, 3]);
  });
  it('a paste carries on from a half-full subgroup: 2 already in, 6 pasted → 2 more complete subgroup 1, then subgroup 2 (4), none left over', () => {
    expect(Array.from({ length: 6 }, (_, i) => subgroupOf(2 + i, 4))).toEqual([1, 1, 2, 2, 2, 2]);
  });
  it('subgroups of 4 pasted as 24 readings are six subgroups on the chart, as if typed', () => {
    const vs = [400.2, 399.8, 400.5, 400.1, 399.9, 400.4, 400.0, 399.6, 400.3, 400.1, 399.7, 400.6, 400.8, 401.2, 400.9, 401.5, 400.0, 399.5, 400.2, 399.9, 400.4, 400.0, 400.3, 399.8];
    const a: AgreedChart = { kind: 'xbar', name: 'Fill weight', unit: 'g', subgroup: 4 };
    const pasted: StudyReading[] = vs.map((value, i) => ({ id: `p${i}`, at: i, value, group: subgroupOf(i, 4) }));
    const typed: StudyReading[] = vs.map((value, i) => ({ id: `t${i}`, at: i, value, group: Math.floor(i / 4) + 1 }));
    const fp = chartFigures(a, pasted), ft = chartFigures(a, typed);
    expect(fp.points.length).toBe(6); expect(fp.points.map(p => p.y)).toEqual(ft.points.map(p => p.y));
    expect(chartSays(fp, a).text).toBe(chartSays(ft, a).text);
  });
});

/* A unit is never invented: with none agreed, no tool's words carry one. */
describe('no unit agreed — the figures say no unit (tools audit X3: a fill time came back as "12.31 g")', () => {
  const THIRTY = [400.1, 402.6, 401.6, 400.8, 401.5, 401.3, 400.2, 401.9, 400.6, 400.4, 400.6, 401.2, 401.9, 400.9, 401.8, 401.0, 401.9, 400.8, 401.9, 401.1, 401.2, 401.6, 401.3, 400.7, 401.3, 400.4, 401.1, 401.5, 401.9, 400.8];
  const rd = (vs: number[]): StudyReading[] => vs.map((value, i) => ({ id: `r${i}`, at: i, value }));
  it('the Analysis: a mean of thirty readings, no unit in the sentence — and with "s" the very same sentence carries it', () => {
    const none = analysisSays(analysisFigures({ kind: 'sure', name: 'Fill time' }, rd(THIRTY)), { kind: 'sure', name: 'Fill time' });
    expect(none.text).toBe('30 readings, mean 401.20 — we can be 95% confident the true mean is between 400.97 and 401.42 (± 0.22).');
    expect(none.verdict).toBe('Sure to ± 0.22');
    const a = { kind: 'sure' as const, name: 'Fill time', unit: 's' };
    expect(analysisSays(analysisFigures(a, rd(THIRTY)), a).text).toBe('30 readings, mean 401.20 s — we can be 95% confident the true mean is between 400.97 and 401.42 s (± 0.22 s).');
  });
  it('the Capability study: a speed at least 75, no unit in the sentence', () => {
    const a: AgreedReadings = { kind: 'limits', lower: 75, count: 30 };
    const said = sampleSays(sample(a, rd(THIRTY.map(v => v - 320))), a);
    expect(said.text).not.toMatch(/\b\d\s?(g|kg)\b/); expect(said.text).toMatch(/at least 75\b(?! [a-z°%])/);
  });
  it('the Control chart: limits and the centre with no unit', () => {
    const a: AgreedChart = { kind: 'xmr', name: 'Fill time' };
    const text = chartSays(chartFigures(a, rd(THIRTY)), a).text;
    expect(text).toMatch(/^Fill time — 30 readings against provisional limits|^Fill time — 30 readings against limits [\d.]+–[\d.]+ from/);
    expect(text).not.toMatch(/\d ?g\b/);
  });
});

describe('the unit starts empty on the three tools; the usual ones are chips', () => {
  const read = (f: string) => readFileSync(join(__dirname, '..', '..', f), 'utf8');
  it.each(['tools/analysis/AnalysisScreen.tsx', 'tools/capability/StudyScreen.tsx', 'tools/chart/ChartScreen.tsx'])('%s: useState(a?.unit ?? \'\') and the UnitField, never a "g" default', f => {
    const src = read(f);
    expect(src).toMatch(/useState\(a\?\.unit \?\? ''\)/); expect(src).not.toMatch(/a\?\.unit \?\? 'g'/); expect(src).toContain('<UnitField');
  });
  it('the usual units the audit named, every one a chip', () => {
    expect([...USUAL_UNITS]).toEqual(['g', 'kg', 'mm', 's', 'min', '°C', 'ppm', '%', 'pack/min']);
  });
  it('the Capability and the Control chart take pasted readings through the one shared box', () => {
    for (const f of ['tools/capability/StudyScreen.tsx', 'tools/chart/ChartScreen.tsx', 'tools/analysis/AnalysisScreen.tsx']) expect(read(f)).toContain('<ReadingsPaste');
    expect(read('tools/analysis/AnalysisScreen.tsx')).not.toMatch(/function Paste\(/);
  });
});

describe('the Analysis’s twelve questions under three headings', () => {
  it('every kind appears once, none dropped, the stored keys the old ones', async () => {
    const src = readFileSync(join(__dirname, '..', '..', 'tools/analysis/AnalysisScreen.tsx'), 'utf8');
    const block = /const QUESTION_GROUPS[^=]*=\s*\[([\s\S]*?)\n\];/.exec(src)?.[1] ?? '';
    const kinds = [...block.matchAll(/'([a-z]+)'/g)].map(m => m[1]);
    expect([...kinds].sort()).toEqual(Object.keys(KIND_WORDS).sort()); expect(kinds.length).toBe(12);
    expect((block.match(/head:/g) ?? []).length).toBe(3);
  });
});
