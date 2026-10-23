/* INSTALLATION, ON PAPER — the client report's installation sheets, a row a
 * machine with its steps and one sentence (docs/STEADY.md, S4). */
import {
  INK, INK2, MUTED, LINE, BRAND, OK, WARN, DANGER, BLUE, setFont, fit, panel, type Doc
} from '../reportKit';
import type { PaceReportData } from './data';

/* ---------- INSTALLATION, machine by machine ----------
 *
 * Each machine is one row: its name and where it has got to, its steps as a
 * strip in the order they happen, and one sentence — what is done, what it is
 * waiting on and whose that is, or what stopped it. The strip is the shape of
 * the installation; the sentence is what a client repeats in the meeting.
 * Runs onto more sheets rather than dropping a machine. */
const IN_HEAD = 44, IN_ROW = 52, IN_FOOT = 22;
export function installPlan(n: number, H: number, M: number): { sheets: number; per: number } {
  const maxRows = Math.max(1, Math.floor((H - 2 * M - 14 - IN_HEAD - IN_FOOT) / IN_ROW));
  const sheets = Math.max(1, Math.ceil(n / maxRows));
  return { sheets, per: Math.ceil(n / sheets) };
}
const IN_TONE: Record<NonNullable<PaceReportData['installation']>['rows'][number]['steps'][number]['tone'], string> = {
  done: OK, problem: DANGER, asking: WARN, late: DANGER, ahead: '#edf1f1',
};

export const installHeight = (rows: number): number => IN_HEAD + rows * IN_ROW + IN_FOOT;

export function installSheet(d: Doc, data: PaceReportData, page: number, pages: number, sheet: number,
  place?: { top: number }): void {
  const ins = data.installation;
  if (!ins) return;
  const W = d.internal.pageSize.getWidth(), H = d.internal.pageSize.getHeight();
  const M = 26, CW = W - 2 * M;
  const { per } = installPlan(ins.rows.length, H, M);
  const rows = ins.rows.slice(sheet * per, (sheet + 1) * per);
  const sowhat = [
    `${ins.done} of ${ins.total} steps done`,
    `${ins.machinesIn} of ${ins.machines} machine${ins.machines === 1 ? '' : 's'} in`,
    ins.late > 0 ? `${ins.late} step${ins.late === 1 ? '' : 's'} late` : 'nothing late',
  ].join(' \u00b7 ');
  const y0 = place?.top ?? M;
  const panelH = Math.min(H - M - 14 - y0, installHeight(rows.length));
  const top = panel(d, M, y0, CW, panelH, place ? '' : String(page), sheet ? 'The machines — continued' : 'The machines — install, and every gate', sowhat);

  const x0 = M + 14, right = M + CW - 14;
  const nameW = 210, saysW = 330;
  const stripX = x0 + nameW, stripW = right - saysW - 16 - stripX;
  const saysX = right - saysW;

  setFont(d, 6.5, 'bold', MUTED);
  d.text('MACHINE', x0, top + 14);
  d.text('STEPS, IN THE ORDER THEY HAPPEN', stripX, top + 14);
  d.text('WHERE IT HAS GOT TO', saysX, top + 14);

  rows.forEach((r, i) => {
    const y = top + 24 + i * IN_ROW;
    if (i > 0) { d.setDrawColor(LINE); d.setLineWidth(0.5); d.line(x0, y - 4, right, y - 4); }
    if (r.late > 0) { d.setFillColor(DANGER); d.rect(x0 - 8, y, 2, IN_ROW - 12, 'F'); }

    setFont(d, 9.5, 'bold', INK);
    d.text(fit(d, r.machine, nameW - 12), x0, y + 11);
    setFont(d, 7, 'normal', MUTED);
    d.text(fit(d, [r.oem, r.state].filter(Boolean).join(' \u00b7 '), nameW - 12), x0, y + 21);
    /* THE FOUR GATES — Install, Set up, Commission, Hand over — as the
       Overview draws them: filled green done, blue ring under way, red ring
       late or didn't pass, amber ring a problem that lost no time (lib/install
       lateOrProblem), grey ring still ahead, pale nothing kept yet. */
    if (r.journey) {
      const pw = (nameW - 12 - 3 * 3) / 4;
      r.journey.forEach((g, k) => {
        const px = x0 + k * (pw + 3), py = y + 26;
        const red = g.tone === 'late' || g.tone === 'failed';
        const col = g.tone === 'done' ? OK : g.tone === 'going' ? BRAND : red ? DANGER : g.tone === 'problem' ? WARN : g.tone === 'ahead' ? '#c7d1d2' : '#e1e7e7';
        if (g.tone === 'done') { d.setFillColor(OK); d.roundedRect(px, py, pw, 10, 3, 3, 'F'); }
        else if (g.tone === 'none') { d.setFillColor('#f2f5f5'); d.roundedRect(px, py, pw, 10, 3, 3, 'F'); }
        else { d.setDrawColor(col); d.setLineWidth(1); d.setFillColor(red ? '#fdf2f0' : g.tone === 'problem' ? '#f7eedb' : g.tone === 'going' ? '#e3f4f6' : '#ffffff'); d.roundedRect(px + 0.5, py + 0.5, pw - 1, 9, 3, 3, 'FD'); }
        setFont(d, 5.6, 'bold', g.tone === 'done' ? '#ffffff' : g.tone === 'none' ? MUTED : col === '#c7d1d2' ? INK2 : col);
        d.text(fit(d, g.label, pw - 3), px + pw / 2, py + 6.8, { align: 'center' });
      });
    } else {
      setFont(d, 6.5, 'bold', INK2);
      d.text(fit(d, r.state.toUpperCase(), nameW - 12), x0, y + 33);
    }

    if (r.steps.length === 0) {
      setFont(d, 7.5, 'normal', MUTED);
      d.text('No install steps planned', stripX, y + 14);
    } else {
      const gap = 3;
      const segW = (stripW - gap * (r.steps.length - 1)) / r.steps.length;
      r.steps.forEach((s, k) => {
        const sx = stripX + k * (segW + gap);
        const c = IN_TONE[s.tone];
        if (s.tone === 'late') {
          d.setDrawColor(DANGER); d.setLineWidth(1.4);
          d.roundedRect(sx + 0.7, y + 4.7, segW - 1.4, 6.6, 3, 3, 'S');
        } else if (s.next && s.tone === 'ahead') {
          d.setDrawColor(BLUE); d.setLineWidth(1.4);
          d.setFillColor('#e9edf4');
          d.roundedRect(sx + 0.7, y + 4.7, segW - 1.4, 6.6, 3, 3, 'FD');
        } else {
          d.setFillColor(c);
          d.roundedRect(sx, y + 4, segW, 8, 3, 3, 'F');
        }
        const strong = s.next || s.tone === 'late' || s.tone === 'problem';
        setFont(d, 6.2, strong ? 'bold' : 'normal', strong ? INK : MUTED);
        const lines = (d.splitTextToSize(s.title, segW - 2) as string[]).slice(0, 2);
        lines.forEach((l, j) => d.text(l, sx, y + 21 + j * 7.5));
      });
    }

    setFont(d, 8, 'normal', INK);
    const said = (d.splitTextToSize(r.says, saysW) as string[]).slice(0, 4);
    said.forEach((l, j) => d.text(l, saysX, y + 11 + j * 10));
  });

  if (place) return;
  setFont(d, 7, 'normal', MUTED);
  d.text(fit(d, `${data.title} \u00b7 client report \u00b7 page ${page} of ${pages} \u2014 the machines`, CW * 0.7), M, H - M + 6);
  d.text('Steps: green done \u00b7 red ring late \u00b7 red hit a problem \u00b7 teal ring next.  Gates: green done \u00b7 teal under way \u00b7 red late.', W - M, H - M + 6, { align: 'right' });
}
