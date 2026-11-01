/* THE MISTAKE-PROOFING REGISTER, COUNTED (FC-014; knowledge/specs/FC-014-mistake-proofing.md, Calculations case 3).
 * The expected numbers are worked by hand from the starter list — not read from the module's own output. */
import { describe, expect, it } from 'vitest';
import { def } from '../defs/mistake-proofing';
import { starterLog } from '../start';
import { deviceLine, deviceOf, kindCell, narrow, registerOf, registerSays, warningNote, withoutLegacyWords } from '../register';
import type { LogCheck } from '../../../lib/study';

const starter = () => starterLog(def, { since: 0, where: 'Wrapper' }).checks;
const byName = (cs: LogCheck[], name: string) => cs.find(c => c.name.startsWith(name))!;

describe('Case 3 — the starter list as a register', () => {
  const r = registerOf(starter());
  it('is seven devices and two routine checks', () => {
    expect(r.devices.length).toBe(7);
    expect(r.routines.length).toBe(2);
    expect(r.routines.map(d => d.check.name.split(' ')[0])).toEqual(['No', 'Re-test']);
  });
  it('counts them by type: contact 2, fixed-value 2, motion-step 3', () => {
    expect(r.byType).toEqual({ contact: 2, 'fixed-value': 2, 'motion-step': 3 });
  });
  it('counts them by function: control 6, warning 1', () => {
    expect(r.byFunction).toEqual({ control: 6, warning: 1 });
  });
  it('every device names the error it prevents, has a type and a function', () => {
    expect([r.noError, r.noType, r.noFunction, r.fromWords]).toEqual([0, 0, 0, 0]);
  });
  it('says it in the page’s words', () => {
    expect(registerSays(r)).toBe('7 devices — 2 contact · 2 fixed-value · 3 motion-step; 6 control · 1 warning — and 2 routine checks on them.');
  });
  it('says the warning rule, once, and only when there is a warning device', () => {
    expect(warningNote(r)).toMatch(/^1 warning device depends on a person’s reaction/);
    expect(warningNote(registerOf(starter().filter(c => !c.name.startsWith('Colour-coded'))))).toBeUndefined();
  });
  it('takes the type off one device: 6 with a type, 1 with no type yet — its function and error still counted', () => {
    const cs = starter();
    byName(cs, 'Case-count').deviceType = undefined;
    const x = registerOf(cs);
    expect([x.devices.length, x.noType, x.noFunction, x.noError]).toEqual([7, 1, 0, 0]);
    expect(x.byType).toEqual({ contact: 2, 'fixed-value': 1, 'motion-step': 3 });
    expect(x.byFunction).toEqual({ control: 6, warning: 1 });
    expect(registerSays(x)).toContain('1 with no type yet.');
  });
  it('a device taken off the list is not counted', () => {
    const cs = starter();
    byName(cs, 'Guard').removed = true;
    const x = registerOf(cs);
    expect(x.devices.length).toBe(6);
    expect(x.byType['motion-step']).toBe(2);
  });
});

describe('a log started before the fields existed is read from its words', () => {
  const old: LogCheck[] = [
    { id: 'a', name: 'Label-presence sensor — prevents a pack with no label', when: { every: 1, unit: 'shift' }, kind: 'passfail', criterion: 'Contact · control. A known-bad pack (no label) is presented and the line stops' },
    { id: 'b', name: 'Colour-coded utensils and tools — prevent an allergen tool at the wrong station', when: { every: 1, unit: 'week' }, kind: 'passfail', criterion: 'Contact · warning. Each tool is at its own station' },
    { id: 'c', name: 'No device bypassed — no jumper, tape or override on any of them', when: { every: 1, unit: 'shift' }, kind: 'passfail', criterion: 'Each device walked: none jumpered' },
  ];
  it('reads type, function and error from the words and says so', () => {
    const d = deviceOf(old[0]);
    expect([d.type, d.fn, d.error, d.fromWords, d.isDevice]).toEqual(['contact', 'control', 'a pack with no label', true, true]);
    expect(deviceOf(old[1]).error).toBe('an allergen tool at the wrong station');
  });
  it('a check with none of the three is a routine check', () => {
    expect(deviceOf(old[2]).isDevice).toBe(false);
    const r = registerOf(old);
    expect([r.devices.length, r.routines.length, r.fromWords]).toEqual([2, 1, 2]);
  });
  it('the fields, when set, win over the words', () => {
    const d = deviceOf({ ...old[0], deviceType: 'fixed-value', error: 'A missing label' });
    expect([d.type, d.fn, d.error]).toEqual(['fixed-value', 'control', 'A missing label']);
  });
  it('strips the old words from "passes if" and nothing else', () => {
    expect(withoutLegacyWords(old[0].criterion)).toBe('A known-bad pack (no label) is presented and the line stops');
    expect(withoutLegacyWords('Each device walked: none jumpered')).toBe('Each device walked: none jumpered');
    expect(withoutLegacyWords(undefined)).toBe('');
  });
});

describe('narrowing and the one-line words', () => {
  const r = registerOf(starter());
  it('narrows by type, by function and by both', () => {
    expect(narrow(r.devices, { type: 'motion-step' }).length).toBe(3);
    expect(narrow(r.devices, { fn: 'warning' }).map(d => d.check.name)).toEqual(['Colour-coded utensils and tools']);
    expect(narrow(r.devices, { type: 'contact', fn: 'control' }).map(d => d.check.name)).toEqual(['Label-presence sensor']);
    expect(narrow(r.devices, {}).length).toBe(7);
  });
  it('says a device in a line and a cell', () => {
    const d = r.devices[0];
    expect(deviceLine(d)).toBe('Contact · control — prevents: A pack with no label');
    expect(kindCell(d)).toBe('Contact · Control');
    expect(kindCell(deviceOf({ id: 'z', name: 'x', when: { every: 1, unit: 'day' }, kind: 'passfail', error: 'something' }))).toBe('—');
  });
  it('an empty list and a list of routine checks only say so', () => {
    expect(registerSays(registerOf([]))).toMatch(/no device is registered/);
    expect(registerSays(registerOf([{ id: 'r', name: 'Walk', when: { every: 1, unit: 'day' }, kind: 'passfail' }]))).toMatch(/1 routine check on the list and no device is registered yet/);
  });
});
