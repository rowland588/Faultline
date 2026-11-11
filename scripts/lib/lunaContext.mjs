/* AI MODE, CALM (11 November, F2 — docs/DESIGN.md: "AI Mode is the simplest place in the app"). At a desk #/ai opens on the conversation
 * and the work alone: the context (Now on, Being built, Parked, Sources…) is behind Show context and the earlier conversations behind
 * Conversations, each kept open on that device once opened; inside the context Parked, Sources and What your words mean are folds
 * (ui/Fold), shut until opened. A script reading them opens them first, as a person would — and a second visit finds them open.
 *
 *     await t.go('#/ai'); await openLunaContext(page); await openLunaFolds(page, ['luna-parked']);
 */
const desk = page => (page.viewportSize()?.width ?? 0) >= 1100;

/** Show context on AI Mode's page at a desk, if it is put away. A phone (the strip and its sheet) and the panel are left alone. */
export async function openLunaContext(page) {
  if (!desk(page)) return;
  const b = page.locator('.ai[data-ai-slot="page"] [data-ai-ctx-b]');
  try { await b.first().waitFor({ timeout: 8000 }); } catch { return; }
  if ((await b.first().getAttribute('aria-pressed')) === 'true') return;
  await b.first().click();
  await page.waitForTimeout(300);
}

/** Show the earlier conversations beside the conversation at a desk, if they are put away. */
export async function openLunaList(page) {
  if (!desk(page)) return;
  const b = page.locator('.ai[data-ai-slot="page"] [data-ai-list-b]');
  try { await b.first().waitFor({ timeout: 8000 }); } catch { return; }
  if ((await page.locator('.ai.is-list[data-ai-slot="page"]').count())) return;
  await b.first().click();
  await page.waitForTimeout(300);
}

/** Open the context's folds by id (luna-parked, luna-sources, luna-words) wherever they are drawn and shut — the column or the sheet. */
export async function openLunaFolds(page, ids = ['luna-parked', 'luna-sources']) {
  for (const id of ids) {
    const shut = page.locator(`[data-fold="${id}"]:not(.is-open)`);
    const n = await shut.count();
    for (let i = 0; i < n; i++) {
      const f = shut.nth(0);
      if (!(await f.isVisible().catch(() => false))) break;
      await f.locator('.fold-toggle').click();
      await page.waitForTimeout(200);
    }
  }
}
