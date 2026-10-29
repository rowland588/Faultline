/* THE LINE'S PROGRAMS REPORT — every program and test on the line (29 October).
 * #/lines/:ws/programs/report — opened from the line's Report ▾ with ?save=1. */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getWorkspace } from '../db';
import { useLineRecords } from '../lib/useLineRecords';
import { projectsOnLines, stageOnlyByLine, useJobFloor } from '../lib/useJobFloor';
import { programsReadingOnLine, saveLineProgramsReport } from '../lib/lineProgramsPaper';
import { useSaveOnArrival, savingAt } from '../lib/useSaveOnArrival';
import { todayISO } from '../lib/weeks';
import { PageHeader } from '../ui/parts';
import { nav } from '../state/useRoute';
import type { Workspace } from '../types';

export function LineProgramsReportScreen({ wsId }: { wsId: string }) {
  const rec = useLineRecords();
  const [line, setLine] = useState<Workspace | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState<string | null>(null);
  const today = todayISO();

  useEffect(() => { void getWorkspace(wsId).then(w => setLine(w ?? null)); }, [wsId]);

  const floor = useJobFloor(useMemo(() => (line ? projectsOnLines([line.id], rec.jobLines, pid => rec.jobs.some(j => j.id === pid && !j.archivedAt)) : []), [line, rec.jobLines, rec.jobs]));
  const jobName = useMemo(() => new Map(rec.jobs.map(j => [j.id, j.name])), [rec.jobs]);
  const stageOnly = useMemo(() => (line ? stageOnlyByLine(floor.stageOnly ?? [], rec.machines, rec.jobLines).get(line.id) ?? [] : []), [line, floor, rec.machines, rec.jobLines]);
  const reading = useMemo(() => (line && !rec.loading ? programsReadingOnLine(rec, line, today, { floor, jobName, stageOnlyLines: stageOnly.map(x => x.line) }) : undefined),
    [line, rec, today, floor, jobName, stageOnly]);

  const download = useCallback(async () => {
    if (!line || !reading || busy) return;
    setBusy(true); setSaid(null);
    try {
      const how = await saveLineProgramsReport(line, reading, today);
      setSaid(how === 'downloaded' ? 'Saved — open or send it from the bar below.' : 'Ready — open it from the bar below.');
    } catch (e) {
      console.error('line programs report failed', e);
      setSaid('The report could not be made — try again.');
    } finally { setBusy(false); }
  }, [line, reading, busy, today]);
  useSaveOnArrival(!!reading && !rec.loading, download);

  if (line === undefined || rec.loading) return <div className="wrap pl"><p className="sub">Opening…</p></div>;
  if (line === null) return <div className="wrap pl"><p>This line is not here. <button type="button" className="cw-link" onClick={() => nav(`/lines/${wsId}`)}>Back to the line ›</button></p></div>;

  return (
    <div className="wrap pl lpr">
      <PageHeader
        eyebrow={<span className="pl-eyebrow">PRODUCTION LINE · PROGRAMS REPORT</span>}
        title={`${line.name} — every program and test`}
        says={reading ? reading.says : 'No programs on this line yet.'}
        primary={{ label: 'Download', disabled: busy || !reading, run: () => void download() }}
        back={{ label: 'Overview', to: `/lines/${wsId}` }}
      />
      {said && <p className="tc-ok" role="status">{said}</p>}
      {reading && (
        <ul className="lpr-list">
          {reading.lines.map(l => (
            <li key={l.programId ?? l.what} className="lpr-row">
              <b>{l.what}</b>
              <span className={'spp-pill is-' + l.tone}>{l.word}</span>
              {l.programId && (
                <button type="button" className="cw-link" onClick={() => nav(savingAt(`/lines/${encodeURIComponent(wsId)}/program/${encodeURIComponent(l.programId!)}/report`))}>
                  Its program report ›
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
