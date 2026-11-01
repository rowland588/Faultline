/* FC-132 the process FMEA — the rule against a second implementation (scripts/knowledge/cases-m6-analysis.py, written with explicit conditions, not tables),
 * its properties (severity first, never the product of the ratings, monotone), and the register's words. */
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { actionPriority, controlStrength, fmeaAnalyse, priorityWhy, readRow, rankRows, severityBand, RULE_LINES, SEVERITY, OCCURRENCE, DETECTION, type FmeaOut } from '../fmea';
import fmea from '../../scored/defs/fmea';
import type { ScoredRow } from '../../../lib/study';

const TODAY = '2026-11-01';
const row = (id: string, name: string, s?: number, o?: number, d?: number, extra: Partial<NonNullable<ScoredRow['fmea']>> = {}): ScoredRow => ({ id, name, fmea: { s, o, d, ...extra } });
const out = (rows: ScoredRow[], today = TODAY): FmeaOut => { const r = fmeaAnalyse({ rows, today }); if ('problems' in r) throw new Error(r.problems.join(' ')); return r; };

describe('the action priority — Faultline’s own rule', () => {
  it('all 1,000 combinations equal the second implementation’s (count and hash), and the counts are H 244 · M 249 · L 507', () => {
    let cells = '';
    for (let s = 1; s <= 10; s++) for (let o = 1; o <= 10; o++) for (let d = 1; d <= 10; d++) cells += actionPriority(s, o, d);
    expect(createHash('sha256').update(cells).digest('hex').slice(0, 16)).toBe('49929e6a9c63d98c');
    expect([...cells].filter(c => c === 'H').length).toBe(244); expect([...cells].filter(c => c === 'M').length).toBe(249); expect([...cells].filter(c => c === 'L').length).toBe(507);
  });
  it('severity first: a critical effect is never Low, a minor one never above Low', () => {
    for (let o = 1; o <= 10; o++) for (let d = 1; d <= 10; d++) { expect(actionPriority(10, o, d)).not.toBe('L'); expect(actionPriority(9, o, d)).not.toBe('L'); expect(actionPriority(3, o, d)).toBe('L'); expect(actionPriority(1, o, d)).toBe('L'); }
    expect(actionPriority(10, 1, 1)).toBe('M'); expect(actionPriority(9, 8, 1)).toBe('H');
  });
  it('is monotone: raising severity, occurrence or detection never lowers the priority', () => {
    const rank = { L: 0, M: 1, H: 2 } as const;
    for (let s = 1; s <= 10; s++) for (let o = 1; o <= 10; o++) for (let d = 1; d <= 10; d++) {
      const a = rank[actionPriority(s, o, d)];
      if (s < 10) expect(rank[actionPriority(s + 1, o, d)]).toBeGreaterThanOrEqual(a);
      if (o < 10) expect(rank[actionPriority(s, o + 1, d)]).toBeGreaterThanOrEqual(a);
      if (d < 10) expect(rank[actionPriority(s, o, d + 1)]).toBeGreaterThanOrEqual(a);
    }
  });
  it('is not the product: the cosmetic S3 · O9 · D8 (216) is Low while the leaker S9 · O3 · D4 (108) and the reel S8 · O2 · D9 (144) are Medium', () => {
    expect([actionPriority(3, 9, 8), actionPriority(9, 3, 4), actionPriority(8, 2, 9)]).toEqual(['L', 'M', 'M']);
  });
  it('bands and strengths as the rule says', () => {
    expect([10, 9, 8, 7, 6, 4, 3, 1].map(severityBand)).toEqual(['critical', 'critical', 'major', 'major', 'moderate', 'moderate', 'minor', 'minor']);
    expect(controlStrength(8, 1)).toBe('weak'); expect(controlStrength(7, 3)).toBe('moderate'); expect(controlStrength(7, 4)).toBe('weak'); expect(controlStrength(3, 6)).toBe('strong'); expect(controlStrength(3, 7)).toBe('moderate');
    expect(controlStrength(5, 3)).toBe('strong'); expect(controlStrength(5, 5)).toBe('moderate'); expect(controlStrength(5, 9)).toBe('weak');
    expect(priorityWhy(7, 5, 7)).toBe('a major effect (7–8) with weak controls (occurrence 5, detection 7) → High');
  });
  it('has an anchor for every rating of the three scales, and its rule written in words', () => {
    for (const sc of [SEVERITY, OCCURRENCE, DETECTION]) expect(Object.keys(sc).map(Number).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(RULE_LINES).toHaveLength(4); expect(RULE_LINES.join(' ')).toMatch(/not the handbook’s table, which is not reproduced/);
  });
});

describe('the worked example — seven failure modes', () => {
  const ex = fmea.examples[0], o = out(ex.rows);
  it('is ranked by priority then severity — the date code first, the smudge last — with H 1 · M 4 · L 2', () => {
    expect(o.ranked.map(r => r.name)).toEqual(ex.expect.order); expect(o.ranked.map(r => r.class)).toEqual(['H', 'M', 'M', 'M', 'M', 'L', 'L']);
    expect(o.result.verdict).toBe('1 High');
    expect(o.result.tiles.map(t => [t.k, t.v])).toEqual([['Failure modes', '7'], ['High', '1'], ['Medium', '4'], ['Low', '2'], ['Need an action', '5']]);
  });
  it('says it: the High mode first, and the High or Medium rows with no action', () => {
    expect(o.result.sentence).toBe('7 failure modes rated: 1 High, 4 Medium, 2 Low. High first: Wrong date code (S 7 · O 5 · D 7) — no action yet. 5 High or Medium modes still have neither an action nor a written reason.');
  });
  it('the closing line, the table and the money it names missing', () => {
    expect(o.result.closing).toMatch(/^1 High — 7 failure modes rated, 5 still to act on\.$/);
    expect(o.table.rows).toHaveLength(7); expect(o.table.rows[0].slice(1, 2)).toEqual(['Coding · Wrong date code']);
    expect(o.result.money?.join(' ')).toMatch(/Give what one occurrence costs on the High mode/);
    expect(o.result.caveats.join(' ')).toMatch(/not the AIAG-VDA handbook’s table/); expect(o.result.caveats.join(' ')).toMatch(/1 row is ticked as a food-safety hazard/);
    expect(o.result.caveats.join(' ')).toMatch(/3 modes rated 8 or more for severity belong on the control plan/);
  });
});

describe('actions, reasons, lateness and the re-rating', () => {
  const hi = (extra: Partial<NonNullable<ScoredRow['fmea']>>) => out([row('a', 'Wrong reel', 8, 7, 9, extra), row('b', 'Smudge', 3, 9, 8)]);
  it('an action with its owner and day answers a High mode; a written reason does too; neither leaves it needing one', () => {
    expect(hi({ action: 'Barcode scan at loading', owner: 'Dave', due: '2026-11-20' }).result.sentence).toMatch(/Wrong reel \(S 8 · O 7 · D 9\): Barcode scan at loading, Dave by 20 Nov\./);
    expect(hi({ reason: 'Reels are kept apart and checked by the lead' }).result.sentence).toMatch(/— controls accepted, reason written/);
    expect(hi({}).result.tiles[4]).toMatchObject({ k: 'Need an action', v: '1' });
    expect(hi({ action: 'x' }).result.tiles[4].v).toBe('0');
  });
  it('an action past its day and not done is late — red; done, it is not', () => {
    const late = hi({ action: 'Scan', due: '2026-10-20' });
    expect(late.result.tone).toBe('r'); expect(late.result.sentence).toMatch(/1 action is late\./); expect(late.result.closing).toMatch(/1 late\./); expect(late.table.rows[0][8]).toMatch(/LATE$/);
    const done = hi({ action: 'Scan', due: '2026-10-20', done: '2026-10-25' });
    expect(done.result.tone).not.toBe('r'); expect(done.table.rows[0][8]).toMatch(/done 25 Oct$/);
  });
  it('re-rated after the action is done: S 8 · O 7 · D 9 High becomes S 8 · O 2 · D 2 Low', () => {
    const r = readRow(row('a', 'Wrong reel', 8, 7, 9, { action: 'Scan', due: '2026-10-20', done: '2026-10-25', after: { o: 2, d: 2 } }), 1, TODAY);
    expect(r.ap).toBe('H'); expect(r.afterAp).toBe('L'); expect(hi({ action: 'Scan', done: '2026-10-25', after: { o: 2, d: 2 } }).table.rows[0][8]).toMatch(/done 25 Oct, now Low$/);
    expect(readRow(row('a', 'Wrong reel', 8, 7, 9, { after: { o: 2, d: 2 } }), 1, TODAY).afterAp).toBeUndefined(); // a rating before the action is done is a prediction, not a result
  });
  it('a priority set by hand from the handbook replaces the rule’s and is marked', () => {
    const o2 = out([row('a', 'Wrong reel', 8, 2, 2, { ap: 'H' })]);
    expect(o2.ranked[0].class).toBe('H'); expect(o2.table.rows[0][7]).toBe('High (handbook)'); expect(o2.result.caveats[0]).toMatch(/1 row was set by hand from the handbook/);
    expect(readRow(row('a', 'x', 8, 2, 2, { ap: 'H' }), 1, TODAY).rule).toBe('L');
  });
  it('a cost per occurrence is said beside the priority, never in the ranking', () => {
    const o2 = out([row('a', 'Wrong reel', 8, 7, 9, { cost: 420 }), row('b', 'Leaker', 9, 8, 5, { cost: 15 })]);
    expect(o2.result.money?.[0]).toBe('Where a cost is known, one occurrence costs: Leaker £15; Wrong reel £420 — said beside the priority, never used to rank it.');
    expect(o2.ranked.map(r => r.name)).toEqual(['Leaker', 'Wrong reel']); // by severity, not by cost
  });
});

describe('what is refused and what is left out', () => {
  it('nothing rated: says what to rate', () => { expect(fmeaAnalyse({ rows: [row('a', 'x'), row('b', '', 5, 5, 5)], today: TODAY })).toEqual({ problems: ['Rate at least one failure mode — name it, then its severity, occurrence and detection, each 1 to 10.'] }); });
  it('a half-rated mode is counted as not rated yet, and not ranked', () => {
    const o = out([row('a', 'Leaker', 9, 3, 4), row('b', 'Half', 5, undefined, 4), row('c', 'Out of range', 11, 3, 4)]);
    expect(o.ranked.map(r => r.name)).toEqual(['Leaker']); expect(o.result.sentence).toMatch(/1 failure mode rated: 0 High, 1 Medium, 0 Low; 2 not rated yet\./);
  });
  it('rankRows orders by priority, severity, occurrence, detection — never by their product', () => {
    const reads = [row('1', 'A', 8, 3, 9), row('2', 'B', 8, 7, 9), row('3', 'C', 9, 8, 1)].map((r, i) => readRow(r, i + 1, TODAY));
    expect(rankRows(reads).map(r => r.mode)).toEqual(['C', 'B', 'A']);
  });
});
