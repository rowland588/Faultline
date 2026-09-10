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
    cached = import('jspdf').catch(e => {
      cached = null;              // a failed load must not poison every retry
      throw e;
    });
  }
  return cached;
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
export async function deliverPdf(doc: jsPDF, filename: string): Promise<'shared' | 'downloaded' | 'opened'> {
  const blob = doc.output('blob') as Blob;
  const file = new File([blob], filename, { type: 'application/pdf' });

  // The share sheet first on anything that has one: on a phone this is Mail,
  // WhatsApp, Files — which is what "send it to the GM" actually means. Desktop
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
