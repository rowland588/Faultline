/* THE READING — TOLD ONCE, KEPT FOR THAT CUSTOMER'S REPORT, USED AGAIN (15 November, docs/WORKBOOKS.md — "The reading"). Through the
 * registry, as a call from the gateway or the app's own code runs. On scripts/workbook/make-reading-workbooks.mjs: three months of a
 * made-up site's shift report in the site's own words, each with its truth BOTH WAYS — as a reader gets it unaided, and as the site
 * reads it once told — and the same months with a details strip above the headings. */
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { CapCtx } from '../types';
import { fits, hasReading, heldTo, mergeReading, readingSaid, toldSaid, type Reading } from '../../lib/workbook/reading';

const dir = mkdtempSync(join(tmpdir(), 'wbr-'));
type Truth = { rows: number; headerRow: number; unaided: { headline: string; packs: number; scoreAddedUp: number; crewAddedUp: number };
  told: { rows: number; out: number; standing: number; standingOut: number; standingAll: number; byLine: Record<string, number>; score: number; scoreAll: number; charge: number; packs: number } };
const truth = {} as Record<string, Truth>;
const NAMES = ['shift-report-march', 'shift-report-april', 'shift-report-may', 'strip-shift-report-march', 'strip-shift-report-april', 'renamed-shift-report-april', 'renamed-strip-shift-report-april'];
beforeAll(() => {
  execFileSync('node', ['scripts/workbook/make-reading-workbooks.mjs', dir], { stdio: 'ignore' });
  for (const n of NAMES) truth[n] = JSON.parse(readFileSync(join(dir, `${n}.truth.json`), 'utf8'));
}, 60_000);
beforeEach(() => { vi.stubGlobal('indexedDB', new IDBFactory()); vi.resetModules(); });

const DAY = 86_400_000, NOW = Date.UTC(2026, 10, 15, 9);
const n0 = (v: number) => Math.round(v).toLocaleString('en-GB');
async function seed() {
  const db = await import('../../db'), reg = await import('../registry'), conv = await import('../../colleague/conversation');
  const client = await import('../../lib/workbook/client'), wbc = await import('../workbook'), data = await import('../data'), look = await import('../look');
  const lines = await import('../../lib/lines'), active = await import('../../lib/activeClient');
  const backend = await client.directBackend();
  client.setWorkbookBackend(backend);
  /* two customers, each with a line — the customer in hand is the one chosen in the top bar, as the capability reads it */
  for (const [line, clientName] of [['Hallam 1', 'Hallam Foods'], ['Brook 1', 'Brook Dairy']]) await db.updateWorkspace({ ...(await lines.addLineToFactory(line)), clientName });
  let n = 0;
  /** A conversation with one workbook read into it and registered, as AI Mode does on attach — its first look worked for `clientName`. */
  const attach = async (cid: string, which: string, at: number, clientName = 'Hallam Foods') => {
    active.setActiveClient(clientName);
    await db.putStudy(conv.newConversation({ id: cid, at, name: 'AI' }));
    const ctx: CapCtx = { now: at, conversationId: cid, me: 'Rowland' };
    const f = new File([readFileSync(join(dir, `${which}.xlsx`))], `${which}.xlsx`, { lastModified: at });
    const id = client.workbookId(f);
    const p = await backend.read(id, f.name, f);
    await wbc.noteWorkbook(ctx, { id, name: f.name, bytes: f.size, at, status: p.status, sheets: p.sheets.map(s => ({ name: s.name, state: s.state, rows: s.rows, columns: s.columns.length })) });
    await data.registerFile(ctx, { fileId: id, fileName: f.name, kind: 'workbook', bytes: f.size, status: p.status, sheets: p.sheets.map(s => ({ name: s.name, rows: s.rows, columns: s.columns.map(c => ({ name: c.name, type: c.type })) })) });
    const run = async (input: unknown): Promise<string> => { active.setActiveClient(clientName); const r = await reg.runCall(ctx, { id: `c${n += 1}`, name: 'read_workbook_as', input }, { confirmed: false }); return r.ok ? r.says : `REFUSED: ${r.why}`; };
    const first = await look.workLook(ctx, { id, name: f.name }, p, { client: clientName });
    return { ctx, id, p, run, first, kept: () => look.keptLook(ctx, id) };
  };
  return { attach, look };
}
const said = (l: { parts: { part: string; text: string }[] } | undefined, part: string): string => (l?.parts ?? []).filter(x => x.part === part).map(x => x.text).join('\n');
/** The site's reading, said as the person says it: one call each. */
const TELL = [{ columns: { Standing: 'lost' } }, { leaveOut: { column: 'Type', is: 'Trial' } }, { columns: { Score: 'average' } }, { columns: { crew: 'never' } }, { columns: { Charge: 'money' } }];

describe('the reading, as data', () => {
  it('one thing laid over another: what is said now wins, the rest stands; in words, in the order it bears on the look', () => {
    let r = mergeReading(undefined, { columns: { Score: 'add' } }, 1);
    r = mergeReading(r, { columns: { score: 'average' }, rows: [{ column: 'Type', op: 'ne', value: 'Trial' }] }, 2);
    r = mergeReading(r, { result: 'Standing', ignore: ['Ref'] }, 3);
    expect(r).toEqual({ at: 3, result: 'Standing', columns: { score: 'average' }, ignore: ['Ref'], rows: [{ column: 'Type', op: 'ne', value: 'Trial' }] });
    expect(readingSaid(r)).toEqual(['“Standing” taken as the result', '“score” averaged, never added', '“Ref” ignored', 'rows where “Type” is “Trial” left out']);
    /* a column said to be a figure is no longer ignored; "only" of a column replaces what was said of it before */
    r = mergeReading(r, { columns: { Ref: 'add' }, rows: [{ column: 'Type', op: 'eq', value: 'Production' }] }, 4);
    expect(r.ignore).toBeUndefined();
    expect(r.rows).toEqual([{ column: 'Type', op: 'eq', value: 'Production' }]);
    expect(hasReading(r)).toBe(true);
    expect(hasReading({ at: 5 })).toBe(false);
    expect(hasReading({ ...r, forgotten: 9 })).toBe(false);
    /* a forgotten reading is not built on */
    expect(mergeReading({ ...r, forgotten: 9 }, { sheet: 'Data' }, 10)).toEqual({ at: 10, sheet: 'Data' });
  });
  it('said as it is applied — with the file it was first said about, what could not be applied, and how to undo it', () => {
    const r: Reading = { at: 1, columns: { Score: 'average' }, from: { name: 'March.xlsx', at: Date.UTC(2026, 10, 14) } };
    expect(toldSaid(r)).toBe('Read the way you told me (14 November, on “March.xlsx”): “Score” averaged, never added. Say “forget what I told you” to have it read as I would by myself.');
    expect(toldSaid(r, { dropped: ['“Crew”'] })).toContain('I could not apply “Crew” — it is not in this file.');
    expect(toldSaid({ at: 1 })).toBeUndefined();
  });
});

describe('told once, used again', () => {
  it('unaided, the made-up report is read WRONG for the site — and each thing told puts one part right, by the generator’s figures', async () => {
    const { attach } = await seed();
    const t = truth['shift-report-march'];
    const a = await attach('c1', 'shift-report-march', NOW);
    /* by herself: the packs lead, every row counted, and the score, the minutes, the crew and the charge are figures to add up */
    expect(a.first?.roles.headline?.column).toBe('Packs');
    expect(a.first?.snap.total).toBe(t.unaided.packs);
    expect(a.first?.roles.measures.map(m => m.column)).toEqual(expect.arrayContaining(['Score', 'Crew', 'Standing', 'Charge']));
    expect(said(a.first, 'told')).toBe('');
    /* told, one sentence at a time */
    const s1 = await a.run(TELL[0]);
    expect(s1).toContain('Read the way you told me: “Standing” read as time lost.');
    expect(s1).toContain(`I have taken “Standing” as the figure that matters: ${n0(t.told.standingAll)} over ${t.rows} rows`);
    const s2 = await a.run(TELL[1]);
    expect(s2).toContain(`rows where “Type” is “Trial” left out. That reads ${t.told.rows} of ${t.rows} rows; the ${t.told.out} left out carry ${n0(t.told.standingOut)} of “Standing”.`);
    expect(s2).toContain(`I have taken “Standing” as the figure that matters: ${n0(t.told.standing)} over ${t.told.rows} rows`);
    for (const [line, v] of Object.entries(t.told.byLine)) expect(s2, line).toContain(`${line} ${n0(v)}`);
    expect(s2).toContain('the rows you said to read');
    const s3 = await a.run(TELL[2]);
    expect(s3).toContain('By myself I would have added “Score” up.');
    expect(s3).toContain(`“Score” averages ${t.told.score.toLocaleString('en-GB', { maximumFractionDigits: 2 })} over the rows read.`);
    expect(s3).toContain('Not added up: “Score” (averaged, as you said)');
    const s4 = await a.run(TELL[3]);
    expect(s4).toContain('“Crew” never added up');
    const s5 = await a.run(TELL[4]);
    expect(s5).toContain('“Charge” read as money');
    /* kept: on the conversation (its pack follows the rows left out) and on the file's record */
    const k = await a.kept();
    expect(k?.asked?.columns).toEqual({ Standing: 'lost', Score: 'average', Crew: 'never', Charge: 'money' });
    expect(k?.basis).toEqual([{ column: 'Type', op: 'ne', value: 'Trial' }]);
    expect(k?.total).toBe(t.told.standing);
  }, 60_000);

  it('NEXT MONTH’S FILE, a new conversation: read the way the first was, right first time — and it says so', async () => {
    const { attach, look } = await seed();
    const a = await attach('c1', 'shift-report-march', NOW);
    for (const x of TELL) await a.run(x);
    const t = truth['shift-report-april'];
    const b = await attach('c2', 'shift-report-april', NOW + 30 * DAY);
    expect(b.first?.roles.headline?.column).toBe('Standing');
    expect(b.first?.snap.total).toBe(t.told.standing);
    const told = said(b.first, 'told');
    expect(told).toContain('Read the way you told me (15 November, on “shift-report-march.xlsx”): “Standing” read as time lost; “Score” averaged, never added; “Crew” never added up; “Charge” read as money; rows where “Type” is “Trial” left out.');
    expect(told).toContain(`That reads ${t.told.rows} of ${t.rows} rows; the ${t.told.out} left out carry ${n0(t.told.standingOut)} of “Standing”.`);
    expect(told).toContain(`“Score” averages ${t.told.score.toLocaleString('en-GB', { maximumFractionDigits: 2 })}`);
    /* what she would have done by herself is said only the first time */
    expect(told).not.toContain('By myself');
    for (const [line, v] of Object.entries(t.told.byLine)) expect(said(b.first, 'where'), line).toContain(`${line} ${n0(v)}`);
    /* the two months are compared like with like */
    expect(said(b.first, 'since')).toContain('Since “shift-report-march.xlsx”');
    expect(said(b.first, 'since')).not.toContain('are not compared');
    /* WHAT HAVE I TOLD YOU — nothing read again */
    const w = await b.run({ told: true });
    expect(w).toContain('About “shift-report-april.xlsx” you have told me (first on 15 November, about “shift-report-march.xlsx”): “Standing” read as time lost;');
    /* ADDED TO, on April: kept on April's record, and May is read by both */
    const s = await b.run({ columns: { Packs: 'never' } });
    expect(s).toContain('“Packs” never added up');
    expect((await look.keptReadings('Hallam Foods')).length).toBe(2);
    const c = await attach('c3', 'shift-report-may', NOW + 60 * DAY);
    expect(said(c.first, 'told')).toContain('“Packs” never added up');
    expect(c.first?.snap.total).toBe(truth['shift-report-may'].told.standing);
  }, 60_000);

  it('NEXT MONTH’S FILE WITH ITS SHEET RENAMED (X3): “Shift log” is “April shifts” — read the way it was told, and said', async () => {
    const { attach } = await seed();
    const a = await attach('c1', 'shift-report-march', NOW);
    for (const x of TELL) await a.run(x);
    const t = truth['renamed-shift-report-april'];
    const b = await attach('c2', 'renamed-shift-report-april', NOW + 30 * DAY);
    expect(b.first?.roles.sheet).toBe('April shifts');
    expect(b.first?.roles.headline?.column).toBe('Standing');
    expect(b.first?.snap.total).toBe(t.told.standing);
    expect(said(b.first, 'told')).toContain('(15 November, on “shift-report-march.xlsx”; its sheet “Shift log” is “April shifts” in this file)');
    expect(said(b.first, 'told')).toContain(`That reads ${t.told.rows} of ${t.rows} rows`);
  }, 60_000);
  it('a renamed sheet whose headings are on another row is read by the row it was told — and two sheets that would fit are never guessed between', async () => {
    const { attach } = await seed();
    const a = await attach('c1', 'strip-shift-report-march', NOW);
    await a.run({ headerRow: 4, sheet: 'Shift log' });
    for (const x of TELL) await a.run(x);
    const t = truth['renamed-strip-shift-report-april'];
    const b = await attach('c2', 'renamed-strip-shift-report-april', NOW + 30 * DAY);
    expect(b.first?.roles.sheet).toBe('April shifts');
    expect(b.first?.snap.total).toBe(t.told.standing);
    const twin = await attach('c3', 'twin-shift-report-april', NOW + 31 * DAY);
    expect(said(twin.first, 'told')).not.toContain('Read the way you told me');
  }, 60_000);
  it('never another customer’s: the same report for another business is read from nothing', async () => {
    const { attach } = await seed();
    const a = await attach('c1', 'shift-report-march', NOW);
    for (const x of TELL) await a.run(x);
    const b = await attach('c2', 'shift-report-april', NOW + DAY, 'Brook Dairy');
    expect(b.first?.roles.headline?.column).toBe('Packs');
    expect(b.first?.snap.total).toBe(truth['shift-report-april'].unaided.packs);
    expect(said(b.first, 'told')).toBe('');
    /* and with no customer chosen (All clients) it is not Hallam Foods' either */
    const c = await attach('c3', 'shift-report-may', NOW + 2 * DAY, '');
    expect(c.first?.roles.headline?.column).toBe('Packs');
    /* back at Hallam Foods it is still theirs */
    const d = await attach('c4', 'shift-report-may', NOW + 3 * DAY);
    expect(d.first?.roles.headline?.column).toBe('Standing');
  }, 60_000);

  it('FORGET: put away — kept, never applied again — and the workbook read as she would by herself; the next month from nothing', async () => {
    const { attach, look } = await seed();
    const a = await attach('c1', 'shift-report-march', NOW);
    for (const x of TELL) await a.run(x);
    const b = await attach('c2', 'shift-report-april', NOW + 30 * DAY);
    expect(b.first?.roles.headline?.column).toBe('Standing');
    const f = await b.run({ forget: true });
    expect(f).toContain('Forgotten — what you told me about this report is put away and will not be used again.');
    expect(f).toContain(`I have taken “Packs” as the figure that matters: ${n0(truth['shift-report-april'].unaided.packs)} over ${truth['shift-report-april'].rows} rows`);
    expect(f).not.toContain('Read the way you told me');
    expect((await b.kept())?.asked).toBeUndefined();
    /* kept, marked: nothing is deleted */
    const all = await look.keptReadings('Hallam Foods');
    expect(all.length).toBeGreaterThanOrEqual(1);
    expect(all.every(k => !!k.reading.forgotten)).toBe(true);
    const c = await attach('c3', 'shift-report-may', NOW + 60 * DAY);
    expect(c.first?.roles.headline?.column).toBe('Packs');
    expect(said(c.first, 'told')).toBe('');
    expect(await c.run({ told: true })).toContain('You have told me nothing about how to read “shift-report-may.xlsx”');
  }, 60_000);

  it('refused in words, nothing changed: a column that is not there, a value the column does not hold, a rule that leaves nothing, words averaged', async () => {
    const { attach } = await seed();
    const a = await attach('c1', 'shift-report-march', NOW);
    expect(await a.run({ columns: { Scoore: 'average' } })).toMatch(/^REFUSED: “Scoore” is not a column of “Shift log” to say what it is — its columns are “Date” \(A\), “Line” \(B\)/);
    expect(await a.run({ leaveOut: { column: 'Type', is: 'Trail' } })).toMatch(/^REFUSED: No row of “Shift log” has “Trail” under “Type” — it holds /);
    expect(await a.run({ columns: { Line: 'average' } })).toMatch(/^REFUSED: “Line” on “Shift log” holds no numbers/);
    expect(await a.run({ columns: { Score: 'median' } })).toMatch(/^REFUSED: A column is said to be one of: add, average, never, lost, money, volume/);
    expect(await a.run({ ignore: ['Nothing here'] })).toMatch(/^REFUSED: “Nothing here” is not a column of “Shift log” to ignore/);
    expect((await a.kept())?.asked).toBeUndefined();
    /* "only" the rows of one value; an ignored column is no longer something to split by */
    const o = await a.run({ only: { column: 'line', is: 'line 3' }, ignore: ['Shift'] });
    expect(o).toContain('only the rows where “Line” is “line 3”');
    expect(o).toContain('“Shift” ignored');
    expect(o).not.toContain('By “Shift”');
  }, 60_000);

  it('THE HEADING ROW, told once: next month’s copy has its strip passed over by itself', async () => {
    const { attach } = await seed();
    const t = truth['strip-shift-report-march'];
    const a = await attach('c1', 'strip-shift-report-march', NOW);
    /* unaided the strip is taken for the headings — the figure is a column called "Prepared by" */
    expect(a.first?.roles.headline?.column).not.toBe('Packs');
    const s = await a.run({ headerRow: t.headerRow, sheet: 'Shift log' });
    expect(s).toContain('The headings of “Shift log” are taken from row 4: “Date”, “Line”, “Shift”, “Type”, “Packs”');
    expect(s).toContain(`I have taken “Packs” as the figure that matters: ${n0(t.unaided.packs)} over ${t.rows} rows`);
    await a.run({ columns: { Standing: 'lost' }, leaveOut: { column: 'Type', is: 'Trial' } });
    const u = truth['strip-shift-report-april'];
    const b = await attach('c2', 'strip-shift-report-april', NOW + 30 * DAY);
    expect(b.first?.roles.headline?.column).toBe('Standing');
    expect(b.first?.snap.total).toBe(u.told.standing);
    expect(said(b.first, 'told')).toContain('started with “Shift log”; the headings of “Shift log” taken from row 4; “Standing” read as time lost; rows where “Type” is “Trial” left out.');
    /* a report of another shape for the same customer is not touched: the plain copy has its headings on row 1 and does not fit after row 4 is taken */
    const c = await attach('c3', 'shift-report-may', NOW + 31 * DAY);
    expect(said(c.first, 'told')).toBe('');
    expect(c.first?.roles.headline?.column).toBe('Packs');
  }, 60_000);

  it('a reading whose column this file no longer has is applied without that part — and says which', async () => {
    const { attach } = await seed();
    const a = await attach('c1', 'shift-report-march', NOW);
    const p = a.p;
    const held = heldTo({ at: 1, result: 'Standing', columns: { score: 'average', Giveaway: 'money' }, ignore: ['Old ref'], rows: [{ column: 'type', op: 'ne', value: 'Trial' }, { column: 'Site', op: 'eq', value: 'Hull' }] }, p, 'Shift log');
    /* names are taken as the file spells them */
    expect(held.reading).toEqual({ at: 1, result: 'Standing', columns: { Score: 'average' }, rows: [{ column: 'Type', op: 'ne', value: 'Trial' }] });
    expect(held.dropped).toEqual(['“Giveaway”', '“Old ref”', 'the rule on “Site”']);
    expect(fits({ snap: { sheet: 'shift log', headings: ['Date', 'Line', 'Shift', 'Type', 'Packs', 'Score', 'Standing', 'Crew', 'Charge', 'Extra'] } as never }, p)).toBe(true);
    expect(fits({ snap: { sheet: 'Shift log', headings: ['Week', 'Product', 'Tonnes', 'Yield', 'Waste'] } as never }, p)).toBe(false);
    expect(fits({ snap: { sheet: 'Other', headings: ['Date', 'Line', 'Shift', 'Type'] } as never }, p)).toBe(false);
  }, 60_000);
});
