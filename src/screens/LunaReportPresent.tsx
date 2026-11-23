/* PRESENT — a conversational report full screen for the room (23 November, docs/LUNA-ROOM.md M4; docs/LUNA-ABILITIES.md M1–M4).
 *
 * The report the conversation made through build_report, with its charts and tables as the app already draws them — not a second
 * reading. Voice uses the same AI Mode conversation (colleague/VoiceMode, lunaPanel talkToLuna). Session focus on the conversation
 * (facts.sessionFocus) tells Luna what is on screen (M1). */
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { dataVersion, getStudy, onDataChange, patchStudy } from '../db';
import { outputsOfConversation } from '../capabilities/data';
import { ReportPresentBody } from '../colleague/AiOutputs';
import { clearSessionFocus, isConversation, setSessionFocus } from '../colleague/conversation';
import { enterConversationMode, setLunaPanel, talkToLuna } from '../colleague/lunaPanel';
import { Icon } from '../ui/Icon';
import { nav, useRoute } from '../state/useRoute';
import type { ToolStudy } from '../lib/study';
import type { Chart, ConvReport, DataResult } from '../lib/data/outputs';

export function LunaReportPresent() {
  const route = useRoute();
  const cid = route.query.get('c') ?? '';
  const reportId = route.query.get('reportId') ?? '';
  const [study, setStudy] = useState<ToolStudy | null>(null);
  const dataGen = useSyncExternalStore(onDataChange, dataVersion, () => 0);
  const load = useCallback(async () => {
    if (!cid) { setStudy(null); return; }
    const s = await getStudy(cid);
    setStudy(s && isConversation(s) ? s : null);
  }, [cid]);
  useEffect(() => { void load(); }, [load, dataGen]);

  const outs = useMemo(() => {
    if (!study) return null;
    const o = outputsOfConversation(study);
    return {
      results: new Map(o.results.map((r: DataResult) => [r.id, r])),
      charts: new Map(o.charts.map((c: Chart) => [c.id, c])),
      reports: o.reports,
    };
  }, [study]);

  const report: ConvReport | undefined = outs?.reports.find(r => r.id === reportId);
  const reportVersion = report?.version;

  useEffect(() => {
    if (!cid || !reportId || reportVersion === undefined) return;
    void setSessionFocus(patchStudy, cid, { reportId, version: reportVersion });
    return () => { void clearSessionFocus(patchStudy, cid); };
  }, [cid, reportId, reportVersion]);

  /* Voice uses the same conversation beside the report (docs/LUNA-ROOM.md M4, docs/VOICE.md): panel open so LunaHost shows the voice bar. */
  useEffect(() => {
    if (!cid || !reportId) return;
    setLunaPanel('min');
    talkToLuna();
  }, [cid, reportId]);

  const exit = useCallback(() => {
    const q = new URLSearchParams();
    if (cid) q.set('c', cid);
    nav(q.size ? `/ai?${q}` : '/ai');
  }, [cid]);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') exit(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [exit]);

  if (!cid || !reportId) {
    return (
      <div className="lr-present" data-luna-present data-luna-present-missing>
        <button type="button" className="lr-present-exit" onClick={exit} aria-label="Back to Luna">×</button>
        <p className="lr-present-none">Say which conversation and report to show — open Present from the report’s card in Luna.</p>
        <button type="button" className="btn btn-primary" onClick={exit}>Back to Luna</button>
      </div>
    );
  }

  if (!study || !report || !outs) {
    return (
      <div className="lr-present" data-luna-present data-luna-present-loading>
        <button type="button" className="lr-present-exit" onClick={exit} aria-label="Back to Luna">×</button>
        <p className="sub lr-present-none">{!study ? 'That conversation is not here.' : 'That report is not in this conversation.'}</p>
        <button type="button" className="btn" onClick={exit}>Back to Luna</button>
      </div>
    );
  }

  const talk = () => {
    talkToLuna();
  };

  return (
    <div className="lr-present" data-luna-present data-report-present={report.id} data-report-version={report.version} data-tv-present>
      <p className="lr-present-cast sub">On a TV: open this address in the room browser, or cast the screen (Chrome Cast / HDMI). No separate TV app.</p>
      <div className="lr-present-top">
        <p className="lr-present-k">{report.form === 'presentation' ? 'Presentation' : 'Report'} · version {report.version}</p>
        <div className="lr-present-acts">
          <button type="button" className="btn btn-primary" data-voice-present data-voice-mic-present onClick={talk} title="Talk with Luna while the report stays on screen — microphone stays available here">
            <Icon name="wave" size="1.05em" />Talk
          </button>
          <button type="button" className="btn" data-conversation-present onClick={() => enterConversationMode({ conversationId: cid })} title="Conversation mode — voice only, full screen">Conversation</button>
          <button type="button" className="btn" onClick={exit}>Chat</button>
          <button type="button" className="lr-present-exit" onClick={exit} aria-label="Exit Present (Escape)">×</button>
        </div>
      </div>
      <div className="lr-present-body">
        <ReportPresentBody key={`${report.id}@${report.version}`} report={report} results={outs.results} charts={outs.charts} />
      </div>
    </div>
  );
}