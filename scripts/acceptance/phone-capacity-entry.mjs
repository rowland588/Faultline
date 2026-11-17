/* Regression from Rowland: a machine name must remain editable on a phone, including pauses and keyboard-sized viewports. */
import { readFileSync } from 'node:fs';
import { openApp } from '../lib/tocBrowser.mjs';
const t = await openApp({ width: 390, height: 844, mobile: true });
const { page: p, ok } = t;
await t.go('#/room');
const fixture = process.env.CAPACITY_PHONE_FIXTURE ? JSON.parse(readFileSync(process.env.CAPACITY_PHONE_FIXTURE, 'utf8')) : null;
const target = await p.evaluate(async fixture => {
  const db = await import('/src/db.ts');
  const { addLineToFactory } = await import('/src/lib/lines.ts');
  const { blankStation, EMPTY_CAPACITY } = await import('/src/tools/linebalance/capacity.ts');
  const { openOf } = await import('/src/screens/LineToolsScreen.tsx');
  const line = await addLineToFactory('Phone capacity');
  const now = Date.now(); const station = blankStation(crypto.randomUUID(), 'machine', true);
  const s = { id: crypto.randomUUID(), projectId: '', workspaceId: line.id, product: 'Phone entry', capacity: fixture?.capacity || { ...EMPTY_CAPACITY, stations: [station] }, marks: [], sort: 0, createdAt: now, updatedAt: now };
  if (fixture?.assets) await db.patchWorkspaceRecord(line.id, { assets: fixture.assets });
  await db.putStandard(s); return { id: s.id, href: openOf(s, 'balance'), line: line.id };
}, fixture);
await t.go(`#${target.href}`);
await p.locator('.capx').waitFor();
const workings = p.getByRole('button', { name: 'Show the workings and set-up', exact: true });
if (await workings.count()) await workings.click();
const input = p.getByLabel('Station 1 name', { exact: true });
await input.tap();
for (const c of 'Wrapper') { await input.pressSequentially(c); await p.waitForTimeout(850); }
ok(await input.inputValue() === 'Wrapper', 'a paused machine name survives each automatic save');
ok(await input.evaluate(e => document.activeElement === e), 'the name keeps keyboard focus while saving');
await p.setViewportSize({ width: 390, height: 390 });
await input.pressSequentially(' infeed', { delay: 100 }); await p.waitForTimeout(1000);
ok(await input.inputValue() === 'Wrapper infeed', 'typing continues with a phone keyboard-sized viewport');
await input.press('Tab');
await p.reload();
await p.locator('.capx').waitFor();
const more = p.getByRole('button', { name: 'Show the workings and set-up', exact: true }); if (await more.count()) await more.click();
ok(await p.getByLabel('Station 1 name', { exact: true }).inputValue() === 'Wrapper infeed', 'the machine name persists after reload');
await t.finish('Accepted: phone capacity machine-name entry and persistence');
