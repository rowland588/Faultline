/* THE BACKLOG — what to build first, apart from the catalogue
 * (knowledge/README.md). The catalogue is the full opportunity; this is the
 * order, with its reason, weighed against docs/DIRECTION.md ("deep, not wide:
 * a tool earns its place only when it answers a question the floor asks ...
 * a new tool is added when a real problem on the line needs it"). So the top
 * of the list deepens tools the team already uses, closes money gaps
 * (docs/BLUEPRINT.md §6), and answers what Rowland has asked for; new tools
 * come after. Only entries that are not available yet. Rowland reorders it. */
import type { BacklogItem } from './types';

export const BACKLOG: BacklogItem[] = [
  { id: 'FC-155', why: 'Horizontal deployment — the factory already knows every line’s machines.' },
  { id: 'FC-070', why: 'Changeover sequence with allergen rules — food’s changeover saving.' },
];
