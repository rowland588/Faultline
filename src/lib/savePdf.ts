/* Getting a finished PDF out of the app and into somebody's hands.
 *
 * Two things kept going wrong, and neither was the drawing.
 *
 * 1. THE LIBRARY ARRIVES LATE. jsPDF is a 350KB chunk fetched by a dynamic
 *    import at the moment the button is pressed. This app is an installed PWA
 *    whose service worker keeps serving the JavaScript it booted with, so after
 *    a deploy the running page asks for a chunk filename that no longer exists
 *    on the server. The import rejects, and the only thing the user sees is a
 *    button that does nothing. Fetching it when the screen OPENS turns that
 *    into a problem you can see and be told about, before you are relying on it.
 *
 * 2. SAVED FIRST, SENT SECOND. This used to open the phone's share sheet
 *    first — Mail, WhatsApp — on the reasoning that sending is what a phone
 *    wants. Rowland, 5 October: "it gives me the option to send via email,
 *    but it never downloads to my device. I want an actual download so I can
 *    view it before I send it." He had said it of the trial card before
 *    (screens/TrialCardScreen). A document nobody has read is not ready to
 *    send. So every PDF is now downloaded, and a bar (ui/PdfReady) stays up
 *    with Open — to read it — and Send, the share sheet, as its own tap.
 *
 * Everything here reports what actually failed. "Sorry, try again" on a report
 * somebody needs for a meeting is not an error message, it is a shrug.
 */
import type { jsPDF } from 'jspdf';

/** True when the failure looks like a chunk that is no longer on the server —
 *  the signature of a service worker serving yesterday's app. */
export function isStaleBuildError(e: unknown): boolean {
  const m = (e instanceof Error ? e.message : String(e ?? '')).toLowerCase();
  return m.includes('dynamically imported module')
      || m.includes('failed to fetch')
      || m.includes('importing a module script failed')
      || m.includes('error loading');
}

/** Load jsPDF, once, and hold it. Call this when a screen that offers a PDF
 *  opens, so the 350KB is already here before anybody presses anything. */
let cached: Promise<typeof import('jspdf')> | null = null;
export function loadPdfLib(): Promise<typeof import('jspdf')> {
  if (!cached) {
    cached = import('jspdf').then(async lib => { await embedBrandFonts(lib); return lib; }).catch(e => {
      cached = null;              // a failed load must not poison every retry
      throw e;
    });
  }
  return cached;
}

/* THE APP'S TYPEFACE, IN EVERY PDF. Instrument Sans, cut to a static Regular
 * and Bold (the app ships it as a variable web font, which a PDF cannot
 * embed). Read once, then handed to every new document through jsPDF's
 * addFonts hook, and reportKit's family switched to it — so each drawer keeps
 * calling setFont as it always has. If the files cannot be read (offline on a
 * device that has never fetched them), the documents print in Helvetica, as
 * they did before: a report in the wrong typeface beats no report. */
/* Runs once: loadPdfLib caches its promise, and only a failed import (before
   this is reached) clears it. */
async function embedBrandFonts(lib: typeof import('jspdf')): Promise<void> {
  try {
    const [{ default: regularUrl }, { default: boldUrl }, { default: nameUrl }, kit] = await Promise.all([
      import('../assets/pdf-fonts/InstrumentSans-Regular.ttf?url'),
      import('../assets/pdf-fonts/InstrumentSans-Bold.ttf?url'),
      import('../assets/pdf-fonts/Outfit-Medium.ttf?url'),
      import('./reportKit'),
    ]);
    const [regular, bold, name] = await Promise.all([regularUrl, boldUrl, nameUrl].map(async u => toBase64(await (await fetch(u)).arrayBuffer())));
    lib.jsPDF.API.events.push(['addFonts', function (this: jsPDF) {
      this.addFileToVFS('Faultline-Regular.ttf', regular);
      this.addFont('Faultline-Regular.ttf', 'Faultline', 'normal');
      this.addFileToVFS('Faultline-Bold.ttf', bold);
      this.addFont('Faultline-Bold.ttf', 'Faultline', 'bold');
      this.addFileToVFS('Faultline-Name.ttf', name);
      this.addFont('Faultline-Name.ttf', 'FaultlineName', 'normal');
    }]);
    kit.usePdfFamily('Faultline');
    kit.usePdfNameFamily('FaultlineName');
  } catch { /* Helvetica it is — see above */ }
}

function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

/** Reload onto the current build, discarding the worker that is holding the old
 *  one. The one honest recovery from a stale-chunk failure — and it is the
 *  user's call, never automatic, because a reload mid-task loses their place. */
export async function reloadOntoNewBuild(): Promise<void> {
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }
  } catch { /* best effort — the reload is the part that matters */ }
  window.location.reload();
}

/** How a document went out: saved to the device, or — where the browser
 *  refused the download — only held, ready for the bar's Open and Send. */
export type Delivered = 'downloaded' | 'ready';

/** Hand the finished document to the person: saved to the device, with the
 *  bar (ui/PdfReady) offering Open and Send.
 *
 *  Returns how it went out, so the caller can say something true afterwards. */
export async function deliverPdf(doc: jsPDF, filename: string, opts: { brand?: boolean } = {}): Promise<Delivered> {
  /* Every page leaves with the Faultline mark in its top margin — the one door
     all of them go out through, so no document can be missed. A sheet that is
     a picture edge to edge (the line standard) opts out. */
  if (opts.brand !== false) (await import('./reportKit')).stampBrand(doc);
  return deliverBlob(doc.output('blob') as Blob, filename);
}

/** The same route out, for a file the app did not draw — a document the OEM
 *  emailed, saved in the blob store, or the whole export. */
export async function deliverBlob(blob: Blob, filename: string): Promise<Delivered> {
  const file = new File([blob], filename, { type: blob.type || 'application/pdf' });
  const url = URL.createObjectURL(blob);
  let how: Delivered = 'ready';
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    how = 'downloaded';
  } catch { /* the bar still holds it: Open shows it, Send shares it */ }
  holdReady({ url, file, filename, saved: how === 'downloaded' });
  return how;
}

/* ---------------- THE DOCUMENT JUST MADE, held for the bar ---------------- */

export interface Ready { url: string; file: File; filename: string; saved: boolean; at: number }
let ready: Ready | null = null;
const readySubs = new Set<() => void>();

function holdReady(r: Omit<Ready, 'at'>): void {
  if (ready) URL.revokeObjectURL(ready.url);
  ready = { ...r, at: Date.now() };
  readySubs.forEach(f => f());
}

/** The document the bar offers, or null. */
export const readyNow = (): Ready | null => ready;
export function onReady(f: () => void): () => void { readySubs.add(f); return () => { readySubs.delete(f); }; }
/** Close the bar and let the file go. */
export function dropReady(): void {
  if (ready) { const u = ready.url; setTimeout(() => URL.revokeObjectURL(u), 60_000); }
  ready = null;
  readySubs.forEach(f => f());
}

/** Whether this device can hand a file to its share sheet (a phone, mostly). */
export function canSend(file: File): boolean {
  try {
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    return !!nav.share && !!nav.canShare?.({ files: [file] });
  } catch { return false; }
}

/** The share sheet, for the document already made — its own tap, after it
 *  has been read. A cancelled share is not a failure. */
export async function sendReady(r: Ready): Promise<'sent' | 'cancelled' | 'failed'> {
  try {
    await navigator.share({ files: [r.file], title: r.filename });
    return 'sent';
  } catch (e) {
    return e instanceof DOMException && e.name === 'AbortError' ? 'cancelled' : 'failed';
  }
}
