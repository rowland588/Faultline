import { beforeEach, describe, expect, it, vi } from 'vitest';
import { isMailOwner, sendOwnerMail } from '../luna-mail/server';
import { sendBriefing } from './briefing';
import { activatedBeforeDue, due, periodKey } from './clock';
import { periodKey as browserPeriod } from '../../../src/lib/standingJob/schedule';

vi.mock('../luna-mail/server', () => ({ isMailOwner: vi.fn(), sendOwnerMail: vi.fn() }));
const job = { id: 'job', owner_id: 'owner', client: 'Acme', scope: { email: { to: 'shift@example.test' } } };
beforeEach(() => { vi.resetAllMocks(); vi.mocked(isMailOwner).mockResolvedValue(true); });

describe('app-closed schedule', () => {
  it('uses the selected owner and customer and the same delivery key for every tick in a period', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: 'Active lines (1): A\nOpen problems: 2', error: null });
    const db = { rpc } as unknown as Parameters<typeof sendBriefing>[0];
    await sendBriefing(db, job, '2026-W48');
    await sendBriefing(db, job, '2026-W48');
    expect(rpc).toHaveBeenCalledWith('luna_mail_line_briefing', { p_owner: 'owner', p_client: 'Acme' });
    for (const call of vi.mocked(sendOwnerMail).mock.calls) {
      expect(call[2]).toBe('schedule/owner/job/2026-W48');
      expect(call[3]).toMatchObject({ to: 'shift@example.test', subject: 'Luna briefing — Acme', body: expect.stringContaining('Open problems: 2') });
    }
    expect(sendOwnerMail).toHaveBeenCalledTimes(2);
  });
  it('sends the approved recurring text without looking up other data and rechecks owner permission', async () => {
    const rpc = vi.fn();
    const db = { rpc } as unknown as Parameters<typeof sendBriefing>[0];
    const fixed = { ...job, scope: { email: { ...job.scope.email, message: 'Shift meeting at eight.' } } };
    await sendBriefing(db, fixed, '2026-11-25');
    expect(rpc).not.toHaveBeenCalled();
    expect(sendOwnerMail).toHaveBeenCalledWith(db, 'owner', 'schedule/owner/job/2026-11-25', expect.objectContaining({ body: 'Shift meeting at eight.' }));
    vi.mocked(isMailOwner).mockResolvedValue(false);
    await expect(sendBriefing(db, fixed, '2026-11-26')).rejects.toThrow('owner');
    expect(sendOwnerMail).toHaveBeenCalledTimes(1);
  });
  it('never emails an empty or failed data read', async () => {
    const db = { rpc: vi.fn().mockResolvedValue({ error: { message: 'offline' } }) } as unknown as Parameters<typeof sendBriefing>[0];
    await expect(sendBriefing(db, job, '2026-W48')).rejects.toThrow('read');
    expect(sendOwnerMail).not.toHaveBeenCalled();
  });
  it('keeps the cloud clock and device in the same period during London daylight saving and year changes', () => {
    for (const date of ['2025-12-29T10:00Z', '2026-11-25T10:00Z', '2026-07-05T23:01Z']) {
      for (const cadence of ['daily', 'weekly'] as const) expect(periodKey(cadence, Date.parse(date))).toBe(browserPeriod(cadence, Date.parse(date)));
    }
    const weekly = { schedule: 'weekly', weekday: 1, hour: 8, minute: 0, last_period_key: null };
    expect(due(weekly, Date.parse('2026-07-06T06:59Z'))).toBe(false);
    expect(due(weekly, Date.parse('2026-07-06T07:00Z'))).toBe(true);
    expect(activatedBeforeDue(weekly, Date.parse('2026-07-06T08:00Z'), Date.parse('2026-07-06T08:05Z'))).toBe(false);
    expect(activatedBeforeDue(weekly, Date.parse('2026-07-06T08:00Z'), Date.parse('2026-07-13T07:05Z'))).toBe(true);
  });
});
