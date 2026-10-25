/* THE CALCULATOR SHAPE, PROVED ONCE FOR EVERY DEFINITION (knowledge/specs/FC-235-calculators.md).
 *
 * This loops over EVERY definition the registry finds, so a calculator added later is covered by it with no change here: its
 * worked examples (written from an independent source — see each `source`) must come out exactly; its refused inputs must be
 * refused in the words it names; a needed box left blank must stop the result and say which; a money box left blank must never
 * stop it; the picture, when it has one, must lie inside its own axes; the wording must be the house's. The arithmetic of each
 * method is proved separately (lib/ie/__tests__/…) against SciPy or a textbook, never against its own output. */
import { describe, expect, it } from 'vitest';
import { entryById } from '../../../catalogue';
import { CALCS, calcByKey, calcGroups } from '../registry';
import { askedFields, beforeRun, calcSays, calcTitle, offered, runCalc, startInputs, studyCalc, tilesSince, typedOver, valuesOf, whatIf } from '../calc';
import type { CalcDef, Inputs } from '../types';
import type { ToolStudy } from '../../../lib/study';

const OLD_WORDS = /\b(job|jobs|snag|snags|workspace|tracker|3P|GM|OEE)\b/;
const strings = (x: unknown): string[] => (typeof x === 'string' ? [x] : Array.isArray(x) ? x.flatMap(strings) : x && typeof x === 'object' ? Object.values(x).flatMap(strings) : []);

describe('the registry', () => {
  it('finds the definitions and groups them', () => {
    expect(CALCS.length).toBeGreaterThanOrEqual(4);
    expect(new Set(CALCS.map(c => c.key)).size).toBe(CALCS.length);
    expect(new Set(CALCS.map(c => c.fc)).size).toBe(CALCS.length);
    expect(calcGroups().flatMap(g => g.calcs).length).toBe(CALCS.length);
    expect(calcByKey('kanban')?.fc).toBe('FC-009');
    expect(calcByKey('nope')).toBeUndefined();
  });
});

describe.each(CALCS.map(c => [c.key, c] as [string, CalcDef]))('the %s calculator', (_key, def) => {
  it('is a sound definition: a clean key, its catalogue entry opening at its page, boxes that make sense', () => {
    expect(def.key).toMatch(/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/);
    const e = entryById(def.fc);
    expect(e, `${def.fc} is in the catalogue`).toBeDefined();
    expect(e?.built?.where ?? [], `${def.fc} built.where`).toContain(`/calc/${def.key}`);
    expect(e?.app, 'a single calculator has no face of its own — the hub is the app tool').toBeUndefined();
    expect(def.title.trim().length).toBeGreaterThan(3);
    expect(def.says.length).toBeGreaterThan(10);
    expect(def.question.endsWith('?')).toBe(true);
    const ids = def.inputs.map(f => f.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const f of def.inputs) {
      expect(f.label.trim().length, f.id).toBeGreaterThan(2);
      if (f.kind === 'choice') {
        expect((f.options ?? []).length, `${f.id} options`).toBeGreaterThan(1);
        if (f.default !== undefined) expect((f.options ?? []).some(o => o.value === f.default), `${f.id} default is an option`).toBe(true);
      }
      if (f.kind === 'number' && f.min !== undefined && f.max !== undefined) expect(f.min, f.id).toBeLessThan(f.max);
      if (f.money) expect(f.optional, `${f.id}: a money box is optional, always`).toBe(true);
      if (f.default !== undefined && f.kind === 'number') expect(f.chosen, `${f.id}: a number with a starting point says whose choice it is`).toBeTruthy();
      if (f.from) expect(f.from.where.length, `${f.id} says where to give what is offered`).toBeGreaterThan(5);
    }
    for (const s of def.see ?? []) expect(calcByKey(s.key), `see ${s.key}`).toBeDefined();
  });

  it('has worked examples from an independent source that come out exactly', () => {
    expect(def.examples.length).toBeGreaterThanOrEqual(2);
    for (const ex of def.examples) {
      expect(ex.source.length, `${ex.name}: names its source`).toBeGreaterThan(10);
      const run = runCalc(def, ex.inputs);
      expect(run.problems.filter(p => p.block), `${ex.name}: nothing blocks`).toEqual([]);
      const r = run.result!;
      expect(r, ex.name).toBeDefined();
      expect(r.verdict, `${ex.name} verdict`).toBe(ex.expect.verdict);
      expect(r.tone, `${ex.name} tone`).toBe(ex.expect.tone);
      expect(r.sentence, `${ex.name} sentence`).toBe(ex.expect.sentence);
      for (const [k, v] of Object.entries(ex.expect.tiles)) expect(r.tiles.find(t => t.k === k)?.v, `${ex.name} tile ${k}`).toBe(v);
      if (ex.expect.money) expect(r.money?.text, `${ex.name} money`).toBe(ex.expect.money);
      const warns = run.problems.filter(p => !p.block).map(p => p.say);
      expect(warns.length, `${ex.name}: warnings`).toBe((ex.expect.warns ?? []).length);
      for (const w of ex.expect.warns ?? []) expect(warns.join(' | '), `${ex.name}: warns`).toContain(w);
    }
  });

  it('refuses what it should, in the words it names', () => {
    expect(def.refused.length).toBeGreaterThanOrEqual(1);
    for (const x of def.refused) {
      const run = runCalc(def, x.inputs);
      expect(run.blocked, `${x.name}: blocked`).toBe(true);
      expect(run.result, `${x.name}: no result`).toBeUndefined();
      expect(run.problems.filter(p => p.block).map(p => p.say).join(' | '), x.name).toContain(x.blocked);
    }
  });

  it('stops, and says which, when a needed box is left blank — and never for a money box or an optional one', () => {
    const ex = def.examples[0];
    const v0 = valuesOf(def, ex.inputs);
    for (const f of askedFields(def, v0)) {
      const { [f.id]: _drop, ...rest } = ex.inputs;
      void _drop;
      const run = runCalc(def, rest as Inputs);
      if (f.optional) {
        /* an optional box left blank: the result stands (a choice with a default reads its default) */
        expect(run.blocked, `${f.id} is optional`).toBe(false);
        if (f.money) expect((run.result?.money?.missing ?? []).length, `${f.id} blank: the money says what is missing`).toBeGreaterThan(0);
      } else if (f.kind === 'number' || (f.kind === 'choice' && f.default === undefined)) {
        expect(run.blocked, `${f.id} is needed`).toBe(true);
        expect(run.problems.some(p => p.block && p.field === f.id), `${f.id} named`).toBe(true);
      }
    }
  });

  it('works out the same twice, says nothing undefined, and keeps to the house’s words', () => {
    for (const ex of def.examples) {
      const a = runCalc(def, ex.inputs).result!, b = runCalc(def, ex.inputs).result!;
      expect(JSON.stringify(a)).toBe(JSON.stringify(b));
      const all = strings({ ...a, picture: a.picture ? { ...a.picture, x: a.picture.x.label, y: a.picture.y.label } : undefined });
      for (const s of all) { expect(s, ex.name).not.toMatch(/undefined|NaN|Infinity|\[object/); expect(s, ex.name).not.toMatch(OLD_WORDS); }
      expect(a.sentence.length).toBeGreaterThan(20);
      expect(a.caveats.length, `${ex.name}: says what it does not claim`).toBeGreaterThanOrEqual(1);
      expect(a.working.length).toBeGreaterThanOrEqual(1);
      expect(a.closing.length).toBeGreaterThan(20);
      expect(a.tiles.length).toBeGreaterThanOrEqual(2);
      expect(a.tiles.length).toBeLessThanOrEqual(6);
      for (const t of a.tiles) { expect(t.k.length).toBeGreaterThan(0); expect(t.v.length).toBeGreaterThan(0); }
    }
    for (const s of strings([def.title, def.says, def.question, def.group, def.inputs.map(f => [f.label, f.help, f.unit, f.chosen, f.options])])) expect(s).not.toMatch(OLD_WORDS);
  });

  it('draws a picture, when it has one, inside its own axes', () => {
    for (const ex of def.examples) {
      const pic = runCalc(def, ex.inputs).result?.picture;
      if (!pic) continue;
      expect(pic.lines.length).toBeGreaterThanOrEqual(1);
      for (const l of pic.lines) for (const [x, y] of l.points) { expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true); expect(x).toBeGreaterThanOrEqual(pic.x.min - 1e-9); expect(x).toBeLessThanOrEqual(pic.x.max + 1e-9); expect(y).toBeGreaterThanOrEqual(pic.y.min - 1e-9); expect(y).toBeLessThanOrEqual(pic.y.max + 1e-9); }
      for (const d of pic.dots) { expect(d.x).toBeGreaterThanOrEqual(pic.x.min - 1e-9); expect(d.x).toBeLessThanOrEqual(pic.x.max + 1e-9); expect(d.y).toBeGreaterThanOrEqual(pic.y.min - 1e-9); expect(d.y).toBeLessThanOrEqual(pic.y.max + 1e-9); }
      expect(pic.caption.length).toBeGreaterThan(20);
      expect(pic.x.ticks.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('reads as a record: its line, its title, and the saved before', () => {
    const ex = def.examples[0];
    const s = { agreed: { calc: { key: def.key, inputs: ex.inputs } } } as Pick<ToolStudy, 'agreed'>;
    expect(calcTitle(s)).toBe(def.title);
    expect(calcSays(s)).toEqual({ text: ex.expect.sentence, tone: ex.expect.tone, verdict: ex.expect.verdict });
    expect(studyCalc(s)?.def.key).toBe(def.key);
    const withBefore = { agreed: { calc: { key: def.key, inputs: ex.inputs, before: { at: 1, inputs: def.examples[1].inputs } } } } as Pick<ToolStudy, 'agreed'>;
    const b = beforeRun(def, withBefore.agreed!.calc!);
    expect(b?.result?.sentence).toBe(def.examples[1].expect.sentence);
  });

  it('a brand-new record is asked for its figures, not shown a result made up', () => {
    const run = runCalc(def, startInputs(def));
    expect(run.blocked).toBe(true);
    expect(calcSays({ agreed: { calc: { key: def.key, inputs: startInputs(def) } } }).verdict).toBe('Figures needed');
  });
});

describe('what the shape adds to any calculator', () => {
  const kanban = calcByKey('kanban')!;
  const k1 = kanban.examples[0].inputs;

  it('a what-if changes one box and leaves the record alone', () => {
    const before = JSON.stringify(k1);
    const w = whatIf(kanban, k1, 'leadMin', 60);
    expect(w.result?.verdict).toBe('4 kanbans');
    expect(runCalc(kanban, k1).result?.verdict).toBe('8 kanbans');
    expect(JSON.stringify(k1)).toBe(before);
    expect(whatIf(kanban, k1, 'container', 0).blocked).toBe(true);
  });

  it('the saved before gives each tile its change since, where both have a number', () => {
    const now = runCalc(kanban, k1).result!;
    const was = runCalc(kanban, { ...k1, leadMin: 240 }).result!;           // 4 hours to refill: 16 kanbans, 960 on the shelf
    const t = tilesSince(now.tiles, was.tiles);
    const kb = t.find(x => x.k === 'Kanbans')!;
    expect(was.verdict).toBe('16 kanbans');
    expect(kb.change?.text).toBe('8 kanbans fewer than the saved before');
    expect(kb.change?.dir).toBe('down');
    expect(kb.change?.better).toBeUndefined();                              // fewer kanbans is not better or worse in itself
    const shelf = t.find(x => x.k === 'Most on the shelf')!;
    expect(shelf.change?.better).toBe(true);                                // less stock held is better
    expect(shelf.change?.text).toBe('480 trays less than the saved before');
    expect(tilesSince(now.tiles, undefined).every(x => !x.change)).toBe(true);
    expect(tilesSince(now.tiles, now.tiles).find(x => x.k === 'Kanbans')?.change?.dir).toBe('same');
  });

  it('typing over an offered box forgets where it came from', () => {
    const a = typedOver({ key: 'oc-curve', inputs: { n: 1, rate: 14.7 }, src: { rate: 'Line 7’s set-up' } }, 'rate', 15);
    expect(a.inputs.rate).toBe(15);
    expect(a.src).toBeUndefined();
    expect(typedOver({ key: 'x', inputs: {}, src: { rate: 'a', other: 'b' } }, 'rate', 1).src).toEqual({ other: 'b' });
  });

  it('offers what the line holds of its cost model, in the box’s own unit, and nothing it does not hold', () => {
    const rate = { source: 'labourRate' as const, where: 'a wage', words: 'wage' };
    expect(offered(rate, { labourRatePerHour: 12, labourBurden: 1.225 })).toBe(14.7);
    expect(offered(rate, { labourRatePerHour: 12 })).toBe(12);
    expect(offered(rate, {})).toBeUndefined();
    expect(offered(rate, undefined)).toBeUndefined();
    expect(offered({ source: 'packsPerMin', where: 'x', words: 'x', times: 60 }, { packsPerMin: 40 })).toBe(2400);
    expect(offered({ source: 'materialsPerPack', where: 'x', words: 'x' }, { materialsPerPack: 0.85 })).toBe(0.85);
    expect(offered({ source: 'marginPerPack', where: 'x', words: 'x' }, { marginPerPack: 0 })).toBeUndefined();
  });

  it('a record whose calculator is gone says so and does not throw', () => {
    expect(calcSays({ agreed: { calc: { key: 'gone', inputs: {} } } })).toEqual({ text: 'this calculator is not in this version of the app', tone: 'n', verdict: 'Unknown calculator' });
    expect(calcSays({})).toEqual({ text: 'not set up yet', tone: 'n', verdict: 'Not set up' });
    expect(calcTitle({ agreed: { calc: { key: 'gone', inputs: {} } } })).toBe('Calculator');
  });

  it('numbers typed with commas are read; text that is not a number is a blank', () => {
    expect(valuesOf(kanban, { usage: '1,500', usageHours: 'abc' }).usage).toBe(1500);
    expect(valuesOf(kanban, { usage: '1,500', usageHours: 'abc' }).usageHours).toBeUndefined();
  });
});
