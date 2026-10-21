/* ASSIST — the gateway between Faultline and Claude. Two tasks:
 *
 *   video-label  the camera's AI: the video study's "Name the work from the
 *                frames" (docs/VIDEO.md);
 *   talk         Line Talk's assistant (docs/LINE-TALK.md, slice 2): the
 *                conversation — what was said, typed and photographed — with
 *                Faultline's records about the line, answered in words, and a
 *                document written when one is asked for.
 *
 * Rowland, 20 October: "a simple, reliable, ChatGPT-style manufacturing
 * assistant inside Faultline, powered by our existing Claude API
 * integration." Nothing else is served (the method builder's tasks went on
 * 20 October, docs/DIRECTION.md); asked for, they are refused in words.
 *
 * POST with the person's session →
 *   { task: 'video-label', objective, events, frames }
 *     → { ok: true, labels, model } | { ok: false, why } | { off: true, why }
 *   { task: 'talk', context, today, turns, images }   (lib/talkAssist TalkAsk)
 *     → { ok: true, answer, unsure, model } | { ok: false, why } | { off: true, why }
 *   … with stream: true (the app, 21 October) → text/event-stream: the reply
 *     so far as it is written, { partial, document }, then the same final
 *     object — a refusal before the model is asked still comes as JSON
 *
 * THE RULES, every one kept here, server-side:
 *   - the key never leaves this function (ANTHROPIC_API_KEY, a Supabase
 *     secret — Rowland's; nothing breaks without it);
 *   - a signed-in person only — the session is checked before anything;
 *   - every request held to its limits before anything is sent on (the
 *     frames: video/visionCore; the talk: talk/talkAssist readAsk — its
 *     turns, words and pictures); the model is told never to identify anyone;
 *   - the instructions are the gateway's own (VISION_SYSTEM, TALK_SYSTEM),
 *     never the device's;
 *   - an allowance a person a day for each task, by number and by cost, kept
 *     in assist_usage, which only this function writes (service role) and a
 *     person may only read their own of (supabase/ASSIST_USAGE.sql);
 *   - the answer is held to its JSON schema by the API, then read again
 *     (checkLabels, checkTalkAnswer) — a picture it names must be one of the
 *     talk's — and every figure in a talk's answer not found in what was said
 *     or in Faultline's records is returned as `unsure`, said beside it;
 *   - nothing is written to Faultline: a person decides what becomes a record.
 *
 * THE CHECK: the database alone may ask a talk with the scheduler's key
 * (`x-check-key`, push_keys.cron_key — the key `remind` is called with, which
 * no API role can read). It runs the same task by the same code, with no
 * person, no allowance and nothing logged, and answers with the model's
 * usage and time too — so a real answer can be proved from the server
 * without anyone signed in (docs/LINE-TALK.md, How it is proved). It says
 * the fingerprint of the instructions and the answer's shape it holds
 * (`rules`, the first 16 hex of their SHA-256) — so the copy deployed is
 * proved the same as the repo's, word for word.
 *
 * Model and effort are configuration (ASSIST_MODEL, ASSIST_ASK_EFFORT for
 * the frames; ASSIST_TALK_MODEL for the talk, ASSIST_TALK_EFFORT for a
 * document asked of it, ASSIST_TALK_CHAT_EFFORT for the conversation). */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk@0.131.0";
import { allowance, costMicros } from "./video/gatewayUsage.ts";
import { VISION_LIMITS, VISION_SCHEMA, VISION_SYSTEM, checkLabels, visionUser, type LabelEvent, type LabelFrame } from "./video/visionCore.ts";
import { TALK_ALLOWANCE_WORDS, TALK_SCHEMA, TALK_SYSTEM, asksForDocument, checkTalkAnswer, partialAnswer, readAsk, talkMessages, unsureFigures, type TalkAnswer, type TalkAsk } from "./talk/talkAssist.ts";

const KEY = Deno.env.get("ANTHROPIC_API_KEY");
const MODEL = Deno.env.get("ASSIST_MODEL") ?? "claude-opus-5-5";
/* naming the work in a few frames is light work */
const ASK_EFFORT = Deno.env.get("ASSIST_ASK_EFFORT") ?? "low";
const LIMIT = {
  calls: Number(Deno.env.get("ASSIST_DAILY_CALLS") ?? 25) || 25,
  micros: Math.round((Number(Deno.env.get("ASSIST_DAILY_USD") ?? 3) || 3) * 1_000_000),
};
/* a document asked of a talk is written with care; the conversation itself is
   answered quickly, as a person answers (Rowland, 21 October: "a full
   conversational system ... like I do with you here") */
const TALK_MODEL = Deno.env.get("ASSIST_TALK_MODEL") ?? MODEL;
const TALK_EFFORT = Deno.env.get("ASSIST_TALK_EFFORT") ?? "medium";
const TALK_CHAT_EFFORT = Deno.env.get("ASSIST_TALK_CHAT_EFFORT") ?? "low";
const TALK_LIMIT = {
  calls: Number(Deno.env.get("ASSIST_TALK_DAILY_CALLS") ?? 60) || 60,
  micros: Math.round((Number(Deno.env.get("ASSIST_TALK_DAILY_USD") ?? 5) || 5) * 1_000_000),
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

type Usage = Record<string, number>;
/* the instructions and the answer's shape this copy holds, as a fingerprint — never anything secret */
const rulesPrint = async () => [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(TALK_SYSTEM + JSON.stringify(TALK_SCHEMA))))].map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
type Talked =
  | { ok: true; answer: TalkAnswer; unsure: string[]; model: string; usage: Usage; cost: number; seconds: number }
  | { ok: false; off?: boolean; why: string; model?: string; usage?: Usage; cost?: number; detail?: string };

/* LINE TALK: the conversation asked of the model — its instructions the
   gateway's own, the conversation cached up to its newest turn (talkMessages),
   the answer held to its schema and read again before it is returned. With
   `onText`, the answer is streamed and its words so far handed on as they
   come; the finished answer is checked the same. */
type TalkMsg = { model?: string; stop_reason?: string; content?: unknown; usage?: Usage };
async function answerTalk(client: Anthropic, ask: TalkAsk, onText?: (soFar: string) => void): Promise<Talked> {
  const t0 = Date.now();
  try {
    const params = {
      model: TALK_MODEL, max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"], fallbacks: "default",
      output_config: { effort: asksForDocument(ask.turns) ? TALK_EFFORT : TALK_CHAT_EFFORT, format: { type: "json_schema", schema: TALK_SCHEMA } },
      system: [{ type: "text", text: TALK_SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: talkMessages(ask),
    } as unknown as Parameters<typeof client.beta.messages.create>[0];
    let msg: TalkMsg;
    if (onText) {
      let soFar = "";
      const stream = client.beta.messages.stream(params as unknown as Parameters<typeof client.beta.messages.stream>[0]);
      stream.on("text", (delta: string) => { soFar += delta; onText(soFar); });
      msg = await stream.finalMessage() as unknown as TalkMsg;
    } else msg = await client.beta.messages.create(params) as unknown as TalkMsg;
    const model = msg.model ?? TALK_MODEL;
    const usage = msg.usage ?? {};
    const cost = costMicros(model, usage);
    if (msg.stop_reason === "refusal") return { ok: false, why: "Line Talk would not answer that one. What you said is kept.", model, usage, cost };
    if (msg.stop_reason === "max_tokens") return { ok: false, why: "The answer ran longer than Line Talk can give at once — ask for a shorter document, or one part at a time.", model, usage, cost };
    const text = (Array.isArray(msg.content) ? msg.content : []).map((b: { type?: string; text?: string }) => (b?.type === "text" ? b.text ?? "" : "")).join("");
    let raw: unknown = null;
    try { raw = JSON.parse(text); } catch { /* unreadable */ }
    const photos = ask.turns.flatMap(t => (t.kind === "photo" && t.photo ? [t.photo] : []));
    const answer = checkTalkAnswer(raw, photos);
    if (!answer) return { ok: false, why: "Line Talk's answer could not be read, so none is kept — ask again.", model, usage, cost };
    return { ok: true, answer, unsure: unsureFigures(answer, ask), model, usage, cost, seconds: Math.round((Date.now() - t0) / 100) / 10 };
  } catch (e) {
    const detail = e instanceof Error ? e.message.slice(0, 500) : String(e).slice(0, 500);
    if (e instanceof Anthropic.RateLimitError) return { ok: false, why: "Line Talk is busy — ask again in a minute. What you said is kept.", detail };
    if (e instanceof Anthropic.AuthenticationError) return { off: true, ok: false, why: "Line Talk's key is not accepted, so it cannot answer just now. Everything you say, type and photograph is still kept.", detail };
    console.error("talk failed", detail);
    return { ok: false, why: "Line Talk could not answer just now — ask again. What you said is kept.", detail };
  }
}

/* THE ANSWER AS IT IS WRITTEN — server-sent events: the reply so far (and
   whether a document is being written ahead of it) as it grows, then the
   finished answer exactly as the plain response gives it. `done` keeps the
   allowance's record once the answer is in. */
function streamTalk(client: Anthropic, ask: TalkAsk, done: (r: Talked) => Promise<void>, extra: Record<string, unknown> = {}): Response {
  const enc = new TextEncoder();
  const body = new ReadableStream({
    async start(ctrl) {
      let open = true;
      const put = (o: unknown) => { if (!open) return; try { ctrl.enqueue(enc.encode(`data: ${JSON.stringify(o)}\n\n`)); } catch { open = false; } };
      let lastReply = "", lastDoc = false, lastAt = 0;
      const r = await answerTalk(client, ask, soFar => {
        const p = partialAnswer(soFar);
        const now = Date.now();
        if ((p.reply !== lastReply || p.document !== lastDoc) && now - lastAt >= 80) {
          lastReply = p.reply; lastDoc = p.document; lastAt = now;
          put({ partial: p.reply, document: p.document });
        }
      });
      await done(r).catch(() => undefined);
      put({ ...(r.ok ? { ok: true, answer: r.answer, unsure: r.unsure, model: r.model } : r.off ? { off: true, why: r.why } : { ok: false, why: r.why }), ...extra });
      if (open) { try { ctrl.close(); } catch { /* gone */ } }
    },
  });
  return new Response(body, { headers: { ...CORS, "Content-Type": "text/event-stream", "Cache-Control": "no-store" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ ok: false, why: "POST only" }, 405);
  const admin = createClient(url, service, { auth: { persistSession: false } });

  /* THE CHECK — the database's own key, never a person's */
  const checkKey = req.headers.get("x-check-key");
  if (checkKey !== null) {
    const { data: keys } = await admin.from("push_keys").select("cron_key").eq("id", 1).single();
    const real = (keys as { cron_key?: string } | null)?.cron_key ?? "";
    if (real.length < 20 || real === "SET-ME" || checkKey !== real) return json({ ok: false, why: "no" }, 401);
    if (!KEY) return json({ off: true, why: "No key is saved for the assistant." });
    let body: Record<string, unknown> = {};
    try { body = (await req.json()) ?? {}; } catch { /* no body */ }
    if (body.task !== "talk") return json({ ok: false, why: "The check asks a talk only.", rules: await rulesPrint() }, 400);
    const read = readAsk(body);
    if (!read.ok) return json({ ok: false, why: read.why, rules: await rulesPrint() }, 400);
    const rules = await rulesPrint();
    /* the check asks as the app does — streamed when the app's ask is */
    if (body.stream === true) return streamTalk(new Anthropic({ apiKey: KEY }), read.ask, async () => undefined, { rules, effort: asksForDocument(read.ask.turns) ? TALK_EFFORT : TALK_CHAT_EFFORT });
    return json({ ...(await answerTalk(new Anthropic({ apiKey: KEY }), read.ask)), rules, effort: asksForDocument(read.ask.turns) ? TALK_EFFORT : TALK_CHAT_EFFORT });
  }

  let body: Record<string, unknown> = {};
  try { body = (await req.json()) ?? {}; } catch { /* no body */ }
  const task = String(body.task ?? "");
  /* each task says it is off in its own words — the work named by hand, or the talk kept unanswered */
  if (!KEY) return json({ off: true, why: task === "talk" ? "Line Talk's assistant is not switched on for this app yet — everything you say, type and photograph is kept." : "Naming the work from the frames is not switched on for this app yet — name it as you review; everything else works the same." });

  /* whose session — a signed-in person only */
  const auth = req.headers.get("Authorization") ?? "";
  const asThem = createClient(url, anon, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const { data: { user } } = await asThem.auth.getUser();
  if (!user) return json({ ok: false, why: "Sign in to use the assistant." }, 401);
  if (task !== "video-label" && task !== "talk") return json({ ok: false, why: "The assistant answers a Line Talk and names the work in a video study's frames; nothing else — the method builder it served was taken out on 20 October." }, 400);

  /* the allowance, from this person's own last day of this task */
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const { data: rows, error: noTable } = await admin.from("assist_usage").select("at, cost_micros").eq("user_id", user.id).eq("task", task).gte("at", since);
  /* no allowance to keep, no assistant: it never runs without its cost control (supabase/ASSIST_USAGE.sql) */
  if (noTable) return json({ off: true, why: task === "talk" ? "Line Talk's allowance is not set up yet, so it cannot answer — everything you say, type and photograph is kept." : "The allowance for naming the work is not set up yet — name it as you review until it is." });
  const client = new Anthropic({ apiKey: KEY });

  /* LINE TALK */
  if (task === "talk") {
    const read = readAsk(body);
    if (!read.ok) return json({ ok: false, why: read.why }, 400);
    const left = allowance(rows ?? [], Date.now(), TALK_LIMIT, TALK_ALLOWANCE_WORDS);
    if (!left.ok) return json({ ok: false, why: left.why });
    const keep = async (r: Talked) => {
      if (r.usage) await admin.from("assist_usage").insert({ user_id: user.id, task, model: r.model ?? TALK_MODEL, input_tokens: (r.usage.input_tokens ?? 0) + (r.usage.cache_read_input_tokens ?? 0) + (r.usage.cache_creation_input_tokens ?? 0), output_tokens: r.usage.output_tokens ?? 0, cost_micros: r.cost ?? 0, ok: r.ok });
    };
    /* the app asks for the answer as it is written; anything else has it whole */
    if (body.stream === true) return streamTalk(client, read.ask, keep);
    const r = await answerTalk(client, read.ask);
    await keep(r);
    return r.ok ? json({ ok: true, answer: r.answer, unsure: r.unsure, model: r.model }) : json(r.off ? { off: true, why: r.why } : { ok: false, why: r.why });
  }

  /* A VIDEO STUDY'S FRAMES (docs/VIDEO.md): a few small JPEGs of the events the
     movement reading found, never the footage; held to the limits before any is sent on */
  const vEvents: LabelEvent[] = Array.isArray(body.events) ? (body.events as LabelEvent[]).slice(0, VISION_LIMITS.events + 1).map(e => ({ id: String(e?.id ?? "").slice(0, 60), station: String(e?.station ?? "").slice(0, 80), track: String(e?.track ?? "").slice(0, 40), from: String(e?.from ?? "").slice(0, 12), to: String(e?.to ?? "").slice(0, 12) })) : [];
  const vFrames: LabelFrame[] = Array.isArray(body.frames) ? (body.frames as LabelFrame[]).slice(0, VISION_LIMITS.frames + 1).map(f => ({ event: String(f?.event ?? ""), at: String(f?.at ?? ""), data: String(f?.data ?? "") })) : [];
  if (!vEvents.length || !vFrames.length) return json({ ok: false, why: "Events and their frames, please." }, 400);
  if (vEvents.length > VISION_LIMITS.events || vFrames.length > VISION_LIMITS.frames) return json({ ok: false, why: `At most ${VISION_LIMITS.frames} frames and ${VISION_LIMITS.events} events at once.` }, 400);
  if (vFrames.some(f => !/^[A-Za-z0-9+/=]+$/.test(f.data) || f.data.length * 0.75 > VISION_LIMITS.frameBytes || !vEvents.some(e => e.id === f.event))) return json({ ok: false, why: "A frame is not a small JPEG of an event asked about." }, 400);
  const left = allowance(rows ?? [], Date.now(), LIMIT);
  if (!left.ok) return json({ ok: false, why: left.why });

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
