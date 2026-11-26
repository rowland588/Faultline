import { useEffect, useRef, useState } from 'react';
import type { ColleagueTurn } from './conversation';
import { downloadableArtifact, illustratedArtifact, type HtmlArtifact } from './htmlArtifacts';
import type { CapCtx } from '../capabilities/types';
import { onDataChange } from '../db';
import { refreshDashboard } from './dashboardTracking';
import { deliverBlob } from '../lib/savePdf';
import { paneSrc, WORK_PANE } from '../lib/pane';
import { ReplyCharts, ReportDocument } from './AiOutputs';
import { textDocument } from '../lib/data/outputs';
import { visualsOf, type VisualOutputs } from './visualWork';

export function ArtifactPreview({ artifact, cid, context, visible }: { artifact: HtmlArtifact; cid: string; context: () => CapCtx; visible: boolean }) {
  const [status, setStatus] = useState('');
  const refresh = useRef<() => void>();
  useEffect(() => {
    if (artifact.tracking !== 'live' || !visible) return;
    let closed = false, running = false, again = false;
    let timer: number | undefined;
    const queue = () => {
      if (closed || document.hidden) return;
      if (running) { again = true; return; }
      if (timer === undefined) timer = window.setTimeout(() => { timer = undefined; void check(); }, 1000);
    };
    const check = async (force = false) => {
      if (closed || running || document.hidden) return;
      running = true;
      try {
        await refreshDashboard(context(), cid, artifact.id, false, force);
        if (!closed) setStatus('Checked ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      } catch (e) {
        if (!closed) setStatus('Showing the last saved data. ' + (e instanceof Error ? e.message : 'Source unavailable.'));
      } finally {
        // This effect runs one refresh at a time. A source change during a read schedules one more check.
        running = false; // eslint-disable-line require-atomic-updates
        if (again) { again = false; queue(); }
      }
    };
    refresh.current = () => { if (!running) { setStatus('Checking source data…'); void check(true); } };
    setStatus('Checking source data…');
    void check();
    const unsub = onDataChange(queue);
    const interval = window.setInterval(queue, 60000);
    window.addEventListener('focus', queue);
    document.addEventListener('visibilitychange', queue);
    return () => { refresh.current = undefined; closed = true; unsub(); window.clearInterval(interval); window.clearTimeout(timer); window.removeEventListener('focus', queue); document.removeEventListener('visibilitychange', queue); };
  }, [artifact.id, artifact.tracking, cid, context, visible]);

  const [preview, setPreview] = useState('');
  useEffect(() => {
    // A standalone URL keeps section navigation inside the saved file, including on a phone.
    let closed = false, url = '';
    void illustratedArtifact(artifact, cid).then(file => {
      if (closed) return;
      url = URL.createObjectURL(new Blob([file.html], { type: 'text/html;charset=utf-8' }));
      setPreview(url);
    });
    return () => { closed = true; if (url) URL.revokeObjectURL(url); };
  }, [artifact, cid]);
  return <div className="luna-art-preview">
    <div className="luna-art-tools"><span role="status">{artifact.tracking === 'live' ? 'Live · ' + (status || 'Checking source data…') : 'Saved in Artifacts'}</span>{artifact.tracking === 'live' && <button type="button" className="linkish" onClick={() => refresh.current?.()}>Refresh now</button>}<button className="linkish" type="button" onClick={async () => void deliverBlob(await downloadableArtifact(artifact, cid), artifact.title.replace(/[\\/:*?"<>|]/g, ' ') + '.html', { keep: false })}>{artifact.tracking === 'live' ? 'Download live HTML' : 'Download HTML'}</button></div>
    {preview && <iframe title={artifact.title} sandbox="allow-same-origin" src={preview} data-artifact-preview={artifact.id} />}
  </div>;
}

export function VisualWorkspace({ turn, request, outs, conversationId, onDashboard }: {
  turn: ColleagueTurn; request: string; outs: VisualOutputs; conversationId?: string; onDashboard: (document: boolean) => void;
}) {
  const visual = visualsOf(turn, request, outs);
  const documentOnly = !visual.charts.length && !visual.forms.length && visual.reports.length === 1 && textDocument(visual.reports[0]);
  const [index, setIndex] = useState(0);
  const groups = [
    ...(visual.charts.length ? [{ title: 'Graphs', body: <ReplyCharts request={request} steps={turn.used ?? []} results={outs.results} charts={outs.charts} /> }] : []),
    ...visual.reports.map(report => ({ title: report.title, body: <ReportDocument report={report} results={outs.results} charts={outs.charts} conversationId={conversationId} /> })),
    ...visual.forms.map(ref => ({ title: ref.label, body: <iframe className="ai-work-f" name={WORK_PANE} src={paneSrc(ref.href)} title={ref.label} /> })),
  ];
  const active = Math.min(index, groups.length - 1);
  return <div className="luna-visual-work">
    {groups.length > 1 && <nav className="lm-graph-nav" aria-label="Choose a visual">{groups.map((g,i) => <button type="button" key={i} aria-pressed={active === i} onClick={() => setIndex(i)}>{g.title}</button>)}</nav>}
    {groups[active]?.body ?? <p>These visuals are no longer available.</p>}
    {(visual.charts.length > 0 || visual.reports.length > 0) && <button type="button" className="btn" onClick={() => onDashboard(documentOnly)}>{documentOnly ? 'Save HTML' : 'Make HTML dashboard'}</button>}
  </div>;
}
