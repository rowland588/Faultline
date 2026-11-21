/* CONNECT — one button, then what to, then connect (21 November 2026, docs/CONNECTED-LUNA.md X1b — Rowland, shown the first link sheet:
 * "Don't make this complex … I should just have one click, one button. Connect. And then what am I connecting to? And I connect. A lot
 * going on there. I want simplicity, not complexity.").
 *
 * Luna's ＋ has ONE row for everything that is not on this device: Connect. It opens this sheet, which asks one thing — what are you
 * connecting to? — and offers each way as one row:
 *   A link          a file shared from OneDrive, SharePoint, Google Drive or Dropbox: one box for the link and one button, Connect.
 *                   Faultline's cloud fetches the file (lib/fileLink/link → the `link` function) and it is read on this device exactly
 *                   as an upload is (`onPick` — the conversation's own pickDoc), kept with where it came from.
 *   Microsoft 365   sign in and choose from SharePoint or OneDrive (`onMicrosoft` — colleague/MicrosoftPicker, unchanged).
 * Nothing else is on the first view. What cannot be connected is said in words when it happens, never before; how to get a link, and
 * that anyone holding a link can read its file, are one fold away (Help); Try a sample connects to a made-up workbook on Faultline's own
 * site so the whole path can be seen with no account anywhere. */
import { useEffect, useRef, useState } from 'react';
import { Sheet } from '../ui/Sheet';
import { Fold } from '../ui/Fold';
import { Icon } from '../ui/Icon';
import { fetchLink, linkKind, SAMPLE_LINK, type LinkOrigin } from '../lib/fileLink/link';

const HOW: [string, string][] = [
  ['OneDrive or SharePoint', 'Share › Anyone with the link › Copy link.'],
  ['Google Drive or Sheets', 'Share › General access: Anyone with the link › Copy link.'],
  ['Dropbox', 'Share › Copy link.'],
];

export type ConnectStep = 'choose' | 'link';

export function ConnectSheet({ open, onClose, onPick, onMicrosoft }: {
  /** Shut, or the step it opens on: the question, or straight to the link (Set up › Data connections › A link). */
  open: ConnectStep | null; onClose: () => void; onPick: (file: File, origin: LinkOrigin) => void; onMicrosoft: () => void;
}) {
  const [step, setStep] = useState<ConnectStep>('choose');
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const box = useRef<HTMLInputElement>(null);
  useEffect(() => { if (open) { setStep(open); setErr(''); setBusy(''); } }, [open]);
  useEffect(() => { if (open && step === 'link') { const t = window.setTimeout(() => box.current?.focus(), 60); return () => window.clearTimeout(t); } return undefined; }, [open, step]);

  const connect = async (link: string) => {
    const k = linkKind(link);
    if (!k) { setErr('That is not a link — paste the whole link, starting https://'); return; }
    setErr(''); setBusy(`Connecting to ${k.host}…`);
    try {
      const { file, origin } = await fetchLink(link);
      setBusy(''); setUrl('');
      onPick(file, origin);
      onClose();
    } catch (e) {
      setBusy('');
      setErr(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <Sheet open={!!open} onClose={onClose} title="Connect">
      {step === 'choose' ? (
        <div className="cn" data-connect-sheet="choose">
          <p className="cn-q">What are you connecting to?</p>
          <button type="button" className="cn-to" onClick={() => setStep('link')} data-connect-to="link">
            <span className="cn-to-ic" aria-hidden><Icon name="link" size="1.25em" /></span>
            <span className="cn-to-b"><b>A link</b><span className="sub">a file shared from OneDrive, SharePoint, Google Drive or Dropbox</span></span>
            <Icon name="chevron" size={16} />
          </button>
          <button type="button" className="cn-to" onClick={onMicrosoft} data-connect-to="microsoft">
            <span className="cn-to-ic" aria-hidden><Icon name="cloud" size="1.25em" /></span>
            <span className="cn-to-b"><b>Microsoft 365</b><span className="sub">sign in and choose from SharePoint or OneDrive</span></span>
            <Icon name="chevron" size={16} />
          </button>
        </div>
      ) : (
        <div className="cn" data-connect-sheet="link" data-link-sheet>
          <form className="cn-form" noValidate onSubmit={e => { e.preventDefault(); if (!busy && url.trim()) void connect(url); }}>
            <input ref={box} className="text-input cn-url" type="url" inputMode="url" autoComplete="off" autoCapitalize="off" spellCheck={false} aria-label="The link"
              placeholder="Paste the link" value={url} onChange={e => { setUrl(e.target.value); setErr(''); }} disabled={!!busy} data-link-url />
            <button type="submit" className="btn btn-primary cn-go" disabled={!url.trim() || !!busy} data-link-read>{busy ? 'Connecting…' : 'Connect'}</button>
          </form>
          {busy && <p className="cn-busy sub" role="status" data-link-busy>{busy}</p>}
          {err && <p className="cn-err" role="alert" data-link-err>{err}</p>}
          <p className="cn-more">
            <button type="button" className="linkish" disabled={!!busy} onClick={() => { setUrl(SAMPLE_LINK); void connect(SAMPLE_LINK); }} data-link-sample>Try a sample</button>
          </p>
          <Fold id="connect-help" start={false} title="Help" says="how to get a link, and who can read it">
            <dl className="cn-how">
              {HOW.map(([where, how]) => <div key={where}><dt>{where}</dt><dd>{how}</dd></div>)}
            </dl>
            <p className="sub cn-note">Anyone who has the link can read the file. Faultline reads it on this device and does not send it to the AI service. The sample is a made-up workbook on Faultline’s own site.</p>
          </Fold>
        </div>
      )}
    </Sheet>
  );
}
