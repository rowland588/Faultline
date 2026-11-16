/* A WORKBOOK ON EVERY DEVICE (16 November — Rowland: "Luna cant see files uploaded from another device big problem upload on laptop must be
 * viable to phone user and other way round").
 *
 * A workbook is still READ on the device — its cells kept column by column in the device's own storage (store.ts), never sent to the
 * model. What changed: the file itself is kept with its record in the register (the `source` study, capabilities/data registerFile), as a
 * document's file is (facts.docPhotos, field `workbook-file`), so the app's sync carries it to the person's other devices by the rules
 * every photo and document follows (supabase faultline_can_see_media: a file named by a record the person can see — so one customer's
 * workbook reaches only the devices of people who can see that record). On another device, the first question about it brings the file
 * down and reads it there, then answers.
 *
 * The cloud takes a file up to 50 MB (lib/transcode CLOUD_FILE_LIMIT); a bigger workbook stays on the device that read it and says so. */
import type { ToolStudy } from '../../types';
import type { WorkbookProfile } from './read';

export const WORKBOOK_FILE_FIELD = 'workbook-file';
export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
/** The key a workbook's file is kept under — one per workbook (its id is its contents' identity), safe as a storage name. */
export const workbookFileKey = (id: string): string => `wbf-${id.replace(/[^A-Za-z0-9_-]/g, '_')}`;

type DocPhoto = NonNullable<ToolStudy['facts']['docPhotos']>[number];
const fileOf = (s: Pick<ToolStudy, 'facts'>): DocPhoto | undefined => (s.facts.docPhotos ?? []).find(p => p.field === WORKBOOK_FILE_FIELD);

/** The register's record of a workbook, by the workbook's id. */
async function sourceOf(id: string): Promise<ToolStudy | undefined> {
  const { listAllStudies } = await import('../../db');
  return (await listAllStudies()).find(s => s.tool === 'source' && !s.deletedAt && (s.facts as { source?: { fileId?: string } }).source?.fileId === id);
}

/** Keep the workbook's file with its record so the person's other devices can read it. Too big for the cloud: kept nowhere but here, said. */
export async function keepWorkbookFile(sourceId: string, id: string, file: Blob & { name?: string }, now = Date.now()): Promise<'kept' | 'too-big'> {
  const { CLOUD_FILE_LIMIT } = await import('../transcode');
  if (file.size > CLOUD_FILE_LIMIT) return 'too-big';
  const [{ putBlob }, { patchStudy }, { uid }] = await Promise.all([import('../../db/blobs'), import('../../db'), import('../ids')]);
  const key = workbookFileKey(id);
  await putBlob(key, file);
  await patchStudy(sourceId, cur => {
    const others = (cur.facts.docPhotos ?? []).filter(p => p.field !== WORKBOOK_FILE_FIELD);
    const entry: DocPhoto = { id: uid(), field: WORKBOOK_FILE_FIELD, blobKey: key, mime: (file as Blob).type || XLSX_MIME, caption: file.name ?? 'workbook.xlsx', at: now };
    return { facts: { ...cur.facts, docPhotos: [...others, entry] } };
  });
  return 'kept';
}

/** THE WORKBOOK'S PROFILE ON THIS DEVICE — read here before; else its file brought from the cloud and read here now; else the reason in
 *  words (an Error), never a figure. Every capability that reads a workbook's cells starts here. */
export async function profileHere(id: string, nameHint?: string): Promise<WorkbookProfile> {
  const { workbooks } = await import('./client');
  try { return await workbooks().profile(id); } catch { /* not read on this device — bring it */ }
  const src = await sourceOf(id);
  const kept = src && fileOf(src);
  const name = (src?.facts as { source?: { fileName?: string } } | undefined)?.source?.fileName ?? kept?.caption ?? nameHint ?? 'workbook.xlsx';
  if (!kept?.blobKey) throw new Error(`“${name}” was read on another device and its file was not kept for your other devices (it was attached before 16 November, or it is over 50 MB). Attach it here once and it will be on every device from then on.`);
  const { getBlob } = await import('../../db/blobs');
  let blob = await getBlob(kept.blobKey);
  if (!blob) {
    const { fetchBlobNow } = await import('../../cloud/sync');
    const r = await fetchBlobNow(kept.blobKey);
    if (r === 'got') blob = await getBlob(kept.blobKey);
    if (!blob) throw new Error(r === 'absent'
      ? `“${name}” is on its way from the device it was attached on — it has not reached the cloud yet (that device needs a signal and the app open). Ask again in a minute.`
      : `“${name}” could not be fetched from the cloud just now — no signal, or not signed in. Ask again when this device is online.`);
  }
  const file = new File([blob], name, { type: blob.type || XLSX_MIME });
  return workbooks().read(id, name, file);
}
