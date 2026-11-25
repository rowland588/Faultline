import { expect, it, vi } from 'vitest';
import { archivedMailCustomers } from './customerArchive';

it('checks every live story for this owner, including a later page with an active story', async () => {
  const rows = Array.from({ length: 500 }, () => ({ client: 'Archived', stamp: 10 }));
  rows[0] = { client: 'Still active', stamp: 15 };
  const db = { from: vi.fn(), select: vi.fn(), eq: vi.fn(), is: vi.fn(), order: vi.fn(), range: vi.fn() };
  for (const method of [db.from, db.select, db.eq, db.is, db.order]) method.mockReturnValue(db);
  db.range.mockResolvedValueOnce({ data: rows }).mockResolvedValueOnce({ data: [{ client: 'Still active', stamp: null }] });
  const archived = await archivedMailCustomers(db as never, 'account');
  expect(db.eq).toHaveBeenCalledWith('owner_id', 'account');
  expect(db.is).toHaveBeenCalledWith('deleted_at', null);
  expect(archived(' ARCHIVED ')).toBe(true);
  expect(archived('Still active')).toBe(false);
  expect(archived('Unknown')).toBe(false);
  db.range.mockResolvedValueOnce({ error: 'unavailable' });
  await expect(archivedMailCustomers(db as never, 'account')).rejects.toThrow();
});
