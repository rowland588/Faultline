/* CHOOSE A FILE FROM SHAREPOINT OR ONEDRIVE (20 November, docs/CONNECTED-LUNA.md X1 — Rowland: "connect to pull Excel files").
 *
 * Luna's ＋ › Connect to Microsoft. Not registered yet: said, with the way to the steps. Not signed in: one button, Sign in with
 * Microsoft (lib/microsoft/auth — the sign-in window is Microsoft's own). Signed in: Recent · My files · SharePoint, folders opened in
 * place with the way back, only the files Faultline can read offered; a file chosen is downloaded to THIS device and handed to the same
 * reader as an upload, with where it came from (lib/microsoft/graph MsOrigin). SEVERAL WORKBOOKS AT ONCE (20 November — a file a
 * month in a SharePoint folder): each workbook has a tick, kept while folders are opened, and Read n workbooks downloads them all and
 * hands them over together, read in the order of their own dates (colleague/attachWorkbook attachWorkbooks). Nothing is written to
 * Microsoft 365. */
import { useCallback, useEffect, useRef, useState } from 'react';
import { MicrosoftAccountHelp } from '../ui/MicrosoftAccountHelp';
import { Sheet } from '../ui/Sheet';
import { Icon } from '../ui/Icon';
import { nav } from '../state/useRoute';
import { clientId, lastAccount, session, signIn, signOut, validMicrosoftTenant, type MsSession } from '../lib/microsoft/auth';
import { download, folder, libraries, libraryTop, myFiles, recent, sites, SignInNeeded, type MsItem, type MsOrigin, type MsSite } from '../lib/microsoft/graph';

type View = 'recent' | 'mine' | 'sites';
interface Step { name: string; load: () => Promise<MsItem[]> }

const size = (b: number) => (b >= 1e6 ? `${(b / 1e6).toFixed(1)} MB` : b >= 1e3 ? `${Math.round(b / 1e3)} KB` : `${b} B`);
const day = (t: number) => (t ? new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

const BOOK = /\.(xlsx|xlsm)$/i;

export function MicrosoftPicker({ open, guest = false, onClose, onPick, onPickMany }: { open: boolean; guest?: boolean; onClose: () => void; onPick: (file: File, origin: MsOrigin) => void; onPickMany?: (picks: { file: File; origin: MsOrigin }[]) => void }) {
  const [s, setS] = useState<MsSession | null>(() => session());
  const [view, setView] = useState<View>('recent');
  const [trail, setTrail] = useState<Step[]>([]);
  const [items, setItems] = useState<MsItem[] | null>(null);
  const [words, setWords] = useState('');
  const [tenant, setTenant] = useState('');
  const [found, setFound] = useState<MsSite[] | null>(null);
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  /* the workbooks ticked, by drive and item, with the path each was ticked at — kept while folders are opened */
  const [ticked, setTicked] = useState<Map<string, { item: MsItem; path: string }>>(new Map());
  const listVersion = useRef(0);
  const registered = !!clientId();
  const keyOf = (i: MsItem) => `${i.driveId}:${i.id}`;

  const fail = useCallback((e: unknown) => {
    if (e instanceof SignInNeeded) { signOut(); setS(null); setTicked(new Map()); setFound(null); setWords(''); }
    setErr(e instanceof Error ? e.message : String(e));
  }, []);
  const show = useCallback(async (steps: Step[]) => {
    const version = ++listVersion.current;
    setTrail(steps); setItems(null); setErr('');
    const last = steps[steps.length - 1];
    if (!last) return;
    try {
      const result = await last.load();
      if (version === listVersion.current) setItems(result);
    } catch (e) {
      if (version === listVersion.current) { fail(e); setItems([]); }
    }
  }, [fail]);
  const start = useCallback((v: View) => {
    setView(v); setFound(null); setErr('');
    if (v === 'recent') void show([{ name: 'Recent', load: recent }]);
    else if (v === 'mine') void show([{ name: 'My files', load: myFiles }]);
    else { listVersion.current++; setTrail([]); setItems(null); }
  }, [show]);
  useEffect(() => {
    if (open && s) start(s.tenant ? 'sites' : view);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- on opening and on signing in, never on every change of view
  }, [open, s]);

  const where = () => trail.map(t => t.name).join(' › ');
  const openItem = async (i: MsItem) => {
    if (i.folder) { void show([...trail, { name: i.name, load: () => folder(i.driveId, i.id, i.where) }]); return; }
    if (/\.(xls|xlsb)$/i.test(i.name)) { setErr(`“${i.name}” is an older Excel format — open it in Excel, save it as .xlsx in the same place, and choose that.`); return; }
    setBusy(`Downloading “${i.name}” (${size(i.size)}) to this device…`); setErr('');
    try {
      const { file, origin } = await download(i, [where(), i.name].filter(Boolean).join(' › '));
      onPick(file, origin);
      onClose();
    } catch (e) { fail(e); } finally { setBusy(''); }
  };
  const tick = (i: MsItem) => setTicked(t => { const n = new Map(t); if (n.has(keyOf(i))) n.delete(keyOf(i)); else n.set(keyOf(i), { item: i, path: [where(), i.name].filter(Boolean).join(' › ') }); return n; });
  const readTicked = async () => {
    const all = [...ticked.values()];
    if (!all.length || !onPickMany) return;
    setErr('');
    const picks: { file: File; origin: MsOrigin }[] = [];
    try {
      for (const [k, x] of all.entries()) {
        setBusy(`Downloading ${k + 1} of ${all.length} — “${x.item.name}” (${size(x.item.size)}) to this device…`);
        picks.push(await download(x.item, x.path));
      }
      setTicked(new Map());
      onPickMany(picks);
      onClose();
    } catch (e) { fail(e); } finally { setBusy(''); }
  };
  const findSites = async () => {
    setBusy('Finding sites…'); setErr('');
    try { setFound(await sites(words)); } catch (e) { fail(e); } finally { setBusy(''); }
  };
  const openSite = async (site: MsSite) => {
    setBusy(`Opening ${site.name}…`); setErr('');
    try {
      const libs = await libraries(site);
      const lib = libs.length === 1 ? libs[0] : undefined;
      if (lib) void show([{ name: site.name, load: () => libraryTop(lib.driveId, site.name) }]);
      else void show([{ name: site.name, load: async () => libs.map(l => ({ id: 'root', name: l.name, folder: true, size: 0, modifiedAt: 0, driveId: l.driveId, where: site.name })) }]);
    } catch (e) { fail(e); } finally { setBusy(''); }
  };

  const guestForm = (
    <details key={s?.tenant ?? 'home'} className="ms-help" open={(guest && !s?.tenant) || undefined}>
      <summary>Invited to a customer’s SharePoint?</summary>
      <p>Accept their guest invitation first. Enter their Microsoft domain or tenant ID, then sign in with the account they invited.</p>
      <form className="ms-id" onSubmit={async e => {
        e.preventDefault(); setErr('');
        if (!validMicrosoftTenant(tenant.trim())) { setErr('Ask the customer for their Microsoft sign-in domain or tenant ID.'); return; }
        setBusy('Connecting to the customer…');
        try {
          const next = await signIn({ tenant, choose: true });
          listVersion.current++;
          setWords(''); setFound(null); setItems(null); setTrail([]); setTicked(new Map()); setS(next);
        } catch (error) { fail(error); } finally { setBusy(''); }
      }}>
        <label className="field">Customer’s Microsoft domain or tenant ID
          <input className="text-input" value={tenant} onChange={e => setTenant(e.target.value)} placeholder="customer.onmicrosoft.com" autoCapitalize="off" spellCheck={false} />
        </label>
        <button className="btn" type="submit" disabled={!!busy || !tenant.trim()}>Connect as a guest</button>
      </form>
    </details>
  );
  return (
    <Sheet open={open} onClose={onClose} title="Connect to Microsoft">
      <div className="msp" data-ms-picker>
        {!registered ? (
          <div className="msp-empty" data-ms-unregistered>
            <span className="msp-empty-ic" aria-hidden><Icon name="cloud" size="1.4em" /></span>
            <h3 className="msp-empty-t">SharePoint and OneDrive are not set up yet</h3>
            <p className="sub"><b>Faultline is not registered with Microsoft yet.</b> Ask your Faultline administrator to enable the connector. Then sign in with the work or school account that can open your files.</p>
            <button type="button" className="btn btn-primary" onClick={() => { onClose(); nav('/factory/data?ms=1'); }}>See the steps</button>
            <MicrosoftAccountHelp />
          </div>
        ) : !s ? (
          <div className="msp-empty" data-ms-signin>
            <span className="msp-empty-ic" aria-hidden><Icon name="cloud" size="1.4em" /></span>
            <h3 className="msp-empty-t">Sign in to SharePoint and OneDrive</h3>
            <p className="sub">Use the work or school account that can already open these files. Luna requests read access. Your organisation may ask IT to approve it.</p>
            <div className="msp-acts">
              <button type="button" className="btn btn-primary" data-ms-signin-go disabled={!!busy}
                onClick={async () => { setBusy('Signing in…'); setErr(''); try { setS(await signIn()); } catch (e) { fail(e); } finally { setBusy(''); } }}>
                {lastAccount() ? `Continue as ${lastAccount()}` : 'Sign in with Microsoft'}
              </button>
              {lastAccount() && <button type="button" className="linkish" disabled={!!busy}
                onClick={async () => { setBusy('Signing in…'); setErr(''); try { setS(await signIn({ choose: true })); } catch (e) { fail(e); } finally { setBusy(''); } }}>Use another account</button>}
            </div>
            {guestForm}
            <MicrosoftAccountHelp />
            <a className="cw-link" href="#/factory/data?ms=1&approval=1" onClick={onClose}>Get IT approval</a>
          </div>
        ) : (
          <>
            <p className="msp-who" data-ms-who>Signed in as <b>{s.name ?? s.username ?? 'your Microsoft account'}</b>{s.name && s.username ? ` (${s.username})` : ''}{s.tenant && <> · Guest in <b>{s.tenant}</b></>} ·{' '}
              <button type="button" className="linkish" disabled={!!busy} onClick={() => { listVersion.current++; signOut(); setS(null); setItems(null); setTrail([]); setView('recent'); setWords(''); setTicked(new Map()); setFound(null); }}>Sign out</button></p>
            {guestForm}
            <div className="msp-views" role="tablist" aria-label="Where to look">
              {([['recent', 'Recent'], ['mine', 'My files'], ['sites', 'SharePoint']] as [View, string][]).map(([v, l]) => (
                <button key={v} type="button" role="tab" aria-selected={view === v} className={'msp-view' + (view === v ? ' is-on' : '')} onClick={() => start(v)}>{l}</button>
              ))}
            </div>
            {view === 'sites' && !trail.length && (
              <form className="msp-find" onSubmit={e => { e.preventDefault(); void findSites(); }}>
                <input className="text-input" value={words} onChange={e => setWords(e.target.value)} placeholder="Site name or SharePoint site URL" aria-label="Find a SharePoint site" />
                <button type="submit" className="btn">Find sites</button>
              </form>
            )}
            {trail.length > 1 && (
              <button type="button" className="msp-back linkish" onClick={() => void show(trail.slice(0, -1))}><Icon name="chevronLeft" size="1em" /> {trail[trail.length - 2].name}</button>
            )}
            {trail.length > 0 && <p className="msp-where sub" data-ms-where>{where()}</p>}
            <ul className="msp-list" aria-label="Files and folders">
              {view === 'sites' && !trail.length && (found ?? []).map(site => (
                <li key={site.id}><button type="button" className="msp-row" onClick={() => void openSite(site)} data-ms-site={site.name}>
                  <Icon name="board" size="1.1em" /><span className="msp-name">{site.name}</span><span className="msp-meta">SharePoint site</span></button></li>
              ))}
              {trail.length > 0 && (items ?? []).map(i => (
                <li key={`${i.driveId}:${i.id}:${i.name}`} className="msp-li">
                  {onPickMany && !i.folder && BOOK.test(i.name) && (
                    <label className="msp-tick" title="Tick several workbooks to read them together">
                      <input type="checkbox" checked={ticked.has(keyOf(i))} onChange={() => tick(i)} data-ms-tick={i.name} aria-label={`Read “${i.name}” with the others ticked`} />
                    </label>
                  )}
                  <button type="button" className="msp-row" onClick={() => void openItem(i)} data-ms-item={i.name} disabled={!!busy}>
                  <Icon name={i.folder ? 'list' : 'document'} size="1.1em" /><span className="msp-name">{i.name}</span>
                  <span className="msp-meta">{i.folder ? 'Folder' : [size(i.size), day(i.modifiedAt), view === 'recent' ? i.where : ''].filter(Boolean).join(' · ')}</span></button></li>
              ))}
            </ul>
            {trail.length > 0 && items !== null && items.length === 0 && !err && <p className="sub" data-ms-none>No workbooks, CSV files or documents here.</p>}
            {view === 'sites' && found !== null && found.length === 0 && !err && <p className="sub">No site matches “{words}”.</p>}
            {trail.length > 0 && items === null && <p className="sub">Reading…</p>}
            {ticked.size > 0 && (
              <div className="msp-ticked" data-ms-ticked>
                <span>{ticked.size === 1 ? '1 workbook ticked — tick another to read them together, or open it.' : `${ticked.size} workbooks ticked — read in the order of their own dates, each compared with the one before.`}</span>
                <span className="msp-ticked-acts">
                  <button type="button" className="linkish" onClick={() => setTicked(new Map())}>Clear</button>
                  {ticked.size > 1 && <button type="button" className="btn btn-primary" disabled={!!busy} onClick={() => void readTicked()} data-ms-read-ticked>Read {ticked.size} workbooks</button>}
                </span>
              </div>
            )}
          </>
        )}
        {busy && <p className="sub" role="status" data-ms-busy>{busy}</p>}
        {err && <p className="msp-err" role="alert" data-ms-error>{err}</p>}
      </div>
    </Sheet>
  );
}
