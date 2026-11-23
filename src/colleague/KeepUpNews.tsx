/* WHAT CHANGED WHILE YOU WERE AWAY, SAID WITHOUT BEING ASKED (21 November 2026, docs/LUNA-AGENT.md G2; the look itself is
 * colleague/keepUp). When Luna is opened she asks again for each linked file of the customer in hand that has not been looked at in
 * the last few hours; one that has changed is said here — its name, when the version she holds was read, and Read it — above the
 * conversation, where the person will see it. Nothing is shown while she looks, and nothing when nothing changed: a colleague who has
 * no news does not announce it.
 *
 * SINCE G2b (the same day): a workbook that has changed she READS HERSELF (colleague/keepUp readNews, colleague/readQuietly) — kept as the
 * newer version of the same file, so what she is told of it each turn is what it says now — and her note says WHAT changed, in the
 * look's own words: Show me writes it into the conversation (`onShow`), OK puts the note away. The note of a file she read is kept on
 * this device until it is acknowledged, so it survives a reload. A file she cannot read by herself (not a workbook, too big, the
 * reading failed) is offered as before: Read it reads the newer version exactly as an upload is read (`onRead`, the conversation's
 * own pickDoc), Later puts the note away for this visit and the file is offered again next time it is due. */
import { useEffect, useRef, useState } from 'react';
import type { FileOrigin } from '../lib/data/sources';
import { linkNewerThan } from '../lib/fileLink/link';
import { download, newerThan, SignInNeeded } from '../lib/microsoft/graph';
import { useClientScope } from '../lib/activeClient';
import { useRoute } from '../state/useRoute';
import { Icon } from '../ui/Icon';
import { filesInHand } from './filesInHand';
import { keepUp, readNews, readStamps, readTold, writeStamp, writeTold, type InHand, type News } from './keepUp';
import { changedOf } from './knows';
import { readQuietly } from './readQuietly';
import { ackServerNews, fetchServerNews, serverNewsInHand, type ServerNewsRow } from './serverNews';

const day = (t: number) => (t ? new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '');
/* what she fetches by herself from SharePoint or OneDrive is no bigger than what she fetches by a link (colleague/keepUp) */
const KEEP_BYTES = 15 * 1024 * 1024;
/* one look at a time on a device, whoever asks (a page drawn twice asks twice) */
let looking: Promise<void> | null = null;

const clip = (x: string, n: number) => (x.length <= n ? x : `${x.slice(0, n - 1).replace(/\s+\S*$/, '')}…`);
/** A file Luna read by herself, as her note says it: its newer version's record, and what changed. */
type ToldRow = { source: InHand; changed?: string };

export function KeepUpNews({ onRead, onShow }: {
  onRead: (f: File, o: FileOrigin, /** whose the changed file is — the newer version is the same customer's */ customer?: string) => void;
  /** Show me: what changed in a file she read by herself, written into the conversation (the newer version's record). */
  onShow: (s: InHand) => void;
}) {
  const cs = useClientScope();
  const client = cs.filtering ? cs.client : '';
  const ready = cs.ready;
  /* Luna's page stays alive behind the others once it has been opened (she is beside the work, never reloaded) — so "when she is
     opened" is when her own page comes into view again, not when this is first drawn */
  const route = useRoute();
  const here = route.name === 'ai' || route.name === 'home';
  const [news, setNews] = useState<News[]>([]);
  const [server, setServer] = useState<ServerNewsRow[]>([]);
  const [told, setTold] = useState<ToldRow[]>([]);
  const [busy, setBusy] = useState('');
  const [why, setWhy] = useState('');
  const live = useRef(true);
  useEffect(() => { live.current = true; return () => { live.current = false; }; }, []);

  /* WHAT SHE READ BY HERSELF AND HAS NOT BEEN ACKNOWLEDGED — from this device's note and the records themselves, the customer in
     hand's only (a note of another customer's file waits until that customer is in hand) */
  const showTold = async () => {
    const mine = readTold();
    if (!mine.length) { if (live.current) setTold([]); return; }
    const byId = new Map((await filesInHand()).map(x => [x.id, x]));
    const rows = mine.map(t => byId.get(t.sourceId)).filter((x): x is InHand => !!x).map(source => { const c = changedOf(source); return { source, ...(c ? { changed: clip(c.paragraphs.join(' '), 300) } : {}) }; });
    if (live.current) setTold(rows);
  };
  /* another customer in hand: what was said of the last one's files is not this one's */
  useEffect(() => { setNews([]); setServer([]); setWhy(''); setTold([]); }, [client]);
  const loadServer = async () => {
    const rows = serverNewsInHand(await fetchServerNews(), client, cs.filtering);
    if (live.current) setServer(rows);
  };
  useEffect(() => { if (ready && here) void loadServer(); }, [ready, client, here, cs.filtering]);
  useEffect(() => { if (ready && here) void showTold(); }, [ready, client, here]);
  useEffect(() => {
    if (!ready || !here) return;
    const run = async () => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) return;
      const got = await keepUp(await filesInHand(), {
        link: linkNewerThan, microsoft: newerThan, now: () => Date.now(), stamps: readStamps, stamp: writeStamp,
        needsSignIn: e => e instanceof SignInNeeded,
      });
      if (!got.news.length) return;
      /* G2b: a workbook that has changed she reads herself — the bytes of a link are already here; a SharePoint or OneDrive file is
         downloaded when it is small enough for a phone on its own signal */
      const r = await readNews(got.news, {
        fetch: async n => (n.kind === 'link' ? { file: n.file, origin: n.origin }
          : n.item.size <= KEEP_BYTES ? await download({ ...n.item, name: n.source.facts.fileName }, n.origin.path) : undefined),
        read: readQuietly, now: () => Date.now(),
      });
      if (r.told.length) { writeTold(r.told); await showTold(); }
      /* what she already said and the person has not answered stays; a file newly changed that she could not read joins it */
      if (live.current && r.left.length) setNews(was => [...was.filter(x => !r.left.some(n => n.key === x.key)), ...r.left]);
      if (live.current && r.told.length) setNews(was => was.filter(x => !r.told.some(t => t.key === x.key)));
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

  const done = (s: InHand) => { writeTold([], [s.id]); setTold(all => all.filter(x => x.source.id !== s.id)); };
  const dismissServer = (id: string) => { void ackServerNews(id); setServer(all => all.filter(x => x.id !== id)); };
  const readServer = async (row: ServerNewsRow) => {
    setWhy(''); setBusy(row.file_key);
    try {
      const src = (await filesInHand()).find(x => x.id === row.source_id);
      if (!src?.facts.origin || src.facts.origin.kind !== 'link') throw new Error('The file is not on this device yet — open Files or wait for sync.');
      const got = await linkNewerThan(src.facts.origin);
      onRead(got.file, got.origin, src.whose || undefined);
      dismissServer(row.id);
    } catch (e) {
      setWhy(e instanceof Error ? e.message : String(e));
    } finally { setBusy(''); }
  };
  const n = news.length + told.length + server.length;
  if (!n) return null;
  return (
    <section className="ai-news" aria-label="What has changed since Luna last looked" data-keepup>
      <p className="ai-news-h"><Icon name="spark" size={14} /><b>{n === 1 ? 'A file I read has changed' : `${n} files I read have changed`}</b></p>
      <ul className="ai-news-l">
        {told.map(({ source: s, changed }) => (
          <li key={s.id} className="ai-news-row" data-keepup-told={s.facts.name}>
            <span className="ai-news-w">
              <b>{s.facts.name}</b>
              <span className="sub">{[!client && cs.several && s.whose ? s.whose : '', 'I have read the new version'].filter(Boolean).join(' · ')}</span>
              {changed && <span className="ai-news-c" data-keepup-changed>{changed}</span>}
            </span>
            <span className="ai-news-acts">
              <button type="button" className="btn btn-primary btn-sm" onClick={() => { onShow(s); done(s); }} data-keepup-show>Show me</button>
              <button type="button" className="btn btn-sm" onClick={() => done(s)} aria-label={`OK — put the note about ${s.facts.name} away`} data-keepup-ok>OK</button>
            </span>
          </li>
        ))}
        {server.map(row => (
          <li key={row.id} className="ai-news-row" data-server-keepup={row.file_name}>
            <span className="ai-news-w"><b>{row.file_name}</b><span className="sub">{[!client && cs.several && row.client ? row.client : '', 'from its link', 'the cloud noticed a change while you were away'].filter(Boolean).join(' · ')}</span></span>
            <span className="ai-news-acts">
              <button type="button" className="btn btn-primary btn-sm" disabled={!!busy} onClick={() => void readServer(row)} data-keepup-read>{busy === row.file_key ? 'Reading…' : 'Read it'}</button>
              <button type="button" className="btn btn-sm" disabled={!!busy} onClick={() => dismissServer(row.id)} aria-label={`Later — leave ${row.file_name} as it is for now`} data-keepup-later>Later</button>
            </span>
          </li>
        ))}
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
