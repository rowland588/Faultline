/* VIEWS AND LINKS (docs/VIEWS.md): a step drawn as a fishbone, a board, a
 * charter or a timeline, bound slot by slot to its own columns or boxes; and
 * a link column naming an entry of an earlier log, followed both ways — a
 * root cause lists the experiments that test it, an experiment names its
 * cause, a struck or vanished entry says so. */
import { describe, expect, it } from 'vitest';
import { FLOW_SCHEMA, rekeyField, rekeyStep, type FlowDefinition, type FlowField } from '../definition';
import { validateDefinition } from '../validate';
import { readFlow } from '../runtime';
import { entryTitle, linkChoices, linkSaid, linksSaid, linksTo } from '../links';
import { VIEWS, VIEWS_SAID, VIEW_IDS, viewSaid } from '../views';
import { PROPOSAL_SCHEMA } from '../proposal';
import type { FlowEntry } from '../analysis';
import type { FlowRecord } from '../records';

const SIX = ['People', 'Machine', 'Method', 'Material', 'Measurement', 'Environment'];
const CAUSES: FlowField[] = [
  { key: 'cause', label: 'Cause', type: 'text', required: true },
  { key: 'bone', label: 'Bone', type: 'choice', options: SIX, required: true },
  { key: 'root', label: 'Root cause', type: 'yesno' },
  { key: 'known', label: 'How it is known', type: 'choice', options: ['Measured', 'Counted', 'Observed', 'Reported'] },
];
const EXPERIMENTS: FlowField[] = [
  { key: 'what', label: 'Experiment', type: 'text', required: true },
  { key: 'lane', label: 'PDCA', type: 'choice', options: ['Plan', 'Do', 'Check', 'Act', 'Done'], required: true },
  { key: 'owner', label: 'Owner', type: 'person' },
  { key: 'due', label: 'Due', type: 'date' },
  { key: 'tests', label: 'Root cause it tests', type: 'ref', of: 'causes', required: true },
];

const lean = (): FlowDefinition => JSON.parse(JSON.stringify({
  schema: FLOW_SCHEMA, name: 'Lean improvement', purpose: 'A gap closed with proof.', kind: 'improvement', roles: [],
  stages: [
    {
      key: 'define', name: 'Define', gate: { conditions: [] },
      steps: [{
        key: 'charter', title: 'The charter', per: 'line', answer: 'form',
        fields: [
          { key: 'problem', label: 'Problem', type: 'text', required: true },
          { key: 'goal', label: 'Goal', type: 'text', required: true },
          { key: 'worth', label: 'Business case', type: 'number', unit: '£' },
          { key: 'sponsor', label: 'Sponsor', type: 'person' },
        ],
        view: { id: 'charter', bind: { problem: 'problem', goal: 'goal', case: 'worth', sponsor: 'sponsor' } },
      }],
    },
    {
      key: 'analyse', name: 'Analyse', gate: { conditions: [] },
      steps: [{
        key: 'causes', title: 'The causes', per: 'line', answer: 'log', columns: CAUSES,
        analyses: [{ key: 'roots', label: 'Seal leaks', block: 'fishbone', of: 'cause', by: 'bone', when: { column: 'root', op: '=', value: true } }],
        view: { id: 'fishbone', bind: { cause: 'cause', bone: 'bone', root: 'root', known: 'known' } },
      }],
    },
    {
      key: 'improve', name: 'Improve', gate: { conditions: [] },
      steps: [
        {
          key: 'experiments', title: 'PDCA experiments', per: 'line', answer: 'log', columns: EXPERIMENTS,
          analyses: [{ key: 'n', label: 'Experiments', block: 'count' }],
          view: { id: 'board', bind: { card: 'what', lane: 'lane', owner: 'owner', due: 'due' } },
        },
        {
          key: 'actions', title: 'Actions', per: 'line', answer: 'log',
          columns: [
            { key: 'action', label: 'Action', type: 'text', required: true },
            { key: 'lane', label: 'Where', type: 'choice', options: ['To do', 'Doing', 'Done'] },
            { key: 'experiment', label: 'Experiment', type: 'ref', of: 'experiments' },
          ],
          analyses: [{ key: 'n2', label: 'Actions', block: 'count' }],
          view: { id: 'board', bind: { card: 'action', lane: 'lane' } },
        },
      ],
    },
  ],
} satisfies FlowDefinition));

const checked = (d: FlowDefinition) => validateDefinition(JSON.parse(JSON.stringify(d)));
const errorsOf = (d: FlowDefinition) => checked(d).errors.map(e => e.message);

describe('a view on a step', () => {
  it('is kept with its bindings, and the links with the log they name', () => {
    const c = checked(lean());
    expect(c.errors).toEqual([]);
    const steps = c.def?.stages.flatMap(s => s.steps) ?? [];
    expect(steps.map(s => s.view?.id)).toEqual(['charter', 'fishbone', 'board', 'board']);
    expect(steps[2].columns?.find(x => x.key === 'tests')).toMatchObject({ type: 'ref', of: 'causes', required: true });
    expect(steps[1].view?.bind).toEqual({ cause: 'cause', bone: 'bone', root: 'root', known: 'known' });
  });

  it('is one the app has, for the step’s answer', () => {
    const d = lean(); d.stages[1].steps[0].view = { id: 'mindmap' as never, bind: {} };
    expect(errorsOf(d)).toEqual(['Stage 2, step 1 (The causes) is drawn as "mindmap", a view the app does not have. It has fishbone, board, charter, timeline.']);
    const e = lean(); e.stages[0].steps[0].view = { id: 'board', bind: { card: 'problem', lane: 'goal' } };
    expect(errorsOf(e)).toEqual(['Stage 1, step 1 (The charter) is drawn as a board, which draws a log — the step is a form.']);
  });

  it('has every slot it needs, each from a column of its kind, each column once', () => {
    const d = lean(); d.stages[1].steps[0].view = { id: 'fishbone', bind: { cause: 'cause' } };
    expect(errorsOf(d)).toEqual(['Stage 2, step 1 (The causes)\'s fishbone needs the bone — say which column it is drawn from.']);
    const e = lean(); e.stages[1].steps[0].view = { id: 'fishbone', bind: { cause: 'cause', bone: 'root' } };
    expect(errorsOf(e)).toEqual(['Stage 2, step 1 (The causes)\'s fishbone draws the bone from “Root cause”, yes or no — it needs choice.']);
    const f = lean(); f.stages[1].steps[0].view = { id: 'fishbone', bind: { cause: 'cause', bone: 'bone', known: 'bone' } };
    expect(errorsOf(f)[0]).toMatch(/draws the bone from “Bone”|draws both the bone and how it is known from “Bone”/);
    const g = lean(); g.stages[0].steps[0].view = { id: 'charter', bind: { problem: 'problem', goal: 'aim' } };
    expect(errorsOf(g)).toEqual(['Stage 1, step 1 (The charter)\'s charter draws the goal from "aim", which is not a box of the step.']);
  });

  it('drops a slot the view does not have, and is said in words', () => {
    const d = lean(); (d.stages[1].steps[0].view as { bind: Record<string, string> }).bind.colour = 'bone';
    expect(checked(d).def?.stages[1].steps[0].view?.bind).not.toHaveProperty('colour');
    const def = checked(lean()).def;
    expect(viewSaid(def?.stages[1].steps[0] ?? { answer: 'log' })).toBe('shown as a fishbone · bones from Bone (People · Machine · Method · Material · Measurement · Environment)');
    expect(viewSaid(def?.stages[2].steps[0] ?? { answer: 'log' })).toBe('shown as a board · lanes from PDCA (Plan · Do · Check · Act · Done)');
    expect(viewSaid(def?.stages[0].steps[0] ?? { answer: 'form' })).toBe('shown as a charter');
  });

  it('every view is in the registry and told to the assistant with its slots', () => {
    for (const id of VIEW_IDS) {
      expect(VIEWS[id].id).toBe(id);
      expect(VIEWS_SAID).toContain(`- ${id} (a ${VIEWS[id].answer} step)`);
      for (const s of VIEWS[id].slots) expect(VIEWS_SAID).toContain(`${s.key}${s.required ? '' : '?'} = ${s.types.join('|')}`);
    }
  });
});

describe('a link column', () => {
  it('says which log it names', () => {
    const d = lean(); delete d.stages[2].steps[0].columns?.[4].of;
    expect(errorsOf(d)).toEqual(['Stage 3, step 1 (PDCA experiments), "Root cause it tests" is linked to an entry but does not say which log.']);
  });

  it('names an earlier log on the method — not a form, not itself, not a later one', () => {
    const at = (of: string) => { const d = lean(); (d.stages[2].steps[0].columns ?? [])[4].of = of; return errorsOf(d); };
    expect(at('nowhere')).toEqual(['"PDCA experiments", “Root cause it tests”, links to a log that is not on the method: "nowhere".']);
    expect(at('charter')).toEqual(['"PDCA experiments", “Root cause it tests”, links to “The charter”, which is not a log — a link names one of a log\'s entries.']);
    expect(at('experiments')).toEqual(['"PDCA experiments", “Root cause it tests”, links to its own log — link to a log before it.']);
    expect(at('actions')).toEqual(['"PDCA experiments", “Root cause it tests”, links to “Actions”, which comes after it — a link names an entry already logged.']);
  });

  it('a step for the line cannot link to a log kept machine by machine', () => {
    const d = lean(); d.stages[1].steps[0].per = 'machine';
    expect(errorsOf(d)).toEqual(['"PDCA experiments", “Root cause it tests”, links to “The causes”, which is kept machine by machine — a step for the whole line cannot say which machine\'s entry.']);
  });

  it('cannot be summed, compared in a gate or decide a step', () => {
    const d = lean(); d.stages[2].steps[0].analyses = [{ key: 'by_cause', label: 'By cause', block: 'pareto', by: 'tests' }];
    expect(errorsOf(d)[0]).toMatch(/groups by “Root cause it tests”/);
  });

  it('moves with the step it names, and a charter with the box it is drawn from', () => {
    const d = lean();
    rekeyStep(d, 'causes', 'root-causes');
    expect(d.stages[2].steps[0].columns?.[4].of).toBe('root-causes');
    rekeyField(d, 'charter', 'worth', 'business_case');
    expect(d.stages[0].steps[0].view?.bind.case).toBe('business_case');
    expect(checked(d).errors).toEqual([]);
  });

  it('is not offered to the assistant yet — its grammar is proved live first', () => {
    expect(JSON.stringify(PROPOSAL_SCHEMA)).not.toContain('"ref"');
  });
});

/* ---------------------------------------------------- followed both ways */
const ent = (id: string, on: string, values: FlowEntry['values'], struck?: boolean): FlowEntry => ({ id, on, at: Number(id.replace(/\D/g, '')) || 1, values, ...(struck ? { struck } : {}) });
const rec = (stageKey: string, stepKey: string, entries: FlowEntry[], extra: Partial<FlowRecord> = {}): FlowRecord =>
  ({ id: `r-${stepKey}`, projectId: 'p', kind: 'step', stageKey, stepKey, version: 1, outcome: 'planned', entries, sort: 1, createdAt: 1, updatedAt: 1, ...extra });

const state = () => {
  const def = checked(lean()).def;
  if (!def) throw new Error('lean method invalid');
  return readFlow({
    def, machines: [], today: '2026-10-20',
    records: [
      rec('analyse', 'causes', [
        ent('c1', '2026-10-14', { cause: 'Seal jaw temperature drifts', bone: 'Machine', root: true, known: 'Measured' }),
        ent('c2', '2026-10-14', { cause: 'Film from two suppliers', bone: 'Material' }),
        ent('c3', '2026-10-15', { cause: 'Mistyped', bone: 'People' }, true),
        ent('c4', '2026-10-15', { bone: 'Method' }),
      ]),
      rec('improve', 'experiments', [
        ent('x1', '2026-10-16', { what: 'Hold the jaw at 185 °C', lane: 'Do', owner: 'Lee', due: '2026-10-18', tests: 'c1' }),
        ent('x2', '2026-10-16', { what: 'Run one supplier for a week', lane: 'Plan', tests: 'c2' }),
        ent('x3', '2026-10-17', { what: 'Struck trial', lane: 'Plan', tests: 'c1' }, true),
        ent('x4', '2026-10-17', { what: 'Try the mistype', lane: 'Plan', tests: 'c3' }),
        ent('x5', '2026-10-17', { what: 'A cause gone', lane: 'Plan', tests: 'c9' }),
      ]),
      rec('improve', 'actions', [
        ent('a1', '2026-10-18', { action: 'Fit a jaw thermocouple', lane: 'Doing', experiment: 'x1' }),
        ent('a2', '2026-10-18', { action: 'Write the jaw standard', lane: 'To do', experiment: 'x1' }),
      ]),
    ],
  });
};
const exps = () => state().stages[2].steps[0];

describe('a link, followed', () => {
  it('an entry is known by its view’s title column, else its day', () => {
    const causes = state().stages[1].steps[0];
    expect(causes.record?.entries?.map(e => entryTitle(causes.def, e))).toEqual(['Seal jaw temperature drifts', 'Film from two suppliers', 'Mistyped', 'the entry of 15 Oct']);
  });

  it('offers the earlier log’s entries, the struck ones said', () => {
    const tests = exps().def.columns?.find(c => c.key === 'tests');
    if (!tests) throw new Error();
    expect(linkChoices(state(), tests).map(c => `${c.title}${c.struck ? ' (struck)' : ''}`)).toEqual(['Seal jaw temperature drifts', 'Film from two suppliers', 'Mistyped (struck)', 'the entry of 15 Oct']);
  });

  it('says the entry it names as it stands now — struck, or gone', () => {
    const s = state(), tests = exps().def.columns?.find(c => c.key === 'tests');
    if (!tests) throw new Error();
    expect(linkSaid(s, tests, 'c1')).toEqual({ title: 'Seal jaw temperature drifts', log: 'The causes' });
    expect(linkSaid(s, tests, 'c3')).toEqual({ title: 'Mistyped', log: 'The causes', struck: true });
    expect(linkSaid(s, tests, 'c9')).toEqual({ title: 'an entry no longer on “The causes”', log: 'The causes', gone: true });
    expect(linkSaid(s, tests, '')).toBeUndefined();
  });

  it('a root cause lists what tests it, a struck experiment counting for nothing; an experiment its actions', () => {
    const s = state();
    const onC1 = linksTo(s, 'causes', 'c1');
    expect(onC1.map(l => l.title)).toEqual(['Hold the jaw at 185 °C']);
    expect(linksSaid(onC1)).toBe('1 in PDCA experiments');
    expect(linksTo(s, 'experiments', 'x1').map(l => l.title)).toEqual(['Fit a jaw thermocouple', 'Write the jaw standard']);
    expect(linksSaid([...onC1, ...linksTo(s, 'experiments', 'x1')])).toBe('1 in PDCA experiments · 2 in Actions');
    expect(linksTo(s, 'causes', 'c4')).toEqual([]);
  });

  it('a link on a form’s box is followed back too', () => {
    const d = lean();
    d.stages[2].steps.push({ key: 'decision', title: 'The decision', per: 'line', answer: 'form', fields: [{ key: 'on_cause', label: 'Root cause chosen', type: 'ref', of: 'causes' }] });
    const def = checked(d).def;
    if (!def) throw new Error('invalid');
    const s = readFlow({ def, machines: [], today: '2026-10-20', records: [
      rec('analyse', 'causes', [ent('c1', '2026-10-14', { cause: 'Seal jaw temperature drifts', bone: 'Machine' })]),
      rec('improve', 'decision', [], { values: { on_cause: 'c1' } }),
    ] });
    expect(linksTo(s, 'causes', 'c1').map(l => `${l.title}:${l.field.label}`)).toEqual(['The decision:Root cause chosen']);
  });

  it('machine by machine: a link names the same machine’s entry, and is followed back on it alone', () => {
    const d = lean();
    d.stages[1].steps[0].per = 'machine';
    d.stages[2].steps[0].per = 'machine';
    d.stages[2].steps[1].per = 'machine';
    const def = checked(d).def;
    if (!def) throw new Error(JSON.stringify(checked(d).errors));
    const s = readFlow({ def, machines: [{ id: 'm1', name: 'Sealer' }, { id: 'm2', name: 'Wrapper' }], today: '2026-10-20', records: [
      rec('analyse', 'causes', [ent('c1', '2026-10-14', { cause: 'Jaw drifts', bone: 'Machine' })], { id: 'rc1', assetId: 'm1' }),
      rec('analyse', 'causes', [ent('c2', '2026-10-14', { cause: 'Film tension', bone: 'Material' })], { id: 'rc2', assetId: 'm2' }),
      rec('improve', 'experiments', [ent('x1', '2026-10-16', { what: 'Hold the jaw', lane: 'Do', tests: 'c1' })], { id: 'rx1', assetId: 'm1' }),
    ] });
    const tests = def.stages[2].steps[0].columns?.find(c => c.key === 'tests');
    if (!tests) throw new Error();
    expect(linkChoices(s, tests, 'm1').map(c => c.title)).toEqual(['Jaw drifts']);
    expect(linkChoices(s, tests, 'm2').map(c => c.title)).toEqual(['Film tension']);
    expect(linkSaid(s, tests, 'c1', 'm2')?.gone).toBe(true);
    expect(linksTo(s, 'causes', 'c1', 'm1').map(l => l.title)).toEqual(['Hold the jaw']);
    expect(linksTo(s, 'causes', 'c1', 'm2')).toEqual([]);
  });
});

describe('the fishbone block', () => {
  it('every cause on its bone in the bone column’s order, struck and wordless ones left out, the root causes named', () => {
    const r = state().stages[1].steps[0].analysis?.roots;
    expect(r?.value).toBe(1);
    expect(r?.bones?.map(b => `${b.name}:${b.causes.map(c => `${c.text}${c.root ? '*' : ''}${c.known ? `/${c.known}` : ''}`).join('|')}`)).toEqual([
      'People:', 'Machine:Seal jaw temperature drifts*/measured', 'Method:', 'Material:Film from two suppliers', 'Measurement:', 'Environment:',
    ]);
    expect(r?.says).toBe('Seal leaks: 2 causes on 2 of 6 bones; nothing yet on People, Method, Measurement, Environment. The root cause: “Seal jaw temperature drifts” (Machine).');
  });
  it('a bone that holds more than any other is named; none marked is said', async () => {
    const { analyse } = await import('../analysis');
    const a = { key: 'roots', label: 'Leaks', block: 'fishbone' as const, of: 'cause', by: 'bone', when: { column: 'root', op: '=' as const, value: true } };
    const r = analyse([a], CAUSES, [
      ent('c1', '2026-10-14', { cause: 'Jaw drifts', bone: 'Machine' }), ent('c2', '2026-10-14', { cause: 'Jaw worn', bone: 'Machine' }),
      ent('c3', '2026-10-14', { cause: 'Film', bone: 'Material' }), ent('c4', '2026-10-14', { cause: 'Wet floor', bone: 'Outside' }),
    ]).roots;
    expect(r.says).toBe('Leaks: 4 causes on 3 of 7 bones — Machine holds the most (2); nothing yet on People, Method, Measurement, Environment. No root cause marked yet — mark the ones the whys end at.');
    expect(r.bones?.map(b => b.name)).toEqual([...SIX, 'Outside']);
    expect(analyse([a], CAUSES, []).roots.says).toBe('Leaks: no causes yet — log each cause on its bone.');
  });
});

describe('what a view draws', () => {
  it('the fish: the view’s bindings, the block’s grouping, the problem at its head', async () => {
    const { viewBones, fishHead } = await import('../viewData');
    const causes = state().stages[1].steps[0];
    const bones = viewBones(causes.def, causes.record?.entries ?? []);
    expect(bones.map(b => `${b.name}:${b.causes.map(c => `${c.id}${c.root ? '*' : ''}`).join(',')}`)).toEqual(['People:', 'Machine:c1*', 'Method:', 'Material:c2', 'Measurement:', 'Environment:']);
    expect(bones).toEqual(causes.analysis?.roots.bones);
    expect(fishHead(causes.def)).toBe('Seal leaks');
  });

  it('the board: lanes in order, late first, a day gone said in words, the last lane done', async () => {
    const { boardOf, nextLane } = await import('../viewData');
    const x = exps();
    const b = boardOf(x.def, [
      ...(x.record?.entries ?? []),
      ent('x6', '2026-10-17', { what: 'Check the seal strength', lane: 'Check', due: '2026-10-25', tests: 'c1' }),
      ent('x7', '2026-10-17', { what: 'Write the standard', lane: 'Done', due: '2026-10-12', tests: 'c1' }),
      ent('x8', '2026-10-18', { what: 'Run at 120 a minute', lane: 'Plan', due: '2026-10-19', tests: 'c1' }),
      ent('x9', '2026-10-18', { what: 'Lane gone', lane: 'Parked', tests: 'c1' }),
    ], '2026-10-20');
    expect(b.lanes.map(l => `${l.name}:${l.cards.map(c => c.id).join(',')}`)).toEqual(['Plan:x8,x2,x4,x5', 'Do:x1', 'Check:x6', 'Act:', 'Done:x7', 'Parked:x9']);
    expect(b.lanes.find(l => l.name === 'Do')?.cards[0]).toMatchObject({ title: 'Hold the jaw at 185 °C', owner: 'Lee', late: true, dueSaid: 'Late — was due 18 Oct' });
    expect(b.lanes.find(l => l.name === 'Done')?.cards[0]).toMatchObject({ late: false, done: true, dueSaid: 'Was due 12 Oct' });
    expect(b.lanes.find(l => l.name === 'Check')?.cards[0]).toMatchObject({ late: false, dueSaid: 'Due 25 Oct' });
    expect(b.late).toBe(2);
    expect(b.says).toBe('8 cards — Plan 4 · Do 1 · Check 1 · Act 0 · Done 1 · Parked 1; 2 late.');
    expect([nextLane(b, 'Plan'), nextLane(b, 'Act'), nextLane(b, 'Done'), nextLane(b, 'Parked')]).toEqual(['Do', 'Done', undefined, 'Plan']);
    expect(boardOf(x.def, []).says).toBe('No cards yet.');
  });
});
