/* COLLEAGUE-JOB — parked Luna jobs while the app is shut (24 November 2026, docs/LUNA-G6-SERVER.md G6 job slice).
 *
 * Called every fifteen minutes by pg_cron (supabase/LUNA_G6_JOBS.sql), and immediately when the device hands a job over
 * (owner JWT + jobId). Picks queued/running rows within the overnight deadline and max_legs, runs one go of gateway
 * rounds each (plan_job / job_step on the server). Reads that need the device wait; writes never auto-approve. */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk@0.131.0";
import webpush from "npm:web-push@3.6.7";
import { runServerJobLeg } from "../assist/colleague/serverJobLeg.ts";

const url = Deno.env.get("SUPABASE_URL")!;
const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
const db = createClient(url, service, { auth: { persistSession: false } });
const KEY = Deno.env.get("ANTHROPIC_API_KEY");
const MOST = 2;

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-keepup-key" };

async function who(req: Request): Promise<{ cron: true } | { userId: string } | Response> {
  const { data: keys } = await db.from("push_keys").select("public_key, private_key, cron_key").eq("id", 1).single();
  if (!keys || keys.cron_key === "SET-ME") return new Response("push_keys not ready", { status: 500 });
  webpush.setVapidDetails("mailto:rowland@opexelevate.co.uk", keys.public_key, keys.private_key);
  if (req.headers.get("x-keepup-key") === keys.cron_key) return { cron: true };
  const auth = req.headers.get("Authorization") ?? "";
  if (!auth) return new Response("no", { status: 401 });
  const asThem = createClient(url, anon, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const { data: { user } } = await asThem.auth.getUser();
  if (!user) return new Response("no", { status: 401 });
  return { userId: user.id };
}

async function pushDone(id: string): Promise<void> {
  const { data: job } = await db.from("luna_server_jobs").select("owner_id, snapshot, status").eq("id", id).single();
  if (!job || job.status !== "done") return;
  const reply = (job.snapshot as { reply?: string }).reply?.slice(0, 120) ?? "Open Luna to read what she finished.";
  const { data: subs } = await db.from("push_subscriptions").select("endpoint, p256dh, auth").eq("user_id", job.owner_id);
  const payload = JSON.stringify({ title: "Luna · Your job", body: reply, url: "/ai", tag: `faultline-job-${id}` });
  let pushed = 0;
  for (const s of subs ?? []) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 86400 });
      pushed += 1;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await db.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
    }
  }
  if (pushed > 0) await db.from("luna_server_jobs").update({ pushed_at: new Date().toISOString() }).eq("id", id);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return new Response("POST only", { status: 405 });

  const gate = await who(req);
  if (gate instanceof Response) return gate;
  if (!KEY) return new Response(JSON.stringify({ ok: false, why: "No assistant key." }), { status: 503, headers: { "Content-Type": "application/json", ...CORS } });

  let body: { jobId?: string } = {};
  try { body = await req.json(); } catch { /* empty */ }

  const client = new Anthropic({ apiKey: KEY });

  if (body.jobId) {
    if ("userId" in gate) {
      const { data: owned } = await db.from("luna_server_jobs").select("owner_id").eq("id", body.jobId).maybeSingle();
      if (!owned || owned.owner_id !== gate.userId) return new Response("no", { status: 403 });
    }
    const res = await runServerJobLeg(client, db, body.jobId);
    const j = await res.clone().json().catch(() => ({}));
    if (j.status === "done") await pushDone(body.jobId);
    return res;
  }

  if (!("cron" in gate)) return new Response("no", { status: 401 });

  const { data: rows, error } = await db.from("luna_server_jobs")
    .select("id, owner_id, status, snapshot, legs, max_legs, deadline_at")
    .in("status", ["queued", "running"])
    .gt("deadline_at", new Date().toISOString())
    .order("created_at", { ascending: true })
    .limit(MOST);
  if (error) return new Response(error.message, { status: 500 });

  let ran = 0;
  const done: string[] = [];
  for (const row of rows ?? []) {
    if (row.legs >= row.max_legs) continue;
    const res = await runServerJobLeg(client, db, row.id);
    ran += 1;
    const j = await res.json().catch(() => ({}));
    if (j.status === "done" || j.status === "failed") done.push(row.id);
  }

  for (const id of done) await pushDone(id);

  return Response.json({ picked: rows?.length ?? 0, ran, done: done.length, now: Date.now() });
}, { headers: CORS });
