/* KEEPUP — Luna's linked files while the app is shut (23 November 2026, docs/LUNA-G6-SERVER.md).
 *
 * Called hourly by pg_cron (supabase/LUNA_G6_KEEPUP.sql). For each due link (same cadence as colleague/keepUp on the device), fetches
 * the file through fetchByLink (link/core.ts), compares SHA-256 to the hash on the newest source record, and when it differs inserts
 * luna_server_news and pushes to the owner's devices. No AI, no Microsoft (no token in cloud), archived customers skipped. */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";
import { fetchByLink, LINK_LIMITS } from "../link/core.ts";
import { privateAddress, unfetchable } from "../link/address.ts";

const url = Deno.env.get("SUPABASE_URL")!;
const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db = createClient(url, service, { auth: { persistSession: false } });

const EVERY_MS = 4 * 60 * 60_000;
const MOST = 4;
const MAX_BYTES = 15 * 1024 * 1024;

const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");

async function refuse(u: string): Promise<string | undefined> {
  const bad = unfetchable(u);
  if (bad) return bad;
  const host = new URL(u).hostname.replace(/^\[|\]$/g, "");
  if (/^[\d.]+$/.test(host) || host.includes(":")) return undefined;
  const found: string[] = [];
  for (const t of ["A", "AAAA"] as const) {
    try {
      found.push(...(await Deno.resolveDns(host, t)));
    } catch {
      /* none */
    }
  }
  if (!found.length) return "the host could not be found";
  if (found.some(privateAddress)) return "the host resolves to a private address, which cannot be reached from the cloud";
  return undefined;
}

type SourceRow = {
  id: string;
  owner_id: string;
  facts: {
    source?: {
      name?: string;
      client?: string;
      bytes?: number;
      at?: number;
      origin?: { kind: string; url?: string; hash?: string; privateMicrosoft?: boolean };
    };
  };
  created_at: string;
};

type StoryRow = { agreed?: { story?: { client?: string; archivedAt?: number } } };

const fileKey = (client: string, linkUrl: string) => `link:${linkUrl}|${client.trim().toLowerCase()}`;

function archivedClients(stories: StoryRow[]): Set<string> {
  const by = new Map<string, number[]>();
  for (const s of stories) {
    const st = s.agreed?.story;
    const c = (st?.client ?? "").trim();
    if (!c) continue;
    const k = c.toLowerCase();
    const list = by.get(k) ?? [];
    list.push(typeof st?.archivedAt === "number" ? st.archivedAt : 0);
    by.set(k, list);
  }
  const out = new Set<string>();
  for (const [k, stamps] of by) if (stamps.length && stamps.every((t) => t > 0)) out.add(k);
  return out;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("POST only", { status: 405 });

  const { data: keys } = await db.from("push_keys").select("public_key, private_key, cron_key").eq("id", 1).single();
  if (!keys || keys.cron_key === "SET-ME") return new Response("push_keys not ready — run PUSH_REMINDERS.sql", { status: 500 });
  if (req.headers.get("x-keepup-key") !== keys.cron_key) return new Response("no", { status: 401 });

  webpush.setVapidDetails("mailto:rowlandglew35@gmail.com", keys.public_key, keys.private_key);

  const now = Date.now();
  const { data: studies } = await db.from("studies").select("id, owner_id, facts, created_at").eq("tool", "source").is("deleted_at", null);
  const { data: stories } = await db.from("studies").select("agreed").eq("tool", "story").is("deleted_at", null);
  const archived = archivedClients((stories ?? []) as StoryRow[]);

  const { data: checks } = await db.from("luna_link_checks").select("file_key, checked_at");
  const checkedAt: Record<string, number> = {};
  for (const c of checks ?? []) checkedAt[c.file_key as string] = Date.parse(c.checked_at as string);

  const byFile = new Map<string, { sourceId: string; ownerId: string; client: string; name: string; url: string; hash: string; bytes: number; readAt: number }>();
  for (const row of (studies ?? []) as SourceRow[]) {
    const f = row.facts?.source;
    const o = f?.origin;
    if (!o || o.kind !== "link" || o.privateMicrosoft || !o.url || !o.hash) continue;
    const client = (f.client ?? "").trim();
    if (client && archived.has(client.toLowerCase())) continue;
    const k = fileKey(client, o.url);
    const readAt = f.at ?? Date.parse(row.created_at);
    const had = byFile.get(k);
    if (had && had.readAt >= readAt) continue;
    byFile.set(k, {
      sourceId: row.id,
      ownerId: row.owner_id,
      client,
      name: f.name ?? "File",
      url: o.url,
      hash: o.hash,
      bytes: f.bytes ?? 0,
      readAt,
    });
  }

  const due = [...byFile.entries()]
    .map(([fileKey, v]) => ({ fileKey, ...v }))
    .filter((r) => r.bytes <= MAX_BYTES)
    .filter((r) => now - (checkedAt[r.fileKey] ?? 0) >= EVERY_MS)
    .sort((a, b) => (checkedAt[a.fileKey] ?? 0) - (checkedAt[b.fileKey] ?? 0))
    .slice(0, MOST);

  let checked = 0;
  let changed = 0;
  let pushed = 0;

  for (const row of due) {
    const got = await fetchByLink(row.url, {
      fetch: (u, init) => fetch(u, init),
      refuse,
      signal: AbortSignal.timeout(LINK_LIMITS.timeoutMs),
    });
    const at = new Date().toISOString();
    if (!got.ok) {
      await db.from("luna_link_checks").upsert({ file_key: row.fileKey, checked_at: at, last_hash: row.hash });
      checked += 1;
      continue; // fetch failed — noted, tried again after EVERY_MS
    }
    const buf = new Uint8Array(await got.body.arrayBuffer());
    if (buf.byteLength > MAX_BYTES) {
      await db.from("luna_link_checks").upsert({ file_key: row.fileKey, checked_at: at, last_hash: row.hash });
      checked += 1;
      await got.body.cancel().catch(() => undefined);
      continue;
    }
    const found = hex(await crypto.subtle.digest("SHA-256", buf));
    await db.from("luna_link_checks").upsert({ file_key: row.fileKey, checked_at: at, last_hash: found });
    checked += 1;
    if (found === row.hash) continue;

    const { data: newsRow, error: newsErr } = await db.from("luna_server_news").insert({
      owner_id: row.ownerId,
      source_id: row.sourceId,
      file_key: row.fileKey,
      client: row.client,
      file_name: row.name,
      old_hash: row.hash,
      new_hash: found,
    }).select("id").single();
    if (newsErr || !newsRow) continue;
    changed += 1;

    const { data: subs } = await db.from("push_subscriptions").select("endpoint, p256dh, auth").eq("user_id", row.ownerId);
    const payload = JSON.stringify({
      title: "Luna · A file has changed",
      body: `${row.name}\nOpen Luna to read the new version.`,
      url: "/ai",
      tag: `faultline-keepup-${row.fileKey}`,
    });
    for (const s of subs ?? []) {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 86400 });
        pushed += 1;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) await db.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
      }
    }
    if (pushed > 0) await db.from("luna_server_news").update({ pushed_at: new Date().toISOString() }).eq("id", newsRow.id);
  }

  return Response.json({ checked, due: due.length, changed, pushed });
});