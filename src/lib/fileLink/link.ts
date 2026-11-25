/* A FILE BY ITS LINK — the app's side (21 November 2026, docs/CONNECTED-LUNA.md, X1b). The link is sent to Luna's cloud (the `link`
 * function — a browser may not read another site's download), the file comes back as bytes and is handed to the reader exactly as an
 * upload is, with WHERE IT CAME FROM kept beside it: the link, the service, and the file's own fingerprint (SHA-256 of its bytes), so
 * "Check for a newer version" is the same link fetched again and the two fingerprints compared — no service's own version number is
 * trusted, because a shared link's download does not reliably give one. Nothing of the file goes to the AI service. */
import { supabase } from '../../cloud/client';
import { cloudConfig } from '../../cloud/config';
import { linkKind, type LinkService } from './linkCore';
import { accessToken } from '../microsoft/auth';
import { PRODUCT } from '../product';

export { linkKind, shareAdvice, type LinkService } from './linkCore';

/** Where a file read by its link came from. `hash` is the fingerprint of the bytes read; `path` what a list says of it. */
export interface LinkOrigin { kind: 'link'; privateMicrosoft?: boolean; url: string; service: LinkService; said: string; host: string; path: string; hash: string; eTag?: string; modifiedAt: number; checkedAt: number }

export class LinkError extends Error { code: string; constructor(why: string, code = 'link') { super(why); this.code = code; } }

/** THE SAMPLE LINK — a made-up month of a food factory's plan and actual, kept on Faultline's own site, so the whole path (a link → the cloud fetches it → Luna reads
 *  it on the device) can be tried with no account anywhere. Every name and figure in it is invented. */
export const SAMPLE_LINK = `https://${PRODUCT.domain}/sample/Plan-and-actual-October.xlsx`;

const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
/** The fingerprint of a file's bytes. */
export async function fingerprint(b: Blob): Promise<string> { return hex(await crypto.subtle.digest('SHA-256', await b.arrayBuffer())); }

const TYPE: Record<string, string> = { xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', xlsm: 'application/vnd.ms-excel.sheet.macroEnabled.12', csv: 'text/csv', pdf: 'application/pdf', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', xls: 'application/vnd.ms-excel' };

/** Fetch the file a link points at, through Luna's cloud, as a File the reader takes — with where it came from. */
export async function fetchLink(url: string, requireMicrosoft = false): Promise<{ file: File; origin: LinkOrigin }> {
  return readLink(url, requireMicrosoft ? 'signed' : 'auto');
}

/** Public connector diagnostics must never use a person's Microsoft session. */
export async function fetchPublicLink(url: string, signal?: AbortSignal): Promise<File> {
  return (await readLink(url, 'public', signal)).file;
}

async function readLink(url: string, mode: 'auto' | 'signed' | 'public', signal?: AbortSignal): Promise<{ file: File; origin: LinkOrigin }> {
  const link = url.trim();
  const kind = linkKind(link);
  if (!kind) throw new LinkError('That is not a web link — paste the whole link, starting https://', 'address');
  const config = cloudConfig;
  if (!supabase || !config) throw new LinkError('This device is not connected to Faultline’s cloud, which fetches the file.', 'cloud');
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new LinkError('Sign in to Faultline first.', 'auth');
  const request = async (microsoftAccess?: string) => {
    let res: Response;
    try {
      res = await fetch(`${config.url}/functions/v1/link`, { method: 'POST', signal, headers: { Authorization: `Bearer ${token}`, apikey: config.key, 'Content-Type': 'application/json' }, body: JSON.stringify({ url: link, ...(microsoftAccess ? { microsoftAccess } : {}) }) });
    } catch { throw new LinkError('No signal — the file link needs a connection.', 'network'); }
    if (!res.ok) {
      const j = await res.json().catch(() => null);
      throw new LinkError(j?.why || j?.message || `The link could not be fetched (${res.status}).`, j?.code || 'service');
    }
    return res;
  };
  const microsoft = kind.service === 'onedrive' || kind.service === 'sharepoint';
  const privateRead = async () => {
    const access = microsoft ? (await accessToken(true) ?? await accessToken()) : null;
    if (!access) throw new LinkError('Sign in with the Microsoft account that can open this file.', 'microsoft-sign-in');
    try { return await request(access); } catch (e) {
      if (e instanceof LinkError && e.code === 'sign-in') throw new LinkError(e.message, 'microsoft-sign-in');
      throw e;
    }
  };
  let privateMicrosoft = mode === 'signed';
  let res: Response;
  if (privateMicrosoft) res = await privateRead();
  else {
    try { res = await request(); } catch (e) {
      if (mode === 'public' || !microsoft || !(e instanceof LinkError) || !['sign-in', 'page', 'gone'].includes(e.code)) throw e;
      privateMicrosoft = true;
      res = await privateRead();
    }
  }
  let blob: Blob;
  try { blob = await res.blob(); } catch { throw new LinkError('The file stopped part way — it may be more than 60 MB. Attach it from this device instead.', 'size'); }
  const name = (() => { try { return decodeURIComponent(res.headers.get('x-link-name') ?? ''); } catch { return ''; } })() || 'File from a link.xlsx';
  const ext = /\.([A-Za-z0-9]+)$/.exec(name)?.[1].toLowerCase() ?? '';
  const modified = Date.parse(res.headers.get('x-link-modified') ?? '');
  const now = Date.now();
  const file = new File([blob], name, { type: TYPE[ext] ?? blob.type, lastModified: Number.isFinite(modified) ? modified : now });
  const etag = (() => { try { return decodeURIComponent(res.headers.get('x-link-etag') ?? ''); } catch { return ''; } })();
  return { file, origin: { kind: 'link', ...(privateMicrosoft ? { privateMicrosoft: true } : {}), url: link, service: kind.service, said: kind.said, host: kind.host, path: `${kind.said.replace(/^A /, '')} · ${kind.host}`, hash: await fingerprint(blob), ...(etag ? { eTag: etag } : {}), modifiedAt: Number.isFinite(modified) ? modified : now, checkedAt: now } };
}

/** Has the file behind a link changed since it was read? The link fetched again; its fingerprint against the one kept. A changed
 *  file comes back ready to read, so it is not fetched twice. */
export async function linkNewerThan(o: LinkOrigin): Promise<{ newer: boolean; file: File; origin: LinkOrigin }> {
  const got = await fetchLink(o.url, o.privateMicrosoft);
  return { newer: got.origin.hash !== o.hash, ...got };
}

/** A LINK TO A FILE, AND NOTHING ELSE: the words are one web link from a service files are shared by — or a web address that ends in a
 *  file Luna reads — so sending it means "read this". Any other web address, and a link among other words, is left as words. */
export function fileLinkIn(words: string): string | undefined {
  const w = words.trim();
  if (!w || /\s/.test(w) || !/^https:\/\//i.test(w)) return undefined;
  const k = linkKind(w);
  if (!k) return undefined;
  if (k.service !== 'web') return w;
  try { return /\.(xlsx|xlsm|csv|pdf|docx|xls)$/i.test(new URL(w).pathname) ? w : undefined; } catch { return undefined; }
}

