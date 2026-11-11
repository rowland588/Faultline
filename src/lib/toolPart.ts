/* WHAT A PART OF A TOOL RECORD IS CALLED, AND THE PARTS IT HAS — a workstation of the stops chart, a station, a step (docs/ATTACHMENTS.md,
 * docs/TOOL-PROBLEMS.md). The pictures on paper and the problems held by a record name a part the same way: the tool's own tile name, never an id.
 * Pure. */
import type { ToolStudy } from './study';
import { studyCalc } from '../tools/calc/calc';
import { studyTitle } from './studyLinks';
import { toolLinksOf } from '../snag/toolLink';
import type { Snag } from '../snag/types';

/** What a part is called: a calculator's tile by its definition; the whole record has no name (''). An id the tool no longer has is said as it is. */
export function partName(s: Pick<ToolStudy, 'agreed'>, target: string): string {
  if (!target) return '';
  const c = studyCalc(s);
  if (c?.def.tileTarget && c.def.tileName) {
    for (let i = 0; i < 60; i++) if (c.def.tileTarget(i) === target) return c.def.tileName(c.run.values, i);
  }
  return target;
}

/** The parts a record has that a person has named or filled — a calculator's tiles with any figure typed (`w03_name`, `w03_min` …), in order. */
export function partsOf(s: Pick<ToolStudy, 'agreed'>): { id: string; name: string }[] {
  const c = studyCalc(s);
  if (!c?.def.tileTarget || !c.def.tileName) return [];
  const keys = Object.keys(c.agreed.inputs ?? {});
  const out: { id: string; name: string }[] = [];
  for (let i = 0; i < 60; i++) {
    const id = c.def.tileTarget(i);
    if (keys.some(k => k.startsWith(`${id}_`))) out.push({ id, name: c.def.tileName(c.run.values, i) });
  }
  return out;
}

/** "Stops across workstations — Cellox trial › Sealer": the record by its tool and name, then the part when there is one. */
export function toolPartSaid(s: Pick<ToolStudy, 'tool' | 'name' | 'machine' | 'agreed'>, part?: string): string {
  const p = part ? partName(s, part) : '';
  return `${studyTitle(s)}${p ? ` › ${p}` : ''}`;
}

/** "Raised from Stops across workstations — Cellox trial › Sealer" (or "Linked to …"; "· and 1 more" when it is held by several) — what a problem's
 *  row, its card and the Problems report say, from the records given. Nothing when it is held by none. */
export function raisedFromSaid(p: Pick<Snag, 'tools'>, records: readonly Pick<ToolStudy, 'id' | 'tool' | 'name' | 'machine' | 'agreed'>[] | null | undefined): string | undefined {
  const all = toolLinksOf(p);
  const l = all[0];
  if (!l) return undefined;
  const st = records?.find(r => r.id === l.studyId);
  return `${l.raised ? 'Raised from' : 'Linked to'} ${st ? toolPartSaid(st, l.part) : 'a tool record not on this device'}${all.length > 1 ? ` · and ${all.length - 1} more` : ''}`;
}

/** The reader a paper takes: every record on the device read once. */
export const toolReader = (records: readonly Pick<ToolStudy, 'id' | 'tool' | 'name' | 'machine' | 'agreed'>[]) => (p: Pick<Snag, 'tools'>): string | undefined => raisedFromSaid(p, records);
