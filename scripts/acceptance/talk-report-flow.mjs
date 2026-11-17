/* Generated Line Talk content opens as a report; editing is optional and one export also keeps the saved PDF. */
import { mkdirSync } from 'node:fs';
import { openApp } from '../lib/tocBrowser.mjs';
const t = await openApp({ width: 390, height: 844 }); const { page: p, ok } = t;
await t.go('#/room');
const id = await p.evaluate(async () => {
  const db = await import('/src/db.ts'); const { addLineToFactory } = await import('/src/lib/lines.ts'); const line = await addLineToFactory('Report flow line');
  const now = Date.now(), id = crypto.randomUUID();
  await db.putStudy({ id, tool: 'talk', name: 'Morning walk', workspaceId: line.id, facts: { turns: [
    { id: 'note', kind: 'typed', at: now, text: 'Guard catches the film. Dave will replace it tomorrow.' },
    { id: 'report', kind: 'reply', at: now + 1, text: 'Here is the report.', doc: { kind: 'line-walk', title: 'Morning line walk', status: { state: 'problem', line: 'Film catching on the infeed guard' }, sections: [
      { heading: 'What was seen', text: 'A walk along the infeed.', points: [{ text: 'Film catches the guard.', basis: 'observed', owner: 'Dave', due: '' }], photos: [] },
    ] } },
  ] }, uses: [], startedAt: now, createdAt: now, updatedAt: now }); return id;
});
await t.go(`#/talk/${id}?doc=report`); await p.locator('.tk-docv').waitFor();
ok(await p.locator('.tk-docv input, .tk-docv textarea, .tk-docv select').count() === 0, 'a generated report opens for reading without compulsory form fields');
ok((await p.locator('.tk-docv').innerText()).includes('Film catches the guard.'), 'the supplied conversation content is already in the report');
const first = await t.pdfText(() => p.getByRole('button', { name: 'Download PDF', exact: true }).click(), 'talk-ready-report');
ok(first.includes('Morning line walk') && first.includes('Film catches the guard.') && first.includes('Dave'), 'one Download PDF exports the supplied content and owner');
const copies = () => p.evaluate(async id => (await (await import('/src/db.ts')).getStudy(id)).facts.turns.find(x => x.id === 'report').pdfs?.length || 0, id);
ok(await copies() === 1, 'export also keeps the PDF copy in the app');
await p.getByRole('button', { name: 'Edit report', exact: true }).click();
await p.getByRole('textbox', { name: 'Title', exact: true }).fill('Morning line walk — reviewed');
await p.getByRole('button', { name: 'Done editing', exact: true }).click();
await p.getByRole('heading', { name: 'Morning line walk — reviewed', exact: true }).waitFor();
ok(await p.locator('.tk-docv input, .tk-docv textarea').count() === 0, 'Done editing saves and returns to report reading');
await p.reload(); await p.getByRole('heading', { name: 'Morning line walk — reviewed', exact: true }).waitFor();
ok(await copies() === 1, 'editing and reload preserve the earlier PDF');
const shots = process.env.UI_REVIEW_SHOTS; if (shots) mkdirSync(shots, { recursive: true });
for (const width of [360, 820, 1440]) {
  await p.setViewportSize({ width, height: 1000 });
  ok(await t.wide() <= 1, `the report fits ${width}px`);
  if (shots) await p.screenshot({ path: `${shots}/talk-report-${width}.png`, fullPage: true });
}
await p.locator('[data-fold="talk-saved-pdfs"] > .fold-h > .fold-toggle').click();
ok(await p.locator('[data-saved-pdfs] [data-pdf]').count() === 1, 'saved versions remain available in their own section');
await p.getByRole('button', { name: 'Back to the talk', exact: false }).click();
await p.locator('[data-talk]').waitFor();
ok(!p.url().includes('?doc='), 'Back to the talk returns directly to the conversation');
await t.finish('Accepted: Line Talk report reading, optional editing and direct PDF export');
