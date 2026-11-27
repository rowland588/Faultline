/* ACCEPTANCE — Luna work folders (24 November, Rowland: keep Luna as simple as ChatGPT/Claude).
 * A Luna Project is a work folder started from Luna: its chats and its document library. Chats in
 * the project can use that library. A chat not in a project sees only itself. Nothing from another
 * chat or project leaks in. Never a Faultline 6M/PDCA/catalogue tool.
 *   node scripts/acceptance/luna-projects.mjs   (SMOKE_BASE, as smoke) */
import { openApp } from '../lib/tocBrowser.mjs';

const t = await openApp({ width: 1440, height: 900 });
const { page, ok } = t;
await t.seed();
const errs = []; page.on('pageerror', e => errs.push(e.message));

await t.go('#/', 2600);
await page.locator('.ai-empty-g').waitFor({ timeout: 60000 });
ok((await page.locator('.ai.is-list [data-luna-drawer]').count()) === 1, '1 desk drawer is open');
ok((await page.locator('[data-luna-drawer] .ai-drawer-body > [data-luna-artifacts] details[open]').count()) === 1, '1 Artifacts is the first visible drawer section');
ok((await page.locator('[data-luna-new-project]').filter({ hasText: /New workspace/ }).count()) === 1, '1 New workspace starts a Luna work folder from Luna');

await page.locator('[data-luna-new-project]').click();
await page.locator('[data-luna-new-project-form] input').fill('Line 7 pack');
await page.locator('[data-luna-new-project-form] button[type=submit]').click();
await page.locator('[data-luna-folder-name]').waitFor({ timeout: 8000 });
ok((await t.words('[data-luna-folder-name]')) === 'Line 7 pack', '1 the folder opens by the name given');
ok(/None yet — start a chat in this workspace/.test(await t.words('[data-luna-chats]')), '1 its chats are empty');
ok(/None yet — attach a file in a chat here/.test(await t.words('[data-luna-library]')), '1 its library is empty');
ok((await page.locator('[data-luna-folder-back]').count()) === 1, '1 ‹ Workspaces goes back');
ok((await page.locator('[data-ai-new]').filter({ hasText: /^New chat$/ }).count()) >= 1, '1 New chat stays at the foot');

await page.locator('[data-luna-folder-back]').click();
await page.locator('[data-luna-projects] [data-luna-project="Line 7 pack"]').waitFor({ timeout: 8000 });
ok(/0 chats · 0 files/.test(await t.words('[data-luna-project="Line 7 pack"]')), '1 the folder is listed with its chats and files, never a Faultline method');

const planted = await page.evaluate(async () => {
  const db = await import('/src/db.ts');
  const { newConversation } = await import('/src/colleague/conversation.ts');
  const { newLunaFolder } = await import('/src/colleague/lunaFolder.ts');
  const now = Date.now();
  const client = (await db.listWorkspaces()).find(l => l.clientName)?.clientName || '';
  await db.putStudy(newLunaFolder({ id: 'luna-p-a', at: now, name: 'Packing week', ...(client ? { client } : {}) }));
  await db.putStudy(newLunaFolder({ id: 'luna-p-b', at: now - 1, name: 'Elsewhere', ...(client ? { client } : {}) }));
  const inA = newConversation({ id: 'luna-c-a', at: now, name: 'In packing', folderId: 'luna-p-a', ...(client ? { client } : {}) });
  inA.facts.turns = [{ id: 't1', at: now, who: 'You', kind: 'typed', text: 'What did packing lose?' }];
  inA.facts.named = 'In packing';
  inA.facts.reports = [{ id: 'report-a', title: 'Packing report', form: 'report', sections: [], at: now, updated: now, version: 1 }];
  inA.facts.htmlArtifacts = [{ id: 'html-a', reportId: 'report-a', reportVersion: 1, title: 'Packing HTML', html: '<!doctype html><title>Packing HTML</title><h1>Packing HTML</h1>', at: now, updatedAt: now }];
  await db.putStudy(inA);
  const inB = newConversation({ id: 'luna-c-b', at: now, name: 'Other site', folderId: 'luna-p-b', ...(client ? { client } : {}) });
  inB.facts.turns = [{ id: 't1', at: now, who: 'You', kind: 'typed', text: 'A secret in another project' }];
  inB.facts.named = 'Other site';
  await db.putStudy(inB);
  const loose = newConversation({ id: 'luna-c-loose', at: now, name: 'Loose chat', ...(client ? { client } : {}) });
  loose.facts.turns = [{ id: 't1', at: now, who: 'You', kind: 'typed', text: 'A chat on its own' }];
  loose.facts.named = 'Loose chat';
  await db.putStudy(loose);
  const inbox = newConversation({ id: 'luna-c-inbox', at: now, name: 'Inbox chat', ...(client ? { client } : {}) });
  inbox.facts.turns = [{ id: 't1', at: now, who: 'You', kind: 'typed', text: 'A file I just uploaded' }];
  inbox.facts.named = 'Inbox chat';
  await db.putStudy(inbox);
  const src = (id, name, extra) => ({
    id, tool: 'source', name, facts: { source: { name, named: 'file', fileName: `${id}.xlsx`, kind: 'workbook', bytes: 10, at: now, fileId: `wb-${id}`, status: 'ready', ...(client ? { client } : {}), ...extra } },
    uses: [], startedAt: now, createdAt: now, updatedAt: now,
  });
  await db.putStudy(src('luna-f-a', 'Packing workbook', { folderId: 'luna-p-a' }));
  await db.putStudy(src('luna-f-b', 'Elsewhere workbook', { folderId: 'luna-p-b' }));
  await db.putStudy(src('luna-f-loose', 'Loose workbook', { conversationId: 'luna-c-loose' }));
  await db.putStudy(src('luna-f-inbox', 'Inbox workbook', { conversationId: 'luna-c-inbox' }));
  return { client };
});
await t.go('#/', 2000);
await page.locator('[data-luna-projects] [data-luna-project="Packing week"]').waitFor({ timeout: 15000 });
await page.locator('[data-luna-file="Loose workbook"]').waitFor({ timeout: 15000 });
ok((await page.locator('[data-luna-chats] [data-conv="luna-c-loose"]').count()) === 1, '2 root Chats holds the standalone chat');
ok((await page.locator('[data-luna-chats] [data-conv="luna-c-a"]').count()) === 0 && (await page.locator('[data-luna-chats] [data-conv="luna-c-b"]').count()) === 0, '2 a project chat is not listed at the root');
ok((await page.locator('[data-luna-library] [data-luna-file="Loose workbook"]').count()) === 1, '2 root Library holds a standalone chat’s file');
ok((await page.locator('[data-luna-library] [data-luna-file="Packing workbook"]').count()) === 0 && (await page.locator('[data-luna-library] [data-luna-file="Elsewhere workbook"]').count()) === 0, '2 a project’s library does not leak into the root');

await page.locator('[data-luna-project="Packing week"]').click();
await page.locator('[data-luna-folder-name]').waitFor({ timeout: 8000 });
await page.locator('[data-luna-file="Packing workbook"]').waitFor({ timeout: 8000 });
ok((await t.words('[data-luna-folder-name]')) === 'Packing week', '3 opening a project shows its name');
ok((await page.locator('[data-luna-chats] [data-conv="luna-c-a"]').count()) === 1, '3 its chat is there');
ok((await page.locator('[data-luna-chats] [data-conv="luna-c-b"]').count()) === 0 && (await page.locator('[data-luna-chats] [data-conv="luna-c-loose"]').count()) === 0, '3 another chat does not leak in');
ok((await page.locator('[data-luna-library] [data-luna-file="Packing workbook"]').count()) === 1, '3 its library is there');
ok((await page.locator('[data-luna-library] [data-luna-file="Elsewhere workbook"]').count()) === 0 && (await page.locator('[data-luna-library] [data-luna-file="Loose workbook"]').count()) === 0, '3 another project’s file does not leak in');
ok((await page.locator('[data-luna-artifacts] details[open]').count()) === 1, '3 Artifacts is open inside a workspace');
ok((await page.locator('[data-luna-artifacts]').getByText('Packing HTML').count()) === 1, '3 its saved HTML has a durable Artifacts card');
ok((await page.locator('[data-luna-artifacts]').getByText('Packing report').count()) === 0 && (await page.locator('[data-luna-artifacts]').getByText('Packing workbook').count()) === 0, '3 reports and Excel uploads are not HTML artifacts');
ok(!(await page.locator('[data-luna-drawer]').innerText()).match(/6M|PDCA|DMAIC|Kaizen/), '3 never a Faultline method in the Luna folder');
void planted;

await page.locator('[data-luna-folder-back]').click();
await page.locator('[data-luna-project="Elsewhere"]').click();
await page.locator('[data-luna-folder-name]').waitFor({ timeout: 8000 });
await page.locator('[data-luna-file="Elsewhere workbook"]').waitFor({ timeout: 8000 });
ok((await page.locator('[data-luna-chats] [data-conv="luna-c-b"]').count()) === 1, '4 the other project has its own chat');
ok((await page.locator('[data-luna-chats] [data-conv="luna-c-a"]').count()) === 0, '4 Packing week’s chat does not leak into Elsewhere');
ok((await page.locator('[data-luna-library] [data-luna-file="Elsewhere workbook"]').count()) === 1, '4 Elsewhere’s library');
ok((await page.locator('[data-luna-library] [data-luna-file="Packing workbook"]').count()) === 0, '4 Packing week’s file does not leak into Elsewhere');

/* phone: the same drawer, New project, a folder’s chats and library */
await page.locator('[data-luna-folder-back]').click();
await page.locator('[data-luna-new-project]').waitFor({ timeout: 8000 });
await page.setViewportSize({ width: 390, height: 844 });
await t.go('#/ai', 2600);
await page.locator('.ai-empty-g').waitFor({ timeout: 20000 });
await page.locator('.nv-top [data-ai-chats]').click();
await page.locator('.sheet-scrim[data-env-drawer="left"] [data-luna-drawer]').waitFor({ timeout: 8000 });
await page.locator('.sheet-scrim[data-env-drawer="left"] [data-luna-project="Packing week"]').waitFor({ timeout: 15000 });
ok((await page.locator('.sheet-scrim[data-env-drawer="left"] [data-luna-new-project]').count()) === 1, '5 phone ☰: New workspace is in the left drawer');
await page.locator('.sheet-scrim[data-env-drawer="left"] [data-luna-project="Packing week"]').click();
await page.locator('.sheet-scrim[data-env-drawer="left"] [data-luna-folder-name]').waitFor({ timeout: 8000 });
ok((await page.locator('.sheet-scrim[data-env-drawer="left"] [data-luna-chats] [data-conv="luna-c-a"]').count()) === 1, '5 phone: the folder’s chat');
ok((await page.locator('.sheet-scrim[data-env-drawer="left"] [data-luna-library] [data-luna-file="Packing workbook"]').count()) === 1, '5 phone: the folder’s library');
ok((await t.wide()) <= 0, '5 phone: nothing off the side');
await page.keyboard.press('Escape');

await page.setViewportSize({ width: 1440, height: 900 });
await t.go('#/ai', 2000);
ok((await page.locator('[data-luna-artifacts] details[open]').count()) === 1, '6 Artifacts is open for direct access');
await page.locator('[data-html-artifact="html-a"] .ai-conv-more').click();
await page.locator('[data-html-artifact="html-a"] [role="menuitem"]').filter({ hasText: 'Rename' }).click();
await page.locator('[data-html-artifact="html-a"] input').fill('Packing visual');
await page.locator('[data-html-artifact="html-a"] button[type="submit"]').click();
await page.locator('[data-html-artifact="html-a"]').getByText('Packing visual').waitFor({ timeout: 8000 });
ok((await page.locator('[data-html-artifact="html-a"]').getByText('Packing visual').count()) === 1, '6 HTML artifact can be renamed');
await page.locator('[data-html-artifact="html-a"] .ai-conv').click();
const preview = page.frameLocator('[data-artifact-preview="html-a"]');
await preview.locator('h1').waitFor({ timeout: 8000 });
ok((await preview.locator('h1').innerText()) === 'Packing HTML', '6 HTML artifact opens as the saved page');
if (await page.locator('.ai-work-x').count()) await page.locator('.ai-work-x').click();

await t.go('#/ai?c=luna-c-inbox', 2000);
await page.locator('.ai-box').waitFor({ state: 'visible', timeout: 20000 });
await page.locator('.ai-box').fill('move that into a workspace called Night shift');
await page.getByRole('button', { name: 'Send', exact: true }).click();
await page.locator('.ai-turn.is-colleague').filter({ hasText: /Night shift/ }).waitFor({ timeout: 12000 });
ok(/Chat and its files moved to Night shift/.test(await page.locator('.ai-turn.is-colleague').filter({ hasText: /Night shift/ }).innerText()), '6b “move that into a workspace” — done in the app');
ok((await page.locator('[data-ai-code]').count()) >= 1, '6b the move is done in the app — no gateway');
if (await page.locator('[data-luna-folder-back]').count()) await page.locator('[data-luna-folder-back]').click();
await page.locator('[data-luna-project="Night shift"]').waitFor({ timeout: 8000 });
await page.locator('[data-luna-project="Night shift"]').click();
await page.locator('[data-luna-folder-name]').waitFor({ timeout: 8000 });
ok((await t.words('[data-luna-folder-name]')) === 'Night shift', '6b the named workspace opens');
ok((await page.locator('[data-luna-chats] [data-conv="luna-c-inbox"]').count()) === 1, '6b the chat is in that workspace');
await page.locator('[data-luna-library] [data-luna-file="Inbox workbook"]').waitFor({ timeout: 8000 });
ok((await page.locator('[data-luna-library] [data-luna-file="Inbox workbook"]').count()) === 1, '6b its file is in that library');
await page.locator('[data-luna-folder-back]').click();

await t.go('#/ai', 1600);
if (await page.locator('[data-luna-folder-back]').count()) await page.locator('[data-luna-folder-back]').click();
await page.locator('[data-conv-more="luna-c-loose"]').click();
await page.locator('select[aria-label="Move “Loose chat” to workspace"]').selectOption('luna-p-a');
await page.locator('[data-luna-folder-name]').waitFor({ timeout: 8000 });
ok((await page.locator('[data-luna-chats] [data-conv="luna-c-loose"]').count()) === 1, '7 moving a chat puts it in the chosen workspace');
await page.locator('[data-luna-library] [data-luna-file="Loose workbook"]').waitFor({ timeout: 8000 }).catch(() => {});
ok((await page.locator('[data-luna-library] [data-luna-file="Loose workbook"]').count()) === 1, '7 its attached file moves with it');

await page.locator('[data-conv-more="luna-c-a"]').click();
page.once('dialog', d => void d.accept());
await page.locator('[data-conv-delete="luna-c-a"]').click();
ok((await page.locator('[data-luna-artifacts] details[open]').count()) === 1, '8 Artifacts remains visible after removing a chat');
ok((await page.locator('[data-luna-artifacts]').getByText('Packing visual').count()) === 1, '8 removing a chat keeps its saved HTML in Artifacts');
await page.locator('[data-html-artifact="html-a"] .ai-conv-more').click();
page.once('dialog', d => void d.accept());
await page.locator('[data-html-artifact="html-a"] [role="menuitem"]').filter({ hasText: 'Delete' }).click();
await page.locator('[data-html-artifact="html-a"]').waitFor({ state: 'detached', timeout: 8000 });
ok((await page.locator('[data-html-artifact="html-a"]').count()) === 0, '8 HTML artifact can be deleted without deleting its conversation');

await page.evaluate(async () => {
  const db = await import('/src/db.ts');
  const { newConversation } = await import('/src/colleague/conversation.ts');
  const at = Date.now();
  await db.putStudy(newConversation({ id: 'luna-c-foreign', at, name: 'Foreign attachment' }));
  await db.putStudy({ id: 'luna-f-foreign', tool: 'source', name: 'Foreign workbook', facts: { source: { name: 'Foreign workbook', named: 'file', fileName: 'foreign.xlsx', kind: 'workbook', bytes: 10, at, fileId: 'wb-foreign', status: 'ready', client: 'Another customer', conversationId: 'luna-c-foreign' } }, uses: [], startedAt: at, createdAt: at, updatedAt: at });
});
await page.locator('[data-luna-folder-back]').click();
await page.locator('[data-conv-more="luna-c-foreign"]').click();
await page.locator('select[aria-label="Move “Foreign attachment” to workspace"]').selectOption('luna-p-a');
await page.locator('[role="status"]').filter({ hasText: /attached file belongs to another customer/ }).waitFor({ timeout: 8000 });
ok((await page.locator('[data-luna-chats] [data-conv="luna-c-foreign"]').count()) === 1, '9 a foreign attached file blocks a workspace move');

ok(errs.length === 0, `no page errors (${errs.slice(0, 2).join(' | ')})`);
await t.finish('Luna Workspaces — isolated chats and files, conversational move into a named workspace, moved attachments, HTML-only artifacts, rename and delete.');
