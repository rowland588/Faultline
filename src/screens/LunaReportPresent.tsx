/* PRESENT — a conversational report full screen for the room (23 November, docs/LUNA-ROOM.md M4; docs/LUNA-ABILITIES.md M1–M4).
 *
 * The report the conversation made through build_report, with its charts and tables as the app already draws them — not a second
 * reading. Voice uses the same AI Mode conversation (colleague/VoiceMode, lunaPanel talkToLuna). Session focus on the conversation
 * (facts.sessionFocus) tells Luna what is on screen (M1). */
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
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
  const reportForm = report?.form;
  const [slides, setSlides] = useState(false);
  const [slide, setSlide] = useState(0);
  const touchX = useRef<number | null>(null);
  const slideCount = (report?.sections.length ?? 0) + 1;
  const changeSlide = useCallback((delta: number) => setSlide(i => Math.min(Math.max(0, i + delta), slideCount - 1)), [slideCount]);
  useEffect(() => { setSlides(reportForm === 'presentation'); setSlide(0); }, [reportId, reportForm]);

  useEffect(() => {
    if (!cid || !reportId || reportVersion === undefined) return;
    void setSessionFocus(patchStudy, cid, { reportId, version: reportVersion });
    return () => { void clearSessionFocus(patchStudy, cid); };
  }, [cid, reportId, reportVersion]);

  /* Voice uses the same conversation beside the report (docs/LUNA-ROOM.md M4, docs/VOICE.md): panel open so LunaHost shows the voice bar. */
  useEffect(() => {
    if (!cid || !reportId || !reportForm) return;
    setLunaPanel('min');
    if (reportForm !== 'presentation') talkToLuna();
  }, [cid, reportId, reportForm]);

  const exit = useCallback(() => {
    const q = new URLSearchParams();
    if (cid) q.set('c', cid);
    nav(q.size ? `/ai?${q}` : '/ai');
  }, [cid]);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { exit(); return; }
      if (!slides || (e.target instanceof HTMLElement && e.target.closest('input, textarea, [contenteditable="true"]'))) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); changeSlide(1); }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); changeSlide(-1); }
      if (e.key === 'Home') { e.preventDefault(); setSlide(0); }
      if (e.key === 'End') { e.preventDefault(); setSlide(slideCount - 1); }
    };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [exit, slides, changeSlide, slideCount]);

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
          <button type="button" className="btn" data-present-slides onClick={() => { setSlides(v => !v); setSlide(0); }}>{slides ? 'Read report' : 'Play slides'}</button>
          <button type="button" className="btn btn-primary" data-voice-present data-voice-mic-present onClick={talk} title="Talk with Luna while the report stays on screen — microphone stays available here">
            <Icon name="wave" size="1.05em" />Talk
          </button>
          <button type="button" className="btn" data-conversation-present onClick={() => enterConversationMode({ conversationId: cid })} title="Conversation mode — voice only, full screen">Conversation</button>
          <button type="button" className="lr-present-exit" onClick={exit} aria-label="Exit Present (Escape)">×</button>
        </div>
      </div>
      <div className={'lr-present-body' + (slides ? ' is-slides' : '')} onTouchStart={e => { touchX.current = e.touches[0]?.clientX ?? null; }} onTouchEnd={e => {
        if (!slides || touchX.current === null) return;
        const distance = touchX.current - (e.changedTouches[0]?.clientX ?? touchX.current);
        touchX.current = null;
        if (Math.abs(distance) > 70) changeSlide(distance > 0 ? 1 : -1);
      }}>
        {slides ? <div className="lr-slide" key={`${report.id}@${report.version}:${slide}`} data-slide={slide}>
          {slide === 0 ? <div className="lr-slide-cover"><p className="lr-present-k">{report.form === 'presentation' ? 'Presentation' : 'Report'}</p><h1>{report.title}</h1><p className="sub">{report.sections.length} sections · version {report.version}</p></div>
            : <ReportPresentBody report={report} results={outs.results} charts={outs.charts} sectionIndex={slide - 1} animated />}
        </div> : <ReportPresentBody key={`${report.id}@${report.version}`} report={report} results={outs.results} charts={outs.charts} />}
      </div>
      {slides && <nav className="lr-slide-controls" aria-label="Presentation slides">
        <button type="button" className="btn" disabled={slide === 0} onClick={() => changeSlide(-1)}>Previous</button>
        <div className="lr-slide-progress"><span aria-live="polite">{slide + 1} of {slideCount}</span><progress max={slideCount} value={slide + 1} aria-label="Presentation progress" /></div>
        <button type="button" className="btn btn-primary" disabled={slide >= slideCount - 1} onClick={() => changeSlide(1)}>Next</button>
      </nav>}
    </div>
  );
}
