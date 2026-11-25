import { readFileSync } from 'node:fs';
import { beforeEach, expect, it, vi } from 'vitest';
import { CONNECTION_CHECKS, inspectWorkbook } from '../connectionChecks';
import { fetchPublicLink } from '../link';

vi.mock('../link', () => ({ fetchPublicLink: vi.fn(), SAMPLE_LINK: 'https://example.test/demo.xlsx' }));
const workbook = () => new File([readFileSync('public/sample/Plan-and-actual-October.xlsx')], 'Plan-and-actual-October.xlsx');
const signal = new AbortController().signal;
beforeEach(() => { vi.mocked(fetchPublicLink).mockReset(); });

it('opens the real workbook index and verifies the sample sheets', async () => {
  vi.mocked(fetchPublicLink).mockResolvedValue(workbook());
  expect(await CONNECTION_CHECKS[0].run(signal)).toContain('Production, Downtime log, Products');
  expect(fetchPublicLink).toHaveBeenCalledWith('https://example.test/demo.xlsx', signal);
});
it('shows a changed public fixture or a failed download as a failed check', async () => {
  vi.mocked(fetchPublicLink).mockResolvedValueOnce(workbook()).mockRejectedValueOnce(new Error('Offline'));
  await expect(CONNECTION_CHECKS[1].run(signal)).rejects.toThrow('sample changed');
  await expect(CONNECTION_CHECKS[0].run(signal)).rejects.toThrow('Offline');
  await expect(inspectWorkbook(new File(['This is HTML'], 'file.xlsx'))).rejects.toThrow();
});
it('exercises guest access, refusal, and an expired session entirely through the simulated transport', async () => {
  expect(await CONNECTION_CHECKS[2].run()).toContain('Shift output');
  expect(await CONNECTION_CHECKS[3].run()).toContain('refused');
  expect(await CONNECTION_CHECKS[4].run()).toContain('expired');
  expect(fetchPublicLink).not.toHaveBeenCalled();
});
