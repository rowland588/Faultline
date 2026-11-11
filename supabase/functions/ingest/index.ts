/* INGEST — production data from the business's own systems (docs/DATA-CONNECTIONS.md; supabase/PRODUCTION_DATA.sql).
 *
 * PUSH  POST with `Authorization: Bearer luna_…` (or `x-luna-token`), a body of JSON ({ rows: [...] } or an array) or CSV
 *       (Content-Type text/csv, a header row). The token is hashed (SHA-256) and found by its hash in data_connection_secrets — the
 *       token itself is never stored. Answers { received, stored, refused: [{ row, why }] }.
 * PULL  POST { "mode": "pull" } with `x-ingest-key`, sent every fifteen minutes by pg_cron with the key only the database holds
 *       (ingest_keys, made here on the first call — the pattern of `remind`). Runs every active pull connection that is due:
 *       fetches its address with its key from Vault (data_connection_pull_secret, service role only), maps, upserts.
 *
 * Every row goes through ./core.ts — the app's src/lib/production/ingestCore.ts, copied by scripts/sync-assist.mjs — so the app's
 * own import path and this function cannot disagree. Rows are upserted on their id (connection : the system's id): sent twice, a
 * row replaces itself. Health is written on the connection in words. Keys and tokens are never logged or written into health.
 *
 * Deployed with verify_jwt OFF: the token is the authentication, as a share link's token is the share's. */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { ingestBody, mapRows, rowsOfJson, type IngestConnection, type LineName, type ProductionRecord } from "./core.ts";

const url = Deno.env.get("SUPABASE_URL")!;
const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db = createClient(url, service, { auth: { persistSession: false } });

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-luna-token, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store", ...extra } });

const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
const sha256 = async (s: string) => hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
const b64u = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

type Conn = {
  id: string; owner_id: string; workspace_id: string | null; name: string; kind: string; status: string; deleted_at: number | null;
  mapping: IngestConnection["mapping"]; line_map: Record<string, string> | null; schedule_minutes: number;
  pull_url: string | null; pull_auth_header: string | null; pull_auth_prefix: string | null;
  last_run_at: number | null; last_success_at: number | null; rows_total: number | null;
};
const CONN_COLS = "id, owner_id, workspace_id, name, kind, status, deleted_at, mapping, line_map, schedule_minutes, pull_url, pull_auth_header, pull_auth_prefix, last_run_at, last_success_at, rows_total";

const PUSH_GAP_MS = 10_000;          // one push a connection every ten seconds
const FETCH_TIMEOUT_MS = 20_000;
const MAX_BYTES = 5_000_000;
const lastPush = new Map<string, number>();   // per instance; the database's last_run_at is the lasting check

async function linesOf(owner: string): Promise<LineName[]> {
  const { data } = await db.from("workspaces").select("id, name").eq("owner_id", owner);
  return (data ?? []).map(w => ({ id: String(w.id), name: String(w.name ?? "") }));
}

const toRow = (r: ProductionRecord, owner: string) => ({
  id: r.id, owner_id: owner, workspace_id: r.workspaceId, connection_id: r.connectionId, source_id: r.sourceId, day: r.day,
  shift: r.shift ?? null, product: r.product ?? null, planned_minutes: r.plannedMinutes ?? null, run_minutes: r.runMinutes ?? null,
  output: r.output ?? null, target: r.target ?? null, good: r.good ?? null, rejects: r.rejects ?? null,
  downtime_minutes: r.downtimeMinutes ?? null, downtime_reason: r.downtimeReason ?? null, how_known: "system",
  imported_at: r.importedAt, updated_at: r.updatedAt, deleted_at: null,
});

/** Upsert in chunks on the id — the same row twice replaces itself. */
async function store(conn: Conn, records: ProductionRecord[]): Promise<string | undefined> {
  for (let i = 0; i < records.length; i += 500) {
    const { error } = await db.from("production_records").upsert(records.slice(i, i + 500).map(r => toRow(r, conn.owner_id)), { onConflict: "id" });
    if (error) return `the records could not be stored (${error.code ?? "error"})`;
  }
  return undefined;
}

async function health(conn: Conn, now: number, h: { ok: boolean; rows?: number; refused?: number; error?: string }) {
  const t = Date.now();
  await db.from("data_connections").update({
    last_run_at: now,
    ...(h.ok ? { last_success_at: now, last_error: null, last_rows: h.rows ?? 0, last_refused: h.refused ?? 0, rows_total: (conn.rows_total ?? 0) + (h.rows ?? 0) } : { last_error: h.error ?? "failed" }),
    updated_at: t,
  }).eq("id", conn.id);
}

/* ------------------------------------------------------------------ push */
async function push(req: Request): Promise<Response> {
  const auth = req.headers.get("authorization") ?? "";
  const token = (req.headers.get("x-luna-token") ?? (auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : "")).trim();
  if (!/^luna_[A-Za-z0-9_-]{20,}$/.test(token)) return json({ error: "A Luna connection token is needed: Authorization: Bearer luna_…" }, 401);
  const { data: sec } = await db.from("data_connection_secrets").select("connection_id").eq("token_hash", await sha256(token)).maybeSingle();
  if (!sec) return json({ error: "That token is not a connection’s — it may have been replaced." }, 401);
  const { data: conn } = await db.from("data_connections").select(CONN_COLS).eq("id", sec.connection_id).maybeSingle<Conn>();
  if (!conn || conn.deleted_at) return json({ error: "That connection has been taken off." }, 410);
  if (conn.status !== "active") return json({ error: "That connection is paused — resume it on Set up › Data connections." }, 409);
  const now = Date.now();
  const last = Math.max(lastPush.get(conn.id) ?? 0, conn.last_run_at ?? 0);
  if (now - last < PUSH_GAP_MS) return json({ error: "One push every ten seconds a connection." }, 429, { "Retry-After": String(Math.ceil((PUSH_GAP_MS - (now - last)) / 1000)) });
  lastPush.set(conn.id, now);
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > MAX_BYTES) return json({ error: "More than 5 MB in one call — send it in parts." }, 413);
  const body = await req.text();
  const out = ingestBody(body, req.headers.get("content-type") ?? "", { id: conn.id, workspaceId: conn.workspace_id ?? undefined, lineMap: conn.line_map ?? {}, mapping: conn.mapping ?? {} }, now, await linesOf(conn.owner_id));
  if ("why" in out) { await health(conn, now, { ok: false, error: `A push was refused: ${out.why}` }); return json({ error: out.why }, out.status); }
  const failed = await store(conn, out.records);
  if (failed) { await health(conn, now, { ok: false, error: failed }); return json({ error: failed }, 500); }
  await health(conn, now, { ok: true, rows: out.records.length, refused: out.refused.length });
  return json({ received: out.received, stored: out.records.length, refused: out.refused });
}

/* ------------------------------------------------------------------ pull */
/** Only an https address on the public internet is fetched. */
function fetchable(u: string): string | undefined {
  let p: URL;
  try { p = new URL(u); } catch { return "the address is not a web address"; }
  if (p.protocol !== "https:") return "only https addresses are fetched";
  const h = p.hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal") || /^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h) || h === "[::1]") return "a private address cannot be reached from the cloud";
  return undefined;
}

async function pullOne(conn: Conn, now: number): Promise<{ id: string; stored?: number; refused?: number; error?: string }> {
  const bad = conn.pull_url ? fetchable(conn.pull_url) : "no address is set";
  if (bad) { await health(conn, now, { ok: false, error: `Not fetched: ${bad}.` }); return { id: conn.id, error: bad }; }
  const since = conn.last_success_at ? new Date(conn.last_success_at).toISOString().slice(0, 10) : "2000-01-01";
  const address = conn.pull_url!.replace(/\{since\}/g, encodeURIComponent(since));
  const headers: Record<string, string> = { Accept: "application/json" };
  if (conn.pull_auth_header) {
    const { data: key } = await db.rpc("data_connection_pull_secret", { p_connection: conn.id });
    if (!key) { await health(conn, now, { ok: false, error: "Not fetched: no key has been saved for it." }); return { id: conn.id, error: "no key" }; }
    headers[conn.pull_auth_header] = conn.pull_auth_prefix ? `${conn.pull_auth_prefix} ${key}` : String(key);
  }
  let res: Response;
  try { res = await fetch(address, { headers, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS), redirect: "error" }); }
  catch (e) { const w = e instanceof Error && e.name === "TimeoutError" ? "the API did not answer within 20 seconds" : "the API could not be reached"; await health(conn, now, { ok: false, error: `Not fetched: ${w}.` }); return { id: conn.id, error: w }; }
  if (!res.ok) {
    const w = res.status === 401 || res.status === 403 ? `the API answered ${res.status}: the key was refused` : res.status === 404 ? "the API answered 404: no such address" : `the API answered ${res.status}`;
    await health(conn, now, { ok: false, error: `Not fetched: ${w}.` });
    return { id: conn.id, error: w };
  }
  const text = await res.text();
  if (text.length > MAX_BYTES) { await health(conn, now, { ok: false, error: "Not read: the answer is more than 5 MB." }); return { id: conn.id, error: "too large" }; }
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { await health(conn, now, { ok: false, error: "Not read: the answer was not JSON." }); return { id: conn.id, error: "not json" }; }
  const rows = rowsOfJson(parsed, conn.mapping ?? {});
  if ("why" in rows) { await health(conn, now, { ok: false, error: `Not read: ${rows.why}` }); return { id: conn.id, error: rows.why }; }
  const out = mapRows(rows.rows.slice(0, 5000), { id: conn.id, workspaceId: conn.workspace_id ?? undefined, lineMap: conn.line_map ?? {}, mapping: conn.mapping ?? {} }, now, await linesOf(conn.owner_id));
  const failed = await store(conn, out.records);
  if (failed) { await health(conn, now, { ok: false, error: failed }); return { id: conn.id, error: failed }; }
  await health(conn, now, { ok: true, rows: out.records.length, refused: out.refused.length });
  return { id: conn.id, stored: out.records.length, refused: out.refused.length };
}

async function pull(req: Request): Promise<Response> {
  let { data: keys } = await db.from("ingest_keys").select("cron_key").eq("id", 1).maybeSingle();
  if (!keys) return json({ error: "ingest_keys row missing — run supabase/PRODUCTION_DATA.sql" }, 500);
  const said = req.headers.get("x-ingest-key") ?? "";
  if (keys.cron_key === "SET-ME") {
    const made = b64u(crypto.getRandomValues(new Uint8Array(24)));
    const { error } = await db.from("ingest_keys").update({ cron_key: made }).eq("id", 1).eq("cron_key", "SET-ME");
    if (error) return json({ error: error.message }, 500);
    if (said !== "SET-ME") return json({ error: "no" }, 401);
    keys = { cron_key: made };
  } else if (said !== keys.cron_key) return json({ error: "no" }, 401);
  const now = Date.now();
  const { data: conns, error } = await db.from("data_connections").select(CONN_COLS).eq("kind", "pull").eq("status", "active").is("deleted_at", null);
  if (error) return json({ error: error.message }, 500);
  const due = (conns as Conn[] ?? []).filter(c => !c.last_run_at || c.last_run_at + Math.max(15, c.schedule_minutes) * 60_000 <= now + 60_000);
  const ran = [];
  for (const c of due) ran.push(await pullOne(c, now));
  return json({ due: due.length, ran });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  if (req.headers.has("x-ingest-key")) {
    try { const b = await req.clone().json(); if (b?.mode === "pull") return await pull(req); } catch { /* not the scheduler's body */ }
    return json({ error: "The scheduler sends { \"mode\": \"pull\" }." }, 400);
  }
  return await push(req);
});
