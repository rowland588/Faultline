/* CONNECT — one button, then what to, then connect (21 November 2026, docs/CONNECTED-LUNA.md X1b — Rowland, shown the first link sheet:
 * "Don't make this complex … I should just have one click, one button. Connect. And then what am I connecting to? And I connect. A lot
 * going on there. I want simplicity, not complexity.").
 *
 * Luna's ＋ has ONE row for everything that is not on this device: Connect. It opens this sheet, which asks one thing — what are you
 * connecting to? — and offers each way as one row:
 *   A link          Paste a file link from OneDrive, SharePoint, Google Drive or Dropbox: one box for the link and one button, Connect.
 *                   Faultline's cloud fetches the file (lib/fileLink/link → the `link` function) and it is read on this device exactly
 *                   as an upload is (`onPick` — the conversation's own pickDoc), kept with where it came from.
 *   Microsoft 365   SharePoint or OneDrive · work or school account (`onMicrosoft` — colleague/MicrosoftPicker, unchanged).
 * Nothing else is on the first view. What cannot be connected is said in words when it happens, never before; how to get a link, and
 * that anyone holding a link can read its file, are one fold away (Help); Try a sample connects to a made-up workbook on Faultline's own
 * site so the whole path can be seen with no account anywhere.
 *
 * Set up › Data connections › A link is the same form as this page (`ConnectLink` on `#/factory/data?link=1`) — never a sheet over Luna
 * (24 November). Luna's ＋ still uses this sheet, because the person is already in the conversation attaching a file. */
import { useEffect, useId, useRef, useState } from 'react';
import { Sheet } from '../ui/Sheet';
import { Fold } from '../ui/Fold';
import { Icon } from '../ui/Icon';
import { signIn } from '../lib/microsoft/auth';
import { fetchLink, LinkError, linkKind, SAMPLE_LINK, type LinkOrigin } from '../lib/fileLink/link';

const HOW: [string, string, string, string][] = [
  ['OneDrive or SharePoint', 'Choose the file, then Share › Copy link. Keep its existing permissions.', 'Open OneDrive', 'https://onedrive.live.com/'],
  ['Google Drive or Sheets', 'Share › General access › Anyone with the link › Copy link.', 'Open Google Drive', 'https://drive.google.com/'],
  ['Dropbox', 'Share › Manage access › Anyone with the link › Copy link.', 'Open Dropbox', 'https://www.dropbox.com/home'],
];

export type ConnectStep = 'choose' | 'link';

/** The link form — Data connections’ own page, and the second step of Luna’s ＋ Connect sheet. */
export function ConnectLink({ onPick, compact = false, onStart }: { onPick: (file: File, origin: LinkOrigin) => void; compact?: boolean; onStart?: () => void }) {
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const [needsMicrosoft, setNeedsMicrosoft] = useState(false);
  const box = useRef<HTMLInputElement>(null);
  const inputId = useId();
  useEffect(() => { if (compact) return; const t = window.setTimeout(() => box.current?.focus(), 60); return () => window.clearTimeout(t); }, [compact]);

  const connect = async (link: string, signInFirst = false) => {
    onStart?.();
    const k = linkKind(link);
    if (!k) { setErr('That is not a link — paste the whole link, starting https://'); return; }
    setErr(''); setBusy(`Connecting to ${k.host}…`);
    try {
      if (signInFirst) await signIn({ choose: true, fileLink: true });
      const { file, origin } = await fetchLink(link, signInFirst);
      setNeedsMicrosoft(false);
      setBusy(''); setUrl('');
      onPick(file, origin);
    } catch (e) {
      setBusy('');
      setNeedsMicrosoft(signInFirst || (e instanceof LinkError && e.code === 'microsoft-sign-in'));
      setErr(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="cn" data-connect-sheet="link" data-link-sheet>
      <label className="field" htmlFor={inputId}><b>Open a file URL</b></label>
      <form className="cn-form" noValidate onSubmit={e => { e.preventDefault(); if (!busy && url.trim()) void connect(url, needsMicrosoft); }}>
        <input id={inputId} ref={box} className="text-input cn-url" type="url" inputMode="url" autoComplete="off" autoCapitalize="off" spellCheck={false} aria-label="File URL"
          placeholder="Paste the OneDrive, SharePoint or file link" value={url} onChange={e => { setUrl(e.target.value); setErr(''); setNeedsMicrosoft(false); }} disabled={!!busy} data-link-url />
        <button type="submit" className="btn btn-primary cn-go" disabled={!url.trim() || !!busy} data-link-read>{busy ? 'Connecting…' : needsMicrosoft ? 'Sign in and open file' : 'Connect'}</button>
      </form>
      {busy && <p className="cn-busy sub" role="status" data-link-busy>{busy}</p>}
      {err && <p className="cn-err" role="alert" data-link-err>{err}</p>}
      {!compact && <p className="cn-more">
        <button type="button" className="linkish" disabled={!!busy} onClick={() => { setUrl(SAMPLE_LINK); void connect(SAMPLE_LINK); }} data-link-sample>Try a sample</button>
      </p>}
      {!compact && <Fold id="connect-help" start={false} title="How to get a link">
        <dl className="cn-how">
          {HOW.map(([where, how, label, href]) => <div key={where}><dt>{where}</dt><dd>{how} <a className="cw-link" href={href} target="_blank" rel="noreferrer">{label} ↗</a></dd></div>)}
        </dl>
        <p className="sub cn-note">Sign in with the Microsoft account that can open a private file. Personal accounts require Faultline’s Microsoft registration to include personal accounts. You can also upload the workbook directly. Faultline reads it on this device and does not send it to the AI service. The sample is a made-up workbook on Faultline’s own site.</p>
      </Fold>}
    </div>
  );
}

export function ConnectSheet({ open, onClose, onPick, onMicrosoft }: {
  /** Shut, or the step it opens on: the question, or the link (Luna’s ＋ while already in the conversation). */
  open: ConnectStep | null; onClose: () => void; onPick: (file: File, origin: LinkOrigin) => void; onMicrosoft: () => void;
}) {
  const [step, setStep] = useState<ConnectStep>('choose');
  useEffect(() => { if (open) setStep(open); }, [open]);

  return (
    <Sheet open={!!open} onClose={onClose} title="Connect">
      {step === 'choose' ? (
        <div className="cn" data-connect-sheet="choose">
          <p className="cn-q">What are you connecting to?</p>
          <button type="button" className="cn-to" onClick={() => setStep('link')} data-connect-to="link">
            <span className="cn-to-ic" aria-hidden><Icon name="link" size="1.25em" /></span>
            <span className="cn-to-b"><b>Open a file URL</b><span className="sub">Paste a file link from OneDrive, SharePoint, Google Drive or Dropbox</span></span>
            <Icon name="chevron" size={16} />
          </button>
          <button type="button" className="cn-to" onClick={onMicrosoft} data-connect-to="microsoft">
            <span className="cn-to-ic" aria-hidden><Icon name="cloud" size="1.25em" /></span>
            <span className="cn-to-b"><b>Microsoft 365</b><span className="sub">SharePoint or OneDrive · work or school account</span></span>
            <Icon name="chevron" size={16} />
          </button>
        </div>
      ) : (
        <ConnectLink onPick={(file, origin) => { onPick(file, origin); onClose(); }} />
      )}
    </Sheet>
  );
}
