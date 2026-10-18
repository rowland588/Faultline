/* FAULTLINE'S ESTABLISHED METHODS, IN THE LIBRARY (docs/BLUEPRINT.md §3, the
 * new product: one way to start).
 *
 * The stage gate, 6M and the lever tree are not methods written as data —
 * each runs on screens of its own, proven on real jobs (the machines, the
 * plan and Commission; the fishbone and the board; the tree). They stay
 * exactly as they are. What changes is where a person finds them: in the
 * library beside Faultline's methods and their own, found by the same words
 * (lib/flow/library closeness), and started the one way every job starts —
 * the New job form, here with the method picked (?model=) and the line
 * carried (?line=).
 *
 * Nothing is stored here; lib/planModel holds what each one is. */
import { MODELS, type PickedModel } from '../planModel';

export interface Established {
  id: PickedModel;
  name: string;
  purpose: string;
  /** What it runs on, in a line — why it is not adapted like the others. */
  screens: string;
  /** Words a person might use for it — matched when they describe the work. */
  words: string[];
}

const SCREENS: Record<PickedModel, string> = {
  commissioning: 'its own screens — the machines and their stages, the plan, Commission, programs, handover',
  board: 'its own screens — the fishbone, the board of countermeasures, the proof on the same number',
  tree: 'its own screens — the outcome, its levers and conditions, the work under each',
};

const WORDS: Record<PickedModel, string[]> = {
  commissioning: ['new', 'equipment', 'machine', 'install', 'installation', 'commission', 'commissioning', 'handover', 'oem', 'supplier', 'fit', 'fitting', 'proved'],
  board: ['running', 'perform', 'performance', 'root cause', 'cause', 'fishbone', '6m', 'problem', 'losses', 'gap', 'missing', 'keeps', 'stops', 'jams', 'fix'],
  tree: ['outcome', 'number', 'target', 'lever', 'levers', 'goal', 'date', 'by march', 'what has to be true', 'reach', 'hit', 'sponsor'],
};

export const ESTABLISHED: readonly Established[] = MODELS.map(m => ({
  id: m.id, name: m.label, purpose: `${m.situation} — ${m.blurb.charAt(0).toLowerCase()}${m.blurb.slice(1)}`, screens: SCREENS[m.id], words: WORDS[m.id],
}));

/** Where one starts: New job with it picked, on the line it came from. */
export const establishedHref = (id: PickedModel, lineId?: string): string =>
  `/projects?new=1&model=${id}${lineId ? `&line=${encodeURIComponent(lineId)}` : ''}`;

export const isPicked = (x: string | null | undefined): x is PickedModel => MODELS.some(m => m.id === x);
