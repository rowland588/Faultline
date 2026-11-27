/* WHAT LUNA ALREADY KNOWS OF THE FILES IN HAND (colleague/knows, 21 November 2026 — docs/LUNA-AGENT.md G3). */
import { describe, expect, it } from 'vitest';
import { KNOWS, NOT_SHOWN, changedOf, changedSaid, filesKnown, saysOf } from '../knows';
import { CHANGED, IT_SAYS, focusText } from '../conversation';
import { checkFigures } from '../figureCheck';
import { newestFiles, sourceSaid, type Source, type SourceFacts } from '../../lib/data/sources';
import type { LookSnap } from '../../lib/workbook/sinceLast';

const DAY = 86_400_000;
const T0 = Date.UTC(2026, 10, 21, 9);

const snap = (o: Partial<LookSnap> = {}): LookSnap => ({
  at: T0, name: 'Shift report.xlsx', fileId: 'wb1', sheet: 'Shift report', rows: 270, over: 270, headings: ['Date', 'Line', 'Variance £'], headline: 'Variance £', total: -50368.5, kind: 'outcome',
  months: [{ key: '2026-08', label: 'August 2026', days: 31, part: false, value: -35459.76 }],
  splits: [{ dim: 'Line', groups: [{ key: 'Line 3', value: -26691.84 }, { key: 'Line 1', value: -15091.02 }, { key: 'Line 2', value: -8585.64 }] }],
  ...o,
});
const file = (id: string, at: number, f: Partial<SourceFacts> = {}): Source => ({
  id, at,
  facts: { name: `File ${id}`, named: 'file', fileName: `${id}.xlsx`, kind: 'workbook', bytes: 1000, at, fileId: `wb-${id}`, status: 'ready', client: 'Branston', ...f },
});
const line = (s: Source, o: { earlier: boolean } = { earlier: false }) => `“${s.facts.name}” [source ${s.id}]${o.earlier ? ' (earlier)' : ''}`;
const LINK = (url: string) => ({ kind: 'link' as const, url, service: 'onedrive' as const, host: 'h', hash: 'x' });

describe('what Luna is told of the files in hand', () => {
  it('a file with a first look kept is said with what it says, under its own line', () => {
    const s = file('a', T0, { look: { snap: snap(), client: 'Branston' } });
    expect(saysOf(s)).toBe('“Variance £” comes to −£50,368 over 270 rows of “Shift report”; by month: August 2026 −£35,460; by “Line”: Line 3 −£26,692 · Line 1 −£15,091 · Line 2 −£8,586.');
    expect(filesKnown([s], line)).toEqual([`“File a” [source a]\n    ${IT_SAYS}: ${saysOf(s)}`]);
  });

  it('a file with no look kept — a document, a table read as evidence — is listed as it was, and nothing is made up for it', () => {
    const doc = file('d', T0, { kind: 'document' });
    expect(saysOf(doc)).toBeUndefined();
    expect(filesKnown([doc], line)).toEqual(['“File d” [source d]']);
  });

  it('a document with a first look kept is said with its headline, never a made-up figure', () => {
    const doc = file('t', T0, { kind: 'document', documentLook: { kind: 'tender', headline: '“ITT-2026-014.pdf” is a tender. amount £48,000 Not in the file: supplier.', missing: ['supplier'], facts: [{ field: 'amount', value: '£48,000', pounds: 48000, page: 1, quote: 'Total contract value: £48,000' }], at: T0 } });
    expect(saysOf(doc)).toBe('“ITT-2026-014.pdf” is a tender. amount £48,000 Not in the file: supplier.');
    expect(filesKnown([doc], line)[0]).toContain(IT_SAYS);
    expect(filesKnown([doc], line)[0]).toContain('£48,000');
  });

  it('the newest reading speaks for a linked file: an older version of the same link is listed, never said twice', () => {
    const o = LINK('https://1drv.ms/x/abc');
    const newer = file('n', T0, { origin: o as SourceFacts['origin'], look: { snap: snap({ total: -60000 }) } });
    const older = file('o', T0 - 7 * DAY, { origin: o as SourceFacts['origin'], look: { snap: snap({ total: -50368.5 }) } });
    const other = file('x', T0 - 8 * DAY, { origin: LINK('https://1drv.ms/x/other') as SourceFacts['origin'], look: { snap: snap({ total: -100 }) } });
    const out = filesKnown([newer, older, other], line);
    expect(out[0]).toContain('−£60,000');
    expect(out[1]).toBe('“File o” [source o] (earlier)');
    expect(out[2]).toContain(`${IT_SAYS}: “Variance £” comes to −£100`);
    /* in the turn's context the earlier reading is one short line, saying what it is */
    expect(filesKnown([newer, older], (s, o) => sourceSaid(s, undefined, o))[1]).toBe('“File o” — an earlier reading of the same file, came in 14 Nov; kept as it was read [source o]');
  });

  it('what CHANGED since the reading before is said under what the file says now — the look’s own words, kept on its record', () => {
    const o = LINK('https://1drv.ms/x/abc');
    const since = ['Since “Shift report.xlsx”, read on 14 November: 31 rows more on “Shift report” (270 then, 301 now).', 'September is whole now: −£22,104 (−£14,909 over 14 days then).'];
    const newer = file('n', T0, { name: 'Shift report', origin: o as SourceFacts['origin'], look: { snap: snap({ total: -72472, rows: 301 }), since, comparedWith: { name: 'Shift report.xlsx', at: T0 - 7 * DAY } } });
    expect(changedOf(newer)).toEqual({ at: T0 - 7 * DAY, name: 'Shift report.xlsx', paragraphs: since });
    const out = filesKnown([newer], line);
    /* …with the day the newer version came in: news has a date */
    expect(out[0]).toBe(`“Shift report” [source n]\n    ${IT_SAYS}: ${saysOf(newer)}\n    ${CHANGED} (this version came in 21 Nov): ${since.join(' ')}`);
    /* …and Show me writes it into the conversation: that it changed, what changed, what it says now */
    expect(changedSaid(newer)).toBe(`“Shift report” has changed since I read it on 14 Nov — I have read the new version.\n\n${since[0]}\n\n${since[1]}\n\nWhat it says now: ${saysOf(newer)}`);
    /* a file compared with nothing says nothing changed — and is not said to be the same */
    const alone = file('z', T0, { look: { snap: snap() } });
    expect(changedOf(alone)).toBeUndefined();
    expect(filesKnown([alone], line)[0]).not.toContain(CHANGED);
    /* …and no reason is given that the app does not know: only that the two are not compared */
    expect(changedSaid(alone)).toMatch(/^“File z” has changed — I have read the new version\. It is not compared with the version before\.\n\nWhat it says now: /);
    /* a long account of what changed is cut at a word, never mid-figure */
    const long = file('l', T0, { look: { snap: snap(), since: [Array.from({ length: 80 }, (_, i) => `Line ${i} moved by −£${(i + 1) * 1000}`).join('; ')], comparedWith: { name: 'x', at: T0 - DAY } } });
    const said = filesKnown([long], line)[0].split(`${CHANGED} (this version came in 21 Nov): `)[1];
    expect(said.length).toBeLessThanOrEqual(KNOWS.changed);
    expect(said).toMatch(/[\d,]…$|\w…$/);
  });

  it('what changed is NEWS, and news goes stale: said for a week after the newer version came in, then only what the file says (22 November)', () => {
    const o = LINK('https://1drv.ms/x/abc');
    const newer = file('n', T0, { origin: o as SourceFacts['origin'], look: { snap: snap(), since: ['Since “x”: 31 rows more.'], comparedWith: { name: 'x', at: T0 - 7 * DAY } } });
    const within = filesKnown([newer], line, undefined, { now: T0 + 7 * DAY });
    expect(within[0]).toContain(`${CHANGED} (this version came in 21 Nov): Since “x”: 31 rows more.`);
    const after = filesKnown([newer], line, undefined, { now: T0 + 7 * DAY + 1 });
    expect(after[0]).not.toContain(CHANGED);
    expect(after[0]).toContain(`${IT_SAYS}: `);
    /* what changed is still on the record — Show me, and "what changed?" a month on, read it from there */
    expect(changedOf(newer)?.paragraphs).toEqual(['Since “x”: 31 rows more.']);
  });

  it('while her note of it is still up on this device, the line says the person has not been shown it — her one cue to say it unasked', () => {
    const o = LINK('https://1drv.ms/x/abc');
    const newer = file('n', T0, { origin: o as SourceFacts['origin'], look: { snap: snap(), since: ['Since “x”: 31 rows more.'], comparedWith: { name: 'x', at: T0 - DAY } } });
    expect(filesKnown([newer], line, undefined, { now: T0, unseen: new Set(['n']) })[0]).toContain(`${CHANGED} (this version came in 21 Nov — ${NOT_SHOWN}): `);
    expect(filesKnown([newer], line, undefined, { now: T0, unseen: new Set(['other']) })[0]).toContain(`${CHANGED} (this version came in 21 Nov): `);
    expect(filesKnown([newer], line, undefined, { now: T0 })[0]).not.toContain(NOT_SHOWN);
  });

  it('thirteen readings of one daily report do not crowd out the customer’s other files: files are counted, never readings (22 November)', () => {
    const o = LINK('https://1drv.ms/x/daily');
    const daily = Array.from({ length: 13 }, (_, i) => file(`d${i}`, T0 - i * DAY, { name: 'Shift report', origin: { ...o, hash: `h${i}` } as SourceFacts['origin'], look: { snap: snap({ total: -1000 - i }) } }));
    const master = file('pm', T0 - 30 * DAY, { name: 'Product master', look: { snap: snap({ sheet: 'Products', headline: 'Rate', total: 4200 }) } });
    /* as the turn's context does it (turnRules conversationFocus) */
    const out = filesKnown(newestFiles([...daily, master]), (s, x) => sourceSaid(s, undefined, x));
    expect(out).toHaveLength(3);
    expect(out[0]).toContain(`${IT_SAYS}: “Variance £” comes to −£1,000`);
    expect(out.filter(l => l.includes('an earlier reading of the same file'))).toHaveLength(1);
    expect(out[1]).toContain('[source d1]');
    expect(out[2]).toMatch(/^“Product master” .*\n {4}It says: “Rate” comes to /s);
    /* the way it was: the newest twelve RECORDS — twelve readings of one file, and no Product master */
    const was = filesKnown([...daily, master].slice(0, 12), (s, x) => sourceSaid(s, undefined, x));
    expect(was.some(l => l.includes('Product master'))).toBe(false);
  });

  it('two uploads are two files, each said — nothing links them', () => {
    const out = filesKnown([file('a', T0, { look: { snap: snap() } }), file('b', T0 - DAY, { look: { snap: snap() } })], line);
    expect(out.filter(l => l.includes(`${IT_SAYS}:`))).toHaveLength(2);
  });

  it('only the newest few are said with what they say; the rest are still listed', () => {
    const list = Array.from({ length: 9 }, (_, i) => file(`f${i}`, T0 - i * DAY, { look: { snap: snap() } }));
    const out = filesKnown(list, line);
    expect(out).toHaveLength(9);
    expect(out.filter(l => l.includes(`${IT_SAYS}:`))).toHaveLength(KNOWS.most);
    expect(out.slice(KNOWS.most).every(l => !l.includes(IT_SAYS))).toBe(true);
    /* a file with nothing to say does not use up a place */
    const mixed = [file('doc', T0 + DAY, { kind: 'document' }), ...list];
    expect(filesKnown(mixed, line).filter(l => l.includes(`${IT_SAYS}:`))).toHaveLength(KNOWS.most);
  });

  it('the turn’s context says how the headline is to be used — only when one is there', () => {
    const s = file('a', T0, { look: { snap: snap() } });
    const withSays = focusText([], { files: filesKnown([s], x => sourceSaid(x)) });
    expect(withSays).toMatch(/Files in the register \(ask with query_data by their source id; resolve_source when the person names one; “It says” under a file is its headline, worked by the app when it was read — a question it answers is answered from it, with no step\):/);
    expect(withSays).toContain(`[source a]\n    ${IT_SAYS}: “Variance £” comes to −£50,368`);
    const changed = focusText([], { files: filesKnown([file('c', T0, { look: { snap: snap(), since: ['Since “x”: 31 rows more.'], comparedWith: { name: 'x', at: T0 - DAY } } })], x => sourceSaid(x)) });
    expect(changed).toMatch(/with no step; “Changed since it was read before” is what moved between its last two readings, with the day the newer one came in\):/);
    const without = focusText([], { files: filesKnown([file('d', T0, { kind: 'document' })], x => sourceSaid(x)) });
    expect(without).toMatch(/Files in the register \(ask with query_data by their source id; resolve_source when the person names one\):/);
    expect(without).not.toContain(IT_SAYS);
  });

  it('a figure quoted from the headline is the app’s own — checked and not marked; one that is not there is marked', () => {
    const focus = focusText([], { files: filesKnown([file('a', T0, { look: { snap: snap() } })], x => sourceSaid(x)) });
    const right = checkFigures('The shift report’s headline: the variance comes to −£50,368, and Line 3 carries −£26,692 of it.', [], ['What is the variance?', focus]);
    expect(right.checked).toBe(2);
    expect(right.unsure).toEqual([]);
    const wrong = checkFigures('Line 3 carries −£31,400 of it.', [], ['What is the variance?', focus]);
    expect(wrong.unsure).toEqual(['31,400']);
  });
});
