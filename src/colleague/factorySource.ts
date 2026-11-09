/* A FACTORY DOCUMENT READ — in code wherever it can be, by the gateway only where it cannot (9 November, docs/FACTORY-KNOWLEDGE.md F4).
 *
 *   a CSV register      read by rules, row by row (./factoryRegister) — nothing sent anywhere
 *   a PDF, Word, text   its words read in code (tools/story/briefText readBrief, the brief's readers), then asked of the gateway
 *                       (task `factory-read`) for the sites, areas, lines and machines it names, each with its exact words
 *   a photo or a scan   its pages drawn small (the brief's readers) and read by the gateway, which types the words out and quotes
 *                       from what it typed
 *   an Excel workbook   not read: no spreadsheet reader is in the app — said, with "save it as CSV"
 * Every item's quote is checked again here against the words kept (capabilities/factoryRead checkFactoryRead). Nothing is kept
 * by this: capabilities/factoryBuild takeDocument keeps the document and proposes the items, which the person keeps line by line. */
import { readBrief, plainText } from '../tools/story/briefText';
import { askAssist } from '../tools/story/briefAsk';
import { checkFactoryRead, FACTORY_READ_LIMITS, type FactoryReadItem } from '../capabilities/factoryRead';
import { isCsv, isExcel, readRegister } from './factoryRegister';

export type FactoryDocRead =
  | { ok: true; text: string; readBy: 'code' | 'assistant'; day?: string; dayQuote?: string; items: FactoryReadItem[]; notes: string[] }
  | { ok: false; why: string };

const SAY = {
  cloud: 'Reading this document needs the assistant, and this device is not signed in to the cloud — a CSV register is read without it, or say what is in it.',
  signal: 'No signal — the document is read when the signal is back, or say what is in it.',
  notNow: 'The assistant could not read the document just now — try again, or say what is in it.',
};

const itemsOf = (data: Record<string, unknown>, text: string) => checkFactoryRead({ items: data.items, day: data.day, dayQuote: data.dayQuote }, text);

/** READ A FACTORY DOCUMENT — never throws; what went wrong is said. */
export async function readFactoryDocument(file: Blob, name: string): Promise<FactoryDocRead> {
  if (isExcel(name)) return { ok: false, why: 'An Excel workbook is not read here — save the sheet as CSV (File › Save as › CSV) and upload that.' };
  if (isCsv(name, file.type)) {
    const text = plainText(await file.text());
    const r = readRegister(text);
    if ('why' in r) return { ok: false, why: r.why };
    return { ok: true, text, readBy: 'code', ...(r.day ? { day: r.day, dayQuote: r.dayQuote } : {}), items: r.items, notes: [`Read by rules: the columns ${r.columns.join(', ')}.`, ...r.skipped] };
  }
  const b = await readBrief(file, name);
  if (b.ok) {
    const text = b.text.slice(0, FACTORY_READ_LIMITS.text);
    const a = await askAssist({ task: 'factory-read', text }, SAY);
    if (!a.ok) return { ok: true, text, readBy: 'code', items: [], notes: [`Its words were read in code, but nothing was proposed from them: ${a.why}`] };
    const got = itemsOf(a.data, text);
    const dropped = (typeof a.data.dropped === 'number' ? a.data.dropped : 0) + (got ? Math.max(0, (Array.isArray(a.data.items) ? a.data.items.length : 0) - got.items.length) : 0);
    return { ok: true, text, readBy: 'code', ...(got?.day ? { day: got.day, dayQuote: got.dayQuote } : {}), items: got?.items ?? [], notes: dropped ? [`${dropped} could not be traced to the document’s own words, so ${dropped === 1 ? 'it is' : 'they are'} not proposed.`] : [] };
  }
  if ('pages' in b) {
    const a = await askAssist({ task: 'factory-read', pages: b.pages }, SAY);
    if (!a.ok) return { ok: false, why: `${b.why} ${a.why}` };
    const text = typeof a.data.text === 'string' ? a.data.text : '';
    const got = text ? itemsOf(a.data, text) : null;
    if (!got) return { ok: false, why: 'The pages could not be read — take the photographs again, flat and in good light, or say what is in it.' };
    return { ok: true, text, readBy: 'assistant', ...(got.day ? { day: got.day, dayQuote: got.dayQuote } : {}), items: got.items, notes: [] };
  }
  return { ok: false, why: `${b.why} A CSV register, a PDF, a Word file, a text file or a photo can be read.` };
}
