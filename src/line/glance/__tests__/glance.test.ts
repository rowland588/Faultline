/* A card's figures are the tool's own (13 November, docs/LINE-PAGE.md — "every number on a card must match the number on its tool
 * page"): the glance of a record is the very tiles the tool's page reads, and a tool with none for a card makes none up. */
import { describe, expect, it } from 'vitest';
import { glanceOfStudy, glanceOfCapacity } from '../glance';
import { calcByKey } from '../../../tools/calc/registry';
import { newCalcStudy, studyCalc, tilesSince } from '../../../tools/calc/calc';
import type { ToolStudy } from '../../../lib/study';
import type { Standard } from '../../../tools/linestandard/standard';
import { capacityLean } from '../../../tools/linebalance/capacityLean';
import { capacityPaper } from '../../../tools/linebalance/capacityPaper';
import { labourInputs } from '../../../tools/linebalance/capacity';

describe('a record at a glance', () => {
  it('a calculator: the tiles, the sentence and the bars are its own result’s — the worked example by hand', () => {
    const def = calcByKey('workstation-stops');
    if (!def) throw new Error('the stops calculator is not registered');
    const s = newCalcStudy(def, { id: 's1', name: 'A watch', now: 1, inputs: def.examples[0].inputs });
    const g = glanceOfStudy(s), r = studyCalc(s)?.run.result;
    expect(g.tiles).toEqual(tilesSince(r?.tiles ?? [], undefined));
    const v = (k: string) => g.tiles.find(t => t.k === k)?.v;
    expect([v('Lost'), v('Stopped'), v('Stops'), v('Worst')]).toEqual(['429', '35.75', '6', 'Sealer']);   // 8.5×12 + 22×12 + 5.25×12 = 429
    expect(g.sentence).toBe(r?.sentence);
    expect(g.pic?.t).toBe('bars');
    expect(g.pic && g.pic.t === 'bars' ? g.pic.bars.rows[0].label : '').toBe('Sealer');
  });
  it('a tool with no figures for a card yet gives none — nothing is made up', () => {
    const talk = { id: 't', tool: 'talk', name: 'A walk', facts: {}, uses: [], startedAt: 1, createdAt: 1, updatedAt: 1 } as unknown as ToolStudy;
    expect(glanceOfStudy(talk)).toEqual({ tiles: [] });
  });
  it('Line capacity: the tiles are the capacity page’s own (capacityLean over capacityPaper), with its bars', () => {
    const cap = { stations: [{ id: 'a', name: 'Bagger', kind: 'machine', unit: 'bags', speed: 70 }, { id: 'b', name: 'Packer', kind: 'machine', unit: 'bags', speed: 44 }], target: 60 };
    const st = { id: 'p', product: 'Maris Piper 2kg', marks: [], capacity: cap, updatedAt: 1 } as unknown as Standard;
    const g = glanceOfCapacity(st, null);
    const page = capacityLean(capacityPaper({ product: st.product, line: '', printed: '', capacity: cap as never, labour: labourInputs(cap as never, 0, undefined) }));
    expect(g.tiles).toEqual(page.tiles);
    expect(g.tiles[0].k).toBe('The line makes');
    expect(g.pic?.t).toBe('capacity');
  });
  it('a product with no stations has nothing to show', () => {
    expect(glanceOfCapacity({ id: 'p', product: 'X', marks: [], capacity: { stations: [] }, updatedAt: 1 } as unknown as Standard, null)).toEqual({ tiles: [] });
  });
});
