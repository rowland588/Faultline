import { expect, it, vi } from 'vitest';
import { fetchMicrosoftLink, type LinkDeps } from '../linkCore';

const share = 'https://1drv.ms/x/s!file?e=abc';
const destination = 'https://files.example.test/download/Workbook.xlsx';

it('reads a private share using the read-only content call and strips the token at the redirect', async () => {
  const requests: { url: string; authorization?: string }[] = [];
  const deps: LinkDeps = {
    refuse: () => undefined,
    fetch: async (url, init) => {
      requests.push({ url, authorization: init.headers.Authorization });
      if (requests.length === 1) return new Response(null, { status: 302, headers: { Location: destination } });
      return new Response(new Uint8Array([80, 75, 3, 4, 1, 2, 3, 4]), { headers: { 'content-disposition': 'attachment; filename="Workbook.xlsx"', 'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' } });
    },
  };
  const result = await fetchMicrosoftLink(share, 'account-token', deps);
  expect(result).toMatchObject({ ok: true, name: 'Workbook.xlsx', service: 'onedrive', host: '1drv.ms' });
  if (result.ok) expect((await new Response(result.body).arrayBuffer()).byteLength).toBe(8);
  const id = 'u!' + btoa(share).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  expect(requests).toEqual([{ url: 'https://graph.microsoft.com/v1.0/shares/' + id + '/driveItem/content', authorization: 'Bearer account-token' }, { url: destination, authorization: undefined }]);
});

it('preserves a Microsoft access refusal and rejects non-Microsoft links before making an authenticated request', async () => {
  const fetch = vi.fn().mockResolvedValue(Response.json({ error: { message: 'Access denied.' } }, { status: 403 }));
  const deps = { fetch, refuse: () => undefined };
  expect(await fetchMicrosoftLink('https://files.example.test/book', 'token', deps)).toMatchObject({ ok: false, code: 'address' });
  expect(fetch).not.toHaveBeenCalled();
  expect(await fetchMicrosoftLink(share, 'token', deps)).toMatchObject({ ok: false, code: 'sign-in', why: expect.stringContaining('Access denied') });
  expect(fetch).toHaveBeenCalledTimes(1);
});
