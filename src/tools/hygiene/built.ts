import type { Built } from '../../catalogue/types';
import { SCORED_ACCEPTANCE } from '../scored/built';

/** FC-178, the hygienic design review: a scored register's checklist (the shape's code) with its own findings arithmetic and starter list. */
export const hygieneBuilt: Built = {
  where: ['/scored/hygienic-design'],
  code: [
    'src/tools/hygiene/hygiene.ts', 'src/tools/scored/ChecklistEditor.tsx', 'src/tools/scored/defs/hygienic-design.ts',
    'src/tools/scored/types.ts', 'src/tools/scored/scored.ts', 'src/tools/scored/registry.ts', 'src/tools/scored/ScoredScreen.tsx',
    'src/lib/report/scoredPaper.ts',
  ],
  tests: ['src/tools/hygiene/__tests__/hygiene.test.ts'],
  acceptance: [SCORED_ACCEPTANCE, 'hygienic-design.mjs'],
};
