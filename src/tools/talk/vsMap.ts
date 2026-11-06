/* A VALUE STREAM SAID ALOUD, AS THE VALUE STREAM TOOL KEEPS IT — a vs-set talk's capture mapped onto the tool's own record
 * (tool 'map': facts.flow, agreed.map; docs/LINE-TALK-TOOLSETS.md §4.3; knowledge/specs/FC-202-toolsets.md criterion 10).
 *
 * The assistant only wrote down what was said; the map is the Value stream tool's, drawn by its grid, worked by its figures. A step's value (VA · NE · NV) is
 * set only when the person classed it themselves, and only where the tool lets that kind of step be so marked (an operation may be VA; a move or a check only
 * NE or NV) — the assistant never classes a step, and the tool says how many are not classified yet. Update it keeps a step's id (so a fix raised from a step
 * still points at it) and what the person added on the map (how its job reaches it, a kaizen burst, a queue, the people). */
import type { AgreedMap, FlowStep } from '../../lib/study';
import { uid } from '../../lib/ids';
import { withValue } from '../valuestream/steps';
import type { VsCapture } from './talkSets';

const same = (a: string, b: string): boolean => a.trim().toLowerCase() === b.trim().toLowerCase();

/** The map's steps from the capture. `existing` are the made map's steps now: a step of the same name keeps its id and what the person added to it. */
export function vsFlow(c: VsCapture, existing: readonly FlowStep[] = [], fixedIds = false): FlowStep[] {
  const pool = [...existing];
  return c.steps.map((s, i) => {
    const at = fixedIds ? -1 : pool.findIndex(e => same(e.name, s.name));
    const old = at >= 0 ? pool.splice(at, 1)[0] : undefined;
    const lane = s.where || s.who[0];
    const base: FlowStep = {
      ...(old ? { ...old } : {}),
      id: old?.id ?? (fixedIds ? `vs-${i}` : uid()),
      order: i, name: s.name, kind: s.kind,
      who: s.who, ...(s.where ? { where: s.where } : {}), ...(lane ? { lane } : {}),
      source: 'typed',
    };
    /* what the talk does not say is taken off, so a time put right by taking it away stays away */
    const { cycleSec: _c, waitSec: _w, batch: _b, value: _v, ...rest } = base; void _c; void _w; void _b; void _v;
    const out: FlowStep = { ...rest, ...(s.cycleSec !== undefined ? { cycleSec: s.cycleSec } : {}), ...(s.waitSec !== undefined ? { waitSec: s.waitSec } : {}), ...(s.batch ? { batch: s.batch } : {}) };
    return withValue(out, s.value);
  });
}

/** The map's agreed part: a line's map, with the supplier, customer and demand where the talk said them; the money and the day's seconds the person typed stay. */
export function vsAgreed(c: VsCapture, old?: AgreedMap): AgreedMap {
  return { ...(old ?? {}), scope: 'line', ...(c.supplier ? { supplier: c.supplier } : {}), ...(c.customer ? { customer: c.customer } : {}), ...(c.demandPerDay ? { demandPerDay: c.demandPerDay } : {}) };
}
