/* KEYCHECK — RETIRED, 20 October.
 *
 * A diagnostic made while the method builder's assistant was being built:
 * asked by the database with the scheduler's key, it sent requests to the
 * Messages API with the saved key and said how they went. The builder was
 * deleted on 20 October (docs/DIRECTION.md — Rowland: "the only AI is the
 * voice and the camera video system"), so nothing asks it any more, and a
 * relay to the API is not left standing unused: it refuses everything and
 * reaches no model and no key. Its working version is in the history of the
 * session branch (claude/faultline-connection-1vx7kt). */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(() => new Response(JSON.stringify({ retired: "20 October — the method builder's diagnostic; it reaches nothing" }), {
  status: 410, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
}));
