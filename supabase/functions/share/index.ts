/* SHARE — opens one shared picture or clip for somebody with the link and no
 * account (supabase/SHARE_LINKS.sql is the record and the reasons).
 *
 * POST { token } → { kind, url, caption, project, test, by, until }, or
 * { gone: true, why } when the link has expired, was stopped, or the thing it
 * pointed at has been taken off the test. The url is a signed address for the
 * private file that lasts five minutes — enough to start playing; the viewer
 * asks again for a fresh one if it needs to. Each open counts one view.
 *
 * The token is the whole secret: 24 random bytes, checked here with the
 * service role, which never leaves this function. The person opening the
 * link has no account; the app calls this with its public key (the gateway's
 * check, verify_jwt on), and the token is what lets them in — to the one
 * file and nothing else. */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const url = Deno.env.get("SUPABASE_URL")!;
const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db = createClient(url, service, { auth: { persistSession: false } });

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  let token = "";
  try { token = String((await req.json())?.token ?? ""); } catch { /* no body */ }
  if (!/^[A-Za-z0-9_-]{32,64}$/.test(token)) return json({ gone: true, why: "This link is not complete — check it was copied whole." });

  const { data: share } = await db.from("shares").select("*").eq("token", token).maybeSingle();
  if (!share) return json({ gone: true, why: "This link does not open anything." });
  if (share.revoked_at) return json({ gone: true, why: "Sharing was stopped for this link." });
  if (Date.parse(share.expires_at) <= Date.now()) return json({ gone: true, why: "This link has expired." });

  // The thing must still be on the test: a clip taken off it takes its link with it.
  /* And it must be on a test OF THE PROJECT the share was made in: the owner
     check (who may make a share) is on the project, so a test from another
     job named in a share would open a file its maker may not see. */
  const { data: test } = await db.from("tests").select("title, media, deleted_at, asset_id, project_id").eq("id", share.test_id).maybeSingle();
  const media = (test?.media ?? []) as { blobKey?: string; thumbKey?: string }[];
  const item = media.find(m => m.blobKey === share.blob_key);
  if (!test || test.project_id !== share.project_id || test.deleted_at || !item) {
    return json({ gone: true, why: "What this link showed has been taken off the job." });
  }

  // Uploads are stored by key; files from before that sit under their owner's folder.
  let signed: string | null = null;
  for (const path of [share.blob_key, `${share.owner_id}/${share.blob_key}`]) {
    const { data } = await db.storage.from("media").createSignedUrl(path, 300);
    if (data?.signedUrl) { signed = data.signedUrl; break; }
  }
  if (!signed) return json({ gone: true, why: "The file has not reached the cloud yet — try again later." });

  let poster: string | null = null;
  if (item.thumbKey) {
    const { data } = await db.storage.from("media").createSignedUrl(item.thumbKey, 300);
    poster = data?.signedUrl ?? null;
  }

  const [{ data: project }, { data: by }, { data: asset }] = await Promise.all([
    db.from("projects").select("name, lead").eq("id", share.project_id).maybeSingle(),
    db.from("profiles").select("email").eq("id", share.owner_id).maybeSingle(),
    test.asset_id ? db.from("commission_assets").select("name").eq("id", test.asset_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  await db.from("shares").update({ views: (share.views ?? 0) + 1, last_viewed_at: new Date().toISOString() }).eq("token", token);

  return json({
    kind: share.kind,
    url: signed,
    poster,
    caption: share.caption ?? null,
    project: project?.name ?? null,
    test: test.title ?? null,
    machine: (asset as { name?: string } | null)?.name ?? null,
    by: project?.lead || (by?.email ? String(by.email).split("@")[0] : null),
    until: share.expires_at,
  });
});
