/* WHICH SCOPE A PAGE IS IN (docs/STRUCTURE.md §5, B2) — pure, from the address and what the frame
 * already knows about it.
 *
 * Home (yours) sits above three scopes: the FACTORY — every line and project at once, its control
 * room and registers; a LINE — the line as a place, no project needed; a PROJECT — the change as a
 * workspace. Every page is in exactly one, and the frame (ui/Frame) draws that scope's rail, its
 * phone bar and the context bar that names it. Before 23 October the frame answered "where am I?"
 * three ways (projectOf, placeOf, hereOf) and a line had no scope of its own: its page wore the
 * factory's rail and the top bar said "Your factory".
 *
 * The frame passes what only a read can say: the project a record or a line study belongs to, and
 * the line a record is on. The rest is the route's own shape, so a page added under /project/:id
 * or /lines/:ws later sits in its scope without being listed here. */
import type { Route } from '../state/useRoute';

export type Scope =
  | { kind: 'home' }
  | { kind: 'factory' }
  | { kind: 'line'; wsId: string }
  | { kind: 'project'; projectId: string };

/** What the frame has read: the project a record, a list or a study is in, and the line it is on. */
export interface ScopeHints {
  projectId?: string;
  lineId?: string;
}

/** Pages that are the factory's whatever their query says. */
const FACTORY = new Set<Route['name']>(['home', 'projects', 'factory', 'factoryMachines', 'allActions', 'tools', 'portfolio', 'parts', 'guide', 'share']);
/** Lists that narrow to a line with ?line= — a line's problems, programs and a tool's uses on it. */
const LINE_LISTS = new Set<Route['name']>(['quickSnags', 'linePrograms', 'lineTools', 'studies', 'videos', 'talks']);

/** WHICH SCOPE — a project when the page is a project's, a line when it is a line's, the factory
 *  otherwise; the front door is Home. */
export function scopeOf(route: Route, hints: ScopeHints = {}): Scope {
  if (route.name === 'start') return { kind: 'home' };
  if ((route.name === 'lineHome' || route.name === 'lineReport' || route.name === 'lineMachine') && route.wsId) return { kind: 'line', wsId: route.wsId };
  /* a record in a project wears the project's rail — the project it is on, not the address it was
     reached by (docs/PROJECTS.md P2; lib/inProject). 29 October put route.wsId above this to force
     every /w/ page into line scope, and a Line capacity made inside a project stopped opening in it
     (scripts/acceptance/project-workspace.mjs check 5, found 30 October) — put back, as B6 asks:
     the rail lights Logs on a line, the line in a 6M project, the Plan in a stage gate. */
  if (hints.projectId) return { kind: 'project', projectId: hints.projectId };
  if (FACTORY.has(route.name)) return { kind: 'factory' };
  const line = route.query.get('line');
  if (LINE_LISTS.has(route.name)) return line ? { kind: 'line', wsId: line } : { kind: 'factory' };
  /* a line study's screens and a line's own products are the line's (B6 makes the study its Logs) */
  if (route.wsId) return { kind: 'line', wsId: route.wsId };
  if (hints.lineId) return { kind: 'line', wsId: hints.lineId };
  return { kind: 'factory' };
}

export const sameScope = (a: Scope, b: Scope): boolean =>
  a.kind === b.kind && (a.kind !== 'line' || a.wsId === (b as { wsId: string }).wsId) && (a.kind !== 'project' || a.projectId === (b as { projectId: string }).projectId);

/** How well a name matches what was typed: 0 it starts with it, 1 a word in it does, 2 it is in it
 *  somewhere, 3 not at all. Read by the context bar's switcher (ui/ContextBar). */
export function matchScore(name: string, words: string): number {
  if (!words) return 0;
  const s = name.toLowerCase();
  if (s.startsWith(words)) return 0;
  if (s.split(/[\s—–\-·/]+/).some(w => w.startsWith(words))) return 1;
  return s.includes(words) ? 2 : 3;
}
