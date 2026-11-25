import { expect, it, vi } from 'vitest';
import { canReviewCustomers } from '../ownerReview';

const db = vi.hoisted(() => ({
  auth: { getUser: vi.fn() }, from: vi.fn(), select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn(),
}));
vi.mock('../../cloud/client', () => ({ supabase: db }));

it('checks the authenticated user and their server-owned role for each request', async () => {
  const ctx = { now: 1, userId: 'owner', isSuper: true, email: 'owner@example.test' };
  db.from.mockReturnValue(db); db.select.mockReturnValue(db); db.eq.mockReturnValue(db);
  expect(await canReviewCustomers({ now: 1, isSuper: true })).toBe(false);
  db.auth.getUser.mockResolvedValue({ data: { user: { id: 'someone-else' } } });
  expect(await canReviewCustomers(ctx)).toBe(false);
  expect(db.from).not.toHaveBeenCalled();
  db.auth.getUser.mockResolvedValue({ data: { user: { id: 'owner' } } });
  db.maybeSingle.mockResolvedValueOnce({ data: { is_super: false } }).mockResolvedValueOnce({ data: { is_super: true } });
  expect(await canReviewCustomers({ ...ctx })).toBe(false);
  expect(await canReviewCustomers({ ...ctx })).toBe(true);
  expect(db.eq).toHaveBeenCalledWith('id', 'owner');
  db.auth.getUser.mockRejectedValue(new Error('offline'));
  expect(await canReviewCustomers({ ...ctx })).toBe(false);
});
