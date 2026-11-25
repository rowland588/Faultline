/* London schedules, owner push notifications and opt-in email delivery. */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { activatedBeforeDue, due, periodKey, londonDay } from "./clock.ts";
import { archivedMailCustomers } from "./customerArchive.ts";
import { sendBriefing } from "./briefing.ts";
import webpush from "npm:web-push@3.6.7";

const url = Deno.env.get("SUPABASE_URL")!;
const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db = createClient(url, service, { auth: { persistSession: false } });
Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("POST required", { status: 405 });
  const { data: keys } = await db.from("standing_job_keys").select("cron_key").eq("id", 1).single();
  if (!keys?.cron_key || keys.cron_key === "SET-ME" || req.headers.get("x-standing-key") !== keys.cron_key) return new Response("Unauthorized", { status: 401 });

  const now = Date.now();
  const { data: jobs, error } = await db.from("standing_jobs")
    .select("id, owner_id, client, kind, schedule, weekday, hour, minute, name, enabled, last_period_key, last_status, email_accepted_period, scope")
    .is("deleted_at", null).eq("enabled", true);
  if (error) return new Response(error.message, { status: 500 });

  const { data: pushKeys } = await db.from("push_keys").select("public_key, private_key").eq("id", 1).single();
  if (pushKeys?.public_key && pushKeys?.private_key) {
    try { webpush.setVapidDetails("mailto:luna@opexelevate.co.uk", pushKeys.public_key, pushKeys.private_key); } catch { /* keys unset */ }
  }

  const archives = new Map<string, (client: string) => boolean>();
  let marked = 0;
  let pushed = 0;
  for (const j of jobs ?? []) {
    const hour = j.hour == null ? 7 : Number(j.hour);
    const minute = j.minute == null ? 0 : Number(j.minute);
    const weekday = Number(j.weekday) || 1;
    const period = periodKey(j.schedule, now);
    const hasEmail = !!j.scope?.email?.to;
    const alreadyMarked = j.last_period_key === period;
    if (hasEmail ? j.email_accepted_period === period : alreadyMarked) continue;
    const timing = { schedule: j.schedule, weekday, hour, minute, last_period_key: null };
    if (!due(timing, now)) continue;
    if (hasEmail && !activatedBeforeDue(timing, j.scope.email.enabledAt, now)) continue;
    if (!j.owner_id) continue;
    let isArchived = archives.get(j.owner_id);
    if (!isArchived) {
      try { isArchived = await archivedMailCustomers(db, j.owner_id); }
      catch { return new Response("Could not check customer archives.", { status: 503 }); }
      archives.set(j.owner_id, isArchived);
    }
    if (isArchived(j.client)) continue;
    const title = (j.name as string)?.trim() || `Briefing — ${j.client}`;
    let deliveryStatus = "queued";
    if (hasEmail) {
      try {
        await sendBriefing(db, j, period);
        deliveryStatus = "Email accepted";
      } catch (e) {
        deliveryStatus = e instanceof Error ? e.message : "Email acceptance could not be confirmed.";
      }
    }
    const { error: runErr } = await db.from("standing_job_runs").insert({
      id: j.id + ":" + period,
      owner_id: j.owner_id,
      job_id: j.id,
      client: j.client,
      period_key: period,
      at: now,
      title: "Due",
      digest: "",
      sections: [],
      created_at: now,
      updated_at: now,
    });
    if (runErr && !/duplicate|unique/i.test(runErr.message)) continue;
    if (!alreadyMarked || deliveryStatus !== j.last_status || deliveryStatus === "Email accepted") await db.from("standing_jobs").update({
      last_period_key: period, last_run_at: now, last_status: deliveryStatus, updated_at: now,
      ...(deliveryStatus === "Email accepted" ? { email_accepted_period: period } : {}),
    }).eq("id", j.id);
    marked += 1;
    if (alreadyMarked || !j.owner_id || !pushKeys?.public_key) continue;
    const { data: subs } = await db.from("push_subscriptions").select("endpoint, p256dh, auth").eq("user_id", j.owner_id);
    const payload = JSON.stringify({
      title: "Luna · A schedule is ready",
      body: `${title}\nOpen Luna to read it.`,
      url: "/ai",
      tag: `faultline-schedule-${j.id}`,
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
  }

  return Response.json({
    today: londonDay(),
    enabled: jobs?.length ?? 0,
    marked,
    pushed,
  });
});
