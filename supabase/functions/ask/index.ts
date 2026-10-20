/* ASK — RETIRED, 20 October.
 *
 * This function narrated answers to a question about a line from the figures
 * the app had worked out (docs/upgrade-plan.md F4). Rowland, 20 October: "the
 * only AI is the voice and the camera video system" — so Ask answers from the
 * app's own functions only (lib/intelligence askLine) and nothing calls this.
 * It stays deployed answering { off: true } — what the app always read as
 * "no AI here, show your own answers" — so a copy of the app installed before
 * the change still works, and it never reaches a model or a key. The version
 * that narrated is in the repo's history (docs/DIRECTION.md). */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve((req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  return new Response(JSON.stringify({ off: true, retired: "20 October — Ask answers from the app's own figures only" }), {
    status: 200, headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
});
