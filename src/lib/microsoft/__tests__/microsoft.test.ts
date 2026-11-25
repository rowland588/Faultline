/* Connect to Microsoft (docs/CONNECTED-LUNA.md X1): the PKCE challenge against RFC 7636's own example, the ID check, Microsoft's words
 * said short, the files offered, the token renewed and forgotten, a download carrying where it came from, a newer version found. */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { validMicrosoftTenant, base64url, challengeOf, claimsOf, said, validClientId, accessToken, session, signOut, signIn, setClientId, clientId, clientIdFrom, explain, lastAccount } from '../auth';
import { checkFilesConnection, download, itemOf, libraries, myFiles, newerThan, offered, shown, sites } from '../graph';

const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v); }, removeItem: (k: string) => { store.delete(k); } });
});

describe('PKCE', () => {
  it('S256 of RFC 7636 appendix B: dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk → E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM', async () => {
    expect(await challengeOf('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
  });
  it('base64url has no padding and no + or /', () => {
    expect(base64url(new Uint8Array([251, 255, 191]))).toBe('-_-_');
    expect(base64url(new Uint8Array([1]))).toBe('AQ');
  });
});

describe('the Application ID and Microsoft’s words', () => {
  it('takes a GUID and refuses anything else', () => {
    expect(validClientId(' 1a2b3c4d-1234-5678-9abc-1234567890ab ')).toBe(true);
    expect(validClientId('my-app')).toBe(false);
    expect(validClientId('')).toBe(false);
  });
  it('says Microsoft’s refusal short — no error code, no trace', () => {
    expect(said('AADSTS65001: The user or administrator has not consented to use the application.\r\nTrace ID: abc\r\nCorrelation ID: def'))
      .toBe('The user or administrator has not consented to use the application.');
  });
  it('reads the name in the id token', () => {
    const body = btoa(JSON.stringify({ name: 'Rowland Glew', preferred_username: 'rowland@example.co.uk' })).replace(/=+$/, '');
    expect(claimsOf(`x.${body}.y`)).toEqual({ name: 'Rowland Glew', username: 'rowland@example.co.uk' });
    expect(claimsOf(undefined)).toEqual({});
  });
});

describe('the files offered', () => {
  it('offers workbooks, CSV and documents, and an older Excel only to say why it cannot be read', () => {
    expect(['a.xlsx', 'b.XLSM', 'c.csv', 'd.pdf', 'e.docx', 'f.xls', 'g.xlsb'].every(offered)).toBe(true);
    expect(['h.pptx', 'i.png', 'j.txt'].some(offered)).toBe(false);
  });
  it('folders first, then readable files by name; never a picture', () => {
    const items = [
      itemOf({ id: '3', name: 'zebra.xlsx', size: 10, file: {} }), itemOf({ id: '1', name: 'Reports', folder: {} }),
      itemOf({ id: '2', name: 'photo.png', file: {} }), itemOf({ id: '4', name: 'April.xlsx', file: {} }),
    ];
    expect(shown(items).map(i => i.name)).toEqual(['Reports', 'April.xlsx', 'zebra.xlsx']);
  });
  it('a recent or shared item is read from its remote target — its drive, its version', () => {
    const i = itemOf({ id: 'local', name: 'KPI.xlsx', remoteItem: { id: 'remote', name: 'KPI.xlsx', size: 2048, eTag: '"{A},3"', parentReference: { driveId: 'D9' }, lastModifiedDateTime: '2026-11-19T08:00:00Z' } });
    expect(i).toMatchObject({ id: 'remote', driveId: 'D9', eTag: '"{A},3"', size: 2048, folder: false });
    expect(i.modifiedAt).toBe(Date.parse('2026-11-19T08:00:00Z'));
  });
});

describe('the token on this device', () => {
  it('opens the Microsoft window before any awaited PKCE work, so the click is still a user gesture', async () => {
    setClientId('1a2b3c4d-1234-5678-9abc-1234567890ab');
    vi.stubGlobal('location', { origin: 'https://faultline.example' });
    const win = { closed: false, location: { href: '' }, close() { this.closed = true; } };
    const open = vi.fn(() => win);
    vi.stubGlobal('window', { open, setInterval, clearInterval });
    const pending = signIn();
    expect(open).toHaveBeenCalledOnce();
    await vi.waitFor(() => expect(win.location.href).toContain('login.microsoftonline.com'));
    win.closed = true;
    await expect(pending).rejects.toThrow('closed before it finished');
  });
  it('is used while good, renewed a minute before it ends, forgotten when renewal fails', async () => {
    setClientId('1a2b3c4d-1234-5678-9abc-1234567890ab');
    store.set('faultline.ms.session', JSON.stringify({ access: 'A1', refresh: 'R1', expiresAt: Date.now() + 10 * 60_000 }));
    expect(await accessToken()).toBe('A1');
    store.set('faultline.ms.session', JSON.stringify({ access: 'A1', refresh: 'R1', expiresAt: Date.now() + 30_000 }));
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ access_token: 'A2', refresh_token: 'R2', expires_in: 3600 }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    expect(await accessToken()).toBe('A2');
    expect(String((fetchMock.mock.calls[0] as unknown[])[1] && ((fetchMock.mock.calls[0] as unknown[])[1] as RequestInit).body)).toContain('grant_type=refresh_token');
    expect(session()?.refresh).toBe('R2');
    store.set('faultline.ms.session', JSON.stringify({ access: 'A2', refresh: 'R2', expiresAt: Date.now() - 1 }));
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'invalid_grant' }), { status: 400 })));
    expect(await accessToken()).toBeNull();
    expect(session()).toBeNull();
    signOut();
  });
});

describe('Microsoft Graph pages', () => {
  it('shows files from every page of a folder, with the same delegated token', async () => {
    store.set('faultline.ms.session', JSON.stringify({ access: 'A1', expiresAt: Date.now() + 10 * 60_000 }));
    const calls: { url: string; init?: RequestInit }[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      return new Response(JSON.stringify(url.includes('skiptoken')
        ? { value: [{ id: '2', name: 'June.xlsx', file: {}, parentReference: { driveId: 'D1' } }] }
        : { value: [{ id: '1', name: 'May.xlsx', file: {}, parentReference: { driveId: 'D1' } }], '@odata.nextLink': 'https://graph.microsoft.com/v1.0/me/drive/root/children?$skiptoken=NEXT' }), { status: 200 });
    }));
    expect((await myFiles()).map(x => x.name)).toEqual(['June.xlsx', 'May.xlsx']);
    expect(calls).toHaveLength(2);
    expect(calls.every(x => x.init?.headers && (x.init.headers as Record<string, string>).authorization === 'Bearer A1')).toBe(true);
  });
  it('does not send a delegated token to a foreign next-page address', async () => {
    store.set('faultline.ms.session', JSON.stringify({ access: 'A1', expiresAt: Date.now() + 10 * 60_000 }));
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ value: [], '@odata.nextLink': 'https://example.net/collect' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(myFiles()).rejects.toThrow('outside Microsoft Graph');
    expect(fetchMock).toHaveBeenCalledOnce();
  });
  it('also follows pages of SharePoint sites and their document libraries', async () => {
    store.set('faultline.ms.session', JSON.stringify({ access: 'A1', expiresAt: Date.now() + 10 * 60_000 }));
    vi.stubGlobal('fetch', vi.fn(async (url: string) => new Response(JSON.stringify(
      url.includes('/sites?')
        ? url.includes('skiptoken') ? { value: [{ id: 's2', displayName: 'Quality' }] } : { value: [{ id: 's1', displayName: 'Operations' }], '@odata.nextLink': 'https://graph.microsoft.com/v1.0/sites?search=*&$skiptoken=NEXT' }
        : url.includes('skiptoken') ? { value: [{ id: 'd2', name: 'Work instructions' }] } : { value: [{ id: 'd1', name: 'Documents' }], '@odata.nextLink': 'https://graph.microsoft.com/v1.0/sites/s1/drives?$skiptoken=NEXT' }
    ), { status: 200 })));
    expect((await sites('')).map(x => x.name)).toEqual(['Operations', 'Quality']);
    expect((await libraries({ id: 's1', name: 'Operations' })).map(x => x.name)).toEqual(['Documents', 'Work instructions']);
  });
});

describe('a file downloaded and its version', () => {
  it('downloads to a File with where it came from, then finds a newer version by its eTag', async () => {
    store.set('faultline.ms.session', JSON.stringify({ access: 'A1', expiresAt: Date.now() + 10 * 60_000 }));
    const bytes = new Uint8Array([80, 75, 3, 4]);
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url === 'https://dl.example/kpi') return new Response(bytes, { status: 200 });
      if (url.includes('/drives/D9/items/remote')) return new Response(JSON.stringify({ id: 'remote', name: 'KPI.xlsx', eTag: '"{A},4"', parentReference: { driveId: 'D9' }, '@microsoft.graph.downloadUrl': 'https://dl.example/kpi' }), { status: 200 });
      return new Response('{}', { status: 404 });
    }));
    const item = itemOf({ id: 'remote', name: 'KPI.xlsx', size: 4, eTag: '"{A},3"', parentReference: { driveId: 'D9' }, lastModifiedDateTime: '2026-11-19T08:00:00Z', '@microsoft.graph.downloadUrl': 'https://dl.example/kpi' });
    const { file, origin } = await download(item, 'Operations › Reports › KPI.xlsx');
    expect(file.name).toBe('KPI.xlsx');
    expect(file.size).toBe(4);
    expect(origin).toMatchObject({ kind: 'microsoft', driveId: 'D9', itemId: 'remote', eTag: '"{A},3"', path: 'Operations › Reports › KPI.xlsx' });
    expect((await newerThan(origin)).newer).toBe(true);
    expect((await newerThan({ ...origin, eTag: '"{A},4"' })).newer).toBe(false);
  });
});

describe('ready to connect (20 November — "it needs to be ready to connect")', () => {
  it('the Application ID saved for everyone wins over one typed on this device; neither — not set up', () => {
    expect([clientId(), clientIdFrom()]).toEqual(['', '']);
    setClientId('1a2b3c4d-1234-5678-9abc-1234567890ab');
    expect([clientId(), clientIdFrom()]).toEqual(['1a2b3c4d-1234-5678-9abc-1234567890ab', 'device']);
    store.set('faultline.app.settings', JSON.stringify({ microsoftClientId: '99999999-1234-5678-9abc-1234567890ab', at: 1 }));
    expect([clientId(), clientIdFrom()]).toEqual(['99999999-1234-5678-9abc-1234567890ab', 'everyone']);
  });
  it('Microsoft’s setting-up mistakes are said as the step that puts them right', () => {
    const r = 'https://faultline.opexelevate.co.uk/ms-auth.html';
    expect(explain('AADSTS50011: The redirect URI specified in the request does not match.', r)).toBe(`Microsoft does not have this sign-in address on Faultline's registration. Add ${r} as a Single-page application redirect URI (step 1).`);
    expect(explain('AADSTS9002326: Cross-origin token redemption is permitted only for the Single-Page Application client-type.', r)).toMatch(/registered as Web, not Single-page application.*step 1/);
    expect(explain('AADSTS700016: Application with identifier was not found in the directory.', r)).toMatch(/check the ID \(step 2\)/);
    expect(explain('AADSTS90094: The grant requires admin permission.', r)).toMatch(/IT administrator.*step 4/);
    expect(explain('AADSTS65004: User declined to consent. access_denied', r)).toMatch(/not accepted/);
    expect(explain('AADSTS50076: Due to a configuration change made by your administrator, you must use multi-factor authentication.', r)).toBe('Due to a configuration change made by your administrator, you must use multi-factor authentication.');
  });
  it('signing out forgets the account as well as the sign-in', () => {
    store.set('faultline.ms.last', 'pat@example-foods.co.uk');
    expect(lastAccount()).toBe('pat@example-foods.co.uk');
    signOut();
    expect(lastAccount()).toBe('');
  });
});

it('uses the customer directory when a guest token is renewed', async () => {
  setClientId('1a2b3c4d-1234-5678-9abc-1234567890ab');
  store.set('faultline.ms.session', JSON.stringify({ tenant: 'factory.onmicrosoft.com', access: 'old', refresh: 'refresh', expiresAt: 0 }));
  const post = vi.fn(async () => new Response(JSON.stringify({access_token:'new',expires_in:3600})));
  vi.stubGlobal('fetch',post);
  expect(await accessToken()).toBe('new');
  expect(post.mock.calls[0]).toContain('https://login.microsoftonline.com/factory.onmicrosoft.com/oauth2/v2.0/token');
  expect(validMicrosoftTenant('factory.sharepoint.com')).toBe(false);
  expect(validMicrosoftTenant('factory.com/other')).toBe(false);
});

describe('Microsoft connection checks', () => {
  it('keeps a verified sign-in usable for SharePoint when the account has no personal OneDrive', async () => {
    store.set('faultline.ms.session', JSON.stringify({ access: 'A', expiresAt: Date.now() + 600_000 }));
    const paths: string[] = [];
    vi.stubGlobal('fetch', async (url: string) => {
      const path = new URL(url).pathname;
      paths.push(path);
      if (path === '/v1.0/me') return Response.json({ id: 'me', displayName: 'Consultant' });
      if (path === '/v1.0/me/drive/root/children') return Response.json({ error: { code: 'BadRequest', message: 'Tenant has no SharePoint Online license.' } }, { status: 400, headers: { 'request-id': 'test-request' } });
      if (path === '/v1.0/sites/client.sharepoint.com:/sites/Test') return Response.json({ id: 'site', displayName: 'Customer' });
      if (path === '/v1.0/sites/site/drives') return Response.json({ value: [{ id: 'drive', name: 'Documents' }] });
      throw new Error('Unexpected Graph URL');
    });
    const home = await checkFilesConnection('', false);
    expect(home.account).toBe('Consultant');
    expect(home.warning).toContain('Tenant has no SharePoint Online license.');
    expect(home.warning).toContain('test-request');
    paths.length = 0;
    expect((await checkFilesConnection('https://client.sharepoint.com/sites/Test', true)).access).toContain('1 visible document library');
    expect(paths).not.toContain('/v1.0/me/drive/root/children');
    expect(paths).not.toContain('/v1.0/me/drive/recent');
  });

  it('does not report site access when Microsoft refuses to list the document libraries', async () => {
    store.set('faultline.ms.session', JSON.stringify({ access: 'A', expiresAt: Date.now() + 600_000 }));
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(Response.json({ id: 'me' }))
      .mockResolvedValueOnce(Response.json({ id: 'site' }))
      .mockResolvedValueOnce(Response.json({ error: { code: 'accessDenied', message: 'Access denied' } }, { status: 403 })));
    await expect(checkFilesConnection('https://client.sharepoint.com/sites/Test', true)).rejects.toThrow(/403.*accessDenied/);
  });
});

it('renews private file access through the common authority without using or replacing the business session', async () => {
  setClientId('11111111-2222-3333-4444-555555555555');
  store.set('faultline.ms.session', JSON.stringify({ access: 'work', expiresAt: Date.now() + 600_000 }));
  store.set('faultline.ms.session.fileLink', JSON.stringify({ access: 'expired', refresh: 'link-refresh', expiresAt: 1 }));
  const request = vi.fn().mockResolvedValue(Response.json({ access_token: 'file-access', expires_in: 1200 }));
  vi.stubGlobal('fetch', request);
  expect(await accessToken(true)).toBe('file-access');
  const [url, options] = request.mock.calls[0];
  expect(url).toBe('https://login.microsoftonline.com/common/oauth2/v2.0/token');
  const scopes = new URLSearchParams(options.body).get('scope')?.split(' ');
  expect(scopes).toContain('Files.Read.All');
  expect(scopes).not.toContain('Mail.Send');
  expect(scopes).not.toContain('Sites.Read.All');
  expect(await accessToken()).toBe('work');
  signOut();
  expect(session(true)).toBeNull();
});
