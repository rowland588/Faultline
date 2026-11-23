/* AI MODE's client loop with a fake gateway and a fake registry: reads and local steps run at once, a write waits for
 * the person, Not now is sent back as declined, a write the person may not make never becomes a card, the rounds stop
 * at six, the gateway off is said (src/colleague/colleagueAsk). */
import { describe, expect, it } from 'vitest';
import { CARRY_ON, JOB_MS, MAX_LEGS, MAX_ROUNDS, NOT_RUN, STOPPED, STOP_NOTE, TOO_MANY, carriedText, colleagueLoop, lookAgain, lookNotFinishedSaid, readAnswer, tooMany, type ColleagueBody, type GatewayAnswer, type LoopDeps, type Step } from '../colleagueAsk';
import { LOOK_AGAIN, lendsNothing } from '../figureCheck';
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
      { ok: true, reply: 'Four are open; 4 of them on Line 3.', suggestions: ['Which is oldest?'], model: 'm' },
    ]);
    const end = await colleagueLoop(ask, r.deps);
    /* every figure checked on the device (docs/LUNA-NEXT.md L1): 4 and 3 are small counts, not figures to check */
    expect(end).toMatchObject({ ok: true, reply: 'Four are open; 4 of them on Line 3.', suggestions: ['Which is oldest?'], unsure: [], checked: 0, rounds: 2 });
    expect(end).not.toHaveProperty('looked');
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
    /* (she says the same again when the app's check sends it back — the second look is tested below; here, what the check reads) */
    const again = { ok: true as const, reply: 'October came in 7.93% under plan; I made it 1,954 before.' };
    const one = rig([again, again]);
    const bare = await colleagueLoop({ ...ask, turns }, one.deps);
    expect(bare).toMatchObject({ ok: true, unsure: ['7.93%', '1,954'], checked: 2 });
    const two = rig([again, again]);
    const told = await colleagueLoop({ ...ask, turns, earlier: [{ says: 'Packs made against plan: −476,416 packs (−7.93%), below plan.' }] }, two.deps);
    expect(told).toMatchObject({ ok: true, unsure: ['1,954'], checked: 2 });
  });

  it('runs a local step at once, without asking', async () => {
    const r = rig([{ ok: true, reply: '', calls: [{ id: 'f', name: 'set_focus', input: { title: 'X' } }] }, { ok: true, reply: 'ok' }]);
    await colleagueLoop(ask, r.deps);
    expect(r.asked()).toBe(0);
    expect(r.ran[0].confirmed).toBe(false);
  });

  it('with a job open, two writes in one round share one card and one confirm', async () => {
    const job = { goal: 'Fix the line', startedAt: 1, steps: [{ what: 'Act', status: 'doing' as const }] };
    const KIND3 = { ...KINDS, fill_draft: { kind: 'write' as const, title: 'Fill the draft' } };
    const r = rig([{
      ok: true, reply: '', calls: [
        { id: 'w1', name: 'fill_draft', input: { draftId: 'd1' } },
        { id: 'w2', name: 'fill_draft', input: { draftId: 'd1', field: 'x', value: '1' } },
      ],
    }, { ok: true, reply: 'Done.' }], { confirm: true });
    r.deps.describe = n => KIND3[n as keyof typeof KIND3];
    r.deps.prepare = async call => ({ ok: true, title: 'Fill the draft', preview: `Preview ${call.id}`, input: call.input as Record<string, unknown> });
    let approved = false;
    r.deps.jobInHand = async () => job;
    r.deps.approveJobWrites = async () => { approved = true; };
    const end = await colleagueLoop(ask, r.deps);
    expect(r.asked()).toBe(1);
    expect(approved).toBe(true);
    expect(r.ran).toHaveLength(2);
    expect(r.ran.every(x => x.confirmed)).toBe(true);
    expect(r.steps.filter(s => s.status === 'waiting')).toHaveLength(1);
    expect(r.steps[0].batch?.callIds).toEqual(['w1', 'w2']);
    expect(end).toMatchObject({ ok: true });
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
    /* NOTHING IS THROWN AWAY (the audit, 21 November): the sixth round's step is run too — another go follows — and is handed on */
    expect(r.ran.map(x => (x.call.input as { n: number }).n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    /* the second go starts clean of the first's carry, with the first go as the conversation's own record and the app's line after it */
    expect(r.bodies[5].pending).toBeDefined();
    expect(r.bodies[6].pending).toBeUndefined();
    expect(r.bodies[6].turns).toHaveLength(3);
    expect(r.bodies[6].turns[1]).toMatchObject({ role: 'colleague', text: `Reading the workbook.\n\nNow the report.\n${Array.from({ length: 6 }, () => '[Problems on the register: list_problems ran]').join(' ')}` });
    expect(r.bodies[6].turns[2]).toMatchObject({ role: 'person', text: CARRY_ON });
    expect(r.bodies[7].pending).toEqual({ assistant: { round: 7 }, results: [{ id: 'c7', ok: true, says: 'list_problems ran', data: { n: 4 } }] });
    /* the app's line is never the person's words: a figure in it lends nothing, and none is in it */
    expect(CARRY_ON).not.toMatch(/\d/);
  });

  it('a go that got nothing done stops at six and says so — as it always did', async () => {
    const r = rig(Array.from({ length: 10 }, (_, i) => calling(i)), { fail: true });
    const end = await colleagueLoop(ask, r.deps);
    expect(r.bodies).toHaveLength(MAX_ROUNDS);
    /* every round's step was tried — the sixth too, since another go could have followed — and none got anything done */
    expect(r.ran).toHaveLength(MAX_ROUNDS);
    expect(end).toMatchObject({ ok: true, capped: true, rounds: MAX_ROUNDS, suggestions: ['Carry on'] });
    expect(end.ok && end.legs).toBeUndefined();
    expect(end.ok && end.reply).toContain(TOO_MANY);
  });

  it('a job that never ends is stopped after its goes — and says how far it got', async () => {
    const r = rig(Array.from({ length: 40 }, (_, i) => calling(i)));
    const end = await colleagueLoop(ask, r.deps);
    expect(r.bodies).toHaveLength(MAX_LEGS * MAX_ROUNDS);
    /* only the very last round's steps are left unrun: no go follows it, so nothing is done that she would never be told of */
    expect(r.ran).toHaveLength(MAX_LEGS * MAX_ROUNDS - 1);
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

/* THE SECOND LOOK (21 November — the audit of the loop: "she never checks her answer: the first reply without calls is final") */
describe('the second look: what the app’s check finds goes back to her, once', () => {
  const KIND2 = { ...KINDS, work_out: { kind: 'read' as const, title: 'Work out a figure' }, plan_job: { kind: 'local' as const, title: 'Plan the job' }, job_step: { kind: 'local' as const, title: 'A step of the job' } };
  const look = (answers: GatewayAnswer[], o: Parameters<typeof rig>[1] = {}) => { const r = rig(answers, o); r.deps.describe = n => KIND2[n as keyof typeof KIND2]; return r; };

  it('a figure found nowhere: her answer is sent back with the figure named, and what she says next takes its place', async () => {
    const r = look([
      { ok: true, reply: '', calls: [{ id: 'c1', name: 'list_problems', input: { lineId: 'L3' } }], assistant: { opaque: 1 } },
      { ok: true, reply: 'Four are open, 45 minutes between them.' },
      { ok: true, reply: 'Four are open. How long they have cost is not recorded.', suggestions: ['Which is oldest?'] },
    ]);
    const words: string[] = [];
    r.deps.onWords = t => { words.push(t); };
    const end = await colleagueLoop(ask, r.deps);
    expect(end).toMatchObject({ ok: true, reply: 'Four are open. How long they have cost is not recorded.', unsure: [], suggestions: ['Which is oldest?'], rounds: 3, looked: true });
    /* it is not a go of the job */
    expect(end).not.toHaveProperty('legs');
    /* the third ask: no pending, her first answer and what its step found handed on as the conversation's own record, then the app's line */
    const b = r.bodies[2];
    expect(b.pending).toBeUndefined();
    expect(b.turns.slice(-2).map(t => t.role)).toEqual(['colleague', 'person']);
    expect(b.turns[b.turns.length - 2].text).toBe('Four are open, 45 minutes between them.\n[Problems on the register: list_problems ran]');
    const note = b.turns[b.turns.length - 1].text;
    expect(note).toMatch(/^\(From the app's own check, not the person\./);
    expect(note).toContain('found nowhere in what the app worked out, what the person said or what you were told: 45.');
    expect(note).toContain('give the WHOLE answer again');
    expect(note).toBe(lookAgain({ unsure: ['45'] }));
    /* on the screen her first words are taken down before the answer that stands is written */
    expect(words).toContain('');
    expect(words[words.length - 1]).toBe('Four are open. How long they have cost is not recorded.');
    /* the turn's record says it was checked — with none of the figures in it, and named so that it lends nothing */
    const rec = r.steps[r.steps.length - 1];
    expect([rec.call.name, rec.title, rec.status, rec.kind]).toEqual([LOOK_AGAIN, 'Checked her answer', 'done', 'local']);
    expect(rec.says).toBe('The app could not trace a figure in her first answer and sent it back to be worked out or taken out. This is the answer she gave after that.');
    expect(rec.says).not.toMatch(/45/);
    expect(lendsNothing({ name: rec.call.name, says: rec.says })).toBe(true);
  });

  it('she works the figure out with the app in the second look: it is checked as the app’s own', async () => {
    const r = look([
      { ok: true, reply: 'That is 1,716 kg over the shift.' },
      { ok: true, reply: '', calls: [{ id: 'w1', name: 'work_out', input: { expression: '429 * 4' } }], assistant: { v: 2 } },
      { ok: true, reply: 'That is 1,716 kg over the shift.' },
    ]);
    r.deps.run = async () => ({ ok: true, says: 'Over the shift: 429 × 4 = 1,716 (worked out by the app).', refs: [], data: { value: 1716 } });
    const end = await colleagueLoop(ask, r.deps);
    expect(end).toMatchObject({ ok: true, reply: 'That is 1,716 kg over the shift.', unsure: [], checked: 1, rounds: 3, looked: true });
    expect(r.bodies[2].pending?.results[0]).toMatchObject({ id: 'w1', ok: true });
  });

  it('one look an answer: a figure still found nowhere after it is marked for the person, as before', async () => {
    const r = look([{ ok: true, reply: 'About 45 minutes.' }, { ok: true, reply: 'I make it 45 minutes.' }, { ok: true, reply: 'never asked' }]);
    const end = await colleagueLoop(ask, r.deps);
    expect(end).toMatchObject({ ok: true, reply: 'I make it 45 minutes.', unsure: ['45'], rounds: 2, looked: true });
    expect(r.bodies).toHaveLength(2);
  });

  it('never in the voice conversation — her words are already said aloud', async () => {
    const r = look([{ ok: true, reply: 'About 45 minutes.' }, { ok: true, reply: 'never asked' }]);
    const end = await colleagueLoop({ ...ask, spoken: true }, r.deps);
    expect(end).toMatchObject({ ok: true, reply: 'About 45 minutes.', unsure: ['45'], rounds: 1 });
    expect(end).not.toHaveProperty('looked');
  });

  it('never once the person has stopped her, nor past her time', async () => {
    const stopped = look([{ ok: true, reply: 'About 45 minutes.' }], { stopAtAsk: 1 });
    expect(await colleagueLoop(ask, stopped.deps)).toMatchObject({ ok: true, unsure: ['45'], rounds: 1 });
    const late = look([{ ok: true, reply: 'About 45 minutes.' }], { tick: JOB_MS });
    expect(await colleagueLoop(ask, late.deps)).toMatchObject({ ok: true, unsure: ['45'], rounds: 1 });
  });

  it('a plan she worked in this answer and left open: sent back once with the open steps named', async () => {
    const r = look([
      { ok: true, reply: '', calls: [{ id: 'p', name: 'plan_job', input: {} }], assistant: { v: 1 } },
      { ok: true, reply: 'Line 3 carries most of it.' },
      { ok: true, reply: '', calls: [{ id: 'j', name: 'job_step', input: { step: 2, status: 'done' } }], assistant: { v: 2 } },
      { ok: true, reply: 'Line 3 carries most of it, and the report is made.' },
    ]);
    let open: string | undefined = '2 “Write the report” (to do)';
    r.deps.run = async call => { if (call.name === 'job_step') open = undefined; return { ok: true, says: `${call.name} ran`, refs: [] }; };
    const seen: string[][] = [];
    const end = await colleagueLoop({ ...ask, unfinished: ran => { seen.push([...ran]); return open; } }, r.deps);
    expect(end).toMatchObject({ ok: true, reply: 'Line 3 carries most of it, and the report is made.', unsure: [], rounds: 4, looked: true });
    expect(seen[0]).toEqual(['plan_job']);
    const note = r.bodies[2].turns[r.bodies[2].turns.length - 1].text;
    expect(note).toBe(lookAgain({ unsure: [], open: '2 “Write the report” (to do)' }));
    expect(note).toContain('Your plan still has steps open: 2 “Write the report” (to do). Do them now');
    expect(r.steps.find(x => x.call.name === LOOK_AGAIN)?.says).toBe('Her plan still had steps open, and she was sent back to finish or account for them. This is the answer she gave after that.');
  });

  it('an answer that ends by asking the person something is waiting on them, not unfinished', async () => {
    const r = look([{ ok: true, reply: 'Before I price it: is the 35p a pack the margin or the selling price?' }]);
    let asked = 0;
    const end = await colleagueLoop({ ...ask, unfinished: () => { asked++; return '2 “Price it” (to do)'; } }, r.deps);
    expect(end).toMatchObject({ ok: true, rounds: 1 });
    expect(end).not.toHaveProperty('looked');
    expect(asked).toBe(0);
  });

  it('both at once are one look: the figures and the open steps in the same line', async () => {
    const r = look([{ ok: true, reply: 'About 45 minutes lost.' }, { ok: true, reply: 'What was lost is not recorded.' }]);
    await colleagueLoop({ ...ask, unfinished: () => '3 “Check it” (doing)' }, r.deps);
    const note = r.bodies[1].turns[r.bodies[1].turns.length - 1].text;
    expect(note).toBe(lookAgain({ unsure: ['45'], open: '3 “Check it” (doing)' }));
    expect(r.bodies).toHaveLength(2);
  });
});

describe('…and her first answer is never lost to a look that did not come back (22 November)', () => {
  const KIND2 = { ...KINDS, work_out: { kind: 'read' as const, title: 'Work out a figure' } };
  const look = (answers: GatewayAnswer[], o: Parameters<typeof rig>[1] = {}) => { const r = rig(answers, o); r.deps.describe = n => KIND2[n as keyof typeof KIND2]; return r; };
  const NOT_FINISHED = 'The app could not trace a figure in her first answer and sent it back to be worked out or taken out. The check was not finished, so this is her first answer — the figures marked are still to check.';

  it('the look’s ask is refused: her first answer stands, marked as it would have been — and the record says the check was not finished', async () => {
    const r = look([{ ok: true, reply: 'About 45 minutes.', suggestions: ['By reason?'], model: 'm' }, { ok: false, why: '120 asks in a day is the allowance.' }]);
    const words: string[] = [];
    r.deps.onWords = t => { words.push(t); };
    const end = await colleagueLoop(ask, r.deps);
    expect(end).toMatchObject({ ok: true, reply: 'About 45 minutes.', suggestions: ['By reason?'], unsure: ['45'], rounds: 2, model: 'm' });
    for (const k of ['looked', 'stopped', 'capped', 'legs', 'why']) expect(end).not.toHaveProperty(k);
    /* taken off the screen for the look — and put back */
    expect(words).toContain('');
    expect(words[words.length - 1]).toBe('About 45 minutes.');
    /* ONE record of the look, by its id: the one that said "this is the answer she gave after that" is put right */
    const recs = r.steps.filter(x => x.call.name === LOOK_AGAIN);
    expect(recs.map(x => x.status)).toEqual(['done', 'failed']);
    expect(new Set(recs.map(x => x.call.id)).size).toBe(1);
    expect(recs[1].says).toBe(NOT_FINISHED);
    expect(recs[1].says).not.toMatch(/45/);
    expect(lookNotFinishedSaid({ unsure: ['45'] })).toBe(NOT_FINISHED);
    expect(lendsNothing({ name: recs[1].call.name, says: recs[1].says })).toBe(true);
  });

  it('no signal during the look: the same — an answer already given is not turned into a failed turn', async () => {
    const r = look([{ ok: true, reply: 'About 45 minutes.' }, { ok: false, why: 'No signal', offline: true }]);
    const end = await colleagueLoop(ask, r.deps);
    expect(end).toMatchObject({ ok: true, reply: 'About 45 minutes.', unsure: ['45'], rounds: 2 });
    expect(end).not.toHaveProperty('offline');
  });

  it('stopped during the look: the first answer stands with the Stop sentence under it — and what her steps in the look worked out counts', async () => {
    const r = look([
      { ok: true, reply: 'That is 1,716 kg over the shift.', suggestions: ['And over a week?'] },
      { ok: true, reply: 'Let me get that from the app.', calls: [{ id: 'w1', name: 'work_out', input: { expression: '429 * 4' } }], assistant: { v: 2 } },
      { ok: true, reply: 'I had worked it out again.', calls: [{ id: 'x', name: 'list_problems', input: {} }] },
    ], { stopAfter: 1 });
    r.deps.run = async (call, confirmed) => { r.ran.push({ call, confirmed }); return { ok: true, says: 'Over the shift: 429 × 4 = 1,716 (worked out by the app).', refs: [], data: { value: 1716 } }; };
    const end = await colleagueLoop(ask, r.deps);
    expect(end).toMatchObject({ ok: true, reply: `That is 1,716 kg over the shift.\n\n${STOPPED}`, stopped: true, unsure: [], checked: 1, suggestions: ['Carry on', 'And over a week?'], rounds: 3 });
    expect(end).not.toHaveProperty('looked');
    /* the step she ran in the look ran once; what she asked for after Stop did not */
    expect(r.ran.map(x => x.call.id)).toEqual(['w1']);
    expect(r.bodies[2].focus).toContain(STOP_NOTE);
    expect(r.steps.filter(x => x.call.name === LOOK_AGAIN).map(x => x.status)).toEqual(['done', 'failed']);
  });

  it('stopped before the look’s first ask has gone: the first answer, and the Stop sentence', async () => {
    /* Stop is pressed while the app is handing her answer back — after the look was decided on, before she is asked */
    const r = look([{ ok: true, reply: 'About 45 minutes.' }]);
    let pressed = false;
    r.deps.stopped = () => pressed;
    const onStep = r.deps.onStep;
    r.deps.onStep = async s => { await onStep(s); if (s.call.name === LOOK_AGAIN && s.status === 'done') pressed = true; };
    const end = await colleagueLoop(ask, r.deps);
    expect(end).toMatchObject({ ok: true, reply: `About 45 minutes.\n\n${STOPPED}`, stopped: true, unsure: ['45'], rounds: 1 });
    expect(r.bodies).toHaveLength(1);
  });

  it('the look’s go runs out with nothing done: the first answer stands, and she says she stopped', async () => {
    const r = look([
      { ok: true, reply: 'About 45 minutes.' },
      ...Array.from({ length: MAX_ROUNDS }, (_, i): GatewayAnswer => ({ ok: true, reply: '', calls: [{ id: `c${i}`, name: 'list_problems', input: {} }], assistant: { v: i } })),
    ], { fail: true });
    const end = await colleagueLoop(ask, r.deps);
    expect(end).toMatchObject({ ok: true, reply: `About 45 minutes.\n\n${tooMany(1 + MAX_ROUNDS)}`, capped: true, unsure: ['45'], suggestions: ['Carry on'], rounds: 1 + MAX_ROUNDS });
    expect(end).not.toHaveProperty('looked');
    expect(r.steps.filter(x => x.call.name === LOOK_AGAIN).map(x => x.status)).toEqual(['done', 'failed']);
  });

  it('sent back and she says nothing: the answer she had given stands', async () => {
    const r = look([{ ok: true, reply: 'About 45 minutes.', suggestions: ['By reason?'] }, { ok: true, reply: '  ' }]);
    const end = await colleagueLoop(ask, r.deps);
    expect(end).toMatchObject({ ok: true, reply: 'About 45 minutes.', suggestions: ['By reason?'], unsure: ['45'], rounds: 2 });
    expect(end).not.toHaveProperty('looked');
    expect(r.steps.filter(x => x.call.name === LOOK_AGAIN).map(x => x.status)).toEqual(['done', 'failed']);
  });

  it('a plan left open, sent back, then stopped: the record says so with no figures marked to check', async () => {
    const r = look([{ ok: true, reply: 'Line 3 carries most of it.' }, { ok: false, why: 'Busy.' }]);
    const end = await colleagueLoop({ ...ask, unfinished: () => '2 “Write the report” (to do)' }, { ...r.deps, describe: n => ({ ...KIND2, plan_job: { kind: 'local' as const, title: 'Plan the job' } })[n as 'plan_job'] });
    expect(end).toMatchObject({ ok: true, reply: 'Line 3 carries most of it.', unsure: [] });
    expect(r.steps[r.steps.length - 1].says).toBe('Her plan still had steps open, and she was sent back to finish or account for them. The check was not finished, so this is her first answer.');
  });

  it('a look that comes back whole is unchanged: the second answer is the answer, and the record stays as it was', async () => {
    const r = look([{ ok: true, reply: 'About 45 minutes.' }, { ok: true, reply: 'How long is not recorded.' }]);
    const end = await colleagueLoop(ask, r.deps);
    expect(end).toMatchObject({ ok: true, reply: 'How long is not recorded.', unsure: [], looked: true });
    expect(r.steps.filter(x => x.call.name === LOOK_AGAIN).map(x => x.status)).toEqual(['done']);
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
