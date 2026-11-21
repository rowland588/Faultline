/* THE FILES LUNA CAN READ — in one place, beside her (20 November, docs/CONNECTED-LUNA.md X2 — Rowland: "upload Excel and that
 * entire system and connect to pull Excel files").
 *
 * Every workbook, table and document in the register (capabilities/data allSources) for the customer in hand — never another
 * customer's — newest first: its name, where it came from (uploaded, or SharePoint/OneDrive with its path), when it was read, and how
 * the read went. A file from SharePoint or OneDrive offers Check for a newer version: its version (eTag) against the one kept
 * (lib/microsoft/graph newerThan); a newer one is downloaded to this device and read the way an upload is (`onRead` — the
 * conversation's own pickDoc), and the first look says what changed since. Nothing here writes to Microsoft 365.
 *
 * A FILE READ BY ITS LINK (X1b, 21 November) is listed the same way — From a link, with the service — and its Check for a newer
 * version fetches the link again and compares the file's fingerprint with the one kept (lib/fileLink/link linkNewerThan): a shared
 * link's download gives no version number to trust, so the bytes themselves decide. */
import { useEffect, useState } from 'react';
import { filesInHand } from './filesInHand';
import type { FileOrigin, Source } from '../lib/data/sources';
import { linkNewerThan, type LinkOrigin } from '../lib/fileLink/link';
import { onDataChange } from '../db';
import { download, newerThan, SignInNeeded, type MsItem } from '../lib/microsoft/graph';
import { Fold } from '../ui/Fold';
import { useClientScope } from '../lib/activeClient';

const day = (t: number) => (t ? new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '');
const STATUS: Record<string, string> = { partial: 'only part read', failed: 'could not be read', interrupted: 'reading stopped', reading: 'being read' };

type Check = { state: 'checking' } | { state: 'same' } | { state: 'newer'; item: MsItem } | { state: 'newer-link'; file: File; origin: LinkOrigin } | { state: 'reading' } | { state: 'error'; why: string };

export function LunaFiles({ onRead }: { onRead?: (f: File, o: FileOrigin, /** whose the listed file is — a newer version is the same customer's */ customer?: string) => void }) {
  /* the customer in hand (the top bar): their files and the files said to be no one's; All clients — every file, each its own */
  const cs = useClientScope();
  const client = cs.filtering ? cs.client : '';
  const [rows, setRows] = useState<(Source & { whose: string })[]>([]);
  const [checks, setChecks] = useState<Record<string, Check>>({});
  useEffect(() => {
    let live = true;
    /* WHOSE EACH FILE IS decides what is listed (capabilities/data standingOf, 21 November — "links and data for Luna also need to be
       included in the current customer"): the customer in hand's files and those truly no one's; every customer's in use when all are
       shown, each named; never an archived customer's — put away with it, back when it is continued */
    const load = () => void filesInHand().then(mine => { if (live) setRows(mine.slice(0, 12)); }).catch(() => undefined);
    load();
    const off = onDataChange(load);
    return () => { live = false; off(); };
  }, [client]);

  const check = async (s: Source) => {
    const o = s.facts.origin;
    if (!o) return;
    setChecks(c => ({ ...c, [s.id]: { state: 'checking' } }));
    try {
      if (o.kind === 'link') {
        const r = await linkNewerThan(o);
        setChecks(c => ({ ...c, [s.id]: r.newer ? { state: 'newer-link', file: r.file, origin: r.origin } : { state: 'same' } }));
        return;
      }
      const r = await newerThan(o);
      setChecks(c => ({ ...c, [s.id]: r.newer ? { state: 'newer', item: r.item } : { state: 'same' } }));
    } catch (e) {
      setChecks(c => ({ ...c, [s.id]: { state: 'error', why: e instanceof SignInNeeded ? 'Sign in to Microsoft first — Luna’s ＋ › Connect to Microsoft.' : e instanceof Error ? e.message : String(e) } }));
    }
  };
  const readNewer = async (s: Source & { whose: string }, item: MsItem) => {
    const o = s.facts.origin;
    if (!o || o.kind !== 'microsoft' || !onRead) return;
    setChecks(c => ({ ...c, [s.id]: { state: 'reading' } }));
    try {
      const { file, origin } = await download({ ...item, name: s.facts.fileName }, o.path);
      onRead(file, origin, s.whose || undefined);
      setChecks(c => { const n = { ...c }; delete n[s.id]; return n; });
    } catch (e) {
      setChecks(c => ({ ...c, [s.id]: { state: 'error', why: e instanceof SignInNeeded ? 'Sign in to Microsoft first — Luna’s ＋ › Connect to Microsoft.' : e instanceof Error ? e.message : String(e) } }));
    }
  };

  return (
    <div className="ai-ctx-s" data-luna-files>
      <Fold id="luna-files" start={false} title="Files Luna can read"
        says={rows.length ? `${rows.length} file${rows.length === 1 ? '' : 's'}${client ? ` of ${client}` : ''}` : 'None yet — attach a workbook, paste its link, or choose one from Microsoft'}>
        {rows.length === 0 ? <p className="sub ai-ctx-none">A workbook attached with ＋, read by its link, or chosen from SharePoint or OneDrive, is listed here with where it came from.</p> : (
          <ul className="lf-list">
            {rows.map(s => {
              const f = s.facts, o = f.origin, c = checks[s.id];
              return (
                <li key={s.id} className="lf-row" data-luna-file={f.name}>
                  <b className="lf-name">{f.name}</b>
                  <span className="lf-where sub" data-luna-file-where>{!client && cs.several && s.whose ? `${s.whose} · ` : ''}{!o ? 'Uploaded' : o.kind === 'link' ? `From a link · ${o.path}` : `SharePoint or OneDrive · ${o.path}`} · read {day(f.at)}{STATUS[f.status] ? ` · ${STATUS[f.status]}` : ''}</span>
                  {o && (
                    <span className="lf-acts">
                      {!c && <button type="button" className="linkish" onClick={() => void check(s)} data-luna-file-check>Check for a newer version</button>}
                      {c?.state === 'checking' && <span className="sub" role="status">{o.kind === 'link' ? 'Fetching the link again…' : 'Asking Microsoft…'}</span>}
                      {c?.state === 'same' && <span className="sub" role="status" data-luna-file-same>The same version as was read.</span>}
                      {c?.state === 'newer' && <><span className="lf-newer" role="status" data-luna-file-newer>A newer version — changed {day(c.item.modifiedAt)}.</span>
                        {onRead && <button type="button" className="btn btn-sm" onClick={() => void readNewer(s, c.item)} data-luna-file-read>Read it</button>}</>}
                      {c?.state === 'newer-link' && <><span className="lf-newer" role="status" data-luna-file-newer>A newer version — the file behind the link has changed.</span>
                        {onRead && <button type="button" className="btn btn-sm" onClick={() => { onRead(c.file, c.origin, s.whose || undefined); setChecks(x => { const n = { ...x }; delete n[s.id]; return n; }); }} data-luna-file-read>Read it</button>}</>}
                      {c?.state === 'reading' && <span className="sub" role="status">Downloading to this device…</span>}
                      {c?.state === 'error' && <span className="lf-err" role="alert">{c.why}</span>}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Fold>
    </div>
  );
}
