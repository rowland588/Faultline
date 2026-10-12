/* A PRODUCTION LINE, ITS OWN PAGE — its problems and its tools, no project
 * needed.
 *
 * Rowland, 12 October: "I have to open one of the projects to get access to
 * the tools ... I want to just be able to open a production line and use
 * these tools inside the production line ... There's a production line,
 * there's a problem, take the picture and move forward with it." Commissioning
 * done, the line running, the problems still come.
 *
 * WHICH RECORD: the line (a Workspace) — the record every problem
 * (snags.workspace_id) and every tool (a standard's or a study's
 * workspaceId) already hangs off. Nothing new is stored. WHERE IT SHOWS: the
 * control room's Production lines, the rail's Lines, and each problem and
 * tool it lists opens where it lives, already on this line.
 *
 * The page answers, in order: where the line is (its problems, the late in
 * red), and what to do next (take a problem; open a tool on this line). */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { nav } from '../state/useRoute';
import { getWorkspace, listAllSnags, listStandardsForLine, listStudiesForLine, onDataChange, updateWorkspace } from '../db';
import { openQuickSnag } from '../snag/QuickSnag';
import { PRIORITY_WORD, type Priority, type SnagRow, type SnagTone, snagRow } from '../lib/snagsReport';
import type { Standard } from '../lib/standard';
import type { ToolStudy, StudyTool } from '../lib/study';
import type { Workspace } from '../types';
import { Icon } from '../ui/Icon';

const TONE_CLASS: Record<SnagTone, string> = { g: 'is-g', r: 'is-r', w: 'is-w', a: 'is-a', n: 'is-n' };
/* PRIORITY, RAG (Rowland, 12 October) — always with its word. */
const PRIO_CLASS: Record<Priority, string> = { critical: 'is-r', high: 'is-a', low: 'is-g' };
const RANK: Record<Priority, number> = { critical: 0, high: 1, low: 2 };

/** The tools, as the rail names them, each opened on this line. */
const TOOLS: { key: string; label: string; to: string; study?: StudyTool; standard?: true; what: string }[] = [
  { key: 'linestandard', label: 'Line standard', to: '/standards', standard: true, what: 'who stands where, product by product' },
  { key: 'linebalance', label: 'Line capacity', to: '/balances', standard: true, what: 'where the line is limited, and the V-curve' },
  { key: 'capability', label: 'Capability', to: '/capability', study: 'capability', what: 'readings against the limits agreed' },
  { key: 'valuestream', label: 'Value stream', to: '/value-stream', study: 'map', what: 'every step, who does it, the waits' },
  { key: 'changeover', label: 'SMED', to: '/smed', study: 'changeover', what: 'a changeover timed and cut down' },
  { key: 'sampling', label: 'Work sampling', to: '/sampling', study: 'sampling', what: 'what people are doing, at random moments' },
  { key: 'losses', label: 'Loss count', to: '/losses', study: 'losses', what: 'a shift’s losses, in minutes and pounds' },
];

export function ProductionLineScreen({ wsId }: { wsId: string }) {
  const [line, setLine] = useState<Workspace | null | undefined>(undefined);
  const [rows, setRows] = useState<SnagRow[]>([]);
  const [standards, setStandards] = useState<Standard[]>([]);
  const [studies, setStudies] = useState<ToolStudy[]>([]);

  const load = useCallback(async () => {
    const [w, every, std, ss] = await Promise.all([getWorkspace(wsId), listAllSnags(), listStandardsForLine(wsId), listStudiesForLine(wsId)]);
    setLine(w ?? null);
    const name = w?.name ?? 'This line';
    const mine = every.filter(s => s.workspaceId === wsId && !s.deletedAt && !s.archivedAt && s.status !== 'closed');
    setRows(mine.map(s => snagRow(s, name)).sort((a, b) => RANK[a.priority] - RANK[b.priority] || Number(b.late) - Number(a.late) || b.raisedAt - a.raisedAt));
    setStandards(std); setStudies(ss.filter(s => !s.deletedAt));
  }, [wsId]);
  useEffect(() => { void load(); return onDataChange(() => void load()); }, [load]);

  const late = rows.filter(r => r.late).length;
  const crit = rows.filter(r => r.priority === 'critical').length;
  const count = useMemo(() => (t: typeof TOOLS[number]) => (t.standard ? standards.length : studies.filter(s => s.tool === t.study).length), [standards, studies]);

  if (line === undefined) return <div className="wrap pl"><p className="sub">Opening…</p></div>;
  if (line === null) {
    return (
      <div className="wrap pl">
        <h1>No such line</h1>
        <p className="sub">This line is not on this device — it may have been archived. The control room lists every line.</p>
        <button type="button" className="btn" onClick={() => nav('/')}>Control room</button>
      </div>
    );
  }

  const rename = () => {
    const name = window.prompt('Rename the line', line.name)?.trim();
    if (name && name !== line.name) void updateWorkspace({ ...line, name });
  };

  return (
    <div className="wrap pl">
      <header className="pace-head">
        <div className="pace-head-main">
          <p className="pl-eyebrow">PRODUCTION LINE</p>
          <h1>{line.name}</h1>
          {/* where the line is, in words — only the abnormal carries colour */}
          <p className="pl-says">
            {rows.length === 0 ? 'No problems open.' : <>
              {rows.length} problem{rows.length === 1 ? '' : 's'} open
              {crit > 0 && <> · <b className="is-r">{crit} critical</b></>}
              {late > 0 && <> · <b className="is-r">{late} late</b></>}
            </>}
          </p>
        </div>
        <div className="pace-head-actions">
          <button type="button" className="btn btn-primary" onClick={() => openQuickSnag()}><Icon name="camera" size="1.05em" />Problem</button>
          <button type="button" className="btn btn-ghost" onClick={rename}>Rename</button>
        </div>
      </header>

      <section className="pl-sec" aria-label="Problems on this line">
        <div className="pl-sec-h">
          <h2>Problems</h2>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => nav(`/snags?line=${encodeURIComponent(wsId)}`)}>Every problem on this line ›</button>
        </div>
        {rows.length === 0
          ? <p className="sub">Nothing open on this line. Press Problem to take one — a picture and a few words, on this line, no project needed.</p>
          : (
            <ul className="pl-rows">
              {rows.map(r => (
                <li key={r.id}>
                  <button type="button" className={'pl-row' + (r.late ? ' is-late' : '')} onClick={() => nav(`/snags?line=${encodeURIComponent(wsId)}&open=${encodeURIComponent(r.id)}`)}>
                    <span className="pl-row-main">
                      <span className="qsl-what"><span className={'qsl-prio ' + PRIO_CLASS[r.priority]}>{PRIORITY_WORD[r.priority]}</span>{r.what}</span>
                      <span className="qsl-meta">{[r.machine ?? '', r.forJob ? `for ${r.forJob}` : '', r.owner ?? 'nobody yet'].filter(Boolean).join(' · ')}</span>
                    </span>
                    <span className="preg-right">
                      <span className={'qsl-state ' + TONE_CLASS[r.tone]}>{r.word}</span>
                      {r.due && <span className={'qsl-dueword ' + TONE_CLASS[r.dueTone ?? 'n']}>{r.due}</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
      </section>

      <section className="pl-sec" aria-label="Tools on this line">
        <div className="pl-sec-h"><h2>Tools on this line</h2></div>
        <ul className="pl-tools">
          {TOOLS.map(t => {
            const n = count(t);
            return (
              <li key={t.key}>
                <button type="button" className="pl-tool" onClick={() => nav(`${t.to}?line=${encodeURIComponent(wsId)}`)}>
                  <b>{t.label}</b>
                  <span className="sub">{n ? `${n} on this line` : `None yet — ${t.what}`}</span>
                  <span className="pl-tool-go" aria-hidden>›</span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
