/* THE WORLDS — a doorway for each way of working (docs/TOOLS-WORLDS.md; Rowland, 30 October: "we have the ability to make
 * our own tool worlds, not just tools but their own ecosystem"; 31 October: "stay on tools and make the statistical world").
 *
 * A world is not a record and not a second list of tools: it is a VIEW over the catalogue's disciplines. A tool is in a world
 * because its discipline is, never because somebody typed its name here (four hand-kept lists drifted once — STRUCTURE.md B1).
 * The five worlds and the disciplines each gathers live in this one file so a world can be split, merged or renamed in one
 * place (Rowland: "we can change later"). A discipline in no world yet is listed by `unplaced()` and the test says so — it
 * is not an error, it is a thing to decide when that discipline's first tool is built. */
import { ENTRIES } from './index';
import { PROBLEMS } from './problems';
import { ownerOf } from './counts';
import { APP_TOOLS, type AppTool } from './registry';
import { DISCIPLINES, type Entry, type ProblemRoute } from './types';

export interface World {
  id: string;
  name: string;
  /** The one line on the card: what a person in this world is doing. */
  line: string;
  /** The question this world answers, in the floor's words — the hero of its home page. */
  asks: string;
  /** The catalogue disciplines it gathers. */
  disciplines: readonly string[];
}

export const WORLDS: readonly World[] = [
  { id: 'statistics', name: 'Statistics', line: 'Is it capable, is it steady, did it change — and how sure are we?',
    asks: 'How sure are we of this number?',
    disciplines: ['spc', 'stats', 'msa', 'packaging'] },
  { id: 'lean', name: 'Lean', line: 'Where does the time go, and what could flow?',
    asks: 'Where does the time go?',
    disciplines: ['lean', 'ie', 'capacity', 'changeover', 'visual', 'planning', 'ergonomics'] },
  { id: 'equipment', name: 'Equipment', line: 'Why does the machine stop, and how long does it run?',
    asks: 'Why does it stop?',
    disciplines: ['maintenance', 'equipment'] },
  { id: 'quality', name: 'Quality and food safety', line: 'Is every check done, and is the product safe and right?',
    asks: 'Is it safe, and is it right?',
    disciplines: ['quality', 'foodsafety', 'yield'] },
  { id: 'projects', name: 'Projects', line: 'Which method are we using to make it better?',
    asks: 'How are we making it better?',
    disciplines: ['sixsigma', 'rca', 'projects', 'commissioning', 'cost', 'people', 'sustainability'] },
];

export const worldById = (id: string | null | undefined): World | undefined => WORLDS.find(w => w.id === id);

/** The world a discipline is in. */
export const worldOfDiscipline = (discipline: string): World | undefined => WORLDS.find(w => w.disciplines.includes(discipline));

/** The world an entry is in. */
export const worldOf = (e: Pick<Entry, 'discipline'>): World | undefined => worldOfDiscipline(e.discipline);

/** The world an entry is in: where the tool it is built inside lives (a capability mode is Statistics', a check-log kind
 *  Quality and food safety's), else where its own discipline is. Every entry is in exactly one. */
export function worldOfEntry(e: Entry): World | undefined {
  const owner = ownerOf(e);
  return owner ? worldOfTool({ id: owner }) : worldOf(e);
}

/** Every catalogue entry in a world, in catalogue order. */
export const worldEntries = (w: World): Entry[] => ENTRIES.filter(e => worldOfEntry(e)?.id === w.id);

/** The world an app tool belongs to: where most of it lives — the tool's own entry and the modes inside it (`partOf`),
 *  each by its discipline, the tool's own breaking a tie. Check logs is a Lean entry with its metal-detection, CILT and audit
 *  logs inside it; most of those are Quality and food safety's, so it opens there. Never typed per tool. */
export function worldOfTool(t: Pick<AppTool, 'id'>): World | undefined {
  if (TOOL_WORLDS.has(t.id)) return TOOL_WORLDS.get(t.id);
  const w = workOutToolWorld(t);
  TOOL_WORLDS.set(t.id, w);
  return w;
}
const TOOL_WORLDS = new Map<string, World | undefined>();

function workOutToolWorld(t: Pick<AppTool, 'id'>): World | undefined {
  const own = ENTRIES.find(e => e.id === t.id);
  if (!own) return undefined;
  const tally = new Map<string, number>();
  for (const e of [own, ...ENTRIES.filter(x => x.id !== own.id && x.status !== 'left-out' && ownerOf(x) === own.id)]) {
    const w = worldOf(e);
    if (w) tally.set(w.id, (tally.get(w.id) ?? 0) + 1);
  }
  const home = worldOf(own);
  let best = home?.id;
  for (const [id, n] of tally) if (n > (tally.get(best ?? '') ?? 0)) best = id;
  return worldById(best);
}

/** The tools a person can open that belong to the world, in the floor's order. */
export const worldTools = (w: World): AppTool[] => APP_TOOLS.filter(t => worldOfTool(t)?.id === w.id);

/** The world's own problem routes: those whose steps lean on the world's disciplines (at least half of the
 *  entries they name — a route across worlds, like "the line won't make its target", is told once, where most of it is). */
export const worldRoutes = (w: World): ProblemRoute[] => PROBLEMS.filter(p => {
  const ids = p.steps.flatMap(s => s.ids);
  if (!ids.length) return false;
  const mine = ids.filter(id => { const e = ENTRIES.find(x => x.id === id); return !!e && w.disciplines.includes(e.discipline); }).length;
  return mine * 2 >= ids.length;
});

/** The disciplines no world has yet — said, never hidden. */
export const unplaced = (): string[] => DISCIPLINES.map(d => d.id).filter(d => !worldOfDiscipline(d));
