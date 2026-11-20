/* CONNECT TO MICROSOFT — SharePoint and OneDrive files for Luna (20 November, docs/CONNECTED-LUNA.md X1 — Rowland: "Just make it
 * clear connect to Microsoft and then provide instructions"; "connect to pull Excel files").
 *
 * The card on Data connections opens this sheet: whether Faultline is registered with Microsoft, what it will do, and the steps —
 * register Faultline once (the person who runs Faultline), give it the Application (client) ID (the build's, or typed on this device), a
 * client's IT administrator approving it for their business. Once registered, a person signs in and chooses files from Luna's
 * ＋ › Connect to Microsoft (colleague/MicrosoftPicker). Nothing here reads or writes a record. */
import { useState } from 'react';
import { Sheet } from '../ui/Sheet';
import { Icon } from '../ui/Icon';
import { nav } from '../state/useRoute';
import { clientId, clientIdFromBuild, session, setClientId, validClientId } from '../lib/microsoft/auth';

/** The live address Microsoft sends a person back to after signing in — the redirect the app is registered with (public/ms-auth.html). */
export const MICROSOFT_REDIRECT = 'https://faultline.opexelevate.co.uk/ms-auth.html';

/** The card on Data connections — the one way in, said plainly. */
export function MicrosoftCard({ onOpen }: { onOpen: () => void }) {
  return (
    <section className="ms-card" aria-label="Microsoft 365" data-ms-card>
      <span className="ms-card-ic" aria-hidden><Icon name="cloud" size="1.3em" /></span>
      <span className="ms-card-b">
        <b>Microsoft 365 — SharePoint and OneDrive</b>
        <span className="sub" data-ms-card-state>Let Luna read the Excel workbooks and documents your business already keeps. {clientId() ? (session() ? 'Signed in on this device.' : 'Registered — sign in from Luna’s ＋.') : 'Not connected yet.'}</span>
      </span>
      <button type="button" className="btn" onClick={onOpen} data-ms-connect>Connect to Microsoft</button>
    </section>
  );
}

/** The sheet: what it will do, then the steps — each said for the person who does it. */
export function MicrosoftConnectSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [id, setId] = useState(() => clientId());
  const [typed, setTyped] = useState('');
  const [why, setWhy] = useState('');
  const built = clientIdFromBuild();
  return (
    <Sheet open={open} onClose={onClose} title="Connect to Microsoft">
      <div className="ms-sheet" data-ms-sheet>
        {id ? (
          <div className="ms-state" data-ms-registered>
            <p><b>Faultline is registered with Microsoft</b> (Application ID ending {id.slice(-4)}{built ? ', set in Faultline' : ', on this device'}).
              Sign in and choose files from Luna’s <b>＋ › Connect to Microsoft</b>.</p>
            <div className="ms-acts">
              <button type="button" className="btn btn-primary" onClick={() => { onClose(); nav('/ai'); }}>Open Luna</button>
              {!built && <button type="button" className="btn" onClick={() => { setClientId(''); setId(''); }}>Forget the ID on this device</button>}
            </div>
          </div>
        ) : (
          <p className="ms-state"><b>Not connected yet.</b> Faultline is registered with Microsoft once; after that, each person signs in with
            their own Microsoft work account and picks the files Luna may read.</p>
        )}

        <h3>What it will do</h3>
        <ul className="ms-list">
          <li>Read Excel workbooks and documents from SharePoint and OneDrive — only files the person signed in can already open.</li>
          <li>Read each file on the device, exactly as an uploaded workbook is read: the figures worked out by Faultline's own code, the
            file's cells never sent to the AI service.</li>
          <li>Say which file and which version every figure came from, and check for a newer version when asked.</li>
          <li>Never write, move or delete anything in Microsoft 365, and never read e-mail or calendars.</li>
        </ul>

        <h3>Step 1 — register Faultline with Microsoft <span className="sub">(you, once — about ten minutes)</span></h3>
        <ol className="ms-steps">
          <li>Sign in to the Microsoft Entra admin center, <b>entra.microsoft.com</b>, with an account allowed to register applications.</li>
          <li>Open <b>App registrations</b> and choose <b>New registration</b>.</li>
          <li>Name it <b>Faultline</b>. Under <i>Supported account types</i> choose <b>Accounts in any organizational directory
            (multitenant)</b>, so your clients' people can sign in too.</li>
          <li>Under <i>Redirect URI</i> choose <b>Single-page application (SPA)</b> and enter <code>{MICROSOFT_REDIRECT}</code></li>
          <li>Choose <b>Register</b>, then copy the <b>Application (client) ID</b> from its Overview page.</li>
          <li>Open <b>API permissions</b> › <b>Add a permission</b> › <b>Microsoft Graph</b> › <b>Delegated permissions</b>, and add
            <b> User.Read</b>, <b>Files.Read.All</b> and <b>Sites.Read.All</b> — all read-only. If you administer your own Microsoft 365,
            choose <b>Grant admin consent</b>.</li>
          <li>No client secret is needed: Faultline signs people in from the browser.</li>
        </ol>

        <h3>Step 2 — give Faultline the Application (client) ID</h3>
        <p>It is not a secret. Paste it here to use it on this device now, and send it to Opex Elevate to have it set in Faultline for
          everyone. Then Luna's <b>＋ › Connect to Microsoft</b> signs you in and lets you choose files from SharePoint and OneDrive.</p>
        {!built && (
          <form className="ms-id" onSubmit={e => { e.preventDefault(); if (!validClientId(typed)) { setWhy('That is not an Application ID — it looks like 1a2b3c4d-1234-5678-9abc-1234567890ab, from the app’s Overview page.'); return; } setClientId(typed); setId(typed.trim()); setTyped(''); setWhy(''); }}>
            <label className="field"><span className="field-label">Application (client) ID</span>
              <input className="text-input" value={typed} onChange={e => setTyped(e.target.value)} placeholder="1a2b3c4d-1234-5678-9abc-1234567890ab" aria-label="Application (client) ID" data-ms-id /></label>
            <button type="submit" className="btn">Use it on this device</button>
            {why && <p className="msp-err" role="alert">{why}</p>}
          </form>
        )}

        <h3>Step 3 — at a client's business <span className="sub">(their IT administrator, once)</span></h3>
        <p>Many businesses let only their IT administrator approve an app — Microsoft calls it <i>admin consent</i>. Send their administrator
          this address with their domain and your Application ID filled in, and they approve Faultline for their organisation:</p>
        <p><code>https://login.microsoftonline.com/&lt;their domain&gt;/adminconsent?client_id=&lt;Application ID&gt;</code></p>
        <p className="sub">They can take the approval back at any time from their own Entra admin center (Enterprise applications › Faultline).</p>
      </div>
    </Sheet>
  );
}
