import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { CapCtx } from '../types';
import { guessMapping } from '../../lib/lossEngine/importShiftCsv';

beforeEach(() => {
  vi.stubGlobal('indexedDB', new IDBFactory());
  vi.resetModules();
});

const fresh = async () => ({ db: await import('../../db'), reg: await import('../registry'), lines: await import('../../lib/lines') });
const ctx = (o: Partial<CapCtx> = {}): CapCtx => ({ now: Date.now(), ...o });
const call = (name: string, input: unknown) => ({ id: `c-${name}`, name, input });

describe('loss engine capabilities', () => {
  it('map → confirm → run → narrate on §2.2 fixture', async () => {
    const { db, reg, lines } = await fresh();
    const line = await lines.addLineToFactory('Line 7');
    await db.updateWorkspace({
      ...line,
      crew: 8,
      labourRatePerHour: 21.8,
      packsPerMin: 40,
      marginPerPack: 0.12,
      materialsPerPack: 0.37,
      lossEngineEconomics: {
        version: 1,
        savedAt: Date.now(),
        crew: 8,
        labourRatePerHour: 21.8,
        packsPerMin: 40,
        marginPerPack: 0.12,
        scrapPerReject: 0.37,
      },
    });
    const csv = readFileSync(join(__dirname, '../../../scripts/fixtures/loss-engine-v32-shift.csv'), 'utf8');
    const headers = csv.trim().split('\n')[0].split(',').map(h => h.trim());
    const convId = 'le-conv';
    await db.putStudy({
      id: convId,
      tool: 'talk',
      name: 'Loss test',
      facts: {
        colleague: true,
        lossShifts: [{
          id: 'lsh-test',
          name: 'loss-engine-v32-shift.csv',
          at: Date.now(),
          lineId: line.id,
          raw: csv,
          headers,
          mapping: guessMapping(headers),
          mappingConfirmed: false,
        }],
      } as never,
      uses: [],
      startedAt: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    const c = ctx({ conversationId: convId });

    const map = await reg.runCall(c, call('map_dataset', { lineId: line.id }), { confirmed: false });
    expect(map.ok).toBe(true);

    const conf = await reg.runCall(c, call('confirm_mapping', { lossShiftId: 'lsh-test', lineId: line.id }), { confirmed: true });
    expect(conf.ok).toBe(true);

    const run = await reg.runCall(c, call('run_loss_engine', { lossShiftId: 'lsh-test', lineId: line.id }), { confirmed: false });
    expect(run.ok).toBe(true);
    if (run.ok) expect((run.data as { report?: { oee: number } }).report?.oee).toBeCloseTo(0.6279375, 6);

    const narr = await reg.runCall(c, call('narrate_loss_report', { lossShiftId: 'lsh-test' }), { confirmed: false });
    expect(narr.ok).toBe(true);
    if (narr.ok) {
      expect(narr.says).toMatch(/Idle labour/);
      const nums = (narr.data as { narrativeFigures?: number[] }).narrativeFigures ?? [];
      expect(nums.length).toBeGreaterThan(5);
    }
  }, 30_000);
});