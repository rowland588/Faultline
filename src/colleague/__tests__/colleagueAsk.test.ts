/* AI MODE's client loop with a fake gateway and a fake registry: reads and local steps run at once, a write waits for
 * the person, Not now is sent back as declined, a write the person may not make never becomes a card, the rounds stop
 * at six, the gateway off is said (src/colleague/colleagueAsk). */
import { describe, expect, it } from 'vitest';
import { CARRY_ON, JOB_MS, MAX_LEGS, MAX_ROUNDS, NOT_RUN, STOPPED, STOP_NOTE, TOO_MANY, carriedText, colleagueLoop, readAnswer, tooMany, type ColleagueBody, type GatewayAnswer, type LoopDeps, type Step } from '../colleagueAsk';
import type { CapCall, CapResult } from '../../capabilities/types';

const KINDS: Record<string, { kind: 'read' | 'write' | 'local'; title: string }> = {
  list_problems: { kind: 'read', title: 'Problems on the register' },
  set_focus: { kind: 'local', title: 'Change the subject' },
  raise_problem: { kind: 'write', title: 'Raise a problem' },
};

function rig(answers: GatewayAnswer[], o: { confirm?: boolean; allowed?: boolean; /** Every step fails. */ fail?: boolean; /** Stop is pressed once this many steps have run. */ stopAfter?: number; /** Stop is pressed once this many asks have gone. */ stopAtAsk?: number; /** The clock, ms a tick. */ tick?: number } = {}) {
  const bodies: ColleagueBody[] = [];
  const ran: { call: CapCall; confirmed: boolean }[] = [];
  const steps: Step[] = [];
  let asked = 0, clock = 0;
  const deps: LoopDeps = {
    invoke: async b => { bodies.push(JSON.parse(JSON.stringify(b))); return answers.shift() ?? { ok: true, reply: 'end' }; },
    describe: n => KINDS[n],
    ...(o.tick ? { now: () => (clock += o.tick ?? 0) } : {}),
    ...(o.stopAfter !== undefined || o.stopAtAsk !== undefined ? { stopped: () => (o.stopAfter !== undefined && ran.length >= o.stopAfter) || (o.stopAtAsk !== undefined && bodies.length >= o.stopAtAsk) } : {}),
    run: async (call, confirmed): Promise<CapResult> => { ran.push({ call, confirmed }); return o.fail ? { ok: false, why: `${call.name} could not be done` } : { ok: true, says: `${call.name} ran`, refs: [{ kind: 'line', id: 'L3', label: 'Line 3', href: '/lines/L3' }], data: { n: 4 } }; },
    prepare: async call => (o.allowed === false ? { ok: false, title: KINDS[call.name].title, why: 'A client reads this project and changes nothing.' } : { ok: true, title: KINDS[call.name].title, preview: 'It will raise a problem on Line 3.', input: { words: 'jam' } }),
    confirm: async () => { asked++; return o.confirm ?? true; },
    onStep: s => { steps.push(s); },
  };
  return { deps, bodies, ran, steps, asked: () => asked };
}
const ask = { turns: [{ role: 'person' as const, text: 'What is open on Line 3?', at: 'now' }], focus: () => 'Current: Line 3', today: 'Sunday 8 November 2026' };

describe('the client loop', () => {
  it('runs a read at once and sends its result back with pending, then ends on a reply with no calls', async () => {
    const r = rig([
      { ok: true, reply: '', calls: [{ id: 'c1', name: 'list_problems', input: { lineId: 'L3' } }], assistant: { opaque: 1 } },
      { ok: true, reply: 'Four are open, 45 minutes between them; 4 of them on Line 3.', suggestions: ['Which is oldest?'], model: 'm' },
    ]);
    const end = await colleagueLoop(ask, r.deps);
    /* every figure checked on the device (docs/LUNA-NEXT.md L1): 45 is in nothing the step gave or the person said; 4 and 3 are small counts */
    expect(end).toMatchObject({ ok: true, reply: 'Four are open, 45 minutes between them; 4 of them on Line 3.', suggestions: ['Which is oldest?'], unsure: ['45'], checked: 1, rounds: 2 });
    expect(r.ran).toEqual([{ call: { id: 'c1', name: 'list_problems', input: { lineId: 'L3' } }, confirmed: false }]);
    expect(r.bodies[0]).toMatchObject({ task: 'colleague', focus: 'Current: Line 3', today: 'Sunday 8 November 2026' });
    expect(r.bodies[0].pending).toBeUndefined();
    expect(r.bodies[1].pending).toEqual({ assistant: { opaque: 1 }, results: [{ id: 'c1', ok: true, says: 'list_problems ran', data: { n: 4 } }] });
    expect(r.steps.map(s => [s.title, s.status])).toEqual([['Problems on the register', 'done']]);
  });

  it('an earlier answer’s working reaches the figure check through `earlier` — never through the turn’s own text (21 November)', async () => {
    const turns = [
      { role: 'person' as const, text: 'Why are we under plan?', at: 't1' },
      /* her earlier words, then her steps in brackets as the gateway is told them: a sum that rested on a figure nobody gave */
      { role: 'colleague' as const, text: 'Line 3 carries it. I make it 1,954.\n[Work out a figure: A guess: 977 × 2 = 1,954 (worked out by the app). It rests on 977, found nowhere in this conversation\'s working.]', at: 't2' },
      { role: 'person' as const, text: 'In two sentences?', at: 't3' },
    ];
    const one = rig([{ ok: true, reply: 'October came in 7.93% under plan; I made it 1,954 before.' }]);
    const bare = await colleagueLoop({ ...ask, turns }, one.deps);
    expect(bare).toMatchObject({ ok: true, unsure: ['7.93%', '1,954'], checked: 2 });
    const two = rig([{ ok: true, reply: 'October came in 7.93% under plan; I made it 1,954 before.' }]);
    const told = await colleagueLoop({ ...ask, turns, earlier: [{ says: 'Packs made against plan: −476,416 packs (−7.93%), below plan.' }] }, two.deps);
    expect(told).toMatchObject({ ok: true, unsure: ['1,954'], checked: 2 });
  });

  it('runs a local step at once, without asking', async () => {
    const r = rig([{ ok: true, reply: '', calls: [{ id: 'f', name: 'set_focus', input: { title: 'X' } }] }, { ok: true, reply: 'ok' }]);
    await colleagueLoop(ask, r.deps);
    expect(r.asked()).toBe(0);
    expect(r.ran[0].confirmed).toBe(false);
  });

  it('a write waits for the person, runs only once confirmed', async () => {
    const r = rig([{ ok: true, reply: 'Shall I?', calls: [{ id: 'w', name: 'raise_problem', input: {} }] }, { ok: true, reply: 'Raised.' }], { confirm: true });
    const end = await colleagueLoop(ask, r.deps);
    expect(r.asked()).toBe(1);
    expect(r.ran).toEqual([{ call: { id: 'w', name: 'raise_problem', input: {} }, confirmed: true }]);
    expect(r.steps.map(s => s.status)).toEqual(['waiting', 'done']);
    expect(r.steps[0].preview).toBe('It will raise a problem on Line 3.');
    expect(end).toMatchObject({ ok: true, reply: 'Shall I?\n\nRaised.' });
  });

  it('Not now is sent back as declined, and nothing runs', async () => {
    const r = rig([{ ok: true, reply: '', calls: [{ id: 'w', name: 'raise_problem', input: {} }] }, { ok: true, reply: 'Left it.' }], { confirm: false });
    await colleagueLoop(ask, r.deps);
    expect(r.ran).toEqual([]);
    expect(r.bodies[1].pending?.results).toEqual([{ id: 'w', ok: false, declined: true, says: 'The person said not now; nothing was written.' }]);
    expect(r.steps.map(s => s.status)).toEqual(['waiting', 'declined']);
  });

  it('a write the person may not make is refused before any card', async () => {
    const r = rig([{ ok: true, reply: '', calls: [{ id: 'w', name: 'raise_problem', input: {} }] }, { ok: true, reply: 'You cannot.' }], { allowed: false });
    await colleagueLoop(ask, r.deps);
    expect(r.asked()).toBe(0);
    expect(r.ran).toEqual([]);
    expect(r.steps.map(s => s.status)).toEqual(['refused']);
    expect(r.bodies[1].pending?.results[0]).toMatchObject({ ok: false, says: 'A client reads this project and changes nothing.' });
  });

  it('a call the app has no capability for is dropped and said', async () => {
    const r = rig([{ ok: true, reply: '', calls: [{ id: 'x', name: 'delete_everything', input: {} }] }, { ok: true, reply: 'ok' }]);
    await colleagueLoop(ask, r.deps);
    expect(r.ran).toEqual([]);
    expect(r.steps[0].status).toBe('dropped');
    expect(r.bodies[1].pending?.results[0].ok).toBe(false);
  });

  /* A JOB IS CARRIED ON BY THE APP (21 November, docs/LUNA-AGENT.md G1). The loop used to stop at six rounds and ask the person to say
     "carry on"; when a go got something done it now starts another itself, handing on what the go said and what its steps found. */
  const calling = (i: number, reply = ''): GatewayAnswer => ({ ok: true, reply, calls: [{ id: `c${i}`, name: 'list_problems', input: { n: i } }], assistant: { round: i } });

  it('a go that runs out with work done is carried on by the app: its words and steps handed on, no carry asked of the person', async () => {
    /* six rounds asking for steps, then two more, then the answer */
    const r = rig([calling(1, 'Reading the workbook.'), calling(2), calling(3), calling(4), calling(5), calling(6, 'Now the report.'), calling(7), calling(8), { ok: true, reply: 'Done — the report is “October against plan”.', model: 'm' }]);
    const end = await colleagueLoop(ask, r.deps);
    expect(end).toMatchObject({ ok: true, rounds: 9, legs: 2 });
    expect(end.ok && end.capped).toBeUndefined();
    expect(end.ok && end.reply).toBe('Reading the workbook.\n\nNow the report.\n\nDone — the report is “October against plan”.');
    /* the sixth round's step is not run; the seventh and eighth are — 5 + 2 */
    expect(r.ran.map(x => (x.call.input as { n: number }).n)).toEqual([1, 2, 3, 4, 5, 7, 8]);
    /* the second go starts clean of the first's carry, with the first go as the conversation's own record and the app's line after it */
    expect(r.bodies[5].pending).toBeDefined();
    expect(r.bodies[6].pending).toBeUndefined();
    expect(r.bodies[6].turns).toHaveLength(3);
    expect(r.bodies[6].turns[1]).toMatchObject({ role: 'colleague', text: `Reading the workbook.\n\nNow the report.\n${Array.from({ length: 5 }, () => '[Problems on the register: list_problems ran]').join(' ')}` });
    expect(r.bodies[6].turns[2]).toMatchObject({ role: 'person', text: CARRY_ON });
    expect(r.bodies[7].pending).toEqual({ assistant: { round: 7 }, results: [{ id: 'c7', ok: true, says: 'list_problems ran', data: { n: 4 } }] });
    /* the app's line is never the person's words: a figure in it lends nothing, and none is in it */
    expect(CARRY_ON).not.toMatch(/\d/);
  });

  it('a go that got nothing done stops at six and says so — as it always did', async () => {
    const r = rig(Array.from({ length: 10 }, (_, i) => calling(i)), { fail: true });
    const end = await colleagueLoop(ask, r.deps);
    expect(r.bodies).toHaveLength(MAX_ROUNDS);
    expect(r.ran).toHaveLength(MAX_ROUNDS - 1);
    expect(end).toMatchObject({ ok: true, capped: true, rounds: MAX_ROUNDS, suggestions: ['Carry on'] });
    expect(end.ok && end.legs).toBeUndefined();
    expect(end.ok && end.reply).toContain(TOO_MANY);
  });

  it('a job that never ends is stopped after its goes — and says how far it got', async () => {
    const r = rig(Array.from({ length: 40 }, (_, i) => calling(i)));
    const end = await colleagueLoop(ask, r.deps);
    expect(r.bodies).toHaveLength(MAX_LEGS * MAX_ROUNDS);
    expect(r.ran).toHaveLength(MAX_LEGS * (MAX_ROUNDS - 1));
    expect(end).toMatchObject({ ok: true, capped: true, rounds: MAX_LEGS * MAX_ROUNDS, legs: MAX_LEGS });
    expect(end.ok && end.reply).toContain(tooMany(MAX_LEGS * MAX_ROUNDS));
  });

  it('…and never longer than its time: a go that ends after it is not carried on', async () => {
    /* the clock is read at the start, at the first words and at each go's end — a tick long enough that the first go ends past the time */
    const r = rig(Array.from({ length: 40 }, (_, i) => calling(i)), { tick: JOB_MS });
    const end = await colleagueLoop(ask, r.deps);
    expect(r.bodies).toHaveLength(MAX_ROUNDS);
    expect(end).toMatchObject({ ok: true, capped: true, rounds: MAX_ROUNDS });
  });

  it('what a go hands on is its words then its steps, the newest kept whole when there is not room for all', () => {
    expect(carriedText(['One.', '', 'Two.'], ['[A: found 12]', '[B: failed — no sheet]'])).toBe('One.\n\nTwo.\n[A: found 12] [B: failed — no sheet]');
    const long = Array.from({ length: 30 }, (_, i) => `[Step ${i}: ${'x'.repeat(880)}]`);
    const t = carriedText(['Working.'], long);
    expect(t.length).toBeLessThanOrEqual(11_000);
    expect(t).toContain('[Step 29: ');
    expect(t).not.toContain('[Step 0: ');
    expect(t).toMatch(/\[\d+ earlier steps of that go not repeated here — what they made is kept by its id\]/);
  });

  /* STOP — the person can stop her at any moment, and what she had done is kept */
  it('stopped before anything has run: nothing more is asked', async () => {
    const r = rig([calling(1)], { stopAtAsk: 0 });
    const end = await colleagueLoop(ask, r.deps);
    expect(r.bodies).toHaveLength(0);
    expect(end).toMatchObject({ ok: true, stopped: true, rounds: 0, reply: STOPPED, suggestions: ['Carry on'] });
  });

  it('stopped while she is thinking: what she then asks for is not run', async () => {
    const r = rig([calling(1, 'Looking.'), calling(2, 'And the next.')], { stopAtAsk: 2 });
    const end = await colleagueLoop(ask, r.deps);
    expect(r.ran.map(x => (x.call.input as { n: number }).n)).toEqual([1]);
    expect(r.bodies).toHaveLength(2);
    expect(end).toMatchObject({ ok: true, stopped: true, rounds: 2 });
    expect(end.ok && end.reply).toBe(`Looking.\n\nAnd the next.\n\n${STOPPED}`);
  });

  it('stopped with steps run since the last ask: one more ask carries what they gave and tells her to stop — nothing she asks for is run', async () => {
    const r = rig([calling(1, 'Looking.'), calling(2, 'I had got as far as the downtime log.')], { stopAfter: 1 });
    const end = await colleagueLoop(ask, r.deps);
    expect(r.ran).toHaveLength(1);
    expect(r.bodies).toHaveLength(2);
    expect(r.bodies[1].pending).toEqual({ assistant: { round: 1 }, results: [{ id: 'c1', ok: true, says: 'list_problems ran', data: { n: 4 } }] });
    expect(r.bodies[1].focus).toBe(`Current: Line 3\n${STOP_NOTE}`);
    expect(end).toMatchObject({ ok: true, stopped: true, rounds: 2 });
    expect(end.ok && end.reply).toBe(`Looking.\n\nI had got as far as the downtime log.\n\n${STOPPED}`);
  });

  it('stopped part-way through a round: the rest of that round is not run, and each says so', async () => {
    const three: GatewayAnswer = { ok: true, reply: '', calls: [1, 2, 3].map(n => ({ id: `c${n}`, name: 'list_problems', input: { n } })), assistant: { round: 1 } };
    const r = rig([three, { ok: true, reply: 'Stopped at the first.' }], { stopAfter: 1 });
    const end = await colleagueLoop(ask, r.deps);
    expect(r.ran).toHaveLength(1);
    expect(r.bodies[1].pending?.results).toEqual([{ id: 'c1', ok: true, says: 'list_problems ran', data: { n: 4 } }, { id: 'c2', ok: false, says: NOT_RUN }, { id: 'c3', ok: false, says: NOT_RUN }]);
    expect(end).toMatchObject({ ok: true, stopped: true });
  });

  it('the gateway off is said, and words said before it are kept', async () => {
    const r = rig([{ ok: true, reply: 'Looking…', calls: [{ id: 'c', name: 'list_problems', input: {} }] }, { ok: false, off: true, why: 'AI Mode is off for this account.' }]);
    const end = await colleagueLoop(ask, r.deps);
    expect(end).toMatchObject({ ok: false, off: true, why: 'AI Mode is off for this account.', reply: 'Looking…' });
  });

  it('reads the focus afresh each round', async () => {
    let n = 0;
    const r = rig([{ ok: true, reply: '', calls: [{ id: 'f', name: 'set_focus', input: {} }] }, { ok: true, reply: 'ok' }]);
    await colleagueLoop({ ...ask, focus: () => `round ${++n}` }, r.deps);
    expect(r.bodies.map(b => b.focus)).toEqual(['round 1', 'round 2']);
  });

  it('sends How I work with every round, read once; nothing when nothing is saved', async () => {
    let reads = 0;
    const r = rig([{ ok: true, reply: '', calls: [{ id: 'c1', name: 'list_problems', input: {} }] }, { ok: true, reply: 'Done.' }]);
    await colleagueLoop({ ...ask, preferences: () => { reads++; return 'The words I use:\nthe CW is the checkweigher'; } }, r.deps);
    expect(reads).toBe(1);
    expect(r.bodies.map(b => b.preferences)).toEqual(['The words I use:\nthe CW is the checkweigher', 'The words I use:\nthe CW is the checkweigher']);
    const none = rig([{ ok: true, reply: 'Hi.' }]);
    await colleagueLoop({ ...ask, preferences: () => '  ' }, none.deps);
    expect('preferences' in none.bodies[0]).toBe(false);
  });
});

describe('readAnswer', () => {
  it('keeps only calls with an id and a name, and at most three suggestions', () => {
    const a = readAnswer({ ok: true, reply: 'r', calls: [{ id: 'a', name: 'find', input: { words: 'x' } }, { name: 'nope' }], suggestions: ['1', '2', '3', '4'], model: 'm' });
    expect(a).toMatchObject({ ok: true, calls: [{ id: 'a', name: 'find', input: { words: 'x' } }], suggestions: ['1', '2', '3'] });
    expect(readAnswer({ off: true, why: 'off' })).toEqual({ ok: false, off: true, why: 'off' });
    expect(readAnswer(null)).toMatchObject({ ok: false });
  });
});
