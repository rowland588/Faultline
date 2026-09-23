/* THE TRIAL CARD — one day on the line, whole, on a page you can send.
 *
 * Rowland: "A client report usually consists of an overview — what's happened
 * today. Is this possibly like a trial card? Another PDF report that I can send
 * out to show all the finite detail, because there's a lot of detail that you
 * pick up. And then what happens is, we take out the fundamentals, the things
 * that are important, and present that on the client report."
 *
 * That is the split, and it is the right one. TWO DOCUMENTS, TWO ROOMS:
 *
 *   THE TRIAL CARD   one trial, everything. Sent to the people who were there,
 *                    or should have been: the OEM, the engineers, the shift.
 *                    It has to stand on its own with nobody to explain it.
 *   THE CLIENT REPORT    the whole job, and out of each trial only the four lines a
 *                    client acts on — the expectation, what happened against it,
 *                    what it turned up, and what happens next.
 *
 * A4 LANDSCAPE, not A3. The client report is A3 because it is read on a table with
 * people standing round it. This is read on a phone in a car park and forwarded
 * from there, and A3 on a phone is a document nobody opens twice.
 *
 * IT PAGINATES RATHER THAN TRUNCATES. A day that turned up twenty observations
 * is exactly the day somebody needs all twenty of; "+14 more than fit this
 * sheet" on the document whose entire job is the detail would be absurd.
 */
import {
  ACCENT, BRAND, DANGER, INK, INK2, LINE, MUTED, OK, WARN,
  fit, san, setFont, wash, type Doc,
} from './reportKit';
import type { TrialCard } from './trialCard';
import { foundWords, WORDS } from './testing';

const M = 30;                       // the margin, A4 landscape
const nice = (iso?: string): string => {
  if (!iso) return '';
  const t = Date.parse(iso);
  return Number.isFinite(t)
    ? new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : iso;
};

/** "5 Jan" or "5 – 9 Jan". A window prints as a window on the page the client
 *  reads, because "planned for 5 Jan" on a job booked for that whole week is
 *  the sort of small wrongness that gets argued about in a meeting. */
const span = (from?: string, to?: string): string => {
  if (!from) return '';
  if (!to || to <= from) return nice(from);
  return `${nice(from)} \u2013 ${nice(to)}`;
};

const toneOf = (o: TrialCard['outcome']): string =>
  o === 'passed' ? OK : o === 'failed' ? DANGER : o === 'notRun' ? WARN : BRAND;

export interface TrialCardMeta {
  project: string;
  /** Who it is from, printed under the mark. */
  lead?: string;
  builtAt: number;
}

/* ---------- the pieces ---------- */

/** The band across the top of every page. Carries the trial's name on page one
 *  and a continuation line after that, because a second sheet that does not say
 *  what it belongs to gets separated from the first one within a day. */
function head(d: Doc, c: TrialCard, meta: TrialCardMeta, page: number): number {
  const W = d.internal.pageSize.getWidth();
  d.setFillColor(INK);
  d.rect(0, 0, W, page === 1 ? 74 : 44, 'F');

  setFont(d, 7, 'bold', '#9fc3b4');
  d.text(`${WORDS[c.kind].one.toUpperCase()} CARD`, M, 20);
  setFont(d, 7, 'normal', '#8fae9f');
  d.text(fit(d, san(meta.project), W / 2), M + 58, 20);

  setFont(d, 6.5, 'normal', '#7f9b8d');
  d.text(`Built ${new Date(meta.builtAt).toLocaleString('en-GB')}`, W - M, 20, { align: 'right' });

  if (page === 1) {
    setFont(d, 16, 'bold', '#ffffff');
    d.text(fit(d, san(c.title), W - 2 * M - 150), M, 44);

    const line = [c.machine, c.withWhom && `with ${c.withWhom}`, nice(c.ranOn ?? c.plannedFor)]
      .filter(Boolean).join('  ·  ');
    setFont(d, 8.5, 'normal', '#9fc3b4');
    d.text(fit(d, san(line), W - 2 * M - 150), M, 60);

    /* The verdict, as a pill, top right — the one thing somebody looks for
       before they read a word of it. */
    const word = c.outcomeWord.toUpperCase();
    setFont(d, 9, 'bold', '#ffffff');
    const tw = d.getTextWidth(word);
    d.setFillColor(toneOf(c.outcome));
    d.roundedRect(W - M - tw - 26, 34, tw + 26, 22, 11, 11, 'F');
    d.text(word, W - M - 13, 48.5, { align: 'right' });
    return 74;
  }

  setFont(d, 9, 'bold', '#ffffff');
  d.text(fit(d, `${san(c.title)} — continued`, W - 2 * M), M, 32);
  return 44;
}

function foot(d: Doc, page: number, pages: number, meta: TrialCardMeta): void {
  const W = d.internal.pageSize.getWidth(), H = d.internal.pageSize.getHeight();
  setFont(d, 6.5, 'normal', MUTED);
  d.text(san(meta.lead ? `${meta.project} · ${meta.lead}` : meta.project), M, H - 14);
  d.text(`${page} of ${pages}`, W - M, H - 14, { align: 'right' });
}

/** A labelled block of prose. Returns the y it finished at, so the caller can
 *  stack them without arithmetic of its own. */
function field(d: Doc, x: number, y: number, w: number, label: string, text: string, opts: {
  colour?: string; size?: number; empty?: string;
} = {}): number {
  setFont(d, 6.5, 'bold', MUTED);
  d.text(label.toUpperCase(), x, y);
  const body = san(text).trim();
  const size = opts.size ?? 9.5;
  setFont(d, size, body ? 'normal' : 'normal', body ? (opts.colour ?? INK) : MUTED);
  const lines = d.splitTextToSize(body || (opts.empty ?? '—'), w) as string[];
  lines.slice(0, 6).forEach((l, i) => d.text(l, x, y + 12 + i * (size + 2.5)));
  return y + 12 + Math.min(lines.length, 6) * (size + 2.5);
}

/** A bordered box with a heading — the card's own section frame. */
function box(d: Doc, x: number, y: number, w: number, h: number, n: string, title: string, sub?: string): number {
  d.setDrawColor(LINE); d.setLineWidth(0.7);
  d.setFillColor('#ffffff');
  d.roundedRect(x, y, w, h, 5, 5, 'FD');

  d.setFillColor(INK);
  d.circle(x + 17, y + 15, 7, 'F');
  setFont(d, 7, 'bold', '#ffffff');
  d.text(n, x + 17, y + 17.5, { align: 'center' });

  setFont(d, 10, 'bold', INK);
  const shown = fit(d, title, w - 34 - 12);
  d.text(shown, x + 29, y + 18.5);
  if (sub) {
    const end = x + 29 + d.getTextWidth(shown) + 10;
    const room = (x + w - 12) - end;
    if (room > 40) {
      setFont(d, 7.5, 'normal', MUTED);
      d.text(fit(d, sub, room), x + w - 12, y + 18, { align: 'right' });
    }
  }
  d.setDrawColor(LINE); d.setLineWidth(0.5);
  d.line(x + 10, y + 25, x + w - 10, y + 25);
  return y + 25;
}

/* ---------- the pages ---------- */

/** THE LOOP, on one strip: what this followed, and what came out of it. The
 *  thing that was missing — "not any sort of loop, to show the structure". */
function loopStrip(d: Doc, c: TrialCard, x: number, y: number, w: number): number {
  if (!c.follows && c.ledTo.length === 0) return y;
  const h = 26;
  d.setFillColor(...wash(BRAND, 0.07));
  d.roundedRect(x, y, w, h, 5, 5, 'F');

  setFont(d, 6.5, 'bold', ACCENT);
  d.text('WHERE THIS SITS', x + 12, y + 11);

  const bits: string[] = [];
  if (c.follows) bits.push(`follows "${san(c.follows)}"`);
  if (c.ledTo.length) bits.push(`led to ${c.ledTo.map(t => `"${san(t)}"`).join(', ')}`);
  setFont(d, 8.5, 'normal', INK2);
  d.text(fit(d, bits.join('   ·   '), w - 24), x + 12, y + 21);
  return y + h + 10;
}

/* ---------- how tall a block WANTS to be ----------
 *
 * "I think we could be a bit smarter with size, but I'm unsure."
 *
 * The first version gave every box the rest of the page, so a trial with three
 * observations printed a full sheet of white under them and pushed what we do
 * next onto a page of its own. Both blocks now measure themselves first and
 * take only the room they need, which is also why they usually share one page:
 * a one-page card gets read on a phone, a two-page one gets scrolled past.
 *
 * splitTextToSize is pure, so measuring costs nothing and cannot disagree with
 * the drawing — both ask the same question of the same document. */

function findingHeights(d: Doc, c: TrialCard, w: number): number[] {
  setFont(d, 8.5, 'normal', INK);
  return c.findings.map(f => {
    const lines = d.splitTextToSize(san(f.what), 0.44 * w - 10) as string[];
    return Math.max(18, 8 + Math.min(lines.length, 3) * 11);
  });
}

function nextHeights(d: Doc, c: TrialCard, w: number): number[] {
  setFont(d, 8.5, 'bold', INK);
  return c.next.map(n => {
    const lines = d.splitTextToSize(san(n.what), 0.5 * w - 10) as string[];
    return Math.max(17, 6 + Math.min(lines.length, 2) * 11);
  });
}

/** Head, rule, rows and a little air. `rows` is the heights of what will go in. */
const blockHeight = (rows: number[], empty: boolean): number =>
  25 + 15 + (empty ? 22 : rows.reduce((a, b) => a + b, 0)) + 12;

/** What we found: one row per observation, with what somebody decided about it.
 *  Returns how many it drew, so the caller knows whether to start a new page. */
function findingsTable(d: Doc, c: TrialCard, x: number, y: number, w: number, maxY: number, from: number): number {
  const cols = [0.44, 0.13, 0.15, 0.28];
  const at = (i: number) => x + cols.slice(0, i).reduce((a, b) => a + b, 0) * w;
  const HEADS = ['WHAT WE SAW', 'WHOSE', 'DECIDED', 'THE ACTION IT BECAME'];

  setFont(d, 6.5, 'bold', MUTED);
  HEADS.forEach((h, i) => d.text(h, at(i), y + 11));
  d.setDrawColor(LINE); d.setLineWidth(0.6);
  d.line(x, y + 15, x + w, y + 15);

  let cy = y + 15, drawn = 0;
  for (let i = from; i < c.findings.length; i++) {
    const f = c.findings[i];
    /* Measure before committing: a long observation wraps, and a row that would
       run off the bottom belongs on the next sheet whole, not half. */
    setFont(d, 8.5, 'normal', INK);
    const lines = d.splitTextToSize(san(f.what), cols[0] * w - 10) as string[];
    const rowH = Math.max(18, 8 + lines.length * 11);
    if (cy + rowH > maxY) break;

    if (drawn % 2 === 1) { d.setFillColor('#faf9f5'); d.rect(x - 4, cy + 2, w + 8, rowH, 'F'); }

    lines.slice(0, 3).forEach((l, k) => d.text(l, at(0), cy + 13 + k * 11));

    setFont(d, 8, 'normal', INK2);
    d.text(fit(d, san(f.owner ?? '—'), cols[1] * w - 10), at(1), cy + 13);

    const tone = f.decision === 'actioned' ? BLUE_DECIDED : f.decision === 'no action needed' ? MUTED : WARN;
    setFont(d, 8, 'bold', tone);
    d.text(fit(d, f.decision, cols[2] * w - 10), at(2), cy + 13);

    setFont(d, 8, 'normal', f.action ? INK2 : MUTED);
    d.text(fit(d, san(f.action ?? '—'), cols[3] * w - 10), at(3), cy + 13);

    if (f.photos) {
      setFont(d, 6.5, 'normal', MUTED);
      d.text(`${f.photos} filmed`, at(1), cy + 22);
    }

    cy += rowH;
    d.setDrawColor('#efede6'); d.setLineWidth(0.4);
    d.line(x, cy + 1, x + w, cy + 1);
    drawn++;
  }
  return drawn;
}

/* The decided-blue is the app's "planned/in progress" slate. Named here so the
   table reads without a colour lookup in the middle of it. */
const BLUE_DECIDED = '#2b4e7e';

function nextTable(d: Doc, c: TrialCard, x: number, y: number, w: number, maxY: number): number {
  const cols = [0.5, 0.15, 0.15, 0.2];
  const at = (i: number) => x + cols.slice(0, i).reduce((a, b) => a + b, 0) * w;
  ['WHAT WE DO NEXT', 'WHOSE', 'BY WHEN', 'WHERE IT CAME FROM']
    .forEach((h, i) => { setFont(d, 6.5, 'bold', MUTED); d.text(h, at(i), y + 11); });
  d.setDrawColor(LINE); d.setLineWidth(0.6);
  d.line(x, y + 15, x + w, y + 15);

  let cy = y + 15, drawn = 0;
  for (const n of c.next) {
    setFont(d, 8.5, n.done ? 'normal' : 'bold', n.done ? MUTED : INK);
    const lines = d.splitTextToSize(san(n.what), cols[0] * w - 10) as string[];
    const rowH = Math.max(17, 6 + lines.length * 11);
    if (cy + rowH > maxY) break;

    lines.slice(0, 2).forEach((l, k) => d.text(l, at(0), cy + 13 + k * 11));
    setFont(d, 8, 'normal', n.owner ? INK2 : DANGER);
    d.text(fit(d, san(n.owner ?? 'nobody yet'), cols[1] * w - 10), at(1), cy + 13);
    setFont(d, 8, 'normal', n.due ? INK2 : MUTED);
    d.text(n.due ? nice(n.due) : '—', at(2), cy + 13);

    const from = n.becameTest ? 'became the next trial'
      : n.fromFinding ? 'an observation'
        : 'agreed on the day';
    setFont(d, 7.5, 'normal', MUTED);
    d.text(fit(d, from + (n.done ? ' · done' : ''), cols[3] * w - 10), at(3), cy + 13);

    cy += rowH;
    d.setDrawColor('#efede6'); d.setLineWidth(0.4);
    d.line(x, cy + 1, x + w, cy + 1);
    drawn++;
  }
  return drawn;
}

/* ---------- the whole card ---------- */

export function drawTrialCard(d: Doc, c: TrialCard, meta: TrialCardMeta): void {
  const W = d.internal.pageSize.getWidth(), H = d.internal.pageSize.getHeight();
  const CW = W - 2 * M;
  const bottom = H - 30;

  /* ========================= PAGE 1 — THE DAY ========================= */
  let y = head(d, c, meta, 1) + 16;

  /* The plan and the day, side by side, because the whole point of keeping them
     as two records is that somebody can see the gap between them. */
  const half = (CW - 14) / 2;
  const planTop = y;

  /* THE WORDS COME FROM lib/testing, not from here. A fix is the same record
     wearing a different vocabulary, and the screen takes its labels from the
     same table — so the page a client reads and the page they are sent cannot
     call the same field two different things. */
  const w = WORDS[c.kind];

  let by = box(d, M, y, half, 128, '1', w.plan) + 12;
  by = field(d, M + 14, by, half - 28, w.expectation, c.passesIf ?? '',
    { empty: c.kind === 'fix' ? 'The problem was not written down' : 'Nothing agreed in advance' }) + 8;
  if (c.kind === 'test') {
    field(d, M + 14, by, half - 28, 'Product we planned to run', c.plannedProduct ?? '', { size: 8.5 });
  }
  setFont(d, 7.5, 'normal', MUTED);
  d.text(`Planned for ${span(c.plannedFor, c.plannedTo) || '—'}`, M + 14, planTop + 118);

  let dy = box(d, M + half + 14, y, half, 128, '2', c.kind === 'fix' ? 'What was done' : 'What actually happened') + 12;
  dy = field(d, M + half + 28, dy, half - 28, w.happened, c.result ?? '', { empty: 'Nothing written down yet' }) + 8;
  if (c.kind === 'test') {
    field(d, M + half + 28, dy, half - 28, 'Product we ran', c.product ?? '', { size: 8.5 });
  }
  setFont(d, 7.5, 'normal', c.ranOn ? MUTED : WARN);
  d.text(c.ranOn ? `Ran ${span(c.ranOn, c.ranTo)}` : 'Not run yet', M + half + 28, planTop + 118);

  y = planTop + 128 + 12;
  y = loopStrip(d, c, M, y, CW);

  /* ==================== WHAT WE FOUND, AND WHAT WE DO NEXT ==================
   *
   * Both boxes take only the room they need. When they both fit under the plan
   * they share this page, which is the common case and the one worth
   * optimising: a one-page card gets read on a phone; a two-page one gets
   * scrolled past. */
  const fH = findingHeights(d, c, CW - 28);
  const nH = nextHeights(d, c, CW - 28);
  const room = bottom - y;

  const foundSub = foundWords(c.found);
  const nextSub = c.next.length
    ? `${c.openNext} still to do of ${c.next.length}`
    : 'nothing agreed yet';

  const wantFound = blockHeight(fH, c.findings.length === 0);
  const wantNext = blockHeight(nH, c.next.length === 0);

  /* Found gets what it wants, but never so much that What we do next is pushed
     off a page it would otherwise have fitted on. */
  const bothFit = wantFound + 12 + wantNext <= room;
  const foundH = bothFit ? wantFound : Math.min(wantFound, room);

  const fTop = box(d, M, y, CW, foundH, '3', c.kind === 'fix' ? 'What we found doing it' : 'What we found on the day', foundSub);
  let drawn = 0;
  if (c.findings.length === 0) {
    setFont(d, 8.5, 'normal', MUTED);
    d.text('Nothing was written down on this trial.', M + 14, fTop + 20);
  } else {
    drawn = findingsTable(d, c, M + 14, fTop, CW - 28, y + foundH - 10, 0);
  }

  let page = 1;
  let from = drawn;

  /* Every observation that did not fit, on sheets of its own. jsPDF cannot
     measure a page without drawing it, so each sheet is drawn for real and the
     count it returns moves the cursor. The `more === 0` guard is not defensive
     dressing: without it, an observation too tall for even an empty page would
     loop for ever. */
  while (from < c.findings.length) {
    d.addPage();
    page++;
    const top = head(d, c, meta, page) + 14;
    const h = bottom - top;
    const fT = box(d, M, top, CW, h, '3', c.kind === 'fix' ? 'What we found doing it' : 'What we found on the day',
      `continued · from ${from + 1} of ${c.findings.length}`);
    const more = findingsTable(d, c, M + 14, fT, CW - 28, top + h - 10, from);
    if (more === 0) break;
    from += more;
  }

  /* WHAT WE DO NEXT. Under the observations when there is room for all of it,
     otherwise a sheet of its own — it is the part somebody acts on and prints,
     and half of it at the foot of a page is how it stops being read. */
  let ny: number;
  let nRoom: number;
  if (bothFit && page === 1) {
    ny = y + foundH + 12;
    nRoom = wantNext;
  } else {
    d.addPage();
    page++;
    ny = head(d, c, meta, page) + 14;
    nRoom = Math.min(wantNext, bottom - ny);
  }

  const nTop = box(d, M, ny, CW, nRoom, '4', 'What we do next', nextSub);
  if (c.next.length === 0) {
    setFont(d, 8.5, 'normal', MUTED);
    d.text('Nothing has been agreed out of this trial yet.', M + 14, nTop + 20);
  } else {
    nextTable(d, c, M + 14, nTop, CW - 28, ny + nRoom - 10);
  }

  /* Page numbers last: "1 of 3" cannot be written until the third page exists. */
  for (let p = 1; p <= page; p++) {
    d.setPage(p);
    foot(d, p, page, meta);
  }
}
