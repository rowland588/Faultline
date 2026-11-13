/* THE FOUR THINGS THE EXCEL WORK WAS MISSING, CHECKED AGAINST TOTALS THE READER DID NOT MAKE (13 November, docs/WORKBOOKS.md).
 * scripts/workbook/make-marked-workbook.mjs writes a hand-kept shift report (every name and figure made up) with its own totals:
 *   cell colours   a missed shift's whole row painted red, a good count green (a theme colour with a tint), a short status amber;
 *   the headings   a details strip above them that reads as headings — the person says the row;
 *   next month     the same report a month later: more rows, a part month now whole, one figure already read quietly changed;
 *   the pack       the first look laid out as a report with its charts, every figure from a result asked of the rows. */
import { describe, it, expect, beforeAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, openSync, readSync, fstatSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readWorkbook, type WorkbookProfile } from '../read';
import { runQuery } from '../query';
import { MemoryStore } from '../store';
import type { ByteSource } from '../zip';
import { figure, firstLook, type FirstLook } from '../firstLook';
import { amendProfile } from '../amend';
import { colourWord, fillWords, themeColours } from '../colours';
import { lastOf, sameReport, sinceLast, type LookSnap } from '../sinceLast';
import { lookPack, type KeptLook } from '../lookPack';
import { seriesOf, chartNow } from '../../data/outputs';

type Exp = { rows: number; variance: number; byMonth: Record<string, number>; byLine: Record<string, number>; byShift: Record<string, number>; daysByMonth: Record<string, number>; red: number; green: number; amber: number; redVariance: number; restated: { was: number; is: number } | null; headerRow: number };
const dir = mkdtempSync(join(tmpdir(), 'wbm-'));
const onDisk = (path: string): ByteSource => { const fd = openSync(path, 'r'); return { size: fstatSync(fd).size, read: async (a, b) => { const buf = Buffer.alloc(b - a); readSync(fd, buf, 0, b - a, a); return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength); } }; };
async function made(name: string, id: string, ...flags: string[]): Promise<{ exp: Exp; p: WorkbookProfile; store: MemoryStore; run: (q: Parameters<typeof runQuery>[2]) => ReturnType<typeof runQuery> }> {
  const file = join(dir, name);
  execFileSync('node', ['scripts/workbook/make-marked-workbook.mjs', file, ...flags], { stdio: 'ignore' });
  const store = new MemoryStore();
  const p = await readWorkbook(onDisk(file), store, { id, name });
  return { exp: JSON.parse(readFileSync(`${file}.expected.json`, 'utf8')) as Exp, p, store, run: q => runQuery(store, p, q) };
}
const V = 'Variance £';
const money = (v: number) => figure(v, V, 'outcome');
let a: Awaited<ReturnType<typeof made>>, b: Awaited<ReturnType<typeof made>>, c: Awaited<ReturnType<typeof made>>;
let lookA: FirstLook, lookB: FirstLook;
const T1 = Date.UTC(2026, 8, 15, 9), T2 = Date.UTC(2026, 10, 2, 9);

beforeAll(async () => {
  a = await made('Shift report September.xlsx', 'a');
  b = await made('Shift report October.xlsx', 'b', '--later');
  c = await made('Shift report with strip.xlsx', 'c', '--strip');
  lookA = (await firstLook(a.p, a.run, { now: T1 })) as FirstLook;
  lookB = (await firstLook(b.p, b.run, { now: T2, earlier: [lookA.snap] })) as FirstLook;
}, 120_000);

describe('cell colours, read as words and kept as columns', () => {
  it('a fill is one plain word; white and no fill are no colour; a tint moves the lightness, never the hue', () => {
    expect(colourWord('FF0000')).toBe('red');
    expect(colourWord('FFC000')).toBe('orange');
    expect(colourWord('FFFF00')).toBe('yellow');
    expect(colourWord('00B050')).toBe('green');
    expect(colourWord('0070C0')).toBe('blue');
    expect(colourWord('7030A0')).toBe('purple');
    expect(colourWord('BFBFBF')).toBe('grey');
    expect(colourWord('FFFFFF')).toBeUndefined();
    expect(colourWord('70AD47', 0.6)).toBe('green');
    expect(colourWord('C00000', -0.25)).toBe('red');
    expect(colourWord('nonsense')).toBeUndefined();
  });
  it('the styles part: each cell style with a SOLID fill, by rgb, by theme and tint, by the old palette — a pattern is not a colour', () => {
    const styles = '<styleSheet><fills><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFF0000"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor theme="9" tint="0.6"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor indexed="5"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor theme="0"/></patternFill></fill></fills><cellXfs><xf fillId="0"/><xf fillId="1"/><xf fillId="2"/><xf fillId="3"/><xf fillId="4"/><xf fillId="5"/></cellXfs></styleSheet>';
    expect([...fillWords(styles)]).toEqual([[2, 'red'], [3, 'green'], [4, 'yellow']]);
    /* the workbook's own theme is used when it has one: accent 6 made blue turns style 3 blue */
    const theme = '<a:theme><a:themeElements><a:clrScheme name="x"><a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1><a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="44546A"/></a:dk2><a:lt2><a:srgbClr val="E7E6E6"/></a:lt2><a:accent1><a:srgbClr val="4472C4"/></a:accent1><a:accent2><a:srgbClr val="ED7D31"/></a:accent2><a:accent3><a:srgbClr val="A5A5A5"/></a:accent3><a:accent4><a:srgbClr val="FFC000"/></a:accent4><a:accent5><a:srgbClr val="5B9BD5"/></a:accent5><a:accent6><a:srgbClr val="0070C0"/></a:accent6></a:clrScheme></a:themeElements></a:theme>';
    expect(themeColours(theme)[9]).toBe('0070C0');
    expect(fillWords(styles, theme).get(3)).toBe('blue');
  });
  it('a row painted whole is “Row colour”; a single painted cell is its column’s — counted as the generator painted them', async () => {
    const s = a.p.sheets[0];
    expect(s.colours?.map(x => x.column).sort()).toEqual(['Colour of Packs', 'Colour of Status', 'Row colour']);
    expect(s.colours?.find(x => x.column === 'Row colour')?.counts).toEqual([['red', a.exp.red]]);
    expect(s.colours?.find(x => x.column === 'Colour of Packs')?.counts).toEqual([['green', a.exp.green]]);
    expect(s.colours?.find(x => x.column === 'Colour of Status')?.counts).toEqual([['orange', a.exp.amber]]);
    expect(s.colourRules).toBe(1);
    /* a colour is a column like any other: the variance on the red rows is the generator's own sum */
    const r = await a.run({ sheet: 'Shift report', filters: [{ column: 'Row colour', op: 'eq', value: 'red' }], measures: [{ op: 'sum', column: V }] });
    expect(r.rowsMatched).toBe(a.exp.red);
    expect(r.totals[0]).toBeCloseTo(a.exp.redVariance, 1);
    /* the sheet with no painted cell has no colour column; a colour column never "links" two sheets */
    expect(a.p.sheets[1].colours).toBeUndefined();
    expect(a.p.links.some(l => /colour/i.test(l.column))).toBe(false);
  });
  it('the first look says the colours, that their meaning is not in the file, and that a rule’s colours are not read', () => {
    const said = lookA.says.join('\n');
    expect(said).toContain(`“Row colour” — ${a.exp.red} red`);
    expect(said).toContain(`“Colour of Packs” — ${a.exp.green} green`);
    expect(said).toContain('What a colour MEANS is not written in the file');
    expect(said).toContain('1 colour rule (conditional formatting)');
    expect(lookA.parts.find(x => x.part === 'colours')).toBeTruthy();
    /* the colour columns are never taken for the workbook's headings when the same report is matched */
    expect(lookA.snap.headings).toEqual(['Date', 'Shift', 'Line', 'Packs', 'Target', V, 'Status']);
  });
});

describe('the headings, as the person says them', () => {
  it('a details strip above the headings is read as the headings — and the look says nothing true of the table', () => {
    const s = c.p.sheets[0];
    expect(s.headerRow).toBe(1);
    expect(s.columns.find(x => x.letter === 'A')?.name).toBe('Site');
  });
  it('“the headings are on row 3”: each column takes that row’s words, the rows down to it stop being data, and every figure is right', async () => {
    const before = c.p.sheets[0].rows;
    const r = await amendProfile(c.store, c.p, { sheet: 'Shift report', headerRow: 3 });
    const s = r.profile.sheets[0];
    expect(s.columns.filter(x => !x.colour && x.letter <= 'G').map(x => x.name)).toEqual(['Date', 'Shift', 'Line', 'Packs', 'Target', V, 'Status']);
    expect(s.headerRow).toBe(3);
    expect(s.dataFrom).toBe(4);
    expect(before - s.rows).toBe(2);
    expect(s.rows).toBe(c.exp.rows);
    expect(r.said.join(' ')).toContain('The headings of “Shift report” are taken from row 3');
    expect(s.amended?.length).toBe(1);
    const q = await runQuery(c.store, r.profile, { sheet: 'Shift report', groupBy: ['Line'], measures: [{ op: 'sum', column: V }] });
    expect(q.rowsScanned).toBe(c.exp.rows);
    for (const g of q.groups) expect(g.values[0]).toBeCloseTo(c.exp.byLine[g.key[0]], 1);
    /* and the look, told the sheet and the result, reads it as the generator made it */
    const look = (await firstLook(r.profile, x => runQuery(c.store, r.profile, x), { sheet: 'Shift report', result: V })) as FirstLook;
    expect(look.roles.headline?.column).toBe(V);
    expect(look.says.join('\n')).toContain(`“${V}” is the figure that matters, as you said.`);
    expect(look.snap.total).toBeCloseTo(c.exp.variance, 1);
    expect(look.snap.headings.slice(0, 7)).toEqual(['Date', 'Shift', 'Line', 'Packs', 'Target', V, 'Status']);
  });
  it('a column is called what the person calls it — by its letter or its heading; a name already taken, a column not there and a row above the header are refused in words', async () => {
    const r = await amendProfile(c.store, c.p, { sheet: 'Shift report', names: [{ column: 'E', name: 'Plan' }] });
    expect(r.profile.sheets[0].columns.find(x => x.letter === 'E')?.name).toBe('Plan');
    expect(r.said[0]).toContain('Column E of “Shift report” (it was “Target”) is now called “Plan”.');
    await expect(amendProfile(c.store, c.p, { sheet: 'Shift report', names: [{ column: 'Plan', name: 'Packs' }] })).rejects.toThrow(/already a column/);
    await expect(amendProfile(c.store, c.p, { sheet: 'Shift report', names: [{ column: 'ZZ', name: 'x' }] })).rejects.toThrow(/No column “ZZ”/);
    await expect(amendProfile(c.store, c.p, { sheet: 'Shift report', headerRow: 2 })).rejects.toThrow(/above the row I read as its headings \(row 3\)/);
    await expect(amendProfile(c.store, c.p, { sheet: 'Shift report', headerRow: 99999 })).rejects.toThrow(/holds nothing I read/);
  });
  it('a sheet the reader would not lead with is read when the person names it, with the column they name as the result', async () => {
    const look = (await firstLook(a.p, a.run, { sheet: 'Lines', result: 'Crew size' })) as FirstLook;
    expect(look.roles.sheet).toBe('Lines');
    expect(look.roles.headline?.column).toBe('Crew size');
    expect(look.snap.total).toBe(15);
    /* a sheet that is not there changes nothing: the reader's own choice stands */
    expect(((await firstLook(a.p, a.run, { sheet: 'No such sheet' })) as FirstLook).roles.sheet).toBe('Shift report');
  });
});

describe('the same report, read again: what changed', () => {
  it('is the same report by its lead sheet and its headings — never by its file name, and never itself', () => {
    expect(sameReport(lookA.snap, lookB.snap)).toBe(true);
    expect(sameReport(lookA.snap, lookA.snap)).toBe(false);
    expect(sameReport(lookA.snap, { ...lookB.snap, sheet: 'Other' })).toBe(false);
    expect(sameReport(lookA.snap, { ...lookB.snap, headings: ['Date', 'Machine', 'Stops', 'Minutes', 'Reason'] })).toBe(false);
    expect(lastOf([lookA.snap], lookB.snap)).toBe(lookA.snap);
    expect(lastOf([{ ...lookA.snap, at: T2 + 1 }], lookB.snap)).toBeUndefined();
  });
  it('says the rows added, the new month, the part month now whole, and the figure already read that CHANGED — with both figures', () => {
    expect(lookB.comparedWith).toEqual({ name: 'Shift report September.xlsx', at: T1 });
    const since = lookB.parts.filter(x => x.part === 'since').map(x => x.text).join('\n');
    expect(since).toContain(`Since “Shift report September.xlsx”, read on 15 September: ${b.exp.rows - a.exp.rows} rows more on “Shift report” (${a.exp.rows} then, ${b.exp.rows} now).`);
    expect(since).toContain(`New: October ${money(b.exp.byMonth['2026-10'])}.`);
    expect(since).toContain(`September was 14 days in at ${money(a.exp.byMonth['2026-09'])} and is whole now at ${money(b.exp.byMonth['2026-09'])}`);
    expect(since).toContain(`Figures already read have CHANGED: August was ${money(a.exp.byMonth['2026-08'])} and is ${money(b.exp.byMonth['2026-08'])} now (−£500)`);
    expect(b.exp.restated?.is).toBeCloseTo((b.exp.restated?.was ?? 0) - 500, 2);
    /* said straight after the period, before where it sits */
    const order = lookB.parts.map(x => x.part);
    expect(order.indexOf('since')).toBeGreaterThan(order.indexOf('period'));
    expect(order.indexOf('since')).toBeLessThan(order.indexOf('gaps'));
    /* the first reading has nothing to compare with, and says nothing of it */
    expect(lookA.parts.some(x => x.part === 'since')).toBe(false);
  });
  it('nothing restated is said so; a different lead figure is not compared; a file that replaces the last is compared by its totals and its biggest mover', () => {
    const fig = (v: number) => `£${Math.round(v)}`;
    const base: LookSnap = { at: 1, name: 'Wk 31.xlsx', fileId: 'x', sheet: 'Data', rows: 100, headings: ['Date', 'Line', 'Loss £'], headline: 'Loss £', total: 1000, months: [{ key: '2026-08', label: 'August 2026', days: 31, part: false, value: 1000 }], splits: [{ dim: 'Line', groups: [{ key: 'Line 1', value: 400 }, { key: 'Line 2', value: 600 }] }] };
    const same = sinceLast(base, { ...base, at: 2, fileId: 'y', name: 'Wk 32.xlsx', rows: 130, months: [...base.months, { key: '2026-09', label: 'September 2026', days: 7, part: true, value: 250 }] }, fig);
    expect(same.join(' ')).toContain('30 rows more');
    expect(same.join(' ')).toContain('New: September (part, 7 days) £250.');
    expect(same.join(' ')).toContain('nothing already reported has been changed');
    expect(sinceLast(base, { ...base, at: 2, fileId: 'y', headline: 'Packs' }, fig)).toEqual([expect.stringContaining('the two are not compared')]);
    const replaced = sinceLast(base, { ...base, at: 2, fileId: 'y', name: 'Wk 32.xlsx', total: 1500, months: [{ key: '2026-09', label: 'September 2026', days: 30, part: false, value: 1500 }], splits: [{ dim: 'Line', groups: [{ key: 'Line 1', value: 420 }, { key: 'Line 2', value: 1080 }] }] }, fig);
    expect(replaced.join(' ')).toContain('“Loss £” was £1000 in that file and is £1500 in this one — +£500. The biggest mover is Line 2 on “Line”: +£480.');
  });
});

describe('the first look as a pack', () => {
  it('lays the look out as a report: its words, the months as a chart, each split as a chart — every chart from a result asked of the rows', async () => {
    const k: KeptLook = { workbookId: 'b', name: b.p.name, at: T2, sheet: lookB.roles.sheet, headline: lookB.roles.headline as KeptLook['headline'], date: lookB.roles.date, dims: lookB.splitDims, parts: lookB.parts };
    let n = 0;
    const pack = await lookPack(k, b.run, { kind: 'workbook', id: 'b', name: b.p.name, sheet: k.sheet }, { id: pre => `${pre}${n += 1}`, now: T2 });
    expect(pack.report.title).toBe('Shift report October — first look');
    const heads = pack.report.sections.map(s => `${s.kind}:${s.heading}`);
    expect(heads.slice(0, 4)).toEqual(['text:What this workbook holds', 'chart:Month by month', expect.stringMatching(/^(finding|text):The period$/), 'text:Since it was last read']);
    expect(heads).toContain('chart:By Line');
    expect(heads).toContain('text:Colours');
    expect(heads[heads.length - 1]).toBe('text:To know before trusting it');
    /* nothing the code worked is marked "check this" */
    expect(pack.report.sections.some(s => s.unbacked?.length)).toBe(false);
    /* the months chart draws the generator's own monthly totals */
    const results = new Map(pack.results.map(r => [r.id, r]));
    const months = pack.charts.find(ch => results.get(chartNow(ch).resultId)?.title === `${V} by month`);
    const ser = seriesOf(chartNow(months as NonNullable<typeof months>), results);
    expect('why' in ser).toBe(false);
    if (!('why' in ser)) { expect(ser.labels).toEqual(['2026-08', '2026-09', '2026-10']); ser.values.forEach((v, i) => expect(v).toBeCloseTo(b.exp.byMonth[ser.labels[i]], 1)); }
    const byLine = pack.results.find(r => r.title === `${V} by Line`);
    for (const g of byLine?.result.groups ?? []) expect(g.values[0]).toBeCloseTo(b.exp.byLine[g.key[0]], 1);
    /* every chart section names a chart of the pack, and every finding the result it rests on */
    for (const s of pack.report.sections) {
      if (s.kind === 'chart') expect(pack.charts.some(ch => ch.id === s.chartId)).toBe(true);
      if (s.kind === 'finding') expect(s.evidence?.every(id => results.has(id))).toBe(true);
    }
    expect(pack.report.sections.find(s => s.heading === 'Since it was last read')?.text).toContain('Figures already read have CHANGED');
  });
});
