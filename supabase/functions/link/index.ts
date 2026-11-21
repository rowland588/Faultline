/* LINK — a file fetched by its link (21 November 2026, docs/CONNECTED-LUNA.md, X1b — Rowland: "I'm not a business, so I can't do the
 * SharePoint thing … I need to get to the point where I can connect to a URL and extract").
 *
 * POST { "url": "https://…" } as a signed-in person. The link — a OneDrive, Google Drive or Sheets, Dropbox or SharePoint "anyone with
 * the link" share, or any https address that gives a file — is fetched HERE, in the cloud, because a browser may not read another
 * site's download; the bytes are passed straight back and read ON THE DEVICE exactly as an upload is. Nothing is stored here, nothing
 * is logged of the link or the file, and nothing is sent to the AI service.
 *
 * WHAT MAY BE FETCHED is ./core.ts (the app's src/lib/fileLink/linkCore.ts, copied by scripts/sync-assist.mjs — so the app's unit tests
 * prove this code) with the address rules of ./address.ts (the ingest core): https only; never a private, loopback or link-local
 * address, at the start or after any redirect, each host's every resolved address checked; at most eight redirects; only a workbook, a
 * PDF, an Office file or rows of text is passed back — never a web page — and no more than 60 MB. So it is no general way out to the web.
 *
 * WHO MAY ASK: a signed-in person (JWT verification on, and the session checked again here). Or THE CHECK (`x-check-key`,
 * push_keys.cron_key — the key no API role can read), so the deployed function can be proved from outside with nobody signed in. */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { fetchByLink, LINK_LIMITS, type LinkHop } from "./core.ts";
import { privateAddress, unfetchable } from "./address.ts";

const url = Deno.env.get("SUPABASE_URL")!;
const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const EXPOSED = "x-link-name, x-link-kind, x-link-service, x-link-host, x-link-etag, x-link-modified, x-link-size";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-check-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Expose-Headers": EXPOSED,
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" } });

/** The core's own check (https, no private host or literal), then every address the host resolves to. */
async function refuse(u: string): Promise<string | undefined> {
  const bad = unfetchable(u);
  if (bad) return bad;
  const host = new URL(u).hostname.replace(/^\[|\]$/g, "");
  if (/^[\d.]+$/.test(host) || host.includes(":")) return undefined;   // a literal, already checked
  const found: string[] = [];
  for (const t of ["A", "AAAA"] as const) { try { found.push(...await Deno.resolveDns(host, t)); } catch { /* none of this kind */ } }
  if (!found.length) return "the host could not be found";
  if (found.some(privateAddress)) return "the host resolves to a private address, which cannot be reached from the cloud";
  return undefined;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ ok: false, why: "POST only." }, 405);

  const checkKey = req.headers.get("x-check-key");
  if (checkKey !== null) {
    const admin = createClient(url, service, { auth: { persistSession: false } });
    const { data: keys } = await admin.from("push_keys").select("cron_key").eq("id", 1).single();
    const real = (keys as { cron_key?: string } | null)?.cron_key ?? "";
    if (real.length < 20 || real === "SET-ME" || checkKey !== real) return json({ ok: false, why: "no" }, 401);
  } else {
    const asThem = createClient(url, anon, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } }, auth: { persistSession: false } });
    const { data: { user } } = await asThem.auth.getUser();
    if (!user) return json({ ok: false, code: "auth", why: "Sign in to Faultline first." }, 401);
  }

  let body: { url?: unknown; trace?: unknown } = {};
  try { body = (await req.json()) ?? {}; } catch { /* no body */ }
  const link = typeof body.url === "string" ? body.url.trim() : "";
  if (!link || link.length > 4000) return json({ ok: false, code: "address", why: "Paste the link to the file." }, 422);

  /* THE CHECK MAY ASK FOR THE WAY IT WENT (trace: true, with the check key only): each answer on the way — its address, status, type,
     where it sent us and the NAMES of the cookies it set — and no file. It is how the rules are proved against the real services, which
     the build environment cannot reach (scripts/eval/link-real.mjs). A signed-in person's request is never traced. */
  const trace = checkKey !== null && body.trace === true;
  const hops: LinkHop[] = [];
  const got = await fetchByLink(link, { fetch: (u, init) => fetch(u, init), refuse, signal: AbortSignal.timeout(LINK_LIMITS.timeoutMs), ...(trace ? { onHop: (h: LinkHop) => { hops.push(h); } } : {}) });
  if (trace) {
    if (got.ok) await got.body.cancel().catch(() => undefined);
    return json(got.ok ? { ok: true, name: got.name, kind: got.kind, host: got.host, hops } : { ok: false, code: got.code, why: got.why, hops });
  }
  if (!got.ok) return json({ ok: false, code: got.code, why: got.why }, 422);
  return new Response(got.body, {
    status: 200,
    headers: {
      ...CORS, "Content-Type": "application/octet-stream", "Cache-Control": "no-store",
      "x-link-name": encodeURIComponent(got.name), "x-link-kind": got.kind, "x-link-service": got.service, "x-link-host": got.host,
      ...(got.etag ? { "x-link-etag": encodeURIComponent(got.etag) } : {}), ...(got.modified ? { "x-link-modified": got.modified } : {}), ...(got.size ? { "x-link-size": String(got.size) } : {}),
    },
  });
});
