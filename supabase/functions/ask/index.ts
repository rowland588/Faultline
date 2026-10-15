/* ASK — a question about a line, narrated from the figures the app already
 * worked out (docs/upgrade-plan.md F4; decision 2: here, not a Vercel route).
 *
 * POST { question, facts } with the person's session → { text } — or
 * { off: true } when no key is set (the app then shows its own answers only).
 *
 * THE RULE: the model computes nothing. It is sent only the line's figures as
 * sentences and numbers the app's tested functions made (lib/intelligence
 * askFacts) — never a record, a name of a person, or another line's data — and
 * told to answer from them alone, quoting the figures it used, and to say
 * plainly when they do not answer the question.
 *
 * Cost: a small model, short answers, the same question on the same facts
 * answered once per instance (cache), twenty questions an hour a person
 * (limit). The key is Rowland's to set: ANTHROPIC_API_KEY as a Supabase secret.
 * Nothing breaks without it. */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const KEY = Deno.env.get("ANTHROPIC_API_KEY");
const MODEL = Deno.env.get("ASK_MODEL") ?? "claude-haiku-5-5";
const url = Deno.env.get("SUPABASE_URL")!;
const anon = Deno.env.get("SUPABASE_ANON_KEY")!;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" } });

const cache = new Map<string, { at: number; text: string }>();
const asked = new Map<string, number[]>();
const DAY = 86_400_000, HOUR = 3_600_000, PER_HOUR = 20;

async function hash(s: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, "0")).join("");
}

const SYSTEM = `You answer a plant manager's question about one production line in a food factory.
You are given FACTS: figures already worked out by tested functions from what people logged.
Rules:
- Use only the FACTS. Never calculate a new number, estimate, or invent one. If the FACTS do not answer the question, say so in one sentence and say what would need logging.
- Quote the figures you use, as they are written in the FACTS.
- A loss that is "not the constraint" makes no more output when fixed — say so when it matters.
- Plain British English, no jargon, at most four sentences. No headings, no lists.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  if (!KEY) return json({ off: true });

  /* whose session — the question is answered for a signed-in person only */
  const auth = req.headers.get("Authorization") ?? "";
  const sb = createClient(url, anon, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return json({ error: "Sign in to ask." }, 401);

  let question = "", facts: unknown = null;
  try { const b = await req.json(); question = String(b?.question ?? "").slice(0, 300); facts = b?.facts ?? null; } catch { /* no body */ }
  if (!question.trim() || !facts) return json({ error: "A question and the line's facts, please." }, 400);
  const factsText = JSON.stringify(facts).slice(0, 8000);

  const now = Date.now();
  const mine = (asked.get(user.id) ?? []).filter(t => now - t < HOUR);
  if (mine.length >= PER_HOUR) return json({ error: "That's twenty questions this hour — the answers above still stand." }, 429);
  asked.set(user.id, [...mine, now]);

  const k = await hash(`${question.trim().toLowerCase()}|${factsText}`);
  const hit = cache.get(k);
  if (hit && now - hit.at < DAY) return json({ text: hit.text, cached: true });

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: MODEL, max_tokens: 300, system: SYSTEM, messages: [{ role: "user", content: `FACTS:\n${factsText}\n\nQUESTION: ${question}` }] }),
    });
    if (!r.ok) return json({ off: true, why: `model ${r.status}` });
    const out = await r.json();
    const text = String(out?.content?.find((c: { type: string }) => c.type === "text")?.text ?? "").trim();
    if (!text) return json({ off: true });
    cache.set(k, { at: now, text });
    if (cache.size > 500) cache.delete(cache.keys().next().value as string);
    return json({ text });
  } catch {
    return json({ off: true });
  }
});
