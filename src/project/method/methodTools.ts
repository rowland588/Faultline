/* WHAT A METHOD'S DEFAULT TOOL IS, TODAY (docs/METHODS.md, slice M3) — said honestly.
 *
 * A section lists catalogue tools by number. Not every number is a tool a person can open: nineteen are tools with
 * a page of their own (src/catalogue/registry APP_TOOLS); some are a mode inside one of those; some are a figure the
 * app reads in other tools; the rest are not built yet. A section row says which, and only a tool that exists gets a
 * button — never a door that goes nowhere. Pure. */
import { entryById } from '../../catalogue';
import { APP_TOOLS, type AppTool } from '../../catalogue/registry';
import { STATUS_WORDS, type Entry } from '../../catalogue/types';

export type ToolHow =
  /** A tool with a page of its own — opened, and started, in the project. */
  | { how: 'tool'; tool: AppTool; entry: Entry }
  /** A mode or part of a tool that has a page — opened through that tool. */
  | { how: 'inside'; tool: AppTool; entry: Entry; parent: Entry }
  /** Built into the app, with no page of its own to start (a figure other tools read, a report). */
  | { how: 'builtin'; entry: Entry }
  /** Not there yet — said, with the catalogue's own word for it. */
  | { how: 'notyet'; entry: Entry }
  /** The catalogue has no such entry. */
  | { how: 'unknown'; id: string };

const toolOfEntry = (id: string): AppTool | undefined => APP_TOOLS.find(t => t.id === id);

/** How a default tool of a section stands. `partOf` is followed up to the tool it lives in (once; a mode of a mode is a mode of the tool). */
export function howTool(id: string): ToolHow {
  const entry = entryById(id);
  if (!entry) return { how: 'unknown', id };
  const own = toolOfEntry(entry.id);
  if (own && (entry.status === 'available' || entry.status === 'partial')) return { how: 'tool', tool: own, entry };
  /* A CALCULATOR has no page of its own in the registry — the Calculators hub is the app tool — but it has its own address, /calc/<key>: its row opens there and New starts one there */
  const calcAt = entry.built?.where[0];
  const hub = toolOfEntry('FC-235'), hubEntry = entryById('FC-235');
  if ((entry.status === 'available' || entry.status === 'partial') && calcAt && /^\/calc\/[a-z0-9-]+$/.test(calcAt) && hub && hubEntry) return { how: 'inside', tool: { ...hub, to: calcAt }, entry, parent: hubEntry };
  if (entry.status === 'to-build' || entry.status === 'specified' || entry.status === 'research') return { how: 'notyet', entry };
  /* a check log is one kind of the Check logs tool and opens at its own list (/log/<kind>), where New starts it from its starter list */
  const logTo = entry.kind === 'log' ? entry.built?.where.find(w => w.startsWith('/log/')) : undefined;
  const logHub = logTo ? entryById('FC-236') : undefined;
  const logHubTool = logHub ? toolOfEntry(logHub.id) : undefined;
  if (logTo && logHub && logHubTool) return { how: 'inside', tool: { ...logHubTool, to: logTo }, entry, parent: logHub };
  /* built, with no page of its own: a mode of a tool that has one? */
  let parent = entry.partOf ? entryById(entry.partOf) : undefined;
  for (let i = 0; parent && !toolOfEntry(parent.id) && parent.partOf && i < 3; i++) parent = entryById(parent.partOf);
  const up = parent ? toolOfEntry(parent.id) : undefined;
  if (parent && up) return { how: 'inside', tool: up, entry, parent };
  return { how: 'builtin', entry };
}

/** The honest word for a row: what it is, in the floor's language. */
export function toolStateWord(h: ToolHow): string {
  switch (h.how) {
    case 'tool': return h.entry.status === 'partial' ? 'Built, with limits' : 'Built';
    case 'inside': return `A mode of ${h.tool.label}`;
    case 'builtin': return 'Built into the app';
    case 'notyet': return STATUS_WORDS[h.entry.status];
    case 'unknown': return 'Not in the catalogue';
  }
}

/** The tool a row opens (its own, or the one it lives in) — absent when there is nothing to open. A mode that has a page of its own
 *  inside its tool (FC-215's `/calc/critical-path` inside the Calculators) opens at that page, not at the tool's front. */
export function openable(h: ToolHow): AppTool | undefined {
  if (h.how === 'tool') return h.tool;
  if (h.how !== 'inside') return undefined;
  const own = h.entry.built?.where[0];
  return own && own.startsWith(`${h.tool.to}/`) ? { ...h.tool, to: own } : h.tool;
}

/** Where a row opens, and where New starts it: the tool's page, or a mode's own page inside it (a document's list, /doc/charter). */
export const openAt = (h: ToolHow): string | undefined => openable(h)?.to;
