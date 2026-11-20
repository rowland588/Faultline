/* CONNECT TO MICROSOFT — SharePoint and OneDrive files for Luna (20 November, docs/CONNECTED-LUNA.md C2 — Rowland: "Just make it
 * clear connect to Microsoft and then provide instructions").
 *
 * A card on Data connections and Luna's ＋ › Connect to Microsoft both open the same sheet: what it will do, and the three steps to get
 * there — register Faultline with Microsoft once (the person who runs Faultline), send the Application (client) ID, a client's IT
 * administrator approving it for their business. The sign-in itself is the next slice to build; the sheet says so in words and claims
 * nothing that is not built. Nothing here reads or writes a record. */
import { Sheet } from '../ui/Sheet';
import { Icon } from '../ui/Icon';

/** The live address Microsoft sends a person back to after signing in — the redirect a single-page application is registered with. */
export const MICROSOFT_REDIRECT = 'https://faultline.opexelevate.co.uk/';

/** The card on Data connections — the one way in, said plainly. */
export function MicrosoftCard({ onOpen }: { onOpen: () => void }) {
  return (
    <section className="ms-card" aria-label="Microsoft 365" data-ms-card>
      <span className="ms-card-ic" aria-hidden><Icon name="cloud" size="1.3em" /></span>
      <span className="ms-card-b">
        <b>Microsoft 365 — SharePoint and OneDrive</b>
        <span className="sub">Let Luna read the Excel workbooks and documents your business already keeps. Not connected yet.</span>
      </span>
      <button type="button" className="btn" onClick={onOpen} data-ms-connect>Connect to Microsoft</button>
    </section>
  );
}

/** The sheet: what it will do, then the steps — each said for the person who does it. */
export function MicrosoftConnectSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="Connect to Microsoft">
      <div className="ms-sheet" data-ms-sheet>
        <p className="ms-state"><b>Not connected yet.</b> Faultline is registered with Microsoft once; after that, each person signs in with
          their own Microsoft work account and picks the files Luna may read.</p>

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

        <h3>Step 2 — send the Application (client) ID</h3>
        <p>Send it to Opex Elevate (it is not a secret). Once it is set in Faultline, <b>Connect to Microsoft</b> signs you in here and
          Luna's ＋ offers <b>Choose from SharePoint</b> beside <i>A file or spreadsheet</i>. That sign-in is the next step being built.</p>

        <h3>Step 3 — at a client's business <span className="sub">(their IT administrator, once)</span></h3>
        <p>Many businesses let only their IT administrator approve an app — Microsoft calls it <i>admin consent</i>. Send their administrator
          this address with their domain and your Application ID filled in, and they approve Faultline for their organisation:</p>
        <p><code>https://login.microsoftonline.com/&lt;their domain&gt;/adminconsent?client_id=&lt;Application ID&gt;</code></p>
        <p className="sub">They can take the approval back at any time from their own Entra admin center (Enterprise applications › Faultline).</p>
      </div>
    </Sheet>
  );
}
