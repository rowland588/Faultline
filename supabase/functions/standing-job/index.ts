/* STANDING JOBS — scheduler stub until G6 runs Luna on the server (docs/LUNA-G6-SERVER.md).
 * pg_cron calls this on Mondays; it does not build digests in the cloud — devices run them when Luna opens. */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const url = Deno.env.get("SUPABASE_URL")!;
const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db = createClient(url, service, { auth: { persistSession: false } });

const londonDay = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

Deno.serve(async (req: Request) => {
  let { data: keys } = await db.from("standing_job_keys").select("cron_key").eq("id", 1).single();
  if (!keys) return new Response("standing_job_keys missing — run supabase/STANDING_JOBS.sql", { status: 500 });
  if (keys.cron_key === "SET-ME") {
    const made = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(24))))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    await db.from("standing_job_keys").update({ cron_key: made }).eq("id", 1).eq("cron_key", "SET-ME");
    keys = { cron_key: made };
  } else if (req.headers.get("x-standing-key") !== keys.cron_key) return new Response("no", { status: 401 });

  const { data: jobs, error } = await db.from("standing_jobs").select("id, client, schedule, enabled").is("deleted_at", null).eq("enabled", true);
  if (error) return new Response(error.message, { status: 500 });
  return Response.json({
    today: londonDay(),
    enabled: jobs?.length ?? 0,
    note: "Digest is built on the device when Luna opens until G6 links server-side data.",
  });
});