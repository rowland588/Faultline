/* Pictures of the main screens at desk and phone (the frontend workstream's own check, not part of the gate). */
import { openApp } from './scripts/lib/tocBrowser.mjs';
const out = process.argv[2]; const tag = process.argv[3] ?? 'shot';
const pages = (process.argv[4] ?? 'today,ai,room,line,tools,project').split(',');
for (const [w, h, dev] of [[1440, 900, 'desk'], [390, 844, 'phone']]) {
  const t = await openApp({ width: w, height: h });
  await t.seed();
  const ids = await t.page.evaluate(async () => { const db = await import('/src/db.ts'); const ws = await db.listWorkspaces(); const ps = await (await import('/src/db/projects.ts')).allProjects(); return { line: ws[0]?.id, project: ps[0]?.id }; });
  /* a conversation with work in it: on a line, a turn each way, a point noted */
  const cw = await t.page.evaluate(async line => {
    const c = await import('/src/colleague/conversation.ts'); const db = await import('/src/db.ts');
    const id = 'shot-work'; const now = Date.now();
    const st = c.newConversation({ id, at: now, name: 'The bagger — lost time', thread: { id: 'th1', title: 'The bagger on Line 7 losing time', scope: { lineId: line, machine: 'Bagger' } } });
    st.facts.threads[0].points = [{ id: 'p1', kind: 'question', text: 'Is it the film or the bag opening?', at: now }, { id: 'p2', kind: 'assumption', text: 'About an hour a shift — the operators reckon', at: now }];
    st.facts.threads[0].objective = 'Find where the bagger loses its time';
    st.facts.turns = [{ id: 't1', at: now - 60000, who: 'You', kind: 'typed', text: 'We are losing quite a bit of time around the bagger on Line 7.' },
      { id: 't2', at: now - 50000, who: 'Faultline', kind: 'reply', text: 'Line 7 has 48 minutes of stops timed in the last four weeks, the Bagger most. Shall we time its stops for a shift so we know where the hour goes — film jams, bags not opening, or something else?' }];
    await db.putStudy(st); return id;
  }, ids.line);
  const route = { aiwork: `#/ai?c=${cw}`, today: '#/today', ai: '#/ai', room: '#/room', line: `#/lines/${ids.line}`, tools: '#/tools', project: `#/project/${ids.project}`, story: '#/', voice: '#/ai?voice=1' };
  for (const p of pages) {
    await t.go(route[p] ?? p, 1800);
    await t.page.screenshot({ path: `${out}/${tag}-${p.replace(/[^a-z0-9]/gi, '_')}-${dev}.png`, fullPage: false });
  }
  await t.browser.close();
}
console.log('done');
