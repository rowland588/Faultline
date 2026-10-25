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
  { id: 'FC-019', why: 'Ask the rating on the line balance — the arithmetic is already there.' },
  { id: 'FC-119', why: 'A type 1 gauge study for checkweighers — quick, and decides whether weights can be trusted.' },
  { id: 'FC-155', why: 'Horizontal deployment — the factory already knows every line’s machines.' },
  { id: 'FC-071', why: 'First-off release at changeover — recall risk and hidden changeover time.' },
  { id: 'FC-070', why: 'Changeover sequence with allergen rules — food’s changeover saving.' },
  { id: 'FC-207', why: 'Put the NIOSH arithmetic on a screen — built and proved, unreachable.' },
];
