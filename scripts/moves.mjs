/* MOVE FILES, KEEP EVERY IMPORT TRUE — docs/STEADY.md S3 ("one place per thing in the code"):
 * moves only, never a change of behaviour. Given FROM→TO pairs (paths under the repo), it git-mvs
 * each file and rewrites every import that pointed at it — static and dynamic, in src/ (relative
 * specifiers, resolved against the importing file's own directory, old or new) and in scripts/
 * (the dev server's '/src/…' form) — and the moved files' own relative imports from where they
 * now stand. Then: tsc, the unit tests and the gate prove nothing changed.
 *
 *   node scripts/moves.mjs src/lib/journey.ts=src/project/journey/journey.ts [more=pairs] */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const ROOT = resolve(new URL('..', import.meta.url).pathname);
const pairs = process.argv.slice(2).map(a => a.split('=')).filter(x => x.length === 2);
if (!pairs.length) { console.error('node scripts/moves.mjs from=to …'); process.exit(2); }
const moved = new Map(pairs.map(([f, t]) => [resolve(ROOT, f), resolve(ROOT, t)]));
const strip = p => p.replace(/\.(tsx?|mjs)$/, '');
const movedBare = new Map([...moved].map(([f, t]) => [strip(f), strip(t)]));

/** every source file that may import — src and scripts */
const files = execFileSync('git', ['ls-files', 'src', 'scripts'], { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(f => /\.(tsx?|mjs)$/.test(f)).map(f => resolve(ROOT, f));
const exists = p => ['', '.ts', '.tsx', '/index.ts', '/index.tsx'].some(x => existsSync(p + x) && !existsSync(p + x + '/'));
const newPathOf = p => moved.get(p) ?? p;

let changed = 0;
for (const file of files) {
  const text = readFileSync(file, 'utf8');
  const oldDir = dirname(file), newDir = dirname(newPathOf(file));
  const out = text.replace(/(from\s+|import\s*\(\s*|import\s+)(['"])([^'"]+)\2/g, (whole, lead, q, spec) => {
    let target, form;
    if (spec.startsWith('/src/')) { target = resolve(ROOT, spec.slice(1)); form = 'abs'; }
    else if (spec.startsWith('.')) { target = resolve(oldDir, spec); form = 'rel'; }
    else return whole;
    const bare = strip(target);
    const hit = movedBare.get(bare) ?? (moved.get(target) ? strip(moved.get(target)) : undefined);
    const dest = hit ?? bare;                              // where the target now lives (bare)
    if (!hit && oldDir === newDir) return whole;          // nothing moved, importer not moved
    if (!hit && !exists(bare)) return whole;              // not a file we know (a package path)
    let next;
    if (form === 'abs') next = '/' + relative(ROOT, dest) + (spec.match(/\.(tsx?)$/)?.[0] ?? '');
    else { next = relative(newDir, dest).replace(/\\/g, '/'); if (!next.startsWith('.')) next = './' + next; }
    if (next === spec) return whole;
    return `${lead}${q}${next}${q}`;
  });
  if (out !== text) { writeFileSync(file, out); changed++; }
}
for (const [f, t] of moved) { mkdirSync(dirname(t), { recursive: true }); execFileSync('git', ['mv', f, t], { cwd: ROOT }); }
console.log(`${moved.size} moved, ${changed} files' imports rewritten`);
