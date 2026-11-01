
import { rsmAnalyse, rsmStart } from '../../rsm/rsm';
import type { ScoredDef } from '../types';

/* FC-112 — optimising settings: a response surface. Two or three factors, a central composite or Box–Behnken design, the runs made in a shuffled order with
   centre runs, a quadratic fitted, its stationary point and nature, the best setting only if it lies inside what was run, and a confirmation run.
   Specification: knowledge/specs/FC-112-response-surface.md. Arithmetic and words: src/tools/rsm/rsm.ts. */
const SQ2 = Math.SQRT2;
/* the record's frozen case (knowledge/methods/stats/response-surface.md): filler speed 45–75 a minute, product temperature 15–25 °C, give-away in grams */
const RUNS: [number, number, number][] = [[-1, -1, 1.483], [-1, 1, 1.277], [1, -1, 1.561], [1, 1, 1.521], [0, -SQ2, 1.493], [0, SQ2, 1.267], [-SQ2, 0, 1.380], [SQ2, 0, 1.764],
  [0, 0, 1.084], [0, 0, 1.209], [0, 0, 1.115], [0, 0, 1.049], [0, 0, 1.080]];
const def: ScoredDef = {
  key: 'rsm',
  fc: 'FC-112',
  title: 'Optimising settings',
  says: 'Fit a curved surface to a designed set of runs and find the best setting — only inside what was run, and checked by a confirmation run',
  group: 'Risk and control',
  question: 'Which combination of the settings gives the best result — and is it inside what was tried?',
  scales: [],
  limits: [
    'Two or three factors and one response at a time, one block. Several responses at once (desirability), the window where the prediction stays near the best, and blocks are not built.',
    'The quadratic describes the surface only inside the box that was run: a stationary point beyond the runs is not quoted, and the best setting is then given on the edge of the region with “move the box and run again”. The region is the ball out to the furthest run.',
    'The fit is only as good as the runs: made in the order given, with real replicates at the centre. The tool cannot see a drifting machine; the lack-of-fit test and a confirmation run are the checks it has.',
    'Not yet raised from a factorial’s result (the path of steepest ascent is the factorial’s, FC-111), and not on the line’s page, Needs you or the control room.',
  ],
  noun: 'run',
  register: {
    analyse: ({ rows, ctx }) => rsmAnalyse({ rows, ctx }),
    start: () => rsmStart(),
    asks: { name: 'What is being optimised?', placeholder: 'e.g. Filler give-away — speed and product temperature', empty: 'No optimisation yet — name the factors and the design, make the run sheet, then type each result as the run is made.', noun: 'run', newLabel: 'New optimisation' },
  },
  examples: [{
    name: 'Filler give-away — speed and product temperature, a 13-run rotatable central composite (synthetic data, frozen in the knowledge record)',
    rows: RUNS.map(([a, b, y], i) => ({ id: `r${i + 1}`, name: `Run ${i + 1}`, run: { x: [a, b], y } })),
    rsm: { factors: [{ name: 'Filler speed', unit: 'a minute', low: 45, high: 75 }, { name: 'Product temperature', unit: '°C', low: 15, high: 25 }], design: 'ccc', centre: 5, seed: 112, goal: 'min', response: 'Give-away', unit: 'g' },
    /* knowledge/methods/stats/response-surface.md and scripts/knowledge/cases-t8-3.py — the same runs fitted by a second implementation */
    expect: { counts: { run: 13 }, verdict: 'Best 1.08 g' },
  }],
};
export default def;
