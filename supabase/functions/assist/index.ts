/* ASSIST — the one gateway between Faultline and Claude (docs/PLATFORM-REVIEW.md
 * §6.4; docs/PLATFORM-STATUS.md, slice 4).
 *
 * POST with the person's session, one of three tasks →
 *   { task: 'design', description }       a method proposed from their words
 *   { task: 'change', current, request }  the method as it stands, changed as asked
 *   { task: 'ask', facts, question }      a question about a project, from its facts
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

const KEY = Deno.env.get("ANTHROPIC_API_KEY");
const MODEL = Deno.env.get("ASSIST_MODEL") ?? "claude-opus-5-5";
const EFFORT = Deno.env.get("ASSIST_EFFORT") ?? "high";
/* reading facts back is lighter work than designing a method */
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
  if (task !== "design" && task !== "change" && task !== "ask") return json({ ok: false, why: "The assistant designs and changes methods and answers questions about a project; nothing else." }, 400);
  if (task !== "ask" && description.trim().length < (task === "change" ? 5 : 20)) return json({ ok: false, why: "Say a little more about what you want." }, 400);
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
    if (e instanceof Anthropic.AuthenticationError) return json({ off: true, why: "The assistant's key is not accepted — the app works by hand until it is put right." });
    if (e instanceof Anthropic.APIError) return json({ ok: false, why: `The assistant could not answer just now (${e.status ?? "no status"}). Try again, or write the method by hand.` });
    return json({ ok: false, why: "The assistant could not be reached just now. Try again, or write the method by hand." });
  }
});
