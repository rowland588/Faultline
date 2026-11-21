/* WHAT CHANGED WHILE YOU WERE AWAY, SAID WITHOUT BEING ASKED (21 November 2026, docs/LUNA-AGENT.md G2; the look itself is
 * colleague/keepUp). When Luna is opened she asks again for each linked file of the customer in hand that has not been looked at in
 * the last few hours; one that has changed is said here — its name, when the version she holds was read, and Read it — above the
 * conversation, where the person will see it. Nothing is shown while she looks, and nothing when nothing changed: a colleague who has
 * no news does not announce it.
 *
 * Read it reads the newer version exactly as an upload is read (`onRead`, the conversation's own pickDoc): the first look says what
 * changed since the last, worked in code. Later puts the note away for this visit; the file is offered again next time it is due. */
import { useEffect, useRef, useState } from 'react';
import type { FileOrigin } from '../lib/data/sources';
import { linkNewerThan } from '../lib/fileLink/link';
import { download, newerThan, SignInNeeded } from '../lib/microsoft/graph';
import { useClientScope } from '../lib/activeClient';
import { useRoute } from '../state/useRoute';
import { Icon } from '../ui/Icon';
import { filesInHand } from './filesInHand';
import { keepUp, readStamps, writeStamp, type News } from './keepUp';

const day = (t: number) => (t ? new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '');
/* one look at a time on a device, whoever asks (a page drawn twice asks twice) */
let looking: Promise<void> | null = null;

export function KeepUpNews({ onRead }: { onRead: (f: File, o: FileOrigin, /** whose the changed file is — the newer version is the same customer's */ customer?: string) => void }) {
  const cs = useClientScope();
  const client = cs.filtering ? cs.client : '';
  const ready = cs.ready;
  /* Luna's page stays alive behind the others once it has been opened (she is beside the work, never reloaded) — so "when she is
     opened" is when her own page comes into view again, not when this is first drawn */
  const route = useRoute();
  const here = route.name === 'ai' || route.name === 'home';
  const [news, setNews] = useState<News[]>([]);
  const [busy, setBusy] = useState('');
  const [why, setWhy] = useState('');
  const live = useRef(true);
  useEffect(() => { live.current = true; return () => { live.current = false; }; }, []);

  /* another customer in hand: what was said of the last one's files is not this one's */
  useEffect(() => { setNews([]); setWhy(''); }, [client]);
  useEffect(() => {
    if (!ready || !here) return;
    const run = async () => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) return;
      const got = await keepUp(await filesInHand(), {
        link: linkNewerThan, microsoft: newerThan, now: () => Date.now(), stamps: readStamps, stamp: writeStamp,
        needsSignIn: e => e instanceof SignInNeeded,
      });
      /* what she already said and the person has not answered stays; a file newly changed joins it */
      if (live.current && got.news.length) setNews(was => [...was.filter(x => !got.news.some(n => n.key === x.key)), ...got.news]);
    };
    const look = () => { looking = (looking ?? Promise.resolve()).then(run).catch(() => undefined); };
    /* WHEN HER PAGE COMES INTO VIEW — a moment after it has drawn, so her looking never holds up the person's first tap — and WHEN THE
       APP COMES BACK INTO VIEW: a phone left on her page all afternoon is not "opened" again, it is looked at again. Looking is cheap
       when nothing is due (three reads of this device's own records, nothing asked of the cloud). */
    const t = window.setTimeout(look, 1500);
    const seen = () => { if (document.visibilityState === 'visible') look(); };
    document.addEventListener('visibilitychange', seen);
    return () => { window.clearTimeout(t); document.removeEventListener('visibilitychange', seen); };
  }, [ready, client, here]);

  const read = async (n: News) => {
    setWhy(''); setBusy(n.key);
    try {
      if (n.kind === 'link') onRead(n.file, n.origin, n.source.whose || undefined);
      else { const got = await download({ ...n.item, name: n.source.facts.fileName }, n.origin.path); onRead(got.file, got.origin, n.source.whose || undefined); }
      setNews(all => all.filter(x => x.key !== n.key));
    } catch (e) {
      setWhy(e instanceof SignInNeeded ? 'Sign in to Microsoft first — Luna’s ＋ › Connect.' : e instanceof Error ? e.message : String(e));
    } finally { setBusy(''); }
  };

  if (!news.length) return null;
  return (
    <section className="ai-news" aria-label="What has changed since Luna last looked" data-keepup>
      <p className="ai-news-h"><Icon name="spark" size={14} /><b>{news.length === 1 ? 'A file I read has changed' : `${news.length} files I read have changed`}</b></p>
      <ul className="ai-news-l">
        {news.map(n => (
          <li key={n.key} className="ai-news-row" data-keepup-file={n.source.facts.name}>
            <span className="ai-news-w"><b>{n.source.facts.name}</b><span className="sub">{[!client && cs.several && n.source.whose ? n.source.whose : '', n.kind === 'link' ? 'from its link' : 'SharePoint or OneDrive', `the version I hold was read ${day(n.source.facts.at)}`].filter(Boolean).join(' · ')}</span></span>
            <span className="ai-news-acts">
              <button type="button" className="btn btn-primary btn-sm" disabled={!!busy} onClick={() => void read(n)} data-keepup-read>{busy === n.key ? 'Reading…' : 'Read it'}</button>
              <button type="button" className="btn btn-sm" disabled={!!busy} onClick={() => setNews(all => all.filter(x => x.key !== n.key))} aria-label={`Later — leave ${n.source.facts.name} as it is for now`} data-keepup-later>Later</button>
            </span>
          </li>
        ))}
      </ul>
      {why && <p className="lf-err" role="alert">{why}</p>}
    </section>
  );
}
