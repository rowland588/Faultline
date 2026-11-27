/* AI MODE'S CAPABILITIES (docs/AI-MODE.md) — the registry and the schemas agree; a call is checked, allowed and, if it writes,
 * confirmed; nothing deletes or verifies; a line's answer holds only that line; a failure is a sentence, never a throw; and every
 * read says what the page's own reader says, on records seeded in a fake IndexedDB. */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { CAPABILITY_SCHEMAS } from '../schemas';
import type { CapCtx } from '../types';

beforeEach(() => {
  vi.stubGlobal('indexedDB', new IDBFactory());
  vi.resetModules();
});

/* the db and the capabilities from one fresh module graph, so both see the same database */
const fresh = async () => ({ db: await import('../../db'), reg: await import('../registry'), lines: await import('../../lib/lines') });
const ctx = (o: Partial<CapCtx> = {}): CapCtx => ({ now: Date.now(), ...o });
const call = (name: string, input: unknown) => ({ id: `c-${name}`, name, input });

const DAY = 86_400_000;

async function seedTwoLines() {
  const { db, reg, lines } = await fresh();
  const a = await lines.addLineToFactory('Line A');
  const b = await lines.addLineToFactory('Line B');
  await db.updateWorkspace({ ...a, clientName: 'Acme Foods' });
  await db.updateWorkspace({ ...b, clientName: 'Brook Dairy' });
  const t = Date.now();
  await db.addSnag({ id: 'pa1', workspaceId: a.id, problem: 'Wrapper film tears on the splice', status: 'open', priority: 'critical', raisedAt: t, updatedAt: t, dueAt: t - 3 * DAY, owner: 'Sam' });
  await db.addSnag({ id: 'pa2', workspaceId: a.id, problem: 'Labeller skews the label', status: 'open', priority: 'low', raisedAt: t, updatedAt: t });
  await db.addSnag({ id: 'pb1', workspaceId: b.id, problem: 'Filler drips on the seal', status: 'open', priority: 'high', raisedAt: t, updatedAt: t });
  await db.putStudy({ id: 'sa', tool: 'capability', name: 'Seal strength A', workspaceId: a.id, agreed: { readings: { kind: 'limits', unit: 'N', nominal: 20, lower: 15, upper: 25, count: 30 } }, facts: { readings: [] }, uses: [], startedAt: t, createdAt: t, updatedAt: t });
  await db.putStudy({ id: 'sb', tool: 'capability', name: 'Seal strength B', workspaceId: b.id, agreed: { readings: { kind: 'limits', unit: 'N', nominal: 20, lower: 15, upper: 25, count: 30 } }, facts: { readings: [] }, uses: [], startedAt: t, createdAt: t, updatedAt: t });
  return { db, reg, a, b };
}

describe('the registry and the schemas', () => {
  it('carry the same names and kinds, every schema an object refusing other fields', async () => {
    const { reg } = await fresh();
    expect(reg.CAPABILITIES.map(c => [c.name, c.kind]).sort()).toEqual(CAPABILITY_SCHEMAS.map(s => [s.name, s.kind]).sort());
    const objects = (s: unknown): boolean => {
      if (!s || typeof s !== 'object') return true;
      const o = s as Record<string, unknown>;
      if (o.type === 'object' && o.properties && o.additionalProperties !== false) return false;
      return Object.values(o).every(v => (Array.isArray(v) ? v.every(objects) : objects(v)));
    };
    for (const s of CAPABILITY_SCHEMAS) { expect((s.input_schema as { type: string }).type).toBe('object'); expect(objects(s.input_schema)).toBe(true); }
  }, 60_000);   /* the first to load the whole module graph */

  /* ONE NAMED EXCEPTION, BY ROWLAND'S WORD. The rule stands — the AI never deletes a record, never puts one away, never marks
     evidence verified (docs/DIRECTION.md, rule 3) — and no capability may be named for any of them. On 21 November 2026 an
     archive_customer was built, refused here, taken out, and the rule put to him: "Let luna archive a customer on a confirm card."
     So that one name is allowed, on terms this test holds: it is a write (it never runs without the person's yes). What it does and
     does not touch is held by visits.test (nothing deleted, only the customer's archive stamp, undone by continue_customer).
     A new name matching the pattern is a FAILURE — it is never added to this list without his word, quoted and dated here. */
  const BY_ROWLANDS_WORD: ReadonlyMap<string, string> = new Map([
    ['archive_customer', '21 November 2026 — "Let luna archive a customer on a confirm card"'],
  ]);
  it('nothing deletes, removes, archives or verifies — but a customer, archived on a confirm card by Rowland’s word; no write or note accepts verified', async () => {
    const { reg } = await fresh();
    const named = reg.CAPABILITIES.map(c => c.name).filter(n => /delete|remove|archive|verif/.test(n));
    expect(named).toEqual([...BY_ROWLANDS_WORD.keys()]);
    for (const n of named) expect(reg.capabilityByName(n)?.kind).toBe('write');
    expect(JSON.stringify(CAPABILITY_SCHEMAS)).not.toContain('"verified"');
    const r = reg.capabilityByName('raise_problem')?.validate({ lineId: 'w', words: 'x', priority: 'low', how: 'verified' });
    expect(r?.ok).toBe(false);
    const o = reg.capabilityByName('record_observation')?.validate({ text: 'x', how: 'verified' });
    expect(o?.ok).toBe(false);
    if (o && !o.ok) expect(o.why).toMatch(/how it is known/i);
  });

  it('the two question tools carry the same `derive`, and neither grows past its size without this number moving (22 November)', () => {
    const of = (n: string) => CAPABILITY_SCHEMAS.find(x => x.name === n) as unknown as { input_schema: { properties: Record<string, unknown> } };
    const qw = of('query_workbook'), qd = of('query_data');
    expect(qw.input_schema.properties.derive).toBeTruthy();
    expect(qw.input_schema.properties.derive).toEqual(qd.input_schema.properties.derive);
    /* …and the same `parts`, `having`, `top`, and `calcs` (22 November, A2 and A6; A4 adds lookups and calcs on query_data too) */
    for (const k of ['parts', 'having', 'top']) {
      expect(qw.input_schema.properties[k]).toBeTruthy();
      expect(qw.input_schema.properties[k]).toEqual(qd.input_schema.properties[k]);
    }
    expect(qw.input_schema.properties.calcs).toBeTruthy();
    expect(qd.input_schema.properties.calcs).toBeTruthy();
    expect(qd.input_schema.properties.lookups).toBeTruthy();
    /* A CEILING THAT ONLY COMES DOWN, or moves with a sentence saying what Luna can ask for that she could not (docs/LUNA-ANALYSIS.md):
       these two are sent with every ask. 22 November: +726 and +782 characters for `derive` — a rate, a share, a change, a running
       total and a rank in the question itself, where each was a work_out a group. The same day, +533 on query_workbook for a
       lookup on up to three keys together, the other sheet brought together by its key first (sum, avg, min, max, count, only) —
       "how much of the shortfall do the stops explain" as one exact figure where a range was given. Then +1,436 and +1,301 for
       three things she could not ask at all: a PART of a date as a column (A2 — "are Mondays worse?", "which hour?", by quarter;
       and a stop tied to what was made on its DAY when the log holds a start time), a condition on a group's figure (A6 —
       "which lines lost more than an hour?", with how many did), and the top few WITHIN each group (A6 — "the top three reasons on
       each line", every line there, where one cut gave the fifty biggest pairs with whole lines missing). 23 November, A4: lookups
       and calcs on query_data — one engine for every source (`source` on a lookup). 23 November, A7: median, p10, p25, p75, p90,
       stdev on both question tools (+124 on query_workbook, +127 on query_data). */
    expect(JSON.stringify(qw).length).toBeLessThanOrEqual(7242);
    expect(JSON.stringify(qd).length).toBeLessThanOrEqual(6913);
  });

  it('validate refuses bad input with a sentence', async () => {
    const { reg } = await fresh();
    const cases: [string, unknown][] = [['line_state', {}], ['line_state', { lineId: 'w', extra: 1 }], ['start_timer', { minutes: 500, label: 'x' }], ['open_page', { href: 'https://evil' }], ['raise_problem', { lineId: 'w', words: 'x', priority: 'urgent', how: 'observed' }], ['update_problem', { problemId: 'p', due: '14/11/2026' }], ['tool_records', {}]];
    for (const [name, input] of cases) {
      const v = reg.capabilityByName(name)?.validate(input);
      expect(v?.ok, name).toBe(false);
      if (v && !v.ok) expect(v.why).toMatch(/^[A-Z“].+[.—]/);
    }
  });
});

describe('runCall', () => {
  it('refuses a write that is not confirmed, and a capability it does not know', async () => {
    const { reg, a } = await seedTwoLines();
    const r = await reg.runCall(ctx(), call('raise_problem', { lineId: a.id, words: 'Jam at the infeed', priority: 'high', how: 'reported' }), { confirmed: false });
    expect(r.ok).toBe(false);
    expect((await (await import('../../db')).listAllSnags()).some(s => s.problem.startsWith('Jam at the infeed'))).toBe(false);
    expect((await reg.runCall(ctx(), call('delete_line', {}), { confirmed: true })).ok).toBe(false);
  }, 30_000);

  it('a client may read everything and write nothing', async () => {
    const { reg, a } = await seedTwoLines();
    const client = ctx({ level: 'client' });
    for (const c of reg.CAPABILITIES.filter(x => x.kind === 'read')) {
      const input = c.name === 'find' || c.name === 'resolve' || c.name === 'resolve_record' || c.name === 'resolve_source' || c.name === 'plan_work' || c.name === 'plan_investigation' ? { words: 'line' } : c.name === 'find_person' ? { who: 'Sam' } : c.name === 'describe_connection' ? { kind: 'workbook' } : c.name === 'source_fields' ? { source: `stops:${a.id}` } : c.name === 'understand_task' ? { words: 'losing production time', lineId: a.id } : c.name === 'tool_intel' ? { tool: 'stops' } : c.name === 'assess_evidence' ? { tool: 'stops', lineId: a.id } : c.name === 'pareto' ? { lineId: a.id } : c.name === 'run_analysis' ? { question: 'sure', name: 'Fill', values: [1, 2, 3, 4, 5, 6, 7, 8] } : c.name === 'fishbone_state' ? { lineId: a.id } : c.name === 'line_state' || c.name === 'outcomes' || c.name === 'history' ? { lineId: a.id } : c.name === 'tool_records' ? { lineId: a.id } : c.name === 'recall' ? { words: 'film' } : c.name === 'project_state' || c.name === 'run_calculator' || c.name === 'draft_state' || c.name === 'draft_email' || c.name === 'read_record' || c.name.startsWith('workbook_') || c.name === 'query_workbook' || c.name === 'query_data' || c.name === 'explain_change' || c.name === 'explain_variance' || c.name === 'join_results' || c.name === 'refresh_report' || c.name === 'find_in_document' || c.name === 'document_look' || c.name === 'draft_pm_list' || c.name === 'list_procedures' || c.name === 'resolve_report_section' ? null : {};
      if (input === null) continue;
      expect((await reg.runCall(client, call(c.name, input), { confirmed: false })).ok, c.name).toBe(true);
    }
    const writes: [string, unknown][] = [
      ['raise_problem', { lineId: a.id, words: 'x', priority: 'low', how: 'observed' }], ['update_problem', { problemId: 'pa1', owner: 'Jo' }],
      ['start_project', { name: 'P', method: 'pdca', lineIds: [a.id] }], ['save_calculation', { key: 'kanban', inputs: {} }], ['add_photo_to_problem', { problemId: 'pa1', photoKey: 'k' }],
      ['link_to_project', { projectId: 'nope', problemId: 'pa1' }],
      ['add_department', { area: 'Dispatch' }], ['file_photo', { photoKey: 'k', to: 'line', lineId: a.id }],
      ['start_measurement', { tool: 'stops', lineId: a.id }], ['note_knowledge', { lineId: a.id, says: 'It is the film', known: 'reported' }], ['draw_diagram', { set: 'flow', capture: { title: 'x', steps: [{ what: 'Cook', kind: 'operation', time: 2, timeUnit: 'minutes', dist: null, distUnit: '' }] } }],
      ['send_email', { to: 'john@example.com' }],
    ];
    for (const [name, input] of writes) {
      const r = await reg.runCall(client, call(name, input), { confirmed: true });
      expect(r.ok, name).toBe(false);
      if (!r.ok) expect(r.why).toMatch(/read/);
    }
  }, 60_000);

  it('a failed run is a sentence, never a throw', async () => {
    const { reg } = await seedTwoLines();
    const u = await reg.runCall(ctx(), call('update_problem', { problemId: 'nope', owner: 'Jo' }), { confirmed: true });
    expect(u.ok).toBe(false);
    if (!u.ok) expect(u.why).toMatch(/no problem with that id/);
    const { CALCS } = await import('../../tools/calc/registry');
    const def = CALCS.find(c => c.inputs.some(f => !f.optional && !f.hidden && f.kind === 'number'));
    if (!def) throw new Error('no calculator with a needed number');
    const r = await reg.runCall(ctx(), call('run_calculator', { key: def.key, inputs: {} }), { confirmed: false });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.why).toMatch(/Give “/);
    expect((await reg.runCall(ctx(), call('run_calculator', { key: 'no-such', inputs: {} }), { confirmed: false })).ok).toBe(false);
    expect((await reg.runCall(ctx(), call('line_state', { lineId: 'nope' }), { confirmed: false })).ok).toBe(false);
    expect((await reg.runCall(ctx(), call('set_focus', { title: 'x' }), { confirmed: false })).ok).toBe(false);
  }, 30_000);
});

describe('the reads say what the pages say, and a line holds only its own', () => {
  it('list_problems on line A: the register’s sentence of those problems, none of line B', async () => {
    const { db, reg, a, b } = await seedTwoLines();
    const r = await reg.runCall(ctx(), call('list_problems', { lineId: a.id }), { confirmed: false });
    if (!r.ok) throw new Error(r.why);
    const { snagsReading } = await import('../../lib/snagsReport');
    const mine = (await db.listAllSnags()).filter(s => s.workspaceId === a.id);
    expect(r.says).toBe(snagsReading({ snags: mine, register: true, became: new Map(), lineName: () => 'Line A', jobName: () => undefined }).says);
    expect(JSON.stringify(r)).not.toContain('Filler drips');
    expect(r.refs.map(x => x.id).sort()).toEqual(['pa1', 'pa2']);
    const late = await reg.runCall(ctx(), call('list_problems', { which: 'late' }), { confirmed: false });
    if (!late.ok) throw new Error(late.why);
    expect(late.refs.map(x => x.id)).toEqual(['pa1']);
    expect(b.id).not.toBe(a.id);
  }, 30_000);

  it('line_state and tool_records on line A carry nothing of line B', async () => {
    const { reg, a } = await seedTwoLines();
    const s = await reg.runCall(ctx(), call('line_state', { lineId: a.id }), { confirmed: false });
    if (!s.ok) throw new Error(s.why);
    const said = JSON.stringify(s);
    expect(said).toContain('Wrapper film tears');
    expect(said).not.toContain('Filler drips');
    expect(said).not.toContain('Line B');
    expect(s.says).toContain('2 problems open');
    const t = await reg.runCall(ctx(), call('tool_records', { lineId: a.id }), { confirmed: false });
    if (!t.ok) throw new Error(t.why);
    expect(JSON.stringify(t)).toContain('Seal strength A');
    expect(JSON.stringify(t)).not.toContain('Seal strength B');
    const { studyLine } = await import('../../lib/studyLinks');
    const { getStudy } = await import('../../db');
    expect((t.data as { says: string }[])[0].says).toBe(studyLine((await getStudy('sa'))!).text);
  }, 30_000);

  it('find with a client finds only that client’s lines and their problems', async () => {
    const { reg } = await seedTwoLines();
    const r = await reg.runCall(ctx(), call('find', { words: 'line', client: 'Acme Foods' }), { confirmed: false });
    if (!r.ok) throw new Error(r.why);
    expect(r.refs.map(x => x.label)).toContain('Line A');
    expect(r.refs.map(x => x.label)).not.toContain('Line B');
    const f = await reg.runCall(ctx(), call('find', { words: 'filler', client: 'Acme Foods' }), { confirmed: false });
    if (!f.ok) throw new Error(f.why);
    expect(f.refs).toEqual([]);
    const all = await reg.runCall(ctx(), call('find', { words: 'filler' }), { confirmed: false });
    if (!all.ok) throw new Error(all.why);
    expect(all.refs.some(x => x.kind === 'problem' && x.id === 'pb1' && x.href === '/snags?open=pb1')).toBe(true);
  }, 30_000);

  it('overdue_actions on line A: the tracker’s sentence, the late one Sam’s', async () => {
    const { db, reg, a } = await seedTwoLines();
    const r = await reg.runCall(ctx(), call('overdue_actions', { lineId: a.id }), { confirmed: false });
    if (!r.ok) throw new Error(r.why);
    const { trackerRows, trackerSays } = await import('../../line/actions/lineActions');
    expect(r.says).toBe(trackerSays(trackerRows(await db.listAllSnags(), a.id, Date.now()), 'Line A'));
    expect((r.data as { late: { who: string }[] }).late.map(x => x.who)).toEqual(['Sam']);
    expect(JSON.stringify(r)).not.toContain('Filler drips');
  }, 30_000);

  it('Luna reads real line tasks beside problems, with exact action links and no other-line/completed work',async()=>{
    const {db,reg,a,b}=await seedTwoLines();const now=Date.now();const due=new Date(now-DAY).toISOString().slice(0,10);
    const base={id:'actual-task',standalone:true,workspaceId:a.id,what:'Align and verify guide',why:'Film tears',where:'Wrapper',who:'Priya',when:'',due,state:'todo' as const,createdAt:now,updatedAt:now};
    await db.putPaceTodo(base);await db.putPaceTodo({...base,id:'other-task',workspaceId:b.id,what:'Other line task'});await db.putPaceTodo({...base,id:'done-task',state:'done',what:'Already completed task'});
    const answer=await reg.runCall(ctx(),call('overdue_actions',{lineId:a.id}),{confirmed:false});if(!answer.ok)throw new Error(answer.why);
    expect(JSON.stringify(answer.data)).toContain('Align and verify guide');
    expect(JSON.stringify(answer.data)).not.toContain('Other line task');expect(JSON.stringify(answer.data)).not.toContain('Already completed task');
    expect(answer.refs).toContainEqual({kind:'action',id:'actual-task',label:'Align and verify guide',href:'/actions?open=actual-task'});
    expect(answer.says).toContain('3 open');
  },30_000);

  it('list_calculators and run_calculator say what the calculator says', async () => {
    const { reg } = await fresh();
    const { CALCS } = await import('../../tools/calc/registry');
    const { runCalc } = await import('../../tools/calc/calc');
    const l = await reg.runCall(ctx(), call('list_calculators', {}), { confirmed: false });
    if (!l.ok) throw new Error(l.why);
    expect((l.data as { key: string }[]).map(x => x.key)).toEqual(CALCS.map(c => c.key));
    for (const def of CALCS) {
      const ex = def.examples[0];
      if (!ex) continue;
      const r = await reg.runCall(ctx(), call('run_calculator', { key: def.key, inputs: ex.inputs }), { confirmed: false });
      if (!r.ok) throw new Error(`${def.key}: ${r.why}`);
      expect((r.data as { sentence: string }).sentence, def.key).toBe(runCalc(def, ex.inputs).result?.sentence);
      expect((r.data as { sentence: string }).sentence, def.key).toBe(ex.expect.sentence);
    }
  }, 30_000);
});

describe('the writes write what the page writes', () => {
  it('raise_problem: a problem the register lists, with its words and how it is known, the machine on its line', async () => {
    const { db, reg, a } = await seedTwoLines();
    const input = { lineId: a.id, words: 'Infeed jams on the 2 kg bags', machine: 'Infeed', priority: 'high', how: 'reported', owner: 'Priya' };
    const p = await reg.previewCall(ctx(), call('raise_problem', input));
    expect(p.ok && p.says).toMatch(/Raise a High problem on Line A, on the Infeed/);
    const r = await reg.runCall(ctx(), call('raise_problem', input), { confirmed: true });
    if (!r.ok) throw new Error(r.why);
    const s = (await db.listAllSnags()).find(x => x.problem.startsWith('Infeed jams'));
    expect(s?.problem).toBe('Infeed jams on the 2 kg bags Reported by the operators — not yet measured.');
    expect(s?.workspaceId).toBe(a.id);
    expect(s?.owner).toBe('Priya');
    expect((await db.getWorkspace(a.id))?.assets).toContain('Infeed');
  }, 30_000);

  it('update_problem: the owner changed; nothing to change refused', async () => {
    const { db, reg } = await seedTwoLines();
    const r = await reg.runCall(ctx(), call('update_problem', { problemId: 'pa2', owner: 'Jo', status: 'doing' }), { confirmed: true });
    if (!r.ok) throw new Error(r.why);
    const s = await db.getSnag('pa2');
    expect(s?.owner).toBe('Jo');
    expect(s?.status).toBe('in_progress');
    const again = await reg.runCall(ctx(), call('update_problem', { problemId: 'pa2', owner: 'Jo' }), { confirmed: true });
    expect(again.ok).toBe(false);
  }, 30_000);

  it('start_project: a project of that method on that line', async () => {
    const { db, reg, a } = await seedTwoLines();
    const r = await reg.runCall(ctx(), call('start_project', { name: 'Wrapper waste down', method: 'dmaic', lineIds: [a.id] }), { confirmed: true });
    if (!r.ok) throw new Error(r.why);
    const p = (await db.ensureProjects()).find(x => x.name === 'Wrapper waste down');
    expect(p?.method).toBe('dmaic');
    expect((await db.allPaceLines()).filter(l => l.projectId === p?.id).map(l => l.workspaceId)).toEqual([a.id]);
  }, 30_000);

  it('save_calculation: a calculator record on the line, its sentence the calculator’s', async () => {
    const { db, reg, a } = await seedTwoLines();
    const { CALCS } = await import('../../tools/calc/registry');
    const def = CALCS.find(c => c.examples.length) ?? CALCS[0];
    const r = await reg.runCall(ctx(), call('save_calculation', { key: def.key, inputs: def.examples[0].inputs, lineId: a.id, name: 'From the colleague' }), { confirmed: true });
    if (!r.ok) throw new Error(r.why);
    const s = (await db.listStudiesForLine(a.id)).find(x => x.name === 'From the colleague');
    expect(s?.tool).toBe('calc');
    expect(s?.agreed?.calc?.key).toBe(def.key);
    const { calcSays } = await import('../../tools/calc/calc');
    expect(calcSays(s!).text).toBe(def.examples[0].expect.sentence);
  }, 30_000);

  it('add_photo_to_problem: the blob on the problem, once', async () => {
    const { db, reg } = await seedTwoLines();
    await db.putBlob('photo-1', new Blob(['jpeg'], { type: 'image/jpeg' }));
    const r = await reg.runCall(ctx(), call('add_photo_to_problem', { problemId: 'pa1', photoKey: 'photo-1' }), { confirmed: true });
    if (!r.ok) throw new Error(r.why);
    expect((await db.getSnag('pa1'))?.media?.map(m => m.blobKey)).toEqual(['photo-1']);
    expect((await reg.runCall(ctx(), call('add_photo_to_problem', { problemId: 'pa1', photoKey: 'photo-1' }), { confirmed: true })).ok).toBe(false);
    expect((await reg.runCall(ctx(), call('add_photo_to_problem', { problemId: 'pa1', photoKey: 'gone' }), { confirmed: true })).ok).toBe(false);
  }, 30_000);
});

describe('the conversation’s threads', () => {
  it('set_focus makes a thread current and parks the last; record_observation notes on it', async () => {
    const { db, reg } = await fresh();
    const t = Date.now();
    await db.putStudy({ id: 'conv', tool: 'talk', name: 'AI Mode', facts: { colleague: true } as never, uses: [], startedAt: t, createdAt: t, updatedAt: t });
    const c = ctx({ conversationId: 'conv' });
    expect((await reg.runCall(c, call('set_focus', { title: 'Line 3 lost output', scope: { lineId: 'w3' } }), { confirmed: false })).ok).toBe(true);
    expect((await reg.runCall(c, call('record_observation', { text: 'Film tears at every splice', how: 'observed' }), { confirmed: false })).ok).toBe(true);
    const r = await reg.runCall(c, call('set_focus', { title: 'Accumulation conveyor' }), { confirmed: false });
    if (!r.ok) throw new Error(r.why);
    expect(r.says).toContain('“Line 3 lost output” is parked');
    const back = await reg.runCall(c, call('set_focus', { title: 'Something', scope: { lineId: 'w3' } }), { confirmed: false });
    expect(back.ok && back.says).toMatch(/^Back on “Line 3 lost output”/);
    const threads = ((await db.getStudy('conv'))?.facts as { threads: { title: string; status: string; notes: { how: string }[] }[] }).threads;
    expect(threads.map(x => [x.title, x.status])).toEqual([['Accumulation conveyor', 'parked'], ['Line 3 lost output', 'current']]);
    expect(threads[1].notes.map(n => n.how)).toEqual(['observed']);
    expect((await reg.runCall(c, call('park_focus', {}), { confirmed: false })).ok).toBe(true);
  }, 30_000);
});

/* THE CUSTOMER IN HAND, HELD BY THE CODE (22 November, capabilities/hand — the audit's limit 8). "One customer's data never reaches
 * another" was kept for Luna's reads by her instructions; a read that named another customer's line by its id was answered. */
describe('a read never crosses to another customer — the code will not make it', () => {
  const chosen = async (client: string) => (await import('../../lib/activeClient')).setActiveClient(client);
  const BROOK = '“Line B” is Brook Dairy’s, and the customer in hand is Acme Foods — nothing of one customer is read while another is in hand. Switch to Brook Dairy (the top bar, or switch_client) to read it.';

  it('with Acme in hand, every read that names Brook’s line, its study or its source is refused in words — and Acme’s own are answered', async () => {
    const { reg, a, b } = await seedTwoLines();
    await chosen('Acme Foods');
    try {
      for (const [name, input] of [
        ['line_state', { lineId: b.id }], ['list_problems', { lineId: b.id }], ['tool_records', { lineId: b.id }], ['overdue_actions', { lineId: b.id }],
        ['pareto', { lineId: b.id }], ['findings', { lineId: b.id }], ['history', { lineId: b.id }],
        ['query_data', { source: `stops:${b.id}`, title: 'Stops', measures: [{ op: 'count' }] }], ['query_data', { source: `problems:${b.id}`, title: 'Problems', measures: [{ op: 'count' }] }],
      ] as const) {
        const r = await reg.runCall(ctx({ conversationId: 'none' }), call(name, input), { confirmed: false });
        expect([name, r.ok, r.ok ? '' : r.why]).toEqual([name, false, BROOK]);
      }
      /* a record by its own id: Brook's study is Brook's */
      const rec = await reg.runCall(ctx(), call('read_record', { studyId: 'sb' }), { confirmed: false });
      expect(!rec.ok && rec.why).toBe(BROOK.replace('“Line B”', '“Seal strength B”'));
      /* nothing of Brook's is in the refusal — no figure, no problem's words */
      expect(BROOK).not.toMatch(/Filler|drips/);
      /* Acme's own are read as ever */
      const mine = await reg.runCall(ctx(), call('line_state', { lineId: a.id }), { confirmed: false });
      expect(mine.ok).toBe(true);
      expect((await reg.runCall(ctx(), call('read_record', { studyId: 'sa' }), { confirmed: false })).ok).toBe(true);
    } finally { await chosen(''); }
  }, 60_000);

  it('…and a read with no place named lists only the customer in hand’s: problems, what is found, what is late', async () => {
    const { reg } = await seedTwoLines();
    await chosen('Acme Foods');
    try {
      const all = await reg.runCall(ctx(), call('list_problems', { which: 'all' }), { confirmed: false });
      if (!all.ok) throw new Error(all.why);
      expect((all.data as { id: string }[]).map(x => x.id).sort()).toEqual(['pa1', 'pa2']);
      expect(JSON.stringify(all)).not.toContain('Filler drips');
      /* (the app's own pages and tools are everyone's; Brook's problem is not found) */
      const found = await reg.runCall(ctx(), call('find', { words: 'filler' }), { confirmed: false });
      if (!found.ok) throw new Error(found.why);
      expect(found.refs.filter(x => x.kind === 'problem' || x.kind === 'line' || x.kind === 'machine')).toEqual([]);
      expect(JSON.stringify(found)).not.toContain('Filler drips');
      const lines = await reg.runCall(ctx(), call('find', { words: 'line' }), { confirmed: false });
      if (!lines.ok) throw new Error(lines.why);
      expect(lines.refs.map(x => x.label)).toContain('Line A');
      expect(lines.refs.map(x => x.label)).not.toContain('Line B');
      const late = await reg.runCall(ctx(), call('overdue_actions', {}), { confirmed: false });
      if (!late.ok) throw new Error(late.why);
      expect(JSON.stringify(late)).toContain('Wrapper film tears');
      expect(JSON.stringify(late)).not.toContain('Filler drips');
    } finally { await chosen(''); }
  }, 60_000);

  it('with every client shown, each is read — and with Brook in hand it is Acme’s that is refused', async () => {
    const { reg, a, b } = await seedTwoLines();
    expect((await reg.runCall(ctx(), call('line_state', { lineId: b.id }), { confirmed: false })).ok).toBe(true);
    const every = await reg.runCall(ctx(), call('list_problems', { which: 'all' }), { confirmed: false });
    expect(every.ok && (every.data as { id: string }[]).map(x => x.id).sort()).toEqual(['pa1', 'pa2', 'pb1']);
    await chosen('Brook Dairy');
    try {
      const r = await reg.runCall(ctx(), call('line_state', { lineId: a.id }), { confirmed: false });
      expect(!r.ok && r.why).toBe('“Line A” is Acme Foods’s, and the customer in hand is Brook Dairy — nothing of one customer is read while another is in hand. Switch to Acme Foods (the top bar, or switch_client) to read it.');
      expect((await reg.runCall(ctx(), call('line_state', { lineId: b.id }), { confirmed: false })).ok).toBe(true);
    } finally { await chosen(''); }
  }, 60_000);

  it('an archived customer is read by nobody, whoever is in hand — kept as it was, and said so', async () => {
    const { reg, a, b } = await seedTwoLines();
    const { archiveCustomer } = await import('../../lib/customers');
    const done = await archiveCustomer('Brook Dairy');
    expect(done.ok).toBe(true);
    const r = await reg.runCall(ctx(), call('line_state', { lineId: b.id }), { confirmed: false });
    expect(!r.ok && r.why).toBe('“Line B” belongs to Brook Dairy, which is archived — nothing is read from an archived customer. It is kept as it was: continue Brook Dairy (Set up › Customers) to use it again.');
    const q = await reg.runCall(ctx({ conversationId: 'none' }), call('query_data', { source: `stops:${b.id}`, title: 'Stops', measures: [{ op: 'count' }] }), { confirmed: false });
    expect(!q.ok && q.why).toMatch(/which is archived/);
    const all = await reg.runCall(ctx(), call('list_problems', { which: 'all' }), { confirmed: false });
    expect(all.ok && (all.data as { id: string }[]).map(x => x.id).sort()).toEqual(['pa1', 'pa2']);
    const found = await reg.runCall(ctx(), call('find', { words: 'filler' }), { confirmed: false });
    expect(found.ok && found.refs.filter(x => x.kind === 'problem' || x.kind === 'line' || x.kind === 'machine')).toEqual([]);
    expect(JSON.stringify(found)).not.toContain('Filler drips');
    const lineB = await reg.runCall(ctx(), call('find', { words: 'line b' }), { confirmed: false });
    expect(lineB.ok && lineB.refs.map(x => x.label)).not.toContain('Line B');
    expect((await reg.runCall(ctx(), call('line_state', { lineId: a.id }), { confirmed: false })).ok).toBe(true);
  }, 60_000);

  it('Artifacts stay with the customer in hand — another customer’s and an archived customer’s are not listed', async () => {
    const { db, reg } = await seedTwoLines();
    const t = Date.now();
    const html = '<!doctype html><title>x</title>';
    const art = (id: string, client: string, title: string) => db.putStudy({
      id, tool: 'talk', name: title,
      facts: { lunaArtifact: true, client, htmlArtifacts: [{ id, reportId: 'r-' + id, reportVersion: 1, title, html, at: t, updatedAt: t }] } as never,
      uses: [], startedAt: t, createdAt: t, updatedAt: t,
    });
    await art('art-a', 'Acme Foods', 'Acme dashboard');
    await art('art-b', 'Brook Dairy', 'Brook dashboard');
    await chosen('Acme Foods');
    try {
      const listed = await reg.runCall(ctx(), call('list_artifacts', {}), { confirmed: false });
      expect(listed.ok).toBe(true);
      expect(JSON.stringify(listed)).toContain('Acme dashboard');
      expect(JSON.stringify(listed)).not.toContain('Brook dashboard');
      const openB = await reg.runCall(ctx(), call('open_artifact', { artifactId: 'art-b' }), { confirmed: false });
      expect(openB.ok).toBe(false);
      if (!openB.ok) expect(openB.why).toMatch(/Brook Dairy/);
      const openA = await reg.runCall(ctx(), call('open_artifact', { artifactId: 'art-a' }), { confirmed: false });
      expect(openA.ok).toBe(true);
      if (openA.ok) expect(openA.show?.kind).toBe('artifact');
    } finally { await chosen(''); }
    const { archiveCustomer } = await import('../../lib/customers');
    expect((await archiveCustomer('Brook Dairy')).ok).toBe(true);
    const after = await reg.runCall(ctx(), call('list_artifacts', {}), { confirmed: false });
    expect(after.ok).toBe(true);
    expect(JSON.stringify(after)).not.toContain('Brook dashboard');
  }, 60_000);

  it('what is left alone: a write waits for the person’s yes on its card; a record that is nobody’s is refused to nobody', async () => {
    const { db, reg, b } = await seedTwoLines();
    await chosen('Acme Foods');
    try {
      /* a write naming Brook's line is not refused HERE — its card says where it will land, and the person decides */
      const card = await reg.previewCall(ctx(), call('raise_problem', { lineId: b.id, words: 'Seal weak on the corner', priority: 'low', how: 'observed' }));
      expect(card.ok).toBe(true);
      /* a study on no line and no project — a template of the person's own — belongs to no customer */
      const t = Date.now();
      await db.putStudy({ id: 'own', tool: 'capability', name: 'My own study', agreed: { readings: { kind: 'limits', unit: 'N', nominal: 20, lower: 15, upper: 25, count: 30 } }, facts: { readings: [] } as never, uses: [], startedAt: t, createdAt: t, updatedAt: t });
      const mine = await reg.runCall(ctx(), call('read_record', { studyId: 'own' }), { confirmed: false });
      expect(mine.ok || !/customer in hand/.test(mine.why)).toBe(true);
      /* an id that is no record is left to the capability to say */
      const none = await reg.runCall(ctx(), call('line_state', { lineId: 'no-such-line' }), { confirmed: false });
      expect(!none.ok && none.why).not.toMatch(/customer in hand/);
    } finally { await chosen(''); }
  }, 60_000);
});
