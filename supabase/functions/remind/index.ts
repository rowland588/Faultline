/* REMIND — the server half of a note's reminder (lib/reminders.ts is the rule).
 *
 * Called every fifteen minutes by pg_cron (supabase/PUSH_REMINDERS.sql). For
 * every open note with a reminder due today or gone, not yet pushed today, it
 * pushes to every device of everyone on the note's project — the owner and
 * the project's members — and writes the day on the note so it says it once.
 * A device the push service no longer knows is forgotten.
 *
 * KEYS. The first call while push_keys still reads SET-ME makes the VAPID
 * pair and the scheduler's key here, with WebCrypto, and stores them with
 * the service role. No key ever passes through a person or the repo. */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const url = Deno.env.get("SUPABASE_URL")!;
const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db = createClient(url, service, { auth: { persistSession: false } });

const b64u = (bytes: ArrayBuffer | Uint8Array): string =>
  btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
async function makeKeys(): Promise<{ public_key: string; private_key: string; cron_key: string }> {
  const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const pub = await crypto.subtle.exportKey("raw", pair.publicKey);          // 65 bytes, the form web-push wants
  const jwk = await crypto.subtle.exportKey("jwk", pair.privateKey);         // d is already base64url
  return { public_key: b64u(pub), private_key: jwk.d as string, cron_key: b64u(crypto.getRandomValues(new Uint8Array(24))) };
}

const DAY = 86_400_000;
const todayLondon = (): string =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const niceDay = (iso: string): string =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
function remindWords(due: string, today: string): string {
  const days = Math.round((Date.parse(`${due}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / DAY);
  if (days === 0) return "Today";
  if (days === -1) return `Yesterday · ${niceDay(due)}`;
  return `${-days} days ago · ${niceDay(due)}`;
}

Deno.serve(async (req: Request) => {
  let { data: keys } = await db.from("push_keys").select("public_key, private_key, cron_key").eq("id", 1).single();
  if (!keys) return new Response("push_keys row missing — run supabase/PUSH_REMINDERS.sql", { status: 500 });
  if (keys.public_key === "SET-ME") {
    const made = await makeKeys();
    const { error } = await db.from("push_keys").update(made).eq("id", 1).eq("public_key", "SET-ME");
    if (error) return new Response(error.message, { status: 500 });
    keys = made;
  } else if (req.headers.get("x-remind-key") !== keys.cron_key) return new Response("no", { status: 401 });
  webpush.setVapidDetails("mailto:rowlandglew35@gmail.com", keys.public_key, keys.private_key);

  const today = todayLondon();
  const { data: notes, error } = await db.from("test_items")
    .select("id, project_id, what, due, reminded_on")
    .eq("kind", "note").is("deleted_at", null).is("done_at", null)
    .not("due", "is", null).lte("due", today)
    .or(`reminded_on.is.null,reminded_on.neq.${today}`);
  if (error) return new Response(error.message, { status: 500 });
  if (!notes?.length) return Response.json({ today, due: 0, sent: 0 });

  const projectIds = [...new Set(notes.map(n => n.project_id as string))];
  const { data: projects } = await db.from("projects").select("id, name, owner_id, deleted_at").in("id", projectIds);
  const { data: members } = await db.from("project_members").select("project_id, email").in("project_id", projectIds);
  const emails = [...new Set((members ?? []).map(m => (m.email as string).toLowerCase()))];
  const { data: profiles } = emails.length
    ? await db.from("profiles").select("id, email").in("email", emails)
    : { data: [] as { id: string; email: string }[] };
  const byEmail = new Map((profiles ?? []).map(p => [String(p.email).toLowerCase(), p.id as string]));

  let sent = 0, dropped = 0;
  for (const note of notes) {
    const project = (projects ?? []).find(p => p.id === note.project_id);
    if (!project || project.deleted_at != null) continue;
    const people = new Set<string>([project.owner_id as string]);
    for (const m of members ?? []) if (m.project_id === note.project_id) {
      const id = byEmail.get((m.email as string).toLowerCase()); if (id) people.add(id);
    }
    const { data: subs } = await db.from("push_subscriptions").select("endpoint, p256dh, auth").in("user_id", [...people]);
    const payload = JSON.stringify({
      title: `Reminder · ${project.name}`,
      body: `${String(note.what ?? "").trim() || "A note"}\n${remindWords(note.due as string, today)}`,
      url: `/project/${project.id}/notes`,
      tag: `faultline-${note.id}`,
    });
    for (const s of subs ?? []) {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 6 * 3600 });
        sent++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) { await db.from("push_subscriptions").delete().eq("endpoint", s.endpoint); dropped++; }
      }
    }
    await db.from("test_items").update({ reminded_on: today }).eq("id", note.id);
  }
  return Response.json({ today, due: notes.length, sent, dropped });
});
