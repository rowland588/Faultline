/* THE HEADINGS, AS THE PERSON SAYS THEM (13 November, docs/WORKBOOKS.md — "headings the reader cannot find, named by the person").
 * The reader takes as the header the opening row that is mostly words; a sheet with years for headings, a banner above them, or no
 * headings at all is read with the wrong row, or with "Column B", "Column W". The person knows where the headings are. This changes how
 * the workbook ALREADY READ on this device is understood — never the file, and never a cell:
 *   the heading row    "the headings are on row 5": each column takes the words in that row, and the rows down to it stop being data
 *                      (they stay in the store; no question reads them);
 *   a column's name    "column M is the variance": that column is called so from here on.
 * What was said is kept on the sheet's profile (`amended`), so the reader's own finding and the person's word are never confused.
 * Rows above a header the reader chose were never kept: a heading row above it cannot be taken without attaching the workbook again,
 * and that is said. Pure but for the store. */
import { Kind, chunkKey, rowsKey, unpackChunk, putJson, type WorkbookStore } from './store';
import type { WorkbookProfile } from './read';
import { cellValue, sheetOf, stringsOf, QueryError } from './query';

export interface Amend { sheet: string; headerRow?: number; names?: { column: string; name: string }[] }
const norm = (s: string): string => s.trim().replace(/\s+/g, ' ').toLowerCase();

export async function amendProfile(store: WorkbookStore, p: WorkbookProfile, a: Amend): Promise<{ profile: WorkbookProfile; said: string[] }> {
  const s = sheetOf(p, a.sheet);
  const said: string[] = [];
  const taken = (name: string, but?: number): boolean => s.columns.some(c => c.slot !== but && norm(c.name) === norm(name));
  if (a.headerRow !== undefined && a.headerRow !== s.headerRow) {
    const N = Math.floor(a.headerRow);
    if (!(N >= 1)) throw new QueryError('A heading row is a row number of the sheet, 1 or more.');
    if (s.headerRow > 0 && N < s.headerRow) throw new QueryError(`Row ${N} of “${s.name}” is above the row I read as its headings (row ${s.headerRow}), and the rows above that were not kept on this device. Attach the workbook again and tell me the heading row first.`);
    const str = await stringsOf(store, p);
    let found = false, gone = 0;
    for (let ch = 0; ch < Math.min(s.chunks, 4) && !found; ch += 1) {
      const rb = await store.get(rowsKey(s.index, ch));
      if (!rb) break;
      const rows = new Int32Array(rb.buffer.slice(rb.byteOffset, rb.byteOffset + rb.byteLength));
      const i = rows.indexOf(N);
      for (const r of rows) if (r <= N) gone += 1;
      if (i < 0) continue;
      found = true;
      let named = 0;
      for (const c of s.columns) {
        if (c.colour) continue;
        const b = await store.get(chunkKey(s.index, c.slot, ch));
        if (!b) continue;
        const u = unpackChunk(b);
        if (u.kinds[i] === Kind.Blank) continue;
        let name = String(cellValue(u.kinds[i], u.vals[i], str) ?? '').trim().slice(0, 120);
        if (!name) continue;
        for (let k = 2; taken(name, c.slot); k += 1) name = `${name.replace(/ \(\d+\)$/, '')} (${k})`;
        c.name = name; c.named = true; named += 1;
      }
      if (!named) throw new QueryError(`Row ${N} of “${s.name}” holds no words to name the columns by.`);
      said.push(`The headings of “${s.name}” are taken from row ${N}: ${s.columns.filter(c => c.named && !c.colour).slice(0, 12).map(c => `“${c.name}”`).join(', ')}${s.columns.filter(c => c.named).length > 12 ? ' and more' : ''}. The ${gone.toLocaleString('en-GB')} row${gone === 1 ? '' : 's'} down to it ${gone === 1 ? 'is' : 'are'} no longer read as data.`);
    }
    if (!found) throw new QueryError(`Row ${N} of “${s.name}” holds nothing I read — give the row the headings are written on.`);
    for (const c of s.columns) if (c.colour && c.slot >= 16_384) { const base = s.columns.find(x => x.slot === c.slot - 16_384); if (base) c.name = `Colour of ${base.name}`; }
    s.rows = Math.max(0, s.rows - gone);
    s.headerRow = N; s.dataFrom = N + 1;
  }
  for (const n of a.names ?? []) {
    const name = n.name.trim().slice(0, 120);
    if (!name) throw new QueryError('A column’s name needs words.');
    const c = s.columns.find(x => x.name === n.column) ?? s.columns.find(x => norm(x.name) === norm(n.column)) ?? s.columns.find(x => x.letter === n.column.trim().toUpperCase() || norm(`column ${x.letter}`) === norm(n.column));
    if (!c) throw new QueryError(`No column “${n.column}” on “${s.name}” — its columns are ${s.columns.slice(0, 30).map(x => `“${x.name}” (${x.letter})`).join(', ')}.`);
    if (taken(name, c.slot)) throw new QueryError(`“${name}” is already a column of “${s.name}” — give it another name.`);
    said.push(`Column ${c.letter} of “${s.name}” (it was “${c.name}”) is now called “${name}”.`);
    c.name = name; c.named = true;
  }
  if (said.length) {
    s.amended = [...(s.amended ?? []), ...said].slice(-20);
    await putJson(store, 'profile', p);
  }
  return { profile: p, said };
}
