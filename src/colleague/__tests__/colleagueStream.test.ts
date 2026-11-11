/* AI MODE's reply AS IT IS WRITTEN (11 November, docs/AI-MODE.md): the colleague's stream read — words split across chunks
 * and inside a character, a round asked again, the one final event, a stream cut off — and invokeColleague asking as a stream,
 * falling back to the plain ask once when the stream fails; the loop growing the words and keeping its timing. */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const invoke = vi.fn();
vi.mock('../../cloud/client', () => ({ supabase: { functions: { invoke: (...a: unknown[]) => invoke(...a) } }, cloudConfigured: true }));

const { colleagueLoop, growingReply, invokeColleague, readColleagueStream } = await import('../colleagueAsk');

const enc = new TextEncoder();
/** A stream of the given byte chunks; `fail` makes the read after the last chunk throw. */
function streamOf(chunks: (string | Uint8Array)[], fail = false): ReadableStream<Uint8Array> {
  let i = 0;
  return new ReadableStream<Uint8Array>({
    pull(ctrl) {
      if (i < chunks.length) { const c = chunks[i++]; ctrl.enqueue(typeof c === 'string' ? enc.encode(c) : c); return; }
      if (fail) ctrl.error(new Error('connection reset')); else ctrl.close();
    },
  });
}
const ev = (o: unknown) => `data: ${JSON.stringify(o)}\n\n`;
const FINAL = { ok: true, reply: 'Line 7 has two open problems. The jam costs most.', suggestions: ['Time it'], unsure: [], model: 'm' };

describe('the colleague stream read', () => {
  it('grows the words from deltas split across chunks — even inside a character — and returns the one final event', async () => {
    const all = ev({ delta: 'Line 7 has two ' }) + ev({ delta: 'open problems. Café ' }) + ev({ delta: 'next.' }) + ev(FINAL);
    const bytes = enc.encode(all);
    /* cut in odd places, one inside the two bytes of é */
    const at = all.indexOf('é');
    const cut = enc.encode(all.slice(0, at)).length + 1;
    const pieces = [bytes.slice(0, 7), bytes.slice(7, cut), bytes.slice(cut, cut + 30), bytes.slice(cut + 30)];
    const seen: string[] = [];
    const r = await readColleagueStream(streamOf(pieces), s => seen.push(s));
    expect(seen).toEqual(['Line 7 has two ', 'Line 7 has two open problems. Café ', 'Line 7 has two open problems. Café next.']);
    expect(r).toEqual({ final: FINAL, texted: true });
  });

  it('a round asked again starts its words again', async () => {
    const seen: string[] = [];
    const r = await readColleagueStream(streamOf([ev({ delta: 'Let me look' }), ev({ restart: true }), ev({ delta: 'Two are open.' }), ev(FINAL)]), s => seen.push(s));
    expect(seen).toEqual(['Let me look', '', 'Two are open.']);
    expect(r.final).toEqual(FINAL);
  });

  it('a final event with no blank line after it is still read; a stream with no final gives null', async () => {
    expect((await readColleagueStream(streamOf([ev({ delta: 'a' }), `data: ${JSON.stringify(FINAL)}`]), () => undefined)).final).toEqual(FINAL);
    expect(await readColleagueStream(streamOf([ev({ delta: 'a' })]), () => undefined)).toEqual({ final: null, texted: true });
    expect(await readColleagueStream(null, () => undefined)).toEqual({ final: null, texted: false });
  });

  it('an error mid-stream is thrown to the caller, the words so far already handed on', async () => {
    const seen: string[] = [];
    await expect(readColleagueStream(streamOf([ev({ delta: 'Line 7 ' })], true), s => seen.push(s))).rejects.toThrow('connection reset');
    expect(seen).toEqual(['Line 7 ']);
  });

  it('the words shown leave off a follow-ups line, finished or still being written', () => {
    expect(growingReply('Two are open.\nSuggestions: Time it | Park it')).toBe('Two are open.');
    expect(growingReply('Two are open.\nSugg')).toBe('Two are open.');
    expect(growingReply('Two are open.\nSuggestions:')).toBe('Two are open.');
    expect(growingReply('Two are open.\nSure enough')).toBe('Two are open.\nSure enough');
  });
});

describe('invokeColleague, as a stream', () => {
  beforeEach(() => { invoke.mockReset(); vi.stubGlobal('navigator', { onLine: true }); });
  const body = { task: 'colleague' as const, turns: [{ role: 'person' as const, text: 'What is open?', at: 'now' }], today: 'today' };

  it('asks with stream: true, hands on the words and reads the final event as the plain answer', async () => {
    invoke.mockResolvedValueOnce({ data: new Response(streamOf([ev({ delta: 'Line 7 has two open problems. ' }), ev({ delta: 'The jam costs most.\nSugg' }), ev(FINAL)])), error: null });
    const seen: string[] = [];
    const a = await invokeColleague(body, s => seen.push(s));
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(invoke.mock.calls[0][1].body.stream).toBe(true);
    expect(seen).toEqual(['Line 7 has two open problems.', 'Line 7 has two open problems. The jam costs most.']);
    expect(a).toMatchObject({ ok: true, reply: FINAL.reply, suggestions: ['Time it'] });
  });

  it('a stream cut off is asked once more whole — the words shown taken back, stream not sent', async () => {
    invoke.mockResolvedValueOnce({ data: new Response(streamOf([ev({ delta: 'Line 7 ' })], true)), error: null });
    invoke.mockResolvedValueOnce({ data: FINAL, error: null });
    const seen: string[] = [];
    const a = await invokeColleague(body, s => seen.push(s));
    expect(invoke).toHaveBeenCalledTimes(2);
    expect(invoke.mock.calls[1][1].body.stream).toBeUndefined();
    expect(seen).toEqual(['Line 7', '']);
    expect(a).toMatchObject({ ok: true, reply: FINAL.reply });
  });

  it('a stream with no final event, or a fetch that fails, falls back once; a refusal before the model is an answer', async () => {
    invoke.mockResolvedValueOnce({ data: new Response(streamOf([ev({ delta: 'x' })])), error: null });
    invoke.mockResolvedValueOnce({ data: { ok: false, why: 'Busy.' }, error: null });
    expect(await invokeColleague(body, () => undefined)).toEqual({ ok: false, why: 'Busy.' });
    expect(invoke).toHaveBeenCalledTimes(2);

    invoke.mockReset();
    invoke.mockResolvedValueOnce({ data: null, error: Object.assign(new Error('x'), { name: 'FunctionsRelayError' }) });
    invoke.mockResolvedValueOnce({ data: FINAL, error: null });
    expect(await invokeColleague(body, () => undefined)).toMatchObject({ ok: true });
    expect(invoke).toHaveBeenCalledTimes(2);

    /* the allowance spent: JSON, no stream — never asked twice */
    invoke.mockReset();
    invoke.mockResolvedValueOnce({ data: { ok: false, why: 'Today’s allowance is used.' }, error: null });
    expect(await invokeColleague(body, () => undefined)).toEqual({ ok: false, why: 'Today’s allowance is used.' });
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it('without onText it asks whole, as it always did', async () => {
    invoke.mockResolvedValueOnce({ data: FINAL, error: null });
    await invokeColleague(body);
    expect(invoke.mock.calls[0][1].body.stream).toBeUndefined();
  });
});

describe('the loop with the words growing', () => {
  it('shows each round’s words as written after the earlier rounds’, checks the figures once complete, and keeps its timing', async () => {
    let clock = 1000;
    const shown: string[] = [];
    const answers = [
      { ok: true as const, reply: 'Let me look.', calls: [{ id: 'c1', name: 'list_problems', input: {} }], assistant: {} },
      { ok: true as const, reply: 'Two are open, 45 minutes lost.' },
    ];
    let round = 0;
    const end = await colleagueLoop({ turns: [{ role: 'person', text: 'What is open?', at: 'now' }], focus: () => '', today: 'today' }, {
      invoke: async (_b, onText) => {
        const a = answers[round++];
        clock += 100;
        onText?.(a.reply.slice(0, 5));
        clock += 50;
        onText?.(a.reply);
        clock += 10;
        return a;
      },
      describe: () => ({ kind: 'read', title: 'Problems' }),
      run: async () => ({ ok: true, says: 'Two problems.', refs: [], data: { n: 2 } }),
      prepare: async () => ({ ok: false, title: '', why: '' }),
      confirm: async () => false,
      onStep: () => undefined,
      onWords: w => { shown.push(w); },
      now: () => clock,
    });
    expect(shown).toContain('Let m');
    expect(shown).toContain('Let me look.\n\nTwo a');
    expect(end).toMatchObject({ ok: true, reply: 'Let me look.\n\nTwo are open, 45 minutes lost.', unsure: ['45'], timing: { firstTextMs: 100, completeMs: 320, rounds: 2 } });
  });
});
