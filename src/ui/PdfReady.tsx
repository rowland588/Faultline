/* THE DOCUMENT JUST MADE — read it, then send it.
 *
 * Rowland, 5 October: "I press PDF, it says making it, then it gives me the
 * option to send via email, but it never downloads to my device. I want an
 * actual download so I can view it before I send it."
 *
 * Every PDF the app makes is downloaded (lib/savePdf deliverBlob), and this
 * bar stays up until it is closed: Open shows the file — the browser's own
 * viewer, where it can also be saved — and Send is the share sheet, as a tap
 * of its own once it has been read. One bar for the whole app, as Undo is,
 * because the screen that made it may not be the screen you are on. */
import { useEffect, useState } from 'react';
import { canSend, dropReady, onReady, readyNow, sendReady, type Ready } from '../lib/savePdf';
import { Icon } from './Icon';

export function PdfReadyHost() {
  const [r, setR] = useState<Ready | null>(readyNow());
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => onReady(() => { setR(readyNow()); setNote(null); }), []);
  if (!r) return null;
  const isPdf = r.file.type === 'application/pdf';
  return (
    <div className="pdfr" role="status" aria-live="polite">
      <span className="pdfr-m">
        <b>{r.filename}</b>
        <span className="sub">{note ?? (r.saved ? 'Saved to your downloads.' : 'Ready — open it to read or save it.')}</span>
      </span>
      <span className="pdfr-acts">
        {/* A real link, so the tap itself opens it — no pop-up to be blocked. */}
        {isPdf && <a className="btn pdfr-btn" href={r.url} target="_blank" rel="noopener">Open</a>}
        {canSend(r.file) && (
          <button className="btn btn-primary pdfr-btn" onClick={() => void sendReady(r).then(h => {
            if (h === 'sent') setNote('Sent.');
            else if (h === 'failed') setNote('This phone would not share it — open it and share from there.');
          })}>Send</button>
        )}
        <button className="pdfr-x" aria-label="Close" onClick={dropReady}><Icon name="close" size="1.1em" /></button>
      </span>
    </div>
  );
}
