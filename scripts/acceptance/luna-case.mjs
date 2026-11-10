/* ACCEPTANCE — THE CASE FILE, SHARED (10 November, docs/LUNA-WORKSPACE.md W4 — Rowland: "I should be able to see the investigation
 * taking shape … evidence collected, outstanding questions and progress"; "Manual Mode must remain fully functional"):
 *
 *   1  a project worked with Luna (a conversation's thread on it: an aim, a decision, a question open and one answered, two notes each
 *      with how known): its page, Luna closed, shows the case in one line — the aim, 1 question open, 2 known
 *   2  opened: the whole file, read-only — Aim, Decided, To answer, Answered, the notes with Measured / Reported; Continue with Luna opens
 *      her beside the page on that very conversation
 *   3  a project nobody has worked with Luna: no case line — its page as ever; AI Mode off: none anywhere; a phone: the line fits
 *
 *   node scripts/acceptance/luna-case.mjs   (SMOKE_BASE, as smoke) */
import { openApp } from '../lib/tocBrowser.mjs';

const t = await openApp({ width: 1440, height: 900 });
const { page, ok } = t;
const sd = await t.seed();
const ids = await page.evaluate(async () => {
  const db = await import('/src/db.ts');
  const ps = (await db.allProjects()).filter(p => !p.archivedAt && !p.deletedAt);
  const [a, b] = ps;
  const t0 = Date.now();
  await db.putStudy({ id: 'case-conv', tool: 'talk', name: 'Wrapper downtime', facts: {
    colleague: true, named: 'Wrapper downtime', actions: [],
    turns: [{ id: 'q1', at: t0 - 60000, who: 'You', kind: 'typed', text: 'Why is the wrapper stopping?' }],
    threads: [{ id: 'th1', title: 'Wrapper stops', status: 'current', scope: { projectId: a.id }, objective: 'Halve the wrapper’s film breaks', at: t0, refs: [],
      notes: [{ id: 'n1', text: '12 film breaks timed last week', how: 'measured', at: t0 }, { id: 'n2', text: 'Nights say the reel is loose', how: 'reported', at: t0 }],
      points: [{ id: 'p1', kind: 'decision', text: 'Time stops on both shifts', at: t0 }, { id: 'p2', kind: 'question', text: 'Is the film supplier the same on nights?', at: t0 }, { id: 'p3', kind: 'question', text: 'Who owns the splice SOP?', answered: 'Dave', at: t0 }] }],
  }, uses: [], startedAt: t0, createdAt: t0, updatedAt: t0 });
  return { a: a.id, b: b?.id };
});

/* ---- 1 · the case in one line, Luna closed ---- */
await t.go(`#/project/${encodeURIComponent(ids.a)}`, 2500);
ok((await page.locator('[data-luna-panel]').count()) === 0, '1 Luna closed');
const line = await t.words('[data-case]');
ok(/Halve the wrapper’s film breaks — 1 question open · 2 known/.test(line), `1 the case in one line ("${line.slice(0, 90)}")`);

/* ---- 2 · the file opened; Continue with Luna ---- */
await page.locator('[data-case-toggle]').click(); await page.waitForTimeout(400);
const file = await t.words('[data-case-file]');
ok(/Aim\s*Halve the wrapper/.test(file) && /Decided\s*Time stops on both shifts/.test(file) && /To answer\s*Is the film supplier/.test(file) && /Answered\s*Who owns the splice SOP\? — Dave/.test(file), '2 the file: aim, decided, to answer, answered');
ok(/Measured\s*12 film breaks/.test(file) && /Reported\s*Nights say the reel is loose/.test(file), '2 each note with how it is known');
await page.locator('[data-case-continue]').click(); await page.waitForTimeout(2500);
ok((await page.locator('[data-luna-panel="open"] [data-ai]').count()) === 1 && (await t.words('[data-luna-panel] [data-ai-title]')) === 'Wrapper downtime', `2 Continue with Luna: her panel on that conversation ("${await t.words('[data-luna-panel] [data-ai-title]')}")`);
ok(/Why is the wrapper stopping/.test(await t.words('[data-luna-panel] .ai-turns')), '2 its turns there');

/* ---- 3 · nothing where nothing was worked; off; a phone ---- */
await page.evaluate(async () => (await import('/src/colleague/lunaPanel.ts')).setLunaPanel('closed'));
if (ids.b) { await t.go(`#/project/${encodeURIComponent(ids.b)}`, 2500); ok((await page.locator('[data-case]').count()) === 0, '3 a project not worked with Luna: no case line'); }
await page.setViewportSize({ width: 390, height: 844 });
await t.go(`#/project/${encodeURIComponent(ids.a)}`, 2500);
const bar = await page.locator('[data-case-toggle]').boundingBox();
ok(!!bar && bar.height >= 44 && (await t.wide()) <= 0, `3 a phone: the line a thumb's height, nothing off the side (${Math.round(bar?.height ?? 0)} px)`);
await page.setViewportSize({ width: 1440, height: 900 });
await page.evaluate(async () => (await import('/src/colleague/aiMode.ts')).setAiMode(false));
await t.go(`#/project/${encodeURIComponent(ids.a)}`, 2000);
ok((await page.locator('[data-case]').count()) === 0, '3 AI Mode off: no case line');
await page.evaluate(async () => (await import('/src/colleague/aiMode.ts')).setAiMode(true));

await t.finish('The case file — on the project’s page with Luna closed, the whole file opened, Continue with Luna on that conversation; nothing where nothing was worked.');
