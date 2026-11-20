/* FILES FROM SHAREPOINT AND ONEDRIVE, THROUGH MICROSOFT GRAPH (20 November, docs/CONNECTED-LUNA.md X1).
 *
 * Read-only: lists what the signed-in person can already open — their recent files, their own OneDrive, the SharePoint sites they can
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
  const r = await fetch(path.startsWith('http') ? path : `${GRAPH}${path}`, { headers: { authorization: `Bearer ${token}` } });
  if (r.status === 401) throw new SignInNeeded();
  if (r.status === 403) throw new Error('Microsoft says this account may not open that — its permission has not been given (ask the business’s IT administrator to approve Faultline).');
  if (!r.ok) throw new Error(`Microsoft did not answer (${r.status}) — try again.`);
  return r.json() as Promise<T>;
}
async function list(path: string, where?: string): Promise<MsItem[]> {
  const j = await get<{ value: GraphItem[] }>(path);
  return (j.value ?? []).map(g => itemOf(g, where));
}

export const recent = (): Promise<MsItem[]> => list('/me/drive/recent?$top=50').then(shown);
export const myFiles = (): Promise<MsItem[]> => list('/me/drive/root/children?$top=200', 'My files').then(shown);
export const folder = (driveId: string, itemId: string, where?: string): Promise<MsItem[]> =>
  list(`/drives/${encodeURIComponent(driveId)}/items/${encodeURIComponent(itemId)}/children?$top=200`, where).then(shown);

export interface MsSite { id: string; name: string; webUrl?: string }
export async function sites(words: string): Promise<MsSite[]> {
  const j = await get<{ value: { id: string; displayName?: string; name?: string; webUrl?: string }[] }>(`/sites?search=${encodeURIComponent(words.trim() || '*')}`);
  return (j.value ?? []).map(s => ({ id: s.id, name: s.displayName ?? s.name ?? 'A site', webUrl: s.webUrl }));
}
/** A site's document libraries, each opened at its top. */
export async function libraries(site: MsSite): Promise<{ driveId: string; name: string }[]> {
  const j = await get<{ value: { id: string; name: string }[] }>(`/sites/${encodeURIComponent(site.id)}/drives`);
  return (j.value ?? []).map(d => ({ driveId: d.id, name: d.name }));
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
  const r = await fetch(now.download);
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
