/* CONNECT TO MICROSOFT — SharePoint and OneDrive files for Luna (20 November, docs/CONNECTED-LUNA.md X1 — Rowland: "Just make it
 * clear connect to Microsoft and then provide instructions"; then, "is the connections UI slick, professional … when I make the
 * Microsoft account will the app auto connect or follow a digital process — it needs to be ready to connect").
 *
 * The card on Data connections says where it stands in a word (Not set up · Ready · Connected) and opens this sheet: the same word at
 * the top with the one thing to do next, then the set-up as numbered steps that tick themselves off —
 *   1  register Faultline with Microsoft (the person who runs Faultline, once): the exact settings, each with Copy;
 *   2  give Faultline its Application ID — saved ONCE FOR EVERYONE by the administrator (cloud/appSettings, supabase/APP_SETTINGS.sql),
 *      so every device of every person is ready at once; or on this device only;
 *   3  test the connection — signs in with Microsoft and lists what it can read, so it is proved before anyone needs it;
 *   4  a client's business approving it (their IT administrator, once): the approval link made with their domain, to copy.
 * Microsoft's own setting-up mistakes are said as which step puts them right (lib/microsoft/auth explain). Nothing here reads or writes
 * a record of the factory; nothing is written to Microsoft 365. */
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Sheet } from '../ui/Sheet';
import { Icon } from '../ui/Icon';
import { Fold } from '../ui/Fold';
import { StateTag, type Tone } from '../ui/parts';
import { nav } from '../state/useRoute';
import { useProfile } from '../cloud/admin';
import { APP_SETTINGS_EVENT, loadAppSettings, saveMicrosoftClientId } from '../cloud/appSettings';
import { clientId, clientIdFrom, lastAccount, session, setClientId, signIn, signOut, validClientId, type ClientIdFrom, type MsSession } from '../lib/microsoft/auth';
import { recent } from '../lib/microsoft/graph';

/** The live address Microsoft sends a person back to after signing in — the redirect the app is registered with (public/ms-auth.html). */
export const MICROSOFT_REDIRECT = 'https://faultline.opexelevate.co.uk/ms-auth.html';
/** The addresses to register: the live one, and this one too when Faultline is open at another https address (a preview). */
const redirects = (): string[] => {
  const here = `${location.origin}/ms-auth.html`;
  return location.protocol === 'https:' && here !== MICROSOFT_REDIRECT ? [MICROSOFT_REDIRECT, here] : [MICROSOFT_REDIRECT];
};
const ENTRA_NEW_APP = 'https://entra.microsoft.com/#view/Microsoft_AAD_RegisteredApps/CreateApplicationBlade/quickStartType~/null/isMSAApp~/false';
const PERMISSIONS = 'User.Read, Files.Read.All, Sites.Read.All';

/* ---------------------------------------------------------------- where it stands */
type Stage = 'none' | 'ready' | 'connected';
interface Tested { at: number; who: string; files: number }
const TESTED = 'faultline.ms.tested';
const keptTest = (): Tested | null => { try { return JSON.parse(localStorage.getItem(TESTED) ?? 'null') as Tested | null; } catch { return null; } };
const keepTest = (t: Tested | null) => { try { if (t) localStorage.setItem(TESTED, JSON.stringify(t)); else localStorage.removeItem(TESTED); } catch { /* this visit only */ } };

/** Said on the window when a step changes where Microsoft stands — the card and the sheet each read it again. */
const MS_EVENT = 'faultline:microsoft';
const readNow = () => ({ id: clientId(), from: clientIdFrom(), s: session(), tested: keptTest() });
/** Where Microsoft stands on this device — read again whenever Faultline's settings are read or a step is taken, here or beside it. */
function useMicrosoft() {
  const [now, setNow] = useState(readNow);
  const again = useCallback(() => { setNow(readNow()); window.dispatchEvent(new Event(MS_EVENT)); }, []);
  useEffect(() => {
    const re = () => setNow(readNow());
    window.addEventListener(APP_SETTINGS_EVENT, re); window.addEventListener(MS_EVENT, re);
    return () => { window.removeEventListener(APP_SETTINGS_EVENT, re); window.removeEventListener(MS_EVENT, re); };
  }, []);
  const stage: Stage = !now.id ? 'none' : now.s ? 'connected' : 'ready';
  return { ...now, stage, again };
}
const STAGE: Record<Stage, { word: string; tone: Tone }> = { none: { word: 'Not set up', tone: 'n' }, ready: { word: 'Ready', tone: 'a' }, connected: { word: 'Connected', tone: 'g' } };
const FROM: Record<Exclude<ClientIdFrom, ''>, string> = { build: 'set in Faultline itself', everyone: 'saved for everyone', device: 'on this device only' };
const who = (s: MsSession | null) => s?.name ?? s?.username ?? 'your Microsoft account';

/** The card on Data connections — where it stands in a word, and the one way in. */
export function MicrosoftCard({ onOpen }: { onOpen: () => void }) {
  const m = useMicrosoft();
  const st = STAGE[m.stage];
  return (
    <section className="ms-card" aria-label="Microsoft 365" data-ms-card>
      <span className="ms-card-ic" aria-hidden><Icon name="cloud" size="1.3em" /></span>
      <span className="ms-card-b">
        <b className="ms-card-t">SharePoint and OneDrive <StateTag tone={st.tone}>{st.word}</StateTag></b>
        <span className="sub" data-ms-card-state>{m.stage === 'none' ? 'Let Luna read the Excel workbooks and documents your business already keeps. Set up once, in about ten minutes.'
          : m.stage === 'ready' ? 'Faultline is registered with Microsoft — sign in to choose files from Luna’s ＋.'
          : `Signed in on this device as ${who(m.s)} — choose files from Luna’s ＋.`}</span>
      </span>
      <button type="button" className={`btn${m.stage === 'none' ? ' btn-primary' : ''}`} onClick={onOpen} data-ms-connect>{m.stage === 'none' ? 'Set up' : m.stage === 'ready' ? 'Connect' : 'Manage'}</button>
    </section>
  );
}

/** A value to put into Microsoft's screens exactly, with Copy. */
function CopyLine({ label, value }: { label: string; value: string }) {
  const [done, setDone] = useState(false);
  const copy = async () => { try { await navigator.clipboard.writeText(value); setDone(true); setTimeout(() => setDone(false), 1800); } catch { setDone(false); } };
  return (
    <span className="ms-copy" data-ms-copy={label}>
      <span className="ms-copy-l">{label}</span>
      <code className="ms-copy-v">{value}</code>
      <button type="button" className="btn btn-sm" onClick={() => void copy()} aria-label={`Copy ${label}`}>{done ? 'Copied' : 'Copy'}</button>
    </span>
  );
}

/** A numbered step that ticks itself off. */
function Step({ n, done, title, whoDoes, children, optional }: { n: number; done: boolean; title: string; whoDoes: string; children: ReactNode; optional?: boolean }) {
  return (
    <li className={`ms-step${done ? ' is-done' : ''}`} data-ms-step={n} data-ms-step-done={done ? 'yes' : 'no'}>
      <span className="ms-step-n" aria-hidden>{done ? <Icon name="check" size="1em" /> : n}</span>
      <div className="ms-step-b">
        <h4 className="ms-step-t">{title}{optional && <span className="sub"> — when a client needs it</span>}</h4>
        <p className="ms-step-who sub">{whoDoes}{done ? ' · done' : ''}</p>
        {children}
      </div>
    </li>
  );
}

/** The sheet: where it stands and the next thing to do, then the set-up as steps. */
export function MicrosoftConnectSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const m = useMicrosoft();
  const { profile } = useProfile();
  const admin = !!profile?.is_super;
  const [typed, setTyped] = useState('');
  const [why, setWhy] = useState('');
  const [busy, setBusy] = useState('');
  const [testWhy, setTestWhy] = useState('');
  const [changing, setChanging] = useState(false);
  const [domain, setDomain] = useState('');
  const { again } = m;
  /* opened: Faultline's settings read again, so an ID saved for everyone a moment ago on another device is here */
  useEffect(() => { if (open) void loadAppSettings(true).then(again); }, [open, again]);

  const save = async (forEveryone: boolean) => {
    const v = typed.trim();
    if (!validClientId(v)) { setWhy('That is not an Application ID — it looks like 1a2b3c4d-1234-5678-9abc-1234567890ab, on the app’s Overview page in Entra.'); return; }
    setWhy('');
    if (forEveryone) {
      setBusy('Saving it for everyone…');
      const r = await saveMicrosoftClientId(v);
      setBusy('');
      if (!r.ok) { setWhy(r.why); return; }
    } else setClientId(v);
    setTyped(''); setChanging(false); keepTest(null); again();
  };
  const test = async () => {
    setTestWhy(''); setBusy('Signing in with Microsoft…');
    try {
      const s = session() ?? await signIn();
      setBusy('Asking Microsoft what you can read…');
      const files = await recent();
      keepTest({ at: Date.now(), who: who(s), files: files.length });
    } catch (e) { setTestWhy(e instanceof Error ? e.message : String(e)); keepTest(null); }
    finally { setBusy(''); again(); }
  };
  const st = STAGE[m.stage];
  const consentLink = `https://login.microsoftonline.com/${domain.trim() || '<their domain>'}/adminconsent?client_id=${m.id || '<Application ID>'}`;
  const idForm = (
    <form className="ms-id" onSubmit={e => { e.preventDefault(); void save(admin); }}>
      <label className="field"><span className="field-label">Application (client) ID</span>
        <input className="text-input" value={typed} onChange={e => setTyped(e.target.value)} placeholder="1a2b3c4d-1234-5678-9abc-1234567890ab" aria-label="Application (client) ID" autoComplete="off" spellCheck={false} data-ms-id /></label>
      <div className="ms-acts">
        {admin && <button type="submit" className="btn btn-primary" disabled={!!busy} data-ms-save-everyone>Save for everyone</button>}
        <button type="button" className={`btn${admin ? '' : ' btn-primary'}`} onClick={() => void save(false)} disabled={!!busy}>Use it on this device</button>
      </div>
      {!admin && <p className="sub ms-note">Faultline’s administrator can save it for everyone, so every device is ready at once.</p>}
      {why && <p className="msp-err" role="alert">{why}</p>}
    </form>
  );

  return (
    <Sheet open={open} onClose={onClose} title="Connect to Microsoft">
      <div className="ms-sheet" data-ms-sheet>
        <header className={`ms-hero is-${m.stage}`} data-ms-stage={m.stage} {...(m.id ? { 'data-ms-registered': '' } : {})}>
          <span className="ms-hero-ic" aria-hidden><Icon name="cloud" size="1.4em" /></span>
          <div className="ms-hero-b">
            <h3 className="ms-hero-t">SharePoint and OneDrive for Luna <StateTag tone={st.tone}>{st.word}</StateTag></h3>
            <p className="sub" data-ms-hero-says>
              {m.stage === 'none' && 'Set up once, in four short steps. Then everyone signs in with their own Microsoft work account and Luna reads the workbooks they choose.'}
              {m.stage !== 'none' && m.from && <>Faultline is registered with Microsoft — Application ID ending <b>{m.id.slice(-4)}</b>, {FROM[m.from]}. </>}
              {m.stage === 'ready' && 'Sign in once on this device to choose files.'}
              {m.stage === 'connected' && <>Signed in as <b>{who(m.s)}</b> on this device.</>}
            </p>
            <div className="ms-acts">
              {m.stage === 'ready' && <button type="button" className="btn btn-primary" disabled={!!busy} onClick={() => void test()} data-ms-test>{lastAccount() ? `Continue as ${lastAccount()}` : 'Sign in and test'}</button>}
              {m.stage === 'connected' && <button type="button" className="btn btn-primary" onClick={() => { onClose(); nav('/ai'); }}>Choose files in Luna</button>}
              {m.stage === 'connected' && <button type="button" className="btn" disabled={!!busy} onClick={() => void test()} data-ms-test>Test the connection</button>}
              {m.stage === 'connected' && <button type="button" className="linkish" onClick={() => { signOut(); keepTest(null); again(); }}>Sign out on this device</button>}
            </div>
            {busy && <p className="sub" role="status" data-ms-busy>{busy}</p>}
            {m.tested && !busy && <p className="ms-ok" role="status" data-ms-tested>Connection tested {new Date(m.tested.at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} — signed in as {m.tested.who}; Microsoft listed {m.tested.files} recent file{m.tested.files === 1 ? '' : 's'} Faultline can read.</p>}
            {testWhy && <p className="msp-err" role="alert" data-ms-test-why>{testWhy}</p>}
          </div>
        </header>

        <ol className="ms-stepper">
          <Step n={1} done={!!m.id} title="Register Faultline with Microsoft" whoDoes="You, once — about ten minutes in Microsoft Entra">
            {!m.id && <p>Register Faultline as an app that people from any organisation can sign in to, from the browser, with three read-only permissions.</p>}
            <Fold id="ms-register" start={!m.id} title="The exact settings" says="Copy each value into Microsoft Entra">
              <ol className="ms-sub">
                <li>In <b>Microsoft Entra</b> (entra.microsoft.com), open <b>App registrations › New registration</b> — signed in with an account allowed to register apps.
                  <a className="btn btn-sm ms-ext" href={ENTRA_NEW_APP} target="_blank" rel="noreferrer">Open Microsoft Entra ↗</a></li>
                <li><CopyLine label="Name" value="Faultline" /></li>
                <li>Supported account types: <b>Accounts in any organizational directory (multitenant)</b> — so your clients’ people can sign in too.</li>
                <li>Redirect URI — platform <b>Single-page application (SPA)</b>:{redirects().map(r => <CopyLine key={r} label="Redirect URI" value={r} />)}</li>
                <li>Choose <b>Register</b>, then copy the <b>Application (client) ID</b> from its Overview page — it goes in step 2.</li>
                <li><b>API permissions › Add a permission › Microsoft Graph › Delegated</b>, all read-only: <CopyLine label="Permissions" value={PERMISSIONS} />
                  If you administer your own Microsoft 365, choose <b>Grant admin consent</b>.</li>
                <li>No client secret: Faultline signs people in from the browser, with PKCE.</li>
              </ol>
            </Fold>
          </Step>

          <Step n={2} done={!!m.id && !changing} title="Give Faultline its Application ID" whoDoes={admin ? 'You, once — saved for everyone' : 'Faultline’s administrator, once'}>
            {m.id && !changing ? (
              <p>Ending <b>{m.id.slice(-4)}</b>, {m.from ? FROM[m.from] : ''}.{m.from !== 'build' && <> <button type="button" className="linkish" onClick={() => setChanging(true)}>Change it</button></>}
                {m.from === 'device' && admin && <> · <button type="button" className="linkish" onClick={() => { setTyped(m.id); setChanging(true); }}>Save it for everyone</button></>}
                {m.from === 'device' && <> · <button type="button" className="linkish" onClick={() => { setClientId(''); keepTest(null); again(); }}>Forget it on this device</button></>}</p>
            ) : (
              <><p>It is not a secret — it is in every Microsoft sign-in address.{admin ? ' Saved for everyone, every device of every person is ready at once.' : ''}</p>{idForm}</>
            )}
          </Step>

          <Step n={3} done={!!m.tested} title="Test the connection" whoDoes="Anyone — a minute">
            {!m.tested && <p>Signs in with Microsoft in its own window and asks what you can read — proved before anyone needs it.</p>}
            {m.id && !m.tested && <button type="button" className="btn" disabled={!!busy} onClick={() => void test()} data-ms-test-step>Test the connection</button>}
            {!m.id && <p className="sub">After step 2.</p>}
          </Step>

          <Step n={4} done={false} optional title="A client’s business approves Faultline" whoDoes="Their IT administrator, once">
            <p>Many businesses let only their IT administrator approve an app (Microsoft calls it admin consent). Make their link and send it:</p>
            <label className="field ms-domain"><span className="field-label">Their Microsoft domain</span>
              <input className="text-input" value={domain} onChange={e => setDomain(e.target.value.replace(/\s+/g, ''))} placeholder="theirbusiness.co.uk" aria-label="Their Microsoft domain" autoComplete="off" spellCheck={false} data-ms-domain /></label>
            <CopyLine label="Approval link" value={consentLink} />
            <p className="sub">They can take the approval back at any time in their own Entra admin center (Enterprise applications › Faultline).</p>
          </Step>
        </ol>

        <Fold id="ms-what" start={m.stage === 'none'} title="What it does — and never does" says="Reads only; never writes, moves or deletes">
          <ul className="ms-list">
            <li>Reads the Excel workbooks and documents a person chooses from SharePoint and OneDrive — only files they can already open.</li>
            <li>Reads each file on the device, as an upload: the figures worked out by Faultline’s own code, the cells never sent to the AI service.</li>
            <li>Says which file and version every figure came from, and checks for a newer version when asked.</li>
            <li>Never writes, moves or deletes anything in Microsoft 365, and never reads e-mail or calendars.</li>
          </ul>
        </Fold>
      </div>
    </Sheet>
  );
}
