/* EVERY CHECK LOG DEFINITION, LINTED — a new log is a file in ../defs and is covered here by being there. It must be a
 * log and not a template: a valid starter list a person can edit, an honest standard (a clause is never quoted without
 * being listed to confirm), limits said, examples hand-worked; and it must be in the catalogue with the route that opens
 * it, so the directory, the registry and the gate know it (knowledge/specs/FC-236-check-logs.md §12). */
import { describe, expect, it } from 'vitest';
import { LOG_DEFS, defOf, defGroups, logHref } from '../registry';
import { checkProblem } from '../checks';
import { starterLog } from '../start';
import { entryById, ENTRIES } from '../../../catalogue';
import { parseRoute } from '../../../state/useRoute';

describe('the registry', () => {
  it('finds every definition in ./defs, each once, grouped and in order', () => {
    expect(LOG_DEFS.length).toBeGreaterThanOrEqual(5);
    expect(new Set(LOG_DEFS.map(d => d.key)).size).toBe(LOG_DEFS.length);
    expect(defGroups().flatMap(g => g.defs).length).toBe(LOG_DEFS.length);
    expect(defOf('metal-detection')?.fc).toBe('FC-170');
    expect(defOf('nope')).toBeUndefined();
  });
  it('opens at addresses the router answers', () => {
    for (const d of LOG_DEFS) {
      expect(parseRoute(`#${logHref(d.key)}`)).toMatchObject({ name: 'studies', view: 'log', key: d.key });
      expect(parseRoute(`#${logHref(d.key, 'abc')}`)).toMatchObject({ name: 'study', view: 'log', key: d.key, id: 'abc' });
    }
    expect(parseRoute('#/logs')).toMatchObject({ name: 'studies', view: 'logs' });
  });
});

describe.each(LOG_DEFS.map(d => [d.key, d] as const))('%s', (_k, def) => {
  it('has a key that is its address, an FC number, words, and a group', () => {
    expect(def.key).toMatch(/^[a-z][a-z0-9-]*$/);
    expect(def.fc).toMatch(/^FC-\d{3}$/);
    for (const k of ['title', 'noun', 'says', 'group', 'reactionWords', 'whereLabel'] as const) expect(def[k].trim(), k).not.toBe('');
    expect(def.kinds.length).toBeGreaterThan(0);
  });
  it('starts from a list a person can edit: every starter check valid, of an allowed kind, with a frequency', () => {
    expect(def.starterChecks.length).toBeGreaterThan(0);
    const log = starterLog(def, { since: 0, where: 'A machine' });
    expect(log.checks.length).toBe(def.starterChecks.length);
    expect(new Set(log.checks.map(c => c.id)).size).toBe(log.checks.length);
    for (const c of log.checks) {
      expect(checkProblem(c), c.name).toBeUndefined();
      expect(def.kinds, c.name).toContain(c.kind);
      if (c.kind === 'scored') { expect(def.scale, 'a scored log needs a scale').toBeDefined(); expect(new Set((c.items ?? []).map(i => i.id)).size).toBe((c.items ?? []).length); }
    }
    expect(log.checks.every(c => c.where)).toBe(true);
  });
  it('is not presented as the standard: it says what it rests on, lists what is still to confirm, and says what it does not do', () => {
    expect(def.standard.rests.length).toBeGreaterThan(60);
    expect(def.standard.confirm.length).toBeGreaterThan(0);
    expect(def.limits.length).toBeGreaterThan(1);
    /* a clause or a table is never quoted from memory: "clause 4.10" or "§ 3.4" is not written in a standard's words */
    expect(def.standard.rests).not.toMatch(/\b(clause|section|§)\s*\d/i);
    expect(def.limits.join(' ')).not.toMatch(/\b(clause|section|§)\s*\d/i);
  });
  it('never gives a limit it was not given: a value check in the starter list sets none (or says where it came from)', () => {
    for (const c of def.starterChecks.filter(x => x.kind === 'value')) { expect(c.lo, c.name).toBeUndefined(); expect(c.hi, c.name).toBeUndefined(); }
  });
  it('has worked examples with their expected figures', () => {
    expect(def.examples.length).toBeGreaterThan(0);
    for (const e of def.examples) { expect(e.results.length, e.name).toBeGreaterThan(0); expect(Object.keys(e.expect).length, e.name).toBeGreaterThan(0); }
  });
  it('is in the catalogue: its entry names the route /log/<key> and no app face (the hub FC-236 has it)', () => {
    const e = entryById(def.fc);
    expect(e, def.fc).toBeDefined();
    expect(e?.form === 'tool' ? e.kind : 'log').toBe('log');
    if (e?.status === 'available' || e?.status === 'partial') {
      const sees = ENTRIES.filter(x => (x.built?.where ?? []).includes(logHref(def.key)));
      expect(sees.map(x => x.id), `an entry with built.where /log/${def.key}`).toContain(def.fc);
      expect(e.app, 'an individual log has no app face').toBeUndefined();
    }
  });
});

describe('the catalogue’s check logs', () => {
  it('every entry opening at /log/<key> has a definition, and the hub is FC-236', () => {
    for (const e of ENTRIES) for (const w of e.built?.where ?? []) if (w.startsWith('/log/')) expect(defOf(w.split('/')[2]), `${e.id} ${w}`).toBeDefined();
    expect(entryById('FC-236')?.app?.key).toBe('logs');
    expect(entryById('FC-236')?.built?.where).toEqual(['/logs']);
  });
});
