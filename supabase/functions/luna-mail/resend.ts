export interface Mail {
  to: string;
  subject: string;
  body: string;
  attachments?: { name: string; contentType: string; bytes: string }[];
}

export function validMail(value: unknown): value is Mail {
  if (!value || typeof value !== "object") return false;
  const m = value as Mail;
  if (typeof m.to !== "string" || m.to.length > 200 || !/^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/u.test(m.to)) return false;
  if (typeof m.subject !== "string" || /[\r\n]/.test(m.subject) || !m.subject.trim() || m.subject.length > 200) return false;
  if (typeof m.body !== "string" || !m.body.trim() || m.body.length > 100000) return false;
  if (m.attachments === undefined) return true;
  return Array.isArray(m.attachments) && m.attachments.length <= 1 && m.attachments.every(a =>
    a && typeof a.name === "string" && /^[\p{L}\p{N}._-]{1,100}\.svg$/u.test(a.name) &&
    a.contentType === "image/svg+xml" && typeof a.bytes === "string" && a.bytes.length <= 2000000 &&
    /^[A-Za-z0-9+/]+={0,2}$/.test(a.bytes));
}

export function resendPayload(from: string, mail: Mail) {
  return { from, to: [mail.to], subject: mail.subject, text: mail.body,
    ...(mail.attachments?.length ? { attachments: mail.attachments.map(a => ({ filename: a.name, content: a.bytes, content_type: a.contentType })) } : {}) };
}

type Payload = ReturnType<typeof resendPayload>;
export interface Reservation { payload: Payload | null; created_at: string; provider_id: string | null }
export interface DeliveryStore {
  reserve(key: string, owner: string, payload: Payload): Promise<Reservation>;
  accept(key: string, id: string): Promise<void>;
}
export async function deliver(store: DeliveryStore, owner: string, key: string, mail: Mail, config: { apiKey?: string; from: string }, post = fetch) {
  if (!validMail(mail)) throw new Error("Check the email address, subject, message and attachment.");
  if (!config.apiKey) throw new Error("Luna email needs a Resend sending key in Supabase.");
  const original = await store.reserve(key, owner, resendPayload(config.from, mail));
  if (original.provider_id) return original.provider_id;
  if (!original.payload || Date.now() - Date.parse(original.created_at) >= 23 * 3600000) throw new Error("Check this email in Resend before sending again. Its retry window has closed.");
  if (original.payload.to[0] !== mail.to) throw new Error("This confirmation belongs to a different recipient.");
  const response = await post("https://api.resend.com/emails", {
    method: "POST", headers: { Authorization: "Bearer " + config.apiKey, "Content-Type": "application/json", "Idempotency-Key": key },
    body: JSON.stringify(original.payload), signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error("Resend did not accept the email (HTTP " + response.status + "). Check the sending domain, key and recipient.");
  const { id } = await response.json();
  if (typeof id !== "string" || !id) throw new Error("Resend acceptance could not be confirmed.");
  await store.accept(key, id);
  return id;
}
