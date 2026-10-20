/* THE CAMERA'S AI AT THE GATEWAY — what an answer costs, a person's day, and
 * the gateway's copies of the video files the same as the app's
 * (supabase/functions/assist, task `video-label`; docs/DIRECTION.md). */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { allowance, costMicros } from '../gatewayUsage';

describe('what naming the work costs, and the day’s allowance', () => {
  it('prices an answer by its model — cache reads at a tenth — and an unknown model as the dearest', () => {
    expect(costMicros('claude-opus-5-5', { input_tokens: 2100, output_tokens: 3400 })).toBe(Math.round((2100 * 4 + 3400 * 20)));
    expect(costMicros('claude-opus-5-5', { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 1_000_000 })).toBe(400_000);
    expect(costMicros('mystery', { input_tokens: 1_000_000 })).toBe(10_000_000);
  });

  it('holds a person to their day, by number and by cost', () => {
    const now = Date.parse('2026-10-20T12:00:00Z');
    const rows = Array.from({ length: 3 }, (_, i) => ({ at: new Date(now - i * 3_600_000).toISOString(), cost_micros: 500_000 }));
    expect(allowance(rows, now, { calls: 25, micros: 3_000_000 })).toMatchObject({ ok: true, used: { calls: 3, micros: 1_500_000 } });
    expect(allowance(rows, now, { calls: 3, micros: 3_000_000 })).toMatchObject({ ok: false, why: expect.stringMatching(/3 readings named in a day/) });
    expect(allowance(rows, now, { calls: 25, micros: 1_000_000 })).toMatchObject({ ok: false, why: expect.stringMatching(/allowance for naming the work is spent \(\$1\.00\)/) });
    expect(allowance([{ at: now - 2 * 86_400_000, cost_micros: 9e9 }], now, { calls: 1, micros: 1 })).toMatchObject({ ok: true });
  });
});

describe('the gateway’s copies', () => {
  it('are the app’s own files, word for word, with the .ts Deno asks for', () => {
    const root = process.cwd();
    for (const f of ['record', 'visionCore', 'gatewayUsage']) {
      const src = readFileSync(join(root, 'src/lib/video', `${f}.ts`), 'utf8');
      const copy = readFileSync(join(root, 'supabase/functions/assist/video', `${f}.ts`), 'utf8');
      const back = copy.split('\n').slice(1).join('\n').replace(/from '\.\/([A-Za-z]+)\.ts'/g, "from './$1'");
      expect(back, `video/${f}.ts differs from its copy — run node scripts/sync-assist.mjs`).toBe(src);
    }
  });
});
