import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { config, isMailOwner, sendOwnerMail } from "./server.ts";
import { validMail } from "./resend.ts";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info" };
const reply = (body: object, status = 200) => Response.json(body, { status, headers });
Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response(null, { headers });
  if (req.method !== "POST") return reply({ error: "POST required" }, 405);
  const token = req.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) return reply({ error: "Sign in to use Luna email." }, 401);
  const { data } = await db.auth.getUser(token);
  if (!data.user) return reply({ error: "Sign in to use Luna email." }, 401);
  try {
    const allowed = await isMailOwner(db, data.user.id);
    const input = await req.json();
    if (input?.action === "status") return reply({ ready: allowed && !!config().apiKey, allowed });
    if (!allowed) return reply({ error: "Only the Faultline owner can use the Luna sender." }, 403);
    if (input?.action !== "send" || typeof input.id !== "string" || !/^[\w:-]{1,150}$/.test(input.id) || !validMail(input.mail)) return reply({ error: "Check the email and confirmation." }, 400);
    const id = await sendOwnerMail(db, data.user.id, "command/" + data.user.id + "/" + input.id, input.mail);
    return reply({ accepted: true, id });
  } catch (e) {
    return reply({ error: e instanceof Error ? e.message : "Email acceptance could not be confirmed." }, 400);
  }
});
