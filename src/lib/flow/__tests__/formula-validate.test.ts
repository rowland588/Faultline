/* A METHOD AS DATA: the formula and the validator.
 *
 * The validator is the wall between a definition anybody wrote — a person on
 * a form, the cloud, the assistant — and the app: what it lets through, the
 * runtime can run and the report can print; what it refuses, it says in words
 * a person can act on. */
import { describe, it, expect } from 'vitest';
import { calc, formulaRefs, parseFormula, FormulaError } from '../formula';
import { validateDefinition } from '../validate';
import { FLOW_SCHEMA, fieldKeyOf, keyOf, rekeyField, rekeyStep, type FlowDefinition } from '../definition';

describe('a worked-out field', () => {
  it('works out arithmetic over the step\'s numbers', () => {
    expect(calc('packs / minutes', { packs: 1200, minutes: 20 })).toBe(60);
    expect(calc('(made - rejects) / made * 100', { made: 200, rejects: 10 })).toBe(95);
    expect(calc('-a + 2 × b ÷ 4', { a: 1, b: 6 })).toBe(2);
  });

  it('gives no answer when a number is missing or a division is by nought — never an invented one', () => {
    expect(calc('packs / minutes', { packs: 1200 })).toBeUndefined();
    expect(calc('packs / minutes', { packs: 1200, minutes: 0 })).toBeUndefined();
  });

  it('reads only numbers, field names, + − × ÷ and brackets', () => {
    expect(() => parseFormula('Math.max(1, 2)')).toThrow(FormulaError);
    expect(() => parseFormula('a; b')).toThrow(/cannot be used/);
    expect(() => parseFormula('(a + b')).toThrow(/not closed/);
    expect(() => parseFormula('')).toThrow(/empty/);
    expect(calc('alert(1)', {})).toBeUndefined();
  });

  it('says which fields it reads', () => {
    expect(formulaRefs(parseFormula('(made - rejects) / made'))).toEqual(['made', 'rejects']);
  });
});

type LooseStep = { key: string; title: string; fields?: Record<string, unknown>[]; [k: string]: unknown };
type LooseStage = { key: string; name: string; steps: LooseStep[]; gate: { conditions: Record<string, unknown>[] }; [k: string]: unknown };
type Loose = { name: string; stages: LooseStage[]; [k: string]: unknown };

const good = (): Loose => ({
  schema: FLOW_SCHEMA,
  name: 'Commissioning — tray line',
  purpose: 'Take the new line from delivery to handover.',
  kind: 'stagegate',
  roles: [{ key: 'oem', name: 'OEM fitter', side: 'supplier' }, { key: 'site', name: 'Site engineer', side: 'site' }],
  stages: [
    {
      key: 'mech', name: 'Mechanical and services',
      steps: [
        { key: 'levelled', title: 'Positioned and levelled', per: 'machine', role: 'oem', answer: 'done', evidence: { photos: 1 } },
        { key: 'air', title: 'Air and power connected', per: 'machine', role: 'site', answer: 'done', after: ['levelled'] },
      ],
      gate: { conditions: [{ id: 'all', type: 'stepsDone', policy: 'block' }] },
    },
    {
      key: 'perf', name: 'Performance acceptance',
      steps: [
        {
          key: 'run', title: 'Performance run', per: 'line', role: 'oem', answer: 'measure',
          fields: [
            { key: 'packs', label: 'Packs made', type: 'number', required: true },
            { key: 'minutes', label: 'Minutes run', type: 'reading', unit: 'min', min: 120 },
            { key: 'rate', label: 'Rate', type: 'calc', unit: 'packs/min', formula: 'packs / minutes' },
          ],
        },
        { key: 'signed', title: 'Acceptance signed', per: 'line', role: 'site', answer: 'signoff' },
      ],
      gate: {
        conditions: [
          { id: 'rate', type: 'fieldMeets', step: 'run', field: 'rate', op: '>=', value: 60, policy: 'block' },
          { id: 'sig', type: 'signedOff', step: 'signed', policy: 'block' },
          { id: 'crit', type: 'noOpenProblems', priority: 'critical', policy: 'warn' },
        ],
      },
    },
  ],
});

describe('a definition the app can run', () => {
  it('passes, rebuilt from the closed vocabulary', () => {
    const c = validateDefinition(good());
    expect(c.errors).toEqual([]);
    expect(c.ok).toBe(true);
    expect(c.def?.stages.map(s => s.steps.length)).toEqual([2, 2]);
    expect(c.def?.stages[1].gate.conditions.map(x => x.type)).toEqual(['fieldMeets', 'signedOff', 'noOpenProblems']);
  });

  it('drops anything the app does not know — nothing smuggled in is kept', () => {
    const raw = good() as unknown as Record<string, unknown> & { stages: Record<string, unknown>[] };
    raw.script = 'alert(1)';
    raw.stages[0].onEnter = 'delete everything';
    (raw.stages[0].steps as Record<string, unknown>[])[0].sql = 'drop table tests';
    const c = validateDefinition(raw);
    expect(c.ok).toBe(true);
    const text = JSON.stringify(c.def);
    expect(text).not.toContain('alert');
    expect(text).not.toContain('delete everything');
    expect(text).not.toContain('drop table');
  });

  it('defaults a condition to blocking, and gives a missing id one of its own', () => {
    const raw = good();
    (raw.stages[0].gate.conditions as unknown[]) = [{ type: 'stepsDone' }];
    const c = validateDefinition(raw);
    expect(c.def?.stages[0].gate.conditions[0]).toMatchObject({ type: 'stepsDone', policy: 'block', id: 'stepsdone-1' });
  });
});

describe('a definition the app refuses, said in words', () => {
  const errs = (mutate: (d: Loose) => void) => {
    const d = good(); mutate(d);
    const c = validateDefinition(d);
    expect(c.ok).toBe(false);
    return c.errors.map(e => e.message).join(' | ');
  };

  it('no name, no stages', () => {
    expect(errs(d => { d.name = ''; })).toMatch(/has no name/);
    expect(errs(d => { d.stages = []; })).toMatch(/has no stages/);
  });

  it('two steps with one key', () => {
    expect(errs(d => { d.stages[1].steps[0].key = 'levelled'; })).toMatch(/Two steps share the key "levelled"/);
  });

  it('a step given to a role that is not on the method', () => {
    expect(errs(d => { d.stages[0].steps[0].role = 'electrician'; })).toMatch(/role that is not on the method: "electrician"/);
  });

  it('a formula reading a field that is not a number on the step', () => {
    expect(errs(d => { (d.stages[1].steps[0].fields![2] as { formula: string }).formula = 'packs / hours'; })).toMatch(/works out from "hours"/);
  });

  it('steps that wait on each other in a circle', () => {
    expect(errs(d => { (d.stages[0].steps[0] as { after?: string[] }).after = ['air']; })).toMatch(/in a circle/);
  });

  it('a step waiting on one in a later stage', () => {
    expect(errs(d => { (d.stages[0].steps[1] as { after?: string[] }).after = ['run']; })).toMatch(/in a later stage/);
  });

  it('a gate reading a step that does not exist, or comes later', () => {
    expect(errs(d => { (d.stages[1].gate.conditions[0] as { step: string }).step = 'ghost'; })).toMatch(/not on the method: "ghost"/);
    expect(errs(d => { d.stages[0].gate.conditions.push({ id: 'x', type: 'stepDone', step: 'run', policy: 'block' } as never); })).toMatch(/comes in a later stage/);
  });

  it('a sign-off condition on a step that is not a sign-off', () => {
    expect(errs(d => { (d.stages[1].gate.conditions[1] as { step: string }).step = 'run'; })).toMatch(/not a sign-off/);
  });

  it('a measured step with nothing to measure', () => {
    expect(errs(d => { d.stages[1].steps[0].fields = [{ key: 'notes', label: 'Notes', type: 'text' } as never]; })).toMatch(/no number to measure/);
  });

  it('a condition or a tool the app does not know', () => {
    expect(errs(d => { d.stages[0].gate.conditions.push({ id: 'z', type: 'runScript', policy: 'block' } as never); })).toMatch(/kind of condition the app does not know/);
    expect(errs(d => { (d.stages[0].steps[0] as { component?: unknown }).component = { tool: 'magic' }; })).toMatch(/tool the app does not have: "magic"/);
  });

  it('a field whose limits are the wrong way round', () => {
    expect(errs(d => { Object.assign(d.stages[1].steps[0].fields![1], { min: 200, max: 100 }); })).toMatch(/lower limit is above the upper/);
  });

  it('anything that is not a definition at all', () => {
    expect(validateDefinition('make me a method').ok).toBe(false);
    expect(validateDefinition(null).errors[0].message).toMatch(/not a method definition/);
  });
});

describe('a key from words', () => {
  it('is short, lower case and unique', () => {
    expect(keyOf('Mechanical & Services')).toBe('mechanical-services');
    expect(keyOf('Dry run', ['dry-run'])).toBe('dry-run-2');
    expect(keyOf('3rd party check')).toMatch(/^k-/);
  });
});

describe('keys taken from words, on a first draft', () => {
  it('a field key is a word a sum can name — underscores, never hyphens', () => {
    expect(fieldKeyOf('Packs made')).toBe('packs_made');
    expect(fieldKeyOf('Packs made', ['packs_made'])).toBe('packs_made_2');
    expect(calc(`${fieldKeyOf('Packs made')} / ${fieldKeyOf('Minutes run')}`, { packs_made: 600, minutes_run: 10 })).toBe(60);
  });

  it('renaming a step or a field moves every reference with it', () => {
    const d: FlowDefinition = {
      schema: FLOW_SCHEMA, name: 'M', purpose: 'p', kind: 'other', roles: [],
      stages: [{
        key: 's', name: 'S',
        steps: [
          { key: 'a-new-step', title: 'Trial', per: 'line', answer: 'measure', fields: [
            { key: 'box_1', label: 'Packs', type: 'number' }, { key: 'box_2', label: 'Minutes', type: 'number' },
            { key: 'rate', label: 'Rate', type: 'calc', formula: 'box_1 / box_2' },
          ] },
          { key: 'after', title: 'After', per: 'line', answer: 'done', after: ['a-new-step'] },
        ],
        gate: { conditions: [{ id: 'r', type: 'fieldMeets', step: 'a-new-step', field: 'box_1', op: '>=', value: 1, policy: 'block' }, { id: 'd', type: 'stepDone', step: 'a-new-step', policy: 'warn' }] },
      }],
    };
    rekeyStep(d, 'a-new-step', 'trial');
    rekeyField(d, 'trial', 'box_1', 'packs');
    expect(d.stages[0].steps[0].key).toBe('trial');
    expect(d.stages[0].steps[1].after).toEqual(['trial']);
    expect(d.stages[0].steps[0].fields?.[2].formula).toBe('packs / box_2');
    expect(d.stages[0].gate.conditions).toMatchObject([{ step: 'trial', field: 'packs' }, { step: 'trial' }]);
    expect(validateDefinition(d).ok).toBe(true);
  });
});
