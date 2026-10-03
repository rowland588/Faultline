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
 * 2. `doc.save()` IS A DOWNLOAD LINK. Safari on iOS largely ignores `<a
 *    download>` for a blob: no file, no error, nothing. On a phone the thing
 *    somebody actually wants is the share sheet — mail it, put it in Files —
 *    so ask for that first when the browser has it, and keep the download for
 *    the desktop where it is right.
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

/** Hand the finished document to the person, by whatever route this device has.
 *
 *  Returns how it went out, so the caller can say something true afterwards
 *  ("opened in a new tab" is worth saying; a silent nothing is not). */
export async function deliverPdf(doc: jsPDF, filename: string, opts: { brand?: boolean } = {}): Promise<'shared' | 'downloaded' | 'opened'> {
  /* Every page leaves with the Faultline mark in its top margin — the one door
     all of them go out through, so no document can be missed. A sheet that is
     a picture edge to edge (the line standard) opts out. */
  if (opts.brand !== false) (await import('./reportKit')).stampBrand(doc);
  return deliverBlob(doc.output('blob') as Blob, filename);
}

/** The same three routes out, for a PDF the app did not draw.
 *
 *  A document the OEM emailed — a FAT report, a film spec — is saved in the blob
 *  store and has to be openable on a factory floor. That is the identical
 *  problem as getting a generated report out, including iOS ignoring `<a
 *  download>` for a blob, so it is the identical code rather than a second
 *  attempt at it. */
export async function deliverBlob(blob: Blob, filename: string): Promise<'shared' | 'downloaded' | 'opened'> {
  const file = new File([blob], filename, { type: blob.type || 'application/pdf' });

  // The share sheet first on anything that has one: on a phone this is Mail,
  // WhatsApp, Files — which is what "send it to the client" actually means. Desktop
  // browsers mostly do not offer it, and fall through to the download.
  try {
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    if (nav.share && nav.canShare?.({ files: [file] })) {
      await nav.share({ files: [file], title: filename });
      return 'shared';
    }
  } catch (e) {
    // A cancelled share is not a failure — the user changed their mind, and
    // downloading behind their back would be worse than doing nothing.
    if (e instanceof DOMException && e.name === 'AbortError') return 'shared';
    /* anything else: fall through and try to download it */
  }

  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Safari needs the URL alive past the click; a minute is plenty and the
    // page will drop it anyway on navigation.
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return 'downloaded';
  } catch {
    // Downloading blocked (iOS standalone PWAs do this). Show it instead:
    // a PDF on screen can still be shared, printed or saved by hand.
    window.open(url, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return 'opened';
  }
}
