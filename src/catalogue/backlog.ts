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
  { id: 'FC-098', why: 'Part 2 of the capability study (part 1 built 22 October): reject rate capability — asked for by Rowland, 22 October.' },
  { id: 'FC-083', why: 'Part 2: held at a rate for a time — asked for by Rowland, 22 October.' },
  { id: 'FC-088', why: 'Part 2: the run chart a reject rate needs.' },
  { id: 'FC-156', why: 'Give-away in money — the biggest missing money on a weighing line (BLUEPRINT §6).' },
  { id: 'FC-157', why: 'The lowest legal fill — turns a spread reduction into money; needs FC-156.' },
  { id: 'FC-059', why: 'Repair times on the reliability study — the other half of a machine’s reliability.' },
  { id: 'FC-124', why: 'Part 3: the defect tally, so rejects say what kind they are.' },
  { id: 'FC-125', why: 'Part 3: the defect Pareto by count and money.' },
  { id: 'FC-099', why: 'Part 3: faults per item, the right denominator.' },
  { id: 'FC-019', why: 'Ask the rating on the line balance — the arithmetic is already there.' },
  { id: 'FC-086', why: 'The individuals chart on its own — every measured study already has the readings in order.' },
  { id: 'FC-119', why: 'A type 1 gauge study for checkweighers — quick, and decides whether weights can be trusted.' },
  { id: 'FC-155', why: 'Horizontal deployment — the factory already knows every line’s machines.' },
  { id: 'FC-071', why: 'First-off release at changeover — recall risk and hidden changeover time.' },
  { id: 'FC-070', why: 'Changeover sequence with allergen rules — food’s changeover saving.' },
  { id: 'FC-207', why: 'Put the NIOSH arithmetic on a screen — built and proved, unreachable.' },
];
