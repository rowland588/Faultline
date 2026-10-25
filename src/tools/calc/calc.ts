/* RUNNING A CALCULATOR — pure (knowledge/specs/FC-235-calculators.md). The record's inputs go in; the checks on the boxes,
 * the result, the what-if and the change since the saved before come out. Nothing here is a calculator's own formula: that is
 * the definition's. The page (CalcScreen), the paper (lib/report/calcPaper), the line's tile and report (lib/studyLinks) and the
 * acceptance script all read this one module, so the screen, the paper and the test say one thing. */
import { labourPerHour } from '../../lib/cost';
import { since, type LeanTile, type LeanTone } from '../../lib/lean';
import type { AgreedCalc, ToolStudy } from '../../lib/study';
import { calcByKey } from './registry';
import { fmt } from './format';
import type { CalcDef, CalcResult, CalcTile, Field, Inputs, Offer, Problem, Values } from './types';

/** The fields a set of values asks for now — a field with a `showIf` that does not hold is not asked. */
export const askedFields = (def: CalcDef, v: Values): Field[] => def.inputs.filter(f => !f.showIf || f.showIf(v));

const toNumber = (x: unknown): number | undefined => {
  if (typeof x === 'number') return Number.isFinite(x) ? x : undefined;
  if (typeof x === 'string' && x.trim() !== '' && Number.isFinite(Number(x.replace(/,/g, '')))) return Number(x.replace(/,/g, ''));
  return undefined;
};

/** The record's inputs as the formula is handed them: numbers parsed (blank or not a number is undefined), a choice kept as its
 *  value (its default when never set), a field that is not being asked left out. */
export function valuesOf(def: CalcDef, inputs: Inputs | undefined): Values {
  const raw = inputs ?? {};
  const v: Values = {};
  /* two passes: showIf may read a choice made in the same record */
  for (const f of def.inputs) {
    const x = raw[f.id];
    v[f.id] = f.kind === 'number' ? toNumber(x) : f.kind === 'choice' ? (typeof x === 'string' && x ? x : typeof f.default === 'string' ? f.default : undefined) : typeof x === 'string' ? x : undefined;
  }
  for (const f of def.inputs) if (f.showIf && !f.showIf(v)) v[f.id] = undefined;
  return v;
}

/** What is wrong with each box on its own: a needed one blank, outside its range, not whole. */
export function fieldProblems(def: CalcDef, v: Values): Problem[] {
  const out: Problem[] = [];
  for (const f of askedFields(def, v)) {
    const x = v[f.id];
    if (f.kind === 'choice') {
      if (x === undefined || !(f.options ?? []).some(o => o.value === x)) { if (!f.optional) out.push({ field: f.id, say: `Choose “${f.label}”.`, block: true }); }
      continue;
    }
    if (f.kind === 'text') continue;
    if (x === undefined) { if (!f.optional) out.push({ field: f.id, say: `Give “${f.label}”.`, block: true }); continue; }
    const n = x as number;
    if (f.integer && !Number.isInteger(n)) out.push({ field: f.id, say: `“${f.label}” must be a whole number.`, block: true });
    else if (f.min !== undefined && n < f.min) out.push({ field: f.id, say: `“${f.label}” must be at least ${fmt(f.min, 6)}.`, block: true });
    else if (f.max !== undefined && n > f.max) out.push({ field: f.id, say: `“${f.label}” must be at most ${fmt(f.max, 6)}.`, block: true });
  }
  return out;
}

/** A calculation run: the values, everything said about them, and — when nothing blocks — the result. */
export interface Run { values: Values; problems: Problem[]; blocked: boolean; result?: CalcResult }

export function runCalc(def: CalcDef, inputs: Inputs | undefined): Run {
  const values = valuesOf(def, inputs);
  const own = fieldProblems(def, values);
  const problems = own.some(p => p.block) ? own : [...own, ...(def.check?.(values) ?? [])];
  const blocked = problems.some(p => p.block);
  if (blocked) return { values, problems, blocked };
  try {
    return { values, problems, blocked, result: def.compute(values) };
  } catch (e) {
    /* a definition that throws on inputs it did not foresee must not take the page down */
    console.error('calculator failed', def.key, e);
    return { values, problems: [...problems, { say: 'This could not be worked out from these figures.', block: true }], blocked: true };
  }
}

/** The calculator a record is, and what it says now. */
export function studyCalc(s: Pick<ToolStudy, 'agreed'>): { def: CalcDef; agreed: AgreedCalc; run: Run } | undefined {
  const agreed = s.agreed?.calc;
  const def = calcByKey(agreed?.key);
  return agreed && def ? { def, agreed, run: runCalc(def, agreed.inputs) } : undefined;
}

/** The record's name for what it is: the calculator's title. */
export const calcTitle = (s: Pick<ToolStudy, 'agreed'>): string => calcByKey(s.agreed?.calc?.key)?.title ?? 'Calculator';

/** What a record says in one place — the line's tile, the list's row, the line report: sentence, verdict and tone. */
export function calcSays(s: Pick<ToolStudy, 'agreed'>): { text: string; tone: LeanTone; verdict: string } {
  const c = studyCalc(s);
  if (!c) return { text: s.agreed?.calc ? 'this calculator is not in this version of the app' : 'not set up yet', tone: 'n', verdict: s.agreed?.calc ? 'Unknown calculator' : 'Not set up' };
  if (!c.run.result) return { text: c.run.problems.find(p => p.block)?.say ?? 'Give the figures it needs.', tone: 'n', verdict: 'Figures needed' };
  return { text: c.run.result.sentence, tone: c.run.result.tone, verdict: c.run.result.verdict };
}

/** The saved before, worked out again from the inputs it kept (the formula may have been improved since — it is read as the formula says it now). */
export function beforeRun(def: CalcDef, agreed: AgreedCalc): Run | undefined {
  return agreed.before ? runCalc(def, agreed.before.inputs) : undefined;
}

/** The tiles with each one's change since the saved before ("2 kanbans fewer than the saved before"), where both have a number. */
export function tilesSince(now: CalcTile[], before: CalcTile[] | undefined, against = 'the saved before'): LeanTile[] {
  return now.map(t => {
    const b = before?.find(x => x.k === t.k);
    const { n, better, fmt: fm, counted, ...tile } = t;
    if (n === undefined || b?.n === undefined) return tile;
    const ch = since(n, b.n, { fmt: fm ?? (x => fmt(x, 2)), higher: better === 'higher', against, same: 1e-9, counted: !!counted });
    return ch ? { ...tile, change: better ? ch : { dir: ch.dir, text: ch.text } } : tile;
  });
}

/** One input changed and the rest as they are — the what-if. `value` is what was typed (a string) or chosen. */
export function whatIf(def: CalcDef, inputs: Inputs | undefined, id: string, value: string | number): Run {
  return runCalc(def, { ...(inputs ?? {}), [id]: value });
}

/* ------------------------------------------------------------------ what the line offers */

/** What a line holds of its cost model (lib/cost; Workspace). */
export interface LineFacts {
  name?: string;
  labourRatePerHour?: number; labourBurden?: number; materialsPerPack?: number; packsPerMin?: number; marginPerPack?: number;
}

/** The figure the line offers for a field, in the field's own unit — or undefined when the line does not have it. */
export function offered(o: Offer, line: LineFacts | undefined): number | undefined {
  if (!line) return undefined;
  let x: number | undefined;
  if (o.source === 'labourRate') { const h = labourPerHour({ crew: 1, ...(line.labourRatePerHour !== undefined ? { labourRatePerHour: line.labourRatePerHour } : {}), ...(line.labourBurden !== undefined ? { labourBurden: line.labourBurden } : {}) }); x = h > 0 ? h : undefined; }
  else if (o.source === 'materialsPerPack') x = line.materialsPerPack;
  else if (o.source === 'packsPerMin') x = line.packsPerMin;
  else x = line.marginPerPack;
  if (x === undefined || !(x > 0)) return undefined;
  return Math.round(x * (o.times ?? 1) * 100) / 100;
}

/** The record after the box `id` is typed over: the new value, and its offered source forgotten — or kept as `from` when the value
 *  IS the line's offer ("Line 7’s set-up"). */
export function typedOver(agreed: AgreedCalc, id: string, value: string | number, from?: string): AgreedCalc {
  const { [id]: _gone, ...rest } = agreed.src ?? {};
  void _gone;
  const src = from ? { ...rest, [id]: from } : rest;
  const { src: _s, ...base } = agreed;
  void _s;
  return { ...base, inputs: { ...agreed.inputs, [id]: value }, ...(Object.keys(src).length ? { src } : {}) };
}

/** The record after the box `id` is emptied: its value and its source both gone. */
export function dropped(agreed: AgreedCalc, id: string): AgreedCalc {
  const { [id]: _v, ...inputs } = agreed.inputs;
  const { [id]: _g, ...rest } = agreed.src ?? {};
  void _v; void _g;
  const { src: _s, ...base } = agreed;
  void _s;
  return { ...base, inputs, ...(Object.keys(rest).length ? { src: rest } : {}) };
}

/** The starting inputs of a new record: only what a definition says is its own chosen default. */
export function startInputs(def: CalcDef): Inputs {
  const out: Inputs = {};
  for (const f of def.inputs) if (f.default !== undefined) out[f.id] = f.default;
  return out;
}

/** An input as the paper and the page say it: "2.4 hours", "£0.85 a unit", "15%", a choice by its label. */
export function inputSaid(f: Field, v: Values): string {
  const x = v[f.id];
  if (x === undefined || x === '') return '—';
  if (f.kind === 'choice') return (f.options ?? []).find(o => o.value === x)?.label ?? String(x);
  if (typeof x === 'number') return `${fmt(x, 6)}${f.unit ? ` ${f.unit}` : ''}`;
  return String(x);
}
