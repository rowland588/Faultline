/* ASSIST — the gateway between Faultline and Claude for the camera's AI: the
 * video study's "Name the work from the frames" (docs/VIDEO.md).
 *
 * Since 20 October it does that one task (docs/DIRECTION.md — Rowland: "the
 * only AI is the voice and the camera video system"). Its other tasks —
 * designing and changing methods, the questions before a design, answering
 * about a project — went with the method builder; asked for, they are
 * refused in words.
 *
 * POST with the person's session →
 *   { task: 'video-label', objective, events, frames }
 * →
 *   { ok: true, labels, model }   the work named, each label checked
 *   { ok: false, why }            refused, over the allowance, unreadable
 *   { off: true, why }            no key set: the work is named by hand
 *
 * THE RULES, every one kept here, server-side:
 *   - the key never leaves this function (ANTHROPIC_API_KEY, a Supabase
 *     secret — Rowland's to set; nothing breaks without it);
 *   - a signed-in person only — the session is checked before anything;
 *   - a few small JPEGs of the events the movement reading found, never the
 *     footage, held to their limits before any is sent on; the model is told
 *     never to identify anyone;
 *   - an allowance a person a day, by number and by cost, kept in
 *     assist_usage, which only this function writes (service role) and a
 *     person may only read their own of (supabase/ASSIST_USAGE.sql);
 *   - the answer is held to its JSON schema by the API, then every label is
 *     checked against the events asked about (video/visionCore, copied from
 *     src/lib/video by scripts/sync-assist.mjs) — and a person reviews each.
 *
 * Model and effort are configuration (ASSIST_MODEL, ASSIST_ASK_EFFORT). */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk@0.131.0";
import { allowance, costMicros } from "./video/gatewayUsage.ts";
import { VISION_LIMITS, VISION_SCHEMA, VISION_SYSTEM, checkLabels, visionUser, type LabelEvent, type LabelFrame } from "./video/visionCore.ts";

const KEY = Deno.env.get("ANTHROPIC_API_KEY");
const MODEL = Deno.env.get("ASSIST_MODEL") ?? "claude-opus-5-5";
/* naming the work in a few frames is light work */
const ASK_EFFORT = Deno.env.get("ASSIST_ASK_EFFORT") ?? "low";
const LIMIT = {
  calls: Number(Deno.env.get("ASSIST_DAILY_CALLS") ?? 25) || 25,
  micros: Math.round((Number(Deno.env.get("ASSIST_DAILY_USD") ?? 3) || 3) * 1_000_000),
};
const url = Deno.env.get("SUPABASE_URL")!;
const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ ok: false, why: "POST only" }, 405);
  if (!KEY) return json({ off: true, why: "Naming the work from the frames is not switched on for this app yet — name it as you review; everything else works the same." });

  /* whose session — a signed-in person only */
  const auth = req.headers.get("Authorization") ?? "";
  const asThem = createClient(url, anon, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const { data: { user } } = await asThem.auth.getUser();
  if (!user) return json({ ok: false, why: "Sign in to use the assistant." }, 401);

  let body: Record<string, unknown> = {};
  try { body = (await req.json()) ?? {}; } catch { /* no body */ }
  const task = String(body.task ?? "");
  /* the camera's one task (20 October): designing, changing and asking about methods went with the method builder */
  if (task !== "video-label") return json({ ok: false, why: "The assistant names the work in a video study's frames; nothing else — the method builder it served was taken out on 20 October." }, 400);
  /* A VIDEO STUDY'S FRAMES (docs/VIDEO.md): a few small JPEGs of the events the
     movement reading found, never the footage; held to the limits before any is sent on */
  const vEvents: LabelEvent[] = Array.isArray(body.events) ? (body.events as LabelEvent[]).slice(0, VISION_LIMITS.events + 1).map(e => ({ id: String(e?.id ?? "").slice(0, 60), station: String(e?.station ?? "").slice(0, 80), track: String(e?.track ?? "").slice(0, 40), from: String(e?.from ?? "").slice(0, 12), to: String(e?.to ?? "").slice(0, 12) })) : [];
  const vFrames: LabelFrame[] = Array.isArray(body.frames) ? (body.frames as LabelFrame[]).slice(0, VISION_LIMITS.frames + 1).map(f => ({ event: String(f?.event ?? ""), at: String(f?.at ?? ""), data: String(f?.data ?? "") })) : [];
  if (!vEvents.length || !vFrames.length) return json({ ok: false, why: "Events and their frames, please." }, 400);
  if (vEvents.length > VISION_LIMITS.events || vFrames.length > VISION_LIMITS.frames) return json({ ok: false, why: `At most ${VISION_LIMITS.frames} frames and ${VISION_LIMITS.events} events at once.` }, 400);
  if (vFrames.some(f => !/^[A-Za-z0-9+/=]+$/.test(f.data) || f.data.length * 0.75 > VISION_LIMITS.frameBytes || !vEvents.some(e => e.id === f.event))) return json({ ok: false, why: "A frame is not a small JPEG of an event asked about." }, 400);

  /* the allowance, from this person's own last day */
  const admin = createClient(url, service, { auth: { persistSession: false } });
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const { data: rows, error: noTable } = await admin.from("assist_usage").select("at, cost_micros").eq("user_id", user.id).gte("at", since);
  /* no allowance to keep, no assistant: it never runs without its cost control (supabase/ASSIST_USAGE.sql) */
  if (noTable) return json({ off: true, why: "The allowance for naming the work is not set up yet — name it as you review until it is." });
  const left = allowance(rows ?? [], Date.now(), LIMIT);
  if (!left.ok) return json({ ok: false, why: left.why });

  const client = new Anthropic({ apiKey: KEY });
  try {
    const msg = await client.beta.messages.create({
      model: MODEL, max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"], fallbacks: "default",
      output_config: { effort: ASK_EFFORT, format: { type: "json_schema", schema: VISION_SCHEMA } },
      system: [{ type: "text", text: VISION_SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: visionUser(String(body.objective ?? ""), vEvents, vFrames) }],
    } as unknown as Parameters<typeof client.beta.messages.create>[0]) as unknown as { model?: string; stop_reason?: string; content?: unknown; usage?: Record<string, number> };
    const cost = costMicros(msg.model ?? MODEL, msg.usage ?? {});
    const text = (Array.isArray(msg.content) ? msg.content : []).map((b: { type?: string; text?: string }) => (b?.type === "text" ? b.text ?? "" : "")).join("");
    let raw: unknown = null;
    try { raw = JSON.parse(text); } catch { /* unreadable */ }
    const labels = msg.stop_reason === "refusal" ? [] : checkLabels(raw, vEvents.map(e => e.id));
    await admin.from("assist_usage").insert({ user_id: user.id, task, model: msg.model ?? MODEL, input_tokens: msg.usage?.input_tokens ?? 0, output_tokens: msg.usage?.output_tokens ?? 0, cost_micros: cost, ok: labels.length > 0 });
    return labels.length ? json({ ok: true, labels, model: msg.model ?? MODEL }) : json({ ok: false, why: "The assistant's labels could not be checked, so none are kept — name the work as you review." });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return json({ ok: false, why: "The assistant is busy — try again in a minute." });
    if (e instanceof Anthropic.AuthenticationError) return json({ off: true, why: "The assistant's key is not accepted — name the work as you review." });
    return json({ ok: false, why: "The assistant could not name the work just now — name it as you review." });
  }
});
