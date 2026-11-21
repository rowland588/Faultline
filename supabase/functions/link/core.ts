// COPIED FROM src/lib/fileLink by scripts/sync-assist.mjs — edit the source, then run it.
/* A FILE BY ITS LINK — the rules of fetching it (21 November 2026, docs/CONNECTED-LUNA.md, X1b — Rowland: "I'm not a business, so I
 * can't do the SharePoint thing … I need to get to the point where I can connect to a URL and extract").
 *
 * A workbook kept where a link can be given out — a personal OneDrive, Google Drive or Sheets, Dropbox, a SharePoint file shared as
 * "Anyone with the link", or any https address that gives a file — is fetched by Luna's cloud (the `link` function) and read on the
 * device exactly as an upload is. No Microsoft registration, no business account, no sign-in to the service: the link is the key.
 *
 * THIS FILE IS THE RULES, shared word for word with that function (scripts/sync-assist.mjs copies it to supabase/functions/link/core.ts),
 * so the app's unit tests prove the code the cloud runs. It is pure: the network and the address check are handed in.
 *   linkKind      which service a link is from, in words — said to the person before anything is fetched;
 *   directForm    the address that gives the FILE ITSELF where a service's shared link opens a viewer (its own documented download
 *                 form: ?download=1, export?format=xlsx, dl=1 …) — applied at the start, at every redirect, and once more if a web
 *                 page comes back;
 *   fetchByLink   the fetch: every hop checked by `refuse` (https only, never a private address — the ingest core's rule), at most
 *                 eight redirects, cookies kept only for the host that set them and only for this one fetch, the answer told from its
 *                 first bytes (a workbook, a PDF, an older Office file, delimited text — never a web page), and no more than 60 MB.
 * NOT PROVED HERE: the services' own behaviour. The build environment cannot reach OneDrive, Google or Dropbox, so the direct forms are
 * the documented ones, tested as strings and against a played service; a link that still opens a web page is said so, with what to do. */

export type LinkService = 'onedrive' | 'sharepoint' | 'google-sheets' | 'google-drive' | 'dropbox' | 'web';
export interface LinkKind { service: LinkService; /** "A OneDrive link" */ said: string; host: string }

export const LINK_LIMITS = { maxBytes: 60 * 1024 * 1024, maxHops: 8, timeoutMs: 60_000 } as const;

const hostOf = (u: string): string => { try { return new URL(u).hostname.toLowerCase().replace(/\.$/, ''); } catch { return ''; } };
const under = (h: string, d: string) => h === d || h.endsWith(`.${d}`);

/** Which service a link is from — undefined when it is not a web address at all. */
export function linkKind(u: string): LinkKind | undefined {
  let p: URL;
  try { p = new URL(u.trim()); } catch { return undefined; }
  if (p.protocol !== 'https:' && p.protocol !== 'http:') return undefined;
  const host = p.hostname.toLowerCase().replace(/\.$/, '');
  if (!host.includes('.')) return undefined;
  if (host === '1drv.ms' || under(host, 'onedrive.live.com') || under(host, 'onedrive.com') || under(host, 'microsoftpersonalcontent.com') || under(host, '1drv.com')) return { service: 'onedrive', said: 'A OneDrive link', host };
  if (under(host, 'sharepoint.com')) return { service: 'sharepoint', said: 'A SharePoint link', host };
  if (host === 'docs.google.com' && /^\/spreadsheets\//.test(p.pathname)) return { service: 'google-sheets', said: 'A Google Sheets link', host };
  if (host === 'drive.google.com' || host === 'drive.usercontent.google.com' || host === 'docs.google.com') return { service: 'google-drive', said: 'A Google Drive link', host };
  if (under(host, 'dropbox.com') || under(host, 'dropboxusercontent.com')) return { service: 'dropbox', said: 'A Dropbox link', host };
  return { service: 'web', said: 'A web link', host };
}

/** What to do when a service gives a web page or asks for a sign-in instead of the file — in the service's own words for it. */
export function shareAdvice(service: LinkService): string {
  if (service === 'onedrive' || service === 'sharepoint') return 'In OneDrive or SharePoint choose Share, set it to “Anyone with the link”, copy that link and paste it here.';
  if (service === 'google-sheets' || service === 'google-drive') return 'In Google Drive choose Share, set General access to “Anyone with the link”, copy that link and paste it here.';
  if (service === 'dropbox') return 'In Dropbox choose Share, then Copy link, and paste that link here.';
  return 'Paste a link that gives the file itself — one that downloads the workbook when opened.';
}

/** The address that gives the file itself, where a shared link opens a viewer — undefined when there is none or it is already that. */
export function directForm(u: string): string | undefined {
  let p: URL;
  try { p = new URL(u); } catch { return undefined; }
  const h = p.hostname.toLowerCase().replace(/\.$/, '');
  const path = p.pathname;
  const q = p.searchParams;

  /* Google Sheets — published to the web, then a shared sheet: Google's own export as an Excel workbook */
  if (h === 'docs.google.com') {
    const pub = /^\/spreadsheets\/d\/e\/([A-Za-z0-9_-]+)\/pub(?:html)?$/.exec(path);
    if (pub) return q.get('output') === 'xlsx' ? undefined : `https://docs.google.com/spreadsheets/d/e/${pub[1]}/pub?output=xlsx`;
    const sheet = /^\/spreadsheets\/(?:u\/\d+\/)?d\/([A-Za-z0-9_-]{20,})(?:\/([a-z]*))?/.exec(path);
    if (sheet) return sheet[2] === 'export' && q.get('format') ? undefined : `https://docs.google.com/spreadsheets/d/${sheet[1]}/export?format=xlsx`;
    return undefined;
  }
  /* Google Drive — a file kept there (an .xlsx, a .csv, a PDF) */
  if (h === 'drive.google.com') {
    const id = /^\/file\/(?:u\/\d+\/)?d\/([A-Za-z0-9_-]{20,})/.exec(path)?.[1] ?? ((path === '/open' || path === '/uc') ? q.get('id') ?? undefined : undefined);
    return id && /^[A-Za-z0-9_-]{20,}$/.test(id) ? `https://drive.usercontent.google.com/download?id=${id}&export=download&confirm=t` : undefined;
  }
  /* Dropbox — dl=1 gives the file, dl=0 its page */
  if (h === 'www.dropbox.com' || h === 'dropbox.com') {
    if (!/^\/(s|scl|sh)\//.test(path) || q.get('dl') === '1' || q.get('raw') === '1') return undefined;
    q.set('dl', '1');
    return p.toString();
  }
  /* SharePoint — a sharing link (/:x:/…) with download=1; a viewer address as its download page */
  if (under(h, 'sharepoint.com')) {
    if (/^\/:[a-z]:\//i.test(path)) { if (q.get('download') === '1') return undefined; q.set('download', '1'); return p.toString(); }
    if (/\/_layouts\/15\/Doc\.aspx$/i.test(path) && q.get('sourcedoc')) {
      const id = (q.get('sourcedoc') ?? '').replace(/[{}]/g, '');
      return `${p.origin}${path.replace(/Doc\.aspx$/i, 'download.aspx')}?UniqueId=${encodeURIComponent(id)}`;
    }
    if (/\/_layouts\/15\/onedrive\.aspx$/i.test(path) && q.get('id')) return `${p.origin}${path.replace(/onedrive\.aspx$/i, 'download.aspx')}?SourceUrl=${encodeURIComponent(q.get('id') ?? '')}`;
    return undefined;
  }
  /* OneDrive (personal) — the older redir / embed / viewer addresses as download; the newer sharing form with download=1.
     1drv.ms is a short link: it is followed first, and where it lands is given its direct form */
  if (h === 'onedrive.live.com') {
    /* the OLDER redir/embed address becomes /download only while it carries its own key (authkey). A link since moved onto OneDrive's
       newer storage (migratedtospo, redeem=…) must be FOLLOWED as it is: /download sends it to a sign-in (seen on real OneDrive, 21
       November — scripts/eval/link-real.mjs), while following it lands on the sharing address below, which download=1 turns into the file */
    if (/^\/(redir|embed|view\.aspx)$/i.test(path) && (q.get('resid') || q.get('id'))) {
      if (!q.get('authkey') || q.get('migratedtospo') || q.get('redeem')) return undefined;
      p.pathname = '/download';
      return p.toString();
    }
    if (path === '/' && q.get('id') && q.get('authkey')) return `https://onedrive.live.com/download?resid=${encodeURIComponent(q.get('id') ?? '')}&authkey=${encodeURIComponent(q.get('authkey') ?? '')}`;
    if (/^\/:[a-z]:\//i.test(path) || /^\/personal\//i.test(path)) { if (q.get('download') === '1') return undefined; q.set('download', '1'); return p.toString(); }
    return undefined;
  }
  return undefined;
}

/* ------------------------------------------------------------------ what came back */
export type FileKind = 'zip' | 'pdf' | 'old-office' | 'csv' | 'page' | 'other';

/** What the first bytes are: an Office file of today (a zip — .xlsx, .xlsm, .docx), a PDF, an older Office file (.xls, .doc),
 *  delimited text, a web page, or something else. The service's own word for the type is only a hint — the bytes decide. */
export function kindOfBytes(head: Uint8Array, type = '', name = ''): FileKind {
  const b = head;
  if (b.length >= 4 && b[0] === 0x50 && b[1] === 0x4b && (b[2] === 0x03 || b[2] === 0x05) && (b[3] === 0x04 || b[3] === 0x06)) return 'zip';
  if (b.length >= 4 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return 'pdf';
  if (b.length >= 4 && b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0) return 'old-office';
  let text = '';
  try { text = new TextDecoder('utf-8', { fatal: false }).decode(b.subarray(0, 2048)); } catch { return 'other'; }
  const start = text.replace(/^\uFEFF/, '').trimStart().slice(0, 200).toLowerCase();
  if (/^(<!doctype html|<html|<head|<body|<script|<\?xml[^>]*>\s*<html)/.test(start) || /text\/html/i.test(type)) return 'page';
  /* text of rows: no control bytes, and a row broken by a comma, tab or semicolon — or the service or the name says CSV */
  // eslint-disable-next-line no-control-regex
  const clean = !/[\u0000-\u0008\u000e-\u001f]/.test(text);
  if (clean && text.length > 0 && (/text\/csv|\/csv\b/i.test(type) || /\.(csv|tsv|txt)$/i.test(name) || /^[^\n]*[,;\t][^\n]*\r?\n/.test(text))) return 'csv';
  return 'other';
}

const EXT: Record<FileKind, string> = { zip: '.xlsx', pdf: '.pdf', 'old-office': '.xls', csv: '.csv', page: '', other: '' };

/** The file's name: the service's own (Content-Disposition), else the last part of the address, else a plain one — never a path,
 *  never longer than 140 characters, and with an ending the reader can tell it by. */
export function nameOfFile(disposition: string | null, url: string, kind: FileKind): string {
  let name = '';
  const star = /filename\*\s*=\s*(?:UTF-8|utf-8)''([^;]+)/.exec(disposition ?? '');
  if (star) { try { name = decodeURIComponent(star[1].trim().replace(/^"|"$/g, '')); } catch { name = ''; } }
  if (!name) { const plain = /filename\s*=\s*("([^"]*)"|[^;]+)/.exec(disposition ?? ''); if (plain) name = (plain[2] ?? plain[1]).trim(); }
  if (!name) { try { const last = decodeURIComponent(new URL(url).pathname.split('/').filter(Boolean).pop() ?? ''); if (/\.[A-Za-z0-9]{2,5}$/.test(last)) name = last; } catch { /* none */ } }
  // eslint-disable-next-line no-control-regex
  name = name.replace(/[\u0000-\u001f\u007f]/g, '').replace(/[\\/:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim().slice(-140);
  if (!name) name = 'File from a link';
  if (!/\.[A-Za-z0-9]{2,5}$/.test(name)) name += EXT[kind];
  return name;
}

/* ------------------------------------------------------------------ the fetch */
export interface LinkDeps {
  /** One request, redirects NOT followed. */
  fetch: (url: string, init: { headers: Record<string, string>; redirect: 'manual'; signal?: AbortSignal }) => Promise<Response>;
  /** Why an address may not be fetched, or undefined — https only, never a private, loopback or link-local address. */
  refuse: (url: string) => Promise<string | undefined> | string | undefined;
  maxBytes?: number; maxHops?: number; signal?: AbortSignal;
  /** Told each answer on the way (its address, status, type, where it sent us next, the NAMES of cookies it set) — for the check that
   *  proves the function against the real services (scripts/eval/link-real.mjs); never the person's own request. */
  onHop?: (hop: LinkHop) => void;
}
export interface LinkHop { url: string; status: number; type: string; location: string; cookies: string[] }
export type LinkRefusal = 'address' | 'page' | 'sign-in' | 'gone' | 'service' | 'kind' | 'size' | 'redirects' | 'network';
export type Fetched =
  | { ok: true; name: string; kind: FileKind; type: string; service: LinkService; host: string; etag?: string; modified?: string; size?: number; body: ReadableStream<Uint8Array> }
  | { ok: false; code: LinkRefusal; why: string };

const SIGN_IN = /(^|\.)(login\.microsoftonline\.com|login\.live\.com|login\.microsoft\.com|login\.windows\.net|accounts\.google\.com)$/i;
const mb = (n: number) => `${Math.round(n / (1024 * 1024))} MB`;

/** Cookies a service sets on the way to the file (SharePoint and OneDrive hand an anonymous link's pass this way): kept for this one
 *  fetch only, and sent back only to the host that set them or a host under the Domain they named. */
function cookieJar() {
  const kept: { name: string; value: string; domain: string; hostOnly: boolean }[] = [];
  return {
    take(res: Response, at: string): string[] {
      const host = hostOf(at);
      const names: string[] = [];
      const all = typeof (res.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie === 'function'
        ? (res.headers as Headers & { getSetCookie: () => string[] }).getSetCookie() : (res.headers.get('set-cookie') ? [res.headers.get('set-cookie') as string] : []);
      for (const line of all) {
        const [pair, ...attrs] = line.split(';');
        const eq = pair.indexOf('=');
        if (eq < 1) continue;
        const name = pair.slice(0, eq).trim(), value = pair.slice(eq + 1).trim();
        names.push(name);
        const d = attrs.map(a => a.trim()).find(a => /^domain=/i.test(a))?.slice(7).trim().toLowerCase().replace(/^\./, '');
        /* a Domain the setting host is not under is not honoured */
        const domain = d && under(host, d) && d.includes('.') ? d : host;
        const i = kept.findIndex(c => c.name === name && c.domain === domain);
        if (i >= 0) kept.splice(i, 1);
        kept.push({ name, value, domain, hostOnly: domain === host && !d });
      }
      return names;
    },
    for(at: string): string {
      const host = hostOf(at);
      return kept.filter(c => (c.hostOnly ? host === c.domain : under(host, c.domain))).map(c => `${c.name}=${c.value}`).join('; ');
    },
  };
}

/** Fetch the file a link points at. Never throws: an answer or the reason in words. */
export async function fetchByLink(start: string, deps: LinkDeps): Promise<Fetched> {
  const first = linkKind(start);
  if (!first) return { ok: false, code: 'address', why: 'That is not a web link — paste the whole link, starting https://' };
  const service = first.service;
  const maxBytes = deps.maxBytes ?? LINK_LIMITS.maxBytes, maxHops = deps.maxHops ?? LINK_LIMITS.maxHops;
  const jar = cookieJar();
  const tried = new Set<string>();
  let at = directForm(start.trim()) ?? start.trim();

  for (let hop = 0; hop <= maxHops; hop++) {
    tried.add(at);
    const bad = await deps.refuse(at);
    if (bad) return { ok: false, code: 'address', why: hop ? `The link led to an address that is not fetched: ${bad}.` : `That address is not fetched: ${bad}.` };
    if (SIGN_IN.test(hostOf(at))) return { ok: false, code: 'sign-in', why: `The link asks for a sign-in, so it is not open to anyone who has it. ${shareAdvice(service)}` };
    let res: Response;
    const cookie = jar.for(at);
    try {
      res = await deps.fetch(at, { headers: { Accept: '*/*', 'User-Agent': 'Mozilla/5.0 (compatible; Faultline/1.0; file by link)', ...(cookie ? { Cookie: cookie } : {}) }, redirect: 'manual', ...(deps.signal ? { signal: deps.signal } : {}) });
    } catch (e) {
      const slow = e instanceof Error && (e.name === 'TimeoutError' || e.name === 'AbortError');
      return { ok: false, code: 'network', why: slow ? 'The service did not answer in time — try again in a minute.' : `${first.host} could not be reached — check the link and try again.` };
    }
    const setNames = jar.take(res, at);
    deps.onHop?.({ url: at, status: res.status, type: res.headers.get('content-type') ?? '', location: res.headers.get('location') ?? '', cookies: setNames });

    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      await res.body?.cancel().catch(() => undefined);
      let next: string;
      try { next = new URL(res.headers.get('location') as string, at).toString(); } catch { return { ok: false, code: 'service', why: 'The link redirected to an address that could not be read.' }; }
      const direct = directForm(next);
      at = direct && !tried.has(direct) ? direct : next;
      continue;
    }
    if (res.status === 401 || res.status === 403) { await res.body?.cancel().catch(() => undefined); return { ok: false, code: 'sign-in', why: `The service refused the link (${res.status}) — it is not open to anyone who has it. ${shareAdvice(service)}` }; }
    if (res.status === 404 || res.status === 410) { await res.body?.cancel().catch(() => undefined); return { ok: false, code: 'gone', why: 'The link no longer points at a file — it may have been moved, renamed or un-shared. Copy the link again from where the file is kept.' }; }
    if (res.status < 200 || res.status >= 300) { await res.body?.cancel().catch(() => undefined); return { ok: false, code: 'service', why: `The service answered ${res.status} — try again in a minute.` }; }

    const declared = Number(res.headers.get('content-length') ?? 0);
    if (declared > maxBytes) { await res.body?.cancel().catch(() => undefined); return { ok: false, code: 'size', why: `The file is ${mb(declared)} — more than the ${mb(maxBytes)} a link may bring in. Attach it from this device instead.` }; }

    /* the first bytes say what it is */
    const reader = res.body?.getReader();
    if (!reader) return { ok: false, code: 'service', why: 'The service sent nothing back.' };
    const parts: Uint8Array[] = [];
    let got = 0;
    /* true when the whole file was in those first bytes */
    const whole = await (async () => {
      for (;;) {
        if (got >= 2048) return false;
        const { done, value } = await reader.read();
        if (done) return true;
        if (value?.length) { parts.push(value); got += value.length; }
      }
    })();
    const head = new Uint8Array(got);
    { let o = 0; for (const part of parts) { head.set(part, o); o += part.length; } }
    const type = res.headers.get('content-type') ?? '';
    const kind = kindOfBytes(head, type, nameOfFile(res.headers.get('content-disposition'), at, 'other'));

    if (kind === 'page') {
      await reader.cancel().catch(() => undefined);
      const direct = directForm(at);
      if (direct && !tried.has(direct)) { at = direct; continue; }
      return { ok: false, code: 'page', why: `The link opens a web page, not the file itself. ${shareAdvice(service)}` };
    }
    if (got === 0) { return { ok: false, code: 'service', why: 'The link gave an empty file.' }; }
    if (kind === 'other') { await reader.cancel().catch(() => undefined); return { ok: false, code: 'kind', why: 'The link gives something Luna does not read — she reads Excel workbooks (.xlsx, .xlsm), CSV, PDF and Word files.' }; }

    let size = got;
    const body = new ReadableStream<Uint8Array>({
      start(c) { if (head.length) c.enqueue(head); if (whole) c.close(); },
      async pull(c) {
        try {
          const { done, value } = await reader.read();
          if (done) { c.close(); return; }
          size += value.length;
          if (size > maxBytes) { await reader.cancel().catch(() => undefined); c.error(new Error(`more than ${mb(maxBytes)}`)); return; }
          c.enqueue(value);
        } catch (e) { c.error(e); }
      },
      cancel() { return reader.cancel().catch(() => undefined); },
    });
    const etag = res.headers.get('etag') ?? undefined, modified = res.headers.get('last-modified') ?? undefined;
    return { ok: true, name: nameOfFile(res.headers.get('content-disposition'), at, kind), kind, type, service, host: hostOf(at), ...(etag ? { etag } : {}), ...(modified ? { modified } : {}), ...(declared ? { size: declared } : {}), body };
  }
  return { ok: false, code: 'redirects', why: 'The link redirected too many times to be followed.' };
}
