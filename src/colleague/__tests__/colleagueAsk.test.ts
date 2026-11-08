/* AI MODE's client loop with a fake gateway and a fake registry: reads and local steps run at once, a write waits for
 * the person, Not now is sent back as declined, a write the person may not make never becomes a card, the rounds stop
 * at six, the gateway off is said (src/colleague/colleagueAsk). */
import { describe, expect, it } from 'vitest';
import { MAX_ROUNDS, TOO_MANY, colleagueLoop, readAnswer, type ColleagueBody, type GatewayAnswer, type LoopDeps, type Step } from '../colleagueAsk';
import type { CapCall, CapResult } from '../../capabilities/types';

const KINDS: Record<string, { kind: 'read' | 'write' | 'local'; title: string }> = {
  list_problems: { kind: 'read', title: 'Problems on the register' },
  set_focus: { kind: 'local', title: 'Change the subject' },
  raise_problem: { kind: 'write', title: 'Raise a problem' },
};

function rig(answers: GatewayAnswer[], o: { confirm?: boolean; allowed?: boolean } = {}) {
  const bodies: ColleagueBody[] = [];
  const ran: { call: CapCall; confirmed: boolean }[] = [];
  const steps: Step[] = [];
  let asked = 0;
  const deps: LoopDeps = {
    invoke: async b => { bodies.push(JSON.parse(JSON.stringify(b))); return answers.shift() ?? { ok: true, reply: 'end' }; },
    describe: n => KINDS[n],
    run: async (call, confirmed): Promise<CapResult> => { ran.push({ call, confirmed }); return { ok: true, says: `${call.name} ran`, refs: [{ kind: 'line', id: 'L3', label: 'Line 3', href: '/lines/L3' }], data: { n: 4 } }; },
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
      { ok: true, reply: 'Four are open.', suggestions: ['Which is oldest?'], unsure: ['45'], model: 'm' },
    ]);
    const end = await colleagueLoop(ask, r.deps);
    expect(end).toMatchObject({ ok: true, reply: 'Four are open.', suggestions: ['Which is oldest?'], unsure: ['45'], rounds: 2 });
    expect(r.ran).toEqual([{ call: { id: 'c1', name: 'list_problems', input: { lineId: 'L3' } }, confirmed: false }]);
    expect(r.bodies[0]).toMatchObject({ task: 'colleague', focus: 'Current: Line 3', today: 'Sunday 8 November 2026' });
    expect(r.bodies[0].pending).toBeUndefined();
    expect(r.bodies[1].pending).toEqual({ assistant: { opaque: 1 }, results: [{ id: 'c1', ok: true, says: 'list_problems ran', data: { n: 4 } }] });
    expect(r.steps.map(s => [s.title, s.status])).toEqual([['Problems on the register', 'done']]);
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

  it('stops after six rounds and says so', async () => {
    const forever: GatewayAnswer[] = Array.from({ length: 10 }, (_, i) => ({ ok: true, reply: '', calls: [{ id: `c${i}`, name: 'list_problems', input: {} }] }));
    const r = rig(forever);
    const end = await colleagueLoop(ask, r.deps);
    expect(r.bodies).toHaveLength(MAX_ROUNDS);
    expect(r.ran).toHaveLength(MAX_ROUNDS - 1);
    expect(end).toMatchObject({ ok: true, capped: true, rounds: MAX_ROUNDS });
    expect(end.ok && end.reply).toContain(TOO_MANY);
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
