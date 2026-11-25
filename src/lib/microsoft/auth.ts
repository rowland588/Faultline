/* SIGNING IN TO MICROSOFT 365 — for files from SharePoint and OneDrive (20 November, docs/CONNECTED-LUNA.md X1 — Rowland: "the most
 * important aspect for Luna right now is upload Excel and that entire system and connect to pull Excel files").
 *
 * The OAuth 2.0 authorization-code flow with PKCE (RFC 7636), as Microsoft's identity platform asks of a single-page application: no
 * client secret; a sign-in window opened on Microsoft's own page; the code it returns to Faultline's /ms-auth.html exchanged for a
 * token by the browser. The token reads only what the person signed in can already open (delegated, read-only scopes) and is kept on
 * THIS device only — never synced, never sent to Faultline's own service or to the AI. Signing out forgets it.
 *
 * Faultline must be registered with Microsoft once (the Application (client) ID): from the build (VITE_MS_CLIENT_ID), else saved ONCE
 * by the administrator for everyone (supabase/APP_SETTINGS.sql — read on start by cloud/appSettings and kept on the device), else typed
 * on this device only. */

const STORE = 'faultline.ms.session';
const CLIENT_KEY = 'faultline.ms.clientId';
/** The settings of Faultline itself, as cloud/appSettings keeps them on the device (read here, never fetched here). */
const APP_SETTINGS = 'faultline.app.settings';
/** The account last signed in on this device — so signing in again names it and Microsoft can skip its account picker. */
const LAST = 'faultline.ms.last';
/** Work and school accounts — the businesses' own Microsoft 365. */
export const AUTHORITY = 'https://login.microsoftonline.com/organizations/oauth2/v2.0';
/** A guest must authenticate in the customer's directory to read its SharePoint sites. */
export function validMicrosoftTenant(tenant: string): boolean {
  return validClientId(tenant) || (tenant.length <= 253 && /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(tenant) && !/\.sharepoint\.com$/i.test(tenant));
}
function authority(tenant?: string, fileLink = false): string {
  if (!tenant && fileLink) return 'https://login.microsoftonline.com/common/oauth2/v2.0';
  if (tenant === undefined) return AUTHORITY;
  if (!validMicrosoftTenant(tenant)) throw new Error('Enter the Microsoft sign-in domain or tenant ID supplied by the customer’s IT team.');
  return `https://login.microsoftonline.com/${tenant}/oauth2/v2.0`;
}
/** Read-only: who is signed in, the files they can open, the SharePoint sites they can see. offline_access keeps the sign-in for a day. */
export const SCOPES = 'openid profile offline_access User.Read Files.Read.All Sites.Read.All';

/** Read-only files (X1). Mail.Send is asked only when the person presses Connect Outlook — so a tenant that has not ticked it yet can still sign in for SharePoint. */
const FILE_SCOPES = 'openid profile offline_access User.Read Files.Read.All';
export const MAIL_SCOPE = 'Mail.Send';
export const MAIL_SCOPES = `${SCOPES} ${MAIL_SCOPE}`;

export interface MsSession { tenant?: string; access: string; refresh?: string; expiresAt: number; name?: string; username?: string; /** true when this token was issued with Mail.Send (Connect Outlook). */ mail?: boolean }

/** The page Microsoft sends the sign-in back to — registered with the app as a single-page application. */
export function redirectUri(): string { return `${location.origin}/ms-auth.html`; }

/** Where the Application (client) ID comes from: the build, saved for everyone, this device only — or nowhere yet. */
export type ClientIdFrom = 'build' | 'everyone' | 'device' | '';
export function clientIdFrom(): ClientIdFrom {
  if ((import.meta.env.VITE_MS_CLIENT_ID as string | undefined)?.trim()) return 'build';
  try {
    const all = JSON.parse(localStorage.getItem(APP_SETTINGS) ?? 'null') as { microsoftClientId?: string } | null;
    if (all?.microsoftClientId?.trim()) return 'everyone';
    if (localStorage.getItem(CLIENT_KEY)?.trim()) return 'device';
  } catch { /* nothing kept */ }
  return '';
}
/** The Application (client) ID: the build's, else the one saved for everyone, else the one typed on this device. */
export function clientId(): string {
  const built = (import.meta.env.VITE_MS_CLIENT_ID as string | undefined)?.trim();
  if (built) return built;
  try {
    const all = JSON.parse(localStorage.getItem(APP_SETTINGS) ?? 'null') as { microsoftClientId?: string } | null;
    return all?.microsoftClientId?.trim() || (localStorage.getItem(CLIENT_KEY)?.trim() ?? '');
  } catch { return ''; }
}
/** A GUID, as Entra gives one — anything else is refused in words before it is kept. */
export function validClientId(v: string): boolean { return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v.trim()); }
export function setClientId(v: string): void { try { if (v.trim()) localStorage.setItem(CLIENT_KEY, v.trim()); else localStorage.removeItem(CLIENT_KEY); } catch { /* this visit only */ } }
export function clientIdFromBuild(): boolean { return !!(import.meta.env.VITE_MS_CLIENT_ID as string | undefined)?.trim(); }

/* ------------------------------------------------------------------ PKCE (RFC 7636) */
export function base64url(bytes: Uint8Array): string {
  let s = ''; for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function randomVerifier(): string { const b = new Uint8Array(32); crypto.getRandomValues(b); return base64url(b); }
const sendPopupTo = (win: Window, url: string): void => { win.location.href = url; };
/** S256: BASE64URL(SHA-256(ASCII(verifier))). */
export async function challengeOf(verifier: string): Promise<string> {
  return base64url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))));
}

/* ------------------------------------------------------------------ the session on this device */
export function session(fileLink = false): MsSession | null {
  try { const s = JSON.parse(localStorage.getItem(fileLink ? STORE + '.fileLink' : STORE) ?? 'null') as MsSession | null; return s?.access ? s : null; } catch { return null; }
}
function keep(s: MsSession | null, fileLink = false): void { const key = fileLink ? STORE + '.fileLink' : STORE; try { if (s) localStorage.setItem(key, JSON.stringify(s)); else localStorage.removeItem(key); } catch { /* this visit only */ } }
/** Signing out forgets the sign-in AND the account it was, on this device. */
export function signOut(): void { keep(null); keep(null, true); try { localStorage.removeItem(LAST); } catch { /* this visit only */ } }
/** This device has a Mail.Send token — Luna can send from the signed-in mailbox on a confirm card. */
export function mailConnected(): boolean { return !!session()?.mail; }
/** The account last signed in on this device, while it has not signed out. */
export function lastAccount(): string { try { return localStorage.getItem(LAST) ?? ''; } catch { return ''; } }

/** The name and address in the id token — what the sheet says ("Signed in as …"); never checked as proof of anything. */
export function claimsOf(idToken?: string): { name?: string; username?: string } {
  try {
    const part = idToken?.split('.')[1]; if (!part) return {};
    const j = JSON.parse(decodeURIComponent(escape(atob(part.replace(/-/g, '+').replace(/_/g, '/'))))) as { name?: string; preferred_username?: string };
    return { name: j.name, username: j.preferred_username };
  } catch { return {}; }
}

interface TokenReply { access_token?: string; refresh_token?: string; expires_in?: number; id_token?: string; error?: string; error_description?: string }
async function tokenCall(body: Record<string, string>, tenant?: string, fileLink = false): Promise<TokenReply & { access_token: string }> {
  const r = await fetch(`${authority(tenant, fileLink)}/token`, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(body).toString() });
  const j = (await r.json().catch(() => ({}))) as TokenReply;
  if (!r.ok || !j.access_token) throw new Error(explain(j.error_description ?? j.error ?? `Microsoft refused the sign-in (${r.status}).`));
  return { ...j, access_token: j.access_token };
}
/** Microsoft's own words, short: the first sentence, its trace ids left off. */
export function said(why: string): string { return why.split(/\r?\n|Trace ID|Correlation ID/)[0].trim().replace(/^AADSTS\d+:\s*/, ''); }
/** THE SETTING-UP MISTAKES MICROSOFT NAMES BY NUMBER, said as what to do (20 November — "it needs to be ready to connect"): each points
 *  at the step in Connect to Microsoft that puts it right; anything else is Microsoft's own words, short. */
export function explain(why: string, redirect = redirectUri()): string {
  const code = /AADSTS(\d+)/.exec(why)?.[1] ?? '';
  if (code === '50011') return `Microsoft does not have this sign-in address on Faultline's registration. Add ${redirect} as a Single-page application redirect URI (step 1).`;
  if (code === '9002326') return 'The redirect address is registered as Web, not Single-page application — change its platform to Single-page application under Authentication (step 1).';
  if (code === '700016') return 'Microsoft does not know that Application ID in this organisation — check the ID (step 2), and that the registration allows accounts in any organisational directory (step 1).';
  if (/Mail\.Send/i.test(why) || code === '650053') return 'Microsoft has not granted Mail.Send on Faultline’s registration. In Entra, API permissions › Microsoft Graph › Delegated › tick Mail.Send, grant admin consent (or re-run the Cloud Shell line), then Connect Outlook again.';
  if (code === '65001' || code === '90094' || code === '90008') return 'This organisation lets only its IT administrator approve apps — send them the approval link (step 4), then sign in again.';
  if (code === '50020' || code === '500200') return 'Sign in with the work or school account your organisation uses for Microsoft 365. If you need access, ask your IT team to add that account.';
  if (code === '50105') return 'Your account has not been given Faultline in this organisation — ask your IT administrator to assign it to you.';
  if (code === '65004' || /access_denied/.test(why)) return 'The permissions were not accepted, so nothing was connected. Sign in again and choose Accept to connect.';
  return said(why);
}

/** Sign in, in a window of Microsoft's own; resolves with the session kept on this device. Signing in again names the account last
 *  used here, so Microsoft can skip its account picker (`choose` asks for the picker — "use another account"). */
export async function signIn(o: { choose?: boolean; mail?: boolean; tenant?: string; fileLink?: boolean } = {}): Promise<MsSession> {
  const id = clientId();
  if (!id) throw new Error('Faultline is not registered with Microsoft yet — see the steps in Connect to Microsoft.');
  const tenant = o.tenant?.trim().toLowerCase();
  const issuer = authority(tenant, o.fileLink);
  const verifier = randomVerifier();
  const state = randomVerifier();
  const scopes = o.fileLink ? FILE_SCOPES : o.mail ? MAIL_SCOPES : SCOPES;
  /* Open during the button's user gesture. Awaiting PKCE first makes Chrome and
     installed apps treat the later popup as unsolicited. */
  const win = window.open('', 'faultline-microsoft', 'width=520,height=680');
  if (!win) throw new Error('The browser stopped the sign-in window — allow pop-ups for Faultline, then try again.');
  try {
    const url = `${issuer}/authorize?${new URLSearchParams({
      client_id: id, response_type: 'code', redirect_uri: redirectUri(), response_mode: 'query', scope: scopes,
      code_challenge: await challengeOf(verifier), code_challenge_method: 'S256', state,
      ...(o.mail ? { prompt: 'consent' } : (!o.choose && lastAccount() ? { login_hint: lastAccount() } : { prompt: 'select_account' })),
    }).toString()}`;
    sendPopupTo(win, url);
  } catch (e) { win.close(); throw e; }
  const back = await new Promise<URLSearchParams>((resolve, reject) => {
    const until = Date.now() + 5 * 60_000;
    const tick = window.setInterval(() => {
      if (win.closed) { window.clearInterval(tick); reject(new Error('The sign-in window was closed before it finished.')); return; }
      if (Date.now() > until) { window.clearInterval(tick); win.close(); reject(new Error('The sign-in took too long — try again.')); return; }
      let href = '';
      try { href = win.location.href; } catch { return; /* still on Microsoft's page */ }
      if (!href.startsWith(redirectUri())) return;
      window.clearInterval(tick);
      const q = new URL(href).searchParams;
      win.close();
      resolve(q);
    }, 250);
  });
  if (back.get('error')) throw new Error(explain(`${back.get('error_description') ?? ''} ${back.get('error') ?? ''}`.trim() || 'Microsoft refused the sign-in.'));
  if (back.get('state') !== state) throw new Error('The sign-in came back for another request — try again.');
  const code = back.get('code');
  if (!code) throw new Error('Microsoft sent no sign-in code back — try again.');
  const t = await tokenCall({ client_id: id, grant_type: 'authorization_code', code, redirect_uri: redirectUri(), code_verifier: verifier, scope: scopes }, tenant, o.fileLink);
  const s: MsSession = { access: t.access_token, refresh: t.refresh_token, expiresAt: Date.now() + (t.expires_in ?? 3600) * 1000, ...claimsOf(t.id_token), ...(tenant ? { tenant } : {}), ...(o.mail ? { mail: true } : {}) };
  keep(s, o.fileLink);
  if (!o.fileLink && s.username) { try { localStorage.setItem(LAST, s.username); } catch { /* this visit only */ } }
  return s;
}

/** A token that is still good — renewed with the refresh token a minute before it ends; null when the person must sign in again. */
export async function accessToken(fileLink = false): Promise<string | null> {
  const s = session(fileLink);
  if (!s) return null;
  if (s.expiresAt - Date.now() > 60_000) return s.access;
  if (!s.refresh || !clientId()) { keep(null, fileLink); return null; }
  try {
    const t = await tokenCall({ client_id: clientId(), grant_type: 'refresh_token', refresh_token: s.refresh, scope: fileLink ? FILE_SCOPES : s.mail ? MAIL_SCOPES : SCOPES }, s.tenant, fileLink);
    if (session(fileLink)?.access !== s.access) return null;
    const n: MsSession = { ...s, access: t.access_token, refresh: t.refresh_token ?? s.refresh, expiresAt: Date.now() + (t.expires_in ?? 3600) * 1000, ...(s.mail ? { mail: true } : {}) };
    keep(n, fileLink);
    return n.access;
  } catch { if (session(fileLink)?.access === s.access) keep(null, fileLink); return null; }
}
