#!/usr/bin/env node
/* THE CATALOGUE FROM THE COMMAND LINE (knowledge/README.md) — how a session
 * (or a person) resolves "Build FC-012", finds a tool by the floor's words, and
 * keeps knowledge/SUMMARY.md true.
 *
 *   node scripts/catalogue.mjs show FC-012          the entry, its knowledge records, its code, its spec
 *   node scripts/catalogue.mjs show "SMED"           by name — lists the candidates when more than one matches
 *   node scripts/catalogue.mjs search too many rejects   problem routes and entries, best first
 *   node scripts/catalogue.mjs next 3                the next three in the backlog not yet available
 *   node scripts/catalogue.mjs method spc.capability-measured   one knowledge record
 *   node scripts/catalogue.mjs summary [--write]     the summary, or knowledge/SUMMARY.md rewritten
 *   node scripts/catalogue.mjs check                 the catalogue's and the library's tests
 *
 * It reads src/catalogue/ itself (bundled on the fly by esbuild, which ships
 * with Vite), so the command line and the app never disagree. */
import { build } from 'esbuild';
import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

async function load() {
  const out = await build({
    stdin: {
      contents: "export * from './src/catalogue/index.ts'; export * from './src/catalogue/types.ts'; export { parseMethod } from './src/catalogue/methodRecord.ts';",
      resolveDir: ROOT, loader: 'ts', sourcefile: 'catalogue-cli.ts',
    },
    bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'silent',
  });
  return import(`data:text/javascript;base64,${Buffer.from(out.outputFiles[0].text).toString('base64')}`);
}

const mdFiles = dir => readdirSync(dir).flatMap(f => { const p = join(dir, f); return statSync(p).isDirectory() ? mdFiles(p) : f.endsWith('.md') ? [p] : []; });

function methodsOf(c) {
  return mdFiles(join(ROOT, 'knowledge/methods')).map(p => ({ path: relative(ROOT, p), ...c.parseMethod(readFileSync(p, 'utf8')) })).filter(x => x.record);
}

function printEntry(c, e, methods) {
  const line = (k, v) => v && (Array.isArray(v) ? v.length : true) && console.log(`${k.padEnd(13)} ${Array.isArray(v) ? v.join('\n' + ' '.repeat(14)) : v}`);
  console.log(`\n${e.id}  ${e.name}`);
  console.log('-'.repeat(Math.min(100, e.id.length + e.name.length + 2)));
  line('Status', `${c.STATUS_WORDS[e.status]} (${e.status}) · ${c.FORM_WORDS[e.form]}${e.partOf ? ` of ${e.partOf} ${c.entryById(e.partOf)?.name ?? ''}` : ''}`);
  line('Discipline', `${c.disciplineName(e.discipline)} — ${c.subName(e.discipline, e.sub)}`);
  line('Problem', e.problem);
  line('Questions', e.questions);
  line('Method', e.method);
  line('Inputs', e.inputs);
  line('Outputs', e.outputs);
  line('In food', e.food);
  line('Value', `${e.value} — ${e.valueWhy}`);
  line('Complexity', e.complexity);
  line('Depends on', e.depends.map(id => `${id} ${c.entryById(id)?.name ?? '?'} (${c.STATUS_WORDS[c.entryById(id)?.status] ?? '?'})`));
  const kids = c.ENTRIES.filter(x => x.partOf === e.id);
  line('Its modes', kids.map(k => `${k.id} ${k.name} (${c.STATUS_WORDS[k.status]})`));
  line('Knowledge', e.methods.map(id => { const m = methods.find(x => x.record.id === id); return m ? `${m.path}  (${m.record.depth}, ${m.record.evidence})` : `${id} — MISSING`; }));
  line('Spec', e.spec);
  if (e.built) {
    line('Opens at', e.built.where);
    line('Code', e.built.code);
    line('Unit tests', e.built.tests);
    line('Acceptance', e.built.acceptance.map(a => `scripts/acceptance/${a}`));
  }
  line('Limits', e.limits);
  line('Decided', e.decided);
  const routes = c.PROBLEMS.filter(p => p.steps.some(s => s.ids.includes(e.id)));
  line('In problems', routes.map(p => `${p.id}: ${p.title}`));
  const back = c.BACKLOG.findIndex(b => b.id === e.id);
  if (back >= 0) line('Backlog', `#${back + 1} — ${c.BACKLOG[back].why}`);
  console.log('');
}

const [cmd = 'help', ...rest] = process.argv.slice(2);
const c = await load();
const methods = methodsOf(c);

if (cmd === 'show') {
  const q = rest.join(' ').trim();
  const byId = c.entryById(/^fc-?\d+$/i.test(q) ? `FC-${q.replace(/\D/g, '').padStart(3, '0')}` : q);
  if (byId) printEntry(c, byId, methods);
  else {
    const exact = c.ENTRIES.filter(e => e.name.toLowerCase().includes(q.toLowerCase()));
    const hits = exact.length ? exact : c.searchEntries(q).slice(0, 8);
    if (hits.length === 1) printEntry(c, hits[0], methods);
    else if (!hits.length) { console.log(`Nothing in the catalogue matches "${q}". Try: node scripts/catalogue.mjs search ${q}`); process.exitCode = 1; }
    else {
      console.log(`"${q}" matches ${hits.length} entries — say which one:`);
      for (const e of hits) console.log(`  ${e.id}  ${c.STATUS_WORDS[e.status].padEnd(20)} ${e.name}`);
      process.exitCode = 2;
    }
  }
} else if (cmd === 'search') {
  const q = rest.join(' ');
  const ps = c.searchProblems(q).slice(0, 3);
  if (ps.length) {
    console.log('\nProblems that match:');
    for (const p of ps) {
      console.log(`\n  ${p.title}`);
      for (const s of p.steps) console.log(`    · ${s.ask}  →  ${s.ids.map(id => `${id} (${c.STATUS_WORDS[c.entryById(id)?.status]})`).join(', ')}${s.when ? `\n        ${s.when}` : ''}`);
    }
  }
  console.log('\nEntries, best first:');
  for (const e of c.searchEntries(q).slice(0, 15)) console.log(`  ${e.id}  ${c.STATUS_WORDS[e.status].padEnd(20)} ${e.name}`);
  console.log('');
} else if (cmd === 'next') {
  const n = Number(rest[0] ?? 3) || 3;
  const items = c.BACKLOG.filter(b => c.entryById(b.id)?.status !== 'available').slice(0, n);
  for (const [i, b] of items.entries()) { const e = c.entryById(b.id); console.log(`${i + 1}. ${b.id}  ${e.name}  (${c.STATUS_WORDS[e.status]}) — ${b.why}`); }
} else if (cmd === 'method') {
  /* the full id, or the name after the discipline ("value-stream-mapping"),
     or a word in the id or the name — several found: say them, exit 2 */
  const q = (rest[0] ?? '').toLowerCase();
  const exact = methods.filter(x => x.record.id === q);
  const tail = exact.length ? exact : methods.filter(x => x.record.id.split('.').slice(1).join('.') === q);
  const found = tail.length ? tail : methods.filter(x => x.record.id.includes(q) || x.record.name.toLowerCase().includes(q));
  if (!q || !found.length) { console.log(`No record ${rest[0] ?? ''}. Ids look like lean.value-stream-mapping — try: node scripts/catalogue.mjs search <words>.`); process.exitCode = 1; }
  else if (found.length > 1) { console.log(`${found.length} records match "${rest[0]}" — say which:\n${found.map(x => `  ${x.record.id}  ${x.record.name}`).join('\n')}`); process.exitCode = 2; }
  else console.log(readFileSync(join(ROOT, found[0].path), 'utf8'));
} else if (cmd === 'summary') {
  const md = c.summaryMarkdown(methods.length);
  if (rest.includes('--write')) { writeFileSync(join(ROOT, 'knowledge/SUMMARY.md'), md); console.log('knowledge/SUMMARY.md written.'); }
  else console.log(md);
} else if (cmd === 'check') {
  const r = spawnSync('npx', ['vitest', 'run', 'src/catalogue', '--exclude', '.claude/**', '--exclude', 'node_modules/**'], { cwd: ROOT, stdio: 'inherit' });
  process.exitCode = r.status ?? 1;
} else {
  console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 18).join('\n').replace(/^ \*/gm, ''));
  if (!existsSync(join(ROOT, 'knowledge/SUMMARY.md'))) console.log('\n(knowledge/SUMMARY.md not written yet: node scripts/catalogue.mjs summary --write)');
}
