/* Line Talk's toolsets (docs/LINE-TALK-TOOLSETS.md; knowledge/specs/FC-202-toolsets.md): the flow diagram's capture is read as its schema says,
   no figure is invented or worked out by the assistant, and the steps fill the process flow calculator exactly as its own boxes would. */
import { describe, expect, it } from 'vitest';
import { FLOW_KINDS } from '../../flow/processFlow';
import { runCalc } from '../../calc/calc';
import processFlow, { inputsOfSteps } from '../../calc/defs/process-flow';
import { TALK_SYSTEM, checkTalkAnswer, readAsk, talkMessages, talkRulesText, talkSchemaFor, talkSystemFor, unsureFigures, type TalkAsk } from '../talkAssist';
import { CAPTURE_FLOW_KINDS, FLOW_SCHEMA, FLOW_STEPS_MAX, SET_INSTRUCTIONS, SPAG_SCHEMA, SPAG_STEPS_MAX, SPAG_WALKERS_MAX, captureAsText, captureCount, captureWords, readSpagCapture, readFlowCapture, setOf } from '../talkSets';
import { STEPS_MAX, WALKERS_MAX, walkersFigures } from '../../spaghetti/walkers';
import spaghettiWalkers from '../../calc/defs/spaghetti-walkers';
import { spagInputs } from '../TalkSpag';

/** the record's tray (scripts/knowledge/cases-kaizen.py F) as a person SAYS it — seconds for some, hours for the chill, metres for the moves */
const SAID = [
  { what: 'Mix and portion', kind: 'operation', time: 120, timeUnit: 'seconds', dist: null, distUnit: '' },
  { what: 'To the oven', kind: 'transport', time: 90, timeUnit: 'seconds', dist: 30, distUnit: 'metres' },
  { what: 'Waiting for the oven', kind: 'delay', time: 12, timeUnit: 'minutes', dist: null, distUnit: '' },
  { what: 'Bake', kind: 'operation', time: 3.5, timeUnit: 'minutes', dist: null, distUnit: '' },
  { what: 'Check the core', kind: 'inspection', time: 1, timeUnit: 'minutes', dist: null, distUnit: '' },
  { what: 'To the chiller', kind: 'transport', time: 2, timeUnit: 'minutes', dist: 45, distUnit: 'metres' },
  { what: 'Chill', kind: 'storage', time: 4, timeUnit: 'hours', dist: null, distUnit: '' },
  { what: 'To the pack area', kind: 'transport', time: 60, timeUnit: 'seconds', dist: 20, distUnit: 'metres' },
  { what: 'Pack', kind: 'operation', time: 4, timeUnit: 'minutes', dist: null, distUnit: '' },
  { what: 'Waiting for QA release', kind: 'delay', time: 8, timeUnit: 'minutes', dist: null, distUnit: '' },
  { what: 'To the despatch bay', kind: 'transport', time: 90, timeUnit: 'seconds', dist: 25, distUnit: 'metres' },
  { what: 'Palletise', kind: 'operation', time: 90, timeUnit: 'seconds', dist: null, distUnit: '' },
  { what: 'Weigh and label', kind: 'inspection', time: 30, timeUnit: 'seconds', dist: null, distUnit: '' },
  { what: 'To the lorry', kind: 'transport', time: 1, timeUnit: 'minutes', dist: 20, distUnit: 'metres' },
];

describe('the flow diagram set — what the assistant is told and how it answers', () => {
  it('its classes are the process flow chart’s own', () => {
    expect([...CAPTURE_FLOW_KINDS]).toEqual([...FLOW_KINDS]);
  });
  it('its answer’s shape is small and closed — every object’s fields required, nothing extra', () => {
    const objects: { required?: string[]; properties?: Record<string, unknown>; additionalProperties?: boolean }[] = [];
    const walk = (o: unknown) => { if (o && typeof o === 'object') { if ((o as { type?: string }).type === 'object') objects.push(o as never); Object.values(o).forEach(walk); } };
    walk(FLOW_SCHEMA);
    expect(objects.length).toBe(3);
    for (const o of objects) {
      expect(o.additionalProperties).toBe(false);
      expect([...(o.required ?? [])].sort()).toEqual(Object.keys(o.properties ?? {}).sort());
    }
  });
  it('tells the assistant to write down, never to work out or estimate', () => {
    const t = SET_INSTRUCTIONS.flow;
    for (const w of ['NEVER make up', 'NEVER convert, add up or estimate', 'ONLY a transport has a distance', 'THE DIAGRAM SO FAR', 'do NOT put it in the capture yet']) expect(t).toContain(w);
    expect(talkSystemFor('flow')).toContain(TALK_SYSTEM);
    expect(talkSystemFor('walk')).toBe(TALK_SYSTEM);
  });
  it('uses its own schema for the set and the walk’s for the walk; the rules fingerprint covers both', () => {
    expect(talkSchemaFor('flow')).toBe(FLOW_SCHEMA);
    expect(talkSchemaFor('walk')).not.toBe(FLOW_SCHEMA);
    expect(talkRulesText()).toContain(JSON.stringify(FLOW_SCHEMA));
    expect(talkRulesText()).toContain(SET_INSTRUCTIONS.flow);
  });
  it('reads a set off the wire, the general walk when it is not one', () => {
    expect(setOf('flow')).toBe('flow');
    expect(setOf('spaghetti')).toBe('walk');
    expect(setOf(undefined)).toBe('walk');
    const r = readAsk({ turns: [{ kind: 'typed', at: '10:00', text: 'cases off the line' }], images: [], set: 'flow', draft: 'x'.repeat(20000) });
    expect(r.ok && r.ask.set).toBe('flow');
    expect(r.ok && r.ask.draft?.length).toBe(12000);
    const w = readAsk({ turns: [{ kind: 'typed', at: '10:00', text: 'hello' }], images: [] });
    expect(w.ok && 'set' in w.ask).toBe(false);
  });
});

describe('reading a flow capture', () => {
  it('converts the units in code, not in the assistant: seconds, hours, feet, yards, kilometres', () => {
    const c = readFlowCapture({ title: 'T', steps: [
      { what: 'a', kind: 'operation', time: 90, timeUnit: 'seconds', dist: null, distUnit: '' },
      { what: 'b', kind: 'storage', time: 0.5, timeUnit: 'hours', dist: null, distUnit: '' },
      { what: 'c', kind: 'transport', time: null, timeUnit: '', dist: 10, distUnit: 'feet' },
      { what: 'd', kind: 'transport', time: null, timeUnit: '', dist: 100, distUnit: 'yards' },
      { what: 'e', kind: 'transport', time: null, timeUnit: '', dist: 2, distUnit: 'kilometres' },
    ] });
    expect(c?.steps.map(s => [s.min, s.m])).toEqual([[1.5, undefined], [30, undefined], [undefined, 3.048], [undefined, 91.44], [undefined, 2000]]);
    expect(c?.steps[0].said).toBe('90 seconds');
    expect(c?.steps[3].said).toBe('100 yards');
  });
  it('reads its own output as itself — the gateway reads an answer and the app reads it again', () => {
    const once = readFlowCapture({ title: 'Tray', steps: SAID });
    expect(readFlowCapture(once)).toEqual(once);
    expect(readFlowCapture(JSON.parse(JSON.stringify(once)))).toEqual(once);
    expect(checkTalkAnswer({ reply: 'ok', capture: once }, [], 'flow')?.capture).toEqual(once);
  });
  it('never fills a time or a distance that was not said', () => {
    const c = readFlowCapture({ title: '', steps: [{ what: 'Wait', kind: 'delay', time: null, timeUnit: '', dist: null, distUnit: '' }, { what: 'Move', kind: 'transport', time: null, timeUnit: '', dist: null, distUnit: '' }] });
    expect(c?.steps).toEqual([{ what: 'Wait', kind: 'delay' }, { what: 'Move', kind: 'transport' }]);
  });
  it('drops metres off anything but a transport, a step with no class, a negative or silly figure; names an unnamed step', () => {
    const c = readFlowCapture({ title: 'x', steps: [
      { what: 'Bake', kind: 'operation', time: 3, timeUnit: 'minutes', dist: 40, distUnit: 'metres' },
      { what: 'Mystery', kind: 'wobble', time: 3, timeUnit: 'minutes', dist: null, distUnit: '' },
      { what: '', kind: 'inspection', time: -4, timeUnit: 'minutes', dist: null, distUnit: '' },
    ] });
    expect(c?.steps).toEqual([{ what: 'Bake', kind: 'operation', min: 3, said: '3 minutes' }, { what: 'Step 2', kind: 'inspection' }]);
  });
  it('holds a chart to its slots and says nothing for nothing', () => {
    const many = Array.from({ length: 40 }, (_, i) => ({ what: `s${i}`, kind: 'operation', time: 1, timeUnit: 'minutes', dist: null, distUnit: '' }));
    expect(readFlowCapture({ title: '', steps: many })?.steps.length).toBe(FLOW_STEPS_MAX);
    expect(readFlowCapture({ title: '', steps: [] })).toBeUndefined();
    expect(readFlowCapture(null)).toBeUndefined();
  });
  it('is read off an answer for its set, and an answer with only a capture is still an answer', () => {
    const raw = { reply: '', capture: { title: 'Tray', steps: SAID.slice(0, 2) } };
    const got = checkTalkAnswer(raw, [], 'flow')?.capture;
    expect(got?.set === 'flow' ? got.steps.length : -1).toBe(2);
    expect(checkTalkAnswer(raw, [], 'walk')).toBeNull();
  });
});

describe('the steps fill the process flow chart as its own boxes would', () => {
  it('the record’s tray, said in seconds, minutes and hours, draws the chart the typed tray draws (14 steps, 279.5 min, 140 m)', () => {
    const cap = readFlowCapture({ title: 'Tray, oven to despatch pallet', steps: SAID });
    expect(cap?.steps.length).toBe(14);
    const run = runCalc(processFlow, inputsOfSteps(cap?.steps ?? []));
    expect(run.blocked).toBe(false);
    expect(run.result?.sentence).toBe(processFlow.examples[0].expect.sentence);
    expect(run.result?.sentence).toContain('14 steps');
    expect(run.result?.sentence).toContain('279.5 min');
  });
  it('a step not timed and a transport with no distance are said by the chart, not filled', () => {
    const cap = readFlowCapture({ title: '', steps: [{ what: 'Fill', kind: 'operation', time: null, timeUnit: '', dist: null, distUnit: '' }, { what: 'Carry', kind: 'transport', time: 2, timeUnit: 'minutes', dist: null, distUnit: '' }] });
    const run = runCalc(processFlow, inputsOfSteps(cap?.steps ?? []));
    expect(run.result?.sentence).toContain('no distance yet');
  });
});

describe('the draft goes back, and its figures are checked', () => {
  const ask = (draft?: string): TalkAsk => ({ task: 'talk', set: 'flow', ...(draft ? { draft } : {}), context: '', today: 'Friday 6 November 2026', turns: [{ kind: 'said', at: '10:00', text: 'the cases wait 90 seconds for the wrapper' }], images: [] });
  it('the person’s version is sent in the records block, as words', () => {
    const cap = readFlowCapture({ title: 'Cases', steps: SAID.slice(0, 2) });
    const text = captureAsText(cap!);
    expect(text).toContain('2 steps');
    expect(text).toContain('To the oven — transport, 1.5 min, 30 m');
    const last = (() => { const m = talkMessages(ask(text)); const c = m[m.length - 1].content; return c[c.length - 1]; })();
    expect(last.type === 'text' && last.text).toContain('THE DIAGRAM SO FAR');
    expect(last.type === 'text' && last.text).toContain('To the oven — transport');
    const none = (() => { const m = talkMessages(ask()); const c = m[m.length - 1].content; return c[c.length - 1]; })();
    expect(none.type === 'text' && none.text).not.toContain('THE DIAGRAM SO FAR');
  });
  it('a time the assistant was never given is flagged to check; one that was said is not', () => {
    const a = (t: number, u: string) => ({ reply: 'ok', capture: readFlowCapture({ title: '', steps: [{ what: 'Wait for the wrapper', kind: 'delay', time: t, timeUnit: u, dist: null, distUnit: '' }] }) });
    expect(unsureFigures(a(90, 'seconds') as never, ask())).toEqual([]);
    expect(unsureFigures(a(45, 'seconds') as never, ask())).toEqual(['45']);
  });
});


/* ------------------------------------------------------------------ the spaghetti set (FC-242; scripts/knowledge/cases-kaizen.py S3) */

/** Rowland's example as a person SAYS it — distances for some moves, none for others, one in feet */
const SAID_WALK = {
  title: 'Packing line operators',
  walkers: [
    { label: 'Operator 1', steps: [
      { place: 'Packing line', dist: null, distUnit: '' }, { place: 'Film store', dist: 40, distUnit: 'metres' }, { place: 'Packing line', dist: 40, distUnit: 'metres' },
      { place: 'Case store', dist: 25, distUnit: 'metres' }, { place: 'Packing line', dist: 25, distUnit: 'metres' }] },
    { label: 'Operator 2', steps: [
      { place: 'Packing line', dist: null, distUnit: '' }, { place: 'Scale', dist: 9, distUnit: 'metres' }, { place: 'Packing line', dist: 9, distUnit: 'metres' },
      { place: 'Film store', dist: 40, distUnit: 'metres' }, { place: 'Packing line', dist: 40, distUnit: 'metres' }] },
    { label: 'Operator 3', steps: [{ place: 'Packing line', dist: null, distUnit: '' }, { place: 'Case store', dist: 25, distUnit: 'metres' }, { place: 'Packing line', dist: 25, distUnit: 'metres' }] },
  ],
};

describe('the spaghetti set — what the assistant is told and how it answers', () => {
  it('holds the same limits as the tool, and a closed shape of its own', () => {
    expect([SPAG_WALKERS_MAX, SPAG_STEPS_MAX]).toEqual([WALKERS_MAX, STEPS_MAX]);
    const bad: string[] = [];
    const walk = (o: unknown, path: string): void => {
      if (!o || typeof o !== 'object') return;
      const x = o as Record<string, unknown>;
      if (x.type === 'object') {
        if (x.additionalProperties !== false) bad.push(`${path}: not closed`);
        const props = Object.keys((x.properties ?? {}) as object), req = (x.required ?? []) as string[];
        if (props.some(p => !req.includes(p))) bad.push(`${path}: a field is optional`);
      }
      for (const [k, v] of Object.entries(x)) walk(v, `${path}.${k}`);
    };
    walk(SPAG_SCHEMA, 'spag');
    expect(bad).toEqual([]);
    expect(talkSchemaFor('spag')).toBe(SPAG_SCHEMA);
  });
  it('tells the assistant labels not names, never to work out a distance, and to ask which person', () => {
    const s = SET_INSTRUCTIONS.spag;
    expect(s).toMatch(/NEVER a person's name/);
    expect(s).toMatch(/NEVER convert, add up, estimate or fill in a distance/);
    expect(s).toMatch(/Was that Operator 2 or 3\?/);
    expect(talkSystemFor('spag')).toContain(TALK_SYSTEM);
    expect(talkSystemFor('spag')).toContain(s);
    expect(talkRulesText()).toContain(s);
  });
  it('is a set the wire can name', () => { expect(setOf('spag')).toBe('spag'); });
});

describe('reading a spaghetti capture', () => {
  it('converts the units in code and gives a walker’s first place no distance', () => {
    const c = readSpagCapture({ title: 't', walkers: [{ label: 'A', steps: [{ place: 'Line', dist: 99, distUnit: 'metres' }, { place: 'Store', dist: 10, distUnit: 'feet' }, { place: 'Line', dist: 1, distUnit: 'kilometres' }, { place: 'Bay', dist: 5, distUnit: 'yards' }, { place: 'Gate', dist: null, distUnit: '' }] }] });
    expect(c?.walkers[0].steps.map(s => s.m)).toEqual([undefined, 3.048, 1000, 4.572, undefined]);
    expect(c?.walkers[0].steps[1].said).toBe('10 feet');
    expect(c?.walkers[0].steps[0].said).toBeUndefined();
  });
  it('reads its own output as itself — the gateway reads an answer and the app reads it again', () => {
    const once = readSpagCapture(SAID_WALK);
    expect(readSpagCapture(JSON.parse(JSON.stringify(once)))).toEqual(once);
  });
  it('never fills a distance that was not said, names an unnamed walker, drops a nameless place, and holds the limits', () => {
    const c = readSpagCapture({ title: '', walkers: [{ label: '', steps: [{ place: 'Line', dist: null, distUnit: '' }, { place: '  ', dist: 5, distUnit: 'metres' }, { place: 'Store', dist: null, distUnit: '' }] }, ...Array.from({ length: 6 }, (_, i) => ({ label: `W${i}`, steps: [{ place: 'X', dist: null, distUnit: '' }] }))] });
    expect(c?.walkers.length).toBe(SPAG_WALKERS_MAX);
    expect(c?.walkers[0].label).toBe('Walker 1');
    expect(c?.walkers[0].steps).toEqual([{ place: 'Line' }, { place: 'Store' }]);
    const many = Array.from({ length: 40 }, (_, i) => ({ place: `p${i}`, dist: null, distUnit: '' }));
    expect(readSpagCapture({ title: '', walkers: [{ label: 'A', steps: many }] })?.walkers[0].steps.length).toBe(SPAG_STEPS_MAX);
    expect(readSpagCapture({ title: '', walkers: [] })).toBeUndefined();
    expect(readSpagCapture(null)).toBeUndefined();
  });
  it('is read off an answer for its set, and a flow capture is not read for it', () => {
    const got = checkTalkAnswer({ reply: 'Who went to the scale?', capture: SAID_WALK }, [], 'spag')?.capture;
    expect(got?.set === 'spag' ? got.walkers.length : -1).toBe(3);
    const wrong = checkTalkAnswer({ reply: '', capture: SAID_WALK }, [], 'flow')?.capture;
    expect(wrong?.set === 'flow' ? wrong.steps.length : -1).toBe(0);
  });
});

describe('Rowland’s example fills the spaghetti calculator as its own boxes would', () => {
  const cap = readSpagCapture(SAID_WALK)!;
  it('three operators said aloud draw the case S3 figures (10 moves, 278 m, Operator 1 130 m, the line 5 times)', () => {
    const { inputs, src } = spagInputs(cap, 'the Line Talk of today');
    const r = runCalc(spaghettiWalkers, inputs).result!;
    expect(r.sentence).toBe('3 walkers make 10 moves a round, 278 m together. Operator 1 walks most — 130 m (47%). Packing line is arrived at most — 5 times.');
    expect(Object.values(src).every(v => v === 'the Line Talk of today')).toBe(true);
    expect(Object.keys(src).sort()).toEqual(Object.keys(inputs).sort());
    expect(captureCount(cap)).toBe(10);
  });
  it('the same walk said without a distance counts moves, not metres, and invents none', () => {
    const none = readSpagCapture({ title: '', walkers: SAID_WALK.walkers.map(w => ({ label: w.label, steps: w.steps.map(s => ({ place: s.place, dist: null, distUnit: '' })) })) })!;
    const f = walkersFigures(none.walkers.map(w => ({ label: w.label, steps: w.steps.map(s => ({ place: s.place, ...(s.m !== undefined ? { m: s.m } : {}) })) })));
    expect([f.legs, f.m, f.complete]).toEqual([10, 0, false]);
    expect(runCalc(spaghettiWalkers, spagInputs(none, 'x').inputs).result!.sentence).toMatch(/no lengths were given, so moves are counted, not metres/);
  });
});

describe('the spaghetti draft goes back, and its figures are checked', () => {
  const cap = readSpagCapture(SAID_WALK)!;
  it('the person’s version is sent as words, every place with what was said beside it', () => {
    const w = captureAsText(cap);
    expect(w).toContain('[The spaghetti diagram so far: Packing line operators — 3 walkers]');
    expect(w).toContain('Operator 1: Packing line (start) → Film store (40 m) → Packing line (40 m) → Case store (25 m) → Packing line (25 m)');
    expect(captureAsText(readSpagCapture({ title: '', walkers: [{ label: 'A', steps: [{ place: 'L', dist: null, distUnit: '' }, { place: 'S', dist: null, distUnit: '' }] }] })!)).toContain('S (no distance said)');
  });
  it('a distance the assistant was never given is flagged to check; one that was said is not', () => {
    const ask = (said: string): TalkAsk => ({ task: 'talk', set: 'spag', context: '', today: '', images: [], turns: [{ at: '10:00', kind: 'said', text: said }] });
    const answer = { reply: 'Got it.', capture: readSpagCapture({ title: '', walkers: [{ label: 'Operator 1', steps: [{ place: 'Line', dist: null, distUnit: '' }, { place: 'Film store', dist: 40, distUnit: 'metres' }] }] }) };
    expect(unsureFigures(answer, ask('Operator 1 goes to the film store, forty metres, that is 40 metres'))).toEqual([]);
    expect(unsureFigures(answer, ask('Operator 1 goes to the film store')).length).toBeGreaterThan(0);
    expect(captureWords(answer.capture!).join(' ')).toContain('40 metres');
  });
});
