import { describe, expect, it, vi } from 'vitest';
import { deliver, validMail, type DeliveryStore, type Reservation } from './resend';

const mail = { to: 'recipient@example.test', subject: 'Shift handover', body: 'Please review line A.' };
const config = { apiKey: 'unit-test', from: 'Luna <luna@example.test>' };
const key = 'command/owner/confirmed-card';
function ledger() {
  let row: Reservation | undefined;
  const store: DeliveryStore = {
    async reserve(_key, _owner, payload) { return row ??= { created_at: new Date().toISOString(), payload, provider_id: null }; },
    async accept(_key, id) { if (row) { row.provider_id = id; row.payload = null; } },
  };
  return { store, read: () => row! };
}
describe('Resend delivery', () => {
  it('accepts once and keeps its receipt across retries', async () => {
    const { store, read } = ledger();
    const post = vi.fn(async () => Response.json({ id: 'mail-id' }));
    expect(await deliver(store, 'owner', key, mail, config, post)).toBe('mail-id');
    expect(await deliver(store, 'owner', key, mail, config, post)).toBe('mail-id');
    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith('https://api.resend.com/emails', expect.objectContaining({
      headers: expect.objectContaining({ 'Idempotency-Key': key }), body: JSON.stringify({ from: config.from, to: [mail.to], subject: mail.subject, text: mail.body }),
    }));
    expect(read().payload).toBeNull();
  });
  it('retries the original body after a lost response, including its attachment', async () => {
    const { store } = ledger();
    const chart = { ...mail, attachments: [{ name: 'Downtime.svg', contentType: 'image/svg+xml', bytes: 'YQ==' }] };
    const failed = vi.fn(async () => { throw new Error('timeout'); });
    await expect(deliver(store, 'owner', key, chart, config, failed)).rejects.toThrow('timeout');
    await expect(deliver(store, 'owner', key, { ...mail, to: 'different@example.test' }, config, failed)).rejects.toThrow('different recipient');
    const again = vi.fn(async () => Response.json({ id: 'retried' }));
    await deliver(store, 'owner', key, { ...mail, body: 'New figures' }, config, again);
    expect(again).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ body: expect.stringContaining('Downtime.svg') }));
    expect(again).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ body: expect.stringContaining(mail.body) }));
  });
  it('does not send when unconfigured, expired or invalid and never records a rejected send as accepted', async () => {
    const { store, read } = ledger();
    const post = vi.fn(async () => new Response(null, { status: 403 }));
    await expect(deliver(store, 'owner', key, mail, { from: config.from }, post)).rejects.toThrow('sending key');
    expect(post).not.toHaveBeenCalled();
    await expect(deliver(store, 'owner', key, mail, config, post)).rejects.toThrow('403');
    expect(read().provider_id).toBeNull();
    read().created_at = new Date(0).toISOString();
    await expect(deliver(store, 'owner', key, mail, config, post)).rejects.toThrow('retry window');
    expect(post).toHaveBeenCalledTimes(1);
    expect(validMail({ ...mail, to: mail.to + ',second@example.test' })).toBe(false);
    expect(validMail({ ...mail, subject: 'Subject\r\nOther' })).toBe(false);
  });
});
