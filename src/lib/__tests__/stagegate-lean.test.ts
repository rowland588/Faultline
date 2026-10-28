/* A STAGE-GATE JOB'S TILES AND CLOSING LINE (lib/stageGateLean,
 * docs/LEAN-PAGE.md slice 3) — the counts the front page, the one-page
 * status and the full report all say — and the money: what a day of the
 * job's lines not making costs (lib/lineLoss lineDay), worked by hand.
 *
 *   Line 7: 70 packs a minute; Early 06:00–14:00 and Late 14:00–22:00, 30 min
 *   of breaks each → (480 − 30) × 2 = 900 minutes → 63,000 packs a day; at
 *   5p margin a pack, £3,150 a day. Eight days slipped → £25,200. */
import { describe, expect, it } from 'vitest';
import { stageGateClosing, stageGateTiles } from '../stageGateLean';
import { lineDay, linesDay } from '../lineLoss';

const line7 = { name: 'Line 7', packsPerMin: 70, marginPerPack: 0.05,
  shifts: [{ name: 'Early', start: '06:00', end: '14:00', breakMin: 30 }, { name: 'Late', start: '14:00', end: '22:00', breakMin: 30 }] };
const base = { outstanding: 0, late: 0, critical: 0, risks: 0, fixesOpen: 0, fixesLate: 0 };

describe('a day of a line not making', () => {
  it('its speed × its shifts less their breaks, in margin', () => {
    expect(lineDay(line7)).toEqual({ line: 'Line 7', minutes: 900, packs: 63000, margin: 3150, missing: [] });
  });
  it('what nobody has said is named, never guessed — and relief keeps the breaks running', () => {
    expect(lineDay({ name: 'Line 3' })).toEqual({ line: 'Line 3', missing: ['its speed', 'its shifts', 'its margin a pack'] });
    expect(lineDay({ name: 'Line 4', packsPerMin: 10, shifts: [{ name: 'Days', start: '06:00', end: '18:00', breakMin: 45, relief: true }] }))
      .toEqual({ line: 'Line 4', minutes: 720, packs: 7200, missing: ['its margin a pack'] });
  });
  it('a job’s lines: the ones that can be priced added up, the rest named with what each needs', () => {
    expect(linesDay([line7, { name: 'Line 3', packsPerMin: 40 }])).toEqual({ lines: ['Line 7', 'Line 3'], priced: ['Line 7'], margin: 3150, missing: ['Line 3: its shifts and its margin a pack'] });
  });
});

describe('a stage-gate job’s tiles', () => {
  it('nine days to a handover on 26 Oct, 2 late of 14 to do, a critical and a high risk, 5 fixes open with 1 late, on time — what a day late would cost', () => {
    const t = stageGateTiles({ daysToGo: 9, outstanding: 14, late: 2, handoverOn: '2026-10-26', critical: 1, risks: 1, fixesOpen: 5, fixesLate: 1, slipDays: 0, day: linesDay([line7]) });
    expect(t.map(x => [x.k, x.v, x.of, x.tone])).toEqual([
      ['Handover', '9', 'days to handover · 26 Oct', undefined],
      ['Late', '2', 'of 14 still to do — past their day', 'r'],
      ['Critical', '1', '1 high risk as well', 'r'],
      ['Fixes open', '5', '1 late', 'r'],
      ['A day late', '£3.2k', 'would cost a day of Line 7 not making, in margin', undefined],
    ]);
  });
  it('slipped eight days: the slip costs eight days of the line not making, in red', () => {
    expect(stageGateTiles({ ...base, daysToGo: 20, outstanding: 3, slipDays: 8, day: linesDay([line7]) })[4])
      .toEqual({ k: 'The slip costs', v: '£25.2k', of: '8 days × £3.2k — a day of Line 7 not making, in margin', tone: 'r' });
  });
  it('past its expected handover with no agreed day apart: every day since is the slip (walkthrough, 25 October)', () => {
    expect(stageGateTiles({ ...base, daysToGo: -16, outstanding: 13, day: linesDay([line7]) })[4])
      .toEqual({ k: 'The slip costs', v: '£50.4k', of: '16 days × £3.2k — a day of Line 7 not making, in margin', tone: 'r' });
    expect(stageGateTiles({ ...base, daysToGo: -2, slipDays: 3, day: linesDay([line7]) })[4].of).toBe('5 days × £3.2k — a day of Line 7 not making, in margin');
  });
  it('the register\'s problems for the job count on the Critical tile — never "none open" over five open (walkthrough, 25 October)', () => {
    expect(stageGateTiles({ ...base, assigned: { open: 5, critical: 0 } })[2]).toEqual({ k: 'Critical', v: '0', of: '5 more problems open for it', tone: 'a' });
    expect(stageGateTiles({ ...base, critical: 1, risks: 2, assigned: { open: 3, critical: 1 } })[2]).toEqual({ k: 'Critical', v: '2', of: '2 high risks as well · 2 more problems open for it', tone: 'r' });
    expect(stageGateTiles({ ...base, assigned: { open: 1, critical: 1 } })[2]).toEqual({ k: 'Critical', v: '1', of: 'problems that stop the project', tone: 'r' });
    expect(stageGateTiles({ ...base, assigned: { open: 0, critical: 0 } })[2]).toEqual({ k: 'Critical', v: '0', of: 'none open' });
  });
  it('the money asks for what it needs: no line on the job, or a line with nothing said', () => {
    expect(stageGateTiles({ ...base, day: linesDay([]) })[4]).toEqual({ k: 'A day late', v: '—', of: 'no line from the Factory on the project yet' });
    expect(stageGateTiles({ ...base, day: linesDay([{ name: 'Line 3', packsPerMin: 40 }]) })[4]).toEqual({ k: 'A day late', v: '—', of: 'give Line 3: its shifts and its margin a pack on the Factory’s Lines page' });
    expect(stageGateTiles({ ...base, day: linesDay([{ name: 'Line 3', packsPerMin: 40 }]) }, 'now')).toHaveLength(4);
  });
  it('past the handover in red; handed over three days late in red, a day early in green; nothing late of what is to do grey; nothing to do in green', () => {
    expect(stageGateTiles({ ...base, daysToGo: -3, outstanding: 2 })[0]).toEqual({ k: 'Handover', v: '3', of: 'days past handover', tone: 'r' });
    expect(stageGateTiles({ ...base, daysToGo: -3, outstanding: 2 })[1]).toEqual({ k: 'Late', v: '0', of: 'of 2 still to do, none past its day', tone: 'n' });
    const late = stageGateTiles({ ...base, handedOver: true, handedVs: 3, day: linesDay([line7]) });
    expect([late[0], late[4].k, late[4].v]).toEqual([{ k: 'Handed over', v: '3', of: 'days late', tone: 'r' }, 'The late handover cost', '£9.5k']);
    const early = stageGateTiles({ ...base, handedOver: true, handedVs: -1, risks: 2 });
    expect([early[0].of, early[0].tone, early[1], early[2]]).toEqual(['day early', 'g', { k: 'Late', v: '0', of: 'nothing left to do', tone: 'g' }, { k: 'Critical', v: '0', of: '2 high risks as well', tone: 'a' }]);
    expect(stageGateTiles(base)[0]).toEqual({ k: 'Handover', v: '—', of: 'no handover date agreed yet' });
  });
  it('the closing line is the verdict and its one-line why, in its colour — and the slip in money when it has one', () => {
    expect(stageGateClosing({ tone: 'behind', word: 'Behind target', reason: 'long', brief: 'Handover 26 Oct · 2 late' })).toEqual({ text: 'Behind target — Handover 26 Oct · 2 late.', tone: 'r' });
    expect(stageGateClosing({ tone: 'on', word: 'On target', reason: 'Handover 26 Oct, the day agreed' })).toEqual({ text: 'On target — Handover 26 Oct, the day agreed.', tone: 'g' });
    expect(stageGateClosing({ tone: 'behind', word: 'Behind target', reason: 'Handover 3 Nov, 8 days after the agreed 26 Oct' }, { ...base, slipDays: 8, day: linesDay([line7]) }).text)
      .toBe('Behind target — Handover 3 Nov, 8 days after the agreed 26 Oct — £25.2k of margin, 8 days of Line 7 not making.');
    expect(stageGateClosing({ tone: 'behind', word: 'Behind target', reason: '2 late', brief: 'Handover 26 Oct' }, { ...base, slipDays: 8, day: linesDay([line7]) }, { brief: true }).text)
      .toMatch(/^Handover 26 Oct — £25\.2k of margin/);
  });
});
