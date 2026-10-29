import type { Built } from '../../catalogue/types';

export const BOARD_CODE: string[] = [
  'src/tools/board/types.ts', 'src/tools/board/board.ts', 'src/tools/board/registry.ts', 'src/tools/board/BoardScreen.tsx',
  'src/lib/ie/maintenanceMeasures.ts', 'src/lib/report/boardPaper.ts',
];

export const BOARD_TESTS: string[] = ['src/lib/ie/__tests__/maintenanceMeasures.test.ts'];

export const BOARD_ACCEPTANCE = 'board-shape.mjs';

export const boardBuilt = (key: string): Built => ({
  where: [`/board/${key}`],
  code: [`src/tools/board/defs/${key}.ts`, ...BOARD_CODE],
  tests: BOARD_TESTS,
  acceptance: [BOARD_ACCEPTANCE],
});
