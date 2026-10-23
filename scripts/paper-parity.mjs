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
const MEANT = {
  /* pass or fail by a confidence level or an allowed loss (FC-100, 23 October: "we also want to be adding confidence as part of our
     language"): "that proves fewer than 32 in 100 would fail (95% sure)" is said "we can be 95% confident fewer than 32 in 100 would fail" */
  'ordinary-client.pdf': 'pass or fail said with its confidence (FC-100, 23 October); This week and next (docs/JOURNEY.md J3)',
  'ordinary-commissioning.pdf': 'pass or fail said with its confidence (FC-100, 23 October)',
  /* THIS WEEK AND NEXT (docs/JOURNEY.md, J3): one line — done · still to do (late) · planned — on the stage-gate status and
     client reports and the 6M status and client reports, the line the project's front page says (lib/journey weekLine) */
  'tiny-status.pdf': 'This week and next (docs/JOURNEY.md J3)', 'tiny-client.pdf': 'This week and next (docs/JOURNEY.md J3)',
  'ordinary-status.pdf': 'This week and next (docs/JOURNEY.md J3)',
  'huge-status.pdf': 'This week and next (docs/JOURNEY.md J3)', 'huge-client.pdf': 'This week and next (docs/JOURNEY.md J3)',
  '6m-tiny-client.pdf': 'This week and next (docs/JOURNEY.md J3)', '6m-tiny-client-status.pdf': 'This week and next (docs/JOURNEY.md J3)',
  '6m-tiny-line.pdf': 'This week and next (docs/JOURNEY.md J3)', '6m-tiny-line-status.pdf': 'This week and next (docs/JOURNEY.md J3)',
  '6m-huge-client.pdf': 'This week and next (docs/JOURNEY.md J3)', '6m-huge-client-status.pdf': 'This week and next (docs/JOURNEY.md J3)',
  '6m-huge-line.pdf': 'This week and next (docs/JOURNEY.md J3)', '6m-huge-line-status.pdf': 'This week and next (docs/JOURNEY.md J3)',
  'ordinary-day.pdf': 'pass or fail said with its confidence (FC-100, 23 October)',
  'ordinary-handover.pdf': 'pass or fail said with its confidence (FC-100, 23 October)',
  'ordinary-studies-capability.pdf': 'pass or fail said with its confidence (FC-100, 23 October)',
  /* the huge job's first SMED timing made independent of the hour (src/dev/reportSeeds): the day paper's "N elements timed"
     counted across midnight before about 08:20 — the old run's count depends on when it ran */
  'huge-day.pdf': 'the seed’s SMED timing no longer moves with the clock (23 October)',
};

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
/* nothing on the live side is not parity kept — it is the live run having failed (gate 45, 23 October:
   the live server served a stale module, its run crashed, and an empty folder compared as "kept") */
if (!pdfs(OLD).length) { console.log(`✗ NOTHING on what is live to compare against (${OLD} holds no PDFs) — the live run failed; see its log.`); process.exit(1); }
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
