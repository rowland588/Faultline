/* Turning whatever landed on the clipboard into one line of work per box.
 *
 * What actually gets pasted here is a selection out of a spreadsheet, and that
 * arrives messier than "one item per line":
 *
 *  - Several COLUMNS come through tab-separated, so a row grabbed with its
 *    owner and date attached is one line containing three cells. Splitting on
 *    newlines alone put all three in one box and lost nothing but read badly.
 *  - Excel quotes any cell containing a comma, a quote or a line break, and
 *    doubles the quotes inside it. Left alone those quotes end up on screen.
 *  - A cell with a line break inside it is wrapped in quotes and spans two
 *    lines, so a naive split tears one action into two boxes.
 *  - Lists copied from a document arrive with bullets or "1." numbering.
 *
 * None of that is the person's problem to tidy up before pasting. It is this
 * function's.
 */

/** More than this in one paste is a mis-selected column, not a plan. */
const MAX_ROWS = 300;

/** Split on newlines EXCEPT those inside a quoted cell. */
function splitRows(text: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      // a doubled quote inside a quoted cell is one literal quote
      if (quoted && text[i + 1] === '"') { cur += '"'; i++; continue; }
      quoted = !quoted;
      continue;
    }
    if (!quoted && (c === '\n' || c === '\r')) {
      if (c === '\r' && text[i + 1] === '\n') i++;
      out.push(cur); cur = '';
      continue;
    }
    cur += c;
  }
  out.push(cur);
  return out;
}

/** Bullets, dashes and "1." / "1)" numbering off the front. */
const delist = (s: string) =>
  s.replace(/^[\s•·*\-–—]+/, '').replace(/^\d+[.)]\s+/, '').trim();

/** One string per box, in the order they were pasted. */
export function parsePastedRows(text: string): string[] {
  return splitRows(text)
    .map(row => {
      // several columns: keep every cell, joined, rather than picking one and
      // quietly throwing the rest away
      const cells = row.split('\t').map(c => delist(c)).filter(Boolean);
      return cells.join(' · ');
    })
    .filter(Boolean)
    .slice(0, MAX_ROWS);
}
