import type { Built } from '../../catalogue/types';
import { SCORED_ACCEPTANCE } from '../scored/built';

/** FC-222, the skills matrix and cover: a scored register (the shape's code) with its own arithmetic and matrix editor. */
export const skillsBuilt: Built = {
  where: ['/scored/skills'],
  code: [
    'src/tools/skills/skills.ts', 'src/tools/skills/SkillsEditor.tsx', 'src/tools/scored/defs/skills-matrix.ts',
    'src/tools/scored/types.ts', 'src/tools/scored/scored.ts', 'src/tools/scored/registry.ts', 'src/tools/scored/ScoredScreen.tsx',
    'src/lib/report/scoredPaper.ts',
  ],
  tests: ['src/tools/skills/__tests__/skills.test.ts'],
  acceptance: [SCORED_ACCEPTANCE, 'skills-matrix.mjs'],
};
