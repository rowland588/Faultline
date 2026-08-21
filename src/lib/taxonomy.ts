/* The loss taxonomies — domain expertise shipped as CONTENT, not code (see
 * docs/PRODUCT.md: the moat). A generic tool makes every factory invent its
 * category tree; a domain expert arrives already speaking the language. Food
 * manufacturing's truth is baked in here: losses are not just downtime —
 * giveaway, changeovers (allergen and hygiene cleandowns included), waiting
 * states, and speed losses all bleed money, and the walls between them are
 * where the Pareto gets interesting.
 *
 * A taxonomy is only the STARTING vocabulary: every category, sub-category and
 * asset stays a plain editable string on the workspace, exactly as before.
 * Nothing here changes behaviour — the picker chooses the seed, that's all. */

export interface LossTaxonomy {
  id: string;
  name: string;
  sub: string; // one line under the name in the picker
  categories: string[];
  subcategories: Record<string, string[]>;
  assets: string[];
}

/* The shared food core — WHAT goes wrong on a food line. Assets differ by
 * process; the loss language barely does. */
const FOOD_CATEGORIES = ['Breakdown', 'Minor stop', 'Changeover', 'Waiting', 'Quality', 'Speed loss', 'Hygiene & cleaning'];
const FOOD_SUBCATEGORIES: Record<string, string[]> = {
  Breakdown: ['Mechanical', 'Electrical', 'Jam / blockage', 'Utilities (air / steam / chill)'],
  'Minor stop': ['Misfeed', 'Sensor trip', 'Manual clear', 'Film / packaging snag'],
  Changeover: ['Product change', 'Size / format change', 'Allergen changeover', 'Hygiene cleandown', 'Label / date change', 'No standard'],
  Waiting: ['Starved upstream', 'Blocked downstream', 'No packaging / consumables', 'No ingredients', 'No labour', 'Waiting QA release', 'Waiting forklift / logistics'],
  Quality: ['Giveaway / overfill', 'Seal fault', 'Label / date fault', 'Foreign body / detector reject', 'Underweight reject', 'Rework', 'Scrap / waste'],
  'Speed loss': ['Running below rated', 'Uneven crewing', 'Short runs'],
  'Hygiene & cleaning': ['Scheduled clean', 'Unscheduled clean', 'Swab / QA hold'],
};

export const TAXONOMIES: LossTaxonomy[] = [
  {
    id: 'lean',
    name: 'Lean starter',
    sub: 'Six classic loss categories — build your own tree as you go',
    categories: ['Breakdown', 'Minor stop', 'Changeover', 'Waiting', 'Quality', 'Speed loss'],
    subcategories: {
      Breakdown: ['Mechanical', 'Electrical', 'Jam / blockage'],
      'Minor stop': ['Misfeed', 'Sensor trip', 'Manual clear'],
      Changeover: ['Tooling', 'Setup', 'No standard'],
      Quality: ['Reject', 'Rework', 'Seal fault'],
    },
    assets: ['Whole line'],
  },
  {
    id: 'food-packing',
    name: 'Food — packing & end of line',
    sub: 'Flow wrapper to palletiser: giveaway, seal faults, allergen changeovers',
    categories: FOOD_CATEGORIES,
    subcategories: FOOD_SUBCATEGORIES,
    // line order, infeed → outfeed; 'Whole line' is the bucket for losses that
    // aren't one machine, so it rides at the end — it isn't a station
    assets: ['Flow wrapper', 'Tray sealer', 'Multihead weigher', 'Checkweigher', 'Metal detector', 'X-ray', 'Case packer', 'Labeller', 'Date coder', 'Palletiser', 'Whole line'],
  },
  {
    id: 'food-process',
    name: 'Food — process & production',
    sub: 'Mixer to freezer: ovens, depositors, cleandowns, QA holds',
    categories: FOOD_CATEGORIES,
    subcategories: FOOD_SUBCATEGORIES,
    assets: ['Mixer', 'Divider / former', 'Depositor', 'Prover', 'Oven', 'Fryer', 'Cooler', 'Chiller / freezer', 'Enrober', 'Slicer', 'Conveyors', 'Whole line'],
  },
];

export const DEFAULT_TAXONOMY_ID = 'lean';
export const taxonomyById = (id: string): LossTaxonomy =>
  TAXONOMIES.find(t => t.id === id) ?? TAXONOMIES[0];
