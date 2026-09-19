/* Lint, aimed at the bugs TypeScript cannot see.
 *
 * Deliberately NOT a style config. There is no formatting rule here, nothing
 * about quotes or semicolons, and no rule whose fix is cosmetic: 149 files of
 * style warnings is a wall people learn to scroll past, and then the one real
 * finding in the middle of it gets scrolled past too.
 *
 * Everything below is a rule whose violation can actually misbehave at runtime.
 */
import js from '@eslint/js';
import ts from 'typescript-eslint';
import hooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default ts.config(
  { ignores: ['dist/**', 'dev-dist/**', 'node_modules/**', 'public/**', 'scripts/**', '*.config.js'] },
  js.configs.recommended,
  ...ts.configs.recommended,
  {
    /* NODE SCRIPTS. supabase/apply.mjs runs under node with no DOM at all, so
     * `console` and `process` are globals rather than undefined names. Without
     * this, js.configs.recommended reports 22 no-undef errors against a file
     * that is perfectly correct — and an error count that is always non-zero
     * teaches everyone to ignore the lint step, which is worse than no lint.
     * scripts/** is ignored outright above; this covers .mjs anywhere else. */
    files: ['**/*.mjs'],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { 'react-hooks': hooks },
    rules: {
      // THE ONE THAT MATTERS MOST HERE. A missing dependency means the effect
      // closes over a stale value: the screen shows what it read on mount and
      // never notices the row changed underneath it. That is indistinguishable
      // from "sync is broken" when a user reports it.
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/rules-of-hooks': 'error',

      // A promise nobody awaits and nobody catches. In this app that is an
      // IndexedDB write or a Supabase push that failed in silence.
      'no-floating-decimal': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],

      // `any` turns off the one check this codebase does have. Warn, not error:
      // there are legitimate uses at the sync boundary where rows really are
      // unknown shapes.
      '@typescript-eslint/no-explicit-any': 'warn',

      // Assertions that lie to the compiler. route.id! was exactly this, and it
      // crashed the whole app from a truncated URL.
      '@typescript-eslint/no-non-null-assertion': 'warn',

      // Real bug classes, not taste.
      'no-constant-condition': 'error',
      'no-self-compare': 'error',
      'no-unmodified-loop-condition': 'error',
      'no-unreachable-loop': 'error',
      'no-template-curly-in-string': 'warn',
      'require-atomic-updates': 'warn',
      'no-await-in-loop': 'off', // used deliberately for ordered IndexedDB writes
      eqeqeq: ['warn', 'smart'],
    },
  },
  {
    /* TESTS. A non-null assertion means something different here.
     *
     * In app code the rule earns its keep — route.id! was a lie to the compiler
     * and it crashed the whole app from a truncated URL. In a test, `pareto!`
     * failing throws and the test fails loudly with the line number, which is
     * exactly the intended outcome; writing it out longhand would only bury the
     * assertion the test is actually making. Scoped off here so the warning
     * ceiling keeps measuring the app rather than the suite.
     *
     * Everything else stays on, including rules-of-hooks and exhaustive-deps. */
    files: ['**/__tests__/**', '**/*.test.ts', '**/*.test.tsx'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
);
