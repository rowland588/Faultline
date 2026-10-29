/* A MACHINE — ITS ONE PAGE, ON ITS LINE (docs/STAGEGATE-RESEARCH.md §5, slice 4; the one page since 27 October).
 *
 * #/lines/:ws/machine/:name — reached from the line's machines, the Factory, a project's Machines and every machine
 * name. Rowland, 27 October, after walking into two pages of Pick and place: one machine, one page. While a
 * stage-gate project is working on it, the project's part comes first (project/machines/MachineInProject — where it
 * is up to, its four gates, what is open, its tests, its programs, the machine itself); then every project that did
 * anything to it, the line's own programs on it, its problems, the studies of it and its stops. The project's address
 * for it (#/project/:id/machine/:asset) draws this same page inside the project (27 October — Rowland chose
 * "all of it": a machine opened from a project stays in the project, "‹ Machines" back to the project's machines,
 * its line one tap away); reached from the line, it is the line's. Read by lib/lineMachine; nothing here decides a word. Report ▾ prints this machine in full (27 October — Rowland: "still no report
 * abilities"; "all you've done is headlines"): lib/machineDossier, drawn by lib/machinePaperPdf. */
import { useEffect, useMemo, useState } from 'react';
import type { Observation, Workspace } from '../types';
import type { Snag } from '../snag/types';
import type { Test } from '../lib/testing';
import { getWorkspace, listAllSnags, listAllTests, listObservations, onDataChange } from '../db';
import { useLineRecords } from '../lib/useLineRecords';
import { projectsOnLines, useJobFloor } from '../lib/useJobFloor';
import { lineMachineView, STOP_DAYS } from '../lib/lineMachine';
import { todayISO } from '../lib/weeks';
import { PageHeader } from '../ui/parts';
import { nav } from '../state/useRoute';
import { savingAt } from '../lib/useSaveOnArrival';
import { commissioningNarrativePapersInMenus } from '../lib/productStory';
import { planModel } from '../lib/planModel';
import { MachineInProject } from '../project/machines/MachineInProject';

export function LineMachineScreen({ wsId, name, inProject }: { wsId: string; name: string;
  /** The project the address came from — the page is drawn inside it, its way back the project's Machines. */
  inProject?: string }) {
  const rec = useLineRecords();
  const [line, setLine] = useState<Workspace | null | undefined>(undefined);
  const [tests, setTests] = useState<Test[]>([]);
  const [snags, setSnags] = useState<Snag[]>([]);
  const [stops, setStops] = useState<Observation[]>([]);
  const [said, setSaid] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let live = true;
    const load = () => void Promise.all([getWorkspace(wsId), listAllTests(), listAllSnags(), listObservations(wsId)]).then(([w, t, s, o]) => {
      if (!live) return;
      setLine(w ?? null); setTests(t); setSnags(s); setStops(o);
    });
    load();
    const off = onDataChange(load);
    return () => { live = false; off(); };
  }, [wsId]);

  const floor = useJobFloor(useMemo(() => projectsOnLines([wsId], rec.jobLines, pid => rec.jobs.some(j => j.id === pid && !j.archivedAt)), [wsId, rec.jobLines, rec.jobs]));
  const jobNames = useMemo(() => new Map(rec.jobs.map(j => [j.id, j.name])), [rec.jobs]);
  const v = useMemo(() => (line ? lineMachineView(name, {
    ws: line, assets: rec.machines, jobLines: rec.jobLines, jobs: rec.jobs, programs: rec.programs, tests, snags, studies: rec.studies, stops,
    now: Date.now(), floor, jobNames, today: todayISO(),
  }) : undefined), [line, name, rec.machines, rec.jobLines, rec.jobs, rec.programs, rec.studies, tests, snags, stops, floor, jobNames]);

  if (rec.loading || line === undefined) return <div className="wrap pace"><p className="sub">Loading…</p></div>;
  if (!line || !v) {
    return (
      <div className="wrap pace lmc-gone">
        <p className="sub">{line ? `${name} is not on ${line.name} any more.` : 'That line is not here any more.'}</p>
        <button type="button" className="btn btn-primary" onClick={() => nav(line ? `/lines/${wsId}` : '/')}>{line ? `Back to ${line.name}` : 'Back to the factory'}</button>
      </div>
    );
  }
  const openProblems = v.problems.filter(p => p.open).length;
  /* THE PROJECT WORKING ON IT NOW — a stage-gate project, not put away, whose machine record this is */
  const job = v.record?.projectId ? rec.jobs.find(j => j.id === v.record?.projectId && !j.archivedAt && planModel(j) === 'commissioning') : undefined;
  const assetId = v.record?.id;
  /* the line's own programs on it — a project's are in its part above, the same rows and form as its Programs */
  const lineProgs = job ? v.programs.filter(l => !!l.programId && rec.programs.find(p => p.id === l.programId)?.projectId !== job.id) : v.programs;
  const print = async () => {
    if (busy) return;
    setBusy(true); setSaid(null);
    try {
      /* in full (27 October — "all you've done is headlines"): every project's work on it, each test and attempt,
         its programs and their tests, its problems and what was done, the studies and what they found (lib/machineDossier) */
      const { machinePaper } = await import('../lib/machineDossier');
      const paper = await machinePaper({ wsId, name: v.name });
      if (!paper) throw new Error('machine not on the line');
      const { saveMachinesPaper } = await import('../lib/machinePaperPdf');
      const how = await saveMachinesPaper(paper, [line.name, `${v.name} machine report`]);
      setSaid(how === 'downloaded' ? 'Saved — open or send it from the bar below.' : 'Ready — open it from the bar below.');
    } catch (e) {
      console.error('machine report failed', e);
      setSaid('The paper could not be made — try again.');
    } finally { setBusy(false); }
  };

  return (
    <div className="wrap pace lmc">
      <PageHeader eyebrow={<span className="pl-eyebrow">MACHINE · {inProject
          ? <a className="pl-eyebrow-a" href={`#/lines/${encodeURIComponent(wsId)}/machine/${encodeURIComponent(name)}`}>on {line.name} ›</a> : line.name}</span>} title={v.name}
        back={inProject ? { label: 'Machines', to: `/project/${inProject}/machines` } : { label: 'Machines', to: `/lines/${encodeURIComponent(wsId)}?view=machines` }}
        papers={[
          { label: 'Machine report', for: 'this machine in full — where it is up to, what is open and who has it, every test and every attempt, its programs and their tests, every step, its problems and what was done, the studies and what they found, its stops', disabled: busy, make: print },
          ...lineProgs.filter(l => l.programId).map(l => ({
            label: `Program report — ${l.what}`,
            for: 'every test on this program and how it went',
            make: () => nav(savingAt(`/lines/${encodeURIComponent(wsId)}/program/${encodeURIComponent(l.programId!)}/report`)),
          })),
          ...(job && commissioningNarrativePapersInMenus ? [{ label: 'Commissioning report', for: `every machine in ${job.name}, a card each`, make: () => nav(`/project/${job.id}/report?doc=commissioning`) }] : []),
        ]}>
        <p className="sub lmc-says">{v.says}</p>
        {v.oem && !job && <p className="sub">Made by <b>{v.oem}</b></p>}
      </PageHeader>
      {said && <p className="tc-ok" role="status">{said}</p>}

      {/* IN ITS PROJECT — what the project working on it now is doing to it, first */}
      {job && assetId && <MachineInProject projectId={job.id} assetId={assetId} onRemoved={() => nav(`/project/${job.id}/machines`)} tail="afterLine" />}

      <section className="pl-sec lmc-projects" aria-label="The projects on it">
        <div className="pl-sec-h"><h2>The projects on it</h2><span className="sub">{v.projects.length || 'none'}</span></div>
        {v.projects.length === 0
          ? <p className="sub">No project has worked on it. A project takes it on from its Install — Add a machine.</p>
          : (
            <ol className="pl-machines">
              {v.projects.map(p => (
                <li key={p.id} className="pl-machine lmc-proj">
                  <b>{p.name}</b>
                  <span className="sub">{[`${p.tests} ${p.tests === 1 ? 'test' : 'tests'}`, p.open ? `${p.open} open` : 'none open', p.failed ? `${p.failed} didn’t pass` : ''].filter(Boolean).join(' · ')}{p.last ? ` · last: ${p.last}` : ''}</span>
                  <button type="button" className="cw-link" onClick={() => nav(p.href)}>Open {p.name} ›</button>
                </li>
              ))}
            </ol>
          )}
      </section>

      <section className="pl-sec lmc-programs" aria-label="Its programs">
        <div className="pl-sec-h"><h2>{job ? 'The line’s own programs on it' : 'Its programs'}</h2><span className="sub">{lineProgs.length || 'none'}</span></div>
        {lineProgs.length === 0
          ? <p className="sub">{job ? `None besides ${job.name}’s, above.` : 'No programs on it. Plan one on the line’s Programs.'}</p>
          : (
            <ol className="pl-machines">
              {lineProgs.map(l => (
                <li key={(l.programId ?? l.partId ?? l.what)} className="pl-machine">
                  <b>{l.what}</b><span className={'spp-pill is-' + l.tone}>{l.word}</span>{l.runs && <span className="sub">{l.runs}</span>}
                </li>
              ))}
            </ol>
          )}
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => nav(`/programs?line=${encodeURIComponent(wsId)}`)}>Every program on {line.name} ›</button>
      </section>

      <section className="pl-sec lmc-problems" aria-label="Its problems">
        <div className="pl-sec-h"><h2>Its problems</h2><span className="sub">{v.problems.length ? `${openProblems} open of ${v.problems.length}` : 'none'}</span></div>
        {v.problems.length === 0
          ? <p className="sub">No problem on the register names it.</p>
          : (
            <ol className="pl-machines">
              {v.problems.map(p => (
                <li key={p.id} className={'pl-machine' + (p.open ? '' : ' is-done')}>
                  <button type="button" className="cw-link" onClick={() => nav(p.href)}>{p.what}</button>
                  <span className="sub">{p.open ? p.priority === 'critical' ? 'Critical' : p.priority === 'high' ? 'High' : 'Low' : 'closed'}</span>
                </li>
              ))}
            </ol>
          )}
      </section>

      <section className="pl-sec lmc-studies" aria-label="Studies of it">
        <div className="pl-sec-h"><h2>Studies of it</h2><span className="sub">{v.studies.length || 'none'}</span></div>
        {v.studies.length === 0
          ? <p className="sub">No study names it yet — the line's Tools start one on it.</p>
          : (
            <ol className="pl-machines">
              {v.studies.map(s => (
                <li key={s.id} className="pl-machine">
                  <button type="button" className="cw-link" onClick={() => nav(s.href)}>{s.name}</button><span className="sub">{s.tool}</span>
                </li>
              ))}
            </ol>
          )}
      </section>

      <section className="pl-sec lmc-stops" aria-label="Its stops">
        <div className="pl-sec-h"><h2>Its stops</h2></div>
        <p className="sub">{v.stops.n ? `${v.stops.n} ${v.stops.n === 1 ? 'stop' : 'stops'} timed in the last ${STOP_DAYS} days — ${v.stops.minutes} minutes.` : `No stops timed on it in the last ${STOP_DAYS} days.`}</p>
      </section>

      {/* After every line section — itself and the closing line (STAGEGATE-AESTHETIC C3). */}
      {job && assetId && <MachineInProject projectId={job.id} assetId={assetId} onRemoved={() => nav(`/project/${job.id}/machines`)} tail="only" />}
    </div>
  );
}
