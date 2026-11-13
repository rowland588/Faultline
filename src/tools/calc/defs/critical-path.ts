/* CRITICAL PATH AND FLOAT — FC-215 (knowledge/specs/FC-215-critical-path.md; knowledge/methods/projects/critical-path.md).
 *
 * A project's tasks, how many working days each takes and which must finish before it can start: the longest chain from the start to
 * the end is the critical path, and every task off it has float — the days it can slip before the end moves (Kelley & Walker 1959;
 * lib/ie/criticalPath). TYPED here, not read from a project: the stage-gate plan holds each machine's stages with their days, but not
 * what a stage waits for — wiring this to the live plan needs that relation stored first (said in the spec and the catalogue's limits).
 * A task is a letter (A to P) so what it waits for is typed as letters; a name is optional and only words the sentence.
 * Money: a day lost on the critical path is a day's delay to the end, worth what the person says it is (knowledge/MONEY.md, T and C) —
 * optional, never filled in; a task with float costs nothing until the float is used up. */
import { criticalPath, slip, type CpmRow, type CpmTask } from '../../../lib/ie/criticalPath';
import { andList, fmt, gbp, plural } from '../format';
import type { CalcDef, CalcMoney, CalcPicture, Field, Inputs, Problem, Values } from '../types';

const LETTERS = 'ABCDEFGHIJKLMNOP';
const SLOTS = LETTERS.length;
const id = (i: number, part: 'name' | 'days' | 'after'): string => `${LETTERS[i].toLowerCase()}_${part}`;
const DEFAULT_WATCH = 2;
const dayWord = (n: number): string => `${fmt(n, 2)} day${n === 1 ? '' : 's'}`;

const num = (v: Values, k: string): number | undefined => v[k] as number | undefined;
const text = (v: Values, k: string): string => (typeof v[k] === 'string' ? (v[k] as string).trim() : '');
/** The letters typed in a "waits for" box: "C, D", "c d", "C and D" → ['C', 'D']. */
const letters = (s: string): string[] => [...new Set(s.toUpperCase().split(/[^A-Z0-9]+/).filter(t => t && t !== 'AND'))];

const slotFields = (i: number): Field[] => {
  const L = LETTERS[i];
  const shown = (v: Values): boolean => i === 0 || num(v, id(i - 1, 'days')) !== undefined;
  return [
    { id: id(i, 'name'), label: `Task ${L}`, kind: 'text', optional: true, showIf: shown,
      ...(i === 0 ? { help: 'What the task is — “Labeller delivered”. Blank and it is called Task A. Each task below it appears once the one above has its days.' } : {}) },
    { id: id(i, 'days'), label: `Task ${L} takes`, unit: 'working days', kind: 'number', min: 0, ...(i === 0 ? {} : { optional: true }), showIf: shown,
      ...(i === 0 ? { help: 'Working days, from your plan; half a day is 0.5; a milestone is 0.' } : {}) },
    { id: id(i, 'after'), label: `Task ${L} waits for`, kind: 'text', optional: true, showIf: shown,
      help: i === 0 ? 'The letters of the tasks that must finish first — “C, D”. Blank if it can start at the beginning.' : 'Letters, with commas. Blank: it starts at the beginning.' },
  ];
};

/** The network the boxes describe, with what is doubtful about it. Only tasks that have days are in it. */
function network(v: Values): { tasks: CpmTask[]; names: Map<string, string>; problems: Problem[] } {
  const problems: Problem[] = [];
  const tasks: CpmTask[] = [];
  const names = new Map<string, string>();
  const given = new Set<string>();
  for (let i = 0; i < SLOTS; i++) if (num(v, id(i, 'days')) !== undefined) given.add(LETTERS[i]);
  for (let i = 0; i < SLOTS; i++) {
    const L = LETTERS[i], d = num(v, id(i, 'days'));
    if (d === undefined) continue;
    const after: string[] = [];
    for (const p of letters(text(v, id(i, 'after')))) {
      if (!/^[A-P]$/.test(p)) problems.push({ field: id(i, 'after'), say: `Task ${L} waits for “${p}”, but there is no task ${p} — the tasks are lettered A to ${LETTERS[SLOTS - 1]}.`, block: true });
      else if (!given.has(p)) problems.push({ field: id(i, 'after'), say: `Task ${L} waits for task ${p}, which has no days yet — left out of the sum until it has.` });
      else after.push(p);
    }
    tasks.push({ id: L, days: d, after });
    const n = text(v, id(i, 'name'));
    names.set(L, n || `Task ${L}`);
  }
  return { tasks, names, problems };
}

/** A network as the boxes hold it, from rows of [name, days, waits for]. */
const plan = (rows: [string, number, string][], more: Inputs = {}): Inputs => {
  const out: Inputs = {};
  rows.forEach(([name, days, after], i) => { if (name) out[id(i, 'name')] = name; out[id(i, 'days')] = days; if (after) out[id(i, 'after')] = after; });
  return { ...out, ...more };
};
/* the knowledge record's new line: a filler's chain and a labeller's, then trials and handover (scripts/knowledge/cases-calc.py P1) */
const LINE: [string, number, string][] = [['Deliver filler', 10, ''], ['Deliver labeller', 14, ''], ['Install filler', 5, 'A'], ['Install labeller', 4, 'B'], ['FAT/SAT filler', 6, 'C'], ['SAT labeller', 8, 'D'], ['Line trials', 5, 'E, F'], ['Handover', 2, 'G']];
const TIE: [string, number, string][] = [['', 2, ''], ['', 3, 'A'], ['', 4, 'A'], ['', 2, 'B'], ['', 3, 'B, C'], ['', 5, 'C'], ['', 2, 'D, E'], ['', 1, 'F, G']];
const SIDE: [string, number, string][] = [['', 3, ''], ['', 4, 'A'], ['', 2, 'A'], ['', 5, 'B'], ['', 1, 'C'], ['', 6, 'C'], ['', 4, 'D, E'], ['', 3, 'F, G']];

const def: CalcDef = {
  key: 'critical-path',
  fc: 'FC-215',
  title: 'Critical path and float',
  says: 'Which tasks move the end if they slip, and how many days each of the others has — from the tasks, their days and what each waits for',
  question: 'Which tasks decide the end date, and how long can the others slip before they do?',
  group: 'Projects',
  inputs: [
    ...Array.from({ length: SLOTS }, (_, i) => slotFields(i)).flat(),
    { id: 'watch', label: 'Call float this small near critical', unit: 'days', kind: 'number', min: 0, optional: true, default: DEFAULT_WATCH,
      chosen: 'Faultline’s starting point, not a rule: a task with this many days of float or fewer is said to be worth watching, because one small slip makes it critical. Change it to suit the plan.',
      help: 'The method’s own line is exactly none; a few days is what a plan usually watches.' },
    { id: 'slipTask', label: 'What if this task is late (its letter)', kind: 'text', optional: true, help: 'Optional: the letter of one task, to see whether its slip moves the end.' },
    { id: 'slipDays', label: 'Late by', unit: 'days', kind: 'number', min: 0, optional: true },
    { id: 'delayCost', label: 'What one day of delay to the end costs', unit: '£ a day', kind: 'number', min: 0, optional: true, money: true,
      help: 'The contribution the line does not earn for a day, plus any standing charge — the sponsor or finance will have it; Faultline never fills it in.' },
  ],
  check(v): Problem[] {
    const { tasks, problems } = network(v);
    const out = [...problems];
    if (tasks.every(t => t.days === 0)) { out.push({ field: 'a_days', say: 'Every task takes no time, so there is no path to find — give the days each takes.', block: true }); return out; }
    if (!out.some(p => p.block)) {
      const r = criticalPath(tasks);
      if (!r.ok && r.error === 'cycle') out.push({ field: id(LETTERS.indexOf(r.cycle[0]), 'after'), say: `The tasks wait for each other in a circle — ${r.cycle.join(' → ')} — so none of them can start. Take one of those waits out.`, block: true });
    }
    const st = text(v, 'slipTask').toUpperCase(), sd = num(v, 'slipDays');
    if (st) {
      if (!/^[A-P]$/.test(st)) out.push({ field: 'slipTask', say: `“${text(v, 'slipTask')}” is not one of the tasks — give a letter from A to ${LETTERS[SLOTS - 1]}.`, block: true });
      else if (!tasks.some(t => t.id === st)) out.push({ field: 'slipTask', say: `Task ${st} has no days yet, so there is nothing to be late — left out.` });
      else if (sd === undefined) out.push({ field: 'slipDays', say: 'Give how many days it is late to see where the end goes.' });
    } else if (sd !== undefined) out.push({ field: 'slipTask', say: 'Give which task is late (its letter) to see where the end goes.' });
    return out;
  },
  compute(v) {
    const { tasks, names } = network(v);
    const r = criticalPath(tasks);
    if (!r.ok) throw new Error(`critical path: ${r.error}`);
    const tag = (L: string): string => names.get(L) ?? `Task ${L}`;
    const watch = num(v, 'watch') ?? DEFAULT_WATCH;
    const rows = r.rows;
    const critRows = rows.filter(x => x.critical);
    const off = rows.filter(x => !x.critical);
    const tight = off.length ? off.reduce((a, b) => (b.float < a.float ? b : a)) : undefined;
    const near = watch > 0 ? off.filter(x => x.float <= watch + 1e-9) : [];
    const byStart = (a: CpmRow, b: CpmRow) => a.es - b.es || LETTERS.indexOf(a.id) - LETTERS.indexOf(b.id);

    const pathSaid = r.paths.length === 1
      ? `The critical path is ${r.paths[0].map(tag).join(' → ')}`
      : `There are ${r.paths.length} critical paths, through ${andList([...critRows].sort(byStart).map(x => tag(x.id)))}`;
    const sentence = `The last task cannot finish before day ${fmt(r.end, 2)}. ${pathSaid}: a day lost on any of them is a day later at the end.${tight ? ` The other ${plural(off.length, 'task')} can slip first — the tightest, ${tag(tight.id)}, has ${dayWord(tight.float)} of float.` : ' Every task is critical — there is no float anywhere.'}`;

    /* a task late */
    const st = text(v, 'slipTask').toUpperCase(), sd = num(v, 'slipDays');
    const sl = st && sd !== undefined && tasks.some(t => t.id === st) ? slip(tasks, st, sd) : undefined;
    const slipSaid = sl && sd !== undefined
      ? (sl.moved === 0
        ? `If ${tag(st)} is ${dayWord(sd)} late the end stays at day ${fmt(sl.end, 2)} — it uses ${fmt(sl.used, 2)} of its ${dayWord(sl.float)} of float, leaving ${fmt(sl.float - sl.used, 2)}.`
        : sl.float === 0
          ? `If ${tag(st)} is ${dayWord(sd)} late the end moves ${dayWord(sl.moved)}, to day ${fmt(sl.end, 2)} — it has no float to take it up.`
          : `If ${tag(st)} is ${dayWord(sd)} late it uses all ${dayWord(sl.float)} of its float and the end moves ${dayWord(sl.moved)}, to day ${fmt(sl.end, 2)}.`)
      : undefined;
    const more: string[] = [
      ...(near.length ? [`Watch ${andList([...near].sort((a, b) => a.float - b.float || byStart(a, b)).map(x => `${tag(x.id)} (${dayWord(x.float)})`))} — within ${dayWord(watch)} of critical, so a slip that uses up ${near.length === 1 ? 'its' : 'their'} float makes ${near.length === 1 ? 'it' : 'them'} critical too.`]
        : watch > 0 && off.length ? [`Nothing off the path is within ${dayWord(watch)} of critical.`] : []),
      ...(slipSaid ? [slipSaid] : []),
    ];

    /* money: a day lost on the critical path is a day's delay; a task with float costs nothing until it is used up */
    const c = num(v, 'delayCost');
    let money: CalcMoney;
    if (c !== undefined) {
      const figures: [string, string][] = [['A day lost on the critical path', gbp(c)]];
      let t = `Each day the critical path slips costs ${gbp(c)} — a day’s delay to the end, at the figure you gave.`;
      if (sl) {
        figures.push([`${tag(st)} ${dayWord(sd as number)} late`, gbp(sl.moved * c)]);
        t += sl.moved === 0 ? ` ${tag(st)} ${dayWord(sd as number)} late moves nothing, so costs nothing yet — its float is not used up.` : ` ${tag(st)} ${dayWord(sd as number)} late moves the end ${dayWord(sl.moved)}: ${gbp(sl.moved * c)}.`;
      }
      money = { text: t, figures, missing: [] };
    } else {
      money = { missing: ['Give what one day of delay to the end costs (the contribution the line does not earn for a day plus any standing charge — the sponsor or finance will have it) to say a slip in money.'] };
    }

    /* the picture: every task a bar from its earliest start to its earliest finish, its float a dashed tail */
    const n = rows.length;
    const step = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000].find(s => r.end / s <= 6) ?? 1000;
    const ticks: number[] = [];
    for (let x = 0; x <= r.end + 1e-9; x += step) ticks.push(x);
    const picture: CalcPicture = {
      title: 'The plan as it can run',
      caption: 'Each bar runs from the earliest a task can start to the earliest it can finish. The dark bars are the critical path; the dashed tail on any other is its float — how far it can slip before the end moves.',
      x: { label: 'Working days from the start', min: 0, max: r.end, ticks, fmt: x => fmt(x, 2) },
      y: { label: 'Task', min: -0.5, max: n - 0.5, ticks: rows.map((_, i) => n - 1 - i), fmt: y => rows[n - 1 - Math.round(y)]?.id ?? '' },
      lines: rows.flatMap((x, i): CalcPicture['lines'] => [
        ...(x.days > 0 ? [{ points: [[x.es, n - 1 - i], [x.ef, n - 1 - i]] as [number, number][], mark: x.critical ? 'ink' as const : 'brand' as const }] : []),
        ...(!x.critical && x.float > 0 ? [{ points: [[x.ef, n - 1 - i], [x.lf, n - 1 - i]] as [number, number][], mark: 'muted' as const, dash: true }] : []),
      ]),
      verticals: [{ x: r.end, label: `end, day ${fmt(r.end, 2)}` }],
      horizontals: [],
      dots: rows.filter(x => x.days === 0).map(x => ({ x: x.es, y: n - 1 - rows.indexOf(x), label: '' })),
    };

    const verdict = `${fmt(r.end, 2)} day${r.end === 1 ? '' : 's'}`;
    return {
      verdict,
      tone: near.length ? 'a' : 'n',
      sentence,
      more,
      tiles: [
        { k: 'Earliest end', v: fmt(r.end, 2), of: 'working days from the start', n: r.end, better: 'lower', fmt: x => `${fmt(x, 2)} days` },
        { k: 'On the critical path', v: String(critRows.length), of: `of ${plural(n, 'task')}`, n: critRows.length, counted: true },
        tight ? { k: 'Least float off it', v: fmt(tight.float, 2), of: `${tight.float === 1 ? 'day' : 'days'} · ${tag(tight.id)}`, n: tight.float, better: 'higher', fmt: x => `${fmt(x, 2)} days` }
          : { k: 'Least float off it', v: '—', of: 'every task is critical' },
        { k: 'Near critical', v: String(near.length), of: watch > 0 ? `within ${dayWord(watch)} of critical` : 'no watch limit set', n: near.length, better: 'lower', counted: true },
        sl && sd !== undefined ? { k: 'If it slips', v: sl.moved === 0 ? 'no change' : `+${fmt(sl.moved, 2)} days`, of: `${tag(st)} ${dayWord(sd)} late`, n: sl.moved, better: 'lower', fmt: x => `${fmt(x, 2)} days` }
          : { k: 'If it slips', v: '—', of: 'give a late task and its days' },
        c !== undefined ? { k: 'A day late costs', v: gbp(c), of: 'a day lost on the critical path', n: c }
          : { k: 'A day late costs', v: '—', of: 'give what a day costs' },
      ],
      working: [
        { label: 'Forward pass', value: 'early start = the latest early finish of what it waits for (0 at the start); early finish = early start + days', note: 'Kelley & Walker, 1959' },
        { label: 'Backward pass', value: 'late finish = the earliest late start of what waits for it (the end for the last); late start = late finish − days' },
        { label: 'Float', value: 'late start − early start; none means critical' },
        ...rows.map(x => ({
          label: names.get(x.id)?.startsWith('Task ') ? `Task ${x.id}` : `${x.id} — ${tag(x.id)}`,
          value: `${fmt(x.days, 2)} days · early ${fmt(x.es, 2)}–${fmt(x.ef, 2)} · late ${fmt(x.ls, 2)}–${fmt(x.lf, 2)} · float ${fmt(x.float, 2)}${x.critical ? ' · critical' : ''}`,
          note: x.after.length ? `waits for ${x.after.join(', ')}` : 'starts at the beginning',
        })),
      ],
      caveats: [
        'The network is the method: a wait left out makes a task look free, and a wait that is not real makes a task look critical. Check each “waits for” with the people doing the work.',
        'Days are estimates held fixed, and a path a few days short of critical is one slip from critical — that is why near-critical tasks are named. Re-run it as tasks finish; a plan not re-run is a picture of the start.',
        'Only “finish, then start” waits and working days from day 0: no dates, no calendar or shutdowns, and no limit on the people or the rigging crew (a crew shared by two machines is a wait to add).',
        'It is typed here, not read from a project: the stage-gate plan does not yet store what a stage waits for. The handover forecast from the pace of tests already run (the stage gate’s own) is a different sum; the two should agree.',
      ],
      money,
      closing: critRows.length === n
        ? `Day ${fmt(r.end, 2)} is the earliest end, and every one of the ${n} tasks is critical — nothing can slip without moving it.`
        : `Day ${fmt(r.end, 2)} is the earliest end. ${plural(critRows.length, 'task')} of ${n} have no float and decide it — chase those first; the other ${off.length} can slip, the tightest by ${dayWord(tight?.float ?? 0)}${near.length ? `, and ${plural(near.length, 'task')} ${near.length === 1 ? 'is' : 'are'} close enough to watch` : ''}.`,
      picture,
    };
  },
  examples: [
    {
      name: 'A new line: the labeller’s chain decides the handover — and a labeller delivery 3 days late, in money',
      source: 'knowledge/methods/projects/critical-path.md worked case; scripts/knowledge/cases-calc.py P1, P4, P5 (every path listed — end 33, B-D-F-G-H critical, A-C-E 5 days’ float; B late 3 moves it to 36; 3 × £2,500)',
      inputs: plan(LINE, { watch: 2, slipTask: 'B', slipDays: 3, delayCost: 2500 }),
      expect: {
        verdict: '33 days', tone: 'n',
        sentence: 'The last task cannot finish before day 33. The critical path is Deliver labeller → Install labeller → SAT labeller → Line trials → Handover: a day lost on any of them is a day later at the end. The other 3 tasks can slip first — the tightest, Deliver filler, has 5 days of float.',
        tiles: { 'Earliest end': '33', 'On the critical path': '5', 'Least float off it': '5', 'Near critical': '0', 'If it slips': '+3 days', 'A day late costs': '£2,500' },
        money: 'Each day the critical path slips costs £2,500 — a day’s delay to the end, at the figure you gave. Deliver labeller 3 days late moves the end 3 days: £7,500.',
      },
    },
    {
      name: 'Two chains tie: both are critical, and two tasks are within 2 days of critical (amber)',
      source: 'scripts/knowledge/cases-calc.py P3 (every path listed — end 12, A-C-E-G-H and A-C-F-H both 12; float B 1, D 2)',
      inputs: plan(TIE, { watch: 2 }),
      expect: {
        verdict: '12 days', tone: 'a',
        sentence: 'The last task cannot finish before day 12. There are 2 critical paths, through Task A, Task C, Task E, Task F, Task G and Task H: a day lost on any of them is a day later at the end. The other 2 tasks can slip first — the tightest, Task B, has 1 day of float.',
        tiles: { 'Earliest end': '12', 'On the critical path': '6', 'Least float off it': '1', 'Near critical': '2', 'If it slips': '—', 'A day late costs': '—' },
      },
    },
    {
      name: 'A filler delivery 8 days late uses its 5 days of float and moves the end 3',
      source: 'scripts/knowledge/cases-calc.py P1, P4 (A late by 8, float 5: 36 = 33 + (8 − 5))',
      inputs: plan(LINE, { watch: 2, slipTask: 'A', slipDays: 8 }),
      expect: {
        verdict: '33 days', tone: 'n',
        sentence: 'The last task cannot finish before day 33. The critical path is Deliver labeller → Install labeller → SAT labeller → Line trials → Handover: a day lost on any of them is a day later at the end. The other 3 tasks can slip first — the tightest, Deliver filler, has 5 days of float.',
        tiles: { 'Earliest end': '33', 'On the critical path': '5', 'Least float off it': '5', 'Near critical': '0', 'If it slips': '+3 days', 'A day late costs': '—' },
      },
    },
    {
      name: 'A slip inside its float moves nothing and costs nothing yet; the watch line moved to 5 days',
      source: 'scripts/knowledge/cases-calc.py P2 (every path listed — end 19, A-B-D-G-H critical; C 5, E 6, F 5 days’ float); F late 2 < 5, so the end stays',
      inputs: plan(SIDE, { watch: 5, slipTask: 'F', slipDays: 2, delayCost: 1000 }),
      expect: {
        verdict: '19 days', tone: 'a',
        sentence: 'The last task cannot finish before day 19. The critical path is Task A → Task B → Task D → Task G → Task H: a day lost on any of them is a day later at the end. The other 3 tasks can slip first — the tightest, Task C, has 5 days of float.',
        tiles: { 'Earliest end': '19', 'On the critical path': '5', 'Least float off it': '5', 'Near critical': '2', 'If it slips': 'no change', 'A day late costs': '£1,000' },
        money: 'Each day the critical path slips costs £1,000 — a day’s delay to the end, at the figure you gave. Task F 2 days late moves nothing, so costs nothing yet — its float is not used up.',
      },
    },
  ],
  refused: [
    { name: 'two tasks waiting for each other', inputs: plan([['', 2, 'B'], ['', 3, 'A']]), blocked: 'wait for each other in a circle' },
    { name: 'a task waiting for itself', inputs: plan([['', 2, 'A']]), blocked: 'wait for each other in a circle' },
    { name: 'a wait for a task that is not there', inputs: plan([['', 2, ''], ['', 3, 'Z']]), blocked: 'there is no task Z' },
    { name: 'every task takes no time', inputs: plan([['', 0, ''], ['', 0, 'A']]), blocked: 'Every task takes no time' },
    { name: 'a negative number of days', inputs: plan([['', -1, '']]), blocked: 'must be at least' },
    { name: 'a late task that is not one of the tasks', inputs: plan([['', 2, ''], ['', 3, 'A']], { slipTask: 'Q', slipDays: 1 }), blocked: 'is not one of the tasks' },
    { name: 'no days on the first task', inputs: { a_name: 'Deliver' }, blocked: 'Give “Task A takes”' },
  ],
  see: [{ key: 'littles-law', why: 'how long product waits, once the plan is running' }],
};

export default def;
