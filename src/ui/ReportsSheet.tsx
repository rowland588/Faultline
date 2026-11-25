/* ONE DOOR TO PAPER. Every project page lists everything printable here, with
 * one line each saying what it is — the client report, today's story, the line
 * standard, the evidence cards of each line's walk, and the spreadsheet of
 * everything. Each screen keeps its own PDF button for the thing it shows; this
 * is the index, so nobody has to know which page a document lives on. */
import { dayHref } from '../project/journey/journey';
import { useEffect, useState } from 'react';
import type { Project } from '../types';
import { kindFacts } from '../project/projectKind';
import { usePaceLines } from '../lib/usePaceLines';
import { getPaceWorkspaceId } from '../db';
import { nav } from '../state/useRoute';
import { commissioningNarrativePapersInMenus } from '../lib/productStory';
import { Sheet } from './Sheet';

export function Door({ title, says, onClick }: { title: string; says: string; onClick: () => void }) {
  return (
    <button type="button" className="meet-report" onClick={onClick}>
      <b>{title}</b><small>{says}</small>
    </button>
  );
}

export function ReportsSheet({ project, onClose }: { project: Project; onClose: () => void }) {
  return (
    <Sheet open onClose={onClose} title="On paper">
      <div className="meet-reports"><JobPapers key={project.id} project={project} onClose={onClose} /></div>
    </Sheet>
  );
}

/** ONE JOB'S PAPERS — the doors its Reports sheet lists, and the control
 *  room's Reports lists under the job's name (ui/ControlRoomReports): the one
 *  list, so the two cannot differ. */
export function JobPapers({ project, onClose }: { project: Project; onClose: () => void }) {
  const reportKind = kindFacts(project);
  const stageGate = reportKind.kind === 'stagegate';
  const tree = reportKind.kind === 'tree';
  const { lines } = usePaceLines(project.id);
  const [walk, setWalk] = useState<string | null>(null);
  const [said, setSaid] = useState('');
  const [busy, setBusy] = useState(false);
  const [byLine, setByLine] = useState(false);
  useEffect(() => {
    let active = true;
    void getPaceWorkspaceId(project.id).then(id => { if (active) setWalk(id); });
    return () => { active = false; };
  }, [project.id]);
  const go = (to: string) => { onClose(); nav(to); };
  const spreadsheet = async () => {
    setBusy(true); setSaid('');
    try {
      const { exportEverything } = await import('../lib/exportAll');
      const r = await exportEverything(project.id);
      setSaid(r.how === 'downloaded' ? `Saved ${r.name}.` : `${r.name} is ready — send it from the bar below.`);
    } catch (e) { setSaid(`The spreadsheet could not be built — ${e instanceof Error ? e.message : 'try again'}.`); }
    finally { setBusy(false); }
  };
  /* MACHINE LABELS (lib/machineLabels) — a code per machine, for the floor. */
  const labels = async () => {
    setBusy(true); setSaid('');
    try {
      const { listAssets } = await import('../db/testing');
      const { printLabels } = await import('./printLabels');
      setSaid(await printLabels(project, await listAssets(project.id)));
    } catch (e) { setSaid(`The labels could not be drawn — ${e instanceof Error ? e.message : 'try again'}.`); }
    finally { setBusy(false); }
  };
  const withWalk = lines.filter(l => l.workspaceId);
  /* A RUNNING LINE'S JOB, ITS PAPER IN ORDER (flow audit #17: "Eight papers
     on one sheet … the client report three times, evidence cards twice, the
     one-page report twice"; docs/SIMPLE.md: the report first, the detail
     one tap away). The job's own client report leads; each line's three
     papers — its client report, its week on one page, its evidence cards —
     are folded under it, a line at a time. Nothing is taken away. */
  const perLine = !stageGate && reportKind.kind !== 'method' ? lines.map(l => ({ l, papers: [
    ...(project.programKey === 'line-recovery' && lines.length === 1 ? [] : [{ key: 'r', title: 'Client report', says: 'The same report, for this line alone.', to: `/pace-report?project=${project.id}&line=${l.id}` }]),
    ...(l.workspaceId ? [
      { key: 'w', title: 'One-page report', says: 'The week on this line in one page — lost time, where it went, the problems needing a push.', to: `/w/${l.workspaceId}/report` },
      { key: 'e', title: 'Evidence cards', says: 'One page per problem on this line’s walk, with its picture.', to: `/w/${l.workspaceId}/snaglist` },
    ] : []),
  ] })) : [];
  const nPapers = perLine.reduce((n, x) => n + x.papers.length, 0);
  return (
      <>
        <Door title={reportKind.kind === 'method' ? 'Project report' : project.programKey === 'line-recovery' ? 'Customer report' : 'Client report'}
          says={reportKind.kind === 'method' ? `${reportKind.label} phases, tool findings, decisions and actions. View or download the customer PDF.`
            : reportKind.papers[0].for} onClick={() => go(reportKind.reportTo(project.id))} />
        {reportKind.kind === 'recovery' && <Door title="DMAIC project evidence" says="The five phases, charter, tool findings and review decisions." onClick={() => go(`/project/${project.id}/method-report`)} />}
        {/* THE JOURNEY REPORT (docs/JOURNEY.md, J3) — any range, picked on the Journey; this week and next from here */}
        <Door title="Journey report" says="To whoever we report to — what we did day by day, what is next, your commentary, the tools we are using. This week and next from here; pick any range on the Journey." onClick={() => go(`/project/${project.id}/journey?save=1`)} />
        {perLine.length > 0 && (
          <div className={'meet-lines' + (byLine ? ' is-open' : '')}>
            <button type="button" className="meet-lines-h" aria-expanded={byLine} onClick={() => setByLine(o => !o)}>
              <b>Line by line</b>
              <small>{perLine.length === 1 ? perLine[0].l.name : `${perLine.length} lines`} · {nPapers} papers — each line’s report, its week on one page and its evidence cards</small>
              <span aria-hidden>{byLine ? '▾' : '›'}</span>
            </button>
            {byLine && perLine.map(({ l, papers }) => (
              <section key={l.id} className="meet-line" aria-label={l.name}>
                <p className="meet-line-n">{l.name}</p>
                {papers.map(x => <Door key={x.key} title={`${x.title} — ${l.name}`} says={x.says} onClick={() => go(x.to)} />)}
              </section>
            ))}
          </div>
        )}
        {/* What the method prints (lib/planModel: "the tree on one page") was
            the one printable thing this index did not list. */}
        {tree && <Door title="The lever tree" says="The tree on one page — print it from the tree itself." onClick={() => go(`/project/${project.id}/tree`)} />}
        {stageGate && <Door title="Today" says="For the team — the day's story: what got done, what was found, with the pictures. One page — on the Journey, picked on today." onClick={() => go(dayHref(project.id))} />}
        {stageGate && <Door title="Test cards" says="For the floor and the OEM — a card for every test on Commission's board, what it had to show and what was seen. Print them from Commission." onClick={() => go(`/project/${project.id}/testing`)} />}
        {stageGate && <Door title="Programs report" says="For the OEM and the team — every program, machine by machine: where each stands and what was seen." onClick={() => go(`/project/${project.id}/report?doc=programs`)} />}
        {stageGate && commissioningNarrativePapersInMenus && <Door title="Commissioning report" says="For the meeting, or to send — where commissioning has got to, machine by machine: the tests, the programs, the problems, what is booked next; and the cards, a page a machine." onClick={() => go(`/project/${project.id}/report?doc=commissioning`)} />}
        {stageGate && commissioningNarrativePapersInMenus && <Door title="Handover report" says="For the team and whoever takes the line over — every machine as it was really handed over: its tests, its hand-over list, what was still open, and lines to sign." onClick={() => go(`/project/${project.id}/report?doc=handover`)} />}
        {/* THE PLAN prints from its own page (ui/Gantt's PDF), and was the one
            stage-gate document this index did not list. */}
        {stageGate && <Door title="The plan" says="For the team and the client — every machine's stages against the days, on one landscape page. Print it from the plan." onClick={() => go(`/project/${project.id}/plan`)} />}
        {stageGate && <Door title="Line standard" says="For the floor — who stands where and what they do, one page per product." onClick={() => go(`/project/${project.id}/standard`)} />}
        {stageGate && <Door title="Machine labels" says={busy ? 'Drawing…' : 'For the floor — a code per machine to stick on it: scanned with a phone’s camera, it opens that machine’s page.'} onClick={() => { if (!busy) void labels(); }} />}
        {walk && <Door title="Evidence cards" says="One page per problem on the walk, with its picture." onClick={() => go(`/w/${walk}/snaglist`)} />}
        {/* a stage-gate job's lines' papers, as they were; a running line's
            are folded under its report, line by line, above */}
        {stageGate && withWalk.map(l => (
          <Door key={l.id} title={`Evidence cards — ${l.name}`} says="One page per problem on this line's walk, with its picture." onClick={() => go(`/w/${l.workspaceId}/snaglist`)} />
        ))}
        {stageGate && withWalk.map(l => (
          <Door key={`r${l.id}`} title={`One-page report — ${l.name}`} says="The week on this line in one page — lost time, where it went, the problems needing a push." onClick={() => go(`/w/${l.workspaceId}/report`)} />
        ))}
        <Door title="Spreadsheet" says={busy ? 'Building…' : stageGate
          ? 'This project’s machines, tests, fixes, materials, programs, line standard and walks in Excel.'
          : 'This project in one Excel file — what it waits on (materials and programs), its line standards and the problems on its walks. Its numbers, problems and board are on the client report.'}
          onClick={() => { if (!busy) void spreadsheet(); }} />
        {said && <p className="sub" role="status">{said}</p>}
      </>
  );
}
