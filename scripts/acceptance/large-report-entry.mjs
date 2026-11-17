/* A large project's report must wait for its own controls, without mistaking its Reports tab for the Factory paper chooser. */
import { openApp, BASE } from '../lib/tocBrowser.mjs';
import { openSeedPage } from '../lib/seedPage.mjs';
import { find } from '../lib/pageHeader.mjs';
const t = await openApp(); const { page: p, ok } = t;
await openSeedPage(p, BASE);
const job = await p.evaluate(async () => (await import('/src/dev/reportSeeds.ts')).seedReportJob('huge'));
await p.goto(`${BASE}/#/project/${job.projectId}/report`, { waitUntil: 'domcontentloaded', timeout: 60000 });
await (await find(p, 'Report', 'Status — 1 page', p.locator('body'))).click();
ok(p.url().endsWith(`/project/${job.projectId}/report`), 'report entry keeps the selected project and report page');
const text = await t.pdfText(async () => (await find(p, 'Report', 'Download', p.locator('body'))).click(), 'large-status');
ok(/Line 2.*complete rebuild/i.test(text) && /status report/i.test(text), 'the large project’s status PDF downloads and contains its title');
await t.finish('Accepted: first entry into a large project report and real PDF download');
