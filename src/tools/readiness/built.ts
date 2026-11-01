import type { Built } from '../../catalogue/types';
import { SCORED_ACCEPTANCE } from '../scored/built';

/** FC-082, operational readiness: a scored register's checklist (the shape's code) with its own arithmetic, starter list and editor. */
export const readinessBuilt: Built = {
  where: ['/scored/readiness'],
  code: [
    'src/tools/readiness/readiness.ts', 'src/tools/scored/ChecklistEditor.tsx', 'src/tools/scored/defs/readiness.ts',
    'src/tools/scored/types.ts', 'src/tools/scored/scored.ts', 'src/tools/scored/registry.ts', 'src/tools/scored/ScoredScreen.tsx',
    'src/lib/report/scoredPaper.ts',
  ],
  tests: ['src/tools/readiness/__tests__/readiness.test.ts'],
  acceptance: [SCORED_ACCEPTANCE, 'readiness.mjs'],
};
