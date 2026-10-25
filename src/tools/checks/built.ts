/* WHAT A CHECK LOG IS BUILT FROM — for the catalogue (src/catalogue/types.ts Built).
 *
 * Every entry whose tool is a check log names the same shape and its own definition: `built: logBuilt('cilt')`.
 * Adding a log is its definition file in ./defs and this one call in its catalogue entry — the shape's code,
 * its tests and its acceptance script (table-driven over every definition) are shared, so they are listed once.
 * Types only from the catalogue: nothing here runs at import. */
import type { Built } from '../../catalogue/types';

/** The shape's code, shared by every log. */
export const LOG_CODE: string[] = [
  'src/tools/checks/def.ts', 'src/tools/checks/checks.ts', 'src/tools/checks/scoring.ts', 'src/tools/checks/hold.ts', 'src/tools/checks/figures.ts',
  'src/tools/checks/says.ts', 'src/tools/checks/store.ts', 'src/tools/checks/start.ts', 'src/tools/checks/owed.ts', 'src/tools/checks/registry.ts',
  'src/tools/checks/LogScreen.tsx', 'src/tools/checks/LogsScreens.tsx', 'src/tools/checks/RoundParts.tsx', 'src/tools/checks/HistoryPanel.tsx',
  'src/tools/checks/ChecksEditor.tsx', 'src/tools/checks/checksPaper.ts',
];

/** The shape's unit tests (every definition's examples run through them). */
export const LOG_TESTS: string[] = ['src/tools/checks/__tests__/checks.test.ts', 'src/tools/checks/__tests__/figures.test.ts', 'src/tools/checks/__tests__/defs.test.ts'];

/** The acceptance script that drives every definition (CLAUDE.md, the gate). */
export const LOG_ACCEPTANCE = 'log-shape.mjs';

/** The built block of the entry for the log whose definition is `defs/<key>.ts`; it opens at /log/<key>. */
export const logBuilt = (key: string): Built => ({
  where: [`/log/${key}`],
  code: [`src/tools/checks/defs/${key}.ts`, ...LOG_CODE],
  tests: LOG_TESTS,
  acceptance: [LOG_ACCEPTANCE],
});
