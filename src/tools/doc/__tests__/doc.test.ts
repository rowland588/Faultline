/* THE DOCUMENT SHAPE, TABLE-DRIVEN OVER EVERY DEFINITION (knowledge/specs/FC-240-documents.md). A definition added as one file in
 * src/tools/doc/defs/ is covered here with no change to this file: its sound structure, its worked examples read exactly as the
 * independent literals say (scripts/knowledge/cases-doc.py and the definition's own source), a blank document read without a throw,
 * the boxes still needed named, the status moving as the document is filled and agreed. */
import { describe, expect, it } from 'vitest';
import { DOCS, docByKey, docGroups } from '../registry';
import { askedItems, docMediaKeys, docSays, fieldProblems, isList, isPhotos, isScalar, itemsOf, needsOf, newDocStudy, newRow, runDoc, statusOf, studyDoc, toNumber, valuesOf, withCell, withRowAdded, withRowRemoved, withValue, EMPTY_CTX } from '../doc';
import type { DocCtx, DocDef, DocPhoto, DocRow } from '../types';

const CTX: DocCtx = { today: '2026-11-01' };
const ctxOf = (_d: DocDef, e: DocDef["examples"][number]): DocCtx => ({ ...CTX, ...(e.ctx ?? {}) });

describe('the registry', () => {
  it('finds every definition, sorted, keyed uniquely and numbered', () => {
    expect(DOCS.length).toBeGreaterThanOrEqual(1);
    expect(new Set(DOCS.map(d => d.key)).size).toBe(DOCS.length);
    for (const d of DOCS) {
      expect(d.key, d.key).toMatch(/^[a-z][a-z0-9-]*$/);
      expect(d.fc, d.key).toMatch(/^FC-\d{3}$/);
      expect(docByKey(d.key)).toBe(d);
    }
    expect(docGroups().flatMap(g => g.docs).length).toBe(DOCS.length);
    expect(docByKey('nothing-like-this')).toBeUndefined();
  });
});

for (const d of DOCS) {
  describe(`${d.key} — ${d.title} (${d.fc})`, () => {
    it('is a sound definition: words on everything, ids that do not repeat, columns that are boxes', () => {
      expect(d.title.length).toBeGreaterThan(3);
      expect(d.says.length).toBeGreaterThan(20);
      expect(d.question.endsWith('?')).toBe(true);
      expect(d.noun.length).toBeGreaterThan(2);
      expect(d.sections.length).toBeGreaterThan(0);
      const ids = itemsOf(d).map(i => i.id);
      expect(new Set(ids).size, `repeated ids in ${d.key}`).toBe(ids.length);
      for (const s of d.sections) { expect(s.title.length).toBeGreaterThan(2); expect(s.items.length, s.id).toBeGreaterThan(0); }
      for (const i of itemsOf(d)) {
        expect(i.label.length, i.id).toBeGreaterThan(1);
        if (isScalar(i) && i.kind === 'choice') expect((i.options ?? []).length, `${i.id} offers choices`).toBeGreaterThan(1);
        if (isList(i)) {
          expect(i.columns.length, i.id).toBeGreaterThan(0);
          expect(new Set(i.columns.map(c => c.id)).size).toBe(i.columns.length);
          for (const c of i.columns) { expect(['text', 'long', 'choice', 'person', 'date', 'number']).toContain(c.kind); if (c.kind === 'choice') expect((c.options ?? []).length).toBeGreaterThan(1); }
          expect(i.rowWord.length).toBeGreaterThan(1);
        }
      }
      expect(itemsOf(d).some(i => ('required' in i) && i.required), 'something must be required, or "ready to agree" means nothing').toBe(true);
      if (d.signoff) { expect(d.signoff.ask.length).toBeGreaterThan(5); expect(d.signoff.back.length).toBeGreaterThan(5); expect(d.signoff.ready.length).toBeGreaterThan(5); }
      for (const x of d.see ?? []) expect(docByKey(x.key), `${d.key} points at ${x.key}`).toBeTruthy();
      expect(d.examples.length, 'a definition is proved on worked examples').toBeGreaterThanOrEqual(2);
    });

    it('reads a blank document without a throw, names what is needed, and says what it does not say', () => {
      const run = runDoc(d, undefined, [], CTX);
      expect(run.status.key).toBe(d.signoff ? 'draft' : 'draft' as never);
      expect(run.need.length).toBeGreaterThan(0);
      expect(run.result.caveats.length).toBeGreaterThanOrEqual(1);
      expect(run.result.money.none !== undefined || run.result.money.missing.length > 0 || run.result.money.text !== undefined, 'money is a figure, a named missing input, or a said "none of its own"').toBe(true);
      expect(run.tiles[0]).toMatchObject({ k: 'Filled in' });
      expect(docSays({ agreed: { doc: { def: d.key } }, facts: {} }, CTX).verdict.length).toBeGreaterThan(2);
    });

    d.examples.forEach((e, i) => {
      it(`example ${i + 1} — ${e.name}: read exactly as the independent literals say`, () => {
        const run = runDoc(d, e.values, [], ctxOf(d, e));
        expect(run.result.sentence).toBe(e.expect.sentence);
        for (const [k, v] of Object.entries(e.expect.tiles)) expect(run.tiles.find(t => t.k === k)?.v, `${d.key} ${e.name}: tile ${k}`).toBe(v);
        expect(run.need).toEqual(e.expect.needs);
        if (e.expect.money !== undefined) expect(run.result.money.text).toBe(e.expect.money);
        for (const w of e.expect.checks ?? []) expect(run.problems.map(p => p.say).join(' | '), `${d.key} ${e.name}: check “${w}”`).toContain(w);
        for (const [title, rows] of Object.entries(e.expect.tables ?? {})) {
          const t = run.result.tables?.find(x => x.title === title);
          expect(t, `${d.key} ${e.name}: table ${title}`).toBeTruthy();
          rows.forEach((r, k) => expect(t?.rows[k]?.slice(0, r.length), `${title} row ${k + 1}`).toEqual(r));
        }
        /* the same twice (nothing hidden in the reading) and the status follows what is needed */
        expect(runDoc(d, e.values, [], ctxOf(d, e)).result.sentence).toBe(run.result.sentence);
        expect(run.status.key).toBe(d.signoff ? (e.expect.needs.length ? 'draft' : 'ready') : e.expect.needs.length ? 'draft' : 'complete');
        expect(run.result.caveats.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('is agreed only by a signature, and takes it back', () => {
      if (!d.signoff) return;
      const full = d.examples.find(x => x.expect.needs.length === 0);
      expect(full, 'an example that is ready to agree').toBeTruthy();
      const signed = { by: 'Priya Shah', at: 1 };
      const run = runDoc(d, full?.values, [], ctxOf(d, full as never), signed);
      expect(run.status).toMatchObject({ key: 'signed', word: d.signoff.word, tone: 'g' });
      expect(statusOf(d, ['x'], undefined).key).toBe('draft');
    });

    it('a record of it is named, read and said in one place', () => {
      const s = newDocStudy(d, { name: 'Test', now: 1 });
      expect(s.tool).toBe('doc');
      expect(s.agreed?.doc?.def).toBe(d.key);
      const full = d.examples.find(x => x.expect.needs.length === 0) ?? d.examples[0];
      const filled = { ...s, facts: { ...s.facts, docValues: full.values } };
      expect(studyDoc(filled, ctxOf(d, full))?.def).toBe(d);
      expect(docSays(filled, ctxOf(d, full)).verdict.length).toBeGreaterThan(2);
    });
  });
}

describe('reading what was typed', () => {
  const any = DOCS[0];
  it('numbers as people type them; a thing that is not a number is nothing', () => {
    expect(toNumber('1,500')).toBe(1500);
    expect(toNumber(' 4.1 ')).toBe(4.1);
    expect(toNumber('4.1.2')).toBeUndefined();
    expect(toNumber('')).toBeUndefined();
    expect(toNumber('abc')).toBeUndefined();
    expect(toNumber(Infinity)).toBeUndefined();
  });
  it('drops what a definition does not know, empty rows and choices that are not options; keeps a row by its id', () => {
    const list = itemsOf(any).find(isList);
    if (!list) return;
    const col = list.columns[0];
    const v = valuesOf(any, { ghost: 'x', [list.id]: [{ id: 'a', c: { [col.id]: 'First' } }, { id: 'b', c: {} }, { id: 'c', c: { nothing: 'x' } }] } as never);
    expect('ghost' in v).toBe(false);
    expect((v[list.id] as DocRow[]).map(r => r.id)).toEqual(['a']);
  });
  it('says what is wrong with a box on its own, without refusing the document', () => {
    const num = itemsOf(any).find(i => isScalar(i) && i.kind === 'number');
    if (!num) return;
    expect(fieldProblems(any, { [num.id]: 'abc' }).map(p => p.say).join(' ')).toContain('must be a number');
    expect(fieldProblems(any, { [num.id]: 5 })).toEqual(fieldProblems(any, { [num.id]: 5 }));
  });
});

describe('editing what was typed', () => {
  it('sets a box, blanks it, adds a row, sets a cell and takes a row out — nothing changed in place', () => {
    const base = { a: 'x' };
    const r1 = withValue(base, 'b', 3);
    expect(r1).toEqual({ a: 'x', b: 3 });
    expect(base).toEqual({ a: 'x' });
    expect(withValue(r1, 'b', '')).toEqual({ a: 'x' });
    const row = newRow();
    const r2 = withRowAdded({}, 'steps', row);
    const r3 = withCell(r2, 'steps', row.id, 'name', 'Wash');
    expect((r3.steps as DocRow[])[0].c).toEqual({ name: 'Wash' });
    expect((r2.steps as DocRow[])[0].c).toEqual({});
    expect(withCell(r3, 'steps', row.id, 'name', '').steps).toEqual([{ id: row.id, c: {} }]);
    expect(withRowRemoved(r3, 'steps', row.id)).toEqual({});
  });
  it('a document names the photos it holds as the files to send with it, struck or not', () => {
    const photos: DocPhoto[] = [{ id: 'p1', field: 'f', blobKey: 'doc-1', mime: 'image/png', at: 1 }, { id: 'p2', field: 'f', blobKey: 'doc-2', mime: '', at: 2, struck: true }];
    expect(docMediaKeys({ docPhotos: photos })).toEqual([{ key: 'doc-1', mime: 'image/png' }, { key: 'doc-2', mime: 'image/jpeg' }]);
    expect(docMediaKeys({})).toEqual([]);
  });
  it('a photos box is needed only when it is required, and a showIf box not asked is not needed', () => {
    for (const d of DOCS) {
      const v = valuesOf(d, undefined);
      for (const i of askedItems(d, v)) if (isPhotos(i) && i.required) expect(needsOf(d, v, [])).toContain(i.label);
    }
    expect(EMPTY_CTX('2026-11-01').today).toBe('2026-11-01');
  });
});
