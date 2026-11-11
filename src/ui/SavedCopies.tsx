/* SAVED COPIES — the PDFs made on this page, kept (lib/keptPdfs). Under a page's Report ▾; a line's page also lists what was made for it on other pages.
 * Open reads it in the browser's viewer (print from there), Download hands it over again — the same file, no new one made — and Take off frees the room. */
import { useEffect, useState } from 'react';
import { Sheet } from './Sheet';
import { dropKept, keptBlob, keptHere, listKept, onKeptChange, sizeWords, type KeptPdf } from '../lib/keptPdfs';
import { deliverBlob } from '../lib/savePdf';
import { nav } from '../state/useRoute';

/** What was made on the page being looked at, newest first — live as copies are made and taken off, and as the page changes. */
export function useKeptHere(): KeptPdf[] {
  const [all, setAll] = useState<KeptPdf[]>([]);
  const [hash, setHash] = useState(location.hash);
  useEffect(() => {
    let live = true;
    const load = () => { void listKept().then(x => { if (live) setAll(x); }).catch(() => undefined); };
    load();
    const off = onKeptChange(load);
    const on = () => setHash(location.hash);
    window.addEventListener('hashchange', on);
    return () => { live = false; off(); window.removeEventListener('hashchange', on); };
  }, []);
  return keptHere(all, hash);
}

const when = (at: number): string => new Date(at).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export function SavedCopiesSheet({ open, onClose, items }: { open: boolean; onClose: () => void; items: KeptPdf[] }) {
  const [note, setNote] = useState<string | null>(null);
  const read = async (k: KeptPdf, download: boolean) => {
    const blob = await keptBlob(k);
    if (!blob) { setNote('That file is no longer on this device.'); return; }
    if (download) { await deliverBlob(blob, k.name, { keep: false }); return; }
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };
  const total = items.reduce((n, x) => n + x.size, 0);
  return (
    <Sheet open={open} onClose={onClose} title="Saved copies">
      <div className="sc" data-saved-copies>
        <p className="sub">Every PDF made on this page is kept here — the same file that was handed over. The page goes on changing; the next paper is a new copy. {items.length > 0 && <>{items.length} kept · {sizeWords(total)}.</>}</p>
        {/* every paper made anywhere, in one place (C4) */}
        <p className="sub"><button type="button" className="linkish" data-saved-copies-library onClick={() => { onClose(); nav('/library'); }}>Every paper you have made is in your Library ›</button></p>
        {note && <p className="sub is-a" role="status">{note}</p>}
        {items.length === 0 ? <p className="sub">None yet.</p> : (
          <ul className="sc-l">
            {items.map(k => (
              <li key={k.id} data-kept={k.id}>
                <b>{when(k.at)}</b> <span className="sub">{sizeWords(k.size)}</span>
                <span className="sc-n">{k.name}</span>
                <span className="sc-a">
                  <button type="button" className="linkish" data-kept-open={k.id} onClick={() => void read(k, false)}>Open</button> ·{' '}
                  <button type="button" className="linkish" data-kept-down={k.id} onClick={() => void read(k, true)}>Download</button> ·{' '}
                  <button type="button" className="linkish" data-kept-drop={k.id} onClick={() => { if (window.confirm('Take this saved copy out of the app? A paper made again will be a new copy.')) void dropKept(k.id); }}>Take off</button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Sheet>
  );
}
