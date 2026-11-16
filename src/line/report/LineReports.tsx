/* A LINE'S REPORTS TAB (16 November, docs/NAV.md — Rowland: "I couldn't then get onto the correct reports and the correct page … multiple
 * doors … Customers like simple reports that they can simply look at something and understand … I want this fixed").
 *
 * A place has two reports and only two:
 *   Summary     one page for the customer — what is wrong, what it costs, what is being done, what has improved
 *   Everything  the full package — every record on the line, every problem and its card, every program and test, every machine,
 *               each tool's own paper, behind a cover (lib linePackage; untick what should not go on its own page)
 * and below them the papers already made for the line, kept in the app (lib/keptPdfs). No other door on the line leads to a line report. */
import { useState } from 'react';
import { nav } from '../../state/useRoute';
import { savingAt } from '../../lib/useSaveOnArrival';
import { SavedCopiesSheet, useKeptHere } from '../../ui/SavedCopies';

export function LineReports({ wsId, disabled, summary }: { wsId: string; disabled: boolean; summary: () => Promise<void> }) {
  const kept = useKeptHere();
  const [sheet, setSheet] = useState(false);
  const [making, setMaking] = useState(false);
  const makeSummary = async () => { setMaking(true); try { await summary(); } finally { setMaking(false); } };
  const full = `/lines/${encodeURIComponent(wsId)}/report?full=1`;
  return (
    <section className="pl-sec lrs" aria-label="Reports on this line" data-line-reports>
      <ul className="lrs-l">
        <li className="lrs-i" data-line-report="summary">
          <div className="lrs-t">
            <b>Summary</b>
            <span className="sub">One page for the customer — what is wrong, what it costs, what is being done and what has improved.</span>
          </div>
          <span className="lrs-a">
            <button type="button" className="btn btn-primary" disabled={disabled || making} onClick={() => void makeSummary()}>{making ? 'Making…' : 'Download'}</button>
          </span>
        </li>
        <li className="lrs-i" data-line-report="everything">
          <div className="lrs-t">
            <b>Everything</b>
            <span className="sub">The full package — every record on the line, every problem and its card, every program and test, every machine and each tool’s own report, behind a cover.</span>
          </div>
          <span className="lrs-a">
            <button type="button" className="btn btn-primary" onClick={() => nav(savingAt(full))}>Download</button>
            <button type="button" className="btn" onClick={() => nav(full)}>Choose what goes in</button>
          </span>
        </li>
      </ul>
      <p className="sub lrs-kept">
        {kept.length
          ? <button type="button" className="linkish" data-saved-copies-open onClick={() => setSheet(true)}>Reports already made here · {kept.length}</button>
          : 'Reports made here are kept in the app, to open or send again.'}
      </p>
      <SavedCopiesSheet open={sheet} onClose={() => setSheet(false)} items={kept} />
    </section>
  );
}
