/* THE KNOWLEDGE LIBRARY HOLDS TOGETHER (knowledge/README.md). Every record in
 * knowledge/methods/ has its front matter and its ten headings, its id is its
 * place on disc, every method it names exists, and every path it names in
 * backticks is there. A record that points at moved code, or at a method
 * nobody wrote, fails here — the library cannot quietly rot. */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parseMethod, pathsNamed, type MethodRecord } from '../methodRecord';
import { DISCIPLINES } from '../types';

const ROOT = join(__dirname, '..', '..', '..');
const DIR = join(ROOT, 'knowledge', 'methods');

const files = (dir: string): string[] => readdirSync(dir).flatMap(f => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? files(p) : f.endsWith('.md') ? [p] : [];
});

const all = files(DIR).map(p => ({ path: relative(ROOT, p), text: readFileSync(p, 'utf8'), ...parseMethod(readFileSync(p, 'utf8')) }));
const records = all.flatMap(x => (x.record ? [x.record] : []));
const byId = new Map<string, MethodRecord>(records.map(r => [r.id, r]));

describe('the knowledge library', () => {
  it('has records', () => expect(records.length).toBeGreaterThan(0));

  it('every record parses — front matter, the ten headings, references marked', () => {
    const bad = all.filter(x => x.problems.length).map(x => `${x.path}: ${x.problems.join('; ')}`);
    expect(bad).toEqual([]);
  });

  it('every id is <discipline>.<file name>, in a discipline the catalogue knows, and unique', () => {
    const ids = new Set(DISCIPLINES.map(d => d.id));
    const wrong = all.flatMap(x => {
      if (!x.record) return [];
      const [, disc, file] = /methods\/([^/]+)\/([^/]+)\.md$/.exec(x.path) ?? [];
      const out: string[] = [];
      if (x.record.id !== `${disc}.${file}`) out.push(`${x.path}: id ${x.record.id} should be ${disc}.${file}`);
      if (x.record.discipline !== disc) out.push(`${x.path}: discipline ${x.record.discipline} should be ${disc}`);
      if (!ids.has(disc)) out.push(`${x.path}: no discipline "${disc}" in src/catalogue/types.ts`);
      return out;
    });
    expect(wrong).toEqual([]);
    expect(new Set(records.map(r => r.id)).size).toBe(records.length);
  });

  it('every method a record names — needs, next, alternatives, related — exists, and none names itself', () => {
    const dangling = records.flatMap(r => [...r.needs, ...r.next, ...r.alternatives, ...r.related]
      .filter(id => !byId.has(id) || id === r.id).map(id => `${r.id} → ${id}`));
    expect(dangling).toEqual([]);
  });

  it('every path named in backticks in a record exists', () => {
    const missing = all.flatMap(x => pathsNamed(x.text).filter(p => !existsSync(join(ROOT, p))).map(p => `${x.path}: ${p}`));
    expect(missing).toEqual([]);
  });

  it('nothing needs itself round in a circle', () => {
    const seen = new Map<string, number>();
    const loop: string[] = [];
    const visit = (id: string, path: string[]) => {
      if (seen.get(id) === 2) return;
      if (seen.get(id) === 1) { loop.push([...path, id].join(' → ')); return; }
      seen.set(id, 1);
      for (const n of byId.get(id)?.needs ?? []) visit(n, [...path, id]);
      seen.set(id, 2);
    };
    for (const r of records) visit(r.id, []);
    expect(loop).toEqual([]);
  });
});
