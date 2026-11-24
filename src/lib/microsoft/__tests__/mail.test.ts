/* Graph sendMail as played — missing token said as Connect Outlook; nothing posted without a Mail.Send session (docs/LUNA-MAIL.md). */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MAIL_SCOPE, MAIL_SCOPES, SCOPES, explain, mailConnected, session } from '../auth';
import { CONNECT_SAYS, sendMail } from '../mail';

const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v); }, removeItem: (k: string) => { store.delete(k); } });
});

const keep = (mail: boolean) => {
  store.set('faultline.ms.session', JSON.stringify({ access: 'tok', expiresAt: Date.now() + 3_600_000, name: 'Pat', username: 'pat@x.test', ...(mail ? { mail: true } : {}) }));
};

describe('Mail.Send on the existing Entra app', () => {
  it('default file scopes stay without Mail.Send; Connect Outlook asks for it', () => {
    expect(SCOPES).not.toMatch(/Mail\.Send/);
    expect(MAIL_SCOPES.endsWith(` ${MAIL_SCOPE}`)).toBe(true);
    expect(MAIL_SCOPES).toContain(SCOPES);
  });
  it('Entra missing Mail.Send is said as the one tick', () => {
    expect(explain("AADSTS650053: The application asked for scope 'Mail.Send' that doesn't exist on the resource", 'https://faultline.opexelevate.co.uk/ms-auth.html'))
      .toMatch(/tick Mail\.Send/);
  });
});

describe('sendMail', () => {
  it('with no Outlook session, nothing is posted — Connect Outlook is said', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const r = await sendMail({ to: 'john@x.test', subject: 'Chart', body: 'Jam: 15' });
    expect(r).toEqual({ ok: false, why: CONNECT_SAYS, connect: true });
    expect(fetch).not.toHaveBeenCalled();
    expect(mailConnected()).toBe(false);
  });
  it('a files-only sign-in is not enough', async () => {
    keep(false);
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    expect(session()?.mail).toBeUndefined();
    const r = await sendMail({ to: 'john@x.test', subject: 'Chart', body: 'Jam: 15' });
    expect(r.ok).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('with a Mail.Send token, POST /me/sendMail as the person — 202 is sent', async () => {
    keep(true);
    const fetch = vi.fn(async () => ({ status: 202 }));
    vi.stubGlobal('fetch', fetch);
    const r = await sendMail({
      to: 'john@x.test', toName: 'John', subject: 'Downtime by category', body: 'Jam: 15',
      attachments: [{ name: 'chart.svg', contentType: 'image/svg+xml', bytes: 'YQ==' }],
    });
    expect(r).toEqual({ ok: true });
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = fetch.mock.calls[0] as unknown as [string, { method: string; headers: Record<string, string>; body: string }];
    expect(url).toBe('https://graph.microsoft.com/v1.0/me/sendMail');
    expect(init.method).toBe('POST');
    expect(init.headers.authorization).toBe('Bearer tok');
    const posted = JSON.parse(init.body) as { message: { subject: string; toRecipients: { emailAddress: { address: string } }[]; attachments: { name: string }[] }; saveToSentItems: boolean };
    expect(posted.saveToSentItems).toBe(true);
    expect(posted.message.subject).toBe('Downtime by category');
    expect(posted.message.toRecipients[0].emailAddress.address).toBe('john@x.test');
    expect(posted.message.attachments[0].name).toBe('chart.svg');
  });
  it('a lost response does not claim that nothing was sent or invite a duplicate', async () => {
    keep(true);
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network'); }));
    expect(await sendMail({ to: 'john@x.test', subject: 'Chart', body: 'Jam: 15' }))
      .toMatchObject({ ok: false, why: expect.stringContaining('Check Sent Items before trying again') });
  });
});
