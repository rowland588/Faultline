/* A PDF is kept where it was made (lib/keptPdfs): the page it belongs to, and a line's page also holding what was made for it elsewhere. */
import { describe, expect, it } from 'vitest';
import { idsIn, keptHere, pageOf, sizeWords, type KeptPdf } from '../keptPdfs';

const L = '11111111-2222-3333-4444-555555555555', S = '66666666-7777-8888-9999-aaaaaaaaaaaa', P = 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff';
const k = (id: string, hash: string, at = 1): KeptPdf => ({ id, key: `kept-${id}`, name: `${id}.pdf`, at, size: 1000, page: pageOf(hash), ids: idsIn(hash) });

describe('the page a PDF was made on', () => {
  it('is its address without the query or a trailing slash; the ids in it are listed once', () => {
    expect(pageOf(`#/w/${L}/standards/${S}?at=balance&x=1`)).toBe(`#/w/${L}/standards/${S}`);
    expect(pageOf('#/tools/')).toBe('#/tools');
    expect(idsIn(`#/w/${L}/standards/${S}?line=${L}`)).toEqual([L, S]);
  });
  it('shows what was made on that very page, and nothing from another', () => {
    const all = [k('a', `#/w/${L}/standards/${S}?at=balance`), k('b', `#/w/${L}/standards/${S}`), k('c', '#/tools'), k('d', `#/project/${P}/report`)];
    expect(keptHere(all, `#/w/${L}/standards/${S}?at=x`).map(x => x.id)).toEqual(['a', 'b']);
    expect(keptHere(all, '#/tools').map(x => x.id)).toEqual(['c']);
  });
  it('a line’s page also holds what was made for it on pages that carry its id', () => {
    const all = [k('a', `#/w/${L}/standards/${S}`), k('b', `#/project/${P}/report`), k('c', `#/lines/${L}/report`)];
    expect(keptHere(all, `#/lines/${L}`).map(x => x.id).sort()).toEqual(['a', 'c']);
    expect(keptHere(all, `#/lines/${L}?view=tools`).map(x => x.id).sort()).toEqual(['a', 'c']);
  });
  it('says a size a person reads', () => {
    expect(sizeWords(500)).toBe('1 KB'); expect(sizeWords(250_000)).toBe('244 KB'); expect(sizeWords(3_145_728)).toBe('3.0 MB');
  });
});
