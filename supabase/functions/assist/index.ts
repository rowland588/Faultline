/* ASSIST — the one gateway between Faultline and Claude (docs/PLATFORM-REVIEW.md
 * §6.4; docs/PLATFORM-STATUS.md, slice 4).
 *
 * POST with the person's session, one of five tasks →
 *   { task: 'clarify', description }      what to ask before designing — at most
 *                                         four questions, or none when the words say enough
 *   { task: 'design', description }       a method proposed from their words
 *   { task: 'change', current, request }  the method as it stands, changed as asked
 *   { task: 'ask', facts, question }      a question about a project, from its facts
 *   { task: 'video-label', events, frames } the work named in a video study's frames
 * →
 *   { ok: true, proposal | answer, ... }  the answer, held to its schema and read
 *   { ok: false, why }                    refused, over the allowance, unreadable
 *   { off: true, why }                    no key set: the app works by hand
 *
 * THE RULES, every one kept here, server-side:
 *   - the key never leaves this function (ANTHROPIC_API_KEY, a Supabase
 *     secret — Rowland's to set; nothing breaks without it);
 *   - a signed-in person only — the session is checked before anything;
 *   - an allowance a person a day, by number and by cost, kept in
 *     assist_usage, which only this function writes (service role) and a
 *     person may only read their own of (supabase/ASSIST_USAGE.sql);
 *   - the answer is held to the proposal's JSON schema by the API
 *     (structured outputs), then read and checked by the app's own validator
 *     (flow/, copied from src/lib/flow by scripts/sync-assist.mjs) — and the
 *     device checks it again: nothing the model writes is trusted;
 *   - the model proposes; a person keeps it as a draft and approves it.
 *
 * Model and effort are configuration (ASSIST_MODEL, ASSIST_EFFORT), the
 * default claude-opus-5-5 at high effort — lowering either for cost is the
 * owner's decision, never this code's. */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk@0.131.0";
import { DESIGN_SYSTEM, allowance, changeUser, costMicros, designUser, readDesign } from "./flow/assistCore.ts";
import { PROPOSAL_SCHEMA } from "./flow/proposal.ts";
import { ASK_SCHEMA, ASK_SYSTEM, askUser, checkAnswer, type Fact } from "./flow/askCore.ts";
import { CLARIFY_SCHEMA, CLARIFY_SYSTEM, clarifyUser, readClarify } from "./flow/clarifyCore.ts";
import { VISION_LIMITS, VISION_SCHEMA, VISION_SYSTEM, checkLabels, visionUser, type LabelEvent, type LabelFrame } from "./video/visionCore.ts";

/* A key pasted into the dashboard with quotes or spaces round it is the key
   all the same; a key the API still refuses is said in the logs by its SHAPE
   only — the known prefix, its length, what was round it — never itself. */
const RAW_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const KEY = RAW_KEY?.trim().replace(/^["'`]+|["'`]+$/g, "").trim() || undefined;
const keyShape = (): string => {
  const k = KEY ?? "";
  return `starts with sk-ant-: ${k.startsWith("sk-ant-") ? "yes" : "no"}; length ${k.length}; ` +
    `had spaces or quotes round it: ${RAW_KEY !== undefined && RAW_KEY !== k ? "yes (removed)" : "no"}; spaces inside: ${/\s/.test(k) ? "yes" : "no"}`;
};
const refused = () => console.warn(`faultline assist: the API refused the key (401) — ${keyShape()}`);
const MODEL = Deno.env.get("ASSIST_MODEL") ?? "claude-opus-5-5";
const EFFORT = Deno.env.get("ASSIST_EFFORT") ?? "high";
/* reading facts back is lighter work than designing a method */
const ASK_EFFORT = Deno.env.get("ASSIST_ASK_EFFORT") ?? "low";
/* the questions before a design: short, but they decide what is designed */
const CLARIFY_EFFORT = Deno.env.get("ASSIST_CLARIFY_EFFORT") ?? "medium";
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
  if (!KEY) return json({ off: true, why: "The assistant is not switched on for this app yet — write the method by hand; everything else works the same." });

  /* whose session — a signed-in person only */
  const auth = req.headers.get("Authorization") ?? "";
  const asThem = createClient(url, anon, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const { data: { user } } = await asThem.auth.getUser();
  if (!user) return json({ ok: false, why: "Sign in to use the assistant." }, 401);

  let body: Record<string, unknown> = {};
  try { body = (await req.json()) ?? {}; } catch { /* no body */ }
  const task = String(body.task ?? "");
  const description = String(body.description ?? body.request ?? "").slice(0, 4000);
  const question = String(body.question ?? "").slice(0, 400);
  const facts: Fact[] = Array.isArray(body.facts) ? (body.facts as Fact[]).slice(0, 400).map(f => ({ id: String(f?.id ?? ""), text: String(f?.text ?? "").slice(0, 600), basis: f?.basis === "known" || f?.basis === "worked out" ? f.basis : "not recorded" })) : [];
  /* A VIDEO STUDY'S FRAMES (docs/VIDEO.md): a few small JPEGs of the events the
     movement reading found, never the footage; held to the limits before any is sent on */
  const vEvents: LabelEvent[] = Array.isArray(body.events) ? (body.events as LabelEvent[]).slice(0, VISION_LIMITS.events + 1).map(e => ({ id: String(e?.id ?? "").slice(0, 60), station: String(e?.station ?? "").slice(0, 80), track: String(e?.track ?? "").slice(0, 40), from: String(e?.from ?? "").slice(0, 12), to: String(e?.to ?? "").slice(0, 12) })) : [];
  const vFrames: LabelFrame[] = Array.isArray(body.frames) ? (body.frames as LabelFrame[]).slice(0, VISION_LIMITS.frames + 1).map(f => ({ event: String(f?.event ?? ""), at: String(f?.at ?? ""), data: String(f?.data ?? "") })) : [];
  if (task === "video-label") {
    if (!vEvents.length || !vFrames.length) return json({ ok: false, why: "Events and their frames, please." }, 400);
    if (vEvents.length > VISION_LIMITS.events || vFrames.length > VISION_LIMITS.frames) return json({ ok: false, why: `At most ${VISION_LIMITS.frames} frames and ${VISION_LIMITS.events} events at once.` }, 400);
    if (vFrames.some(f => !/^[A-Za-z0-9+/=]+$/.test(f.data) || f.data.length * 0.75 > VISION_LIMITS.frameBytes || !vEvents.some(e => e.id === f.event))) return json({ ok: false, why: "A frame is not a small JPEG of an event asked about." }, 400);
  }
  if (task !== "clarify" && task !== "design" && task !== "change" && task !== "ask" && task !== "video-label") return json({ ok: false, why: "The assistant asks what it needs to know, designs and changes methods, answers questions about a project, and names the work in a video study's frames; nothing else." }, 400);
  if (task !== "ask" && task !== "video-label" && description.trim().length < (task === "change" ? 5 : 20)) return json({ ok: false, why: "Say a little more about what you want." }, 400);
  if (task === "change" && !body.current) return json({ ok: false, why: "The method as it stands is needed to change it." }, 400);
  if (task === "ask" && (!question.trim() || !facts.length)) return json({ ok: false, why: "A question and the project's facts, please." }, 400);

  /* the allowance, from this person's own last day */
  const admin = createClient(url, service, { auth: { persistSession: false } });
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const { data: rows, error: noTable } = await admin.from("assist_usage").select("at, cost_micros").eq("user_id", user.id).gte("at", since);
  /* no allowance to keep, no assistant: it never runs without its cost control (supabase/ASSIST_USAGE.sql) */
  if (noTable) return json({ off: true, why: "The assistant's allowance is not set up yet — the app works by hand until it is." });
  const left = allowance(rows ?? [], Date.now(), LIMIT);
  if (!left.ok) return json({ ok: false, why: left.why });

  const client = new Anthropic({ apiKey: KEY });
  if (task === "video-label") {
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
      if (e instanceof Anthropic.AuthenticationError) { refused(); return json({ off: true, why: "The assistant's key is not accepted — name the work as you review." }); }
      return json({ ok: false, why: "The assistant could not name the work just now — name it as you review." });
    }
  }
  if (task === "clarify") {
    try {
      const msg = await client.beta.messages.create({
        model: MODEL, max_tokens: 3000,
        betas: ["server-side-fallback-2026-07-01"], fallbacks: "default",
        output_config: { effort: CLARIFY_EFFORT, format: { type: "json_schema", schema: CLARIFY_SCHEMA } },
        system: [{ type: "text", text: CLARIFY_SYSTEM, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: clarifyUser(description) }],
      } as unknown as Parameters<typeof client.beta.messages.create>[0]) as unknown as { model?: string; stop_reason?: string; content?: unknown; usage?: Record<string, number> };
      const cost = costMicros(msg.model ?? MODEL, msg.usage ?? {});
      const text = (Array.isArray(msg.content) ? msg.content : []).map((b: { type?: string; text?: string }) => (b?.type === "text" ? b.text ?? "" : "")).join("");
      let raw: unknown = null;
      try { raw = JSON.parse(text); } catch { /* unreadable */ }
      const read = msg.stop_reason === "refusal" ? undefined : readClarify(raw);
      await admin.from("assist_usage").insert({ user_id: user.id, task, model: msg.model ?? MODEL, input_tokens: msg.usage?.input_tokens ?? 0, output_tokens: msg.usage?.output_tokens ?? 0, cost_micros: cost, ok: !!read });
      return read ? json({ ok: true, clarify: read, left: { calls: Math.max(0, LIMIT.calls - left.used.calls - 1) } }) : json({ ok: false, why: "The assistant's questions could not be read — it designs from your words as they are." });
    } catch (e) {
      if (e instanceof Anthropic.RateLimitError) return json({ ok: false, why: "The assistant is busy — try again in a minute." });
      if (e instanceof Anthropic.AuthenticationError) { refused(); return json({ off: true, why: "The assistant's key is not accepted — the app works by hand until it is put right." }); }
      return json({ ok: false, why: "The assistant could not read the need just now." });
    }
  }
  try {
    const ask = task === "ask";
    const msg = await client.beta.messages.create({
      model: MODEL,
      max_tokens: ask ? 4000 : 16000,
      /* a refusal on a policy line is re-run on the fallback the API chooses, inside this call */
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: ask ? ASK_EFFORT : EFFORT, format: { type: "json_schema", schema: ask ? ASK_SCHEMA : PROPOSAL_SCHEMA } },
      system: [{ type: "text", text: ask ? ASK_SYSTEM : DESIGN_SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: ask ? askUser(question, facts) : task === "change" ? changeUser(body.current, description) : designUser(description) }],
    } as unknown as Parameters<typeof client.beta.messages.create>[0]) as unknown as { model?: string; stop_reason?: string; content?: unknown; usage?: Record<string, number> };
    const cost = costMicros(msg.model ?? MODEL, msg.usage ?? {});
    const calls = Math.max(0, LIMIT.calls - left.used.calls - 1);
    const log = (ok: boolean) => admin.from("assist_usage").insert({
      user_id: user.id, task, model: msg.model ?? MODEL,
      input_tokens: msg.usage?.input_tokens ?? 0, output_tokens: msg.usage?.output_tokens ?? 0,
      cost_micros: cost, ok,
    });
    if (ask) {
      if (msg.stop_reason === "refusal") { await log(false); return json({ ok: false, why: "The assistant would not answer that. The project's page says where it stands." }); }
      const text = (Array.isArray(msg.content) ? msg.content : []).map((b: { type?: string; text?: string }) => (b?.type === "text" ? b.text ?? "" : "")).join("");
      let raw: unknown = null;
      try { raw = JSON.parse(text); } catch { /* unreadable */ }
      const said = checkAnswer(raw, facts);
      await log(said.length > 0);
      return said.length ? json({ ok: true, answer: raw, left: { calls } }) : json({ ok: false, why: "The assistant's answer could not be checked against the project's facts, so it is not shown." });
    }
    const read = readDesign(msg);
    await log(read.ok);
    return read.ok
      ? json({ ok: true, proposal: read.raw, errors: read.errors, warnings: read.warnings, left: { calls } })
      : json({ ok: false, why: read.why });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return json({ ok: false, why: "The assistant is busy — try again in a minute." });
    if (e instanceof Anthropic.AuthenticationError) { refused(); return json({ off: true, why: "The assistant's key is not accepted — the app works by hand until it is put right." }); }
    if (e instanceof Anthropic.APIError) return json({ ok: false, why: `The assistant could not answer just now (${e.status ?? "no status"}). Try again, or write the method by hand.` });
    return json({ ok: false, why: "The assistant could not be reached just now. Try again, or write the method by hand." });
  }
});
