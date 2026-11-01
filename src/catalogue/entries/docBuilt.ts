/* WHAT EVERY DOCUMENT SHARES, named once for the entries that are built on it (knowledge/specs/FC-240-documents.md).
 * An individual document's entry adds its own definition file (src/tools/doc/defs/<key>.ts), its arithmetic if it has some of its own,
 * its spec, and `where: ['/doc/<key>']`; it has NO app face — the hub (FC-240) is the one app tool that lists them all. */
import type { Built } from '../types';

export const DOC_CODE = [
  'src/tools/doc/types.ts', 'src/tools/doc/doc.ts', 'src/tools/doc/registry.ts', 'src/tools/doc/context.ts',
  'src/tools/doc/DocScreen.tsx', 'src/tools/doc/DocForm.tsx', 'src/tools/doc/DocView.tsx', 'src/lib/report/docPaper.ts',
];
export const DOC_TESTS = ['src/tools/doc/__tests__/doc.test.ts'];
export const DOC_ACCEPTANCE = 'doc-shape.mjs';

/** A document's built block: its definition, its own arithmetic and tests, and the shape's code, tests and acceptance script. */
export const docBuilt = (key: string, own: { code?: string[]; tests?: string[] } = {}): Built => ({
  where: [`/doc/${key}`],
  code: [`src/tools/doc/defs/${key}.ts`, ...(own.code ?? []), ...DOC_CODE],
  tests: [...DOC_TESTS, ...(own.tests ?? [])],
  acceptance: [DOC_ACCEPTANCE],
});
