/* CHOOSE A FILE FROM SHAREPOINT OR ONEDRIVE (20 November, docs/CONNECTED-LUNA.md X1 — Rowland: "connect to pull Excel files").
 *
 * Luna's ＋ › Connect to Microsoft. Not registered yet: said, with the way to the steps. Not signed in: one button, Sign in with
 * Microsoft (lib/microsoft/auth — the sign-in window is Microsoft's own). Signed in: Recent · My files · SharePoint, folders opened in
 * place with the way back, only the files Faultline can read offered; a file chosen is downloaded to THIS device and handed to the same
 * reader as an upload, with where it came from (lib/microsoft/graph MsOrigin). Nothing is written to Microsoft 365. */
import { useCallback, useEffect, useState } from 'react';
import { Sheet } from '../ui/Sheet';
import { Icon } from '../ui/Icon';
import { nav } from '../state/useRoute';
import { clientId, session, signIn, signOut, type MsSession } from '../lib/microsoft/auth';
import { download, folder, libraries, libraryTop, myFiles, recent, sites, SignInNeeded, type MsItem, type MsOrigin, type MsSite } from '../lib/microsoft/graph';

type View = 'recent' | 'mine' | 'sites';
interface Step { name: string; load: () => Promise<MsItem[]> }

const size = (b: number) => (b >= 1e6 ? `${(b / 1e6).toFixed(1)} MB` : b >= 1e3 ? `${Math.round(b / 1e3)} KB` : `${b} B`);
const day = (t: number) => (t ? new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

export function MicrosoftPicker({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (file: File, origin: MsOrigin) => void }) {
  const [s, setS] = useState<MsSession | null>(() => session());
  const [view, setView] = useState<View>('recent');
  const [trail, setTrail] = useState<Step[]>([]);
  const [items, setItems] = useState<MsItem[] | null>(null);
  const [words, setWords] = useState('');
  const [found, setFound] = useState<MsSite[] | null>(null);
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const registered = !!clientId();

  const fail = useCallback((e: unknown) => {
    if (e instanceof SignInNeeded) { signOut(); setS(null); }
    setErr(e instanceof Error ? e.message : String(e));
  }, []);
  const show = useCallback(async (steps: Step[]) => {
    setTrail(steps); setItems(null); setErr('');
    const last = steps[steps.length - 1];
    if (!last) return;
    try { setItems(await last.load()); } catch (e) { fail(e); setItems([]); }
  }, [fail]);
  const start = useCallback((v: View) => {
    setView(v); setFound(null); setErr('');
    if (v === 'recent') void show([{ name: 'Recent', load: recent }]);
    else if (v === 'mine') void show([{ name: 'My files', load: myFiles }]);
    else { setTrail([]); setItems(null); }
  }, [show]);
  useEffect(() => { if (open && s) start(view); /* eslint-disable-next-line react-hooks/exhaustive-deps -- on opening and on signing in */ }, [open, s]);

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

  return (
    <Sheet open={open} onClose={onClose} title="Connect to Microsoft">
      <div className="msp" data-ms-picker>
        {!registered ? (
          <div className="msp-empty" data-ms-unregistered>
            <p><b>Faultline is not registered with Microsoft yet.</b> It is done once — about ten minutes in Microsoft’s Entra admin
              center — and then you sign in here and choose files from SharePoint and OneDrive.</p>
            <button type="button" className="btn btn-primary" onClick={() => { onClose(); nav('/factory/data?ms=1'); }}>See the steps</button>
          </div>
        ) : !s ? (
          <div className="msp-empty" data-ms-signin>
            <p>Sign in with your Microsoft work account to choose a workbook or a document from SharePoint or OneDrive. Luna reads it on
              this device, as an upload — nothing is changed in Microsoft 365.</p>
            <button type="button" className="btn btn-primary" data-ms-signin-go disabled={!!busy}
              onClick={async () => { setBusy('Signing in…'); setErr(''); try { setS(await signIn()); } catch (e) { fail(e); } finally { setBusy(''); } }}>
              Sign in with Microsoft
            </button>
          </div>
        ) : (
          <>
            <p className="msp-who" data-ms-who>Signed in as <b>{s.name ?? s.username ?? 'your Microsoft account'}</b>{s.name && s.username ? ` (${s.username})` : ''} ·{' '}
              <button type="button" className="linkish" onClick={() => { signOut(); setS(null); setItems(null); setTrail([]); }}>Sign out</button></p>
            <div className="msp-views" role="tablist" aria-label="Where to look">
              {([['recent', 'Recent'], ['mine', 'My files'], ['sites', 'SharePoint']] as [View, string][]).map(([v, l]) => (
                <button key={v} type="button" role="tab" aria-selected={view === v} className={'msp-view' + (view === v ? ' is-on' : '')} onClick={() => start(v)}>{l}</button>
              ))}
            </div>
            {view === 'sites' && !trail.length && (
              <form className="msp-find" onSubmit={e => { e.preventDefault(); void findSites(); }}>
                <input className="text-input" value={words} onChange={e => setWords(e.target.value)} placeholder="A site’s name — Operations, Quality…" aria-label="Find a SharePoint site" />
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
                <li key={`${i.driveId}:${i.id}:${i.name}`}><button type="button" className="msp-row" onClick={() => void openItem(i)} data-ms-item={i.name} disabled={!!busy}>
                  <Icon name={i.folder ? 'list' : 'document'} size="1.1em" /><span className="msp-name">{i.name}</span>
                  <span className="msp-meta">{i.folder ? 'Folder' : [size(i.size), day(i.modifiedAt), view === 'recent' ? i.where : ''].filter(Boolean).join(' · ')}</span></button></li>
              ))}
            </ul>
            {trail.length > 0 && items !== null && items.length === 0 && !err && <p className="sub" data-ms-none>No workbooks, CSV files or documents here.</p>}
            {view === 'sites' && found !== null && found.length === 0 && !err && <p className="sub">No site matches “{words}”.</p>}
            {trail.length > 0 && items === null && <p className="sub">Reading…</p>}
          </>
        )}
        {busy && <p className="sub" role="status" data-ms-busy>{busy}</p>}
        {err && <p className="msp-err" role="alert" data-ms-error>{err}</p>}
      </div>
    </Sheet>
  );
}
