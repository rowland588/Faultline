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
  if (entry.status === 'to-build' || entry.status === 'specified' || entry.status === 'research') return { how: 'notyet', entry };
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

/** The tool a row opens (its own, or the one it lives in) — absent when there is nothing to open. */
export const openable = (h: ToolHow): AppTool | undefined => (h.how === 'tool' || h.how === 'inside' ? h.tool : undefined);
