/* AI MODE, CALM (11 November, F2 — docs/DESIGN.md: "AI Mode is the simplest place in the app"). 24 November: at a desk the
 * conversations are the left rail (open by default, ChatGPT-style); the env bar’s chats icon toggles them. A phone opens the same
 * list as a sheet from that icon — never a ⋯ dump. Inside the context Parked, Sources and What your words mean are folds
 * (ui/Fold), shut until opened. A script reading them opens them first, as a person would — and a second visit finds them open.
 *
 *     await t.go('#/ai'); await openLunaContext(page); await openLunaFolds(page, ['luna-parked']);
 */
const desk = page => (page.viewportSize()?.width ?? 0) >= 1100;

/** Open the side panel on AI Mode's page at a desk, if it is put away. A phone (the strip and its sheet) and the panel are left alone. */
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
  if ((await page.locator('.ai.is-list[data-ai-slot="page"]').count())) return;
  const b = page.locator('[data-ai-chats]:visible, [data-ai-list-b]:visible').first();
  try { await b.waitFor({ timeout: 8000 }); } catch { return; }
  await b.click();
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

/** Open Luna's earlier conversations as a person does: the env bar’s chats icon (24 November), or the list already open at a desk. */
export async function openLunaConversations(page) {
  if (desk(page) && (await page.locator('.ai.is-list[data-ai-slot="page"]').count())) return;
  const b = page.locator('[data-ai-chats]:visible, [data-ai-list-b]:visible').first();
  if (await b.count()) { await b.click(); await page.waitForTimeout(400); return; }
  const m = page.locator('.nv-top [data-luna-menu] button').first();
  if (!(await m.count())) return;
  await m.click();
  await page.getByRole('menuitem', { name: /^Conversations/ }).click();
  await page.waitForTimeout(400);
}
