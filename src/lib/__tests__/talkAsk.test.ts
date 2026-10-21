/* LINE TALK'S ANSWER AS IT IS WRITTEN (lib/talkAsk readTalkStream): the
 * gateway's server-sent events read whatever way the network cuts them — each
 * reply-so-far handed on in order, the finished answer returned, a stream cut
 * off before its end said as none. */
import { describe, expect, it } from 'vitest';
import { readTalkStream, type SoFar } from '../talkAsk';

const ev = (o: unknown) => `data: ${JSON.stringify(o)}\n\n`;
const streamOf = (chunks: string[]) => {
  const enc = new TextEncoder();
  return new ReadableStream<Uint8Array>({ start(c) { for (const ch of chunks) c.enqueue(enc.encode(ch)); c.close(); } });
};
const FINAL = { ok: true, answer: { reply: 'Has it been wandering since the reel change?' }, unsure: [], model: 'm' };
const WHOLE = ev({ partial: '', document: false }) + ev({ partial: 'Has it been', document: false }) + ev({ partial: 'Has it been wandering since the reel change?', document: false }) + ev(FINAL);

describe('the answer as it is written', () => {
  it('each reply so far in order, then the finished answer', async () => {
    const seen: SoFar[] = [];
    expect(await readTalkStream(streamOf([WHOLE]), p => seen.push(p))).toEqual(FINAL);
    expect(seen.map(p => p.reply)).toEqual(['', 'Has it been', 'Has it been wandering since the reel change?']);
  });
  it('cut anywhere by the network — mid-event, mid-word, mid-character — read the same', async () => {
    const bytes = new TextEncoder().encode(WHOLE.split('reel').join('réel'));
    for (const size of [1, 3, 7, 50]) {
      const seen: string[] = [];
      const body = new ReadableStream<Uint8Array>({ start(c) { for (let i = 0; i < bytes.length; i += size) c.enqueue(bytes.slice(i, i + size)); c.close(); } });
      const got = await readTalkStream(body, p => seen.push(p.reply)) as typeof FINAL;
      expect(got.answer.reply).toBe('Has it been wandering since the réel change?');
      expect(seen[seen.length - 1]).toBe('Has it been wandering since the réel change?');
    }
  });
  it('a document being written ahead of the reply said so', async () => {
    const seen: SoFar[] = [];
    await readTalkStream(streamOf([ev({ partial: '', document: true }), ev({ partial: 'Here is the report.', document: true }), ev(FINAL)]), p => seen.push(p));
    expect(seen).toEqual([{ reply: '', document: true }, { reply: 'Here is the report.', document: true }]);
  });
  it('a stream cut off before the finished answer is none; a refusal at its end is returned as said', async () => {
    expect(await readTalkStream(streamOf([ev({ partial: 'Has it', document: false })]), () => undefined)).toBeNull();
    expect(await readTalkStream(streamOf([ev({ ok: false, why: 'Line Talk is busy — ask again in a minute.' })]), () => undefined)).toEqual({ ok: false, why: 'Line Talk is busy — ask again in a minute.' });
    expect(await readTalkStream(null, () => undefined)).toBeNull();
  });
});
