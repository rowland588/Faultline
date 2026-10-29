/* ONE PROGRAM ON A LINE — its tests on paper (29 October).
 * #/lines/:ws/program/:programId/report — ?save=1 from the line's Programs or its report list. */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getWorkspace } from '../db';
import { useLineRecords } from '../lib/useLineRecords';
import { projectsOnLines, stageOnlyByLine, useJobFloor } from '../lib/useJobFloor';
import { programsReadingOnLine, saveOneProgramReport } from '../lib/lineProgramsPaper';
import { readingForProgram } from '../lib/programsReport';
import { programJourney, attemptsOf } from '../lib/programJourney';
import { useSaveOnArrival } from '../lib/useSaveOnArrival';
import { todayISO } from '../lib/weeks';
import { PageHeader } from '../ui/parts';
import { nav } from '../state/useRoute';
import { saveTestCard } from '../lib/testCards';
import type { Workspace } from '../types';

export function LineProgramReportScreen({ wsId, programId }: { wsId: string; programId: string }) {
  const rec = useLineRecords();
  const [line, setLine] = useState<Workspace | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [cardBusy, setCardBusy] = useState<string | null>(null);
  const [said, setSaid] = useState<string | null>(null);
  const today = todayISO();

  useEffect(() => { void getWorkspace(wsId).then(w => setLine(w ?? null)); }, [wsId]);

  const program = useMemo(() => rec.programs.find(p => p.id === programId), [rec.programs, programId]);
  const floor = useJobFloor(useMemo(() => (line ? projectsOnLines([line.id], rec.jobLines, pid => rec.jobs.some(j => j.id === pid && !j.archivedAt)) : []), [line, rec.jobLines, rec.jobs]));
  const jobName = useMemo(() => new Map(rec.jobs.map(j => [j.id, j.name])), [rec.jobs]);
  const stageOnly = useMemo(() => (line ? stageOnlyByLine(floor.stageOnly ?? [], rec.machines, rec.jobLines).get(line.id) ?? [] : []), [line, floor, rec.machines, rec.jobLines]);
  const allReading = useMemo(() => (line && !rec.loading ? programsReadingOnLine(rec, line, today, { floor, jobName, stageOnlyLines: stageOnly.map(x => x.line) }) : undefined),
    [line, rec, today, floor, jobName, stageOnly]);
  const one = useMemo(() => (allReading ? readingForProgram(allReading, programId) : undefined), [allReading, programId]);
  const row = one?.lines[0];
  const job = program?.projectId ? rec.jobs.find(j => j.id === program.projectId) : undefined;
  const attempts = useMemo(() => (program ? attemptsOf(program, rec.provingTests) : []), [program, rec.provingTests]);
  const journey = useMemo(() => (program ? programJourney(program, rec.provingTests, today) : undefined), [program, rec.provingTests, today]);

  const download = useCallback(async () => {
    if (!line || !allReading || busy) return;
    setBusy(true); setSaid(null);
    try {
      const how = await saveOneProgramReport(line, allReading, programId, today);
      setSaid(how === 'downloaded' ? 'Saved — open or send it from the bar below.' : 'Ready — open it from the bar below.');
    } catch (e) {
      console.error('program report failed', e);
      setSaid('The report could not be made — try again.');
    } finally { setBusy(false); }
  }, [line, allReading, busy, programId, today]);
  useSaveOnArrival(!!row && !rec.loading, download);

  const testCard = async (testId: string) => {
    if (!job || cardBusy) return;
    setCardBusy(testId);
    try {
      await saveTestCard(job.id, testId, { name: job.name, ...(job.lead ? { lead: job.lead } : {}) });
    } catch (e) {
      console.error('test card failed', e);
      window.alert('Sorry — the test card could not be made.');
    } finally { setCardBusy(null); }
  };

  if (line === undefined || rec.loading) return <div className="wrap pl"><p className="sub">Opening…</p></div>;
  if (line === null || !row) return (
    <div className="wrap pl">
      <p>This program is not on the line. <button type="button" className="cw-link" onClick={() => nav(`/programs?line=${encodeURIComponent(wsId)}`)}>The line&apos;s Programs ›</button></p>
    </div>
  );

  const testPapers = attempts.map(t => ({
    label: `Test card — ${t.title}`,
    for: 'what this test had to show and what was seen',
    disabled: !job || cardBusy === t.id,
    make: () => void testCard(t.id),
  }));

  return (
    <div className="wrap pl lpr-one">
      <PageHeader
        eyebrow={<span className="pl-eyebrow">PROGRAM · {line.name.toUpperCase()}</span>}
        title={row.what}
        says={<><span className={'spp-pill is-' + row.tone}>{row.word}</span>{row.machine ? ` · ${row.machine}` : ''}{row.runs ? ` · runs ${row.runs}` : ''}</>}
        primary={{ label: 'Download', disabled: busy, run: () => void download() }}
        papers={testPapers}
        back={{ label: 'Programs', to: `/programs?line=${encodeURIComponent(wsId)}` }}
      />
      {said && <p className="tc-ok" role="status">{said}</p>}
      {row.note && <p className="sub">{row.note}</p>}
      {row.proof && <p className="sub">{row.proof.word}</p>}
      {(journey?.attempts ?? []).map((a, i) => (
        <section key={a.test.id} className="lpr-attempt">
          <h2>Test {i + 1} — {a.test.title}</h2>
          <p className="sub">{a.text}{a.split ? ` — ${a.split}` : ''}</p>
        </section>
      ))}
      {(row.tests ?? []).map((t, i) => (
        <p key={i} className="sub"><span className={'is-' + t.tone}>{t.badge}</span> {t.text}{t.split ? ` — ${t.split}` : ''}</p>
      ))}
    </div>
  );
}
