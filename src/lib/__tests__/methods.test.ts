/* THE EIGHT METHODS (src/lib/methods.ts, docs/METHODS.md) — the data holds true to the catalogue it names tools from,
 * to the knowledge record behind each, and to the document Rowland reads. */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { entryById } from '../../catalogue';
import { METHODS, methodByKey, methodOfProject, methodsUsing, toolsOfMethod } from '../methods';

const ROOT = resolve(__dirname, '../../..');
const doc = readFileSync(resolve(ROOT, 'docs/METHODS.md'), 'utf8');

describe('the eight methods', () => {
  it('are the eight Rowland agreed on 31 October, in that order', () => {
    expect(METHODS.map(m => m.name)).toEqual(['PDCA', 'DMAIC', '8D', 'A3', 'Stage gate', 'Kaizen event', 'Improvement Kata', 'Theory of Constraints']);
    expect(new Set(METHODS.map(m => m.key)).size).toBe(8);
  });

  it('6M is a tool inside them, never one of them', () => {
    expect(METHODS.some(m => /6M|fishbone/i.test(m.name))).toBe(false);
    expect(methodsUsing('FC-146').map(m => m.name)).toEqual(expect.arrayContaining(['PDCA', 'DMAIC', '8D', 'A3']));
  });

  it('each says its question, has sections in an order of its own, and each section its sentence and its tools', () => {
    for (const m of METHODS) {
      expect(m.question.length, m.name).toBeGreaterThan(20);
      expect(m.sections.length, m.name).toBeGreaterThanOrEqual(4);
      expect(new Set(m.sections.map(s => s.name)).size, `${m.name}: a section named twice`).toBe(m.sections.length);
      for (const s of m.sections) {
        expect(s.what.length, `${m.name} › ${s.name}`).toBeGreaterThan(10);
        expect(s.tools.length, `${m.name} › ${s.name} has no tool`).toBeGreaterThan(0);
        expect(new Set(s.tools).size, `${m.name} › ${s.name}: a tool listed twice`).toBe(s.tools.length);
      }
    }
  });

  it('name only tools the catalogue has — never one left out on purpose, never a method itself', () => {
    const bad: string[] = [];
    const METHOD_ENTRIES = new Set(['FC-016', 'FC-017', 'FC-073', 'FC-138']); /* Kaizen event, Improvement Kata, the stage gate, DMAIC as a kind of change */
    for (const m of METHODS) for (const s of m.sections) for (const id of s.tools) {
      const e = entryById(id);
      if (!e) bad.push(`${m.name} › ${s.name}: ${id} is not in the catalogue`);
      else if (e.status === 'left-out') bad.push(`${m.name} › ${s.name}: ${id} was left out on purpose`);
      else if (METHOD_ENTRIES.has(id)) bad.push(`${m.name} › ${s.name}: ${id} is a method, not a tool`);
    }
    expect(bad).toEqual([]);
  });

  it('each stands on a knowledge record that exists and carries that id', () => {
    for (const m of METHODS) {
      const [folder, ...rest] = m.record.split('.');
      const file = resolve(ROOT, 'knowledge/methods', folder!, `${rest.join('.')}.md`);
      expect(existsSync(file), `${m.name}: ${file}`).toBe(true);
      expect(readFileSync(file, 'utf8'), m.name).toContain(`id: ${m.record}`);
    }
  });

  it('are found by key, and their tools worked out once each', () => {
    expect(methodByKey('kata')?.name).toBe('Improvement Kata');
    expect(methodByKey('six-m')).toBeUndefined();
    for (const m of METHODS) expect(new Set(toolsOfMethod(m)).size).toBe(toolsOfMethod(m).length);
    expect(methodsUsing('FC-105').map(m => m.key)).toEqual(expect.arrayContaining(['pdca', 'dmaic', 'eight-d']));
  });

  it('are the ones docs/METHODS.md describes — every method and section named, the count of tools as it says', () => {
    for (const m of METHODS) {
      expect(doc, `${m.name} is not in the document`).toContain(`| **${m.name}** |`);
      for (const s of m.sections) expect(doc, `${m.name} › ${s.name} is not in the document`).toContain(`**${s.name}**`);
    }
    const placed = new Set(METHODS.flatMap(toolsOfMethod)).size;
    expect(doc, 'the document says another number of tools placed').toContain(`${placed} catalogue tools are placed in the eight methods`);
  });
});

describe('the method a project runs', () => {
  it('is the one it was started with', () => {
    expect(methodOfProject({ method: 'dmaic' })).toBe('dmaic');
    expect(methodOfProject({ method: 'kata', commissioning: true })).toBe('kata');
  });
  it('is read from the older flags for a project made before — a stage-gate job is the stage gate', () => {
    expect(methodOfProject({ commissioning: true })).toBe('stage-gate');
  });
  it('is none of the eight for a 6M board or a lever tree — they keep opening as they do', () => {
    expect(methodOfProject({})).toBeUndefined();
    expect(methodOfProject({ commissioning: false })).toBeUndefined();
  });
});

