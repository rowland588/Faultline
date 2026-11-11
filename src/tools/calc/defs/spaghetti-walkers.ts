/* THE SPAGHETTI DIAGRAM, SEVERAL PEOPLE — FC-242, FC-004's part 2 (knowledge/specs/FC-242-spaghetti-walkers.md).
 *
 * Up to four walkers (a label each — Operator 1, never a name), each up to twelve places in the order walked, the metres walked into a place only if given. The figures are
 * each walker's and everyone's together: the moves, the metres where every leg has one, who walks most, the place arrived at most, the routes two or more people walk. The
 * picture is to scale only when every place walked is on the layout; otherwise it is a schematic and says so. The figures are src/tools/spaghetti/walkers; this file is the
 * boxes, the words, the picture and the money. Line Talk fills these same boxes from a spoken walk (tools/talk/talkSets, the 'spag' set). */
import { PACE, type PaceKind } from '../../spaghetti/spaghetti';
import { WALKER_STYLES, WALKERS_MAX, STEPS_MAX, keyOf, sceneOf, walkersFigures, walkersShift, toScale, type Walker } from '../../spaghetti/walkers';
import { andList, fmt, gbp, pct, plural } from '../format';
import { BOARDS } from '../../linestandard/standard';
import { boardWalks, metresPerUnit, namesOf, pathsOf, readBoard, scaleSaid } from '../../spaghetti/board';
import type { CalcDef, CalcMoney, CalcPicture, CalcResult, Field, Inputs, Problem, Values } from '../types';

const LAYOUT_MAX = 12;
const nn = (i: number): string => String(i + 1).padStart(2, '0');
const wid = (k: number, part: 'label'): string => `w${k + 1}_${part}`;
const sid = (k: number, i: number, part: 'name' | 'm'): string => `w${k + 1}_s${nn(i)}_${part}`;
const lid = (i: number, part: 'name' | 'x' | 'y'): string => `l${nn(i)}_${part}`;
const num = (v: Values, k: string): number | undefined => v[k] as number | undefined;
const text = (v: Values, k: string): string => (typeof v[k] === 'string' ? (v[k] as string).trim() : '');

/** Is walker k asked for yet: the first always, the next once the one before has a name or a place. */
const walkerShown = (v: Values, k: number): boolean => k === 0 || !!text(v, wid(k - 1, 'label')) || !!text(v, sid(k - 1, 0, 'name'));

const walkerFields = (k: number): Field[] => {
  const w = k + 1;
  const drawn = (v: Values): boolean => boardWalks(readBoard(v.board));
  const out: Field[] = [{
    id: wid(k, 'label'), label: w === 1 ? 'Walker 1 — who' : `Walker ${w}`, kind: 'text', optional: true, showIf: v => walkerShown(v, k), quietIf: drawn,
    ...(k === 0 ? { help: 'A label — “Operator 1”, “the forklift” — never a name. Each walker is the places they went, in order.' } : {}),
  }];
  for (let i = 0; i < STEPS_MAX; i++) {
    const shown = (v: Values): boolean => walkerShown(v, k) && (i === 0 || !!text(v, sid(k, i - 1, 'name')));
    const named = (v: Values): boolean => shown(v) && !!text(v, sid(k, i, 'name'));
    out.push({ id: sid(k, i, 'name'), label: i === 0 ? `Walker ${w}: where they start` : `Walker ${w}: place ${i + 1}`, kind: 'text', optional: true, showIf: shown, quietIf: drawn,
      ...(k === 0 && i === 0 ? { help: 'The first place — “Packing line”. Then each place in the order walked, back to the line included. Each appears once the one above is named.' } : {}) });
    if (i > 0) out.push({ id: sid(k, i, 'm'), label: `Walker ${w}: metres walked to place ${i + 1}`, unit: 'm', kind: 'number', min: 0, optional: true, showIf: named,
      /* drawn on the board: the box is named by its move, and is only for a metres measured on the floor */
      dynamic: v => (drawn(v) ? { label: `${text(v, wid(k, 'label')) || `Walker ${w}`}, move ${i}: ${text(v, sid(k, i - 1, 'name'))} → ${text(v, sid(k, i, 'name'))} — metres measured`, help: i === 1 && k === 0 ? 'Leave blank to use the straight line on the board; type a metres measured with a tape or a wheel and it is used instead.' : undefined } : {}),
      ...(k === 0 && i === 1 ? { help: 'Only if it was paced, measured or said. Leave it blank if not: the move is counted, and the diagram says it is not to scale.' } : {}) });
  }
  return out;
};

const layoutFields = (): Field[] => {
  const out: Field[] = [];
  for (let i = 0; i < LAYOUT_MAX; i++) {
    const shown = (v: Values): boolean => i === 0 || !!text(v, lid(i - 1, 'name'));
    const quietIf = (v: Values): boolean => boardWalks(readBoard(v.board));
    const named = (v: Values): boolean => shown(v) && !!text(v, lid(i, 'name'));
    out.push({ id: lid(i, 'name'), label: i === 0 ? 'Layout: a place’s name, as written above' : `Layout: place ${i + 1}`, kind: 'text', optional: true, showIf: shown, quietIf,
      ...(i === 0 ? { help: 'Optional. To draw to scale, give every place walked its position on the plan — metres east and north of one corner. Names are matched to the places above.' } : {}) });
    out.push({ id: lid(i, 'x'), label: `Layout ${i + 1}: metres east`, unit: 'm', kind: 'number', min: 0, max: 5000, optional: true, showIf: named, quietIf });
    out.push({ id: lid(i, 'y'), label: `Layout ${i + 1}: metres north`, unit: 'm', kind: 'number', min: 0, max: 5000, optional: true, showIf: named, quietIf });
  }
  return out;
};

/** The walkers the boxes hold, each place taking its position from the layout by name. */
const walkersOf = (v: Values): Walker[] => {
  const at = new Map<string, { x?: number; y?: number }>();
  for (let i = 0; i < LAYOUT_MAX; i++) {
    const n = text(v, lid(i, 'name')); if (!n) break;
    at.set(keyOf(n), { ...(num(v, lid(i, 'x')) !== undefined ? { x: num(v, lid(i, 'x')) as number } : {}), ...(num(v, lid(i, 'y')) !== undefined ? { y: num(v, lid(i, 'y')) as number } : {}) });
  }
  const out: Walker[] = [];
  for (let k = 0; k < WALKERS_MAX; k++) {
    const steps: Walker['steps'] = [];
    for (let i = 0; i < STEPS_MAX; i++) {
      const place = text(v, sid(k, i, 'name')); if (!place) break;
      steps.push({ place, ...(i > 0 && num(v, sid(k, i, 'm')) !== undefined ? { m: num(v, sid(k, i, 'm')) as number } : {}), ...(at.get(keyOf(place)) ?? {}) });
    }
    const label = text(v, wid(k, 'label'));
    if (steps.length || label) out.push({ label: label || `Walker ${k + 1}`, steps });
  }
  return out;
};

/** Walkers as the boxes hold them: rows of [label, [place, metres into it]…] and the layout [name, east, north]. Used by the examples and by Line Talk. */
export function inputsOfWalkers(walkers: readonly { label: string; steps: readonly { place: string; m?: number }[] }[], more: Inputs = {}, layout: [string, number, number][] = []): Inputs {
  const out: Inputs = {};
  walkers.slice(0, WALKERS_MAX).forEach((w, k) => {
    if (w.label) out[wid(k, 'label')] = w.label;
    w.steps.slice(0, STEPS_MAX).forEach((s, i) => { out[sid(k, i, 'name')] = s.place; if (i > 0 && s.m !== undefined) out[sid(k, i, 'm')] = s.m; });
  });
  layout.slice(0, LAYOUT_MAX).forEach(([n, x, y], i) => { out[lid(i, 'name')] = n; out[lid(i, 'x')] = x; out[lid(i, 'y')] = y; });
  return { ...out, ...more };
};

/** The picture of a walk drawn on the board: the board itself — its areas and the places walked, each person's path in their own style —
 *  in metres when the scale is set (to scale, ticks every few metres), else in the board's own units, as drawn and said not to scale. */
function boardPicture(b: NonNullable<ReturnType<typeof readBoard>>, labels: string[], legend: NonNullable<CalcPicture['legend']>): CalcPicture {
  const k = metresPerUnit(b), W = BOARDS[b.shape].w, H = BOARDS[b.shape].h, f = k ?? 1;
  const at = (x: number, y: number): [number, number] => [(x / 100) * W * f, (H - (y / 100) * H) * f];
  const names = namesOf(b);
  const paths = pathsOf(b);
  const seen = new Set<string>(), dots: CalcPicture['dots'] = [];
  for (const p of paths) for (const pt of p.points) if (!seen.has(pt.id)) { seen.add(pt.id); const [x, y] = at(pt.x, pt.y); dots.push({ x, y, label: pt.name }); }
  const areas = b.marks.filter(m => m.kind === 'area').map(m => {
    const [x0, y1] = at(m.x - (m.w ?? 0) / 2, m.y - (m.h ?? 0) / 2), [x1, y0] = at(m.x + (m.w ?? 0) / 2, m.y + (m.h ?? 0) / 2);
    return { x0, y0, x1, y1, label: names.get(m.id) as string };
  });
  const st = tick(Math.max(W, H) * f);
  const ticks = (span: number): number[] => { const o: number[] = []; for (let t = 0; t <= span + 1e-9; t += st) o.push(t); return o; };
  const who = andList(labels.map((l, i) => `${l} ${WALKER_STYLES[i].word}`));
  return {
    aspect: W / H,
    title: k ? 'The walk on the board, to scale' : 'The walk on the board, as drawn (not to scale)',
    caption: k
      ? `The board as drawn, to one scale across and up (metres from its bottom-left corner): the areas, the places walked, and each move a straight line between the two places it joins. One style a person: ${who}.`
      : `NOT TO SCALE — the board as drawn, with no scale set; the moves are counted. One style a person: ${who}.`,
    x: k ? { label: 'Metres across the board', min: 0, max: W * f, ticks: ticks(W * f), fmt: x => fmt(x, 0) } : { label: 'Not to scale', min: 0, max: W, ticks: [], fmt: () => '' },
    y: k ? { label: 'Metres up', min: 0, max: H * f, ticks: ticks(H * f), fmt: y => fmt(y, 0) } : { label: '', min: 0, max: H, ticks: [], fmt: () => '' },
    lines: paths.map(p => ({ points: p.points.map(pt => at(pt.x, pt.y)), mark: WALKER_STYLES[p.walker].mark, dash: WALKER_STYLES[p.walker].dash })),
    verticals: [], horizontals: [], dots, legend, areas, ...(k ? {} : { schematic: true }),
  };
}

const metres = (m: number): string => (m >= 1000 ? `${fmt(m / 1000, 1)} km` : `${fmt(m, 0)} m`);
const mins = (m: number): string => `${fmt(m, 1)} min`;
const tick = (span: number): number => [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000].find(s => span / s <= 6) ?? 5000;
const routeWord = (r: { a: string; b: string }): string => `${r.a} and ${r.b}`;

const def: CalcDef = {
  key: 'spaghetti-walkers',
  fc: 'FC-242',
  title: 'Spaghetti diagram — several people',
  says: 'Up to four people’s paths on one diagram: the moves and metres each makes and all together, who walks most, the busiest place and the routes more than one person walks',
  question: 'Where do these people walk, who walks most, and which routes could be shared or removed?',
  group: 'Flow and lead time',
  drawn: 'spaghetti-board',
  inputs: [
    { id: 'board', label: 'The board', kind: 'text', optional: true, hidden: true },
    ...Array.from({ length: WALKERS_MAX }, (_, k) => walkerFields(k)).flat(),
    ...layoutFields(),
    { id: 'rounds', label: 'How many times each walks this round in a shift', unit: 'rounds', kind: 'number', min: 0.001, optional: true,
      help: 'Optional: it says the shift in minutes and money, and only once every move has a length. Everyone is taken to walk the same number of rounds.' },
    { id: 'pace', label: 'Walking pace', kind: 'choice', default: 'loaded',
      chosen: 'Luna’s starting point from the knowledge record, not a measurement: about 1.3 m/s when loaded or in a crowded hall; about 1.6 m/s unloaded at a standard pace (MTM-1’s walking element); or a pace timed on the floor — it moves the minutes by about a quarter.',
      options: [
        { value: 'loaded', label: 'Loaded or crowded', help: 'about 1.3 m/s' },
        { value: 'unloaded', label: 'Unloaded', help: 'about 1.6 m/s' },
        { value: 'timed', label: 'Timed on the floor', help: 'type the pace' },
      ] },
    { id: 'paceMs', label: 'The pace timed', unit: 'm/s', kind: 'number', min: 0.1, max: 4, showIf: v => v.pace === 'timed' },
    { id: 'rate', label: 'What an hour of a person walking costs', unit: '£ an hour', kind: 'number', min: 0, optional: true, money: true,
      from: { source: 'labourRate', where: 'a wage on its set-up', words: 'the line’s wage with on-costs' }, help: 'The wage with on-costs — the walking is the person’s time, labour.' },
    { id: 'shiftsWeek', label: 'Shifts a week these people work the round', unit: 'shifts', kind: 'number', min: 0, optional: true, money: true, help: 'To say the walking in money a week.' },
  ],
  check(v): Problem[] {
    const out: Problem[] = [];
    const ws = walkersOf(v);
    const walking = ws.filter(w => w.steps.length >= 2);
    if (!walking.length) { out.push({ field: sid(0, Math.min(Math.max(ws[0]?.steps.length ?? 0, 1), STEPS_MAX - 1), 'name'), say: 'A walk needs at least two places — one move between them. Name the next place.', block: true }); return out; }
    for (const w of ws) if (w.steps.length === 1) out.push({ say: `${w.label} has one place so far — nothing walked yet, so ${w.label} is left out.` });
    const f = walkersFigures(ws);
    if (!f.complete && f.m > 0) out.push({ say: `${f.missing} of ${f.legs} moves have no length yet, so the metres below are the ones given and the moves are counted for everyone.` });
    if (!f.complete && num(v, 'rounds') !== undefined) out.push({ say: 'Rounds a shift are given, but not every move has a length — the shift in minutes and money waits for them.' });
    const bd = readBoard(v.board);
    if (boardWalks(bd) && bd && !metresPerUnit(bd)) out.push({ say: 'The walk is drawn on the board but no scale is set, so the moves are counted, not measured. Set the scale — two taps and the metres between them — to have every move’s length.' });
    const placed = ws.flatMap(w => w.steps).some(s => s.x !== undefined && s.y !== undefined);
    if (placed && !toScale(ws)) out.push({ say: 'Not every place walked has a position on the layout, so the picture is a schematic, not to scale. Give each place its position to draw it to scale.' });
    if (f.legs > 0 && f.walkers.every(w => w.legList.every(l => l.source === 'straight'))) out.push({ say: 'Every move is a straight line between positions — a floor on the distance walked, since a person goes round a guard.' });
    return out;
  },
  compute(v): CalcResult {
    const ws = walkersOf(v).filter(w => w.steps.length >= 2);
    const f = walkersFigures(ws);
    const many = f.walkers.length > 1;
    const sc = sceneOf(ws);
    const rounds = num(v, 'rounds');
    const shift = f.complete && rounds !== undefined
      ? walkersShift(f, { rounds, pace: v.pace as PaceKind, ...(num(v, 'paceMs') !== undefined ? { paceMs: num(v, 'paceMs') as number } : {}), ...(num(v, 'rate') !== undefined ? { rate: num(v, 'rate') as number } : {}), ...(num(v, 'shiftsWeek') !== undefined ? { shiftsWeek: num(v, 'shiftsWeek') as number } : {}) })
      : undefined;
    const who = f.walkers.length === 1 ? f.walkers[0].label : `${f.walkers.length} walkers`;
    const most = f.most;

    const sentence = f.complete
      ? `${who} ${many ? 'make' : 'makes'} ${plural(f.legs, 'move')} a round, ${metres(f.m)} ${many ? 'together' : 'in all'}.${many && most ? ` ${most.label} walks most — ${metres(most.value)} (${pct(most.share, 0)}).` : ''}${f.busiest ? ` ${f.busiest.place} is arrived at most — ${plural(f.busiest.n, 'time')}.` : ''}`
      : `${who} ${many ? 'make' : 'makes'} ${plural(f.legs, 'move')} a round${f.m > 0 ? `; the length is known for ${f.legs - f.missing} of them (${metres(f.m)})` : '; no lengths were given'}, so moves are counted, not metres.${many && most ? ` ${most.label} makes the most — ${most.value} of ${f.legs} (${pct(most.share, 0)}).` : ''}${f.busiest ? ` ${f.busiest.place} is arrived at most — ${plural(f.busiest.n, 'time')}.` : ''}`;

    const more: string[] = [];
    if (many) {
      if (f.routes.length) more.push(`Walked by more than one person: ${f.routes.slice(0, 4).map(r => `${routeWord(r)} — ${andList(r.walkers)}${r.complete ? `, ${metres(r.m)}${f.complete && f.m > 0 ? ` (${pct(r.m / f.m, 0)} of a round)` : ''}` : `, ${plural(r.legs, 'move')}`}`).join(' · ')}${f.routes.length > 4 ? ` · and ${f.routes.length - 4} more` : ''}.`);
      else more.push('No route is walked by more than one person: the paths do not cross.');
    }
    if (f.routes[0]) more.push(`Ask of each shared route: could what is fetched be staged where it is used, or could one person fetch for both?`);
    if (shift) more.push(`A shift of ${fmt(shift.rounds, shift.rounds % 1 ? 1 : 0)} ${shift.rounds === 1 ? 'round' : 'rounds'} each: ${metres(shift.shiftM)} ${many ? 'together' : ''} — ${mins(shift.minutes)} of walking at ${fmt(shift.ms, 1)} m/s${v.pace === 'timed' ? ' (timed on the floor)' : ` (${PACE[v.pace as 'loaded' | 'unloaded'].label})`}${many ? `: ${shift.perWalker.map(p => `${p.label} ${mins(p.minutes)}`).join(' · ')}` : ''}.`);
    const drawnOn = readBoard(v.board);
    if (drawnOn && boardWalks(drawnOn)) {
      const said = scaleSaid(drawnOn);
      more.push(said ? `Drawn on the board. ${said} A move’s metres are the straight line between the two places unless a measured one was typed.` : 'Drawn on the board, with no scale set: the picture is as drawn, not to scale, and the moves are counted.');
    } else if (!sc.toScale) more.push('The picture is a schematic — not to scale. Give every place its position on the layout to draw it to scale.');

    const legend = f.walkers.map((w, k) => ({ label: w.label, mark: WALKER_STYLES[k].mark, dash: WALKER_STYLES[k].dash }));
    let picture: CalcPicture | undefined;
    const bd = readBoard(v.board);
    if (bd && boardWalks(bd)) picture = boardPicture(bd, f.walkers.map(w => w.label), legend);
    else if (sc.lines.length) {
      const wn = sc.window;
      const st = tick(Math.max(wn.x1 - wn.x0, wn.y1 - wn.y0));
      const ticks = (a: number, b: number): number[] => { const o: number[] = []; for (let t = Math.ceil(a / st) * st; t <= b + 1e-9; t += st) o.push(t); return o; };
      picture = {
        aspect: (wn.x1 - wn.x0) / (wn.y1 - wn.y0),
        title: sc.toScale ? 'The paths on the layout, to scale' : 'The paths, as a schematic (not to scale)',
        caption: sc.toScale
          ? `Each move is a line between the two places it joins, drawn to one scale across and up (metres from the layout’s corner), one style a person: ${andList(f.walkers.map((w, k) => `${w.label} ${WALKER_STYLES[k].word}`))}.`
          : `NOT TO SCALE — the places are set round a circle so the paths can be read; the distances are in the figures, where they were given. One style a person: ${andList(f.walkers.map((w, k) => `${w.label} ${WALKER_STYLES[k].word}`))}.`,
        x: sc.toScale ? { label: 'Metres east of the corner', min: wn.x0, max: wn.x1, ticks: ticks(wn.x0, wn.x1), fmt: x => fmt(x, 0) } : { label: 'Not to scale', min: wn.x0, max: wn.x1, ticks: [], fmt: () => '' },
        y: sc.toScale ? { label: 'Metres north', min: wn.y0, max: wn.y1, ticks: ticks(wn.y0, wn.y1), fmt: y => fmt(y, 0) } : { label: '', min: wn.y0, max: wn.y1, ticks: [], fmt: () => '' },
        lines: sc.lines.map(l => ({ points: l.points, mark: WALKER_STYLES[l.walker].mark, dash: WALKER_STYLES[l.walker].dash })),
        verticals: [], horizontals: [], dots: sc.dots, legend, ...(sc.toScale ? {} : { schematic: true }),
      };
    }

    let money: CalcMoney;
    if (shift && shift.money.perShift !== undefined) {
      money = { text: `${fmt(shift.minutes, 1)} min of walking a shift at ${gbp(num(v, 'rate') as number)} an hour is ${gbp(shift.money.perShift)} a shift${shift.money.perWeek !== undefined ? ` — ${gbp(shift.money.perWeek)} over ${fmt(num(v, 'shiftsWeek') as number, 0)} shifts a week` : ''}.`, missing: shift.money.missing };
    } else if (!f.complete) money = { missing: ['Give the metres walked for every move (or place every place on the layout), the rounds a shift and what an hour costs, to say the walking in minutes and money.'] };
    else if (!shift) money = { missing: ['Give how many rounds each walks in a shift to say the walking in minutes and money.'] };
    else money = { missing: shift.money.missing };

    const route = (w: (typeof f.walkers)[number]): string => w.legList.length ? `${w.legList[0].from}${w.legList.map(l => ` → ${l.to}${l.m !== undefined ? ` (${fmt(l.m, 1)} m)` : ''}`).join('')}` : '';
    const tiles: CalcResult['tiles'] = [
      f.complete
        ? { k: 'Together', v: metres(f.m), of: `${plural(f.legs, 'move')} a round`, n: f.m, better: 'lower', fmt: x => metres(x) }
        : { k: 'Together', v: plural(f.legs, 'move'), of: f.m > 0 ? `${metres(f.m)} where given` : 'no lengths given', n: f.legs, better: 'lower', counted: true, fmt: x => plural(x, 'move') },
      many && most ? { k: 'Walks most', v: most.label, of: most.by === 'metres' ? metres(most.value) : plural(most.value, 'move') } : { k: 'Walkers', v: String(f.walkers.length), of: 'on the diagram' },
      f.busiest ? { k: 'Busiest place', v: f.busiest.place, of: plural(f.busiest.n, 'arrival') } : { k: 'Busiest place', v: '—', of: 'no moves yet' },
      many ? { k: 'Shared routes', v: String(f.routes.length), of: f.routes.length ? 'walked by 2 or more' : 'no paths cross', n: f.routes.length, better: 'lower', counted: true, fmt: x => plural(x, 'route') } : { k: 'Places', v: String(f.places.length), of: 'walked to' },
      ...(shift ? [{ k: 'Walked a shift', v: metres(shift.shiftM), of: `${fmt(shift.rounds, shift.rounds % 1 ? 1 : 0)} ${shift.rounds === 1 ? 'round' : 'rounds'} each`, n: shift.shiftM, better: 'lower' as const, fmt: (x: number) => metres(x) },
        shift.money.perShift !== undefined ? { k: 'Labour a shift', v: gbp(shift.money.perShift), of: 'on the walking', n: shift.money.perShift, better: 'lower' as const, fmt: gbp } : { k: 'Labour a shift', v: '—', of: 'give the hourly cost' }] : []),
    ];

    return {
      verdict: shift ? `${metres(shift.shiftM)} a shift` : f.complete ? `${metres(f.m)} a round` : plural(f.legs, 'move'),
      tone: 'n',
      sentence,
      more,
      tiles,
      working: [
        ...f.walkers.map(w => ({ label: w.label, value: `${plural(w.legs, 'move')}${w.missing < w.legs ? ` · ${fmt(w.m, 1)} m` : ''}`, note: route(w) })),
        ...(many ? f.routes.map(r => ({ label: `Shared: ${routeWord(r)}`, value: `${andList(r.walkers)}${r.complete ? ` · ${fmt(r.m, 1)} m` : ` · ${plural(r.legs, 'move')}`}` })) : []),
        { label: 'A round, together', value: f.complete ? `Σ every move = ${fmt(f.m, 1)} m over ${plural(f.legs, 'move')}` : `${plural(f.legs, 'move')}; ${fmt(f.m, 1)} m where a length was given` },
        ...(shift ? [{ label: 'A shift', value: `${fmt(f.m, 1)} m × ${fmt(shift.rounds, shift.rounds % 1 ? 1 : 0)} rounds = ${fmt(shift.shiftM, 0)} m`, note: `${fmt(shift.shiftM, 0)} m ÷ ${fmt(shift.ms, 2)} m/s ÷ 60 = ${fmt(shift.minutes, 2)} min` }] : []),
      ],
      caveats: [
        'What was seen in one round may not be typical: follow several rounds and say the range.',
        'A move with no length is counted, never given one; the metres are only those paced, measured or said, and a straight line between two positions is a floor, not the way walked.',
        'Walking is not all waste: some trips carry needed material. Nothing here reads where a person went — every place and every metre is typed or said.',
        ...(sc.toScale ? [] : ['Without positions the picture is arranged for reading, not measured: do not read a distance off it.']),
      ],
      money,
      ...(picture ? { picture } : {}),
      closing: `${who[0].toUpperCase()}${who.slice(1)} ${many ? 'make' : 'makes'} ${plural(f.legs, 'move')} a round${f.complete ? ` — ${metres(f.m)}` : ''}${many && most ? `; ${most.label} ${most.by === 'metres' ? 'walks' : 'makes'} the most` : ''}${f.busiest ? `; the busiest place is ${f.busiest.place}` : ''}.${f.routes[0] ? ` Look first at ${routeWord(f.routes[0])}, walked by ${andList(f.routes[0].walkers)}: stage what is fetched where it is used, or fetch for both in one trip.` : ' Look at the longest move first: could what is fetched come to the person?'}`,
    };
  },
  examples: [
    {
      name: 'three operators from the packing line — metres given, 10 rounds a shift, with its money',
      source: 'scripts/knowledge/cases-kaizen.py S3 (130 + 98 + 50 = 278 m a round; the line arrived at 5 times; Film store ↔ line 160 m, Case store ↔ line 100 m; 2,780 m a shift, 35.6 min, £14.85 a shift at £25 an hour)',
      inputs: inputsOfWalkers([
        { label: 'Operator 1', steps: [{ place: 'Packing line' }, { place: 'Film store', m: 40 }, { place: 'Packing line', m: 40 }, { place: 'Case store', m: 25 }, { place: 'Packing line', m: 25 }] },
        { label: 'Operator 2', steps: [{ place: 'Packing line' }, { place: 'Scale', m: 9 }, { place: 'Packing line', m: 9 }, { place: 'Film store', m: 40 }, { place: 'Packing line', m: 40 }] },
        { label: 'Operator 3', steps: [{ place: 'Packing line' }, { place: 'Case store', m: 25 }, { place: 'Packing line', m: 25 }] },
      ], { rounds: 10, pace: 'loaded', rate: 25, shiftsWeek: 5 }),
      expect: {
        verdict: '2.8 km a shift', tone: 'n',
        sentence: '3 walkers make 10 moves a round, 278 m together. Operator 1 walks most — 130 m (47%). Packing line is arrived at most — 5 times.',
        tiles: { Together: '278 m', 'Walks most': 'Operator 1', 'Busiest place': 'Packing line', 'Shared routes': '2', 'Walked a shift': '2.8 km', 'Labour a shift': '£14.85' },
        money: '35.6 min of walking a shift at £25.00 an hour is £14.85 a shift — £74.25 over 5 shifts a week.',
      },
    },
    {
      name: 'the same walk said without any metres — moves are counted, not metres',
      source: 'scripts/knowledge/cases-kaizen.py S3 (10 moves; Operator 1 makes 4 of them, 40%; the same busiest place and shared routes)',
      inputs: inputsOfWalkers([
        { label: 'Operator 1', steps: [{ place: 'Packing line' }, { place: 'Film store' }, { place: 'Packing line' }, { place: 'Case store' }, { place: 'Packing line' }] },
        { label: 'Operator 2', steps: [{ place: 'Packing line' }, { place: 'Scale' }, { place: 'Packing line' }, { place: 'Film store' }, { place: 'Packing line' }] },
        { label: 'Operator 3', steps: [{ place: 'Packing line' }, { place: 'Case store' }, { place: 'Packing line' }] },
      ]),
      expect: {
        verdict: '10 moves', tone: 'n',
        sentence: '3 walkers make 10 moves a round; no lengths were given, so moves are counted, not metres. Operator 1 makes the most — 4 of 10 (40%). Packing line is arrived at most — 5 times.',
        tiles: { Together: '10 moves', 'Walks most': 'Operator 1', 'Busiest place': 'Packing line', 'Shared routes': '2' },
        warns: [],
      },
    },
    {
      name: 'two operators on a plan — every place positioned, so drawn to scale from straight lines',
      source: 'scripts/knowledge/cases-kaizen.py S3b (the line at (30, 0), the film store at (0, 0), the scale at (30, 16): A walks 30 + 30 = 60 m, B 16 + 16 = 32 m; 92 m together, A 65%)',
      inputs: inputsOfWalkers([
        { label: 'Operator 1', steps: [{ place: 'Packing line' }, { place: 'Film store' }, { place: 'Packing line' }] },
        { label: 'Operator 2', steps: [{ place: 'Packing line' }, { place: 'Scale' }, { place: 'Packing line' }] },
      ], {}, [['Packing line', 30, 0], ['Film store', 0, 0], ['Scale', 30, 16]]),
      expect: {
        verdict: '92 m a round', tone: 'n',
        sentence: '2 walkers make 4 moves a round, 92 m together. Operator 1 walks most — 60 m (65%). Packing line is arrived at most — 2 times.',
        tiles: { Together: '92 m', 'Walks most': 'Operator 1', 'Busiest place': 'Packing line', 'Shared routes': '0' },
        warns: ['Every move is a straight line between positions'],
      },
    },
  ],
  refused: [
    { name: 'no place named', inputs: {}, blocked: 'A walk needs at least two places' },
    { name: 'one place only', inputs: inputsOfWalkers([{ label: 'Operator 1', steps: [{ place: 'Packing line' }] }]), blocked: 'A walk needs at least two places' },
  ],
  see: [{ key: 'spaghetti', why: 'one person’s round, to scale, with its trips ranked and its walking in money' }, { key: 'process-flow', why: 'the product’s own path, step by step, with its moves and its waits' }],
};

export default def;
