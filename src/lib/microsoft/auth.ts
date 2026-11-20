/* SIGNING IN TO MICROSOFT 365 — for files from SharePoint and OneDrive (20 November, docs/CONNECTED-LUNA.md X1 — Rowland: "the most
 * important aspect for Luna right now is upload Excel and that entire system and connect to pull Excel files").
 *
 * The OAuth 2.0 authorization-code flow with PKCE (RFC 7636), as Microsoft's identity platform asks of a single-page application: no
 * client secret; a sign-in window opened on Microsoft's own page; the code it returns to Faultline's /ms-auth.html exchanged for a
 * token by the browser. The token reads only what the person signed in can already open (delegated, read-only scopes) and is kept on
 * THIS device only — never synced, never sent to Faultline's own service or to the AI. Signing out forgets it.
 *
 * Faultline must be registered with Microsoft once (the Application (client) ID): from the build (VITE_MS_CLIENT_ID) or, until it is
 * set there, typed on this device in Connect to Microsoft. */

const STORE = 'faultline.ms.session';
const CLIENT_KEY = 'faultline.ms.clientId';
/** Work and school accounts — the businesses' own Microsoft 365. */
export const AUTHORITY = 'https://login.microsoftonline.com/organizations/oauth2/v2.0';
/** Read-only: who is signed in, the files they can open, the SharePoint sites they can see. offline_access keeps the sign-in for a day. */
export const SCOPES = 'openid profile offline_access User.Read Files.Read.All Sites.Read.All';

export interface MsSession { access: string; refresh?: string; expiresAt: number; name?: string; username?: string }

/** The page Microsoft sends the sign-in back to — registered with the app as a single-page application. */
export function redirectUri(): string { return `${location.origin}/ms-auth.html`; }

/** The Application (client) ID: the build's, else the one typed on this device. */
export function clientId(): string {
  const built = (import.meta.env.VITE_MS_CLIENT_ID as string | undefined)?.trim();
  if (built) return built;
  try { return localStorage.getItem(CLIENT_KEY)?.trim() ?? ''; } catch { return ''; }
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
/** S256: BASE64URL(SHA-256(ASCII(verifier))). */
export async function challengeOf(verifier: string): Promise<string> {
  return base64url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))));
}

/* ------------------------------------------------------------------ the session on this device */
export function session(): MsSession | null {
  try { const s = JSON.parse(localStorage.getItem(STORE) ?? 'null') as MsSession | null; return s?.access ? s : null; } catch { return null; }
}
function keep(s: MsSession | null): void { try { if (s) localStorage.setItem(STORE, JSON.stringify(s)); else localStorage.removeItem(STORE); } catch { /* this visit only */ } }
export function signOut(): void { keep(null); }

/** The name and address in the id token — what the sheet says ("Signed in as …"); never checked as proof of anything. */
export function claimsOf(idToken?: string): { name?: string; username?: string } {
  try {
    const part = idToken?.split('.')[1]; if (!part) return {};
    const j = JSON.parse(decodeURIComponent(escape(atob(part.replace(/-/g, '+').replace(/_/g, '/'))))) as { name?: string; preferred_username?: string };
    return { name: j.name, username: j.preferred_username };
  } catch { return {}; }
}

interface TokenReply { access_token?: string; refresh_token?: string; expires_in?: number; id_token?: string; error?: string; error_description?: string }
async function tokenCall(body: Record<string, string>): Promise<TokenReply> {
  const r = await fetch(`${AUTHORITY}/token`, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(body).toString() });
  const j = (await r.json().catch(() => ({}))) as TokenReply;
  if (!r.ok || !j.access_token) throw new Error(said(j.error_description ?? j.error ?? `Microsoft refused the sign-in (${r.status}).`));
  return j;
}
/** Microsoft's own words, short: the first sentence, its trace ids left off. */
export function said(why: string): string { return why.split(/\r?\n|Trace ID|Correlation ID/)[0].trim().replace(/^AADSTS\d+:\s*/, ''); }

/** Sign in, in a window of Microsoft's own; resolves with the session kept on this device. */
export async function signIn(): Promise<MsSession> {
  const id = clientId();
  if (!id) throw new Error('Faultline is not registered with Microsoft yet — see the steps in Connect to Microsoft.');
  const verifier = randomVerifier();
  const state = randomVerifier();
  const url = `${AUTHORITY}/authorize?${new URLSearchParams({
    client_id: id, response_type: 'code', redirect_uri: redirectUri(), response_mode: 'query', scope: SCOPES,
    code_challenge: await challengeOf(verifier), code_challenge_method: 'S256', state, prompt: 'select_account',
  }).toString()}`;
  const win = window.open(url, 'faultline-microsoft', 'width=520,height=680');
  if (!win) throw new Error('The browser stopped the sign-in window — allow pop-ups for Faultline, then try again.');
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
  if (back.get('error')) throw new Error(said(back.get('error_description') ?? back.get('error') ?? 'Microsoft refused the sign-in.'));
  if (back.get('state') !== state) throw new Error('The sign-in came back for another request — try again.');
  const code = back.get('code');
  if (!code) throw new Error('Microsoft sent no sign-in code back — try again.');
  const t = await tokenCall({ client_id: id, grant_type: 'authorization_code', code, redirect_uri: redirectUri(), code_verifier: verifier, scope: SCOPES });
  const s: MsSession = { access: t.access_token!, refresh: t.refresh_token, expiresAt: Date.now() + (t.expires_in ?? 3600) * 1000, ...claimsOf(t.id_token) };
  keep(s);
  return s;
}

/** A token that is still good — renewed with the refresh token a minute before it ends; null when the person must sign in again. */
export async function accessToken(): Promise<string | null> {
  const s = session();
  if (!s) return null;
  if (s.expiresAt - Date.now() > 60_000) return s.access;
  if (!s.refresh || !clientId()) { keep(null); return null; }
  try {
    const t = await tokenCall({ client_id: clientId(), grant_type: 'refresh_token', refresh_token: s.refresh, scope: SCOPES });
    const n: MsSession = { ...s, access: t.access_token!, refresh: t.refresh_token ?? s.refresh, expiresAt: Date.now() + (t.expires_in ?? 3600) * 1000 };
    keep(n);
    return n.access;
  } catch { keep(null); return null; }
}
