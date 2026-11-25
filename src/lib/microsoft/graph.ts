/* FILES FROM SHAREPOINT AND ONEDRIVE, THROUGH MICROSOFT GRAPH (20 November, docs/CONNECTED-LUNA.md X1).
 *
 * Read-only: lists what the signed-in person can already open — their own OneDrive, the SharePoint sites they can
 * find and those sites' libraries — and downloads ONE chosen file to this device, where the same reader as an upload reads it. Nothing
 * is written, moved or deleted in Microsoft 365. Only the files Faultline can read are offered: workbooks (.xlsx, .xlsm), CSV, and a
 * factory's documents (PDF, Word). */
import { accessToken } from './auth';

export const GRAPH = 'https://graph.microsoft.com/v1.0';

/** A folder or a file as the picker shows it. */
export interface MsItem {
  id: string; name: string; folder: boolean; size: number; modifiedAt: number;
  driveId: string; eTag?: string; webUrl?: string; download?: string;
  /** "My files", a site's name — where it is, said. */
  where?: string;
}
/** Where a file came from — kept on its record so its version can be checked and every figure said to come from it. */
export interface MsOrigin { kind: 'microsoft'; driveId: string; itemId: string; eTag?: string; webUrl?: string; path: string; modifiedAt: number }

const READABLE = /\.(xlsx|xlsm|csv|pdf|docx)$/i;
/** A file the reader can take; an older Excel format is offered so the person is told why it cannot be read. */
export const offered = (name: string): boolean => READABLE.test(name) || /\.(xls|xlsb)$/i.test(name);

interface GraphItem {
  id: string; name: string; size?: number; lastModifiedDateTime?: string; eTag?: string; webUrl?: string; folder?: object; file?: object;
  remoteItem?: GraphItem & { parentReference?: { driveId?: string } };
  parentReference?: { driveId?: string; path?: string };
  '@microsoft.graph.downloadUrl'?: string;
}

/** A Graph item as the picker's own — a shared or recent item's remote target taken where Graph gives one. */
export function itemOf(g: GraphItem, where?: string): MsItem {
  const t = g.remoteItem ?? g;
  return {
    id: t.id, name: g.name ?? t.name, folder: !!(t.folder ?? g.folder), size: t.size ?? g.size ?? 0,
    modifiedAt: Date.parse(t.lastModifiedDateTime ?? g.lastModifiedDateTime ?? '') || 0,
    driveId: t.parentReference?.driveId ?? g.parentReference?.driveId ?? '', eTag: t.eTag ?? g.eTag, webUrl: t.webUrl ?? g.webUrl,
    download: g['@microsoft.graph.downloadUrl'] ?? t['@microsoft.graph.downloadUrl'], ...(where ? { where } : {}),
  };
}
/** Folders first, then the files Faultline can read, each by name — never a file it cannot read. */
export function shown(items: MsItem[]): MsItem[] {
  return items.filter(i => i.folder || offered(i.name))
    .sort((a, b) => Number(b.folder) - Number(a.folder) || a.name.localeCompare(b.name, 'en-GB', { sensitivity: 'base' }));
}

export class SignInNeeded extends Error { constructor() { super('Sign in to Microsoft again — the sign-in on this device has ended.'); } }

async function get<T>(path: string): Promise<T> {
  const token = await accessToken();
  if (!token) throw new SignInNeeded();
  const url = new URL(path.startsWith('/') ? path.slice(1) : path, `${GRAPH}/`);
  if (url.origin !== new URL(GRAPH).origin || !url.pathname.startsWith('/v1.0/')) throw new Error('Microsoft returned a file list address outside Microsoft Graph.');
  let r: Response;
  try { r = await fetch(url.toString(), { headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30_000) }); }
  catch { throw new Error('Microsoft could not be reached or did not answer in time — check the connection and try again.'); }
  if (r.status === 401) throw new SignInNeeded();
  if (!r.ok) {
    const detail = await r.json().catch(() => null);
    const error = detail?.error;
    const code = typeof error?.code === 'string' ? error.code.slice(0, 80) : '';
    const message = typeof error?.message === 'string' ? error.message.trim().slice(0, 350) : '';
    const ref = r.headers.get('request-id') ?? error?.innerError?.['request-id'];
    const reason = [code, message].filter(Boolean).join(' — ');
    const help = r.status === 403 ? 'This account needs permission to open this resource. Ask the site owner about access or IT about app consent.' :
      r.status === 404 ? 'Check the site or file address and the Microsoft account you signed in with.' : '';
    throw new Error([`Microsoft returned ${r.status}${reason ? ` (${reason})` : ''}.`, help, typeof ref === 'string' ? `Request ID: ${ref.slice(0, 80)}` : ''].filter(Boolean).join(' '));
  }
  return r.json() as Promise<T>;
}
async function pages<T>(path: string): Promise<T[]> {
  const all: T[] = [];
  let next: string | undefined = path;
  const seen = new Set<string>();
  while (next && all.length < 5_000 && seen.size < 25) {
    if (seen.has(next)) throw new Error('Microsoft repeated a file list page — try again.');
    seen.add(next);
    const j: { value?: T[]; '@odata.nextLink'?: string } = await get(next);
    all.push(...(j.value ?? []));
    next = j['@odata.nextLink'];
  }
  if (next) throw new Error('Microsoft returned too many results to list here. Open a smaller folder or narrow the search.');
  return all;
}
async function list(path: string, where?: string): Promise<MsItem[]> {
  return (await pages<GraphItem>(path)).map(g => itemOf(g, where));
}

/** Verify identity separately from a particular Microsoft 365 resource. A guest may have no personal drive. */
export async function checkFilesConnection(siteUrl: string, guest: boolean): Promise<{ account: string; access: string; warning?: string }> {
  const me = await get<{ id: string; displayName?: string; userPrincipalName?: string }>('/me?$select=id,displayName,userPrincipalName');
  if (!me.id) throw new Error('Microsoft did not return the signed-in account.');
  const account = me.displayName || me.userPrincipalName || 'your Microsoft account';
  if (siteUrl) {
    if (!/^https:\/\//i.test(siteUrl)) throw new Error('Paste the SharePoint site’s HTTPS home-page URL.');
    const [site] = await sites(siteUrl);
    const drives = await libraries(site);
    return { account, access: `${site.name}: Microsoft listed ${drives.length} visible document ${drives.length === 1 ? 'library' : 'libraries'}.` };
  }
  if (guest) return { account, access: 'Guest sign-in verified. Enter the customer’s SharePoint site URL to check its libraries.' };
  try {
    const page = await get<{ value: unknown[] }>('/me/drive/root/children?$top=1&$select=id');
    if (!Array.isArray(page.value)) throw new Error('Microsoft returned an unexpected file list.');
    return { account, access: 'OneDrive file listing verified. Enter a SharePoint site URL to check that site separately.' };
  } catch (e) {
    if (e instanceof SignInNeeded) throw e;
    return { account, access: 'Microsoft sign-in verified. Enter a SharePoint site URL to check its libraries.', warning: `OneDrive check: ${e instanceof Error ? e.message : String(e)}` };
  }
}
export const myFiles = (): Promise<MsItem[]> => list('/me/drive/root/children?$top=200', 'My files').then(shown);
export const folder = (driveId: string, itemId: string, where?: string): Promise<MsItem[]> =>
  list(`/drives/${encodeURIComponent(driveId)}/items/${encodeURIComponent(itemId)}/children?$top=200`, where).then(shown);

export interface MsSite { id: string; name: string; webUrl?: string }
export async function sites(words: string): Promise<MsSite[]> {
  if (/^https?:/i.test(words.trim())) {
    const input = new URL(words.trim());
    if (input.protocol !== 'https:' || !input.hostname.endsWith('.sharepoint.com') || input.username || input.password || input.port) throw new Error('Paste the HTTPS address of the customer’s SharePoint site.');
    const path = input.pathname.replace(/\/SitePages\/[^/]+\.aspx$/i, '').replace(/\/$/, '');
    if (path && !/^\/(sites|teams)\/[^/]+(\/[^/:.]+)*$/i.test(path)) throw new Error('Open the SharePoint site’s home page and copy its address.');
    const site = await get<{ id: string; displayName?: string; name?: string; webUrl?: string }>(`/sites/${input.hostname}:${path || '/'}`);
    return [{ id: site.id, name: site.displayName ?? site.name ?? input.hostname, webUrl: site.webUrl }];
  }
  const all = await pages<{ id: string; displayName?: string; name?: string; webUrl?: string }>(`/sites?search=${encodeURIComponent(words.trim() || '*')}`);
  return all.map(s => ({ id: s.id, name: s.displayName ?? s.name ?? 'A site', webUrl: s.webUrl }));
}
/** A site's document libraries, each opened at its top. */
export async function libraries(site: MsSite): Promise<{ driveId: string; name: string }[]> {
  const all = await pages<{ id: string; name: string }>(`/sites/${encodeURIComponent(site.id)}/drives`);
  return all.map(d => ({ driveId: d.id, name: d.name }));
}
export const libraryTop = (driveId: string, where: string): Promise<MsItem[]> =>
  list(`/drives/${encodeURIComponent(driveId)}/root/children?$top=200`, where).then(shown);

/** The file as it is now — its version (eTag) and a fresh download address. */
export async function current(driveId: string, itemId: string): Promise<MsItem> {
  return itemOf(await get<GraphItem>(`/drives/${encodeURIComponent(driveId)}/items/${encodeURIComponent(itemId)}`));
}

/** Download the file to this device as a File the reader takes, with where it came from. */
export async function download(item: MsItem, path: string): Promise<{ file: File; origin: MsOrigin }> {
  const now = item.download ? item : await current(item.driveId, item.id);
  if (!now.download) throw new Error('Microsoft gave no way to download that file.');
  let r: Response;
  try { r = await fetch(now.download, { signal: AbortSignal.timeout(120_000) }); }
  catch { throw new Error('The file download stopped — check the connection and try again.'); }
  if (!r.ok) throw new Error(`The file did not download (${r.status}) — try again.`);
  const blob = await r.blob();
  const file = new File([blob], item.name, { lastModified: now.modifiedAt || Date.now(), type: blob.type });
  return { file, origin: { kind: 'microsoft', driveId: now.driveId || item.driveId, itemId: now.id, eTag: now.eTag, webUrl: now.webUrl, path, modifiedAt: now.modifiedAt } };
}

/** Has the file changed since it was read? Its eTag against the one kept. */
export async function newerThan(o: MsOrigin): Promise<{ newer: boolean; item: MsItem }> {
  const item = await current(o.driveId, o.itemId);
  return { newer: !!item.eTag && item.eTag !== o.eTag, item };
}
