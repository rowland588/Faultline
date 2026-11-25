/* A FILE BY ITS LINK — the rules (src/lib/fileLink/linkCore), against a played service. The services themselves cannot be reached from
 * the build environment, so what is proved here is: which service a link is said to be from, the direct form of each known shared link
 * (and that it is applied once), every hop checked, a web page never passed off as a file, cookies sent back only where they came from,
 * the limit on size, and the words a person is told when it cannot be done. */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { directForm, fetchByLink, kindOfBytes, linkKind, nameOfFile, type LinkDeps } from '../linkCore';
import { unfetchable } from '../../production/ingestCore';
import { fileLinkIn } from '../link';

const enc = (s: string) => new TextEncoder().encode(s);
const ZIP = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1, 2, 3, 4, 5, 6, 7, 8]);
const PAGE = enc('<!DOCTYPE html><html><head><title>Sign in</title></head><body></body></html>');
const all = async (s: ReadableStream<Uint8Array>) => new Uint8Array(await new Response(s).arrayBuffer());

/** A played web: an address → what it answers. Every request is kept, with the cookies it carried. */
function web(routes: Record<string, (req: { cookie: string }) => Response>) {
  const asked: { url: string; cookie: string }[] = [];
  const deps: LinkDeps = {
    fetch: async (url, init) => {
      asked.push({ url, cookie: init.headers.Cookie ?? '' });
      const r = routes[url];
      if (!r) return new Response('nothing here', { status: 404 });
      return r({ cookie: init.headers.Cookie ?? '' });
    },
    refuse: u => unfetchable(u),
  };
  return { deps, asked };
}
const file = (bytes: Uint8Array, headers: Record<string, string> = {}) => () => new Response(bytes as unknown as BodyInit, { status: 200, headers });
const to = (location: string, headers: Record<string, string> = {}) => () => new Response(null, { status: 302, headers: { location, ...headers } });

describe('which service a link is from', () => {
  it.each([
    ['https://1drv.ms/x/c/abc123/EaBcD?e=Xy', 'onedrive', 'A OneDrive link'],
    ['https://onedrive.live.com/:x:/g/personal/ABC/EaBc?e=1', 'onedrive', 'A OneDrive link'],
    ['https://contoso.sharepoint.com/:x:/s/Packing/EaBcDeF?e=abc', 'sharepoint', 'A SharePoint link'],
    ['https://contoso-my.sharepoint.com/:x:/g/personal/a_b/EaBc', 'sharepoint', 'A SharePoint link'],
    ['https://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOpQrStUvWxYz012345/edit#gid=0', 'google-sheets', 'A Google Sheets link'],
    ['https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz012345/view?usp=sharing', 'google-drive', 'A Google Drive link'],
    ['https://www.dropbox.com/scl/fi/abc/report.xlsx?rlkey=k&dl=0', 'dropbox', 'A Dropbox link'],
    ['https://files.example.org/reports/march.xlsx', 'web', 'A web link'],
  ])('%s', (u, service, said) => { expect(linkKind(u)).toMatchObject({ service, said }); });
  it('what is not a web link is no link', () => {
    for (const u of ['', 'report.xlsx', 'file:///c:/report.xlsx', 'ftp://host/file.csv', 'https://localhost']) expect(linkKind(u)).toBeUndefined();
  });
});

describe('the address that gives the file itself', () => {
  const ID = '1AbCdEfGhIjKlMnOpQrStUvWxYz012345';
  it.each([
    [`https://docs.google.com/spreadsheets/d/${ID}/edit?usp=sharing#gid=3`, `https://docs.google.com/spreadsheets/d/${ID}/export?format=xlsx`],
    [`https://docs.google.com/spreadsheets/u/0/d/${ID}/view`, `https://docs.google.com/spreadsheets/d/${ID}/export?format=xlsx`],
    [`https://docs.google.com/spreadsheets/d/${ID}`, `https://docs.google.com/spreadsheets/d/${ID}/export?format=xlsx`],
    ['https://docs.google.com/spreadsheets/d/e/2PACX-abc_DEF/pubhtml', 'https://docs.google.com/spreadsheets/d/e/2PACX-abc_DEF/pub?output=xlsx'],
    [`https://drive.google.com/file/d/${ID}/view?usp=sharing`, `https://drive.usercontent.google.com/download?id=${ID}&export=download&confirm=t`],
    [`https://drive.google.com/open?id=${ID}`, `https://drive.usercontent.google.com/download?id=${ID}&export=download&confirm=t`],
    ['https://www.dropbox.com/scl/fi/abc/report.xlsx?rlkey=k&dl=0', 'https://www.dropbox.com/scl/fi/abc/report.xlsx?rlkey=k&dl=1'],
    ['https://www.dropbox.com/s/abc/report.xlsx', 'https://www.dropbox.com/s/abc/report.xlsx?dl=1'],
    ['https://contoso.sharepoint.com/:x:/s/Packing/EaBcDeF?e=abc', 'https://contoso.sharepoint.com/:x:/s/Packing/EaBcDeF?e=abc&download=1'],
    ['https://contoso.sharepoint.com/sites/Packing/_layouts/15/Doc.aspx?sourcedoc=%7B11111111-2222-3333-4444-555555555555%7D&file=March.xlsx&action=default', 'https://contoso.sharepoint.com/sites/Packing/_layouts/15/download.aspx?UniqueId=11111111-2222-3333-4444-555555555555'],
    ['https://onedrive.live.com/redir?resid=ABC!123&authkey=!Akey', 'https://onedrive.live.com/download?resid=ABC!123&authkey=!Akey'],
    ['https://onedrive.live.com/:x:/g/personal/ABCDEF/EaBcD?e=Xy', 'https://onedrive.live.com/:x:/g/personal/ABCDEF/EaBcD?e=Xy&download=1'],
  ])('%s', (from, direct) => { expect(directForm(from)).toBe(direct); });

  it('is applied once — a direct form has none of its own', () => {
    for (const u of [
      `https://docs.google.com/spreadsheets/d/${ID}/edit`, 'https://docs.google.com/spreadsheets/d/e/2PACX-abc_DEF/pubhtml', `https://drive.google.com/file/d/${ID}/view`,
      'https://www.dropbox.com/s/abc/report.xlsx?dl=0', 'https://contoso.sharepoint.com/:x:/s/Packing/EaBcDeF?e=abc', 'https://onedrive.live.com/redir?resid=ABC!123&authkey=!Akey',
      'https://onedrive.live.com/:x:/g/personal/ABCDEF/EaBcD?e=Xy',
    ]) { const d = directForm(u); expect(d, u).toBeTruthy(); expect(directForm(d as string), d).toBeUndefined(); }
  });
  it('a OneDrive link since moved to its newer storage is followed as it is — /download would send it to a sign-in (real OneDrive, 21 November)', () => {
    expect(directForm('https://onedrive.live.com/redir?cid=0c7d762a264cd7b8&resid=0C7D762A264CD7B8!sfd4f&ithint=file%2cxlsx&embed=1&migratedtospo=true&redeem=aHR0cHM6Ly8x')).toBeUndefined();
    expect(directForm('https://onedrive.live.com/redir?resid=ABC!123&ithint=file%2cxlsx')).toBeUndefined();
    expect(directForm('https://onedrive.live.com/embed?resid=ABC!123&authkey=!Akey&em=2')).toBe('https://onedrive.live.com/download?resid=ABC!123&authkey=!Akey&em=2');
  });
  it('a short link, a plain file and a page it does not know have none', () => {
    for (const u of ['https://1drv.ms/x/c/abc/EaBc?e=1', 'https://files.example.org/march.xlsx', 'https://docs.google.com/document/d/abc/edit', 'https://www.dropbox.com/home', 'not a link']) expect(directForm(u)).toBeUndefined();
  });
});

describe('what came back, told from its first bytes', () => {
  it('a workbook, a PDF, an older Office file, rows of text, a web page, something else', () => {
    expect(kindOfBytes(ZIP)).toBe('zip');
    expect(kindOfBytes(enc('%PDF-1.7 …'))).toBe('pdf');
    expect(kindOfBytes(new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1]))).toBe('old-office');
    expect(kindOfBytes(enc('Date,Line,Packs\n2026-09-01,Line 1,4200\n'))).toBe('csv');
    expect(kindOfBytes(enc('\uFEFFDate;Line;Packs\r\n01/09/2026;Line 1;4200\r\n'))).toBe('csv');
    expect(kindOfBytes(PAGE)).toBe('page');
    expect(kindOfBytes(enc('  \n<html lang="en">'))).toBe('page');
    expect(kindOfBytes(enc('just some words with no rows'))).toBe('other');
    expect(kindOfBytes(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 1, 2]))).toBe('other');
  });
  it('the service’s word for the type never makes a web page a file', () => {
    expect(kindOfBytes(PAGE, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'report.xlsx')).toBe('page');
    expect(kindOfBytes(enc('{"error":"nope"}'), 'text/html')).toBe('page');
  });
  it('its name: the service’s own, else the address’s, never a path, always with an ending', () => {
    expect(nameOfFile(`attachment; filename="plain.xlsx"; filename*=UTF-8''Shift%20report%20M%C3%A4rz.xlsx`, 'https://x.example.org/a', 'zip')).toBe('Shift report März.xlsx');
    expect(nameOfFile('attachment; filename="March report.xlsx"', 'https://x.example.org/a', 'zip')).toBe('March report.xlsx');
    expect(nameOfFile(null, 'https://files.example.org/reports/March%20report.csv?x=1', 'csv')).toBe('March report.csv');
    expect(nameOfFile(null, 'https://docs.google.com/spreadsheets/d/abc/export?format=xlsx', 'zip')).toBe('File from a link.xlsx');
    expect(nameOfFile('attachment; filename="..\\..\\etc/passwd"', 'https://x.example.org/a', 'pdf')).toBe('.. .. etc passwd.pdf');
    expect(nameOfFile('attachment; filename="Weekly KPIs"', 'https://x.example.org/a', 'zip')).toBe('Weekly KPIs.xlsx');
  });
});

describe('the fetch', () => {
  it('a plain link to a workbook: the bytes, its name, its version', async () => {
    const { deps, asked } = web({ 'https://files.example.org/reports/march.xlsx': file(ZIP, { etag: '"v1"', 'last-modified': 'Sun, 01 Nov 2026 09:00:00 GMT', 'content-length': String(ZIP.length) }) });
    const r = await fetchByLink('https://files.example.org/reports/march.xlsx', deps);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r).toMatchObject({ name: 'march.xlsx', kind: 'zip', service: 'web', host: 'files.example.org', etag: '"v1"', size: ZIP.length });
    expect([...await all(r.body)]).toEqual([...ZIP]);
    expect(asked.map(a => a.url)).toEqual(['https://files.example.org/reports/march.xlsx']);
  });

  it('a Google Sheet is asked for as an Excel workbook, never its page', async () => {
    const ID = '1AbCdEfGhIjKlMnOpQrStUvWxYz012345';
    const { deps, asked } = web({
      [`https://docs.google.com/spreadsheets/d/${ID}/export?format=xlsx`]: to('https://doc-0s-sheets.googleusercontent.com/export/abc'),
      'https://doc-0s-sheets.googleusercontent.com/export/abc': file(ZIP, { 'content-disposition': `attachment; filename="Shift report.xlsx"; filename*=UTF-8''Shift%20report.xlsx` }),
    });
    const r = await fetchByLink(`https://docs.google.com/spreadsheets/d/${ID}/edit?usp=sharing`, deps);
    expect(r).toMatchObject({ ok: true, name: 'Shift report.xlsx', service: 'google-sheets' });
    expect(asked[0].url).toBe(`https://docs.google.com/spreadsheets/d/${ID}/export?format=xlsx`);
  });

  it('a OneDrive short link: followed, where it lands asked for the file itself, the pass it was handed sent back only there', async () => {
    const land = 'https://onedrive.live.com/:x:/g/personal/ABCDEF/EaBcD?e=Xy';
    const { deps, asked } = web({
      'https://1drv.ms/x/c/abcdef/EaBcD?e=Xy': to(land),
      [`${land}&download=1`]: to('https://my.microsoftpersonalcontent.com/personal/abcdef/_layouts/15/download.aspx?share=EaBcD', { 'set-cookie': 'FedAuth=pass123; Path=/; Secure; HttpOnly' }),
      'https://my.microsoftpersonalcontent.com/personal/abcdef/_layouts/15/download.aspx?share=EaBcD': file(ZIP, { 'content-disposition': 'attachment; filename="Shift report September.xlsx"' }),
    });
    const r = await fetchByLink('https://1drv.ms/x/c/abcdef/EaBcD?e=Xy', deps);
    expect(r).toMatchObject({ ok: true, name: 'Shift report September.xlsx', service: 'onedrive' });
    expect(asked.map(a => a.url)).toEqual(['https://1drv.ms/x/c/abcdef/EaBcD?e=Xy', `${land}&download=1`, 'https://my.microsoftpersonalcontent.com/personal/abcdef/_layouts/15/download.aspx?share=EaBcD']);
    /* the cookie was set by onedrive.live.com with no Domain: it goes back to that host only, never to another */
    expect(asked[2].cookie).toBe('');
  });

  it('AS REAL ONEDRIVE ANSWERED (21 November, traced through the deployed function): the short link, the sharing address asked for the file itself, its pass (FedAuth) handed back, the file', async () => {
    const share = 'https://onedrive.live.com/:x:/g/personal/D23060A2A7CBFB33/s!AjP7y6ei?resid=D23060A2A7CBFB33!105&ithint=file%2cxlsx&e=cL0Fqi&migratedtospo=true&redeem=aHR0';
    const withDl = directForm(share) as string;
    const doc = 'https://onedrive.live.com/personal/d23060a2a7cbfb33/Documents/Sales.xlsx?redeem=aHR0&ga=1';
    const { deps, asked } = web({
      'https://1drv.ms/x/s!AjP7y6ei?e=cL0Fqi': () => new Response(null, { status: 301, headers: { location: share } }),
      [withDl]: to('/personal/d23060a2a7cbfb33/Documents/Sales.xlsx?redeem=aHR0&ga=1', { 'set-cookie': 'FedAuth=pass-1; path=/; secure; HttpOnly' }),
      [`${doc}&download=1`]: ({ cookie }) => (cookie === 'FedAuth=pass-1' ? new Response(ZIP as unknown as BodyInit, { headers: { 'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' } }) : new Response(null, { status: 302, headers: { location: 'https://login.live.com/login.srf' } })),
    });
    const r = await fetchByLink('https://1drv.ms/x/s!AjP7y6ei?e=cL0Fqi', deps);
    expect(r).toMatchObject({ ok: true, name: 'Sales.xlsx', service: 'onedrive', host: 'onedrive.live.com' });
    expect(withDl).toContain('download=1');
    expect(asked[2].cookie).toBe('FedAuth=pass-1');
  });

  it('AS REAL ONEDRIVE ANSWERED: a newer link’s redir is followed, never turned into /download (which asks for a sign-in)', async () => {
    const redir = 'https://onedrive.live.com/redir?cid=0c7d&resid=0C7D!sfd4f&ithint=file%2cxlsx&migratedtospo=true&redeem=aHR0';
    const share = 'https://onedrive.live.com/:x:/g/personal/0C7D762A264CD7B8/IQSv7U?e=1';
    const { deps, asked } = web({
      'https://1drv.ms/x/c/0c7d/IQSv7U': () => new Response(null, { status: 301, headers: { location: redir } }),
      [redir]: to(share),
      'https://onedrive.live.com/download?cid=0c7d&resid=0C7D!sfd4f&ithint=file%2cxlsx&migratedtospo=true&redeem=aHR0': to('https://login.live.com/login.srf'),
      [`${share}&download=1`]: file(ZIP, { 'content-disposition': 'attachment; filename="Plan.xlsx"' }),
    });
    expect(await fetchByLink('https://1drv.ms/x/c/0c7d/IQSv7U', deps)).toMatchObject({ ok: true, name: 'Plan.xlsx' });
    expect(asked.map(a => a.url)).toEqual(['https://1drv.ms/x/c/0c7d/IQSv7U', redir, `${share}&download=1`]);
  });

  it('a SharePoint anonymous link: its pass, set for the site, goes back to the site’s download page', async () => {
    const share = 'https://contoso.sharepoint.com/:x:/s/Packing/EaBcDeF?e=abc';
    const { deps, asked } = web({
      [`${share}&download=1`]: to('/sites/Packing/_layouts/15/download.aspx?share=EaBcDeF', { 'set-cookie': 'FedAuth=pass999; Domain=contoso.sharepoint.com; Path=/; Secure' }),
      'https://contoso.sharepoint.com/sites/Packing/_layouts/15/download.aspx?share=EaBcDeF': ({ cookie }) => (cookie === 'FedAuth=pass999' ? new Response(ZIP as unknown as BodyInit, { headers: { 'content-disposition': 'attachment; filename="March.xlsx"' } }) : new Response(PAGE as unknown as BodyInit, { status: 200, headers: { 'content-type': 'text/html' } })),
    });
    const r = await fetchByLink(share, deps);
    expect(r).toMatchObject({ ok: true, name: 'March.xlsx', service: 'sharepoint' });
    expect(asked[1].cookie).toBe('FedAuth=pass999');
  });

  it('a cookie naming a Domain its host is not under is not honoured', async () => {
    const { deps, asked } = web({
      'https://a.example.org/f': to('https://evil.example.net/x', { 'set-cookie': 'sid=1; Domain=example.net' }),
      'https://evil.example.net/x': file(ZIP),
    });
    await fetchByLink('https://a.example.org/f', deps);
    expect(asked[1].cookie).toBe('');
  });

  it('a web page that comes back is tried once more as the file itself, and if it is still a page it is said so', async () => {
    const view = 'https://contoso.sharepoint.com/sites/Packing/_layouts/15/Doc.aspx?sourcedoc=%7B11111111-2222-3333-4444-555555555555%7D&file=March.xlsx';
    const dl = 'https://contoso.sharepoint.com/sites/Packing/_layouts/15/download.aspx?UniqueId=11111111-2222-3333-4444-555555555555';
    /* reached through a redirect that already had its direct form tried, the viewer answers a page — then its download page the file */
    const ok = web({ 'https://go.example.org/march': to(view), [dl]: file(ZIP, { 'content-disposition': 'attachment; filename="March.xlsx"' }) });
    expect(await fetchByLink('https://go.example.org/march', ok.deps)).toMatchObject({ ok: true, name: 'March.xlsx' });

    const page = web({ 'https://files.example.org/march': () => new Response(PAGE as unknown as BodyInit, { headers: { 'content-type': 'text/html; charset=utf-8' } }) });
    const r = await fetchByLink('https://files.example.org/march', page.deps);
    expect(r).toMatchObject({ ok: false, code: 'page' });
    if (!r.ok) expect(r.why).toMatch(/opens a web page, not the file itself/);

    const gs = web({ 'https://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOpQrStUvWxYz012345/export?format=xlsx': () => new Response(PAGE as unknown as BodyInit, { headers: { 'content-type': 'text/html' } }) });
    const g = await fetchByLink('https://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOpQrStUvWxYz012345/edit', gs.deps);
    expect(g).toMatchObject({ ok: false, code: 'page' });
    if (!g.ok) expect(g.why).toMatch(/Anyone with the link/);
  });

  it('AS REAL ONEDRIVE ANSWERED: an embed link lands on the viewer — said as an embed link, with the link to copy instead', async () => {
    const redir = 'https://onedrive.live.com/redir?cid=0c7d&resid=0C7D!sfd4f&ithint=file%2cxlsx&embed=1&migratedtospo=true&redeem=aHR0';
    const edit = 'https://onedrive.live.com/edit?cid=0c7d&id=0C7D!sfd4f&resid=0C7D!sfd4f&ithint=file,xlsx&embed=1&migratedtospo=true&redeem=aHR0';
    const { deps } = web({
      'https://1drv.ms/x/c/0c7d/IQSv7U': () => new Response(null, { status: 301, headers: { location: redir } }),
      [redir]: to(edit),
      [edit]: () => new Response(PAGE as unknown as BodyInit, { headers: { 'content-type': 'text/html; charset=utf-8' } }),
    });
    const r = await fetchByLink('https://1drv.ms/x/c/0c7d/IQSv7U', deps);
    expect(r).toMatchObject({ ok: false, code: 'page' });
    if (!r.ok) expect(r.why).toMatch(/^That is an embed link — it opens the viewer, not the file itself\. In OneDrive or SharePoint choose Share/);
  });

  it('a link that asks for a sign-in is not open to anyone who has it — said, with what to do', async () => {
    const { deps } = web({ 'https://contoso.sharepoint.com/:x:/s/Packing/EaBcDeF?e=abc&download=1': to('https://login.microsoftonline.com/common/oauth2/authorize?client_id=x') });
    const r = await fetchByLink('https://contoso.sharepoint.com/:x:/s/Packing/EaBcDeF?e=abc', deps);
    expect(r).toMatchObject({ ok: false, code: 'sign-in' });
    if (!r.ok) expect(r.why).toMatch(/asks for a sign-in.*sign in with the account that has access/);
    const refused = web({ 'https://files.example.org/f.xlsx': () => new Response('no', { status: 403 }) });
    expect(await fetchByLink('https://files.example.org/f.xlsx', refused.deps)).toMatchObject({ ok: false, code: 'sign-in' });
  });

  it('gone, a service in trouble, something Luna does not read, an empty file', async () => {
    const w = web({
      'https://files.example.org/busy.xlsx': () => new Response('later', { status: 503 }),
      'https://files.example.org/photo.png': file(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 1, 2])),
      'https://files.example.org/empty.xlsx': file(new Uint8Array(0)),
    });
    expect(await fetchByLink('https://files.example.org/missing.xlsx', w.deps)).toMatchObject({ ok: false, code: 'gone' });
    expect(await fetchByLink('https://files.example.org/busy.xlsx', w.deps)).toMatchObject({ ok: false, code: 'service' });
    expect(await fetchByLink('https://files.example.org/photo.png', w.deps)).toMatchObject({ ok: false, code: 'kind' });
    expect(await fetchByLink('https://files.example.org/empty.xlsx', w.deps)).toMatchObject({ ok: false, code: 'service' });
  });

  it('never a private address — at the start or after a redirect — and never plain http', async () => {
    const { deps, asked } = web({ 'https://files.example.org/sneaky.xlsx': to('https://169.254.169.254/latest/meta-data/'), 'https://files.example.org/inner': to('https://10.0.0.8/report.xlsx') });
    for (const u of ['http://files.example.org/a.xlsx', 'https://127.0.0.1/a.xlsx', 'https://192.168.1.10/a.xlsx', 'https://localhost.localdomain/a.xlsx', 'https://project.supabase.co/storage/a.xlsx']) {
      const r = await fetchByLink(u, deps);
      expect(r, u).toMatchObject({ ok: false, code: 'address' });
    }
    expect(asked).toHaveLength(0);
    expect(await fetchByLink('https://files.example.org/sneaky.xlsx', deps)).toMatchObject({ ok: false, code: 'address' });
    expect(await fetchByLink('https://files.example.org/inner', deps)).toMatchObject({ ok: false, code: 'address' });
    expect(asked.map(a => a.url)).toEqual(['https://files.example.org/sneaky.xlsx', 'https://files.example.org/inner']);
  });

  it('no more than the limit: refused by its declared size, and stopped part way when it runs past it', async () => {
    const big = new Uint8Array(5000); big.set(ZIP);
    const declared = web({ 'https://files.example.org/huge.xlsx': file(ZIP, { 'content-length': '900000000' }) });
    const d = await fetchByLink('https://files.example.org/huge.xlsx', declared.deps);
    expect(d).toMatchObject({ ok: false, code: 'size' });
    const undeclared = web({ 'https://files.example.org/long.xlsx': () => new Response(new ReadableStream<Uint8Array>({ start(c) { c.enqueue(big.subarray(0, 2500)); c.enqueue(big.subarray(2500)); c.close(); } })) });
    const r = await fetchByLink('https://files.example.org/long.xlsx', { ...undeclared.deps, maxBytes: 3000 });
    expect(r.ok).toBe(true);
    if (r.ok) await expect(all(r.body)).rejects.toThrow();
  });

  it('the way it went can be told to the check: each answer’s address, status, where it sent us, and the NAMES of cookies — never their values', async () => {
    const share = 'https://contoso.sharepoint.com/:x:/s/Packing/EaBcDeF?e=abc';
    const { deps } = web({
      [`${share}&download=1`]: to('/sites/Packing/_layouts/15/download.aspx?share=EaBcDeF', { 'set-cookie': 'FedAuth=pass999; Domain=contoso.sharepoint.com; Path=/; Secure' }),
      'https://contoso.sharepoint.com/sites/Packing/_layouts/15/download.aspx?share=EaBcDeF': file(ZIP, { 'content-type': 'application/vnd.ms-excel' }),
    });
    const hops: { url: string; status: number; location: string; cookies: string[] }[] = [];
    await fetchByLink(share, { ...deps, onHop: h => hops.push(h) });
    expect(hops.map(h => h.status)).toEqual([302, 200]);
    expect(hops[0]).toMatchObject({ url: `${share}&download=1`, location: '/sites/Packing/_layouts/15/download.aspx?share=EaBcDeF', cookies: ['FedAuth'] });
    expect(JSON.stringify(hops)).not.toContain('pass999');
  });

  it('a link that goes round in circles is given up on', async () => {
    const routes: Record<string, () => Response> = {};
    for (let i = 0; i < 12; i++) routes[`https://files.example.org/r${i}`] = to(`https://files.example.org/r${i + 1}`);
    const { deps, asked } = web(routes);
    expect(await fetchByLink('https://files.example.org/r0', deps)).toMatchObject({ ok: false, code: 'redirects' });
    expect(asked.length).toBe(9);
  });

  it('a service that cannot be reached, or does not answer, is said so', async () => {
    const down: LinkDeps = { fetch: async () => { throw new TypeError('fetch failed'); }, refuse: u => unfetchable(u) };
    const r = await fetchByLink('https://files.example.org/a.xlsx', down);
    expect(r).toMatchObject({ ok: false, code: 'network' });
    const slow: LinkDeps = { fetch: async () => { const e = new Error('timed out'); e.name = 'TimeoutError'; throw e; }, refuse: u => unfetchable(u) };
    const s = await fetchByLink('https://files.example.org/a.xlsx', slow);
    if (!s.ok) expect(s.why).toMatch(/did not answer in time/);
  });
});

describe('the link function’s copies', () => {
  it('are the app’s own files, word for word — so these tests prove the code the cloud runs', () => {
    const root = process.cwd();
    for (const [src, copy] of [['src/lib/fileLink/linkCore.ts', 'supabase/functions/link/core.ts'], ['src/lib/production/ingestCore.ts', 'supabase/functions/link/address.ts']]) {
      expect(readFileSync(join(root, copy), 'utf8').split('\n').slice(1).join('\n'), `${copy}: run node scripts/sync-assist.mjs`).toBe(readFileSync(join(root, src), 'utf8'));
    }
  });
  it('the function asks for a signed-in person or the database’s key, and hands the fetch to these rules', () => {
    const fn = readFileSync(join(process.cwd(), 'supabase/functions/link/index.ts'), 'utf8');
    expect(fn).toMatch(/auth\.getUser\(\)/);
    expect(fn).toMatch(/x-check-key/);
    expect(fn).toContain('fetchByLink(link, deps)');
    expect(fn).toMatch(/const deps: LinkDeps = \{ fetch: \(u, init\) => fetch\(u, init\), refuse/);
    expect(fn).toContain('fetchMicrosoftLink(link, access, deps)');
    /* the way it went is told only to the check key, never to a signed-in person */
    expect(fn).toMatch(/const trace = checkKey !== null && body\.trace === true;/);
    expect(fn).toMatch(/unfetchable\(u\)/);
    expect(fn).toMatch(/found\.some\(privateAddress\)/);
  });
});

describe('a link pasted into Luna’s box and sent', () => {
  it('is a file to read only when the words are nothing but a share link, or a web address ending in a file she reads', () => {
    expect(fileLinkIn(' https://1drv.ms/x/c/abc/EaBc?e=1 ')).toBe('https://1drv.ms/x/c/abc/EaBc?e=1');
    expect(fileLinkIn('https://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOpQrStUvWxYz012345/edit')).toBeTruthy();
    expect(fileLinkIn('https://www.dropbox.com/scl/fi/abc/report.xlsx?rlkey=k&dl=0')).toBeTruthy();
    expect(fileLinkIn('https://files.example.org/reports/march.xlsx')).toBeTruthy();
    expect(fileLinkIn('https://files.example.org/reports/march.CSV?x=1')).toBeTruthy();
  });
  it('any other web address, and a link among other words, stays words for Luna', () => {
    for (const w of ['https://www.bbc.co.uk/news', 'https://example.org/', 'look at https://1drv.ms/x/c/abc/EaBc?e=1', 'https://1drv.ms/x/c/abc/EaBc?e=1 why is line 3 short', 'http://files.example.org/march.xlsx', 'march.xlsx', ''])
      expect(fileLinkIn(w), w).toBeUndefined();
  });
});

