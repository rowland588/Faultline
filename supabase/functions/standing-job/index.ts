/* LUNA SCHEDULES — hourly tick (24 November 2026, docs/LUNA-SCHEDULES.md, G7/G6).
 *
 * Marks due standing_jobs for the period, writes an empty run the device fills, and pushes the owner.
 * Digest / Outlook send stay on the device (records in IndexedDB; Graph token on the device). No AI. */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const url = Deno.env.get("SUPABASE_URL")!;
const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db = createClient(url, service, { auth: { persistSession: false } });
const LONDON = "Europe/London";
const WD: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

const londonDay = (t = Date.now()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: LONDON, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(t));

function londonParts(t = Date.now()) {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: LONDON, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", weekday: "short", hourCycle: "h23",
  });
  const p = Object.fromEntries(fmt.formatToParts(new Date(t)).filter((x) => x.type !== "literal").map((x) => [x.type, x.value]));
  return { h: Number(p.hour), min: Number(p.minute), wd: WD[p.weekday] ?? 1 };
}

function periodKey(schedule: string, t = Date.now()): string {
  if (schedule === "daily" || schedule === "weekdays") return londonDay(t);
  const d = new Date(new Date(t).toLocaleString("en-US", { timeZone: LONDON }));
  d.setHours(12, 0, 0, 0);
  const th = new Date(d);
  th.setDate(d.getDate() - ((d.getDay() + 6) % 7) + 3);
  const y = th.getFullYear();
  const jan4 = new Date(y, 0, 4);
  const w = 1 + Math.round(((th.getTime() - jan4.getTime()) / 86_400_000 - ((jan4.getDay() + 6) % 7) + 3) / 7);
  return `${y}-W${String(w).padStart(2, "0")}`;
}

function due(job: { schedule: string; weekday: number; hour: number; minute: number; last_period_key: string | null }, t = Date.now()): boolean {
  const cur = periodKey(job.schedule, t);
  if (job.last_period_key === cur) return false;
  const p = londonParts(t);
  if (job.schedule === "weekly" && p.wd !== job.weekday) return false;
  if (job.schedule === "weekdays" && p.wd > 5) return false;
  if (p.h < job.hour || (p.h === job.hour && p.min < job.minute)) return false;
  return true;
}

Deno.serve(async (req: Request) => {
  let { data: keys } = await db.from("standing_job_keys").select("cron_key").eq("id", 1).single();
  if (!keys) return new Response("standing_job_keys missing — run supabase/STANDING_JOBS.sql", { status: 500 });
  if (keys.cron_key === "SET-ME") {
    const made = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(24))))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    await db.from("standing_job_keys").update({ cron_key: made }).eq("id", 1).eq("cron_key", "SET-ME");
    keys = { cron_key: made };
  } else if (req.headers.get("x-standing-key") !== keys.cron_key) return new Response("no", { status: 401 });

  const now = Date.now();
  const { data: jobs, error } = await db.from("standing_jobs")
    .select("id, owner_id, client, kind, schedule, weekday, hour, minute, name, enabled, last_period_key")
    .is("deleted_at", null).eq("enabled", true);
  if (error) return new Response(error.message, { status: 500 });

  const { data: pushKeys } = await db.from("push_keys").select("public_key, private_key").eq("id", 1).single();
  if (pushKeys?.public_key && pushKeys?.private_key) {
    try { webpush.setVapidDetails("mailto:luna@opexelevate.co.uk", pushKeys.public_key, pushKeys.private_key); } catch { /* keys unset */ }
  }

  let marked = 0;
  let pushed = 0;
  for (const j of jobs ?? []) {
    const hour = j.hour == null ? 7 : Number(j.hour);
    const minute = j.minute == null ? 0 : Number(j.minute);
    const weekday = Number(j.weekday) || 1;
    if (!due({ schedule: j.schedule, weekday, hour, minute, last_period_key: j.last_period_key }, now)) continue;
    const period = periodKey(j.schedule, now);
    const title = (j.name as string)?.trim() || `Briefing — ${j.client}`;
    const { error: runErr } = await db.from("standing_job_runs").insert({
      id: crypto.randomUUID(),
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
    await db.from("standing_jobs").update({
      last_period_key: period, last_run_at: now, last_status: "queued", updated_at: now,
    }).eq("id", j.id);
    marked += 1;
    if (!j.owner_id || !pushKeys?.public_key) continue;
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
    note: "Due jobs are marked and pushed; the briefing is built on the device. Sending uses Outlook on the device.",
  });
});
