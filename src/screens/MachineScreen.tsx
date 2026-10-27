/* A MACHINE, A PAGE OF ITS OWN (docs/STAGEGATE-UX.md slice 3; machine first since 27 October).
 *
 * Rowland, 27 October: "If I go to machine, I want to be able to see everything associated to my machine. For
 * example, it will say that this machine is going through a stage gate process and it's up to these things. It has
 * these tests on them, these programs on them, and this is where we are." So: its status in plain words; the project
 * it is going through and where it is up to, its four gates one strip; what is open on it, most pressing first; its
 * tests; its programs; the machine itself. The stages gate by gate are worked on the project's own gate pages, each
 * row here opening its record as it did there.
 *
 * Rowland, 16 October: "when i show peole the app, i get losst in it, find
 * dorrs that open othe rthings". One machine's story was spread over five
 * pages — its four gates and Programs — and its name opened a drawer over
 * whichever page it was named on. Here it is in one place, the page to show
 * someone "where is the wrapper": where it is and its four gates in order,
 * the stages and tests that need something, its programs (the same rows and
 * form as Programs), its problems, its label and its details.
 *
 * No new record: the machine (lib/testing Asset), read by lib/machineRecord —
 * the same reading the drawer and the gates make. In the rail under Machines;
 * every machine name opens it (ui/MachinePanel openMachine). */
import { useState } from 'react';
import { PageHeader } from '../ui/parts';
import { useProjectRead } from '../project/projectRead';
import { machineReportPaper } from '../project/machines/machines';
import { useTesting } from '../lib/useTesting';
import { usePrograms } from '../lib/usePrograms';
import { useProject } from '../lib/useProjects';
import { useAccess } from '../cloud/access';
import { live, assetStateOf, ASSET_STATE_WORD } from '../lib/testing';
import { machineRecord, machineTests, openOnMachine, type MachineGate } from '../lib/machineRecord';
import { todayISO } from '../lib/weeks';
import { nav } from '../state/useRoute';
import { openRecord } from '../ui/RecordDrawer';
import { AccessNote } from '../ui/AccessNote';
import { MachineItself } from '../ui/MachinePanel';
import { ProgramsPage } from './ProgramsPage';
import { useJobMoney } from '../lib/useJobMoney';
import { MONEY_WAIT, machineClosing, machineCounts, machineTiles } from '../lib/stageGatePages';
import { LeanClosing, LeanTiles } from '../ui/Lean';
import { useLineRecords } from '../lib/useLineRecords';
import { lineOfMachine } from '../lib/lineRecords';

/* The house's five colours, one meaning each (CLAUDE.md). */
const GATE_SQ: Record<MachineGate['tone'], 'r' | 'a' | 'w' | 'g' | 'n'> = { done: 'g', going: 'w', late: 'r', problem: 'a', failed: 'r', ahead: 'n', none: 'n' };

export function MachineScreen({ projectId, assetId }: { projectId: string; assetId: string }) {
  const tt = useTesting(projectId);
  const progs = usePrograms(projectId);
  const { project } = useProject(projectId);
  const can = useAccess(projectId);
  /* the job's money — what the slip costs, or what a day late would (lib/useJobMoney) */
  const money = useJobMoney(projectId);
  /* ITS LINE — the machine's page there reads everything ever done to it, every project's (one record of a
     machine, docs/STAGEGATE-RESEARCH.md §5 slice 4): one tap from here, where a project looks for it */
  const rec = useLineRecords();
  /* ITS PAPER (27 October — Rowland: "still no report abilities"): this page on paper, read from the project's
     records as the page reads them (project/machines machineReportPaper, lib/machinePaperPdf) */
  const read = useProjectRead(project);
  const [said, setSaid] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (tt.loading || progs.loading || !project) return <div className="wrap pace"><p className="sub">Loading…</p></div>;
  const asset = live(tt.assets).find(a => a.id === assetId);
  if (!asset) {
    return (
      <div className="wrap pace">
        <p className="sub" style={{ marginTop: 24 }}>That machine is not on this project any more.</p>
        <button type="button" className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => nav(`/project/${projectId}`)}>Back to the project</button>
      </div>
    );
  }
  const m = machineRecord(asset, { tests: tt.tests, items: tt.items, programs: progs.programs, today: todayISO() });

  /* its status in plain words — handed over, else where the machine itself is */
  const status = m.at.startsWith('Handed over') ? 'Handed over' : ASSET_STATE_WORD[assetStateOf(asset)];
  const open = openOnMachine(m);
  const lineId = lineOfMachine(asset, rec.jobLines);
  const lineName = lineId ? rec.all.find(w => w.id === lineId)?.name : undefined;
  const print = async () => {
    if (busy || !read?.gate) return;
    setBusy(true); setSaid(null);
    try {
      const paper = machineReportPaper(read.gate, asset.id, read.today, lineName);
      if (!paper) throw new Error('machine not in the read');
      const { saveMachinesPaper } = await import('../lib/machinePaperPdf');
      const how = await saveMachinesPaper(paper, [project.name, `${asset.name} machine report`]);
      setSaid(how === 'downloaded' ? 'Saved — open or send it from the bar below.' : 'Ready — open it from the bar below.');
    } catch (e) {
      console.error('machine report failed', e);
      setSaid('The paper could not be made — try again.');
    } finally { setBusy(false); }
  };
  const tests = machineTests(m);
  const row = (l: { id: string; title: string; word: string; tone: string; who?: string }, where?: string) => (
    <li key={l.id} className={'lt-li mpg-l is-' + l.tone}>
      <button type="button" className="lt-row" onClick={() => openRecord(projectId, l.id)}>
        <b className="lt-what">{l.title}</b>
        <span className="lt-says">{[where, l.who].filter(Boolean).join(' · ')}</span>
        <span className={'lt-where' + (l.tone === 'late' || l.tone === 'failed' ? ' act-late' : '')}>{l.word}</span>
      </button>
    </li>
  );

  return (
    <div className="wrap pace mpg">
      {/* THE PAGE HEADER: the machine — its status in plain words, who made it, since when; and the same machine on its
          line, every project's work on it */}
      <PageHeader eyebrow={<span className="pl-eyebrow">MACHINE · {project.name}</span>} title={m.name}
        papers={[
          { label: 'Machine report', for: 'this page on paper — its status, where it is up to, what is open, its tests, its programs', disabled: busy || !read?.gate, make: print },
          { label: 'Commissioning report', for: 'every machine in the project, a card each', make: () => nav(`/project/${projectId}/report?doc=commissioning`) },
        ]}>
        <p className="cw-handover">
          <b className={'mpg-at is-' + (status === 'Handed over' ? 'g' : status === 'Not here yet' ? 'n' : 'w')}>{status}</b>
          {m.oem && <span className="sub">{m.oem}</span>}
          <span className={'sub' + (m.arrivalLate ? ' in-late' : '')}>{m.arrival}</span>
        </p>
        {(() => {
          const line = lineId ? rec.all.find(w => w.id === lineId) : undefined;
          return line ? (
            <p className="mpg-line">
              <button type="button" className="cw-link" onClick={() => nav(`/lines/${encodeURIComponent(line.id)}/machine/${encodeURIComponent(asset.name.trim())}`)}>
                Everything on {line.name} — every project’s work on it ›
              </button>
            </p>
          ) : null;
        })()}
      </PageHeader>
      {said && <p className="tc-ok" role="status">{said}</p>}
      <AccessNote can={can} owner={project.lead} />

      {/* WHERE IT IS UP TO IN ITS PROJECT (27 October — Rowland: "it will say that this machine is going through a stage
          gate process and it's up to these things"): one sentence, then its four gates in a row, each in its colour and
          its words. The gates are the project's; the stages under them are worked on the project's own gate pages. */}
      <section className="pl-sec mpg-project" aria-label="Its project">
        <p className="mpg-in">Going through <button type="button" className="cw-link" onClick={() => nav(`/project/${projectId}`)}>{project.name}</button> — a stage-gate project — {m.at.startsWith('Handed over') ? <b>{m.at.toLowerCase()}</b> : <>up to <b>{m.at.replace(/^at /, '')}</b></>}.</p>
        <ol className="mpg-steps" aria-label={`${m.name}: its gates`}>
          {m.gates.map(g => (
            <li key={g.gate} className={'mpg-step is-' + GATE_SQ[g.tone]}>
              <b>{g.label}</b>
              <span>{g.says}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* THE LEAN PAGE (lib/stageGatePages): its gates through, what is late, its fixes, the problems on it with no fix,
          and the project's money */}
      <LeanTiles tiles={machineTiles(machineCounts(m), money ?? MONEY_WAIT)} className="sg-tiles" />

      <div className="mpg-cols">
        <div className="mpg-main">
          {/* WHAT IS OPEN ON IT — the most pressing first, each opening its record (lib/machineRecord openOnMachine) */}
          <section className="pl-sec mpg-open" aria-label="What is open on it">
            <div className="pl-sec-h"><h2>What is open on it</h2><span className="sub">{open.length ? `${open.length}` : 'nothing'}</span></div>
            {open.length ? <ul className="lt-rows">{open.map(l => row(l, l.where))}</ul> : <p className="sub">Nothing open on it — no stage, fix or problem waiting.</p>}
          </section>
          {/* ITS TESTS — every one as it stands, each opening its record to run or record it */}
          <section className="pl-sec mpg-tests" aria-label="Its tests">
            <div className="pl-sec-h"><h2>Its tests</h2><span className="sub">{tests.length ? `${tests.filter(t => t.tone === 'done').length} of ${tests.length} passed` : 'none yet'}</span></div>
            {tests.length ? <ul className="lt-rows">{tests.map(l => row(l))}</ul> : <p className="sub">No tests on it yet — they are planned on the project’s Commission.</p>}
          </section>
        </div>
        {/* ITS PROGRAMS — the same rows and form as Programs */}
        <section className="mpg-side" aria-label="Its programs">
          <ProgramsPage projectId={projectId} only={asset.id} />
        </section>
      </div>
      {/* THE MACHINE ITSELF — its climb to rate, its label, its details and remove (ui/MachinePanel MachineItself) */}
      <section className="mpg-itself" aria-label="The machine itself">
        <MachineItself asset={asset} projectId={projectId} tt={tt} can={can} onClose={() => nav(`/project/${projectId}/machines`)} />
      </section>
      {/* THE CLOSING LINE — the machine in one sentence, the slip in money */}
      <LeanClosing closing={machineClosing(machineCounts(m), money ?? MONEY_WAIT)} />
    </div>
  );
}
