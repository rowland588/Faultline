/* THE VIDEO STUDY'S CORE, PROVED ON KNOWN TIMES (docs/VIDEO.md) — the
 * footage checked from its facts, the movement reading on signals whose busy
 * stretches are known, the figures worked out by hand beside each number,
 * a person's corrections keeping what was proposed, the job's lifecycle, the
 * evaluation, and the questions answered from the figures. */
import { describe, expect, it } from 'vitest';
import { checkConfig, checkEvent, checkFootage, keepValid } from '../validate';
import { busyIntervals, detectEvents, levels, sampleInterval, type Signal } from '../detect';
import { clock, findings, standing, stationFigures, stepsFromEvents, taktOf, videoFigures } from '../study';
import { acceptAll, byHand, decide, merge, reclassify, setBoundary, split } from '../review';
import { canMove, move, newJob, readingKey, stale } from '../job';
import { evaluate } from '../evaluate';
import { answer, questionsFor, readObjective } from '../ask';
import { READING_VERSION, type ProcessingConfig, type VideoEvent, type VideoSource } from '../record';

const zones = [
  { id: 'z1', label: 'Workstation 1', track: 'Operator A', x0: 0, x1: 0.5, y0: 0, y1: 1 },
  { id: 'z2', label: 'Workstation 2', track: 'Operator B', x0: 0.5, x1: 1, y0: 0, y1: 1 },
];
const config: ProcessingConfig = { sampleSec: 0.2, readWidth: 160, zones, sensitivity: 4, joinGapSec: 0.5, minEventSec: 0.6, version: READING_VERSION };

/* A known schedule: station 1 works 3 s every 6 s from 1 s; station 2 works 4.5 s every 6 s from 2 s. */
const truth = [
  ...[1, 7, 13, 19, 25].map(s => ({ zone: 'z1', start: s, end: s + 3 })),
  ...[2, 8, 14, 20, 26].map(s => ({ zone: 'z2', start: s, end: s + 4.5 })),
];
function signalOf(durationSec: number, noise = 0.003): Signal {
  const times: number[] = [];
  for (let t = 0; t <= durationSec + 1e-9; t += 0.2) times.push(Math.round(t * 1000) / 1000);
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  return {
    times,
    zones: ['z1', 'z2'].map(zone => ({ zone, values: times.map(t => (truth.some(x => x.zone === zone && t >= x.start && t <= x.end) ? 0.06 : 0.004) + rnd() * noise) })),
  };
}

describe('the footage, checked from its facts', () => {
  it('takes an MP4 of a sensible size and length', () => {
    expect(checkFootage({ mime: 'video/mp4', bytes: 20e6, durationSec: 30, width: 1920, height: 1080, fps: 30 })).toEqual([]);
  });
  it('refuses what is not a video by its bytes, an empty file, one too long, one with no picture', () => {
    const say = (f: Parameters<typeof checkFootage>[0]) => checkFootage(f).map(p => p.message).join(' | ');
    expect(say({ mime: 'application/pdf' })).toMatch(/not a video the app can read/);
    expect(say({ mime: undefined })).toMatch(/first bytes are not an MP4, MOV or WebM/);
    expect(say({ mime: 'video/mp4', bytes: 0 })).toMatch(/empty — the upload did not finish/);
    expect(say({ mime: 'video/webm', durationSec: 3600 })).toMatch(/runs 60 minutes; a study takes up to 20 minutes/);
    expect(say({ mime: 'video/mp4', durationSec: NaN })).toMatch(/length cannot be read/);
    expect(say({ mime: 'video/mp4', width: 0, height: 0 })).toMatch(/No picture can be read/);
  });
  it('checks the settings: a station inside the picture, not too many frames', () => {
    expect(checkConfig(config, 30)).toEqual([]);
    expect(checkConfig({ ...config, zones: [] }, 30).map(p => p.message)).toContain('Mark at least one station in view.');
    expect(checkConfig({ ...config, sampleSec: 0.01 }, 600).map(p => p.message)[0]).toMatch(/60000 frames; the most is 2400/);
    expect(checkConfig({ ...config, zones: [{ ...zones[0], x1: 1.4 }] }, 30)[0].message).toMatch(/not a rectangle inside the picture/);
  });
  it('reads a frame every tenth of a second on short footage, never more than the limit allows', () => {
    expect(sampleInterval(30, 30, 2400)).toBe(0.1);
    expect(sampleInterval(240, 25, 2400)).toBe(0.2);
    expect(sampleInterval(1200, 30, 2400)).toBe(0.5);
  });
});

describe('work found by movement, on a signal whose busy times are known', () => {
  const sig = signalOf(30);
  const found = detectEvents(sig, config, { key: 'k1' });

  it('finds the quiet and the busy level of a station, and where between them work begins', () => {
    const l = levels(sig.zones[0].values);
    expect(l.quiet).toBeLessThan(0.01);
    expect(l.busy).toBeGreaterThan(0.05);
    expect(l.contrast).toBeGreaterThan(4);
  });
  it('finds every piece of work, its boundaries within half a frame interval of the truth', () => {
    const e = evaluate(truth, found);
    expect(e).toMatchObject({ truth: 10, detected: 10, matched: 10, duplicates: 0, missed: 0, precision: 1, recall: 1 });
    expect(e.startErr).toBeLessThanOrEqual(0.15);
    expect(e.endErr).toBeLessThanOrEqual(0.15);
    for (const s of e.stations) expect(Math.abs(s.cycleErr ?? 9)).toBeLessThan(0.05);
  });
  it('says every one is a candidate from movement, with its frames, its station and who works there', () => {
    expect(found.every(x => x.review === 'candidate' && x.basis === 'motion' && x.category === 'work')).toBe(true);
    expect(found[0]).toMatchObject({ zone: 'z1', track: 'Operator A', observed: 'Movement at Workstation 1', provenance: { provider: 'motion', version: READING_VERSION, key: 'k1' } });
    expect(found[0].frames).toHaveLength(3);
    expect(found.every(x => checkEvent(x, { durationSec: 30, zones }).length === 0)).toBe(true);
  });
  it('finds nothing in a station that never moves — no invented work', () => {
    const still: Signal = { times: sig.times, zones: [{ zone: 'z1', values: sig.times.map((_, i) => 0.004 + (i % 3) * 0.0005) }] };
    expect(detectEvents(still, config)).toEqual([]);
  });
  it('joins a flicker inside one piece of work and drops a blip', () => {
    const times = Array.from({ length: 60 }, (_, i) => i * 0.2);
    const values = times.map(t => ((t >= 2 && t < 3.6) || (t >= 3.9 && t <= 5) ? 0.06 : t >= 8 && t <= 8.2 ? 0.06 : 0.004));
    const { intervals } = busyIntervals(times, values, config);
    expect(intervals).toHaveLength(1);
    expect(intervals[0].start).toBeCloseTo(1.9, 5);
    expect(intervals[0].end).toBeCloseTo(5.1, 5);
  });
});

const source = (over: Partial<VideoSource> = {}): Pick<VideoSource, 'facts' | 'job' | 'demand'> => ({
  facts: { fileName: 'line4.mp4', mime: 'video/mp4', bytes: 1, durationSec: 30, width: 1280, height: 720, orientation: 'landscape' },
  job: { ...newJob(config, 1), state: 'review' }, ...over,
});

describe('the study, worked out from the events a person accepted', () => {
  const sig = signalOf(30);
  const all = acceptAll(detectEvents(sig, config), { by: 'Rowland', at: 2 });

  it('times each station: its work, its cycle, its waiting — from whole cycles only', () => {
    const s1 = stationFigures(zones[0], all, 'verified', 30, 0.2);
    expect(s1.workTime?.n).toBe(5);
    expect(s1.workTime?.mean).toBeCloseTo(3.2, 1);      /* 3 s of work, read to the half-frame either side */
    expect(s1.cycleTime?.mean).toBeCloseTo(6, 1);
    expect(s1.waitTime?.mean).toBeCloseTo(2.8, 1);
    expect(s1.utilisation).toBeCloseTo(3.2 / 6, 1);
    expect(s1.long).toEqual([]);
  });
  it('the bottleneck, the rate, how evenly the work is spread — and takt only once the demand is given', () => {
    const f = videoFigures(source(), all);
    expect(f.bottleneck?.zone.id).toBe('z2');
    expect(f.ratePerMin).toBeCloseTo(10, 0);            /* one every 6 s */
    expect(f.efficiency).toBeCloseTo((3.2 + 4.6) / (2 * 4.6), 2);   /* station 2's last piece runs off the end of the footage: 4 whole cycles of 4.6 s */
    expect(f.takt).toBeUndefined();
    expect(f.missing[0]).toMatch(/^Takt: the demand/);
    /* 480 a shift in 40 minutes: 2,400 s ÷ 480 = 5 s a unit; Workstation 2's 4.6 s is within it */
    const g = videoFigures(source({ demand: { units: 480, unit: 'packs', availableMin: 40, per: 'shift' } }), all);
    expect(g.takt).toBe(5);
    expect(g.overTakt).toEqual([]);
    const h = videoFigures(source({ demand: { units: 600, unit: 'packs', availableMin: 40, per: 'shift' } }), all);
    expect(h.takt).toBe(4);
    expect(h.overTakt.map(o => o.station.zone.id)).toEqual(['z2']);
  });
  it('feeds the line balance its own way: each station an element, timed by the accepted events', () => {
    const steps = stepsFromEvents(zones, all, 'verified', 30, 0.2);
    expect(steps.map(s => `${s.name} · ${s.who} · ${s.kind}`)).toEqual(['Work at Workstation 1 · Operator A · work', 'Waiting at Workstation 1 · Operator A · wait', 'Work at Workstation 2 · Operator B · work', 'Waiting at Workstation 2 · Operator B · wait']);
    expect(steps[0].laps).toHaveLength(5);
    const f = videoFigures(source({ demand: { units: 480, unit: 'packs', availableMin: 40, per: 'shift' } }), all);
    expect(f.balance.people.map(p => p.who)).toEqual(['Operator A', 'Operator B']);
    expect(f.balance.taktSec).toBe(5);
  });
  it('counts nothing a person has not accepted — candidates are provisional, and said so', () => {
    const raw = detectEvents(sig, config);
    const v = videoFigures(source(), raw, 'verified');
    expect(v.stations.every(s => !s.workTime)).toBe(true);
    expect(standing(v)).toEqual({ text: '10 to review · 0 accepted', tone: 'a' });
    const p = videoFigures(source(), raw, 'provisional');
    expect(p.stations[0].workTime?.n).toBe(5);
    expect(findings(p).some(x => x.kind === 'unknown' && /10 events still to review — counted here as provisional/.test(x.text))).toBe(true);
    expect(standing(videoFigures(source(), all))).toEqual({ text: 'Verified — 10 events accepted', tone: 'g' });
  });
  it('says each finding as measured, worked out, proposed or not known — a proposal never said to be safe', () => {
    const fs = findings(videoFigures(source({ demand: { units: 600, unit: 'packs', availableMin: 40, per: 'shift' } }), all));
    expect(fs.find(x => x.kind === 'measured')?.text).toBe('Workstation 1 (Operator A): 3.2 s of work a cycle — 5 whole cycles accepted, median 3.2 s, range 3.2–3.2 s, varies 0%; one every 6.0 s; waiting 2.8 s between.');
    expect(fs.some(x => x.kind === 'calculated' && x.text === 'Workstation 2 is over takt by 0.6 s — at its pace the demand is not met.')).toBe(true);
    expect(fs.some(x => x.kind === 'calculated' && x.text === 'The work is 85% evenly spread across the stations (the work at every station ÷ the stations × the most at one).')).toBe(true);
    const p = fs.find(x => x.kind === 'proposed');
    expect(p?.text).toBe('Moving about 0.7 s of work from Workstation 2 towards Workstation 1 would bring each station near 3.9 s — if the work can be moved: check the method, the reach and the safety before it is.');
    /* four whole cycles at Workstation 2 — said too few to judge how it varies */
    expect(fs.filter(x => x.kind === 'unknown' && /too few to say how much it varies/.test(x.text)).map(x => x.text)).toEqual(['Workstation 2: 4 cycles is too few to say how much it varies — film or accept at least 5.']);
  });
  it('flags a cycle half again as long as usual — a piece of work may have been missed', () => {
    const missing = all.filter(e => !(e.zone === 'z1' && Math.abs(e.start - 12.9) < 0.3));
    const s1 = stationFigures(zones[0], missing, 'verified', 30, 0.2);
    expect(s1.long).toHaveLength(1);
    expect(s1.long[0].sec).toBeCloseTo(12, 0);
    expect(clock(65.25)).toBe('1:05.3');
  });
  it('works out takt only from a demand and its minutes', () => {
    expect(taktOf({ units: 0, unit: 'packs', availableMin: 40, per: 'shift' })).toBeUndefined();
    expect(taktOf({ units: 4800, unit: 'packs', availableMin: 450, per: 'shift' })).toBeCloseTo(5.625, 6);
  });
});

describe('a person’s review, keeping what the analysis proposed', () => {
  const r = { by: 'Rowland', at: 5 };
  const e: VideoEvent = detectEvents(signalOf(30), config)[0];

  it('moves a boundary, accepting the event and keeping the proposed one', () => {
    const x = setBoundary(e, 'end', 4.2, r) as VideoEvent;
    expect(x).toMatchObject({ end: 4.2, review: 'accepted', by: 'Rowland', proposed: { start: e.start, end: e.end, category: 'work', zone: 'z1' } });
    expect(setBoundary(e, 'end', e.start - 1, r)).toEqual({ error: 'The end must come after the start.' });
  });
  it('changes its kind and station, merges two, splits one, adds one by hand, rejects one', () => {
    expect(reclassify(e, { category: 'handling', inferred: 'loads the trays' }, r)).toMatchObject({ category: 'handling', inferred: 'loads the trays', review: 'accepted' });
    const two = detectEvents(signalOf(30), config).filter(x => x.zone === 'z1').slice(0, 2);
    const m = merge(two[0], two[1], r) as VideoEvent;
    expect(m.start).toBe(two[0].start); expect(m.end).toBe(two[1].end);
    expect(merge(two[0], { ...two[1], zone: 'z2' }, r)).toEqual({ error: 'Only events at the same station can be merged.' });
    const [a, b] = split(e, e.start + 1, 'new', r) as [VideoEvent, VideoEvent];
    expect([a.end, b.start, b.id]).toEqual([e.start + 1, e.start + 1, 'new']);
    expect(split(e, e.end + 1, 'n', r)).toEqual({ error: 'Split it at a time inside it — play to the moment, then split.' });
    const h = byHand({ id: 'h1', start: 10, end: 12, zone: 'z2', category: 'wait' }, r);
    expect(h).toMatchObject({ basis: 'person', review: 'accepted', confidence: 1, provenance: { provider: 'person' } });
    expect(checkEvent(h, { durationSec: 30, zones })).toEqual([]);
    expect(decide(e, 'rejected', r).review).toBe('rejected');
  });
  it('refuses a malformed event from any source, in words', () => {
    const { kept, refused } = keepValid([e, { ...e, id: 'bad', end: 99 }, { ...e, id: 'x', zone: 'nowhere' }, { ...e, id: 'y', category: 'dance' }, 'junk'], { durationSec: 30, zones });
    expect(kept).toHaveLength(1);
    expect(refused.map(x => x.problems[0].message)).toEqual([
      expect.stringMatching(/outside the footage's 30\.0 s/), 'It is at no station of this study.', '“dance” is not a kind of event the study knows.', 'Not an event.',
    ]);
  });
});

describe('the job’s lifecycle', () => {
  const j = newJob(config, 1);
  it('moves only forward through its states, counting each attempt, and says a failure in words', () => {
    expect(canMove('uploaded', 'review')).toBe(false);
    const q = move(j, 'queued', { now: 2 }) as typeof j;
    const x = move(q, 'extracting', { now: 3, said: 'Reading frame 1' }) as typeof j;
    expect(x).toMatchObject({ state: 'extracting', attempts: 1, startedAt: 3, said: 'Reading frame 1' });
    const f = move(x, 'failed', { now: 4, error: 'The footage could not be decoded.', retryable: false }) as typeof j;
    expect(f).toMatchObject({ state: 'failed', error: 'The footage could not be decoded.', retryable: false });
    expect(move(f, 'review', { now: 5 })).toEqual({ error: 'It cannot go from “Did not finish” to “Ready for review”.' });
    expect(move(f, 'queued', { now: 5 })).toMatchObject({ state: 'queued' });
  });
  it('knows a job left half-way, and keys a reading by its footage and settings', () => {
    const x = { ...j, state: 'extracting' as const, updatedAt: 0 };
    expect(stale(x, 3 * 60 * 1000)).toBe(true);
    expect(stale(x, 30 * 1000)).toBe(false);
    const f = { bytes: 10, durationSec: 30, width: 1280, height: 720 };
    expect(readingKey(f, 'ab', config)).toBe(readingKey(f, 'ab', config));
    expect(readingKey(f, 'ab', config)).not.toBe(readingKey(f, 'ab', { ...config, sensitivity: 5 }));
    expect(readingKey(f, 'ab', config)).not.toBe(readingKey(f, 'ac', config));
  });
});

describe('asked in words', () => {
  it('reads what is wanted, without an assistant', () => {
    expect(readObjective('Analyse this video for line balance').kind).toBe('balance');
    expect(readObjective('Identify repeated cycles and calculate their durations').kind).toBe('cycles');
    expect(readObjective('Show the activities that contribute most to this changeover').kind).toBe('changeover');
    expect(readObjective('Review the longest observed waiting periods').kind).toBe('waiting');
    expect(readObjective('Balance the line against takt and make a report')).toMatchObject({ kind: 'balance', wants: ['takt', 'report'] });
  });
  it('answers from the figures, and says what it does not know', () => {
    const all = acceptAll(detectEvents(signalOf(30), config), { by: 'R', at: 1 });
    const f = videoFigures(source(), all);
    expect(answer('What additional information do you need to calculate takt time?', f)).toEqual({ how: 'not known', text: expect.stringMatching(/^To work out takt I need the demand/) });
    expect(answer('Review the longest observed waiting periods', f)?.text).toMatch(/^The longest waits: 2\.\d s at Workstation 1 from/);
    expect(answer('Identify repeated cycles', f)?.text).toMatch(/Workstation 1: 3\.2 s of work, a cycle every 6\.0 s \(4 cycles/);
    expect(answer('Which activities contribute most?', f)?.text).toMatch(/^Workstation 2 4\.6 s \(59%\), Workstation 1 3\.2 s \(41%\) — Workstation 2 sets the pace; from 10 accepted events\.$/);
    expect(answer('what is the weather', f)).toBeUndefined();
    expect(questionsFor('balance', f, { zones: 2, wantsTakt: true })).toEqual(['To compare with takt: how many does the line have to make, and in how many minutes (a shift or a day)?']);
  });
});
