/* KEYCHECK — is the assistant working, on the server, with the key as saved?
 *
 * Asked by the database (net.http_post with the scheduler's key from
 * push_keys, as `remind` is); anything else is refused. With no body it says
 * the key's known prefix, its length and the first 12 hex of its SHA-256 —
 * enough to tell two keys apart, never the key — and makes one smallest call.
 * With { requests: [{ name, body, beta? }] } it sends each body to the
 * Messages API with the saved key, one after another, and answers with each
 * one's status, error, stop reason, tokens and time — and the reply's text
 * only when { text: true } is asked. A body's string "{{prev}}" is the reply
 * before it, so a second pass can carry the first, as the gateway's do; with
 * { parallel: true } they are sent all at once, as the gateway sends a
 * design's stages. It writes nothing. */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

async function send(key: string, body: unknown, beta?: string) {
  const t0 = Date.now();
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json", ...(beta ? { "anthropic-beta": beta } : {}) },
    body: JSON.stringify(body),
  });
  const d = await r.json().catch(() => ({})) as { error?: { type?: string; message?: string }; stop_reason?: string; usage?: unknown; model?: string; content?: { type?: string; text?: string }[] };
  return { status: r.status, seconds: Math.round((Date.now() - t0) / 100) / 10, error: d.error ? `${d.error.type}: ${d.error.message}` : null, stop: d.stop_reason ?? null, model: d.model ?? null, usage: d.usage ?? null, text: (d.content ?? []).map(b => (b.type === "text" ? b.text ?? "" : "")).join("") };
}

Deno.serve(async (req: Request) => {
  const { data: keys } = await db.from("push_keys").select("cron_key").eq("id", 1).single();
  if (!keys || req.headers.get("x-check-key") !== keys.cron_key) return new Response("no", { status: 401 });
  const raw = Deno.env.get("ANTHROPIC_API_KEY");
  const key = raw?.trim().replace(/^["'`]+|["'`]+$/g, "").trim() ?? "";
  if (!key) return Response.json({ saved: false });
  let ask: { requests?: { name?: string; body?: unknown; beta?: string }[]; text?: boolean; parallel?: boolean } = {};
  try { ask = await req.json(); } catch { /* the key alone */ }
  if (!ask.requests?.length) {
    const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key)));
    const one = await send(key, { model: Deno.env.get("ASSIST_MODEL") ?? "claude-opus-5-5", max_tokens: 1, messages: [{ role: "user", content: "Hi" }] });
    return Response.json({ saved: true, status: one.status, error: one.error, prefix: key.slice(0, 11), length: key.length, fingerprint: [...digest].map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 12), hadQuotesOrSpaces: raw !== key });
  }
  const t0 = Date.now();
  if (ask.parallel) {
    const all = await Promise.all(ask.requests.slice(0, 12).map(async q => ({ name: q.name ?? "", ...(await send(key, q.body, q.beta)) })));
    return Response.json({ results: all.map(r => ({ ...r, text: ask.text ? r.text : r.text.length })), seconds: Math.round((Date.now() - t0) / 100) / 10 });
  }
  const results = [];
  let prev = "";
  for (const q of ask.requests.slice(0, 12)) {
    const body = JSON.parse(JSON.stringify(q.body ?? {}).split('"{{prev}}"').join(JSON.stringify(prev)));
    const r = await send(key, body, q.beta);
    prev = r.text;
    results.push({ name: q.name ?? "", ...r, text: ask.text ? r.text : r.text.length });
  }
  return Response.json({ results, seconds: Math.round((Date.now() - t0) / 100) / 10 });
});
