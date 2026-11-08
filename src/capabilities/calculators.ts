/* THE CALCULATORS — how AI Mode gets a figure: never worked out by the model, always by the calculator's own definition
 * (tools/calc/registry CALCS, tools/calc/calc runCalc — the module the calculator's page, its paper and its tests read). Kept as a
 * record the way the calculator's New does (tools/calc/CalcScreen NewCalc), so it shows in Manual Mode with its sentence and paper. */
import { getProject, getWorkspace, putStudy } from '../db';
import { CALCS, calcByKey } from '../tools/calc/registry';
import { inputSaid, runCalc, startInputs } from '../tools/calc/calc';
import type { CalcDef, Field, Inputs } from '../tools/calc/types';
import type { ToolStudy } from '../lib/study';
import { studyHref } from '../lib/studyLinks';
import { uid } from '../lib/ids';
import { checkObject, ID } from './check';
import { anyone, mayEdit } from './access';
import type { CapCtx, CapResult, Capability } from './types';
import { lineRef, plural, projectRef } from './util';

/** The boxes a person can be asked for — never the hidden ones a timer keeps. */
const asked = (def: CalcDef): Field[] => def.inputs.filter(f => !f.hidden);

const inputOf = (f: Field) => ({
  name: f.id, label: f.label, kind: f.kind, ...(f.unit ? { unit: f.unit } : {}), ...(f.optional || f.money ? { optional: true } : {}),
  ...(f.options ? { options: f.options.map(o => o.value) } : {}), ...(f.help ? { help: f.help } : {}),
  ...(f.min !== undefined ? { min: f.min } : {}), ...(f.max !== undefined ? { max: f.max } : {}),
});

export const listCalculators: Capability = {
  name: 'list_calculators', title: 'The calculators', kind: 'read',
  validate: raw => checkObject(raw, { words: { kind: 'string', label: 'words to look for', max: 120 } }),
  allowed: anyone,
  async run(_ctx, input: { words?: string }): Promise<CapResult> {
    const w = input.words?.toLowerCase().split(/\s+/).filter(Boolean) ?? [];
    const list = CALCS.filter(c => !w.length || w.some(x => `${c.title} ${c.says} ${c.question} ${c.group}`.toLowerCase().includes(x)));
    return {
      ok: true,
      says: list.length ? `${plural(list.length, 'calculator')}${w.length ? ` for “${input.words}”` : ''}: ${list.map(c => c.title).join(', ')}.` : `No calculator for “${input.words}”.`,
      data: list.map(c => ({ key: c.key, title: c.title, says: c.says, question: c.question, inputs: asked(c).map(inputOf) })),
      refs: list.slice(0, 12).map(c => ({ kind: 'page' as const, id: c.key, label: c.title, href: `/calc/${c.key}` })),
    };
  },
};

/** The figures given, checked against the calculator: its key known, every name one of its boxes. */
function calcInputs(input: { key: string; inputs: Inputs }): { ok: true; def: CalcDef; inputs: Inputs } | { ok: false; why: string } {
  const def = calcByKey(input.key);
  if (!def) return { ok: false, why: `There is no calculator called “${input.key}” — list the calculators to find its key.` };
  const names = new Set(asked(def).map(f => f.id));
  const odd = Object.keys(input.inputs).filter(k => !names.has(k));
  if (odd.length) return { ok: false, why: `The ${def.title} calculator does not take ${odd.join(', ')} — its inputs are ${[...names].join(', ')}.` };
  return { ok: true, def, inputs: { ...startInputs(def), ...input.inputs } };
}

const validateRun = (raw: unknown) => checkObject(raw, { key: { kind: 'string', label: 'the calculator’s key', required: true, max: 80 }, inputs: { kind: 'record', label: 'the inputs', required: true } });

export const runCalculator: Capability = {
  name: 'run_calculator', title: 'Work it out', kind: 'read',
  validate: validateRun,
  allowed: anyone,
  async run(_ctx, input: { key: string; inputs: Inputs }): Promise<CapResult> {
    const got = calcInputs(input);
    if (!got.ok) return got;
    const { def } = got;
    const r = runCalc(def, got.inputs);
    /* refused: every box it still needs or cannot take, named — nothing is worked out around it */
    if (!r.result) return { ok: false, why: `The ${def.title} calculator cannot work it out yet: ${r.problems.filter(p => p.block).map(p => p.say).join(' ')}` };
    const res = r.result;
    const warns = r.problems.filter(p => !p.block).map(p => p.say);
    return {
      ok: true,
      says: `${def.title}: ${res.sentence}${res.money?.text ? ` ${res.money.text}` : ''}`,
      data: {
        key: def.key, title: def.title, verdict: res.verdict, sentence: res.sentence, ...(res.more?.length ? { more: res.more } : {}),
        tiles: res.tiles.map(t => ({ figure: t.k, value: t.v, ...(t.of ? { of: t.of } : {}) })),
        ...(res.money ? { money: { ...(res.money.text ? { text: res.money.text } : {}), missing: res.money.missing } } : {}),
        caveats: res.caveats, ...(warns.length ? { warnings: warns } : {}), closing: res.closing,
        inputs: asked(def).filter(f => r.values[f.id] !== undefined).map(f => ({ name: f.id, said: inputSaid(f, r.values) })),
      },
      refs: [{ kind: 'page', id: def.key, label: def.title, href: `/calc/${def.key}` }],
    };
  },
};

export const saveCalculation: Capability = {
  name: 'save_calculation', title: 'Keep a calculation', kind: 'write',
  validate: raw => checkObject(raw, { key: { kind: 'string', label: 'the calculator’s key', required: true, max: 80 }, inputs: { kind: 'record', label: 'the inputs', required: true }, lineId: ID('the line'), projectId: ID('the project'), name: { kind: 'string', label: 'its name', max: 120 } }),
  allowed: (ctx: CapCtx, input: { projectId?: string }) => mayEdit(ctx, input.projectId),
  async preview(_ctx, input: { key: string; name?: string; lineId?: string; projectId?: string }) {
    const def = calcByKey(input.key);
    const [line, p] = await Promise.all([input.lineId ? getWorkspace(input.lineId) : undefined, input.projectId ? getProject(input.projectId) : undefined]);
    return `Keep a ${def?.title ?? input.key} calculation${input.name ? ` called “${input.name}”` : ''}${line ? ` on ${line.name}` : ' as a quick session (no line)'}${p ? `, in ${p.name}` : ''}, with the figures given.`;
  },
  async run(ctx, input: { key: string; inputs: Inputs; lineId?: string; projectId?: string; name?: string }): Promise<CapResult> {
    const got = calcInputs(input);
    if (!got.ok) return got;
    const { def } = got;
    const [line, p] = await Promise.all([input.lineId ? getWorkspace(input.lineId) : undefined, input.projectId ? getProject(input.projectId) : undefined]);
    if (input.lineId && (!line)) return { ok: false, why: 'There is no line with that id on this device — find it by name first.' };
    if (input.projectId && (!p || p.deletedAt)) return { ok: false, why: 'There is no project with that id on this device — find it by name first.' };
    const t = ctx.now;
    /* as the calculator's New makes one (tools/calc/CalcScreen NewCalc), with the figures in */
    const s: ToolStudy = {
      id: uid(), tool: 'calc', name: input.name?.trim() || def.title, ...(line ? { workspaceId: line.id } : {}), ...(p ? { projectId: p.id } : {}),
      agreed: { calc: { key: def.key, inputs: got.inputs } }, facts: {}, uses: [], startedAt: t, createdAt: t, updatedAt: t,
    };
    await putStudy(s);
    const r = runCalc(def, got.inputs);
    const href = studyHref(s);
    return {
      ok: true,
      says: `Kept “${s.name}”${line ? ` on ${line.name}` : ''}. ${r.result ? r.result.sentence : `It still needs: ${r.problems.filter(x => x.block).map(x => x.say).join(' ')}`}`,
      data: { id: s.id, href },
      refs: [{ kind: 'study', id: s.id, label: s.name, href }, ...(line ? [lineRef(line)] : []), ...(p ? [projectRef(p)] : [])],
    };
  },
};
