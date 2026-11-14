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
import { APP_TOOLS, MENU_PAGES } from './registry';
export { MENU_PAGES } from './registry';
import type { Entry } from './types';

/* WHAT A TOOL IS — once and for all (Rowland, 7 November: "you've split down every single functionality within its tool and then
 * called each functionality a tool ... I can't tell what we have and what we need to build"). A tool is what a person opens on a
 * page of its own and runs on a line — the registry's app tools, with two corrections:
 *   - Problems and Actions are the menu's own pages (CLAUDE.md, "How many tools — said truly": parts of the app, not tools). They
 *     stay in the registry so the frame can start one; they are never counted or shown as tools.
 *   - 6M is a tool (Rowland, 4 November: "6M is not just a project tool, it's just a tool") which had its own door until 13 November (it is a card of the registry now — src/tools/sixm), not a
 *     registry card; what is built inside it (the fishbone, the five whys) is inside a tool. */
/* 13 November: 6M is a card of the registry like every other tool (src/tools/sixm) — no tool is a door any more; the set is kept so
   what reads it still reads, and holds nothing. */
export const DOOR_TOOLS: ReadonlySet<string> = new Set<string>();
/** The tools shown as cards: the registry less the menu's pages. */
export const GALLERY_TOOLS = APP_TOOLS.filter(t => !MENU_PAGES.has(t.id));
/** Every tool's catalogue number: the cards and the doors. */
export const TOOL_IDS: ReadonlySet<string> = new Set([...GALLERY_TOOLS.map(t => t.id), ...DOOR_TOOLS]);

const built = (e: Entry): boolean => e.status === 'available' || e.status === 'partial';

/** The app tool an entry is built inside: the tool itself, the tool it is `partOf` (through any chain), or the one whose folder
 *  (src/tools/<key>/) holds its code. Undefined when it is no tool's. */
export function ownerOf(e: Entry): string | undefined {
  /* the catalogue and the registry never change while the app runs, and every page of a world asks this of every entry
     (a world's tools ask it of all 236, each of which asks the world) — so it is worked out once per entry */
  if (OWNERS.has(e.id)) return OWNERS.get(e.id);
  const owner = workOutOwner(e);
  OWNERS.set(e.id, owner);
  return owner;
}
const OWNERS = new Map<string, string | undefined>();

function workOutOwner(e: Entry): string | undefined {
  const ids = TOOL_IDS;
  if (ids.has(e.id)) return e.id;
  let p = e.partOf ? ENTRIES.find(x => x.id === e.partOf) : undefined;
  for (let up = p?.partOf; up; up = p?.partOf) p = ENTRIES.find(x => x.id === up);
  if (p && ids.has(p.id)) return p.id;
  for (const t of GALLERY_TOOLS) {
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
  const tools = TOOL_IDS;
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

/** One tool and what it holds — what is built inside it and what is still to build inside it. */
export interface ToolHolds { id: string; built: Entry[]; toBuild: Entry[] }

/** What we have and what we still need to build, tool by tool: each tool's built and not-built entries (research and left out
 *  are neither), the tools in the gallery's order and 6M after them; then the new tools not started (a not-built entry no tool
 *  owns), and the built parts of the app that are not tools. Every entry built or to build lands in exactly one place. */
export function holdings(): { tools: ToolHolds[]; newTools: Entry[]; parts: Entry[] } {
  const order = [...GALLERY_TOOLS.map(t => t.id), ...DOOR_TOOLS];
  const by = new Map<string, ToolHolds>(order.map(id => [id, { id, built: [], toBuild: [] }]));
  const newTools: Entry[] = [], parts: Entry[] = [];
  for (const e of ENTRIES) {
    if (e.status === 'research' || e.status === 'left-out' || TOOL_IDS.has(e.id)) continue;
    const o = ownerOf(e), h = o ? by.get(o) : undefined;
    if (built(e)) { if (h) h.built.push(e); else parts.push(e); }
    else if (h) h.toBuild.push(e);
    else newTools.push(e);
  }
  return { tools: order.flatMap(id => { const h = by.get(id); return h ? [h] : []; }), newTools, parts };
}
