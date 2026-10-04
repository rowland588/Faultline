/* THE PAGE A SHARE LINK OPENS — #/s/<token>, for somebody with no account.
 *
 * The owner of a job sends one photo or clip from a test ("here's the fault we
 * filmed") to somebody who will never sign in: the OEM's engineer, the client,
 * a supplier. This page is all they see of Faultline, so it is not the app: no
 * shell, no account menu, no way in. The brand, what the thing is (the job,
 * the test, the machine, who sent it and until when), the thing itself, and a
 * line saying nothing else from the job is shared.
 *
 * supabase/SHARE_LINKS.sql is the record and how it stays safe;
 * supabase/functions/share answers openShare() with a signed address that
 * lasts five minutes. Enough to start playing — but a clip paused for longer
 * than that fails when the browser asks for the next part, so the page asks
 * once more for a fresh address and carries on from the same second.
 *
 * When the link no longer opens anything the page says why in one sentence
 * and who to ask. A failure that is the signal's, not the link's, offers to
 * try again instead: "ask for a new link" would not be true. */
import { useCallback, useEffect, useRef, useState } from 'react';
import { openShare, type Opened } from '../cloud/shares';
import { LogoMark } from '../ui/Logo';
import { niceDay, todayISO } from '../lib/weeks';

type Item = Extract<Opened, { gone: false }>;
type State =
  | { at: 'loading' }
  | { at: 'open'; item: Item }
  | { at: 'gone'; why: string; by: string | null };

/** What a closed page can honestly offer. The function's reasons for a link
 *  that is over (expired, stopped, taken off the job, not complete) send the
 *  reader back to the sender. A reason that is about the moment — no signal,
 *  a file still on its way — offers to try again; a link that is fine would
 *  not need replacing. An answer that says neither offers both. */
const offer = (why: string): 'ask' | 'retry' | 'both' =>
  /signal|try again/i.test(why) || (typeof navigator !== 'undefined' && navigator.onLine === false) ? 'retry'
    : /could not be opened/i.test(why) ? 'both'
    : 'ask';

/** "11 Oct" — the day the link stops, in the reader's own zone. */
const untilDay = (iso: string): string => {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '';
  const d = new Date(t);
  return niceDay(todayISO(d), { year: d.getFullYear() !== new Date().getFullYear() });
};

/** While mounted: the tab says what this is, and search engines are told to
 *  leave it alone (index.html invites them in for the landing). */
function usePageHead(title: string): void {
  useEffect(() => {
    const was = document.title;
    document.title = title;
    return () => { document.title = was; };
  }, [title]);
  useEffect(() => {
    let meta = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    const made = !meta;
    if (!meta) { meta = document.createElement('meta'); meta.name = 'robots'; document.head.appendChild(meta); }
    const was = meta.content;
    meta.content = 'noindex, nofollow';
    return () => { if (made) meta.remove(); else meta.content = was; };
  }, []);
}

/** Nothing for the first moment, so a quick answer never flashes a loader. */
function useAfter(ms: number): boolean {
  const [past, setPast] = useState(false);
  useEffect(() => { const t = window.setTimeout(() => setPast(true), ms); return () => window.clearTimeout(t); }, [ms]);
  return past;
}

function Brand() {
  return (
    <div className="sh-brand">
      <LogoMark size={30} id="sh" />
      <span className="sh-name">Faultline</span>
    </div>
  );
}

export function ShareScreen({ token }: { token: string }) {
  const [state, setState] = useState<State>({ at: 'loading' });
  const load = useCallback(async () => {
    setState({ at: 'loading' });
    const o = await openShare(token);
    setState(o.gone ? { at: 'gone', why: o.why, by: null } : { at: 'open', item: o });
  }, [token]);
  useEffect(() => { void load(); }, [load]);

  const word = state.at === 'open' && state.item.kind === 'photo' ? 'picture' : 'clip';
  usePageHead(state.at === 'open'
    ? `${state.item.test ?? `A shared ${word}`} · Faultline`
    : state.at === 'gone' ? 'Link closed · Faultline' : 'Shared with you · Faultline');

  return (
    <div className="sh">
      {state.at === 'loading' && <Loading />}
      {state.at === 'gone' && <Gone why={state.why} by={state.by} retry={() => void load()} />}
      {state.at === 'open' && (
        <Open
          token={token}
          item={state.item}
          renewed={item => setState({ at: 'open', item })}
          lost={why => setState({ at: 'gone', why, by: state.item.by })}
        />
      )}
    </div>
  );
}

function Loading() {
  const show = useAfter(400);
  return (
    <main className="sh-page sh-page-solo" aria-busy="true">
      {show && (
        <div className="sh-loading">
          <div className="splash-mark"><LogoMark size={46} id="sh-wait" /></div>
          <p className="sh-loading-txt">Opening what was shared…</p>
        </div>
      )}
    </main>
  );
}

function Gone({ why, by, retry }: { why: string; by: string | null; retry: () => void }) {
  const o = offer(why);
  return (
    <main className="sh-page sh-page-solo">
      <Brand />
      <h1 className="sh-gone-h">{why}</h1>
      {o !== 'retry' && <p className="sh-gone-ask">{o === 'both' ? 'If it still won’t open, ask' : 'Ask'} {by ?? 'whoever sent it'} for a new link.</p>}
      {o !== 'ask' && <button type="button" className="btn btn-primary sh-retry" onClick={retry}>Try again</button>}
    </main>
  );
}

function Open({ token, item, renewed, lost }: {
  token: string; item: Item;
  renewed: (item: Item) => void; lost: (why: string) => void;
}) {
  const word = item.kind === 'photo' ? 'picture' : 'clip';
  const until = untilDay(item.until);
  const [full, setFull] = useState(false);
  const [actual, setActual] = useState(false);

  /* THE FIVE-MINUTE ADDRESS. On an error, ask once for a fresh one and pick
     up where it stopped; a clip that then plays again earns another go, so a
     second long pause is handled the same way. Two errors with no play
     between them is the signal, not the address. */
  const video = useRef<HTMLVideoElement>(null);
  const resume = useRef<{ t: number; play: boolean } | null>(null);
  const asked = useRef(false);
  const onError = async () => {
    const v = video.current;
    if (!v) return;
    if (asked.current) { lost('The clip stopped loading — check the signal and try again.'); return; }
    asked.current = true;
    resume.current = { t: v.currentTime, play: !v.paused };
    const again = await openShare(token);
    if (again.gone) lost(again.why); else renewed(again);
  };
  const onMeta = () => {
    const v = video.current, r = resume.current;
    if (!v || !r) return;
    resume.current = null;
    if (r.t > 0) v.currentTime = r.t;
    if (r.play) void v.play().catch(() => { /* the browser wants a tap first — the controls are there */ });
  };

  useEffect(() => {
    if (!full) return;
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setFull(false); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [full]);

  return (
    <main className="sh-page">
      <Brand />
      <header className="sh-head">
        {item.project && <p className="sh-project">{item.project}</p>}
        <h1 className="sh-title">{item.test ?? `A shared ${word}`}</h1>
        {item.machine && <p className="sh-machine">{item.machine}</p>}
        <p className="sh-by">
          {item.by ? <>Shared by <b>{item.by}</b></> : 'Shared with you'}
          {until && <> · open until {until}</>}
        </p>
      </header>

      <figure className="sh-item">
        {item.kind === 'video'
          ? (
            <video
              ref={video}
              className="sh-video"
              src={item.url}
              poster={item.poster ?? undefined}
              controls
              playsInline
              preload="metadata"
              onError={() => void onError()}
              onLoadedMetadata={onMeta}
              onPlaying={() => { asked.current = false; }}
            />
          )
          : (
            <button type="button" className="sh-photo-btn" onClick={() => { setActual(false); setFull(true); }} aria-label="Open the picture full size">
              <img className="sh-photo" src={item.url} alt={item.caption ?? item.test ?? 'The shared picture'} />
            </button>
          )}
        {item.caption && <figcaption className="sh-caption">{item.caption}</figcaption>}
      </figure>

      {item.kind === 'photo' && <p className="sh-hint">Tap the picture to see it full size.</p>}
      <p className="sh-foot">Only this {word} is shared — nothing else from the job.</p>

      {full && item.kind === 'photo' && (
        /* Fitted to the screen first; a tap on the picture shows it at its
           own size to scroll around, a tap beside it (or Close) goes back. */
        <div className={`sh-full${actual ? ' is-actual' : ''}`} role="dialog" aria-label="The picture, full size" onClick={() => setFull(false)}>
          <img
            src={item.url}
            alt={item.caption ?? item.test ?? 'The shared picture'}
            onClick={e => { e.stopPropagation(); setActual(a => !a); }}
          />
          <button type="button" className="sh-full-x" onClick={() => setFull(false)}>Close</button>
        </div>
      )}
    </main>
  );
}
