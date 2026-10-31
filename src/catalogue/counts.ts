/* HOW MANY TOOLS — said truly (Rowland, 31 October: "124 available ... that's simply not true ... you have counted every design of
 * a build as a tool ... we don't have clarity on tools").
 *
 * The catalogue lists 236 ENTRIES: tools, but also every method that runs inside a tool, every part several tools share, every
 * report and board, every workflow. Calling all of them "tools" made 124 "available". A TOOL is what a person can open on a page
 * of its own — the registry's app tools (src/catalogue/registry). Everything else built is either a METHOD INSIDE a tool (a
 * capability mode, a check-log kind, a calculator, a gauge study …) or a PART of the app that is not a tool (Problems, Actions, the
 * control room, the stage gate, reports). Nothing is typed here: every figure is counted from the catalogue, so a new tool or
 * method moves them by being catalogued, and the three always add up to what is built. */
import { ENTRIES } from './index';
import { APP_TOOLS } from './registry';
import type { Entry } from './types';

const built = (e: Entry): boolean => e.status === 'available' || e.status === 'partial';

/** The app tool an entry is built inside: the tool itself, the tool it is `partOf` (through any chain), or the one whose folder
 *  (src/tools/<key>/) holds its code. Undefined when it is no tool's. */
export function ownerOf(e: Entry): string | undefined {
  const ids = new Set(APP_TOOLS.map(t => t.id));
  if (ids.has(e.id)) return e.id;
  let p = e.partOf ? ENTRIES.find(x => x.id === e.partOf) : undefined;
  while (p?.partOf) p = ENTRIES.find(x => x.id === p!.partOf);
  if (p && ids.has(p.id)) return p.id;
  for (const t of APP_TOOLS) {
    const own = ENTRIES.find(x => x.id === t.id);
    const dir = own?.built?.code.map(c => /^src\/tools\/[^/]+\//.exec(c)?.[0]).find(Boolean);
    if (dir && e.built?.code.some(c => c.startsWith(dir))) return t.id;
  }
  return undefined;
}

export interface ToolCounts {
  /** What is catalogued, all of it. */
  entries: number;
  /** Tools a person can open on a page of their own. */
  tools: number;
  /** Methods built inside those tools — modes, kinds, calculators, studies. */
  inside: number;
  /** Built into the app but not tools: Problems, Actions, reports, the stage gate. */
  parts: number;
  /** Catalogued and not built yet (planned or specified). */
  notBuilt: number;
  /** Not decided until it is researched. */
  research: number;
  /** Left out on purpose. */
  leftOut: number;
}

/** The truthful counts for a set of entries (the whole catalogue, or one world's). */
export function toolCounts(entries: readonly Entry[] = ENTRIES): ToolCounts {
  const tools = new Set(APP_TOOLS.map(t => t.id));
  let inside = 0, parts = 0, notBuilt = 0, research = 0, leftOut = 0, open = 0;
  for (const e of entries) {
    if (e.status === 'left-out') leftOut++;
    else if (e.status === 'research') research++;
    else if (!built(e)) notBuilt++;
    else if (tools.has(e.id)) open++;
    else if (ownerOf(e)) inside++;
    else parts++;
  }
  return { entries: entries.length, tools: open, inside, parts, notBuilt, research, leftOut };
}

/** How many methods are built inside each tool, by the tool's entry number. */
export function insideByTool(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const e of ENTRIES) {
    const o = ownerOf(e);
    if (o && o !== e.id && built(e)) out[o] = (out[o] ?? 0) + 1;
  }
  return out;
}
