/* ONE NAME FOR EVERY PDF THE APP MAKES.
 *
 * A document lands in somebody's inbox on its own, so its name has to say which
 * job it is and what it is, and sort by date when there are a dozen of them.
 * Six screens each made up a name — spaces here, hyphens there, "Sept 2026" in
 * one and 2026-10-01 in another, one led with "evidence" — so the same job's
 * files did not sort together and looked like they came from different apps.
 *
 *   {Job}-{what it is}-{YYYY-MM-DD}.pdf        Line-7-pace-client-report-2026-10-01.pdf
 *
 * The job keeps its capitals; the rest is hyphenated words. Nothing that a file
 * system or an email client dislikes survives. */

const words = (s: string): string =>
  s.normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/** `what` is the kind of document, and anything that tells two of them apart
 *  (a product, a test) — "client report", "line standard Finest Red 2kg". */
export function pdfFileName(job: string, what: string, dateISO: string): string {
  const j = words(job) || 'Faultline';
  const w = words(what).toLowerCase().slice(0, 48).replace(/-+$/, '');
  return [j, w, dateISO].filter(Boolean).join('-') + '.pdf';
}
