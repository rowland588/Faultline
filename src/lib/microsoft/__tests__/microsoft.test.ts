/* Connect to Microsoft (docs/CONNECTED-LUNA.md X1): the PKCE challenge against RFC 7636's own example, the ID check, Microsoft's words
 * said short, the files offered, the token renewed and forgotten, a download carrying where it came from, a newer version found. */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { base64url, challengeOf, claimsOf, said, validClientId, accessToken, session, signOut, setClientId } from '../auth';
import { download, itemOf, newerThan, offered, shown } from '../graph';

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
