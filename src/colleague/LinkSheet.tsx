/* A FILE BY ITS LINK — the sheet (21 November 2026, docs/CONNECTED-LUNA.md, X1b — Rowland: "I'm not a business, so I can't do the
 * SharePoint thing … I need to get to the point where I can connect to a URL and extract").
 *
 * A workbook kept where a link can be given out — a personal OneDrive, Google Drive or Sheets, Dropbox, or a SharePoint file shared as
 * "Anyone with the link" — is read by pasting its link here: no Microsoft registration, no business account. The sheet says which
 * service the link is from as it is pasted, fetches the file through Faultline's cloud (lib/fileLink/link → the `link` function), and
 * hands it to the conversation exactly as an upload is (`onPick` — the conversation's own pickDoc), with where it came from, so the
 * first look is Luna's turn worked in code and Files Luna can read lists it with Check for a newer version.
 *
 * TRY THE SAMPLE LINK reads a made-up shift report kept on Faultline's own site — the whole path, a link to a read workbook, with no
 * account anywhere. What cannot be fetched is said in words with what to do; nothing is ever guessed or made up in its place. */
import { useEffect, useRef, useState } from 'react';
import { Sheet } from '../ui/Sheet';
import { Fold } from '../ui/Fold';
import { fetchLink, linkKind, LinkError, SAMPLE_LINK, type LinkOrigin } from '../lib/fileLink/link';

const HOW: [string, string][] = [
  ['OneDrive', 'Open the file or its folder, choose Share, set it to “Anyone with the link can view”, then Copy link.'],
  ['Google Drive or Sheets', 'Choose Share, set General access to “Anyone with the link”, then Copy link.'],
  ['Dropbox', 'Choose Share, then Copy link.'],
  ['SharePoint', 'Choose Share, then “Anyone with the link” — where your organisation allows it — and Copy link.'],
];

export function LinkSheet({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (file: File, origin: LinkOrigin) => void }) {
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const box = useRef<HTMLInputElement>(null);
  useEffect(() => { if (open) { setErr(''); setBusy(''); window.setTimeout(() => box.current?.focus(), 60); } }, [open]);

  const kind = url.trim() ? linkKind(url) : undefined;
  const read = async (link: string) => {
    const k = linkKind(link);
    if (!k) { setErr('That is not a web link — paste the whole link, starting https://'); return; }
    setErr(''); setBusy(`Fetching it from ${k.host}…`);
    try {
      const { file, origin } = await fetchLink(link);
      setBusy(''); setUrl('');
      onPick(file, origin);
      onClose();
    } catch (e) {
      setBusy('');
      setErr(e instanceof LinkError || e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="A file by its link">
      <div className="lk" data-link-sheet>
        <p className="lk-lede">Paste the link to a workbook kept in OneDrive, Google Drive, Dropbox or SharePoint. Faultline fetches the file and Luna reads it on this device — no Microsoft set-up and no business account.</p>
        <form className="lk-form" onSubmit={e => { e.preventDefault(); if (!busy) void read(url); }}>
          <label className="lk-label" htmlFor="lk-url">The link</label>
          <input id="lk-url" ref={box} className="text-input lk-url" type="url" inputMode="url" autoComplete="off" autoCapitalize="off" spellCheck={false}
            placeholder="https://…" value={url} onChange={e => { setUrl(e.target.value); setErr(''); }} disabled={!!busy} data-link-url />
          <p className={'lk-kind sub' + (url.trim() && !kind ? ' is-bad' : '')} role="status" data-link-kind>
            {!url.trim() ? 'Shared so that anyone with the link can view it.' : kind ? `${kind.said} — Faultline asks ${kind.host} for the file itself.` : 'That is not a web link yet — paste the whole link, starting https://'}
          </p>
          <div className="lk-acts">
            <button type="submit" className="btn btn-primary" disabled={!kind || !!busy} data-link-read>Read it</button>
            <button type="button" className="btn" disabled={!!busy} onClick={() => { setUrl(SAMPLE_LINK); void read(SAMPLE_LINK); }} data-link-sample>Try the sample link</button>
          </div>
          <p className="lk-sample sub">The sample is a made-up month of a food factory’s plan and actual, kept on Faultline’s own site — to see a link fetched and read with no account anywhere.</p>
        </form>
        {busy && <p className="lk-busy" role="status" data-link-busy>{busy}</p>}
        {err && <p className="lk-err" role="alert" data-link-err>{err}</p>}
        <Fold id="link-how" start={false} title="How to get a link" says="OneDrive · Google Drive · Dropbox · SharePoint">
          <dl className="lk-how">
            {HOW.map(([where, how]) => <div key={where}><dt>{where}</dt><dd>{how}</dd></div>)}
          </dl>
        </Fold>
        <p className="lk-note sub">Anyone who has the link can read the file, so use it for files that may be shared that way. The link is kept with the file so a newer version can be checked for. The file is read on this device — it is not sent to the AI service.</p>
      </div>
    </Sheet>
  );
}
