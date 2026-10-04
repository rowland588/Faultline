/* SHARE A LINK — the owner's side of cloud/shares: send one photo or clip
 * from a test to somebody with no account, and see on the test what has been
 * sent, how often it was opened, and stop it.
 *
 * Two halves, one record (the `shares` row):
 *   ShareSheet   opened from the picture itself (EvidenceViewer), because the
 *                picture is what is being sent — the tool comes out where the
 *                work is, not as a row of buttons on every thumbnail.
 *   SharedLinks  on the test page, once, under its pictures: what is out
 *                there now and what has ended. Nothing at all when nothing
 *                was ever shared.
 *
 * Only the owner sees either (supabase/SHARE_LINKS.sql lets nobody else read
 * or make a share); the caller decides, so a button the database would refuse
 * is never drawn. A live share is information, not a state, so it wears no
 * state colour; ended and stopped ones are muted. Neither reaches the PDF:
 * a link is how the evidence was sent, not part of what the job proved. */
import { useEffect, useState } from 'react';
import type { MediaRef } from '../types';
import { createShare, inCloud, isLive, shareUrl, useShares, SHARE_FOR, type Share } from '../cloud/shares';
import { Sheet } from './Sheet';

const noun = (k: 'photo' | 'video'): string => (k === 'video' ? 'clip' : 'photo');

/** "Sat 11 Oct", and the time as well when it is close enough to matter —
 *  a one-day link ends at a time, not on a day. */
function until(iso: string, withTime = Date.parse(iso) - Date.now() < 2 * 86_400_000): string {
  const d = new Date(iso);
  const day = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).replace(',', '');
  return withTime ? `${day}, ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` : day;
}

const opened = (n: number): string =>
  n === 0 ? 'not opened yet' : n === 1 ? 'opened once' : n === 2 ? 'opened twice' : `opened ${n} times`;

/* The module turns "no signal" into words; a refusal from the database comes
   back in Postgres's. This says the same thing in the app's. */
const said = (e: unknown): string => {
  const m = e instanceof Error ? e.message : String(e);
  return /row-level security|permission denied|42501/i.test(m)
    ? 'Only the project’s owner can share from it.'
    : m || 'The link wasn’t made — try again.';
};

/** The sheet the viewer's "Share a link" opens: how long, an optional line
 *  saying what they are looking at, the plain terms, then the link. */
export function ShareSheet({ open, onClose, projectId, testId, media, onMade }: {
  open: boolean; onClose: () => void;
  projectId: string; testId: string; media: MediaRef;
  /** Told when a link has been made, so the test's list shows it. */
  onMade?: (s: Share) => void;
}) {
  const [days, setDays] = useState<number>(7);
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [made, setMade] = useState<Share | null>(null);
  const [goingUp, setGoingUp] = useState(false);
  const [copied, setCopied] = useState<'done' | 'failed' | null>(null);
  useEffect(() => { if (!copied) return; const t = window.setTimeout(() => setCopied(null), 2500); return () => window.clearTimeout(t); }, [copied]);
  /* Each opening starts clean: a second picture is a second link. */
  useEffect(() => { if (open) { setDays(7); setCaption(''); setError(''); setMade(null); setCopied(null); setGoingUp(false); } }, [open, media.id]);

  const what = noun(media.kind);
  const verb = media.kind === 'video' ? 'watch' : 'see';
  const ends = new Date(Date.now() + days * 86_400_000).toISOString();
  const url = made ? shareUrl(made.token) : '';
  const canSend = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const make = async () => {
    setBusy(true); setError('');
    try {
      const s = await createShare({ projectId, testId, blobKey: media.blobKey, kind: media.kind, caption, days });
      setMade(s);
      onMade?.(s);
      setGoingUp(!(await inCloud(media.blobKey)));
    } catch (e) {
      setError(said(e));
    } finally {
      setBusy(false);
    }
  };
  const copy = () => {
    const w = navigator.clipboard?.writeText(url);
    if (!w) { setCopied('failed'); return; }
    w.then(() => setCopied('done'), () => setCopied('failed'));
  };
  const send = () => {
    /* Backing out of the phone's share list is not an error worth a word. */
    navigator.share({ url, title: made?.caption || `A ${what} from Faultline` }).catch(() => undefined);
  };

  return (
    <Sheet open={open} onClose={onClose} title={`Send a link to this ${what}`}>
      <div className="sl-body">
        {!made ? <>
          <div className="sl-f">
            <span className="sl-lab" id="sl-for">Opens for</span>
            <div className="sl-seg" role="group" aria-labelledby="sl-for">
              {SHARE_FOR.map(o => (
                <button key={o.days} type="button" className={'sl-seg-b' + (days === o.days ? ' on' : '')}
                  aria-pressed={days === o.days} onClick={() => setDays(o.days)}>{o.label}</button>
              ))}
            </div>
          </div>
          <label className="sl-f">
            <span className="sl-lab">What they’re looking at <span className="cw-f-opt">optional</span></span>
            <input className="sl-in" value={caption} maxLength={140} placeholder="The film creasing at the seal jaws"
              onChange={e => setCaption(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !busy) void make(); }} />
          </label>
          <p className="sl-terms">
            Anyone with the link can {verb} this {what} until {until(ends)} — nothing else from the job.
            You can stop it at any time.
          </p>
          {error && <p className="sl-err" role="alert">{error}</p>}
          <button type="button" className="btn btn-primary sl-go" disabled={busy} onClick={() => void make()}>
            {busy ? 'Making the link…' : 'Make the link'}
          </button>
        </> : <>
          <p className="sl-terms">
            The link opens this {what} until {until(made.expires_at)}. Send it to whoever needs to {verb} it.
          </p>
          {goingUp && <p className="sl-said" role="status">
            This {what} hasn’t finished going up to the cloud yet — the link opens once it has. Keep the app open with a signal.
          </p>}
          <input className="sl-in sl-url" readOnly value={url} aria-label="The link"
            onFocus={e => e.currentTarget.select()} />
          <div className="sl-acts">
            {canSend && <button type="button" className="btn btn-primary" onClick={send}>Send…</button>}
            <button type="button" className={'btn' + (canSend ? '' : ' btn-primary')} onClick={copy}>Copy link</button>
          </div>
          {copied && <p className={'sl-said' + (copied === 'failed' ? ' is-failed' : '')} role="status">
            {copied === 'done' ? 'Copied.' : 'This browser wouldn’t copy it — select the link above and copy it by hand.'}
          </p>}
          <button type="button" className="btn btn-ghost sl-done" onClick={onClose}>Done</button>
        </>}
      </div>
    </Sheet>
  );
}

/** What has been shared from this test — live ones first, then the last few
 *  that ended — each with its own way to stop it. Owner only (the caller). */
export function SharedLinks({ projectId, testId }: { projectId: string; testId: string }) {
  const { shares, stop } = useShares(projectId, testId);
  const [asking, setAsking] = useState<string | null>(null);
  const [error, setError] = useState('');
  const now = Date.now();
  const live = shares.filter(s => isLive(s, now));
  const past = shares.filter(s => !isLive(s, now)).slice(0, 3);
  if (live.length === 0 && past.length === 0) return null;

  const end = async (token: string) => {
    setError('');
    try { await stop(token); setAsking(null); } catch (e) { setError(said(e)); }
  };

  return (
    <section className="sl-list" aria-label="Shared links">
      {live.map(s => (
        <div key={s.token} className="sl-row">
          <span className="sl-row-t">
            <b>Shared</b> · {noun(s.kind)}{s.caption ? ` “${s.caption}”` : ''}, until {until(s.expires_at)} · {opened(s.views)}
          </span>
          {asking === s.token ? (
            <span className="sl-row-ask">
              <span className="sl-row-q">The link stops opening at once.</span>
              <button type="button" className="btn sl-row-b" onClick={() => void end(s.token)}>Stop it</button>
              <button type="button" className="btn btn-ghost sl-row-b" onClick={() => setAsking(null)}>Keep it</button>
            </span>
          ) : (
            <button type="button" className="btn btn-ghost sl-row-b" onClick={() => { setError(''); setAsking(s.token); }}>Stop sharing</button>
          )}
        </div>
      ))}
      {past.map(s => (
        <div key={s.token} className="sl-row is-over">
          <span className="sl-row-t">
            {s.kind === 'video' ? 'Clip' : 'Photo'}{s.caption ? ` “${s.caption}”` : ''} · {s.revoked_at ? `stopped ${until(s.revoked_at, false)}` : `ended ${until(s.expires_at, false)}`} · {opened(s.views)}
          </span>
        </div>
      ))}
      {error && <p className="sl-err" role="alert">{error}</p>}
    </section>
  );
}
