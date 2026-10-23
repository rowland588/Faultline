/* PAPER PARITY — every paper says what it said before the slice (docs/STRUCTURE.md §17, B0).
 *
 * The structure's slices change how a paper is reached (Report ▾ in place of nineteen labels),
 * never what it says. So every PDF scripts/report-stress.mjs downloads from its real button is
 * read back as text on what is live and on the change, and the two compared: a paper missing from
 * the change is a paper lost; a paper whose words differ, but for the day and the time it was
 * made, is a paper changed — both fail.
 *
 *     SMOKE_BASE=<live server> node scripts/report-stress.mjs OLD --repeatable   (on what is live)
 *     node scripts/report-stress.mjs NEW --repeatable                            (on the change)
 *
 * --repeatable gives both runs the same record ids, so rows that sort equal fall the same way.
 *     node scripts/paper-parity.mjs OLD NEW
 *
 * A slice that means to change a paper's words says so in its commit and lists the paper in
 * MEANT below with the reason; it is printed, never silently passed. */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const [OLD, NEW] = process.argv.slice(2);
if (!OLD || !NEW) { console.error('node scripts/paper-parity.mjs OLD NEW'); process.exit(2); }

/** A paper whose words a slice changed on purpose: its file name, and why. */
const MEANT = {};

const MONTHS = 'Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|June|July|August|September|October|November|December';
/** The words of a paper, the day and the time it was made taken out. */
export function wordsOf(pdf) {
  return execFileSync('pdftotext', ['-raw', pdf, '-'], { encoding: 'utf8', maxBuffer: 64 << 20, stdio: ['ignore', 'pipe', 'ignore'] })
    .replace(/\b\d{4}-\d{2}-\d{2}(T[\d:.]+Z?)?\b/g, '<day>')
    .replace(new RegExp(`\\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*,? `, 'g'), '')
    .replace(new RegExp(`\\b\\d{1,2} (${MONTHS})( \\d{4})?\\b`, 'g'), '<day>')
    .replace(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g, '<day>')
    .replace(/\b\d{1,2}:\d{2}(:\d{2})?\b/g, '<time>')
    .replace(/[ \t]+/g, ' ').split('\n').map(l => l.trim()).filter(Boolean);
}

/** the lines of a that b does not hold as many times */
function minus(a, b) {
  const left = new Map();
  for (const l of b) left.set(l, (left.get(l) ?? 0) + 1);
  return a.filter(l => { const n = left.get(l) ?? 0; if (n) { left.set(l, n - 1); return false; } return true; });
}
const pdfs = dir => readdirSync(dir, { recursive: true }).map(String).filter(f => f.endsWith('.pdf')).sort();
let lost = 0, changed = 0, same = 0;
for (const f of pdfs(OLD)) {
  const b = join(NEW, f);
  if (!existsSync(b)) { lost++; console.log(`✗ LOST     ${f} — on what is live, not on the change`); continue; }
  /* the lines as a count each, not in order: the seeds make fresh ids every run, so two rows that
     sort equal (a stage and a fix due the same day) swap places from run to run on the same build —
     what is checked is that every line the paper said, it still says, and nothing new */
  const gone = minus(wordsOf(join(OLD, f)), wordsOf(b)), come = minus(wordsOf(b), wordsOf(join(OLD, f)));
  if (!gone.length && !come.length) { same++; continue; }
  if (MEANT[f]) { console.log(`~ MEANT    ${f} — ${MEANT[f]}`); continue; }
  changed++;
  console.log(`✗ CHANGED  ${f} — ${gone.length} line${gone.length === 1 ? '' : 's'} gone, ${come.length} new${gone[0] ? `; gone: "${gone[0]}"` : ''}${come[0] ? `; new: "${come[0]}"` : ''}`);
}
const added = pdfs(NEW).filter(f => !existsSync(join(OLD, f)));
for (const f of added) console.log(`+ NEW      ${f}`);
console.log(`\n${same} the same · ${changed} changed · ${lost} lost · ${added.length} new`);
console.log(lost || changed ? 'Paper parity NOT kept.' : 'Paper parity kept: every paper says what it said.');
process.exit(lost || changed ? 1 : 0);
