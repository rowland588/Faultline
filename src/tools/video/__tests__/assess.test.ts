/* FROM THE OBJECTIVE TO WHAT MAY BE CLAIMED (docs/VIDEO-DESIGN.md) — the
 * study read from a person's words, the plan for filming it worked out from
 * its cycles, the footage's own quality tracked frame by frame and each event
 * flagged by it, the assessment check by check and measure by measure, and
 * the figures' precision: the 95% interval, the cycles needed and the ± on a
 * length. Every expectation is worked out by hand beside it. */
import { describe, expect, it } from 'vitest';
import { KINDS, OBJECTIVES, kindOfWords } from '../objectives';
import { capturePlan } from '../capture';
import { assessFootage, flagEvents, qualityOf, type AssessInput } from '../assess';
import { stats, stationFigures, videoFigures, findings } from '../study';
import { acceptAll } from '../review';
import { newJob } from '../job';
import { READING_VERSION, type ProcessingConfig, type ReadingQuality, type VideoEvent, type VideoSource } from '../record';
import type { SteadyMark } from '../steady';

const zones = [
  { id: 'z1', label: 'Workstation 1', track: 'Operator A', x0: 0, x1: 0.5, y0: 0, y1: 1 },
  { id: 'z2', label: 'Workstation 2', track: 'Operator B', x0: 0.5, x1: 1, y0: 0, y1: 1 },
];
const facts = { durationSec: 300, width: 1280, height: 720, fps: 30 };
const steadyQ: ReadingQuality = {
  version: 'quality-1', sampleSec: 0.2, windows: 150, shaking: 0, moved: 0, shakeMax: 0.03,
  shakingSpans: [], lightSpans: [], brightness: { mean: 120, min: 110, max: 130 },
};
const assess = (o: Partial<AssessInput> = {}) => assessFootage({ kind: 'balance', facts, zones, view: 'side-raised', quality: steadyQ, ...o });
const check = (a: ReturnType<typeof assessFootage>, id: string) => a.checks.find(c => c.id === id);

describe('the study a person asks for, in their words', () => {
  it('reads the kind from the words, a line balance winning over the flow words in it', () => {
    expect(kindOfWords('Analyse this video for line balance')).toBe('balance');
    expect(kindOfWords('the line balance of the product packing')).toBe('balance');
    expect(kindOfWords('How long is each press cycle?')).toBe('cycles');
    expect(kindOfWords('Time the format change on the filler')).toBe('changeover');
    expect(kindOfWords('A spaghetti diagram of the pickers walking')).toBe('movement');
    expect(kindOfWords('Where do the trays pile up before the wrapper?')).toBe('flow');
    expect(kindOfWords('When does the capper stop and for how long — downtime')).toBe('machine');
    expect(kindOfWords('The elements of the packer’s cycle: reach, grasp, place')).toBe('elements');
    expect(kindOfWords('Who is idle and when')).toBe('waiting');
    expect(kindOfWords('Have a look at this')).toBe('balance');
  });
  it('says for every study whether footage measures it, and a tool to use meanwhile when it does not', () => {
    for (const k of KINDS) {
      const o = OBJECTIVES[k];
      expect(o.never).toContain('handheld');
      if (o.readiness !== 'measured') expect(o.meanwhile?.path).toMatch(/^\//);
      /* a vision model never makes a time or a count */
      for (const m of o.measures) if (m.method === 'vision-label') expect(m.claim).toBe('interpreted');
    }
    expect(KINDS.filter(k => OBJECTIVES[k].readiness === 'measured')).toEqual(['balance', 'cycles']);
  });
});

describe('how to film it, before the phone is set up', () => {
  it('works the length out from the cycles needed and the cycle, a cycle either side', () => {
    /* (10 cycles + 2) × 30 s = 360 s → 6 minutes */
    const p = capturePlan('balance', { cycleSec: 30 });
    expect(p.length.sec).toBe(360);
    expect(p.length.says).toMatch(/^At least 6 minutes: 10 whole cycles of the slowest station at about 30 s each, and one either side/);
    expect(p.view.name).toBe('Side-on, raised');
    expect(p.never.join(' ')).toMatch(/In the hand — the picture moves with the hand/);
    expect(p.tooLong).toBeUndefined();
    /* (15 + 2) × 4.2 s = 71.4 s → rounded up to 90 s */
    expect(capturePlan('cycles', { cycleSec: 4.2 }).length).toMatchObject({ sec: 90 });
  });
  it('says when it is longer than one study takes, and splits a line too wide for one camera', () => {
    /* (10 + 2) × 120 s = 1,440 s, over the 20 minutes */
    const p = capturePlan('balance', { cycleSec: 120, stations: 8 });
    expect(p.length.sec).toBe(1440);
    expect(p.tooLong).toMatch(/longer than the 20 minutes one study takes today — film it in parts/);
    expect(p.framing.join(' ')).toMatch(/8 stations is more than one camera holds for this \(6\)/);
  });
  it('asks for the cycle when it is not known, films a changeover whole, and says what it will not measure', () => {
    expect(capturePlan('balance').length).toEqual({ says: expect.stringMatching(/say how long a cycle is and the minutes are worked out/) });
    const c = capturePlan('changeover');
    expect(c.length.says).toMatch(/^Film the whole changeover, from the last good piece before to the first good piece after/);
    expect(c.readiness).toBe('Not measured from footage yet');
    expect(c.meanwhile?.tool).toBe('SMED');
    expect(capturePlan('waiting').measures.find(m => m.what === 'Whether a gap is waiting, and for what')?.word).toBe('Interpreted — not measured');
    expect(capturePlan('balance').people.join(' ')).toMatch(/never names, and nobody is recognised/);
  });
});

describe('the footage’s own quality, tracked as it is read', () => {
  /* five a second: steady for 10 s, shaking for 4 s, steady, then knocked 3 px at 20 s */
  const marks: SteadyMark[] = [];
  const bright: number[] = [];
  const times: number[] = [];
  for (let i = 0; i <= 150; i++) {
    const t = Math.round(i * 0.2 * 1000) / 1000;
    times.push(t);
    const shaking = t >= 10 && t < 14;
    const dx = shaking ? (i % 2 ? 0.6 : -0.6) : t >= 20 ? 3 : 0;
    marks.push({ t, dx, dy: 0, light: 1 });
    bright.push(t >= 25 && t < 25.5 ? 160 : 120);   /* a lamp on for half a second at 25 s */
  }
  const q = qualityOf({ times, steady: marks, bright }, 0.2) as ReadingQuality;

  it('finds where the camera shook, where it moved and where the light jumped', () => {
    expect(q.shakingSpans).toEqual([[10, 14]]);
    expect(q.movedAt).toBe(20);
    expect(q.movedBy).toBeCloseTo(3, 1);
    /* 120 → 160 is a third brighter, and back half a second later: two jumps */
    expect(q.lightSpans).toEqual([[24.8, 25], [25.4, 25.6]]);
    expect(q.brightness.max).toBe(160);
    /* brightness begun part-way is the last frames read, never the first */
    const late = qualityOf({ times, steady: marks, bright: bright.slice(100) }, 0.2) as ReadingQuality;
    expect(late.lightSpans).toEqual([[24.8, 25], [25.4, 25.6]]);
  });
  it('flags each event by what the footage was doing while it happened, never deciding it', () => {
    const ev = (id: string, start: number, end: number): VideoEvent => ({ id, start, end, category: 'work', zone: 'z1', observed: 'movement', confidence: 0.8, frames: [], basis: 'motion', review: 'candidate', provenance: { provider: 'motion', version: READING_VERSION } });
    const out = flagEvents([ev('a', 2, 4), ev('b', 12, 13), ev('c', 21, 22), ev('d', 25.2, 26)], q);
    expect(out.map(e => e.flags ?? [])).toEqual([[], ['shaking'], ['moved'], ['moved', 'light']]);
    expect(out.every(e => e.review === 'candidate')).toBe(true);
  });
});

describe('is this footage fit for the study?', () => {
  it('says footage from a fixed, steady, well-lit camera suits a line balance', () => {
    const a = assess();
    expect(a.verdict).toBe('suitable');
    expect(a.headline).toBe('This footage suits line balance.');
    expect(check(a, 'steady')).toMatchObject({ status: 'ok', found: 'Steady over every frame read' });
    expect(check(a, 'size')).toMatchObject({ status: 'ok', found: '2 stations; the narrowest, Workstation 1, 640 pixels wide' });
    expect(a.verdicts.find(v => v.what === 'When work starts and stops at each station')?.word).toBe('Measured');
    expect(a.verdicts.find(v => v.what === 'Whether a gap is waiting')?.word).toBe('Interpreted — not measured');
  });
  it('refuses to time footage filmed in the hand, or from a camera that shook', () => {
    const h = assess({ view: 'handheld' });
    expect(h.verdict).toBe('unsuitable');
    expect(h.headline).toMatch(/^This footage cannot be timed for line balance: where the phone was — in the hand\.$/);
    expect(h.verdicts.find(v => v.what === 'When work starts and stops at each station')).toMatchObject({ claim: 'not-measurable', why: 'Not from this footage — where the phone was: in the hand (above).' });
    /* the interpretations stay what they are */
    expect(h.verdicts.find(v => v.what === 'What the work is')?.claim).toBe('interpreted');
    const s = assess({ quality: { ...steadyQ, shaking: 0.3, shakeMax: 0.9 } });
    expect(s.verdict).toBe('unsuitable');
    expect(s.headline).toBe('This footage cannot be timed for line balance: the camera — shook for 30% of the time.');
    expect(check(s, 'steady')?.found).toBe('Shook for 30% of the time over every frame read, up to 0.6% of the picture’s width between frames');
  });
  it('reads with limits: a little shake, a move, dark footage, a slow frame rate, a crowded picture', () => {
    expect(check(assess({ quality: { ...steadyQ, shaking: 0.05 } }), 'steady')?.status).toBe('caution');
    expect(check(assess({ quality: { ...steadyQ, movedAt: 62, movedBy: 2 } }), 'steady')?.found).toBe('Moved at 1:02.0, by 1.3% of the picture’s width');
    expect(check(assess({ quality: { ...steadyQ, brightness: { mean: 30, min: 20, max: 40 } } }), 'light')?.found).toBe('Dark — 30 of 255 on average');
    expect(check(assess({ facts: { ...facts, fps: 8 } }), 'fps')?.means).toBe('It wants at least 10: a boundary is known only to the nearest 0.13 s.');
    const ten = Array.from({ length: 10 }, (_, i) => ({ id: `z${i}`, label: `Station ${i + 1}`, track: `Operator ${i}`, x0: i / 10, x1: (i + 1) / 10, y0: 0, y1: 1 }));
    const crowded = assess({ zones: ten });
    expect(check(crowded, 'size')).toMatchObject({ status: 'caution', means: 'More than one camera holds for it (6) — film them in groups, each its own study.' });
    expect(crowded.verdict).toBe('limits');
    expect(crowded.verdicts[0].why).toMatch(/With care: each station in the picture — 10 stations/);
    const tiny = assess({ facts: { ...facts, width: 160 }, zones: ten });
    expect(check(tiny, 'size')?.status).toBe('fail');
    expect(tiny.verdict).toBe('unsuitable');
  });
  it('says it checked only a stretch until the footage is read', () => {
    const a = assess({ quality: undefined, scan: { version: 'scan-1', at: 1, frames: 57, brightness: { mean: 118, min: 100, max: 130 }, stretch: [75, 85], steady: { windows: 4, shaking: 0, moved: 0, shakeMax: 0.02 } } });
    expect(a.scope).toBe('a stretch');
    expect(check(a, 'steady')?.found).toBe('Steady over 10 s looked at as it came in (1:15.0–1:25.0)');
    expect(a.headline).toBe('This footage suits line balance. Checked on a stretch so far — every frame is checked as it is read.');
    expect(check(assess({ quality: undefined }), 'steady')?.status).toBe('unknown');
  });
  it('says a study footage cannot measure yet is not measured, and where to do it meanwhile', () => {
    const a = assess({ kind: 'changeover', view: 'high-corner' });
    expect(a.verdict).toBe('not-yet');
    expect(a.headline).toBe('Faultline cannot measure changeover (smed) from footage yet — keep the footage here, and use SMED meanwhile.');
    const m = assess({ kind: 'movement' });
    expect(check(m, 'view')).toMatchObject({ status: 'fail', found: 'Side-on, raised' });
  });
  it('checks the length from the cycle a person gave, then from the cycles found', () => {
    /* 300 s is short of (10 + 2) × 30 s = 360 s: 300 ÷ 30 = 10, less the one the ends cut — about 9 whole cycles */
    expect(check(assess({ cycleHintSec: 30 }), 'length')).toMatchObject({ status: 'caution', means: 'About 9 whole cycles — it needs 10: film longer.' });
    expect(check(assess({ cycleHintSec: 20 }), 'length')?.status).toBe('ok');
  });
});

describe('the figures, as precise as the footage lets them be', () => {
  const config: ProcessingConfig = { sampleSec: 0.2, readWidth: 160, zones, sensitivity: 4, joinGapSec: 0.5, minEventSec: 0.6, version: READING_VERSION };
  const work = (zone: string, starts: number[], lens: number[]): VideoEvent[] => starts.map((s, i) => ({
    id: `${zone}-${i}`, start: s, end: s + lens[i], category: 'work', zone, observed: 'movement', confidence: 0.8, frames: [], basis: 'motion', review: 'candidate', pm: 0.1, provenance: { provider: 'motion', version: READING_VERSION },
  }));
  /* station 1: ten pieces of work every 6 s, 3.0 ± a little; station 2 steady at 4.5 s */
  const l1 = [3.0, 3.2, 2.8, 3.1, 2.9, 3.0, 3.3, 2.7, 3.0, 3.0];
  const events = acceptAll([...work('z1', l1.map((_, i) => 1 + 6 * i), l1), ...work('z2', l1.map((_, i) => 2 + 6 * i), l1.map(() => 4.5))], { by: 'Rowland', at: 2 });
  const src: Pick<VideoSource, 'facts' | 'job' | 'demand'> = { facts: { fileName: 'l.mp4', mime: 'video/mp4', bytes: 1, durationSec: 64, width: 1280, height: 720, orientation: 'landscape' }, job: { ...newJob(config, 1), state: 'review' } };

  it('gives the mean its 95% interval by Student’s t', () => {
    const s = stats(l1)!;
    /* mean 3.0; squares 0.28 ÷ 9 → sd 0.176; t(9) 2.262 → ±0.126 */
    expect(s.mean).toBeCloseTo(3.0, 6);
    expect(s.sd).toBeCloseTo(0.1764, 3);
    expect(s.ci95).toBeCloseTo((2.262 * 0.1764) / Math.sqrt(10), 2);
    expect(stats([3, 3.2])?.ci95).toBeUndefined();
  });
  it('says the cycles needed for ±5%, the ± on a length, and the events the footage flags', () => {
    const f = stationFigures(zones[0], events, 'verified', 64, 0.2);
    expect(f.workTime?.n).toBe(10);
    /* (2.262 × 0.176 ÷ (5% of 3.0))² = 7.1 → 8 needed, and 10 filmed */
    expect(f.needed).toBe(8);
    expect(f.enough).toBe(true);
    /* each end ±0.1 s, so a length ±0.1 × √2 = 0.14 s */
    expect(f.pm).toBe(0.14);
    const noisy = [2, 4, 3, 5, 2.5, 4.5];
    const ev2 = acceptAll(work('z1', noisy.map((_, i) => 1 + 8 * i), noisy), { by: 'R', at: 1 });
    const g = stationFigures(zones[0], ev2, 'verified', 64, 0.2);
    expect(g.enough).toBe(false);
    expect(g.needed).toBeGreaterThan(6);
    const flagged = events.map((e, i) => (i === 0 ? { ...e, flags: ['shaking' as const] } : e));
    const all = videoFigures(src, flagged);
    expect(all.flagged).toBe(1);
    const said = findings(all).map(x => x.text);
    expect(said).toContain('1 of the counted events falls where the camera shook, moved or the light jumped — check it on the footage.');
    expect(said).toContain('Each end of a piece of work is known to ±0.10 s from the frames read, so a length to about ±0.14 s — the tenths printed here are no surer than that.');
    expect(said).toContain('A gap with no movement is not said to be waiting: it can be waiting, checking without moving, or the person out of view — mark it as waiting where you have seen it on the footage.');
  });
  it('says a station has too few cycles for ±5% in the assessment and in the findings', () => {
    const noisy = [2, 4, 3, 5, 2.5, 4.5];
    const ev = acceptAll(work('z1', noisy.map((_, i) => 1 + 8 * i), noisy), { by: 'R', at: 1 });
    const f = videoFigures(src, ev);
    const g = f.stations[0];
    expect(findings(f).some(x => x.text.startsWith(`Workstation 1: 6 cycles know its work a cycle to within`) && x.text.includes(`${g.needed} are needed for ±5%`))).toBe(true);
    const a = assessFootage({ kind: 'balance', facts, zones, view: 'side-raised', quality: steadyQ, figures: f, events: ev, read: true });
    expect(check(a, 'length')?.found).toMatch(/^Workstation 1: 6 whole cycles of \d+ needed$/);
    expect(check(a, 'seen')).toMatchObject({ status: 'caution', found: 'None found at Workstation 2' });
    expect(check(a, 'review')).toMatchObject({ status: 'ok', found: '6 of 6 confirmed' });
  });
});
