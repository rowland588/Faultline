#!/usr/bin/env node
/* Prints, in the HOST'S build log (Vercel etc — visible to whoever administers
 * the deploy, never to app users), whether the two Supabase env vars were
 * actually present at build time. Never prints their values.
 *
 * Why this exists: Vite bakes VITE_* vars in at BUILD time, and a var set in
 * the wrong Vercel "Environment" scope (e.g. Preview but not Production), or
 * saved after the last build ran, produces a deploy that looks successful but
 * ships with no working sign-in — silently, with nothing in the UI to explain
 * why. This turns that into one unmissable line in the build log instead of a
 * guessing game after the fact. Never fails the build — a broken deploy still
 * needs to publish so the ServiceUnavailable screen (and this log) can be seen. */

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
const has = (v) => !!(v && v.trim());

const line = '='.repeat(70);
console.log(`\n${line}`);
console.log('FAULTLINE BUILD — Supabase config check');
console.log(line);
console.log(`VITE_SUPABASE_URL........ ${has(url) ? `SET (${url.trim().length} chars)` : 'MISSING'}`);
console.log(`VITE_SUPABASE_ANON_KEY... ${has(key) ? `SET (${key.trim().length} chars)` : 'MISSING'}`);

if (has(url) && has(key)) {
  console.log('\n✅ Both present — this build will show the real sign-in screen.');
} else {
  console.log('\n❌ NOT CONFIGURED — this build will show "Temporarily unavailable" to every user.');
  console.log('   Fix: host project → Settings → Environment Variables → confirm BOTH');
  console.log('   VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set and scoped to');
  console.log('   PRODUCTION, then redeploy with "Use existing Build Cache" UNTICKED.');
}
console.log(`${line}\n`);
