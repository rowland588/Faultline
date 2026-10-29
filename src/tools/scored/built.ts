import type { Built } from '../../catalogue/types';

export const SCORED_CODE: string[] = [
  'src/tools/scored/types.ts', 'src/tools/scored/scored.ts', 'src/tools/scored/registry.ts', 'src/tools/scored/ScoredScreen.tsx',
  'src/lib/ie/criticality.ts', 'src/lib/report/scoredPaper.ts',
];

export const SCORED_TESTS: string[] = ['src/lib/ie/__tests__/criticality.test.ts'];

export const SCORED_ACCEPTANCE = 'scored-shape.mjs';

export const scoredBuilt = (key: string): Built => ({
  where: [`/scored/${key}`],
  code: [`src/tools/scored/defs/${key}.ts`, ...SCORED_CODE],
  tests: SCORED_TESTS,
  acceptance: [SCORED_ACCEPTANCE],
});
