import type { Built } from '../../catalogue/types';
import { SCORED_ACCEPTANCE } from '../scored/built';

/** FC-143, the Pugh matrix: a scored register (the shape's code) with its own arithmetic and matrix editor. */
export const pughBuilt: Built = {
  where: ['/scored/pugh'],
  code: [
    'src/tools/pugh/pugh.ts', 'src/tools/pugh/PughEditor.tsx', 'src/tools/scored/defs/pugh.ts',
    'src/tools/scored/types.ts', 'src/tools/scored/scored.ts', 'src/tools/scored/registry.ts', 'src/tools/scored/ScoredScreen.tsx',
    'src/lib/report/scoredPaper.ts',
  ],
  tests: ['src/tools/pugh/__tests__/pugh.test.ts'],
  acceptance: [SCORED_ACCEPTANCE],
};
