/* EVERY DOCUMENT THERE IS — found, not listed. A definition is one file in ./defs/ exporting a DocDef as default; this reads them
 * all (import.meta.glob), so adding a document is adding that file (and its spec, tests, guide and catalogue entry) and changing
 * nothing here. The unit test (__tests__/doc.test.ts) and the acceptance script (scripts/acceptance/doc-shape.mjs) loop over this
 * list, so a new definition is proved by both with no change to either. */
import type { DocDef } from './types';

const found = import.meta.glob<{ default: DocDef }>('./defs/*.ts', { eager: true });

/** The documents, by group (alphabetical) then by catalogue number. */
export const DOCS: readonly DocDef[] = Object.values(found).map(m => m.default)
  .sort((a, b) => a.group.localeCompare(b.group) || a.fc.localeCompare(b.fc));

export const docByKey = (key: string | undefined): DocDef | undefined => (key ? DOCS.find(c => c.key === key) : undefined);

/** The groups the hub shows, each with its documents, in order. */
export function docGroups(): { group: string; docs: DocDef[] }[] {
  const out: { group: string; docs: DocDef[] }[] = [];
  for (const d of DOCS) {
    const g = out.find(x => x.group === d.group);
    if (g) g.docs.push(d); else out.push({ group: d.group, docs: [d] });
  }
  return out;
}
