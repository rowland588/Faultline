import { describe, expect, it } from 'vitest';
import { METHODS } from '../methods';
import { SHEETS, answerOf, answerScope, fieldsOf, hasSheet, isMethodAnswer, sectionState } from '../methodSheet';
import { entryById } from '../../catalogue';

describe('a method’s own sheet', () => {
  it('every method but the stage gate has one, and every section of it is one of the method’s own sections, in the method’s words', () => {
    for (const m of METHODS) {
      if (m.key === 'stage-gate') { expect(hasSheet(m.key)).toBe(false); continue; }
      expect(hasSheet(m.key), m.key).toBe(true);
      const names = m.sections.map(s => s.name);
      for (const sec of Object.keys(SHEETS[m.key] ?? {})) expect(names, `${m.key} / ${sec}`).toContain(sec);
      /* a method asks something in every one of its sections */
      for (const n of names) expect(fieldsOf(m.key, n).length, `${m.key} / ${n}`).toBeGreaterThan(0);
    }
  });
  it('a field id is unique within its method, and every tool offered at a field is a catalogue entry', () => {
    for (const [key, secs] of Object.entries(SHEETS)) {
      const all = Object.values(secs ?? {}).flat();
      expect(new Set(all.map(x => x.id)).size, `${key} ids`).toBe(all.length);
      for (const fl of all) for (const t of fl.tools ?? []) expect(entryById(t), `${key}/${fl.id} offers ${t}`).toBeDefined();
    }
  });
  it('PDCA’s plan asks the number, the gap, the cause suspected, the change and the effect expected', () => {
    expect(fieldsOf('pdca', 'Plan').map(x => x.id)).toEqual(['number', 'gap', 'cause', 'change', 'expect']);
    expect(fieldsOf('eight-d', 'D2  Describe the problem').map(x => x.id)).toEqual(['is', 'isnot']);
  });
  it('an answer is kept under the method and the field, and is never a meeting note', () => {
    const s = answerScope('pdca', 'number');
    expect(s).toBe('method:pdca:number');
    expect(isMethodAnswer(s)).toBe(true);
    expect(isMethodAnswer('day:2026-11-01')).toBe(false);
    expect(isMethodAnswer('')).toBe(false);
    expect(answerOf(s)).toEqual({ method: 'pdca', field: 'number' });
    expect(answerOf('gate:setup')).toBeUndefined();
  });
  it('a section is not started, under way or all written — a blank answer is not written', () => {
    expect(sectionState('pdca', 'Plan', {})).toEqual({ fields: 5, written: 0, word: 'Not started' });
    expect(sectionState('pdca', 'Plan', { number: 'Packs a minute', gap: '   ' })).toEqual({ fields: 5, written: 1, word: 'Under way' });
    expect(sectionState('pdca', 'Plan', { number: 'a', gap: 'b', cause: 'c', change: 'd', expect: 'e' }).word).toBe('All written');
    expect(sectionState('stage-gate', 'Install', {}).word).toBe('Not started');
  });
});
