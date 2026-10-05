/* A PDF SHOWN ON THE PAGE BEFORE IT IS SENT — the client report's preview,
 * on both methods (screens/ClientReportScreen, screens/PaceExecReport).
 *
 * Rowland, 5 October: "the pdf report did view but then went off." The
 * preview was redrawn every time the job's records reloaded — every sync pass
 * hands the screen new arrays with the same rows in them — and each redraw
 * threw away the PDF on screen before the next was drawn, so the frame showed
 * a document and then went blank. Now it redraws only when what is ON the
 * report changes (its reading, compared as text), and the one on screen stays
 * until the new one is ready to take its place. */
import { useEffect, useRef, useState } from 'react';
import type { jsPDF } from 'jspdf';

/** `key`: what the report says, as text — null while there is nothing to
 *  draw. `build`: draws it. Returns the address the frame shows. */
export function usePdfPreview(key: string | null, build: () => Promise<jsPDF>): string | null {
  const [url, setUrl] = useState<string | null>(null);
  const shown = useRef<string | null>(null);
  const drawer = useRef(build);
  drawer.current = build;
  useEffect(() => {
    if (!key) return;
    let live = true;
    void drawer.current().then(async doc => {
      if (!live) return;
      (await import('./reportKit')).stampBrand(doc);   // previewed as it is sent: with the mark
      if (!live) return;
      const next = URL.createObjectURL(doc.output('blob') as Blob);
      const old = shown.current;
      shown.current = next;
      setUrl(next);
      /* The old one goes once the frame has moved to the new one. */
      if (old) setTimeout(() => URL.revokeObjectURL(old), 2000);
    }).catch(() => undefined);
    return () => { live = false; };
  }, [key]);
  useEffect(() => () => { if (shown.current) URL.revokeObjectURL(shown.current); }, []);
  return url;
}
