/* SEND A CONFIRMED EMAIL THROUGH MICROSOFT GRAPH (24 November 2026, docs/LUNA-MAIL.md).
 *
 * POST /me/sendMail as the signed-in person (delegated Mail.Send). The token is the same device session as SharePoint and OneDrive
 * (lib/microsoft/auth), with Mail.Send on it after Connect Outlook. Nothing is read from the inbox. The body and attachments are
 * already assembled by the app (lib/mail/draft) — this only posts them. */
import { GRAPH, SignInNeeded } from './graph';
import { accessToken, mailConnected } from './auth';

export const CONNECT_OUTLOOK = '/factory/data?ms=1&mail=1';
export const CONNECT_SAYS = 'Outlook is not connected — Connect Outlook on Data connections so Luna can send from your Microsoft 365 mailbox. Nothing was sent.';

export interface GraphMail {
  to: string;
  toName?: string;
  subject: string;
  body: string;
  attachments?: { name: string; contentType: string; bytes: string }[];
}

export function outlookReady(): boolean {
  return mailConnected();
}

/** Send as the signed-in person. Refused in words when this device has no Mail.Send token — never a silent send. */
export async function sendMail(m: GraphMail): Promise<{ ok: true } | { ok: false; why: string; connect?: true }> {
  let token: string | null;
  try { token = await accessToken(); } catch { token = null; }
  if (!token || !mailConnected()) return { ok: false, why: CONNECT_SAYS, connect: true };
  const message: Record<string, unknown> = {
    subject: m.subject,
    body: { contentType: 'Text', content: m.body },
    toRecipients: [{ emailAddress: { address: m.to, ...(m.toName ? { name: m.toName } : {}) } }],
  };
  if (m.attachments?.length) {
    message.attachments = m.attachments.map(a => ({
      '@odata.type': '#microsoft.graph.fileAttachment',
      name: a.name, contentType: a.contentType, contentBytes: a.bytes,
    }));
  }
  let r: Response;
  try {
    r = await fetch(`${GRAPH}/me/sendMail`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ message, saveToSentItems: true }),
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    return { ok: false, why: 'The connection to Microsoft was interrupted. Check Sent Items before trying again, so the email is not sent twice.' };
  }
  if (r.status === 401) return { ok: false, why: new SignInNeeded().message, connect: true };
  if (r.status === 403) return { ok: false, why: CONNECT_SAYS, connect: true };
  if (r.status === 202 || r.status === 200) return { ok: true };
  if (r.status >= 500) return { ok: false, why: `Microsoft returned an error (${r.status}). Check Sent Items before trying again, so the email is not sent twice.` };
  return { ok: false, why: `Microsoft refused the email (${r.status}). Check the recipient and try again.` };
}
