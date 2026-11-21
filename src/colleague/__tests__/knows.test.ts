/* WHAT LUNA ALREADY KNOWS OF THE FILES IN HAND (colleague/knows, 21 November 2026 — docs/LUNA-AGENT.md G3). */
import { describe, expect, it } from 'vitest';
import { KNOWS, filesKnown, saysOf } from '../knows';
import { IT_SAYS, focusText } from '../conversation';
import { checkFigures } from '../figureCheck';
import { sourceSaid, type Source, type SourceFacts } from '../../lib/data/sources';
import type { LookSnap } from '../../lib/workbook/sinceLast';

const DAY = 86_400_000;
const T0 = Date.UTC(2026, 10, 21, 9);

const snap = (o: Partial<LookSnap> = {}): LookSnap => ({
  at: T0, name: 'Shift report.xlsx', fileId: 'wb1', sheet: 'Shift report', rows: 270, headings: ['Date', 'Line', 'Variance £'], headline: 'Variance £', total: -50368.5, kind: 'outcome',
  months: [{ key: '2026-08', label: 'August 2026', days: 31, part: false, value: -35459.76 }],
  splits: [{ dim: 'Line', groups: [{ key: 'Line 3', value: -26691.84 }, { key: 'Line 1', value: -15091.02 }, { key: 'Line 2', value: -8585.64 }] }],
  ...o,
});
const file = (id: string, at: number, f: Partial<SourceFacts> = {}): Source => ({
  id, at,
  facts: { name: `File ${id}`, named: 'file', fileName: `${id}.xlsx`, kind: 'workbook', bytes: 1000, at, fileId: `wb-${id}`, status: 'ready', client: 'Branston', ...f },
});
const line = (s: Source) => `“${s.facts.name}” [source ${s.id}]`;
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

  it('the newest reading speaks for a linked file: an older version of the same link is listed, never said twice', () => {
    const o = LINK('https://1drv.ms/x/abc');
    const newer = file('n', T0, { origin: o as SourceFacts['origin'], look: { snap: snap({ total: -60000 }) } });
    const older = file('o', T0 - 7 * DAY, { origin: o as SourceFacts['origin'], look: { snap: snap({ total: -50368.5 }) } });
    const other = file('x', T0 - 8 * DAY, { origin: LINK('https://1drv.ms/x/other') as SourceFacts['origin'], look: { snap: snap({ total: -100 }) } });
    const out = filesKnown([newer, older, other], line);
    expect(out[0]).toContain('−£60,000');
    expect(out[1]).toBe('“File o” [source o]');
    expect(out[2]).toContain(`${IT_SAYS}: “Variance £” comes to −£100`);
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
