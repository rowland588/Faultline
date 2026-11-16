/* A PLACE'S REPORTS TAB — an area's and the Factory's (16 November, docs/NAV.md N2; the line's is line/report/LineReports, drawn the same).
 * Rowland: "Customers like simple reports that they can simply look at something and understand … I want this fixed." A place's papers
 * in one list, each a row with what it is for and one press to make it, then the papers already made there, kept in the app. */
import { useEffect, useState, type ReactNode } from 'react';
import { SavedCopiesSheet, useKeptHere } from './SavedCopies';
import { listKept, onKeptChange, type KeptPdf } from '../lib/keptPdfs';

export interface PlaceReport {
  key: string;
  title: string;
  says: string;
  primary: { label: string; run: () => void; disabled?: boolean };
  other?: { label: string; run: () => void };
}

/** The papers kept anywhere that `match` says belong to this place (its report page's, its papers'), with those made on this page. */
function useKeptFor(match?: (k: KeptPdf) => boolean): KeptPdf[] {
  const here = useKeptHere();
  const [all, setAll] = useState<KeptPdf[]>([]);
  useEffect(() => {
    if (!match) return;
    let live = true;
    const load = () => { void listKept().then(x => { if (live) setAll(x); }).catch(() => undefined); };
    load();
    const off = onKeptChange(load);
    return () => { live = false; off(); };
  }, [!!match]); // eslint-disable-line react-hooks/exhaustive-deps -- the list is read once; `match` is applied as it is drawn
  if (!match) return here;
  const ids = new Set(here.map(k => k.id));
  return [...here, ...all.filter(k => !ids.has(k.id) && match(k))].sort((a, b) => b.at - a.at);
}

export function PlaceReports({ label, rows, after, match }: { label: string; rows: PlaceReport[]; after?: ReactNode; match?: (k: KeptPdf) => boolean }) {
  const kept = useKeptFor(match);
  const [sheet, setSheet] = useState(false);
  return (
    <section className="pl-sec lrs" aria-label={label} data-place-reports>
      <ul className="lrs-l">
        {rows.map(r => (
          <li key={r.key} className="lrs-i" data-place-report={r.key}>
            <div className="lrs-t">
              <b>{r.title}</b>
              <span className="sub">{r.says}</span>
            </div>
            <span className="lrs-a">
              <button type="button" className="btn btn-primary" disabled={r.primary.disabled} onClick={r.primary.run}>{r.primary.label}</button>
              {r.other && <button type="button" className="btn" onClick={r.other.run}>{r.other.label}</button>}
            </span>
          </li>
        ))}
      </ul>
      {after}
      <p className="sub lrs-kept">
        {kept.length
          ? <button type="button" className="linkish" data-saved-copies-open onClick={() => setSheet(true)}>Reports already made here · {kept.length}</button>
          : 'Reports made here are kept in the app, to open or send again.'}
      </p>
      <SavedCopiesSheet open={sheet} onClose={() => setSheet(false)} items={kept} />
    </section>
  );
}
