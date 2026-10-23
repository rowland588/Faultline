/* ONE NUMBER, EVERYWHERE — S1 (docs/STEADY.md). Rowland, 23 October: "I just
 * want organisation and stability in the app ... I just want it to work
 * correctly." Stability is not "nothing breaks": it is "nothing can
 * disagree". So, on the seeded stage-gate project and the 6M project, the
 * project's LATE and its OPEN (still to do) are read from every place that
 * shows them, and any two that differ fail:
 *
 *   the front page's band (the Late tile and its "of N still to do")
 *   Needs you (its rows, the late ones in red)
 *   Actions (the Open and Late tiles)
 *   the Journey (the Late tile — today's, on this week and next)
 *   the status report on paper (LATE n of N still to do)
 *   the control room (the project's row: lib/portfolio, as the board reads it)
 *
 *   node scripts/acceptance/one-number.mjs      (SMOKE_BASE, as smoke) */
import pkg from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const { chromium } = pkg;
const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const SESSION = { access_token: 'smoke', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 31536000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'acceptance@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } };
const IGNORE = /Supabase|net::ERR|Failed to fetch|ERR_FAILED|aborted|Download the React DevTools|WebSocket/i;

let fail = 0;
const ok = (c, what, detail) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${what}${!c && detail ? ` — ${String(detail).slice(0, 700)}` : ''}`); if (!c) fail++; };
const flat = s => String(s ?? '').replace(/\s+/g, ' ').trim();
const dir = mkdtempSync(join(tmpdir(), 'fl-one-'));

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport: { width: 1360, height: 900 }, acceptDownloads: true });
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* fine */ } }, [`sb-${REF}-auth-token`, SESSION]);
await ctx.route('**://*.supabase.co/**', r => r.abort());
const page = await ctx.newPage();
const errs = [];
page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errs.push(m.text()); });
page.on('pageerror', e => errs.push(e.message));
const go = async hash => { await page.goto(`${BASE}/${hash}`); await page.locator('.nv-main').waitFor({ timeout: 15000 }); await page.waitForTimeout(2200); };
const pdfText = async click => {
  const [d] = await Promise.all([page.waitForEvent('download', { timeout: 40000 }), click()]);
  const f = join(dir, `${Date.now()}.pdf`); await d.saveAs(f);
  return flat(execFileSync('pdftotext', ['-raw', f, '-'], { encoding: 'utf8' }));
};
const tile = async (sel, k) => {
  const t = page.locator(sel, { has: page.locator('.ln-k, .vd-l', { hasText: new RegExp(`^${k}$`) }) }).first();
  if (!(await t.count())) return { v: null, of: '' };
  return { v: Number(flat(await t.locator('.ln-v, .vd-n').innerText())), of: flat(await t.locator('.ln-of, .vd-of').innerText().catch(() => '')) };
};
const num = (s, re) => { const m = re.exec(s); return m ? Number(m[1]) : null; };

await go('#/room');
const sd = await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());

/** Every place, for one project — late and open, as each shows them. */
async function read(pid, kind) {
  const r = {};
  /* the front page's band */
  await go(`#/project/${pid}`);
  const bandLate = await tile('.vd-tile', kind === 'gate' ? 'Late' : 'Countermeasures');
  r.band = kind === 'gate'
    ? { late: bandLate.v, open: num(bandLate.of, /of (\d+) still to do/) ?? (/nothing left/.test(bandLate.of) ? 0 : null) }
    : { late: num(bandLate.of, /(\d+) late/) ?? (/none late|none open/.test(bandLate.of) ? 0 : null), open: bandLate.v };
  /* Needs you */
  /* Needs you is the most urgent rows, the rest a count — its late ones are the red rows (a critical problem is its own row) */
  r.needs = { open: null, late: await page.locator('.fp-needs .fp-row.is-r').count() };
  /* a 6M project's own page says its late in the header — everything owed past its day (lib/portfolio pacedOwed) */
  if (kind !== 'gate') r.band.late = num(flat(await page.locator('.cw-handover .in-late').innerText().catch(() => '')), /(\d+) late/) ?? 0;
  /* Actions */
  await go(`#/project/${pid}/actions`);
  const openTile = await tile('.act-tiles .ln-tile', 'Open');
  /* Actions owes more than the plan — the critical problems, the register's, its own actions — and its tile says of what, so
     the band's "still to do" and Actions' open reconcile on the page: the parts must add up to the number */
  const parts = [...openTile.of.matchAll(/(\d+) /g)].map(m => Number(m[1]));
  r.actions = { open: openTile.v, late: (await tile('.act-tiles .ln-tile', 'Late')).v, parts, plan: num(openTile.of, /(\d+) on the plan/) ?? 0 };
  /* the Journey — this week and next */
  await go(`#/project/${pid}/journey`);
  r.journey = { late: (await tile('.jn-tiles .ln-tile', 'Late')).v, open: (await tile('.jn-tiles .ln-tile', 'Still to do')).v };
  /* the status report on paper */
  await go(kind === 'gate' ? `#/project/${pid}/report` : `#/pace-report?project=${pid}`);
  const text = await pdfText(async () => { await page.getByRole('button', { name: 'Status — 1 page' }).click(); await page.getByRole('button', { name: 'Download' }).click(); });
  r.status = kind === 'gate'
    ? { late: num(text, /LATE (\d+) /), open: num(text, /of (\d+) still to do/) ?? (/nothing left to do/.test(text) ? 0 : null) }
    /* a 6M status: its countermeasures tile, and its LATE line — everything owed past its day */
    : { open: num(text, /COUNTERMEASURES (\d+) /), late: num(text, /LATE (\d+) past their day/) ?? num(text, /LATE (\d+) countermeasures? past/) ?? (/LATE/.test(text) ? null : 0) };
  r.week = /This week and next: (\d+) done · (?:(\d+) still to do(?: \((\d+) late\))?|nothing still to do) · (\d+) planned/.exec(text)?.slice(1).map(x => (x == null ? 0 : Number(x))) ?? null;
  /* the control room, as the board reads the project (lib/portfolio) */
  r.room = await page.evaluate(async ({ pid, kind }) => {
    const db = await import('/src/db.ts'); const P = await import('/src/lib/portfolio.ts'); const W = await import('/src/lib/weeks.ts');
    const today = W.todayISO();
    const project = await db.getProject(pid);
    if (kind === 'gate') {
      const j = { project, tests: await db.listTests(pid), items: await db.listTestItems(pid), assets: await db.listAssets(pid), materials: await db.listMaterials(pid), programs: await db.listPrograms(pid), studies: await db.listStudies(pid) };
      const v = P.portfolio([j], today).jobs[0];
      return { late: v.late, open: v.outstanding };
    }
    const steps = await db.listPaceTodos(pid);
    const owed = P.pacedOwed({ project, steps, lines: [], atTarget: 0, judged: 0, materials: await db.listMaterials(pid), programs: await db.listPrograms(pid) }, today);
    return { late: owed.filter(x => x.late).length, open: owed.length };
  }, { pid, kind });
  return r;
}

for (const [kind, pid, name] of [['gate', sd.projectId, 'the stage-gate project'], ['sixm', sd.pacedProjectId, 'the 6M project']]) {
  const r = await read(pid, kind);
  const places = Object.entries(r).filter(([k]) => k !== 'week');
  console.log(`\n${name}:`);
  for (const [k, v] of places) console.log(`  ${k.padEnd(8)} late ${String(v.late).padStart(3)}   open ${String(v.open).padStart(3)}`);
  if (r.week) console.log(`  week     done ${r.week[0]} · still to do ${r.week[1]} (late ${r.week[2]}) · planned ${r.week[3]}`);
  const lates = [...new Set(places.map(([, v]) => v.late))];
  /* OPEN: the band's "still to do", the status report and the control room say the plan's own rows; Actions says everything owed
     and its tile says of what — the parts add up, and the plan's part is the band's number */
  /* a 6M project's band and status count its countermeasures; the control room counts everything owed, as Actions does */
  const opens = [...new Set((kind === 'gate' ? ['band', 'status', 'room'] : ['band', 'status']).map(k => r[k].open))];
  if (kind !== 'gate') ok(r.room.open === r.actions.open, `${name}: the control room owes what Actions owes — ${r.room.open}`, `room ${r.room.open}, actions ${r.actions.open}`);
  ok(lates.length === 1 && lates[0] != null, `${name}: one LATE everywhere — ${lates.join(' / ')}`, places.map(([k, v]) => `${k} ${v.late}`).join(', '));
  ok(opens.length === 1 && opens[0] != null, `${name}: one STILL TO DO on the band, the status report and the control room — ${opens.join(' / ')}`, ['band', 'status', 'room'].map(k => `${k} ${r[k].open}`).join(', '));
  const sum = r.actions.parts.reduce((n, x) => n + x, 0);
  ok(r.actions.open != null && sum === r.actions.open && (kind !== 'gate' || r.actions.plan === r.band.open), `${name}: Actions' open (${r.actions.open}) reconciles — its parts add up${kind === 'gate' ? `, the plan's part the band's ${r.band.open}` : ''}`, `parts ${r.actions.parts.join('+')} = ${sum}; plan ${r.actions.plan}`);
  if (r.week) ok(r.week[2] === lates[0], `${name}: This week and next says the same late (${r.week[2]})`, r.week.join(' · '));
}
ok(errs.length === 0, 'no console error', errs.join(' | '));
await b.close();
console.log(fail ? `\n${fail} FAILED` : '\nALL PASS');
process.exit(fail ? 1 : 0);
