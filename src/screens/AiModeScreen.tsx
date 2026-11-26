import type { ReportSection } from '../lib/data/outputs';
import { allFilesSelected, authorBrief, hasSourceContent, namesFile, pickAuthorSources, requestedPhotoLabels, selectedRead, scopedOutput, selectPhotoTurns, sourceQuestion, type AuthorSource } from '../colleague/documentGrounding';
import { textDocument } from '../lib/data/outputs';
import { documentPurpose, exportWrittenDocument, htmlDocumentRequest, libraryDocument, reportTopicQuestion, trainingDraftGap, visualRevision, writeDocumentDraft, writingFromReply, writingGuidance } from '../colleague/knowledgeDocuments';
import { connectDashboardWorkbook, DashboardLinkNeeded, freezeDashboard, refreshDashboard, trackingAnswer } from '../colleague/dashboardTracking';
import { ArtifactPreview, VisualWorkspace } from '../colleague/VisualWorkspace';
import { artifactRef, dashboardFromChat, dashboardRequest, galleryRef, requestByReply, savedDashboardWords, visualsOf, type VisualOutputs, type WorkRef } from '../colleague/visualWork';
import { htmlArtifactsOf, type HtmlArtifact } from '../colleague/htmlArtifacts';
import { LunaGlobe } from '../colleague/LunaGlobe';
import { legacyWorkbookReceipt } from '../colleague/workbookReceipt';
import {LocationControl} from '../ui/LocationPicker';
import {workLocation,placeLunaSubject,resumeLunaSubject} from '../lib/workLocation';
import {isAreaPlace} from '../lib/areaPlace';
import type {Workspace as LocationWorkspace} from '../types';
import { historyState } from '../state/navHistory';
import { ActionsFromSource, CreateAction } from '../ui/ActionFollowUp';
import type { ActionSource } from '../lib/actionSources';
/* AI MODE — the conversation with the colleague (8 November; the shared contract §3; src/colleague).
 *
 * Rowland, 8 November: two modes over ONE application. Manual Mode is the app as built and needs no AI; AI Mode is a
 * conversation in which Claude works Faultline only through the approved capabilities (src/capabilities) — the same
 * readers, tool modules and writers the pages use. So this page is a working conversation, not a chat toy:
 *   centre   the conversation — the person's words, photos and talk; the colleague's answer with, under it, every step it
 *            took ("Problems on the register — 4 open on Line 3", the records as chips that open Manual Mode), a figure
 *            it was not sure of as Check this, and up to three follow-ups; a WRITE as a card — what it will do, Do it ·
 *            Not now — and nothing writes without the tap;
 *   left     (a desk) the hamburger drawer — New chat, Chats, Projects (Luna work folders), Library (files);
 *   right    (a desk; a sheet on a phone) the CONTEXT: what it is on now (the thread, its place as chips, its notes each
 *            saying how it is known), what is parked (Back to this), and the Sources — every record read or changed.
 * The composer is Line Talk's (tools/talk/hearing — the phone's own speech recognition — and talkPictures for photos).
 * Opened from a line or a project (#/ai?line= / ?project=) a new conversation starts there. Off (the account menu's
 * switch), it says so with the way to turn it on.
 *
 * WHICH RECORD: a study of tool `talk`, facts.colleague (no new table). WHERE IT SHOWS: here; the door is the top bar's
 * Ask Luna (src/colleague/AiDoor), never a line of the menu. */
import { createContext, useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from 'react';
import { deskWide, OPEN_EVENT, peekPendingOpen, setLunaPanel, takePendingOpen, SAY_EVENT, peekPendingSay, takePendingSay, VOICE_EVENT, takePendingVoice } from '../colleague/lunaPanel';
import { isEnvRoute, onChats, onShowInEnvironment, openEverything } from '../colleague/environment';
import { scopeOf } from '../lib/scope';
import { conversationFocus, drawWhatWasAsked, earlierResults, noteConfirmed, prepareCall, recordStep } from '../colleague/turnRules';
import { createPortal } from 'react-dom';
import { LUNA_BAR_SLOT } from '../ui/ContextBar';
import { getStudy, listAllStudies, listWorkspaces, onDataChange, patchStudy, putBlob, putStudy } from '../db';
import { useSession } from '../cloud/session';
import { displayName } from '../cloud/team';
import { useAccess } from '../cloud/access';
import { uid } from '../lib/ids';
import { niceDay, todayISO } from '../lib/weeks';
import { nav, navReplace, useRoute, type Route } from '../state/useRoute';
import { useFactoryLines } from '../lib/useFactoryLines';
import { useProjects } from '../lib/useProjects';
import { Icon, type IconName } from '../ui/Icon';
import { MoreMenu, type MoreItem } from '../ui/parts';
import { Fold } from '../ui/Fold';
import { Sheet, SheetRow } from '../ui/Sheet';
import { PreferencesSheet } from '../ui/PreferencesSheet';
import { preferencesText } from '../lib/preferences';
import { Ear, NOTHING_HEARD, joinWords, recognitionOf, troubleSaid, type Trouble } from '../tools/talk/hearing';
import { pictureForAssistant } from '../tools/talk/talkPictures';
import { photoLabels } from '../tools/talk/talk';
import { TALK_LIMITS } from '../tools/talk/talkAssist';
import { useBlobUrl } from '../lib/useBlobUrl';
import { capabilityByName, previewCall, runCall } from '../capabilities/registry';
import { approveJobWrites } from '../capabilities/job';
import type { CapCall, CapCtx, CapRef, ColleagueDraft, ColleagueJob } from '../capabilities/types';
import { JobList } from '../colleague/JobList';
import { KeepUpNews } from '../colleague/KeepUpNews';
import { ServerJobNews } from '../colleague/ServerJobNews';
import { handOpenJobToServer } from '../colleague/serverJobHandoff';
import { serverJobSaid, shouldHandOff, type ServerJobRow } from '../colleague/serverJobClient';
import { StandingDigestNews } from '../colleague/StandingDigestNews';
import { jobOpen, jobStands, stepsOpenSaid } from '../colleague/job';
import { runningMeasure } from '../capabilities/operate';
import { fastCall } from '../colleague/fastPath';
import { helloSaid } from '../colleague/hello';
import { greetName } from '../lib/greetName';
import { usedOf } from '../colleague/turnRules';
import { evidenceFor, nextStep, routeOfTask, type TaskStep } from '../capabilities/task';
import { WORK_PANE, paneSrc } from '../lib/pane';
import { WorkContext, EnvStart } from '../colleague/WorkContext';
import { captured, metricsOf, missing, toolTitle, valueWords } from '../capabilities/drafts';
import { studyHref } from '../lib/studyLinks';
import { can as canAt } from '../lib/access';
import {
  HOW_WORD, MODE_WORD, WHO, workedInCode, appendAction, appendTurn, changeThreads, changeTurn, conversationTitle, currentThread, factsOfConversation, gatewayTurns,
  isConversation, newConversation, parkedThreads, setCurrent, setSessionFocus, sourcesOf, turnsOfConversation, unansweredTurns, uniqueRefs,
  type ColleagueTurn, type Thread, type ThreadScope, type Used,
} from '../colleague/conversation';
import { JOB_WRITES_BATCH, colleagueLoop, invokeColleague, type Prepared, type Step } from '../colleague/colleagueAsk';
import { fastChatKind } from '../tools/colleague/colleagueAssist';
import { aiModeOn, setAiMode, useAiMode, useDeviceFlag } from '../colleague/aiMode';
import { CONVERSATION_KEY, SPEAK_KEY, canSpeak, inEchoWindow, isSpeaking, onSpeaking, saidLately, queueActive, queueClose, queuePush, queueStart, speak, stopSpeaking, warmVoice } from '../colleague/voice';
import { conversationAct, reportInputOf } from '../colleague/acts';
import { VoiceMode } from '../colleague/VoiceMode';
import { ConversationMode } from '../colleague/ConversationMode';
import { enterConversationMode } from '../colleague/lunaPanel';
import { forSpeech, isEcho, isEchoTail, nextChunks, turnEnd, turnWait, voiceCommand, voiceStep } from '../colleague/speech';
import { navigationIntent, projectMatches } from '../colleague/voiceNavigation';
import { listenWhileSpeaking, useAudioRoute, useVoicePrefs } from '../colleague/voicePrefs';
import {
  EARCON_KEY, FLOOR_LIMIT, HeadsetButton, SAY_TO_ANSWER, ScreenKeeper, buttonSaid, cardPrompt, earcon, floorCheck, jobBatchCardPrompt, keepSaid, phaseOf, pressAction,
  realEnv, reopenAfterSpeech, shouldBargeIn, spokenAnswer, unspoken, type ButtonState, type CheckItem, type KeepState,
} from '../colleague/floor';
import { leftSaid, useTimers } from '../colleague/timers';
import { useReminders } from '../colleague/reminders';
import type { ToolStudy } from '../lib/study';
import type { CapResult } from '../capabilities/types';
import { factoryDraftFor, takeDocument } from '../capabilities/factoryBuild';
import type { FactoryOp } from '../capabilities/factoryDraft';
import { readFactoryDocument } from '../colleague/factorySource';
import { keepMachineDoc, type DocKind } from '../lib/manual/store';
import { machineOntoLine } from '../lib/lines';
import { settleWorkbooks } from '../capabilities/workbook';
import { workbooks, workbookId, type Progress } from '../lib/workbook/client';
import type { ColleagueWorkbook } from '../capabilities/types';
import { FactoryDocSheet, FactoryDraftBox, type DocPicked } from '../colleague/AiFactory';
import { photoSaid, placeSaid, type WalkFacts, type WalkStop, type WalkTurn } from '../lib/walk';
import { VideoRecorder, videoCaptureSupported } from '../tools/video/VideoRecorder';
import { allSources, outputsOfConversation, ownerFor } from '../capabilities/data';
import { keepWorkbookFile } from '../lib/workbook/carry';

import { ChartCard, ReplyCharts, ReportCard, ReportDocument, ResultTable } from '../colleague/AiOutputs';
import { figuresSaid, markFigures } from '../colleague/figureCheck';
import { liveEntries, readNotebooks, strikeMeaning, type Notebook } from '../colleague/notebook';
import { getWorkspace } from '../db/workspaces';
import { activeClientNow } from '../lib/activeClient';
import { dashboardAsked, GRAPH_OFFER, graphAsked, graphsRequested, resultToDraw } from '../colleague/autoChart';
import { MicrosoftPicker } from '../colleague/MicrosoftPicker';
import { LunaFiles } from '../colleague/LunaFiles';
import { LunaDrawer } from '../colleague/LunaDrawer';
import { customerOfFolder, folderIdOf, isLunaFolder } from '../colleague/lunaFolder';
import { sayReceipt, attachWorkbook, attachWorkbooks, importDowntime } from '../colleague/attachWorkbook';
import type { FileOrigin, Source } from '../lib/data/sources';
import { changedSaid } from '../colleague/knows';
import { ConnectSheet, type ConnectStep } from '../colleague/ConnectSheet';
import { WhoseSheet } from '../colleague/WhoseSheet';
import { ConnectionAbilities } from '../colleague/ConnectionAbilities';
import type { ConnectionKind } from '../lib/data/connectionAbilities';
import { fetchLink, fileLinkIn, linkKind } from '../lib/fileLink/link';
import { LINK_FILE_EVENT, takeLink } from '../lib/fileLink/pending';

const hhmm = (ms: number) => new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
const longDay = () => new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const QUIET_MS = 6000;
/** How long after Luna stops before the microphone opens again (her speaker still ringing, its end said a little early). */
const REOPEN_AFTER_MS = 600;
/** How long words judged to be Luna's own are remembered, for their end arriving late. */
const ECHO_LATE_MS = 4000;
const isDesk = () => { try { return window.matchMedia('(min-width: 1100px)').matches; } catch { return true; } };

/* ======================================================================== the page */

/** AI Mode's screen. Mounted once by colleague/LunaHost and kept alive across the app (docs/LUNA-WORKSPACE.md W1): `route` is the last
 *  address it was shown at, `shown` whether it is on screen now (it writes the address only then), `slot` where it is drawn. With AI
 *  Mode off the router draws it alone, saying so. */
export function AiModeScreen({ route: given, shown = true, slot = 'page', page, hall = false }: { route?: Route; shown?: boolean; slot?: 'page' | 'panel'; page?: Route; hall?: boolean } = {}) {
  const here = useRoute();
  const route = given ?? here;
  const on = useAiMode();
  /* beside a page (the panel, docs/LUNA-WORKSPACE.md W2): the page's line or project starts a new conversation, and Luna is told what
     is on the screen beside her */
  const pageScope = page ? scopeOf(page) : undefined;
  const lines = useFactoryLines();
  const { projects } = useProjects();
  const lineQ = route.query.get('line') ?? '';
  const projectQ = route.query.get('project') ?? '';
  const [all, setAll] = useState<ToolStudy[] | null>(null);
  const [folders, setFolders] = useState<ToolStudy[] | null>(null);
  const load = useCallback(async () => {
    const studies = await listAllStudies();
    setAll(studies.filter(isConversation).sort((a, b) => b.updatedAt - a.updatedAt));
    setFolders(studies.filter(isLunaFolder).sort((a, b) => b.updatedAt - a.updatedAt));
  }, []);
  useEffect(() => { void load(); return onDataChange(() => void load()); }, [load]);
  /* WHICH CONVERSATION — the one the address names, else a new one; a session key keeps a conversation's working state
     while its first Send makes its record (the address is then quietly given its id, for a reload) */
  const [open, setOpen] = useState<{ key: string; id?: string }>(() => { const asked = route.query.get('c') ?? peekPendingOpen(); return { key: uid(), ...(asked ? { id: asked } : {}) }; });
  const folderQ = route.query.get('folder') ?? '';
  const [viewFolder, setViewFolder] = useState<string | undefined>(() => folderQ || undefined);
  const [listSheet, setListSheet] = useState(false);
  /* 24 November — ChatGPT ☰ left drawer: past conversations one click. At a desk the list is open by default (kept if the person puts it
     away); on a phone the env bar’s hamburger opens the same list as a left drawer. Never buried in ⋯. */
  const [listOn, setListOn] = useState(() => {
    try {
      const v = localStorage.getItem('fl-ai-list');
      if (v === '0') return false;
      if (v === '1') return true;
    } catch { /* this visit */ }
    return typeof window !== 'undefined' && window.matchMedia('(min-width: 1100px)').matches;
  });
  const showList = useCallback((busy: boolean) => {
    if (busy || slot !== 'page' || !deskWide()) { setListSheet(true); return; }
    setListOn(v => {
      const next = !v;
      try { localStorage.setItem('fl-ai-list', next ? '1' : '0'); } catch { /* this visit */ }
      return next;
    });
  }, [slot]);
  useEffect(() => onChats(() => showList(false)), [showList]);
  const shownRef = useRef(shown); shownRef.current = shown;
  const slotRef = useRef(slot); slotRef.current = slot;
  /* a conversation asked for from a page (the case file's Continue with Luna, W4) — opened in the panel */
  useEffect(() => { takePendingOpen(); }, []);
  useEffect(() => {
    const on = (e: Event) => { const id = (e as CustomEvent<string>).detail; takePendingOpen(); if (id) setOpen(o => (o.id === id ? o : { key: uid(), id })); };
    window.addEventListener(OPEN_EVENT, on);
    return () => window.removeEventListener(OPEN_EVENT, on);
  }, []);
  /* a conversation named by the address while the screen is alive (a link to #/ai?c=…, the exam's Open the exam conversation) — opened */
  const cQ = route.query.get('c') ?? '';
  const lastC = useRef(cQ);
  useEffect(() => {
    if (cQ && cQ !== lastC.current && cQ !== open.id) setOpen({ key: uid(), id: cQ });
    lastC.current = cQ;
  }, [cQ, open.id]);
  const lastFolder = useRef(folderQ);
  useEffect(() => {
    if (folderQ !== lastFolder.current) setViewFolder(folderQ || undefined);
    lastFolder.current = folderQ;
  }, [folderQ]);
  /* arriving from another line or project while AI Mode is open (the door pressed on a line's page with the page kept): a new
     conversation on it — never the one in hand carried on under a place it was not about (9 November) */
  const placeQ = lineQ || projectQ ? `${lineQ}|${projectQ}` : '';
  const lastPlace = useRef(placeQ);
  useEffect(() => {
    if (placeQ && placeQ !== lastPlace.current) setOpen({ key: uid() });
    lastPlace.current = placeQ || lastPlace.current;
  }, [placeQ]);
  const panelLine = slot === 'panel' && pageScope?.kind === 'line' ? pageScope.wsId : '';
  const panelProject = slot === 'panel' && pageScope?.kind === 'project' ? pageScope.projectId : '';
  const start = useMemo((): { title: string; scope: ThreadScope } | undefined => {
    if (panelLine) { const l = lines.find(x => x.id === panelLine); return l ? { title: l.name, scope: { lineId: l.id } } : undefined; }
    if (panelProject) { const p = projects.find(x => x.id === panelProject); return p ? { title: p.name, scope: { projectId: p.id } } : undefined; }
    if (lineQ) { const l = lines.find(x => x.id === lineQ); return l ? { title: l.name, scope: { lineId: l.id } } : undefined; }
    if (projectQ) { const p = projects.find(x => x.id === projectQ); return p ? { title: p.name, scope: { projectId: p.id } } : undefined; }
    return undefined;
  }, [lineQ, projectQ, panelLine, panelProject, lines, projects]);

  if (!on) {
    return (
      <div className="wrap ai-off" data-ai-off>
        <h1 className="pace-title">AI Mode is off</h1>
        <p className="pace-lede">Faultline works the same without it — every page, tool and paper is here in Manual Mode. Turned on, Luna — Faultline’s AI colleague — sits in the top bar as Ask Luna: she reads the lines, problems and tools for you, and changes nothing until you say so.</p>
        <button type="button" className="btn btn-primary" onClick={() => setAiMode(true)}><Icon name="spark" size="1.05em" />Turn AI Mode on</button>
      </div>
    );
  }

  const pick = (id?: string) => {
    const chat = id ? all?.find(s => s.id === id) : undefined;
    if (chat) setViewFolder(folderIdOf(chat));
    setOpen({ key: uid(), ...(id ? { id } : {}) });
    setListSheet(false);
    if (shownRef.current && slotRef.current === 'page') {
      const href = id ? `#/ai?c=${encodeURIComponent(id)}` : viewFolder && !chat ? `#/ai?folder=${encodeURIComponent(viewFolder)}` : '#/ai';
      try { history.replaceState(historyState(), '', href); } catch { /* the page still follows */ }
    }
  };
  const openFolder = (id?: string) => {
    setViewFolder(id);
    if (shownRef.current && slotRef.current === 'page') {
      const href = open.id
        ? `#/ai?c=${encodeURIComponent(open.id)}`
        : id ? `#/ai?folder=${encodeURIComponent(id)}` : '#/ai';
      try { history.replaceState(historyState(), '', href); } catch { /* the page still follows */ }
    }
  };
  const list = <LunaDrawer all={all} folders={folders} openId={open.id} viewFolder={viewFolder} onPick={pick} onArtifact={(cid, aid) => { pick(cid); nav('/ai?c=' + encodeURIComponent(cid) + '&work=' + encodeURIComponent('artifact:' + aid)); }} onOpenFolder={openFolder} onGone={id => { if (id === open.id) pick(); }} exit={slot === 'page'} />;
  const pageName = pageScope?.kind === 'line' ? lines.find(x => x.id === pageScope.wsId)?.name : pageScope?.kind === 'project' ? projects.find(x => x.id === pageScope.projectId)?.name : undefined;
  const screen = slot === 'panel' && page ? `${pageName ? `${pageName} — ` : ''}the page at ${typeof window !== 'undefined' ? window.location.hash : ''}${pageScope?.kind === 'line' ? ` [line ${pageScope.wsId}]` : pageScope?.kind === 'project' ? ` [project ${pageScope.projectId}]` : ''}` : undefined;
  const full = () => { setLunaPanel('closed'); nav(open.id ? `/ai?c=${encodeURIComponent(open.id)}` : panelLine ? `/ai?line=${encodeURIComponent(panelLine)}` : panelProject ? `/ai?project=${encodeURIComponent(panelProject)}` : '/ai'); };
  if (hall) {
    const exitHall = () => nav(open.id ? `/ai?c=${encodeURIComponent(open.id)}` : '/ai');
    return (
      <LunaPlace.Provider value="page">
        <Conversation key={open.key} id={open.id} start={open.id ? undefined : start} screen={screen} shown hall onHallExit={exitHall}
          onMade={id => {
            setOpen(o => ({ ...o, id }));
            if (shownRef.current) try { history.replaceState(historyState(), '', `#/ai/conversation?c=${encodeURIComponent(id)}`); } catch { /* visit */ }
          }}
          onList={() => { /* hall: thread in ConversationMode sheet */ }}
          onNew={() => pick()} />
      </LunaPlace.Provider>
    );
  }
  return (
    <LunaPlace.Provider value={slot}>
    <div className={'ai' + (slot === 'panel' ? ' is-panel' : '') + (listOn && slot === 'page' ? ' is-list' : '')} data-ai data-ai-slot={slot}>
      <aside className="ai-list" aria-label="Chats">{listSheet ? null : list}</aside>
        <Conversation key={open.key} id={open.id} folderId={viewFolder} start={open.id ? undefined : start} screen={screen} shown={shown} dock={slot === 'panel' ? { onFull: full, onClose: () => setLunaPanel('closed') } : undefined} onMade={id => {
        setOpen(o => ({ ...o, id }));
        /* the address is the conversation's only while it is the page on screen — never another page's address rewritten */
        if (shownRef.current && slotRef.current === 'page' && /^#\/ai(\?|$)/.test(window.location.hash)) try { history.replaceState(historyState(), '', `#/ai?c=${encodeURIComponent(id)}`); } catch { /* kept for this visit */ }
      }} onList={showList} listOn={listOn && slot === 'page'} onNew={() => pick()} />
      <Sheet open={listSheet} onClose={() => setListSheet(false)} title="Chats" side={slot === 'page' ? 'left' : undefined}>{list}</Sheet>
    </div>
    </LunaPlace.Provider>
  );
}

/** Where Luna is drawn — the page (#/ai) or the panel beside a page; a record's chip and the work follow it (W2). */
const LunaPlace = createContext<'page' | 'panel'>('page');

/** A record opened from the conversation: the page itself becomes the work and Luna stays — beside it on a desk, a bar at the foot on a
 *  phone (docs/LUNA-WORKSPACE.md W2). Never navigates her away. */
function openAsWork(href: string): void {
  setLunaPanel(deskWide() ? 'open' : 'min');
  nav(href);
}


/* ================================================================ one conversation */

type Said = { text: string; bad?: boolean } | null;

/** THE SLIM SETTINGS MENU IN THE ENV BAR (24 November — ChatGPT chrome). Luna’s page draws Settings · Everything · Recent work ·
 *  Turn AI Mode off into the frame’s top bar (ui/ContextBar’s slot) on desk and phone, so the conversation header never holds a
 *  catalogue of capabilities. Null in the panel beside a page, or when the page is parked. */
function useLunaBarSlot(on: boolean): HTMLElement | null {
  const [el, setEl] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => {
    if (!on) { setEl(null); return; }
    let n = 0;
    let t = 0;
    const read = () => {
      const found = document.getElementById(LUNA_BAR_SLOT);
      setEl(found);
      if (!found && n++ < 20) t = window.setTimeout(read, 50);
    };
    read();
    return () => window.clearTimeout(t);
  }, [on]);
  return el;
}

function Conversation({ id, start, onMade, onList, listOn = false, onNew, screen, dock, shown = true, hall, onHallExit, folderId }: {
  id?: string; start?: { title: string; scope: ThreadScope }; onMade: (id: string) => void; onList: (busy: boolean) => void; onNew: () => void;
  /** A Luna work folder this new chat is started in — never a Faultline 6M/PDCA project. */
  folderId?: string;
  /** The conversations shown beside it at a desk (F2) — the button says so. */
  listOn?: boolean;
  /** Beside a page: what is on the screen beside the conversation, said to Luna with each turn. */
  screen?: string;
  /** Drawn as the panel beside a page: its way to full screen and to close. */
  dock?: { onFull: () => void; onClose: () => void };
  /** On screen now (a page or a panel), else parked while the person works elsewhere. */
  shown?: boolean;
  /** Conversation mode — Luna Hall: voice-first full viewport (docs/LUNA-ROOM.md §5 C1). */
  hall?: boolean;
  onHallExit?: () => void;
}) {
  const screenRef = useRef(screen); screenRef.current = screen;
  const barSlot = useLunaBarSlot(!dock && shown);
  const { session } = useSession();
  const email = session?.user.email ?? undefined;
  const me = displayName(email) || undefined;
  const lines = useFactoryLines();
  const [places,setPlaces]=useState<LocationWorkspace[]>([]);
  useEffect(()=>{let live=true,epoch=0;const load=()=>{const n=++epoch;void listWorkspaces().then(ws=>{if(live&&n===epoch)setPlaces(ws);});};load();const off=onDataChange(load);return()=>{live=false;off();};},[]);
  const { projects } = useProjects();
  const [study, setStudy] = useState<ToolStudy | null | undefined>(id ? undefined : null);
  const sid = useRef<string | undefined>(id);
  const reload = useCallback(async () => { if (sid.current) setStudy((await getStudy(sid.current)) ?? null); }, []);
  useEffect(() => { void reload(); return onDataChange(() => void reload()); }, [reload]);

  const facts = study ? factsOfConversation(study) : undefined;
  const turns = useMemo(() => {
    if (!facts) return [];
    const books = (facts as { workbooks?: ColleagueWorkbook[] }).workbooks ?? [];
    return turnsOfConversation(facts).map(t => {
      const text = legacyWorkbookReceipt(t, books);
      return text ? { ...t, text, workbookReceipt: true } : t;
    });
  }, [facts]);
  const requests = useMemo(() => requestByReply(turns), [turns]);
  const threads: Thread[] = useMemo(() => facts?.threads ?? (start ? [{ id: 'start', title: start.title, status: 'current', scope: start.scope, notes: [], refs: [], at: 0 }] : []), [facts, start]);
  const actions = useMemo(() => facts?.actions ?? [], [facts]);
  const cur = currentThread(threads);
  const requestedThread=useRoute().query.get('thread')??'';
  const resumedThread=useRef('');
  useEffect(()=>{if(!requestedThread){resumedThread.current='';return;}const key=`${study?.id}:${requestedThread}`;if(!study?.id||resumedThread.current===key||!threads.some(t=>t.id===requestedThread))return;resumedThread.current=key;void resumeLunaSubject(study.id,requestedThread);},[requestedThread,study?.id,threads]);
  const parked = parkedThreads(threads);
  const sources = useMemo(() => sourcesOf(turns, actions), [turns, actions]);
  const labels = useMemo(() => photoLabels(turns), [turns]);
  /* a project the conversation is on: the person's level there, as the screens know it — a client writes nothing */
  const projectHere = cur?.scope.projectId ?? '';
  const access = useAccess(projectHere);
  /* when the person's newest words were heard — a live measurement stamps its event then (docs/AI-OPERATING.md §4) */
  const saidAt = useRef<number | undefined>(undefined);
  /* THE WORK PANE (lib/pane): the real page the conversation is working on, beside it */
  const [work, setWork] = useState<WorkRef | null>(null);
  const [workOpen, setWorkOpen] = useState(false);
  const [chosen, setChosen] = useState<boolean | null>(() => { try { const v = localStorage.getItem('fl-ai-wide'); return v === null ? null : v !== '0'; } catch { return null; } });
  const [recentSheet, setRecentSheet] = useState(false);
  const panelRef = useRef(!!dock); panelRef.current = !!dock;
  /* beside a page on a desk, the page itself is the work — never a framed copy (W2); on #/ai and on a phone, the work pane as before */
  /* WHILE SHE WORKS A JOB ON A PHONE, HER PLAN STAYS IN VIEW (21 November, docs/LUNA-AGENT.md G1): what she makes part-way — a chart, a
     result — used to open over the conversation there, covering the list the person is watching tick. It is kept ready instead (the
     header's button shows it) and the conversation stays; at a desk, where there is room beside, it opens as it always did. What the
     person asks to see, and what is made outside a job, opens as before. */
  const jobWorking = useRef(false);
  jobWorking.current = jobOpen(cur?.job);
  const showWork = useCallback((r: WorkRef | undefined, o?: { /** made by a step of hers, not asked for by the person */ made?: boolean }) => {
    if (!r) return;
    /* a page of the app is the app’s own page in the main view — never a framed overlay over Luna (24 November) */
    if (r.kind === 'page' && r.href) { openAsWork(r.href); return; }
    if (panelRef.current && deskWide()) {
      if (r.href) { nav(r.href); return; }
      if (sid.current && (r.kind === 'chart' || r.kind === 'result' || r.kind === 'convreport' || r.kind === 'artifact' || r.kind === 'visuals')) {
        nav('/ai?c=' + encodeURIComponent(sid.current) + '&work=' + encodeURIComponent(r.kind + ':' + r.id));
        return;
      }
    }
    setWork(r);
    if (deskWide()) setChosen(false);
    if (o?.made && !deskWide() && (jobWorking.current || r.kind === 'visuals' || r.kind === 'artifact')) setWorkOpen(false);
    else setWorkOpen(true);
  }, [setChosen]);
  /* THE ENVIRONMENT: a page of the app is the app’s own page (openAsWork — W2, Luna stays beside). Everything destinations navigate
     themselves and close her panel, so they are never a framed copy over her. The work pane is for a result, a chart, a report. */
  const actionOutput=useRoute().query.get('work');
  const actionStudyId=study?.id;
  useEffect(()=>{if(!actionOutput || !actionStudyId)return; const [kind,...parts]=actionOutput.split(':'); if(kind==='chart' || kind==='convreport' || kind==='result' || kind==='artifact' || kind==='visuals')showWork({kind,id:parts.join(':'),label:'Saved output',href:''});},[actionOutput,actionStudyId,showWork]);
  const shownNow = useRef(shown); shownNow.current = shown;
  useEffect(() => onShowInEnvironment(w => { if (shownNow.current && !panelRef.current) showWork({ kind: 'page', id: w.href, label: w.label, href: w.href }); }), [showWork]);
  const ctx = useCallback((): CapCtx => ({
    now: Date.now(), ...(saidAt.current ? { saidAt: saidAt.current } : {}), ...(email ? { email } : {}), ...(me ? { me } : {}), ...(sid.current ? { conversationId: sid.current } : {}),
    ...(session?.user.id ? { userId: session.user.id } : {}), ...(projectHere ? { level: access.level } : {}),
  }), [email, me, session?.user.id, projectHere, access.level]);

  const nameOf = useCallback((kind:'line'|'project'|'problem'|'story',x:string)=>{
    if(kind==='line'){const w=places.find(w=>w.id===x);return w?workLocation(w).label:lines.find(l=>l.id===x)?.name;}
    return kind==='project'?projects.find(p=>p.id===x)?.name:undefined;
  },[lines,projects,places]);

  /* ---- the record: made on the first Send ---- */
  const making = useRef<Promise<string> | null>(null);
  const ensure = (): Promise<string> => {
    if (sid.current) return Promise.resolve(sid.current);
    making.current ??= make();
    return making.current;
  };
  const make = async (): Promise<string> => {
    const t = Date.now();
    const ac = await activeClientNow();
    let client = ac.client || (ac.clients.length === 1 ? ac.clients[0] : '');
    if (folderId) {
      const folder = await getStudy(folderId);
      if (folder && isLunaFolder(folder)) client = customerOfFolder(folder) || client;
    }
    const s = newConversation({
      id: uid(), at: t, name: `AI Mode — ${niceDay(todayISO())}`,
      ...(session?.user.id ? { ownerId: session.user.id } : {}),
      ...(start ? { thread: { id: uid(), ...start } } : {}),
      ...(folderId ? { folderId } : {}),
      ...(client ? { client } : {}),
    });
    await putStudy(s);
    sid.current = s.id;
    setStudy(s);
    onMade(s.id);
    return s.id;
  };

  /* ---- THE VOICE CONVERSATION (9 November, docs/VOICE.md): this conversation, spoken — one engine, its states moved by real events ---- */
  const [voice, setVoice] = useState(false);
  const voiceOn = useRef(false);
  voiceOn.current = voice;
  const [vState, vMove] = useReducer(voiceStep, 'ended');
  const [vPrefs, setVPrefs] = useVoicePrefs();
  const vPrefsRef = useRef(vPrefs);
  vPrefsRef.current = vPrefs;
  const route = useAudioRoute();
  const routeRef = useRef(route);
  routeRef.current = route;
  const [heardTick, setHeardTick] = useState(0);
  const [vNote, setVNote] = useState('');
  const [saying, setSaying] = useState('');
  /** Conversation mode glass — keeps the last reply on screen after speak ends, until the next question. */
  const [hallGlass, setHallGlass] = useState('');
  /* the microphone waiting to open again after Luna stops (reopen) — cancelled by anything the person does first */
  const reopenTimer = useRef<number | null>(null);
  /* her own words heard back lately — so their end, finished by the recogniser a moment after, is known as hers too */
  const echoSeen = useRef<{ text: string; at: number } | null>(null);
  const cancelReopen = () => { if (reopenTimer.current !== null) { window.clearTimeout(reopenTimer.current); reopenTimer.current = null; } };
  const lastHeard = useRef(0);
  const turnTimer = useRef<number | null>(null);
  const clearTurn = () => { if (turnTimer.current !== null) { window.clearTimeout(turnTimer.current); turnTimer.current = null; } };
  const endTurnRef = useRef<() => void>(() => undefined);
  /* THE PAUSE THAT ENDS A SPOKEN TURN, looked at: ended when it has been long enough, else looked at again (colleague/speech
     turnEnd). Held here, not inside the hearing, so it can be looked at again when Luna has FINISHED an answer: a turn cannot end
     while she works, and words said meanwhile used to sit unsent until the person spoke again (22 November). */
  const lookTurn = useRef<(heard?: Parameters<typeof turnEnd>[0]) => void>(() => undefined);
  /* INTERRUPTED — the person stopped her voice part-way through this answer: nothing more of THIS answer is said. Until 22 November
     only the piece being said was cut; the pieces still to come — the next round's words, the rest handed over when the answer was
     finished — were said after the interruption (the voice story's own check, made frequent once an answer's ending took longer). */
  const speechCut = useRef(false);
  const voiceRequest = useRef<AbortController | null>(null);
  const takeFloor = useRef(() => {});
  const cutSpeech = () => { speechCut.current = true; stopSpeaking(); };

  /* ---- THE BOX: typed into, or talked into (Line Talk's hearing) ---- */
  const [typing, setTyping] = useState('');
  const typingRef = useRef('');
  const spoken = useRef(false);
  const setBox = (text: string) => { typingRef.current = text; if (!text.trim()) spoken.current = false; setTyping(text); };
  const box = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { try { sessionStorage.removeItem('faultline.ai-compose-open'); } catch { /* fine */ } }, []);
  const [said, setSaid] = useState<Said>(null);
  const ear = useRef<Ear | null>(null);
  const [listening, setListening] = useState(false);
  const base = useRef('');
  const quiet = useRef<number | null>(null);
  const stopQuiet = () => { if (quiet.current !== null) { window.clearTimeout(quiet.current); quiet.current = null; } };
  lookTurn.current = heard => {
    turnTimer.current = null;
    const now = ear.current?.now() ?? heard;
    if (!now) return;
    const gone = Date.now() - lastHeard.current;
    if (turnEnd(now, gone, vPrefsRef.current.pause) === 'end') endTurnRef.current();
    else turnTimer.current = window.setTimeout(() => lookTurn.current(heard), turnWait(now, gone, vPrefsRef.current.pause));
  };
  const stopListening = async (): Promise<string> => {
    cancelReopen();
    const e = ear.current;
    if (!e) return typingRef.current;
    ear.current = null; setListening(false); stopQuiet();
    if (voiceRef.current.soundOn) earcon('stop');
    const c = await e.stop();
    const text = joinWords(base.current, c.words);
    setBox(text);
    return text;
  };
  const onTrouble = useRef<(t: Trouble, e: Ear) => void>(() => undefined);
  onTrouble.current = (t, e) => {
    if (ear.current !== e) return;
    /* no signal is waited out by the ear (it keeps trying); a refusal, a busy microphone or no recognition stops it */
    if (voiceOn.current) { vMove({ type: 'trouble', fatal: t !== 'network' }); setVNote(troubleSaid(t)); if (t === 'network') return; }
    void stopListening(); setSaid({ text: troubleSaid(t), bad: t !== 'network' });
  };
  const startListening = (o: { keepSpeaking?: boolean } = {}) => {
    cancelReopen();
    if (!o.keepSpeaking) stopSpeaking();
    if (ear.current) { if (!o.keepSpeaking && voiceOn.current) vMove({ type: 'ready' }); return; }
    setSaid(null);
    const Rec = recognitionOf(window);
    if (!Rec) {
      setSaid({ text: troubleSaid('unsupported') });
      if (voiceOn.current) { vMove({ type: 'trouble', fatal: true }); setVNote(troubleSaid('unsupported')); } else box.current?.focus();
      return;
    }
    base.current = typingRef.current.trim();
    const e: Ear = new Ear(Rec, {
      onSpeechStart: () => {
        // With a headset the recogniser can yield the floor before the first transcript arrives.
        if (ear.current === e && voiceOn.current && routeRef.current.headset && isSpeaking()) {
          cutSpeech(); vMove({ type: 'interrupt' });
        }
      },
      onWords: h => {
        if (ear.current !== e) return;
        const heardWords = joinWords(h.final, h.interim);
        if (voiceRef.current.talkOn && voiceCommand(heardWords) === 'stop' && (/\bluna\b/i.test(heardWords) || !inEchoWindow() || !isEcho(heardWords, saidLately()))) {
          // Silence playback on an interim command. Consume only the final, so “stop the line” can still be a question.
          clearTurn(); stopQuiet(); cutSpeech();
          if (!h.interim.trim()) {
            e.cut(); base.current = ''; setBox('');
            takeFloor.current();
            if (voiceOn.current) vMove({ type: 'stop-command' });
          }
          return;
        }
        /* LUNA'S OWN VOICE coming back through the microphone — while she speaks, or a moment after, its words late from the
           recogniser — is not the person: ignored, in the voice screen and in Conversation alike (colleague/voice saidLately) */
        {
          const heardNow = heardWords, hers = saidLately();
          /* her words still forming when the window closed, finished a moment later, are still hers */
          const late = !inEchoWindow() && echoSeen.current && Date.now() - echoSeen.current.at < ECHO_LATE_MS && !!h.final.trim() && isEchoTail(h.final, echoSeen.current.text);
          if (late || (inEchoWindow() && (isSpeaking() ? isEcho(heardNow, hers) : isEchoTail(heardNow, hers)))) {
            echoSeen.current = { text: joinWords(echoSeen.current && Date.now() - echoSeen.current.at < ECHO_LATE_MS ? echoSeen.current.text : '', heardNow), at: Date.now() };
            /* taken out of what has been heard, so it is never joined to what the person says next */
            if (h.final.trim()) e.cut();
            return;
          }
        }
        stopQuiet();
        if (voiceOn.current) {
          if (isSpeaking() && shouldBargeIn(true, h)) { cutSpeech(); vMove({ type: 'interrupt' }); }
          if (speechCut.current && heardWords.trim()) takeFloor.current();
          vMove({ type: 'recovered' });
          vMove({ type: 'heard', words: joinWords(h.final, h.interim) });
          setHeardTick(n => n + 1);
          lastHeard.current = Date.now();
          /* a pause or the end of what was said — looked at again once the pause could be long enough (colleague/speech turnEnd) */
          clearTurn();
          turnTimer.current = window.setTimeout(() => lookTurn.current(h), turnWait(h, 0, vPrefsRef.current.pause));
        }
        /* BARGE-IN — words heard while a reply is spoken stop the reply at once */
        if (shouldBargeIn(isSpeaking(), h)) stopSpeaking();
        /* SAID YES — a card waiting is answered only by a whole phrase of the strict list, its words finished */
        const card = hearFor.current;
        if (card && waits.current.has(card) && !h.interim.trim()) {
          const m = spokenAnswer(h.final);
          if (m) {
            hearFor.current = null;
            ear.current = null; e.abort(); setListening(false);
            if (voiceRef.current.soundOn) earcon('stop');
            setBox(base.current);
            setSaid(null);
            answerCard(card, m.answer === 'yes', m.said);
            return;
          }
          if (h.final.trim()) setSaid({ text: `Heard “${h.final.trim()}” — to answer the card say “yes, do it”, “yes, send it” or “not now”, or tap Do it or Not now.` });
        }
        spoken.current = true;
        setBox(joinWords(base.current, h.final, h.interim));
      },
      onTrouble: t => onTrouble.current(t, e),
    }, 'en-GB', /Android/i.test(navigator.userAgent), () => document.visibilityState === 'hidden');
    e.local = vPrefsRef.current.onDevice;
    ear.current = e;
    if (!o.keepSpeaking && voiceRef.current.soundOn) earcon('start');
    setListening(true);
    e.start();
    if (!o.keepSpeaking && voiceOn.current) vMove({ type: 'ready' });
    stopQuiet();
    quiet.current = window.setTimeout(() => { quiet.current = null; if (ear.current === e) setSaid({ text: NOTHING_HEARD }); }, QUIET_MS);
  };
  const startRef = useRef(startListening);
  startRef.current = startListening;
  const floorKit = useRef<{ k: ScreenKeeper | null; b: HeadsetButton | null }>({ k: null, b: null });
  const pauseVoiceHardware = useRef(() => undefined);
  pauseVoiceHardware.current = () => {
    cancelReopen();
    clearTurn();
    cutSpeech();
    void stopListening();
    floorKit.current.k?.suspend();
    floorKit.current.b?.suspend();
    if (voiceOn.current) { vMove({ type: 'mute' }); setVNote('Paused — Faultline is out of sight or you left Luna. Tap Talk to carry on.'); }
  };
  useEffect(() => {
    const seen = () => {
      if (document.visibilityState === 'hidden') {
        const wasListening = !!ear.current;
        pauseVoiceHardware.current();
        if (wasListening) setSaid({ text: 'Listening stopped when Faultline went out of sight — what you said is in the box. Tap the microphone to carry on.' });
        return;
      }
      if (document.visibilityState !== 'visible') return;
      if (!(voiceRef.current.talkOn || voiceOn.current)) return;
      void floorKit.current.k?.resume();
      void floorKit.current.b?.resume();
    };
    const leave = () => pauseVoiceHardware.current();
    document.addEventListener('visibilitychange', seen);
    window.addEventListener('pagehide', leave);
    window.addEventListener('beforeunload', leave);
    return () => {
      document.removeEventListener('visibilitychange', seen);
      window.removeEventListener('pagehide', leave);
      window.removeEventListener('beforeunload', leave);
    };
  }, []);
  useEffect(() => () => { pauseVoiceHardware.current(); ear.current?.abort(); ear.current = null; stopSpeaking(); stopQuiet(); floorKit.current.k?.letGo(); floorKit.current.b?.letGo(); }, []);
  /* first words start at once on a phone PWA — Chrome Android pauses speechSynthesis after a quiet spell (docs/VOICE.md) */
  useEffect(() => { warmVoice(); }, []);

  /* ---- out loud ---- */
  const [speakOn, setSpeakOn] = useDeviceFlag(SPEAK_KEY, false);
  const [talkOn, setTalkOn] = useDeviceFlag(CONVERSATION_KEY, false);
  const [soundOn, setSoundOn] = useDeviceFlag(EARCON_KEY, true);
  const voiceRef = useRef({ speakOn, talkOn, soundOn });
  /* the voice conversation is Conversation with Speak replies — the same paths, on while its screen is open */
  voiceRef.current = { speakOn: speakOn || voice, talkOn: talkOn || voice, soundOn };
  const [speaking, setSpeaking] = useState(false);
  useEffect(() => onSpeaking(on => {
    setSpeaking(on);
    if (on) cancelReopen();
    if (!on || !voiceRef.current.talkOn || !shown || document.visibilityState !== 'visible') return;
    if (voiceOn.current) vMove({ type: 'speak-start' });
    /* Keep listening on the selected audio route during conversation playback. */
    if (listenWhileSpeaking(vPrefsRef.current, routeRef.current) && !ear.current) startRef.current({ keepSpeaking: true });
  }), [shown]);
  /** After something is said: the microphone again, if it was said to the end and Conversation is on. */
  const reopen = (finished: boolean, then?: () => void) => {
    /* a moment after she stops — the phone's speaker still ringing, its end said a little early — so the first thing the
       microphone hears is not the last of her own words; `then` (the voice screen's "listening") only when it does open, and
       a mute, a tap or a new reply in the meantime cancels it */
    cancelReopen();
    reopenTimer.current = window.setTimeout(() => {
      reopenTimer.current = null;
      if (isSpeaking()) return;
      then?.();
      if (reopenAfterSpeech({ finished, talkOn: voiceRef.current.talkOn, visible: document.visibilityState === 'visible', listening: !!ear.current })) startRef.current();
    }, REOPEN_AFTER_MS);
  };

  /* ---- ON THE FLOOR (colleague/floor): while Conversation is on, the screen kept on and the headset's button taken ---- */
  const [keep, setKeep] = useState<KeepState>('off');
  const [button, setButton] = useState<ButtonState>('off');
  const pressRef = useRef<() => void>(() => undefined);
  useEffect(() => {
    if (!talkOn && !voice) {
      floorKit.current.k?.letGo();
      floorKit.current.b?.letGo();
      floorKit.current = { k: null, b: null };
      return;
    }
    const env = realEnv();
    const k = new ScreenKeeper(env, setKeep);
    const b = new HeadsetButton(env, () => pressRef.current(), setButton);
    floorKit.current = { k, b };
    if (document.visibilityState === 'visible') {
      void k.hold();
      void b.take();
    }
    /* a phone that wanted a touch before the silent sound may play: the next touch wakes the button */
    const wake = () => { if (b.now === 'needs-tap') void b.wake(); };
    document.addEventListener('pointerdown', wake);
    return () => { document.removeEventListener('pointerdown', wake); k.letGo(); b.letGo(); floorKit.current = { k: null, b: null }; };
  }, [talkOn, voice]);
  const liveRoute = useRoute();
  const onEnvPage = isEnvRoute(liveRoute, aiModeOn());
  useEffect(() => {
    if (!shown) pauseVoiceHardware.current();
    else if (shown && document.visibilityState === 'visible' && (talkOn || voice)) {
      void floorKit.current.k?.resume();
      void floorKit.current.b?.resume();
    }
  }, [shown, talkOn, voice]);
  useEffect(() => {
    if (!onEnvPage && !dock) pauseVoiceHardware.current();
  }, [onEnvPage, dock]);
  const [checking, setChecking] = useState<CheckItem[] | 'running' | null>(null);
  const runCheck = async () => { setChecking('running'); setChecking(await floorCheck(realEnv())); };

  /* ---- photos: kept the moment they are picked, labelled P1, P2 … ---- */
  const photoIn = useRef<HTMLInputElement>(null);
  /* A PHOTO IS STAMPED WITH WHERE AND WHEN (10 November, docs/FACTORY-WALK.md): the place the person last said they were, the moment
     it was taken — kept on the photo's turn of this conversation, the one photograph, never copied */
  const addPhotos = async (files: Blob[]) => {
    const cid = await ensure();
    for (const f of files) {
      if (!f.type.startsWith('image/')) continue;
      const at = Date.now(), blobKey = `talk-${uid()}`;
      await putBlob(blobKey, f);
      const here = ((await getStudy(cid))?.facts as WalkFacts | undefined)?.position;
      /* THE VISIT IN HAND (lib/visits, C3): the photo says it was taken on it — so the visit reads it even before any place is said */
      const visitId = (await import('../lib/visits')).storedVisit()?.id;
      await appendTurn(patchStudy, cid, { id: uid(), at, ...(me ? { who: me } : {}), kind: 'photo', media: { blobKey, mime: f.type || 'image/jpeg', capturedAt: at }, ...(here ? { where: here } : {}), ...(visitId ? { visitId } : {}) } as WalkTurn);
    }
  };

  /* ---- A FACTORY DOCUMENT (docs/FACTORY-KNOWLEDGE.md F4): picked, read, kept as a factory source, its proposals on the draft ---- */
  const docIn = useRef<HTMLInputElement>(null);
  const [docPicked, setDocPicked] = useState<DocPicked | null>(null);
  /* A DOWNTIME FILE (10 November, docs/AI-TOOL-INTELLIGENCE.md): a CSV or Excel sheet with a reason column and minutes or counts is read
     here, in code, and kept on the conversation as IMPORTED evidence — never written into the line's timed stops, never sent to a model
     to read. Any other file is a factory document, as before. */
  const [imported, setImported] = useState<string | null>(null);
  const tryDowntime = async (file: File, client?: string, quiet = false): Promise<boolean> => {
    const r = await importDowntime(ctx(), ensure, file, { ...(cur?.scope.lineId ? { lineId: cur.scope.lineId } : {}), ...(client ? { client } : {}) });
    if (r.took && !quiet) { setImported(r.says); setAttachAbilities('table'); }
    return r.took;
  };
  /* A WORKBOOK (docs/WORKBOOKS.md): an .xlsx of any size is read on this device in a background worker — never uploaded, never sent to
     the model — its progress shown here with a Stop; the colleague then asks it with workbook_profile, query_workbook and workbook_rows.
     A small one that is a downtime table is also kept as imported downtime, as before. */
  const [wb, setWb] = useState<{ id: string; name: string; p?: Progress; said?: string; bad?: boolean; /** The workbook being read when several are — what Stop stops. */ stop?: string; /** Register id when read — for Luna can… */ sourceId?: string } | null>(null);
  const [attachAbilities, setAttachAbilities] = useState<ConnectionKind | null>(null);
  const wbRunning = useRef(new Set<string>());
  const wbList: ColleagueWorkbook[] = useMemo(() => ((facts as { workbooks?: ColleagueWorkbook[] } | undefined)?.workbooks ?? []), [facts]);
  useEffect(() => { if (sid.current && wbList.some(w => w.status === 'reading' && !wbRunning.current.has(w.id))) void settleWorkbooks(ctx(), wbRunning.current); }, [wbList, ctx]);
  const readWorkbookFile = async (file: File, origin?: FileOrigin, client?: string) => {
    setImported(null); setAttachAbilities(null);
    const id = workbookId(file);
    const cid = await ensure();
    const c = { ...ctx(), conversationId: cid };
    const had = wbList.find(w => w.id === id && (w.status === 'ready' || w.status === 'partial'));
    if (had) {
      try {
        await workbooks().profile(id);
        /* read here before 16 November, when the file was not kept: keep it now, so the person's other devices can ask it too */
        const src = (await allSources()).find(x => x.facts.fileId === id);
        const kept = src ? await keepWorkbookFile(src.id, id, file) : 'too-big';
        await sayReceipt(cid, [{ name: file.name, status: had.status, localOnly: kept !== 'kept' }]);
        setWb(current => current?.id === id ? null : current);
        return;
      } catch { /* not on this device: read it again */ }
    }
    wbRunning.current.add(id);
    setWb({ id, name: file.name, p: { stage: 'opening it', done: 0, total: 1 } });
    /* read, noted, registered, kept and its first look said — one place for it (colleague/attachWorkbook), the exam reads through it too */
    try {
      await attachWorkbook(c, file, { ...(origin ? { origin } : {}), ...(client ? { client } : {}), ...(cur?.scope.lineId ? { lineId: cur.scope.lineId } : {}), ...(cur?.scope.projectId ? { projectId: cur.scope.projectId } : {}), onProgress: prog => setWb(x => (x && x.id === id ? { ...x, p: prog } : x)) });
      setWb(current => current?.id === id ? null : current);
    } catch (e) {
      const why = e instanceof Error ? e.message : String(e);
      setWb({ id, name: file.name, said: `“${file.name}” could not be read: ${why}`, bad: true });
    } finally { wbRunning.current.delete(id); }
  };
  /* SEVERAL WORKBOOKS CHOSEN AT ONCE (20 November, docs/CONNECTED-LUNA.md — a file a month): each read on this device, then their
     first looks said in the order of their own dates, so each says what changed since the one before (colleague/attachWorkbook) */
  const readWorkbookFilesNow = async (given: (File | { file: File; origin?: FileOrigin })[], client?: string) => {
    setImported(null); setAttachAbilities(null);
    const files = given.map(x => (x instanceof File ? x : x.file));
    const cid = await ensure();
    const c = { ...ctx(), conversationId: cid };
    const key = `several-${uid()}`;
    wbRunning.current.add(key);
    setWb({ id: key, name: `${files.length} workbooks`, p: { stage: 'opening them', done: 0, total: 1 } });
    let at = { i: 0, name: files[0]?.name ?? '' };
    try {
      await attachWorkbooks(c, given, {
        ...(client ? { client } : {}), ...(cur?.scope.lineId ? { lineId: cur.scope.lineId } : {}), ...(cur?.scope.projectId ? { projectId: cur.scope.projectId } : {}),
        onFile: (i, of, name) => { at = { i, name }; const f = files[i]; setWb(x => (x && x.id === key ? { ...x, name: `${name} (${i + 1} of ${of})`, ...(f ? { stop: workbookId(f) } : {}) } : x)); },
        onProgress: prog => setWb(x => (x && x.id === key ? { ...x, p: { ...prog, stage: `${at.name}, ${at.i + 1} of ${files.length} — ${prog.stage}` } } : x)),
      });
      setWb(current => current?.id === key ? null : current);
    } finally { wbRunning.current.delete(key); }
    for (const f of files) if (f.size <= 8 * 1024 * 1024) void tryDowntime(f, client, true).catch(() => false);
  };
  /* what was chosen in the attach box: several workbooks read together; otherwise the first file, as before */
  const pickDocs = (files: File[]) => {
    const books = files.filter(f => /\.(xlsx|xlsm)$/i.test(f.name));
    if (books.length > 1) { readWorkbookFiles(books); return; }
    const first = books[0] ?? files[0];
    if (first) pickDoc(first);
  };
  const stopWorkbook = () => { if (wb) workbooks().stop(wb.stop ?? wb.id); };
  /* A FILE ALWAYS HAS A CUSTOMER (21 November, X1c — Rowland: "connect files to customer … think of it as tenant addresses"): known
     from the conversation's line, the customer in hand, or there being only one; asked — once, one tap — only when several are in use,
     all are shown and no line is chosen (colleague/WhoseSheet). Shut without an answer, nothing is connected. */
  const [whose, setWhose] = useState<{ customers: string[]; go: (customer: string) => void } | null>(null);
  const withCustomer = (go: (customer?: string) => void) => {
    void ownerFor(cur?.scope.lineId).then(o => { if ('ask' in o) setWhose({ customers: o.ask, go }); else go(); }).catch(() => go());
  };
  const pickDoc = (file: File, origin?: FileOrigin, client?: string) => { if (client) pickDocNow(file, origin, client); else withCustomer(c => pickDocNow(file, origin, c)); };
  const pickDocRef = useRef(pickDoc);
  pickDocRef.current = pickDoc;
  useEffect(() => {
    const take = () => { const p = takeLink(); if (p) pickDocRef.current(p.file, p.origin); };
    take();
    window.addEventListener(LINK_FILE_EVENT, take);
    return () => window.removeEventListener(LINK_FILE_EVENT, take);
  }, []);
  const readWorkbookFiles = (given: (File | { file: File; origin?: FileOrigin })[]) => withCustomer(c => void readWorkbookFilesNow(given, c));
  const pickDocNow = (file: File, origin?: FileOrigin, client?: string) => {
    if (/\.(xls|xlsb)$/i.test(file.name)) { setImported(`“${file.name}” is an older Excel format (${/xlsb$/i.test(file.name) ? '.xlsb' : '.xls'}) — open it in Excel, save it as .xlsx and attach that.`); return; }
    if (/\.(xlsx|xlsm)$/i.test(file.name)) {
      void readWorkbookFile(file, origin, client);
      if (file.size <= 8 * 1024 * 1024) void tryDowntime(file, client, true).catch(() => false);
      return;
    }
    void tryDowntime(file, client).then(took => { if (!took) pickFactoryDoc(file); }).catch(() => pickFactoryDoc(file));
  };
  const pickFactoryDoc = (file: File) => {
    const fd = factoryDraftFor(facts?.drafts ?? []);
    const line = cur?.scope.lineId ? lines.find(l => l.id === cur.scope.lineId) : undefined;
    setDocPicked({ file, client: fd?.factory?.client.value ?? line?.clientName ?? '' });
  };
  const readDoc = async (file: File, client: string, day: string): Promise<{ ok: boolean; says: string }> => {
    const cid = await ensure();
    const r = await readFactoryDocument(file, file.name);
    if (!r.ok) return { ok: false, says: r.why };
    const t = await takeDocument({ ...ctx(), conversationId: cid }, {
      client, file: { name: file.name, blob: file, mime: file.type }, text: r.text, readBy: r.readBy,
      ...(day ? { day } : r.day ? { day: r.day, ...(r.dayQuote ? { dayQuote: r.dayQuote } : {}) } : {}), items: r.items, ...(cur?.scope.lineId ? { lineId: cur.scope.lineId } : {}),
    });
    if (!t.ok) return { ok: false, says: t.why };
    const src = await getStudy(t.sourceId);
    await appendAction(patchStudy, cid, { callId: uid(), name: 'factory_source', title: 'Read a factory document', status: 'done', says: t.says, refs: src ? [{ kind: 'study', id: src.id, label: src.name, href: studyHref(src) }] : [], at: Date.now() });
    return { ok: true, says: [t.says, ...r.notes, ...t.refused].join(' ') };
  };

  /* A MACHINE'S OWN DOCUMENT (13 November, docs/ASSET-DOCUMENTS.md): kept on its machine, its pages read in code — no request sent.
     The conversation is told (a step with what was found), so "build the PM list from it" has its document. */
  const keepDoc = async (file: File, o: { lineId: string; machine: string; docKind: DocKind }): Promise<{ ok: boolean; says: string }> => {
    const cid = await ensure();
    const r = await keepMachineDoc({ file, fileName: file.name, lineId: o.lineId, machine: o.machine, docKind: o.docKind, conversationId: cid, ...(me ? { by: me } : {}) });
    if (!r.ok) return { ok: false, says: r.why };
    await machineOntoLine(o.lineId, o.machine).catch(() => undefined);
    await appendAction(patchStudy, cid, { callId: uid(), name: 'machine_document', title: 'Kept a machine’s document', status: 'done', says: `${r.says} [document ${r.doc.id}]`, refs: [{ kind: 'study', id: r.doc.id, label: r.doc.name, href: `/lines/${o.lineId}?view=machines` }], at: Date.now() });
    setAttachAbilities('manual');
    return { ok: true, says: r.says };
  };

  /* SHOW ME (21 November, docs/LUNA-AGENT.md G2b): what changed in a file Luna read by herself, written into the conversation as her
     turn — worked in code (colleague/knows changedSaid), no AI asked. The file needs no attaching: she answers from it by its id. */
  const showChanged = async (s: Source) => {
    const cid = await ensure();
    await appendTurn(patchStudy, cid, { id: uid(), at: Date.now(), who: WHO, kind: 'reply', text: changedSaid(s), byCode: true } as ColleagueTurn);
  };
  const showDigest = async (text: string) => {
    const cid = await ensure();
    await appendTurn(patchStudy, cid, { id: uid(), at: Date.now(), who: WHO, kind: 'reply', text, byCode: true } as ColleagueTurn);
  };

  /* ---- ASKING — the client loop (colleague/colleagueAsk) ---- */
  const [asking, setAsking] = useState<string | null>(null);
  /* G6 (23 November): hand an open job to the server when the app goes out of sight (docs/LUNA-G6-SERVER.md). */
  const handoffRef = useRef({ sid: '', cur: undefined as Thread | undefined, asking: null as string | null, labels: new Map<string, string>() });
  useEffect(() => { handoffRef.current = { sid: sid.current ?? '', cur, asking, labels }; });
  useEffect(() => {
    const hand = (leaving: boolean) => {
      if (!leaving && document.visibilityState !== 'hidden') return;
      void (async () => {
        const h = handoffRef.current;
        if (!h.sid || !shouldHandOff(h.cur, { asking: !!h.asking, leaving })) return;
        const client = await activeClientNow().then(a => a.client).catch(() => '');
        const focus = await conversationFocus(h.sid, { names: nameOf, placeKind: x => { const w = places.find(l => l.id === x); return w && isAreaPlace(w) ? 'area' : 'line'; }, photos: [] });
        await handOpenJobToServer(h.sid, h.cur, focus, longDay(), client, preferencesText() || undefined, h.labels);
      })();
    };
    const seen = () => hand(false);
    const leave = () => hand(true);
    document.addEventListener('visibilitychange', seen);
    window.addEventListener('pagehide', leave);
    return () => {
      document.removeEventListener('visibilitychange', seen);
      window.removeEventListener('pagehide', leave);
    };
  }, [places, nameOf]);
  const mergeServerJob = async (row: ServerJobRow) => {
    const cid = row.conversation_id;
    await appendTurn(patchStudy, cid, {
      id: uid(), at: Date.now(), who: WHO, kind: 'reply',
      text: serverJobSaid(row),
      ...(row.snapshot.job ? { job: row.snapshot.job } : {}),
    } as ColleagueTurn);
    if (row.snapshot.job) await changeThreads(patchStudy, cid, list => list.map(t => (t.id === row.thread_id ? { ...t, job: row.snapshot.job, handToServer: undefined } : t)));
    await reload();
  };
  /* STOP (21 November, docs/LUNA-AGENT.md): now that a job is carried on by the app for several goes, the person can stop her at any
     moment — the loop looks at this before every round and every step; what she had done is kept */
  const stopAsk = useRef(false);
  const [stopping, setStopping] = useState(false);
  const [words, setWordsState] = useState('');
  const wordsRef = useRef('');
  const setWords = (w: string) => { wordsRef.current = w; setWordsState(w); };
  const waits = useRef(new Map<string, (yes: boolean) => void>());
  const [, setWaitTick] = useState(0);
  /* the card the microphone is listening for a "yes, do it" on; what each card was answered with out loud; what of
     this turn's words has been spoken already (before a card) */
  const hearFor = useRef<string | null>(null);
  const saidFor = useRef(new Map<string, string>());
  const spokenSoFar = useRef('');

  const visualDismissed = useRef(false);
  const exportDocument = async (cid: string, options: Parameters<typeof exportWrittenDocument>[1]) => {
    let artifact: HtmlArtifact | undefined;
    let words: string;
    try {
      artifact = await exportWrittenDocument(cid, options);
      words = `I saved “${artifact.title}” as HTML in Artifacts.`;
    } catch (e) { words = e instanceof Error ? e.message : 'I couldn’t save the HTML file.'; }
    await appendTurn(patchStudy, cid, { id: uid(), at: Date.now(), who: WHO, kind: 'reply', text: words, byCode: true, ...(artifact ? { artifactId: artifact.id } : {}) });
    if (artifact && shownNow.current) showWork(artifactRef(artifact.id, artifact.title), { made: true });
    return words;
  };
  const ask = async (cid: string) => {
    visualDismissed.current = false;
    if (asking) return;
    const replyId = uid(), at = Date.now();
    const before = turnsOfConversation(factsOfConversation((await getStudy(cid)) as ToolStudy));
    if (!unansweredTurns(before).length && !before.some(t => t.kind === 'reply' && t.answering)) return;
    /* the moment the newest words were said — a measured event is stamped then, not when the answer comes */
    saidAt.current = unansweredTurns(before).reduce<number | undefined>((m, t) => (m === undefined || t.at > m ? t.at : m), undefined);
    /* a reply not given before is asked again in its place */
    const was = [...before].reverse().find(t => t.kind === 'reply' && !!t.answering && !t.struck);
    const rid = was?.id ?? replyId;
    if (was) await changeTurn(patchStudy, cid, rid, t => ({ ...t, answering: 'waiting', at, why: undefined, used: [] }));
    else await appendTurn(patchStudy, cid, { id: rid, at, who: WHO, kind: 'reply', answering: 'waiting', used: [] });
    setAsking(rid); setWords(''); spokenSoFar.current = '';
    stopAsk.current = false; setStopping(false);
    speechCut.current = false;
    /* THE VOICE CONVERSATION: the reply said sentence by sentence as each round's words come — the first heard while the rest is
       still being worked out; when all of it is said the microphone opens again (reopen). `vUpTo` is how far into the reply's
       spoken words the voice has been handed. */
    const spokenNow = voiceOn.current;
    const controller = spokenNow ? new AbortController() : null;
    voiceRequest.current = controller;
    let vUpTo = 0;
    const vDone = (finished: boolean) => { if (finished) reopen(true, () => vMove({ type: 'speak-end' })); else vMove({ type: 'speak-end' }); };
    const vFeed = (w: string, done: boolean) => {
      /* (interrupted: nothing more of this answer is said — its words are still written) */
      if (!spokenNow || !voiceOn.current || speechCut.current) return;
      const n = nextChunks(w, vUpTo, done);
      if (!n.chunks.length) return;
      if (!queueActive()) { queueStart(vDone); vMove({ type: 'reply-words' }); }
      for (const c of n.chunks) { queuePush(c); setSaying(c); }
      vUpTo = n.upTo;
      spokenSoFar.current = w;
    };
    try {
      const asked = before.filter(t => t.id !== rid);
      const latestWords = unansweredTurns(before).filter(t => t.kind === 'typed' || t.kind === 'said').map(t => t.text ?? t.heard ?? '').join(' ');
      const {request, writing, site, note} = authorBrief(latestWords, asked);
      const gallery = graphsRequested(request) || /\b(?:diagrams|forms|documents|reports)\b/i.test(request);
      const named = photoLabels(asked);
      const images: { photo: string; data: string }[] = [];
      const photoTurns = site ? selectPhotoTurns(asked,request,site.subject,named) : asked.filter(x => x.kind === 'photo' && !x.struck && x.media);
      for (const t of photoTurns.slice(-TALK_LIMITS.images)) {
        const photo = named.get(t.id);
        const data = t.media ? await pictureForAssistant(t.media.blobKey, TALK_LIMITS.imageBytes) : undefined;
        if (photo && data) images.push({ photo, data });
      }
      const photosKeys = asked.filter(x => x.kind === 'photo' && x.media).map(x => ({ label: named.get(x.id) ?? 'P0', key: x.media?.blobKey ?? '', said: photoSaid(named.get(x.id) ?? 'P0', x as WalkTurn) }));
      /* remaining small talk skips files / Today; a work ask starts them now so the first gateway round does not wait in a line */
      const fastStart = !site && !images.length && !!fastChatKind(latestWords);
      const focusExtra = { ...(screenRef.current ? { screen: screenRef.current } : {}), names: nameOf, placeKind: (x: string) => isAreaPlace(places.find(w => w.id === x)) ? 'area' : 'line', photos: photosKeys };
      let focusOnce = site || fastStart ? undefined : conversationFocus(cid, focusExtra, ctx());
      const earlierOnce = site || fastStart ? Promise.resolve([]) : earlierResults(cid);
      const inHandOnce = activeClientNow().then(a => a.client).catch(() => '');
      const sourcesUsed = new Set<string>();
      if (site && note) sourcesUsed.add('Based on your description in this conversation.');
      if (site && images.length) sourcesUsed.add('Based on your attached photo ' + images.map(i=>i.photo).join(', ') + '.');
      const requiredFiles = new Set<string>();
      const basis = () => requiredFiles.size ? '' : [...sourcesUsed].join(' ');
      const needSource = async (missing?: string) => {
        if (!site) return;
        const words = [missing,sourceQuestion(site.subject)].filter(Boolean).join(' ');
        await changeTurn(patchStudy,cid,rid,t => ({...t, answering:undefined, byCode:true, text:words, sourceBrief:site, suggestions:['Use a general example']}));
        if (hall) setHallGlass(words);
        if (spokenNow && voiceOn.current) { vMove({type:'reply-words'}); setSaying(words); speak(words,vDone); }
      };
      const selectedFiles = async (): Promise<AuthorSource[]> => {
        if (!site) return [];
        const files: AuthorSource[] = wbList.filter(w => w.status === 'ready' || w.status === 'partial').map(w=>({kind:'workbook',id:w.id,name:w.name}));
        for (const a of actions.filter(a => a.status === 'done' && ['factory_source','machine_document'].includes(a.name))) {
          for (const r of a.refs) if (r.kind === 'study') files.push({kind:a.name==='machine_document'?'manual':'record',id:r.id,name:r.label.replace(/\s+— factory source$/i,'')});
        }
        const attached = pickAuthorSources(request, files);
        if (attached.length && allFilesSelected(request,attached)) return attached;
        if (!namesFile(request) && !/[“"].+[”"]/i.test(request)) return attached;
        const { candidatesForRequest } = await import('../capabilities/data');
        const available = await candidatesForRequest({...ctx(),conversationId:cid},{words:request});
        const data: AuthorSource[] = available.filter(s=>s.facts.kind!=='document' && (s.facts.status==='ready'||s.facts.status==='partial'))
          .map(s=>({id:s.id,kind:'data',name:s.facts.fileName || s.facts.name}));
        return pickAuthorSources(request,[...files,...data.filter(s=>!attached.some(a=>a.name===s.name))]);
      };
      const selected = await selectedFiles();
      if (site) {
        if (!allFilesSelected(request,selected)) {
          await needSource('I couldn’t find every file named in your request.');
          return;
        }
        const missingPhotos = requestedPhotoLabels(request).filter(label=>!images.some(i=>i.photo===label));
        if (missingPhotos.length) {
          await needSource('I couldn’t read ' + missingPhotos.join(', ') + '.');
          return;
        }
        if (namesFile(request)) for (const file of selected) requiredFiles.add(file.id);
        if (!basis() && !selected.length) { await needSource(); return; }
      }
      const briefOutputs = new Set<string>();
      const steps = new Map<string, Used>();
      /* the customer in hand goes with the request for the usage record only (cost by customer) */
      const [inHand, earlier] = await Promise.all([inHandOnce, earlierOnce]);
      const end = await colleagueLoop({
        ...(inHand ? { client: inHand } : {}),
        turns: site ? [{role:'person',text:[request,note && !request.includes(note) ? 'My description: '+note : ''].filter(Boolean).join('\n'),at:new Date(at).toISOString()}] : gatewayTurns(asked, named),
        worked: site ? [] : workedInCode(asked),
        earlier,
        /* THE SECOND LOOK: an answer that leaves her own plan open is sent back to her once (colleague/colleagueAsk) */
        unfinished: async ran => (ran.has('plan_job') || ran.has('job_step') ? stepsOpenSaid(currentThread(factsOfConversation((await getStudy(cid)) as ToolStudy).threads ?? [])?.job) : undefined),
        ...(images.length ? { images } : {}),
        focus: () => {
          if (site) return [basis(), ...selected.map(f=>f.kind + ' “' + f.name + '” [' + f.id + ']')].filter(Boolean).join('\n');
          if (focusOnce) { const p = focusOnce; focusOnce = undefined; return p; }
          return conversationFocus(cid, focusExtra, ctx());
        },
        today: longDay(),
        conversationId: cid,
        preferences: dashboardAsked(request) ? () => [preferencesText(), 'This turn asks for an HTML dashboard. Use the available data tools to produce the requested charts or report sections. The app assembles and saves the dashboard after those results exist. Describe the findings and leave the save confirmation to the app.'].filter(Boolean).join('\n') : writing ? () => [writingGuidance, site ? 'Write about this particular subject only from the supplied description, identified photo, or a successful content read of a selected file. Name the source. If the material does not show the requested subject, ask for the missing detail. Never infer machine condition from a file name, a metric, or a generated illustration. Identify examples as examples.' : '', preferencesText()].filter(Boolean).join('\n') : preferencesText,
        ...(spokenNow ? { spoken: true } : {}),
      }, {
        invoke: (body, onText) => invokeColleague(body, onText, controller?.signal),
        describe: name => { const c = capabilityByName(name); return c ? { kind: c.kind, title: c.title } : undefined; },
        run: async (call, confirmed) => {
          const file = site && selectedRead(call, selected);
          const priorResult = (call.input as {from?:string} | null)?.from;
          if (site && priorResult && !briefOutputs.has(priorResult)) return {ok:false,why:'That earlier result was not selected for this brief.'};
          if (site && !file && call.name !== 'method_knowledge' && !scopedOutput(call,briefOutputs)) return {ok:false,why:'This site brief uses only its selected sources. Ask the person to identify any other material.'};
          if (site && call.name === 'build_report' && !basis()) return {ok:false,why:sourceQuestion(site.subject)};
          if (writing && call.name === 'build_report') {
            const data = call.input as {reportId?:string;sections?:ReportSection[];section?:ReportSection} | null;
            if (!data?.reportId) {
              const gap = trainingDraftGap(request, data?.sections ?? (data?.section ? [data.section] : []));
              if (gap) return {ok:false,why:gap};
            }
          }
          let r = await runCall({...ctx(), ...(writing ? {documentPurpose:documentPurpose(writing.kind),documentBasis:basis() || 'General operational guidance.'} : {})},call,{confirmed});
          if (r.ok && file && file.kind === 'record' && call.name === 'read_record') {
            const record = await getStudy(file.id);
            const fields = record?.facts.docValues;
            if (record && !record.deletedAt && typeof fields?.text === 'string' && fields.file === file.name) {
              const excerpt = fields.text.trim().slice(0,8000);
              if (excerpt) r = {...r, says:'Extract from “' + file.name + '”: ' + excerpt, data:{excerpt}};
            }
          }
          if (site && r.ok && (file || call.name === 'build_report' || call.name === 'make_chart')) {
            for (const ref of r.refs) if (['convreport','result','chart'].includes(ref.kind)) briefOutputs.add(ref.id.split('@')[0]);
          }
          if (file && hasSourceContent(call.name,r)) {
            sourcesUsed.add('Based on “' + file.name + '”, read for this guide.');
            requiredFiles.delete(file.id);
          }

          if (r.ok && !visualDismissed.current) {
            const target = r.show ?? (call.name === 'make_record' ? r.refs.find(x => x.kind === 'study') : undefined);
            if (target && !(gallery && ['chart', 'result', 'convreport', 'study'].includes(target.kind))) showWork(target, { made: true });
          }
          /* the record a confirmed write made or wrote into is now said yes to — later fills of it go straight in (colleague/turnRules) */
          if (r.ok && confirmed) await noteConfirmed(cid, call, r);
          return r;
        },
        /* validated, allowed, its preview — and whether it goes in without a card (confirm once; Work within) — colleague/turnRules */
        prepare: (call): Promise<Prepared> => site ? Promise.resolve({ok:false,title:'Write the guide',why:'This request authorises writing a document from the selected material.'}) : prepareCall(ctx(), cid, call),
        jobInHand: async () => currentThread(factsOfConversation((await getStudy(cid)) as ToolStudy).threads ?? [])?.job,
        approveJobWrites: () => approveJobWrites(cid),
        confirm: async step => {
          const jobGoal = (await currentThread(factsOfConversation((await getStudy(cid)) as ToolStudy).threads ?? [])?.job)?.goal ?? '';
          return new Promise<boolean>(res => {
            waits.current.set(step.call.id, res);
            setWaitTick(n => n + 1);
            /* HANDS-FREE: with Conversation on, the card is said out loud, ending "Shall I do it?", and the microphone opens
               for the answer — matched in code on a strict list of whole phrases, never by the model */
            if (!voiceRef.current.talkOn) return;
            hearFor.current = step.call.id;
            const before = spokenNow ? forSpeech(wordsRef.current).slice(vUpTo) : unspoken(wordsRef.current, spokenSoFar.current);
            spokenSoFar.current = wordsRef.current;
            vUpTo = forSpeech(wordsRef.current).length;
            const prompt = step.call.name === JOB_WRITES_BATCH && step.batch?.items.length
              ? jobBatchCardPrompt(before, jobGoal, step.batch.items)
              : cardPrompt(before, { title: step.title, name: step.call.name, ...(step.preview ? { preview: step.preview } : {}) });
            if (voiceRef.current.speakOn && canSpeak()) speak(prompt, reopen);
            else reopen(true);
          });
        },
        onStep: async (step: Step) => {
          const by = saidFor.current.get(step.call.id);
          await recordStep(cid, rid, steps, step, by);
        },
        onWords: w => { if (!site || basis()) { setWords(w); vFeed(w, false); } },
        stopped: () => stopAsk.current,
      });
      if (site && !basis() && end.ok && !end.stopped) { await needSource(); return; }
      if (end.ok) {
        /* A TREND IS A PICTURE (colleague/autoChart): the turn worked out a series over time, or a graph was asked for, and Luna drew
           nothing — the app draws it from that result through make_chart itself, shown on this turn; no second answer is asked for */
        if (writing && !end.stopped && !stopAsk.current && ![...steps.values()].some(step => step.status === 'done' && step.refs.some(r => r.kind === 'convreport'))) {
          const draft = writingFromReply(end.reply, writing.subject + ' ' + writing.kind);
          if (draft && !trainingDraftGap(request,draft.sections)) {
            const written = await writeDocumentDraft({ ...ctx(), conversationId: cid, documentPurpose:documentPurpose(writing.kind), documentBasis:basis() || 'General operational guidance.' }, draft);
            await recordStep(cid, rid, steps, written.step);
            if (!writing.html && shownNow.current && deskWide() && !visualDismissed.current) showWork(written.ref, { made: true });
          }
        }
        let offerGraph = false;
        try {
          /* not drawn unasked: offered — and "yes please" is then answered by the app itself (answeredInCode) */
          if (!end.stopped) offerGraph = (await drawWhatWasAsked(ctx(), cid, rid, steps, request)).offer;
        } catch (e) { console.warn('the chart could not be drawn by itself', e); }
        /* WHO IS IN THE ROOM (PEOPLE IN THE ROOM, tools/colleague/colleagueAssist): the reply said it changed — kept on this
           conversation and told back with every turn */
        if (end.room) { const room = end.room; await patchStudy(cid, cur => ({ facts: { ...cur.facts, room } })); }
        /* the job as it stood when she finished — kept on the answer when this turn planned or moved it */
        const jobNow = currentThread(factsOfConversation((await getStudy(cid)) as ToolStudy).threads ?? [])?.job;
        const jobKept = jobNow && (jobNow.startedAt >= at || jobNow.steps.some(x => (x.at ?? 0) >= at)) ? jobNow : undefined;
        await changeTurn(patchStudy, cid, rid, t => {
          const { answering: _a, why: _w, ...rest } = t; void _a; void _w;
          return { ...rest, ...(jobKept ? { job: jobKept } : {}), text: end.reply || 'Done.', ...(end.suggestions.length || offerGraph ? { suggestions: offerGraph ? [GRAPH_OFFER, ...end.suggestions.filter(x => !/graph|chart/i.test(x))].slice(0, 3) : end.suggestions } : {}), ...(end.unsure.length ? { unsure: end.unsure } : {}), ...(end.checked ? { checked: end.checked } : {}), ...(end.model ? { model: end.model } : {}), timing: end.timing };
        });
        let dashboardSaid = '';
        if (!end.stopped && !stopAsk.current && writing?.html) {
          const hasDocument = [...steps.values()].some(step => step.status === 'done' && step.refs.some(r => r.kind === 'convreport'));
          if (hasDocument) dashboardSaid = await exportDocument(cid, { turnId: rid });
          else if (!end.reply.trim().endsWith('?')) {
            dashboardSaid = 'There is no saved document from this reply to export as HTML.';
            await appendTurn(patchStudy, cid, { id: uid(), at: Date.now(), who: WHO, kind: 'reply', text: dashboardSaid, byCode: true });
          }
        } else if (!end.stopped && !stopAsk.current && dashboardAsked(request)) {
          try {
            const saved = await dashboardFromChat(cid, rid);
            dashboardSaid = saved ? savedDashboardWords(saved) : 'There were no chart or report results to save as an HTML dashboard.';
            await appendTurn(patchStudy, cid, { id: uid(), at: Date.now(), who: WHO, kind: 'reply', text: dashboardSaid, byCode: true, ...(saved ? { artifactId: saved.artifact.id, trackingOffer: !!saved.artifact.recipe && !saved.artifact.tracking } : {}) });
            if (saved && shownNow.current && !visualDismissed.current) showWork(artifactRef(saved.artifact.id, saved.artifact.title), { made: true });
          } catch {
            dashboardSaid = 'I couldn’t save the HTML dashboard. You can try again from the visuals.';
            await appendTurn(patchStudy, cid, { id: uid(), at: Date.now(), who: WHO, kind: 'reply', text: dashboardSaid, byCode: true });
          }
        } else if (!end.stopped && shownNow.current && !stopAsk.current && !visualDismissed.current) {
          const record = await getStudy(cid);
          const finished = record && turnsOfConversation(factsOfConversation(record)).find(t => t.id === rid);
          if (record && finished) {
            const o = outputsOfConversation(record);
            const visual = visualsOf(finished, request, { results: new Map(o.results.map(r => [r.id, r])), charts: new Map(o.charts.map(c => [c.id, c])), reports: o.reports });
            const count = visual.charts.length + visual.reports.length + visual.forms.length;
            if (count > 1 || (gallery && count)) showWork(galleryRef(rid, count === 1 ? 'Visual' : 'Visuals'), { made: true });
          }
        }
        const finishedWords = [end.reply, dashboardSaid].filter(Boolean).join(' ');
        if (hall && finishedWords.trim()) setHallGlass(finishedWords.trim());
        /* the reply said out loud — what was not said already before a card — and, in Conversation, the microphone after.
           INTERRUPTED part-way: the rest is written, never said — the microphone is already open for what the person says next */
        if (spokenNow && voiceOn.current && speechCut.current) {
          /* nothing more is said */
        } else if (spokenNow && voiceOn.current) {
          const n = nextChunks(finishedWords, vUpTo, true);
          if (queueActive()) { for (const c of n.chunks) { queuePush(c); setSaying(c); } queueClose(); }
          else if (n.chunks.length) { vMove({ type: 'reply-words' }); const all = n.chunks.join(' '); setSaying(all); speak(all, vDone); }
          else { vMove({ type: 'answered-silently' }); reopen(true); }
        } else if (!speechCut.current) {
          const rest = unspoken(finishedWords, spokenSoFar.current);
          if (voiceRef.current.speakOn && rest) speak(rest, reopen);
          else if (voiceRef.current.speakOn && end.reply) reopen(true);
        }
      } else {
        await changeTurn(patchStudy, cid, rid, t => ({ ...t, ...(end.reply ? { text: end.reply } : {}), answering: end.offline ? 'waiting' : 'failed', why: end.why, timing: end.timing }));
        if (spokenNow && voiceOn.current && !speechCut.current) { vMove({ type: 'trouble', fatal: false }); setVNote(end.why); speak(end.offline ? 'No signal — I will answer when it is back.' : 'I could not answer that just now — say it again when you are ready.', () => { vMove({ type: 'recovered' }); reopen(true); }); }
      }
    } catch (e) {
      console.warn('AI Mode could not ask', e);
      await changeTurn(patchStudy, cid, rid, t => ({ ...t, answering: 'failed', why: 'Luna could not answer just now — ask again. What you said is kept.' }));
    } finally {
      for (const [, res] of waits.current) res(false);
      waits.current.clear();
      hearFor.current = null;
      voiceRequest.current = null;
      setAsking(null); setWords(''); setStopping(false);
    }
  };
  /** Stop pressed while she works: she stops at the next step; a card waiting is answered "not now" — stopping writes nothing. */
  const stopNow = () => {
    if (!asking || stopAsk.current) return;
    stopAsk.current = true; setStopping(true);
    for (const [, res] of waits.current) res(false);
    waits.current.clear(); hearFor.current = null;
    stopSpeaking();
    setWaitTick(n => n + 1);
  };
  takeFloor.current = () => {
    if (!voiceRequest.current || voiceRequest.current.signal.aborted) return;
    stopNow();
    voiceRequest.current.abort();
  };
  /** A card answered — by a tap, or by the words said back (`said`, shown on the card as "Said: …"). */
  const answerCard = (callId: string, yes: boolean, said?: string) => {
    const res = waits.current.get(callId);
    if (!res) return;
    waits.current.delete(callId);
    if (hearFor.current === callId) hearFor.current = null;
    /* answered while the card was still being said: the rest is cut short, and nothing opens after it */
    stopSpeaking();
    /* kept for the step's next telling (done, declined or failed), which writes it onto the card */
    if (said) saidFor.current.set(callId, said);
    setWaitTick(n => n + 1);
    res(yes);
  };

  /* ANSWERED IN CODE (12 November, docs/AI-COST.md step 0): while stops are timed, words that are exactly a tap said out loud — the
     line's own machine and a reason, "running again", "undo that" — run the same capability Luna would have asked for, and its own
     sentence is the answer. Nothing is sent to the AI service. Anything else, or a capability that refuses, goes to Luna as before. */
  const answeredInCode = async (cid: string, text: string, spokenNow = false, sourceTurn?: string): Promise<boolean> => {
    if (waits.current.size) return false;
    /* FIRST WORDS AT ONCE (26 November): a hello, thanks or goodbye is answered here — no gateway, no files, no Today. */
    const hello = helloSaid(text, { name: greetName(), hour: new Date().getHours() });
    if (hello) {
      await appendTurn(patchStudy, cid, { id: uid(), at: Date.now(), who: WHO, kind: 'reply', text: hello, byCode: true, timing: { firstTextMs: 0, completeMs: 0, rounds: 0 } } as ColleagueTurn);
      if (hall) setHallGlass(hello);
      if (spokenNow && voiceOn.current) {
        vMove({ type: 'reply-words' }); setSaying(hello);
        speak(hello, finished => { if (finished) reopen(true, () => vMove({ type: 'speak-end' })); else vMove({ type: 'speak-end' }); });
      } else if (voiceRef.current.speakOn) speak(hello, reopen);
      return true;
    }
    let file: Parameters<typeof exportWrittenDocument>[1] = htmlDocumentRequest(text);
    if (!file && visualRevision(text)) {
      const last = [...turns].reverse().find(t => !t.struck && t.kind === 'reply');
      const saved = last?.artifactId && outs.artifacts.find(a => a.id === last.artifactId);
      const refs = last?.used?.filter(u => u.status === 'done').flatMap(u => u.refs) ?? [];
      const id = saved ? saved.reportId : refs.find(r => r.kind === 'convreport')?.id.split('@')[0];
      if (id && outs.reports.some(r => r.id === id && textDocument(r))) file = { reportId:id };
    }
    const brief = authorBrief(text, turns);
    if (!file && brief.site) return false;
    const writing = !file && brief.writing;
    const draft = writing ? libraryDocument(writing) : undefined;
    if (file || draft) {
      let words: string;
      if (file) words = await exportDocument(cid, { ...file, turnId: sourceTurn });
      else if (draft) {
        try {
          const written = await writeDocumentDraft({ ...ctx(), conversationId: cid, documentPurpose:writing ? documentPurpose(writing.kind) : undefined, documentBasis:'General guidance from Faultline’s manufacturing method library.' }, draft);
          words = `I’ve written “${written.ref.label}”.`;
          await appendTurn(patchStudy, cid, { id: uid(), at: Date.now(), who: WHO, kind: 'reply', text: words, byCode: true, used: [usedOf(written.step)] });
          if (writing && writing.html) words = await exportDocument(cid, { reportId: written.ref.id });
          else if (shownNow.current && deskWide()) showWork(written.ref, { made: true });
        } catch (e) {
          words = 'I couldn’t create the document. ' + (e instanceof Error ? e.message : '');
          await appendTurn(patchStudy, cid, { id: uid(), at: Date.now(), who: WHO, kind: 'reply', text: words, byCode: true });
        }
      } else return false;
      if (hall) setHallGlass(words);
      if (spokenNow && voiceOn.current) {
        vMove({ type: 'reply-words' }); setSaying(words);
        speak(words, finished => { if (finished) reopen(true, () => vMove({ type: 'speak-end' })); else vMove({ type: 'speak-end' }); });
      }
      return true;
    }
    const preceding = sourceTurn ? turns.find(t => t.id === sourceTurn) : turns.filter(t => !t.struck).slice(-1)[0];
    const pending = preceding?.kind === 'reply' && preceding.trackingOffer && preceding.artifactId
      ? outs.artifacts.find(a => a.id === preceding.artifactId && a.recipe && !a.tracking) : undefined;
    const track = trackingAnswer(text, !!pending);
    const trackingUrl = preceding?.trackLink && fileLinkIn(text);
    if (track !== undefined || trackingUrl) {
      const aid = pending?.id ?? preceding?.artifactId ?? (work?.kind === 'artifact' && workOpen ? work.id : undefined);
      if (aid) {
        let words: string;
        let trackLink: string | undefined;
        try {
          if (track || trackingUrl) {
            if (trackingUrl && preceding?.trackLink) await connectDashboardWorkbook(ctx(), cid, aid, preceding.trackLink, trackingUrl);
            else await refreshDashboard(ctx(), cid, aid, true);
            words = 'Tracking is on. I’ll check the source when you open this dashboard and update the figures while you’re viewing it.';
          } else {
            await freezeDashboard(cid, aid);
            words = 'I’ll keep this version as a snapshot in Artifacts.';
          }
        } catch (e) {
          trackLink = e instanceof DashboardLinkNeeded ? e.binding : trackingUrl ? preceding?.trackLink : undefined;
          words = e instanceof DashboardLinkNeeded ? e.message : 'I couldn’t update tracking. ' + (e instanceof Error ? e.message : 'The data source is unavailable.');
        }
        await appendTurn(patchStudy, cid, { id: uid(), at: Date.now(), who: WHO, kind: 'reply', text: words, artifactId: aid, ...(trackLink ? { trackLink } : {}), byCode: true });
        if (hall) setHallGlass(words);
        if (spokenNow && voiceOn.current) { vMove({ type: 'reply-words' }); setSaying(words); speak(words, finished => { if (finished) reopen(true, () => vMove({ type: 'speak-end' })); else vMove({ type: 'speak-end' }); }); }
        return true;
      }
    }
    if (dashboardRequest(text)) {
      let artifact: HtmlArtifact | undefined;
      let reply: string;
      try {
        const saved = await dashboardFromChat(cid, sourceTurn ?? (workOpen && work?.kind === 'visuals' ? work.id : undefined));
        if (saved) {
          artifact = saved.artifact;
          reply = savedDashboardWords(saved);
        } else if (wbList.length && !sourceTurn) return false;
        else reply = 'There are no saved graphs or report sections in this chat yet. Which data would you like the dashboard to show?';
      } catch { reply = 'I couldn’t save the dashboard. Your original visuals are still in this conversation.'; }
      await appendTurn(patchStudy, cid, { id: uid(), at: Date.now(), who: WHO, kind: 'reply', text: reply, byCode: true, ...(artifact ? { artifactId: artifact.id, trackingOffer: !!artifact.recipe && !artifact.tracking } : {}) });
      if (hall) setHallGlass(reply);
      if (artifact && shownNow.current) showWork(artifactRef(artifact.id, artifact.title), { made: true });
      if (spokenNow && voiceOn.current) {
        vMove({ type: 'reply-words' }); setSaying(reply);
        speak(reply, finished => { if (finished) reopen(true, () => vMove({ type: 'speak-end' })); else vMove({ type: 'speak-end' }); });
      }
      return true;
    }
    const route = navigationIntent(text, window.location.hash.startsWith('#/projects'));
    if (route) {
      let href = route.kind === 'section' ? route.href : '/projects';
      let words = `Opening ${route.kind === 'section' ? route.label : 'Projects'}.`;
      if (route.kind === 'project') {
        const found = await runCall(ctx(), { id: uid(), name: 'find', input: { words: route.name } }, { confirmed: false });
        if (!found.ok) return false;
        const matches = projectMatches(route.name, found.refs);
        if (matches.length === 1) { href = matches[0].href; words = `Opening ${matches[0].label}.`; }
        else if (matches.length > 1) words = `I found more than one project matching “${route.name}”. I’ve opened Projects so you can choose the right one.`;
        else words = `I couldn’t find a project matching “${route.name}”. I’ve opened Projects so you can look there.`;
      }
      await appendTurn(patchStudy, cid, { id: uid(), at: Date.now(), who: WHO, kind: 'reply', text: words, byCode: true } as ColleagueTurn);
      if (spokenNow && voiceOn.current) {
        vMove({ type: 'reply-words' }); setSaying(words);
        speak(words, finished => { if (finished) reopen(true, () => vMove({ type: 'speak-end' })); else vMove({ type: 'speak-end' }); });
      }
      if (spokenNow && voiceOn.current) { setLunaPanel('open'); nav(href); }
      else openAsWork(href);
      return true;
    }
    /* A LINK TO A FILE, PASTED AND SENT (21 November, docs/CONNECTED-LUNA.md X1b): the message is nothing but a share link — so it is
       fetched and read as the file it is, in code, no AI asked. One that cannot be fetched is answered by the app in the cloud's own
       words. Any other web address, and a link among other words, goes to Luna as words. */
    const link = fileLinkIn(text);
    if (link) {
      setImported(`Fetching the file from ${linkKind(link)?.host ?? 'that link'}…`);
      try { const { file, origin } = await fetchLink(link); setImported(null); pickDoc(file, origin); }
      catch (e) {
        setImported(null);
        await appendTurn(patchStudy, cid, { id: uid(), at: Date.now(), who: WHO, kind: 'reply', text: `I could not read a file from that link. ${e instanceof Error ? e.message : String(e)}`, byCode: true } as ColleagueTurn);
      }
      return true;
    }
    /* CONVERSATION ACTS (24 November): "remind me tomorrow", "make a report", "send this to jane@…" — done in code, no AI asked. */
    const act = conversationAct(text, todayISO());
    if (act) {
      const speakReply = (words: string) => {
        if (spokenNow && voiceOn.current) {
          vMove({ type: 'reply-words' }); setSaying(words);
          speak(words, finished => { if (finished) reopen(true, () => vMove({ type: 'speak-end' })); else vMove({ type: 'speak-end' }); });
        } else if (voiceRef.current.speakOn) speak(words, reopen);
      };
      const asLocal = async (name: string, input: Record<string, unknown>): Promise<boolean> => {
        const cap = capabilityByName(name);
        if (!cap || cap.kind !== 'local') return false;
        const call = { id: uid(), name, input } as CapCall;
        const r = await runCall(ctx(), call, { confirmed: false });
        if (!r.ok) return false;
        if (r.show) showWork(r.show);
        await appendTurn(patchStudy, cid, { id: uid(), at: Date.now(), who: WHO, kind: 'reply', text: r.says, byCode: true,
          used: [usedOf({ call, title: cap.title, kind: 'local', status: 'done', says: r.says, refs: r.refs ?? [], input })] } as ColleagueTurn);
        speakReply(r.says);
        return true;
      };
      if (act.kind === 'remind') {
        if (await asLocal('remind_me', { when: act.when, what: act.what })) return true;
        return false;
      }
      const convNow = (await getStudy(cid)) as ToolStudy | undefined;
      if (act.kind === 'report') {
        const want = convNow ? reportInputOf(outputsOfConversation(convNow)) : null;
        if (!want) {
          const words = reportTopicQuestion;
          await appendTurn(patchStudy, cid, { id: uid(), at: Date.now(), who: WHO, kind: 'reply', text: words, byCode: true } as ColleagueTurn);
          speakReply(words);
          return true;
        }
        if (await asLocal('build_report', want)) return true;
        return false;
      }
      const call = { id: uid(), name: 'send_email', input: { to: act.to } } as CapCall;
      const prepared = await prepareCall(ctx(), cid, call);
      if (!prepared.ok) {
        const words = prepared.why;
        await appendTurn(patchStudy, cid, { id: uid(), at: Date.now(), who: WHO, kind: 'reply', text: words, byCode: true } as ColleagueTurn);
        speakReply(words);
        return true;
      }
      const rid = uid();
      const step: Step = { call: { ...call, input: prepared.input }, title: prepared.title, kind: 'write', status: 'waiting', says: '', refs: [], preview: prepared.preview, input: prepared.input };
      const waiting = "I'll send it — have a look at the card.";
      await appendTurn(patchStudy, cid, { id: rid, at: Date.now(), who: WHO, kind: 'reply', text: waiting, answering: 'waiting', byCode: true, used: [usedOf(step)] } as ColleagueTurn);
      setAsking(rid);
      const yes = await new Promise<boolean>(res => {
        waits.current.set(call.id, res);
        setWaitTick(n => n + 1);
        if (!voiceRef.current.talkOn) return;
        hearFor.current = call.id;
        const prompt = cardPrompt(waiting, { title: prepared.title, name: 'send_email', ...(prepared.preview ? { preview: prepared.preview } : {}) });
        if (voiceRef.current.speakOn && canSpeak()) speak(prompt, reopen);
        else reopen(true);
      });
      const r = yes ? await runCall(ctx(), { ...call, input: prepared.input }, { confirmed: true }) : undefined;
      if (r?.ok) await noteConfirmed(cid, call, r);
      const words = yes ? (r?.ok ? r.says : r?.why ?? 'I could not send it.') : 'You said not now — nothing was sent.';
      const status = yes ? (r?.ok ? 'done' as const : 'failed' as const) : 'declined' as const;
      await changeTurn(patchStudy, cid, rid, t => {
        const { answering: _a, ...rest } = t; void _a;
        return { ...rest, text: words, used: [usedOf({ ...step, status, says: words, refs: r && r.ok ? (r.refs ?? []) : [] })] };
      });
      setAsking(null);
      speakReply(words);
      return true;
    }
    const conv = (await getStudy(cid)) as ToolStudy | undefined;
    /* "SHOW THAT AS A GRAPH" (colleague/autoChart): a graph of what was just worked out, and nothing else said — drawn by the app
       from that result through make_chart; "yes please" counts when the graph was what the last answer offered */
    if (conv) {
      const turns = turnsOfConversation(factsOfConversation(conv));
      const open = unansweredTurns(turns);
      const lastReply = [...turns].reverse().find(t => t.kind === 'reply' && !t.answering);
      if (open.length === 1 && !turns.some(t => t.kind === 'reply' && t.answering) && graphAsked(text, !!lastReply?.suggestions?.includes(GRAPH_OFFER))) {
        const o = outputsOfConversation(conv);
        const want = resultToDraw(o.results, new Set(o.charts.flatMap(c => c.versions.map(v => v.resultId))));
        if (want) {
          const call = { id: uid(), name: 'make_chart', input: want } as CapCall;
          const r = await runCall(ctx(), call, { confirmed: false });
          if (r.ok) {
            const title = o.results.find(x => x.id === want.resultId)?.title ?? 'that';
            const words = `Here it is as a graph — ${title}.`;
            if (r.show) showWork(r.show);
            await appendTurn(patchStudy, cid, { id: uid(), at: Date.now(), who: WHO, kind: 'reply', text: words, byCode: true,
              used: [usedOf({ call, title: 'Make a chart', kind: 'local', status: 'done', says: r.says, refs: r.refs ?? [], input: want as unknown as Record<string, unknown> })] } as ColleagueTurn);
            if (spokenNow && voiceOn.current) { vMove({ type: 'reply-words' }); setSaying(words); speak(words, finished => { if (finished) reopen(true, () => vMove({ type: 'speak-end' })); else vMove({ type: 'speak-end' }); }); }
            else if (voiceRef.current.speakOn) speak(words, reopen);
            return true;
          }
        }
      }
    }
    /* ABOUT THE WORKBOOK'S FIRST LOOK (colleague/lookAsk): "make this a pack", "start with “Sheet”", "the headings are on row 5",
       "column M is the result" — each the whole of what was said, run through the same capability Luna would call, no AI asked */
    if (conv) {
      const turns = turnsOfConversation(factsOfConversation(conv));
      const { lookAsked } = await import('../colleague/lookAsk');
      const ask = unansweredTurns(turns).length === 1 && !turns.some(t => t.kind === 'reply' && t.answering) ? lookAsked(text) : null;
      const had = ((conv.facts as { workbooks?: { status: string }[] }).workbooks ?? []).filter(w => w.status === 'ready' || w.status === 'partial').length;
      if (ask && had === 1) {
        const call = { id: uid(), name: ask.name, input: ask.input } as CapCall;
        const r = await runCall(ctx(), call, { confirmed: false });
        if (r.ok) {
          if (r.show) showWork(r.show);
          const pack = ask.name === 'workbook_pack';
          const words = pack ? `Here is the pack — ${r.refs?.[0]?.label ?? 'the first look'}. Download it as a PDF or as slides from its card; say what to add or take out.` : r.says;
          const sug = pack ? [] : ((r.data as { suggestions?: string[]; look?: boolean } | undefined)?.look ? [(await import('../lib/workbook/lookPack')).PACK_OFFER, ...((r.data as { suggestions?: string[] }).suggestions ?? [])] : []);
          await appendTurn(patchStudy, cid, { id: uid(), at: Date.now(), who: WHO, kind: 'reply', text: words, byCode: true, ...(sug.length ? { suggestions: sug } : {}),
            used: [usedOf({ call, title: pack ? 'Make the pack from the first look' : 'Read the workbook the way they say', kind: 'local', status: 'done', says: r.says, refs: r.refs ?? [], input: ask.input })] } as ColleagueTurn);
          return true;
        }
      }
    }
    const m = conv ? runningMeasure(conv) : undefined;
    if (!conv || !m?.lineId) return false;
    const before = turnsOfConversation(factsOfConversation(conv));
    const open = unansweredTurns(before);
    if (open.length !== 1 || before.some(t => t.kind === 'reply' && t.answering)) return false;
    const ws = await getWorkspace(m.lineId);
    if (!ws) return false;
    const earlier = m.events.map(e => (e.input as { reason?: unknown } | undefined)?.reason).filter((x): x is string => typeof x === 'string' && !!x.trim());
    const fast = fastCall(text, { tool: m.tool, machines: ws.assets ?? [], reasons: [...(ws.categories ?? []), ...earlier], ...(m.machine ? { machine: m.machine } : {}) });
    const cap = fast ? capabilityByName(fast.name) : undefined;
    if (!fast || !cap || cap.kind !== 'local') return false;
    saidAt.current = open[0].at;
    const call = { id: uid(), name: fast.name, input: fast.input } as CapCall;
    const r = await runCall(ctx(), call, { confirmed: false });
    if (!r.ok) return false;
    const refs = r.refs ?? [];
    await appendTurn(patchStudy, cid, { id: uid(), at: Date.now(), who: WHO, kind: 'reply', text: r.says, byCode: true,
      used: [usedOf({ call, title: cap.title, kind: 'local', status: 'done', says: r.says, refs, input: fast.input })] } as ColleagueTurn);
    if (fast.name === 'end_measurement') showWork(r.show);
    if (spokenNow && voiceOn.current) {
      vMove({ type: 'reply-words' }); setSaying(r.says);
      speak(r.says, finished => { if (finished) reopen(true, () => vMove({ type: 'speak-end' })); else vMove({ type: 'speak-end' }); });
    } else if (voiceRef.current.speakOn) speak(r.says, reopen);
    return true;
  };

  const sending = useRef(false);
  const send = (words?: string, sourceTurn?: string): Promise<void> => {
    if (sending.current || asking) return Promise.resolve();
    sending.current = true;
    /* one Send at a time; the flag let go however it ends */
    return (async () => {
      stopSpeaking();
      const text = (words ?? (ear.current ? await stopListening() : typingRef.current)).trim();
      const wasSpoken = spoken.current && !words;
      const cid = await ensure();
      if (text) {
        if (hall) setHallGlass('');
        await appendTurn(patchStudy, cid, { id: uid(), at: Date.now(), ...(me ? { who: me } : {}), ...(spoken.current && !words ? { kind: 'said' as const, heard: text } : { kind: 'typed' as const, text }) });
        setBox(''); setSaid(null);
        /* a tap said out loud while a measurement runs is answered in code — no AI asked (colleague/fastPath) */
        if (await answeredInCode(cid, text, wasSpoken, sourceTurn)) return;
      }
      await ask(cid);
    })().finally(() => {
      sending.current = false;
      /* words said from another page while this was being answered are waiting — offered again now it is done */
      if (peekPendingSay()) window.setTimeout(() => window.dispatchEvent(new Event(SAY_EVENT)), 0);
    });
  };

  /* WORDS FROM ANOTHER PAGE (Today's box, W7): sent through this same Send once the conversation is here — never twice, and NEVER
     DROPPED. Send refuses while she is working, and these words had already been taken when it did: a question asked from Today as
     her last answer was landing was lost without a word (22 November — the gate's own Today story, under load). Now they are taken
     only when Send can take them; said while she is still answering they WAIT, and go the moment she has finished. */
  const sendRef = useRef(send); sendRef.current = send;
  const askingRef = useRef(asking); askingRef.current = asking;
  const takeSaid = useRef(() => {
    if (sending.current || askingRef.current) return;
    const w = takePendingSay();
    if (w) void sendRef.current(w);
  });
  useEffect(() => {
    const take = () => takeSaid.current();
    const t = window.setTimeout(take, 0);
    window.addEventListener(SAY_EVENT, take);
    return () => { window.clearTimeout(t); window.removeEventListener(SAY_EVENT, take); };
  }, []);
  /* (she has finished: what was said meanwhile is sent — words from another page, and, in the voice conversation, a turn whose pause
     ended while she was still working: looked at again now) */
  useEffect(() => {
    if (asking) return undefined;
    const t = window.setTimeout(() => {
      takeSaid.current();
      if (voiceOn.current && ear.current && typingRef.current.trim() && turnTimer.current === null) lookTurn.current();
    }, 0);
    return () => window.clearTimeout(t);
  }, [asking]);

  /* THE HEADSET'S BUTTON — one press: listen; stop and send; stop the reply and listen; or nothing while it works */
  pressRef.current = () => {
    const phase = phaseOf({ talkOn: voiceRef.current.talkOn, listening: !!ear.current, speaking: isSpeaking(), asking: !!asking });
    const card = [...waits.current.keys()].pop();
    switch (pressAction(phase, ear.current ? typingRef.current : '', !!asking, !!card)) {
      case 'listen': if (card) hearFor.current = card; startRef.current(); break;
      case 'interrupt': cutSpeech(); startRef.current(); break;
      case 'send': void send(); break;
      case 'stop': void stopListening(); break;
      case 'none': setSaid({ text: 'Luna is working on it — press again once she has answered.' }); break;
    }
  };

  /* ---- THE VOICE CONVERSATION'S PRESSES ---- */
  /** The end of what was said: sent into this conversation through the same Send — or a spoken command, or nothing yet. */
  endTurnRef.current = () => {
    clearTurn();
    if (!voiceOn.current || asking || sending.current) return;
    const words = typingRef.current.trim();
    const cmd = voiceCommand(words);
    if (cmd === 'end') { void closeVoice(); return; }
    if (cmd === 'stop') { cutSpeech(); ear.current?.cut(); base.current = ''; setBox(''); takeFloor.current(); vMove({ type: 'stop-command' }); return; }
    if (!words || hearFor.current) return;   /* a card waits: only its phrases answer it */
    vMove({ type: 'turn-end' });
    void send();
  };
  const openVoice = () => {
    voiceOn.current = true;
    setVoice(true); setVNote(''); setSaying('');
    vMove({ type: 'open' });
    startListening();
  };
  /* VOICE FROM ANOTHER PAGE (Today's voice button, 11 November): the voice conversation started here, once */
  const openVoiceRef = useRef(openVoice); openVoiceRef.current = openVoice;
  useEffect(() => {
    const take = () => { if (takePendingVoice()) openVoiceRef.current(); };
    const t = window.setTimeout(take, 0);
    window.addEventListener(VOICE_EVENT, take);
    return () => { window.clearTimeout(t); window.removeEventListener(VOICE_EVENT, take); };
  }, []);
  const hallOpened = useRef(false);
  useEffect(() => {
    if (!hall || hallOpened.current) return;
    hallOpened.current = true;
    if (!talkOn) setTalkOn(true);
    if (!speakOn && canSpeak()) setSpeakOn(true);
    /* Conversation mode opens full screen without starting the microphone — the person taps Talk (TV-safe, no gesture race). */
    voiceOn.current = true;
    setVoice(true);
    setVNote('');
    setSaying('');
    vMove({ type: 'open' });
    vMove({ type: 'mute' });
  }, [hall, talkOn, speakOn, setTalkOn, setSpeakOn]);
  const closeVoice = async () => {
    cancelReopen();
    clearTurn();
    stopSpeaking();
    voiceOn.current = false;
    if (ear.current) await stopListening();
    setVoice(false);
    vMove({ type: 'close' });
    if (hall) onHallExit?.();
  };
  const voiceTap = () => {
    if (vState === 'listening' || vState === 'transcribing') { if (typingRef.current.trim()) endTurnRef.current(); return; }
    if (vState === 'processing' || vState === 'preparing') return;
    setVNote('');
    if (vState === 'idle') vMove({ type: 'unmute' });
    startListening();
  };
  const voiceInterrupt = () => { clearTurn(); cutSpeech(); vMove({ type: 'interrupt' }); startListening(); };
  const voiceMute = () => {
    if (vState === 'idle') { setVNote(''); vMove({ type: 'unmute' }); startListening(); return; }
    cancelReopen();
    clearTurn();
    cutSpeech();
    if (ear.current) void stopListening();
    vMove({ type: 'mute' });
  };
  /* a headset paired or dropped while talking — said, as the phone moves the sound itself */
  const hadHeadset = useRef(route.headset);
  useEffect(() => {
    if (route.headset === hadHeadset.current) return;
    hadHeadset.current = route.headset;
    if (voiceOn.current) setVNote(route.headset ? `${route.name ?? 'A headset'} connected — the phone sends Faultline’s voice to it.` : 'The headset went — Faultline is on the phone’s speaker now.');
  }, [route.headset, route.name]);

  /* BACK TO THIS — a parked thread made current through the set_focus capability, as the colleague does it */
  const backTo = async (t: Thread) => {
    const cid = sid.current;
    if (!cid) return;
    const r = capabilityByName('set_focus') ? await runCall(ctx(), { id: uid(), name: 'set_focus', input: { title: t.title, ...(Object.keys(t.scope).length ? { scope: t.scope } : {}) } } as CapCall, { confirmed: false }) : { ok: false as const, why: 'no set_focus' };
    if (!r.ok) await changeThreads(patchStudy, cid, ts => setCurrent(ts, t.title, t.scope, Date.now(), uid()));
    setCtxSheet(false);
  };

  /* the newest turn in sight */
  const scroller = useRef<HTMLOListElement>(null);
  const newest = `${turns.length}:${turns[turns.length - 1]?.answering ?? ''}:${turns[turns.length - 1]?.used?.length ?? 0}:${words.length}`;
  useEffect(() => {
    const el = scroller.current;
    if (el && isDesk()) el.scrollTop = el.scrollHeight;
    else el?.lastElementChild?.scrollIntoView({ block: 'end' });
  }, [newest]);

  const [ctxSheet, setCtxSheet] = useState(false);
  const [prefsSheet, setPrefsSheet] = useState(false);
  const [settingsSheet, setSettingsSheet] = useState(false);
  /* THE BOX, as a chat's (9 November — Rowland: "a user interface much like I have with you … wide open text screen … add a picture,
     add a document at the bottom … much like WhatsApp"): the words over a row of presses — ＋ (a photo taken, photos, a factory
     document), the microphone and Send; the box grows with what is typed; at a desk the context can be put away for a wide page */
  const camIn = useRef<HTMLInputElement>(null);
  const [attach, setAttach] = useState(false);
  /* CONNECT TO MICROSOFT (20 November, docs/CONNECTED-LUNA.md X1): a file chosen from SharePoint or OneDrive, read as an upload */
  const [msPick, setMsPick] = useState(false);
  /* CONNECT (21 November, X1b — "one click, one button. Connect. And then what am I connecting to?"): Luna’s ＋ sheet, a full-height
     column on Luna. A file by its link is the factory page (`#/factory/data?link=1`) — never this sheet. `?link=1` on `#/ai` still
     opens the sheet, for a leftover address. */
  const [connect, setConnect] = useState<ConnectStep | null>(null);
  const microsoftAsked = liveRoute.name === 'ai' && liveRoute.query.get('microsoft') === '1';
  useEffect(() => { if (microsoftAsked) setMsPick(true); }, [microsoftAsked]);
  const linkAsked = liveRoute.name === 'ai' && liveRoute.query.get('link') === '1';
  useEffect(() => { if (linkAsked) setConnect('link'); }, [linkAsked]);
  const attachRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!attach) return;
    const away = (e: PointerEvent) => { if (!attachRef.current?.contains(e.target as Node)) setAttach(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setAttach(false); };
    document.addEventListener('pointerdown', away); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', away); document.removeEventListener('keydown', esc); };
  }, [attach]);
  const pickFrom = (el: HTMLInputElement | null) => { setAttach(false); el?.click(); };
  /* THE LIVE CAMERA ON A WALK (10 November, docs/FACTORY-WALK.md): the app's own camera full screen (tools/video/VideoRecorder, as the
     attach sheet's), each picture kept at once and stamped with where the person is; the camera stays open for the next. Where the
     browser has no live camera, the phone's own camera through the file box, as before. */
  const [camera, setCamera] = useState(false);
  const takePhoto = () => { setAttach(false); if (videoCaptureSupported()) setCamera(true); else camIn.current?.click(); };
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }, [typing]);
  /* THE WORK BESIDE THE CONVERSATION, WHEN THERE IS WORK (Luna identity, 11 November — Rowland: "Luna needs an environment in which
     the conversation and the work being carried out can coexist … The interface should adapt to what the user is doing").
     An empty or chatting conversation stays wide and calm (F2); once it holds real work — an investigation agreed, a draft being
     filled, a line or project in hand, things noted — the work stands beside it. The person's own Show / Hide is kept per device
     and wins from then on. (`wide` is worked out below, once the work is known.) */
  const timers = useTimers();
  const reminders = useReminders();
  const canSend = !asking && (!!typing.trim() || (!!study && unansweredTurns(turns).length > 0));
  const waitingCard = turns.some(t => (t.used ?? []).some(u => u.status === 'waiting' && waits.current.has(u.callId)));
  /* Luna product env, before the first turn (24 November — ChatGPT chrome): orb, name, compose; chats in the left rail */
  const envCalmEmpty = !dock && shown && turns.length === 0;
  const lunaProductEmpty = envCalmEmpty && onEnvPage;
  const composeExtras: MoreItem[] = [
    { label: listening ? 'Stop listening' : 'Talk into the box', hint: 'your words come up in the box', run: () => { if (listening) void stopListening(); else startListening(); } },
    { label: 'Voice conversation', hint: 'she listens, answers out loud and listens again', run: openVoice },
    ...(!hall ? [{ label: 'Conversation mode', hint: 'full screen — speak only', run: () => enterConversationMode({ ...(sid.current ? { conversationId: sid.current } : {}), ...(cur?.scope.lineId ? { lineId: cur.scope.lineId } : {}), ...(cur?.scope.projectId ? { projectId: cur.scope.projectId } : {}) }) }] : []),
  ];
  const hintText = listening ? 'Listening — your words come up in the box. Put anything right, then Send.'
    : waitingCard ? `Faultline is waiting for your answer on the card above — Do it or Not now.${talkOn ? ' Or say “yes, do it” or “not now”.' : ''}`
    : asking ? (stopping ? 'Stopping — she finishes the step in hand and says where she got to.' : 'Luna is working on it… Stop is where Send was.')
    : talkOn ? `Conversation is on: after each reply is spoken the microphone opens again.${button === 'ready' ? ' Press your headset’s button to talk, again to send.' : ''} ${FLOOR_LIMIT}`
    : 'Nothing is changed until you tap Do it on a card.';
  const showHint = !envCalmEmpty && (listening || waitingCard || !!asking || talkOn);
  const hallWaiting = useMemo(() => {
    for (let i = turns.length - 1; i >= 0; i--) {
      const t = turns[i];
      if (t.kind !== 'reply') continue;
      const u = (t.used ?? []).find(x => x.status === 'waiting' && waits.current.has(x.callId));
      if (u) return { u, live: asking === t.id };
    }
    return undefined;
  }, [turns, asking]);
  const hallCard = hallWaiting
    ? <WriteCard u={hallWaiting.u} live={hallWaiting.live} hands={talkOn} onCard={(c, y) => answerCard(c, y)} />
    : undefined;
  const hallReply = useMemo(() => {
    for (let i = turns.length - 1; i >= 0; i--) {
      const tr = turns[i];
      if (tr.kind !== 'reply') continue;
      if (asking === tr.id && words.trim()) return words.trim();
      if (tr.text?.trim()) return tr.text.trim();
    }
    return '';
  }, [turns, asking, words]);
  useEffect(() => {
    if (!hall) return;
    if (hallReply.trim()) setHallGlass(hallReply.trim());
    else if (asking && (words.trim() || saying.trim())) setHallGlass((words.trim() || saying.trim()));
  }, [hall, hallReply, saying, asking, words]);
  const title = facts ? conversationTitle(facts, 'Luna') : start?.title ?? 'Luna';
  const manualHref = cur?.scope.lineId ? `/lines/${encodeURIComponent(cur.scope.lineId)}` : cur?.scope.projectId ? `/project/${encodeURIComponent(cur.scope.projectId)}` : '/';

  const keepOk = keep === 'held' || keep === 'away';
  const buttonOk = button === 'ready';
  /* MAKE IT from the panel — the same write card flow as the colleague's make_record: what it will do said first, Do it runs it
     through runCall confirmed, and what happened is kept on the conversation's actions */
  const makeFromPanel = {
    preview: (d: ColleagueDraft) => previewCall(ctx(), { id: uid(), name: 'make_record', input: { draftId: d.id } }),
    run: async (d: ColleagueDraft) => {
      const cid = sid.current;
      const callId = uid();
      const r = await runCall(ctx(), { id: callId, name: 'make_record', input: { draftId: d.id } }, { confirmed: true });
      if (r.ok) showWork(r.refs.find(x => x.kind === 'study'));
      if (cid) await appendAction(patchStudy, cid, { callId, name: 'make_record', title: 'Make it a record', status: r.ok ? 'done' : 'failed', says: r.ok ? r.says : r.why, refs: r.ok ? r.refs : [], at: Date.now() });
      return r;
    },
  };
  const drafts = facts?.drafts ?? [];
  /* a factory draft's buttons (keep, leave out, pick) go through the same door as the colleague's add_to_factory_draft */
  const actOn = (draftId: string, items: FactoryOp[]): Promise<CapResult> => runCall(ctx(), { id: uid(), name: 'add_to_factory_draft', input: { draftId, items } }, { confirmed: false });
  const canMakeFactory = !projectHere || canAt(access.level).edit;
  /* THE MEASUREMENT RUNNING in this conversation (capabilities/operate — confirmed once, then captured as said): its strip, review,
     undo and end are the same capabilities the colleague uses, pressed here with no AI */
  const measure = study ? runningMeasure(study) : undefined;
  const [reviewing, setReviewing] = useState(false);
  const undoEvent = async (eventId?: string) => { const r = await runCall(ctx(), { id: uid(), name: 'undo_capture', input: eventId ? { eventId } : {} }, { confirmed: false }); setSaid(r.ok ? { text: r.says } : { text: r.why, bad: true }); };
  const endMeasure = async () => { const r = await runCall(ctx(), { id: uid(), name: 'end_measurement', input: {} }, { confirmed: false }); setSaid(r.ok ? { text: r.says } : { text: r.why, bad: true }); if (r.ok) showWork(r.show); };
  const walkF = facts as (WalkFacts | undefined);
  /* the conversation's results, charts and reports (docs/CONVERSATIONAL-DATA.md) — drawn on the turns that made them */
  const outs: Outs = useMemo(() => { const o = outputsOfConversation({ facts: (facts ?? {}) } as ToolStudy); return { results: new Map(o.results.map(r => [r.id, r])), charts: new Map(o.charts.map(c => [c.id, c])), reports: o.reports, artifacts: htmlArtifactsOf({facts: facts ?? {}}), ...(me ? { by: me } : {}) }; }, [facts, me]);
  const presentReport = useCallback((reportId: string) => {
    if (!sid.current) return;
    const rep = outs.reports.find(r => r.id === reportId);
    if (!rep) return;
    void setSessionFocus(patchStudy, sid.current, { reportId: rep.id, version: rep.version });
    nav(`/ai/present?c=${encodeURIComponent(sid.current)}&reportId=${encodeURIComponent(reportId)}`);
  }, [outs.reports]);
  /* the investigations agreed in this conversation (work_within, W3) — each with Stop */
  const agreedIds = (facts as { agreed?: string[] } | undefined)?.agreed ?? [];
  const agreed = projects.filter(p => agreedIds.includes(p.id)).map(p => ({ id: p.id, name: p.name }));
  /* the work in context (docs/LUNAR-ENVIRONMENT.md): once the conversation has begun on a line or a project, it comes into view beside her */
  const placed = !!(cur && (cur.scope?.lineId || cur.scope?.projectId || cur.scope?.problemId)) && turns.length > 0;
  const hasWork = placed || drafts.some(d => d.status === 'draft') || agreed.length > 0 || !!(cur && ((cur.points ?? []).length > 0 || (cur.notes ?? []).length > 0));
  const panelOpen = chosen !== null ? !chosen : (turns.length === 0 ? false : hasWork);
  const wide = !panelOpen;
  const toggleWide = () => {
    const next = !panelOpen;
    setChosen(!next);
    try { localStorage.setItem('fl-ai-wide', next ? '0' : '1'); } catch { /* this visit only */ }
  };
  /* Stop: the agreement withdrawn — the project, and every record inside it said yes to through it, ask again */
  const stopAgreed = async (pid: string) => {
    if (!study) return;
    const had = ((factsOfConversation((await getStudy(study.id)) as ToolStudy) as { authorised?: string[] }).authorised ?? []);
    const inside = new Set<string>([pid]);
    for (const x of had) if (x !== pid && (await getStudy(x))?.projectId === pid) inside.add(x);
    await patchStudy(study.id, c => ({ facts: { ...c.facts, agreed: ((c.facts as { agreed?: string[] }).agreed ?? []).filter(x => x !== pid), authorised: ((c.facts as { authorised?: string[] }).authorised ?? []).filter(x => !inside.has(x)) } as ToolStudy['facts'] }));
  };
  const workCtx = placed ? <WorkContext lineId={cur?.scope?.lineId} projectId={cur?.scope?.projectId} {...(cur?.scope?.machine ? { machine: cur.scope.machine } : {})} {...(cur?.scope?.problemId ? { problemId: cur.scope.problemId } : {})} open={href => { setCtxSheet(false); showWork({ kind: 'page', id: href, label: 'The work', href }); }} /> : null;
  const panel = <ContextPanel onReadFile={(f, o, c) => pickDoc(f, o, c)} agreed={agreed} onStop={id => void stopAgreed(id)} cur={cur} parked={parked} sources={sources} places={places} nameOf={nameOf} onBack={t => void backTo(t)} {...(walkF?.position ? { here: walkF.position } : {})} trail={walkF?.walk ?? []} room={(facts as { room?: string[] } | undefined)?.room ?? []}
    drafts={drafts} make={makeFromPanel} act={actOn} canMakeFactory={canMakeFactory} onSay={x => { setBox(x); setCtxSheet(false); window.setTimeout(() => box.current?.focus(), 0); }} />;

  /* 24 November — at most four items, never the voice essay. Account and Sign out stay on the avatar. */
  const slimMenuItems: MoreItem[] = [
    { label: 'Settings', hint: 'voice, how you work, how AI Mode is used', run: () => setSettingsSheet(true) },
    { label: 'Everything', hint: 'every page, line, project and record', run: () => openEverything() },
    { label: 'Recent work', hint: 'lines and places you opened lately', run: () => setRecentSheet(true) },
    { label: 'Turn AI Mode off', hint: 'Manual Mode is unchanged', run: () => setAiMode(false) },
  ];
  const galleryTurn = work?.kind === 'visuals' ? turns.find(t => t.id === work.id) : undefined;
  const savedArtifact = work?.kind === 'artifact' ? outs.artifacts.find(a => a.id === work.id) : undefined;
  const extraView = work?.kind === 'artifact'
    ? savedArtifact ? <ArtifactPreview key={savedArtifact.id} artifact={savedArtifact} cid={sid.current ?? id ?? ''} context={ctx} visible={workOpen} /> : <p>This file is no longer in Artifacts.</p>
    : work?.kind === 'visuals'
      ? galleryTurn ? <VisualWorkspace key={galleryTurn.id} turn={galleryTurn} request={requests.get(galleryTurn.id) ?? ''} outs={outs} conversationId={sid.current ?? id} onDashboard={document => void send(document ? 'Save HTML' : 'Turn these visuals into an HTML dashboard', galleryTurn.id)} /> : <p>These visuals are unavailable.</p>
      : undefined;
  const workPane = work && <WorkPane work={work} extra={extraView} label={savedArtifact?.title} outs={outs} conversationId={sid.current ?? id} open={workOpen} onClose={() => { visualDismissed.current = true; setWorkOpen(false); }} onGone={() => { visualDismissed.current = true; setWork(null); setWorkOpen(false); }} onPresent={presentReport} />;
  const headCalm = envCalmEmpty && title === 'Luna' && timers.running.length === 0 && !(work && !workOpen);
  const headBare = headCalm && !!barSlot;
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('.ai[data-ai-slot="page"]');
    if (!root) return;
    /* work open on empty: drop the empty-hero layout so the pane is a column, not a strip under the orb */
    if (envCalmEmpty && !workOpen) root.dataset.aiEmpty = '';
    else delete root.dataset.aiEmpty;
  }, [envCalmEmpty, workOpen]);

  return (
    <>
      <section className={'ai-main' + (wide ? ' is-wide' : '') + (hall ? ' is-hall' : '')} aria-label="The conversation" {...(hall ? { 'data-ai-hall-thread': '' } : {})}>
        {/* on a phone her menu is in the frame's top bar (useLunaBarSlot): this row stays only while it has something of its own to
            say — a conversation's own title, a timer running, the work put away */}
        <header className={'ai-head' + (barSlot ? ' is-bar' : '') + (headBare ? ' is-bare' : '') + (headCalm && !barSlot ? ' is-calm' : '')}>
          <LunaGlobe className="ai-head-av ai-orb" state={asking ? 'thinking' : undefined} />
          <div className="ai-head-main">
            {/* "LUNA" over a conversation's own title says whose it is; over the title "Luna" it said her name twice (12 November) */}
            {title !== 'Luna' && <p className="ai-eyebrow">LUNA</p>}
            <h1 className="ai-title" data-ai-title>{title}</h1>
          </div>
          <div className="ai-head-acts">
            {timers.running.slice(0, 1).map(t => (
              <span key={t.id} className="ai-timer" role="timer" aria-label={`${t.label} — ${leftSaid(t.endsAt - timers.now)} left`} data-timer><Icon name="time" size={14} />{leftSaid(t.endsAt - timers.now)}<span className="ai-timer-l">{t.label}</span></span>
            ))}
            {work && !workOpen && <button type="button" className="btn ai-work-b" data-work-show onClick={() => setWorkOpen(true)}><Icon name="board" size="1.05em" />Show the work</button>}
            {dock && <button type="button" className="btn ai-full-b" data-luna-full onClick={dock.onFull} title="Luna full width, the conversations beside"><Icon name="arrowUp" size="1.05em" />Full screen</button>}
            {dock && <button type="button" className="btn ai-close-b" data-luna-close onClick={dock.onClose} aria-label="Put Luna away"><Icon name="close" size="1.05em" /></button>}
            {!headCalm && !listOn && !barSlot && <button type="button" className="btn ai-list-b" aria-pressed={listOn} onClick={() => onList(false)} title="Earlier conversations" data-ai-list-b><Icon name="list" size="1.05em" />Conversations</button>}
            {!headCalm && !listOn && <button type="button" className="btn ai-new-b" onClick={onNew} title="Start a new conversation"><Icon name="plus" size="1.05em" />New</button>}
            {!headCalm && <button type="button" className="btn ai-ctx-b" aria-pressed={panelOpen} onClick={toggleWide} title={panelOpen ? 'Put the side panel away' : 'Side panel — context and work'} data-ai-ctx-b>
              <Icon name="board" size="1.05em" />{panelOpen ? 'Hide panel' : 'Side panel'}
            </button>}
            {!headCalm && !barSlot && <MoreMenu label="⋯" named="Settings" items={slimMenuItems} />}
          </div>
        </header>
        {barSlot && createPortal(
          <span className="ai-head-acts nv-luna-acts" data-luna-menu>
            <MoreMenu label="⋯" named="Settings" cls="nv-luna-b" items={slimMenuItems} />
          </span>, barSlot)}
        {!envCalmEmpty && cur && title !== cur.title && <p className="sub">Current subject · {cur.title}</p>}
        {!envCalmEmpty && (
          <LocationControl unfiledText={study ? 'Saved in Unfiled work' : 'No location chosen'} workspaceId={cur?.scope.lineId} may={!!session && !asking && (!projectHere || access.edit) && (!requestedThread || resumedThread.current === `${study?.id}:${requestedThread}`)} onPick={async workspaceId => { const cid = await ensure(); await placeLunaSubject(cid, cur?.id === 'start' ? undefined : cur?.id, workspaceId); }} />
        )}
        {!envCalmEmpty && talkOn && (
          <p className="ai-floor" data-ai-floor aria-live="polite">
            {keepSaid(keep) && <span className={'ai-floor-i' + (keep === 'held' || keep === 'away' ? '' : ' is-a')} data-keep={keep}><Icon name={keepOk ? 'check' : 'warning'} size={13} />{keepSaid(keep)}</span>}
            {buttonSaid(button) && <span className={'ai-floor-i' + (button === 'ready' ? '' : ' is-a')} data-button={button}><Icon name={buttonOk ? 'check' : 'warning'} size={13} />{buttonSaid(button)}</span>}
          </p>
        )}
        {/* WHAT CHANGED WHILE YOU WERE AWAY (21 November, docs/LUNA-AGENT.md G2): she looks at her linked files by herself when she is
            opened, and says the ones that have changed — never asked */}
        <KeepUpNews onRead={(f, o, c) => pickDoc(f, o, c)} onShow={s => void showChanged(s)} />
        {reminders.due.map(r => (
          <p key={r.id} className="ai-rung" role="alert" data-luna-reminder-due>Reminder — {r.what}. <button type="button" className="linkish" onClick={() => reminders.dismiss(r.id)}>OK</button></p>
        ))}
        {reminders.upcoming.slice(0, 3).map(r => (
          <p key={r.id} className="sub ai-reminder" data-luna-reminder>I'll remind you {niceDay(r.due, { weekday: 'short' })} — {r.what}. <button type="button" className="linkish" onClick={() => reminders.dismiss(r.id)}>Cancel</button></p>
        ))}
        <ServerJobNews conversationId={sid.current ?? id ?? study?.id} ctx={ctx} run={async call => {
          const r = await runCall(ctx(), call, { confirmed: false });
          return r.ok ? { id: call.id, ok: true, says: r.says, ...(r.data !== undefined ? { data: r.data } : {}) } : { id: call.id, ok: false, says: r.why };
        }} onMerged={row => void mergeServerJob(row)} />
        <StandingDigestNews onShow={t => void showDigest(t)} />
        {measure && <MeasureStrip m={measure} onUndo={() => void undoEvent()} onReview={() => setReviewing(true)} onEnd={() => void endMeasure()} onShow={() => setWorkOpen(true)} />}
        {timers.ended.map(t => (
          <p key={t.id} className="ai-rung" role="alert" data-timer-ended>The timer for “{t.label}” has ended. <button type="button" className="linkish" onClick={() => timers.dismiss(t.id)}>Dismiss</button></p>
        ))}
        {/* THE PHONE'S STRIP: what it is on now, and what is parked — the context panel in a sheet */}
        {!envCalmEmpty && (
          <button type="button" className="ai-strip" onClick={() => setCtxSheet(true)} aria-label="What this conversation is on, and what is parked">
            <span className="ai-strip-l">Now on</span>
            <b className="ai-strip-t">{cur?.title ?? 'Nothing yet'}</b>
            {parked.length > 0 && <span className="ai-strip-p">{parked.length} parked</span>}
            <Icon name="chevronDown" size={14} />
          </button>
        )}

        {threads.length>1&&<p className="sub">Conversation history · all subjects</p>}
        <ol className="ai-turns" ref={scroller} aria-label="The conversation" aria-live="polite">
          {turns.length === 0 && (
            <li className="ai-empty">
              <LunaGlobe className={'ai-empty-av ai-orb is-big is-alive' + (lunaProductEmpty ? ' is-hero' : '')} size={lunaProductEmpty ? 'stage' : 'mark'} />
              <p className="ai-empty-g">Luna</p>
            </li>
          )}
          {turns.map(t => t.kind === 'reply'
            ? <ReplyTurn key={t.id} request={requests.get(t.id) ?? ''} conversationId={sid.current} actionContext={{workspaceId:t.actionScope ? t.actionScope.lineId : study?.workspaceId,projectId:t.actionScope ? t.actionScope.projectId : study?.projectId}} outs={outs} onTrack={yes => void send(yes ? 'Track this dashboard' : 'Keep a snapshot', t.id)} onDashboard={document => void send(document ? 'Save HTML' : 'Turn these visuals into an HTML dashboard', t.id)} activeGallery={workOpen && work?.kind === 'visuals' && work.id === t.id && !hall} onPresent={presentReport} onShow={r => { setCtxSheet(false); showWork(r); }} t={t} here={asking === t.id} words={asking === t.id ? words : ''} {...(asking === t.id && cur?.job ? { job: cur.job } : {})} live={waits.current} hands={talkOn} onCard={(c, y) => answerCard(c, y)} onSuggest={x => { setBox(x); box.current?.focus(); }} onAgain={() => sid.current && void ask(sid.current)} />
            : <PersonTurn key={t.id} t={t} label={labels.get(t.id)} />)}
        </ol>

        <div className={'ai-compose' + (listening ? ' is-on' : '')} data-ai-compose role="group" aria-label="Ask Luna">
          {said && <p className={'sub ai-said' + (said.bad ? ' is-r' : '')} role="status">{said.text}</p>}
          {listening && !voice && (
            <p className="ai-state is-listening" role="status" data-ai-listening><span className="ai-pulse" aria-hidden />Listening…<span className="sub"> what you say comes up in the box</span>
              <button type="button" className="linkish ai-dict-x" data-dictate-cancel onClick={() => { const e = ear.current; ear.current = null; e?.abort(); setListening(false); stopQuiet(); if (voiceRef.current.soundOn) earcon('stop'); setBox(base.current); }}>Cancel</button>
              <button type="button" className="linkish" data-dictate-done onClick={() => void stopListening()}>Done</button>
            </p>
          )}
          {!listening && speaking && (
            <p className="ai-state is-speaking" role="status" data-ai-speaking>
              <Icon name="spark" size={13} />Speaking…
              <button type="button" className="linkish" onClick={() => { stopSpeaking(); if (talkOn) startListening(); }}>{talkOn ? 'Stop and talk' : 'Stop'}</button>
            </p>
          )}
          <form className="ai-type" onSubmit={e => { e.preventDefault(); if (canSend) void send(); }}>
            <input ref={photoIn} type="file" accept="image/*" multiple hidden aria-label="Choose photos" onChange={e => { void addPhotos([...(e.target.files ?? [])]); e.target.value = ''; }} />
            <input ref={camIn} type="file" accept="image/*" capture="environment" hidden aria-label="Take a photo with the camera" onChange={e => { void addPhotos([...(e.target.files ?? [])]); e.target.value = ''; }} />
            <MicrosoftPicker open={msPick} guest={microsoftAsked && liveRoute.query.get('guest') === '1'} onClose={() => { setMsPick(false); if (microsoftAsked) navReplace('/ai'); }} onPick={(f, o) => pickDoc(f, o)} onPickMany={picks => readWorkbookFiles(picks)} />
            {whose && <WhoseSheet customers={whose.customers} onClose={() => { setWhose(null); setImported('Nothing was connected — a file is connected to a customer.'); }} onPick={c => { const go = whose.go; setWhose(null); go(c); }} />}
            <ConnectSheet open={connect} onClose={() => { setConnect(null); if (linkAsked) navReplace('/ai'); }} onPick={(f, o) => pickDoc(f, o)} onMicrosoft={() => { setConnect(null); setMsPick(true); }} />
            <input ref={docIn} type="file" accept=".csv,.pdf,.docx,.txt,.md,.xlsx,.xlsm,.xls,text/csv,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel.sheet.macroEnabled.12,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*" hidden multiple aria-label="Choose a factory document" onChange={e => { pickDocs([...(e.target.files ?? [])]); e.target.value = ''; }} />
            {wb && (
              <div className="ai-imported ai-wb" data-workbook={wb.p ? 'reading' : wb.bad ? 'failed' : 'read'} role="status">
                {wb.p
                  ? <><span>Reading “{wb.name}” — <b data-workbook-pct>{Math.min(99, Math.floor((wb.p.done / Math.max(1, wb.p.total)) * 100))}%</b></span> <button type="button" className="b ghost" data-workbook-stop onClick={stopWorkbook}>Stop</button></>
                  : <><span data-workbook-said>{wb.said}</span> <button type="button" className="b ghost" aria-label="Close" onClick={() => { setWb(null); setAttachAbilities(null); }}>×</button></>}
              </div>
            )}
            {attachAbilities && !wb?.p && <ConnectionAbilities kind={attachAbilities} />}
            {imported && <p className="ai-imported" data-imported role="status">{imported} <button type="button" className="b ghost" aria-label="Close" onClick={() => setImported(null)}>×</button></p>}
            <div className="ai-box-wrap">
              <textarea ref={box} className="ai-box" rows={1} value={typing} maxLength={4000}
                placeholder={listening ? 'Listening — talk…' : 'Ask Luna…'} aria-label="Ask Luna"
                onChange={e => { const er = ear.current; if (er) { ear.current = null; er.abort(); setListening(false); stopQuiet(); } stopSpeaking(); setBox(e.target.value); }}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && window.matchMedia?.('(pointer: fine)').matches) { e.preventDefault(); if (canSend) void send(); } }} />
              <button type="button" className={'ai-tb ai-mic ai-mic-in' + (listening ? ' is-on' : '')} aria-pressed={listening}
                aria-label={listening ? 'Stop listening' : 'Talk into the box'} title={listening ? 'Stop listening' : 'Talk into the box'}
                onClick={() => { if (listening) void stopListening(); else startListening(); }}>
                <Icon name={listening ? 'stop' : 'mic'} size="1.25em" />
              </button>
            </div>
            <div className="ai-tools">
              <div className="ai-attach" ref={attachRef}>
                <button type="button" className={'ai-tb ai-plus' + (attach ? ' is-on' : '')} aria-haspopup="menu" aria-expanded={attach}
                  aria-label="Add — a photo or a factory document" title="Add a photo or a factory document" onClick={() => setAttach(a => !a)}>
                  <Icon name="plus" size="1.3em" />
                </button>
                {attach && (
                  <div className="ai-attach-m" role="menu" aria-label="Add to the conversation" data-attach-menu>
                    <button type="button" role="menuitem" className="ai-attach-i" data-take-photo data-camera onClick={takePhoto}>
                      <span className="ai-attach-ic"><Icon name="camera" size="1.15em" /></span><span><b>Take a photo</b><span className="sub">with this device’s camera</span></span>
                    </button>
                    <button type="button" role="menuitem" className="ai-attach-i" onClick={() => pickFrom(photoIn.current)}>
                      <span className="ai-attach-ic"><Icon name="photo" size="1.15em" /></span><span><b>Photos</b><span className="sub">one or several from your pictures</span></span>
                    </button>
                    <button type="button" role="menuitem" className="ai-attach-i" data-add-doc onClick={() => pickFrom(docIn.current)}>
                      <span className="ai-attach-ic"><Icon name="document" size="1.15em" /></span><span><b>A file or spreadsheet</b><span className="sub">Excel or CSV figures to ask about — several months at once — or a factory document (PDF, Word)</span></span>
                    </button>
                    {/* CONNECT — ONE ROW for everything that is not on this device (21 November — Rowland: "I should just have one click,
                        one button. Connect. And then what am I connecting to? And I connect."). It was two rows — Connect to Microsoft
                        (20 November) and A link to a file — each explaining itself; the sheet asks the one question instead
                        (colleague/ConnectSheet): a link, or Microsoft 365 */}
                    <button type="button" role="menuitem" className="ai-attach-i" data-connect-open onClick={() => { setAttach(false); setConnect('choose'); }}>
                      <span className="ai-attach-ic"><Icon name="cloud" size="1.15em" /></span><span><b>Connect</b><span className="sub">to a file by its link, or to SharePoint and OneDrive</span></span>
                    </button>
                  </div>
                )}
              </div>
              <span className="ai-tools-gap" />
              <button type="button" className={'ai-tb ai-mic ai-mic-bar' + (listening ? ' is-on' : '')} aria-pressed={listening}
                aria-label={listening ? 'Stop listening' : 'Talk into the box'} title={listening ? 'Stop listening' : 'Talk into the box'}
                onClick={() => { if (listening) void stopListening(); else startListening(); }}>
                <Icon name={listening ? 'stop' : 'mic'} size="1.25em" />
              </button>
              <button type="button" className="ai-tb ai-voice" aria-label="Voice conversation" title="Talk with Luna — she listens, answers out loud and listens again" onClick={openVoice} data-voice-open>
                <Icon name="wave" size="1.25em" /><span className="ai-voice-l">Talk</span>
              </button>
              {!hall && <button type="button" className="ai-tb ai-conversation" aria-label="Conversation mode" title="Conversation mode — full screen, speak only" onClick={() => enterConversationMode({ ...(sid.current ? { conversationId: sid.current } : {}), ...(cur?.scope.lineId ? { lineId: cur.scope.lineId } : {}), ...(cur?.scope.projectId ? { projectId: cur.scope.projectId } : {}) })} data-conversation-open><Icon name="spark" size="1.25em" /></button>}
              <span className="ai-compose-more-wrap"><MoreMenu label="More" cls="ai-compose-more" named="More ways to talk to Luna" items={composeExtras} /></span>
              {asking
                ? <button type="button" className="ai-send is-stop" aria-label="Stop" title="Stop — Luna stops where she is; what she has done is kept" disabled={stopping} onClick={stopNow} data-ai-stop><Icon name="stop" size="1.25em" /></button>
                : <button type="submit" className="ai-send" aria-label="Send" title="Send" disabled={!canSend}><Icon name="arrowUp" size="1.25em" /></button>}
            </div>
          </form>
          {showHint && <p className="sub ai-hint" aria-live="polite">{hintText}</p>}
        </div>
      </section>
      <aside className={`ai-ctx${drafts.length > 0 || agreed.length > 0 ? ' is-building' : ''}`} aria-label="What this conversation is on">{workCtx}{panel}</aside>
      {!hall && workPane}
      <Sheet open={reviewing} onClose={() => setReviewing(false)} title={measure ? `${measure.label} — what has been captured` : 'What has been captured'}>
        {measure && <MeasureReview m={measure} onUndo={id => void undoEvent(id)} />}
      </Sheet>
      <Sheet open={ctxSheet} onClose={() => setCtxSheet(false)} title="What this is on">{workCtx}{panel}</Sheet>
      <Sheet open={recentSheet} onClose={() => setRecentSheet(false)} title="Recent work">
        <EnvStart plain onAsk={x => { setRecentSheet(false); setBox(x); window.setTimeout(() => box.current?.focus(), 0); }} onOpen={(href, label) => { setRecentSheet(false); showWork({ kind: 'page', id: href, label, href }); }} />
      </Sheet>
      {prefsSheet && <PreferencesSheet open={prefsSheet} onClose={() => setPrefsSheet(false)} />}
      <Sheet open={settingsSheet} onClose={() => setSettingsSheet(false)} title="Settings">
        <SheetRow label="How I work" hint="what Luna always knows about how you work" onClick={() => { setSettingsSheet(false); setPrefsSheet(true); }} />
        {canSpeak() && <SheetRow label="Speak replies" value={speakOn ? 'On' : 'Off'} onClick={() => { if (speakOn) stopSpeaking(); setSpeakOn(!speakOn); }} />}
        <SheetRow label="Conversation" value={talkOn ? 'On' : 'Off'} hint="she listens after each reply" onClick={() => { setTalkOn(!talkOn); if (!talkOn && !speakOn && canSpeak()) setSpeakOn(true); }} />
        <SheetRow label="Sounds" value={soundOn ? 'On' : 'Off'} onClick={() => setSoundOn(!soundOn)} />
        <SheetRow label="How AI Mode is used" onClick={() => { setSettingsSheet(false); nav('/ai/usage'); }} />
        <SheetRow label="Conversation mode" hint="full screen — speak only" onClick={() => { setSettingsSheet(false); enterConversationMode({ ...(sid.current ? { conversationId: sid.current } : {}), ...(cur?.scope.lineId ? { lineId: cur.scope.lineId } : {}), ...(cur?.scope.projectId ? { projectId: cur.scope.projectId } : {}) }); }} />
        <SheetRow label="Before you walk the floor" onClick={() => { setSettingsSheet(false); void runCheck(); }} />
        <SheetRow label="Back to Faultline" onClick={() => { setSettingsSheet(false); nav(manualHref); }} />
      </Sheet>
      <FactoryDocSheet picked={docPicked} onClose={() => setDocPicked(null)} read={readDoc} lines={lines} lineId={cur?.scope.lineId} keep={keepDoc} />
      {camera && createPortal(<VideoRecorder start="photo" photoOnly onPhoto={b => void addPhotos([b])} onCapture={() => undefined} onClose={() => setCamera(false)} />, document.body)}
      {voice && (hall ? (
        <ConversationMode work={workOpen ? workPane : undefined} preview={work && !workOpen ? <button type="button" className="btn" onClick={() => setWorkOpen(true)}>Open {work.label}</button> : undefined} state={vState} title={title} heard={listening ? typing : ''} saying={saying} reply={hallGlass || hallReply || saying} note={vNote} route={route} prefs={vPrefs} setPrefs={setVPrefs}
          heardTick={heardTick} cardWaiting={waitingCard} card={hallCard}
          thread={<ol className="ai-turns" aria-label="The conversation">{turns.map(t => t.kind === 'reply'
            ? <ReplyTurn key={t.id} request={requests.get(t.id) ?? ''} conversationId={sid.current} actionContext={{ workspaceId: t.actionScope ? t.actionScope.lineId : study?.workspaceId, projectId: t.actionScope ? t.actionScope.projectId : study?.projectId }} outs={outs} onTrack={yes => void send(yes ? 'Track this dashboard' : 'Keep a snapshot', t.id)} onDashboard={document => void send(document ? 'Save HTML' : 'Turn these visuals into an HTML dashboard', t.id)} activeGallery={workOpen && work?.kind === 'visuals' && work.id === t.id && !hall} onPresent={presentReport} onShow={r => { setCtxSheet(false); showWork(r); }} t={t} here={asking === t.id} words={asking === t.id ? words : ''} {...(asking === t.id && cur?.job ? { job: cur.job } : {})} live={waits.current} hands={talkOn} onCard={(c, y) => answerCard(c, y)} onSuggest={x => { setBox(x); box.current?.focus(); }} onAgain={() => sid.current && void ask(sid.current)} />
            : <PersonTurn key={t.id} t={t} label={labels.get(t.id)} />)}</ol>}
          onTap={voiceTap} onInterrupt={voiceInterrupt} onMute={voiceMute}
          onChat={() => { /* sheet holds the thread in ConversationMode */ }} onEnd={() => void closeVoice()} />
      ) : (
        <VoiceMode state={vState} title={title} heard={listening ? typing : ''} saying={saying} note={vNote} route={route} prefs={vPrefs} setPrefs={setVPrefs}
          heardTick={heardTick} cardWaiting={waitingCard} onTap={voiceTap} onInterrupt={voiceInterrupt} onMute={voiceMute}
          onChat={() => void closeVoice()} onEnd={() => void closeVoice()} bar={!!dock || !shown} />
      ))}
      <Sheet open={checking !== null} onClose={() => setChecking(null)} title="Before you walk the floor">
        <div className="ai-check-in" data-floor-check>
          <p className="sub">{FLOOR_LIMIT}</p>
          {checking === 'running' ? <p className="sub" role="status">Checking this phone…</p> : (
            <ul className="ai-checks">
              {(checking ?? []).map(c => (
                <li key={c.key} className={'ai-checks-i' + (c.ok ? ' is-g' : ' is-a')} data-check={c.key} data-ok={c.ok ? 'yes' : 'no'}>
                  <Icon name={c.ok ? 'check' : 'warning'} size={15} />
                  <span><b>{c.label}</b><span className="sub">{c.said}</span></span>
                </li>
              ))}
            </ul>
          )}
          <button type="button" className="btn" disabled={checking === 'running'} onClick={() => void runCheck()}>Check again</button>
        </div>
      </Sheet>
    </>
  );
}

/* ================================================================ the turns */

/* AN ANSWER'S WORDS — paragraphs, lists of lines starting "- " or "1.", **bold**; drawn by React, never as HTML */
/** `growing`: the words still being written — not yet checked (their figures are checked once the reply is complete). */
function Words({ text, check, growing }: { text: string; check?: readonly string[]; growing?: boolean }) {
  const parts: ({ list: string[]; ordered: boolean } | { para: string })[] = [];
  for (const line of text.split('\n')) {
    const item = /^\s*([-•*]|\d+[.)])\s+(.*)$/.exec(line);
    const last = parts[parts.length - 1];
    if (item) {
      const ordered = /\d/.test(item[1]);
      if (last && 'list' in last && last.ordered === ordered) last.list.push(item[2]); else parts.push({ list: [item[2]], ordered });
    } else if (line.trim()) { if (last && 'para' in last && last.para) last.para += `\n${line}`; else parts.push({ para: line }); }
    else parts.push({ para: '' });
  }
  /* a figure to check marked where it stands — the words kept, the mark saying why */
  const marked = (t: string, k: string | number) => (check?.length ? markFigures(t, check).map((x, j) => (x.check ? <mark key={`${k}-${j}`} className="ai-fig-check" data-ai-fig-check title="Not in Faultline’s working or what you said — check this">{x.text}</mark> : x.text)) : t);
  const bold = (t: string) => t.split(/(\*\*[^*]+\*\*)/g).map((x, i) => (x.startsWith('**') && x.endsWith('**') && x.length > 4 ? <b key={i}>{marked(x.slice(2, -2), i)}</b> : <span key={i}>{marked(x, i)}</span>));
  return (
    <div className="ai-words" {...(growing ? { 'data-ai-growing': '', 'data-ai-unchecked': '' } : {})}>
      {parts.filter(p => !('para' in p) || p.para).map((p, i) => ('list' in p
        ? (p.ordered ? <ol key={i}>{p.list.map((x, j) => <li key={j}>{bold(x)}</li>)}</ol> : <ul key={i}>{p.list.map((x, j) => <li key={j}>{bold(x)}</li>)}</ul>)
        : <p key={i}>{bold(p.para)}</p>))}
    </div>
  );
}

function PersonTurn({ t, label }: { t: ColleagueTurn; label?: string }) {
  const url = useBlobUrl(t.media?.blobKey);
  const wt = t as WalkTurn;
  const w = (t.text ?? t.heard ?? '').trim();
  return (
    <li className={'ai-turn is-person' + (t.struck ? ' is-struck' : '')} data-turn={t.id} data-kind={t.kind}>
      <span className="ai-meta">{t.who ?? 'You'} · {hhmm(t.at)}{t.kind === 'said' ? ' · said' : ''}{label ? <> · <b>{label}</b></> : null}</span>
      <div className="ai-bubble">
        {t.kind === 'photo' && (url ? <img className="ai-photo" src={url} alt={t.text || `Photo ${label ?? ''}`} /> : <span className="sub">The photo is on another device.</span>)}
        {w && <p>{w}</p>}
        {/* where it was taken and what it is filed to (10 November, docs/FACTORY-WALK.md) */}
        {t.kind === 'photo' && (wt.where || wt.filed?.length) ? (
          <p className="ai-photo-at" data-photo-at>{wt.where ? <>Taken at {placeSaid(wt.where)}</> : null}{wt.filed?.length ? <>{wt.where ? ' · ' : ''}Filed to {wt.filed.map(l => l.label).join(', ')}</> : null}</p>
        ) : null}
      </div>
    </li>
  );
}

const KEY_WORD: Record<string, string> = {
  words: 'What', title: 'Title', name: 'Name', machine: 'Machine', priority: 'Priority', how: 'How it is known', owner: 'Who', due: 'By',
  status: 'Where it stands', latest: 'Latest', method: 'Method', key: 'Calculator', minutes: 'Minutes', label: 'For',
};
const STATUS_WORD: Record<string, string> = { todo: 'Open', doing: 'Under way', done: 'Closed' };

/** A write's inputs as the card shows them — words, not ids. */
function cardRows(input: Record<string, unknown> | undefined): { k: string; v: string }[] {
  if (!input) return [];
  return Object.entries(input).flatMap(([k, v]) => {
    if (!(k in KEY_WORD) || v === undefined || v === null || v === '') return [];
    const s = typeof v === 'string' ? (k === 'status' ? STATUS_WORD[v] ?? v : k === 'how' || k === 'priority' ? v[0].toUpperCase() + v.slice(1) : v) : typeof v === 'number' ? String(v) : Array.isArray(v) ? v.join(', ') : '';
    return s ? [{ k: KEY_WORD[k], v: s }] : [];
  });
}

function RefChips({ refs: all, label = 'Records' }: { refs: readonly CapRef[]; label?: string }) {
  const refs = all.filter(r => r.kind !== 'chart' && r.kind !== 'convreport' && r.kind !== 'result');
  if (!refs.length) return null;
  return (
    <span className="ai-refs" role="group" aria-label={label}>
      {uniqueRefs(refs).slice(0, 8).map(r => (
        <button key={`${r.kind}:${r.id}`} type="button" className="ai-ref" data-ref={`${r.kind}:${r.id}`} onClick={() => openAsWork(r.href)} title={`Open ${r.label} — Luna stays beside it`}>
          <span className="ai-ref-k">{r.kind === 'page' ? 'Page' : r.kind[0].toUpperCase() + r.kind.slice(1)}</span><span className="ai-ref-l">{r.label}</span><Icon name="chevron" size={12} />
        </button>
      ))}
    </span>
  );
}

/** A step's mark: done ticked, failed or dropped a warning, the rest a look. */
const stepIcon = (st: Used['status']): IconName => (st === 'done' ? 'check' : st === 'failed' || st === 'dropped' ? 'warning' : 'search');

interface Outs extends VisualOutputs { artifacts: HtmlArtifact[] }
function ReplyTurn({ t, request, here, words, live, hands, onCard, onSuggest, onAgain, outs, onShow, onPresent, conversationId, actionContext, job, onDashboard, onTrack, activeGallery }: {
  /** The job in hand while this turn is being worked (docs/LUNA-AGENT.md) — its plan, ticking. */
  job?: ColleagueJob;
  request: string; actionContext?: {workspaceId?:string;projectId?:string}; conversationId?: string; t: ColleagueTurn; here: boolean; words: string; live: ReadonlyMap<string, unknown>; hands: boolean; onCard: (callId: string, yes: boolean) => void; onSuggest: (x: string) => void; onAgain: () => void; outs?: Outs; onShow?: (r: WorkRef) => void; onPresent?: (reportId: string) => void; onDashboard?: (document: boolean) => void; onTrack?: (yes: boolean) => void; activeGallery?: boolean;
}) {
  if (t.artifactId) {
    const artifact = outs?.artifacts.find(a => a.id === t.artifactId);
    return <li className="ai-turn is-colleague" data-turn={t.id} data-kind="reply">
      <LunaGlobe className="ai-avatar ai-orb" />
      <div className="ai-turn-b"><span className="ai-meta">Luna · {hhmm(t.at)}</span>
        {artifact ? <><p>{t.text}</p><button type="button" className="luna-file-receipt" onClick={() => onShow?.(artifactRef(artifact.id, artifact.title))}>
          <Icon name="document" size={20} /><span><strong>{artifact.title}</strong><small>{artifact.tracking === 'live' ? 'Artifacts · Live HTML' : 'Artifacts · HTML'}</small></span><Icon name="chevron" size={16} /></button>
          {t.trackingOffer && artifact.recipe && !artifact.tracking && <div className="luna-visual-actions"><button type="button" className="btn btn-sm" onClick={() => onTrack?.(true)}>Yes, track changes</button><button type="button" className="linkish" onClick={() => onTrack?.(false)}>Keep a snapshot</button></div>}</> : <p>This HTML file was removed from Artifacts.</p>}
      </div></li>;
  }
  if (t.workbookReceipt) return (
    <li className="ai-turn is-colleague" data-turn={t.id} data-kind="reply" data-workbook-receipt>
      <LunaGlobe className="ai-avatar ai-orb" />
      <div className="ai-turn-b"><span className="ai-meta">Luna · {hhmm(t.at)}</span><p data-ai-code="1">{t.text}</p></div>
    </li>
  );
  const used = t.used ?? [];
  /* what this turn made — a chart as the version it made, a report as its newest (docs/CONVERSATIONAL-DATA.md) */
  const made = used.flatMap(u => u.refs).filter(r => r.kind === 'chart' || r.kind === 'convreport' || r.kind === 'result').filter((r, i, all) => all.findIndex(x => x.kind === r.kind && x.id === r.id) === i);
  const visual = outs && !t.answering ? visualsOf(t, request, outs) : undefined;
  const documentOnly = !!visual && !visual.charts.length && !visual.forms.length && visual.reports.length === 1 && textDocument(visual.reports[0]);
  const visualCount = visual ? visual.charts.length + visual.reports.length + visual.forms.length : 0;
  const steps = used.filter(u => u.kind !== 'write');
  const cards = used.filter(u => u.kind === 'write');
  return (
    <li className={'ai-turn is-colleague' + (t.struck ? ' is-struck' : '')} data-turn={t.id} data-kind="reply">
      <LunaGlobe className="ai-avatar ai-orb" state={t.answering === 'waiting' && here ? 'thinking' : undefined} />
      <div className="ai-turn-b">
        <span className="ai-meta">Luna · {hhmm(t.at)}</span>
        {t.answering === 'waiting' && here && (words ? <Words text={words} growing /> : <p className="sub ai-thinking" data-ai-working><span className="ai-dots" aria-hidden><i /><i /><i /></span>Luna is working on it…{steps.length > 0 && <span className="ai-working-now"> {steps[steps.length - 1].title}</span>}</p>)}
        {/* THE JOB, TICKING (21 November, docs/LUNA-AGENT.md): while she works a job her plan is under her words, each step saying where it
            stands; once she has answered it is kept folded under the answer, as her working is */}
        {t.answering === 'waiting' && here && job && <JobList job={job} live />}
        {t.answering === 'waiting' && !here && <p className="sub ai-line">{t.why ?? 'Not answered yet.'} <button type="button" className="linkish" onClick={onAgain}>Ask again</button></p>}
        {t.answering === 'failed' && <p className="sub ai-line is-off" data-ai-failed>{t.why ?? 'Luna could not answer.'} <button type="button" className="linkish" onClick={onAgain}>Ask again</button></p>}
        {!t.answering && t.text && <Words text={t.text} check={t.unsure} />}
        {!activeGallery && !t.answering && outs && <ReplyCharts request={request} steps={used} results={outs.results} charts={outs.charts} onShow={onShow} />}

        {visualCount > 0 && <div className="luna-visual-actions">
          {visualCount > 1 && !activeGallery && <button type="button" className="linkish" onClick={() => onShow?.(galleryRef(t.id))}>Open visuals together</button>}
          {(visual?.charts.length || visual?.reports.length) && !activeGallery ? <button type="button" className="linkish" onClick={() => onDashboard?.(documentOnly)}>{documentOnly ? 'Save HTML' : 'Make HTML dashboard'}</button> : null}
          {activeGallery && <span className="sub">Visuals open beside this conversation</span>}
        </div>}
        {/* HER WORKING, PUT AWAY (10 November — Rowland: "All I want to see basically is Luna working, and then what? … I see everything that she
            asks to look for … It's all a bit messy"): while she works, one line of what she is doing; once she has answered, her answer first
            and every step folded under one line, open to anyone who wants to check how she got there */}
        {t.job && !(t.answering === 'waiting' && here) && (
          <details className="ai-working" data-ai-job-kept>
            <summary>The job · {jobStands(t.job)}</summary>
            <JobList job={t.job} />
          </details>
        )}
        {steps.length > 0 && !(t.answering === 'waiting' && here) && (
          <details className="ai-working" data-ai-steps>
            <summary>How Luna worked it out · {steps.length} step{steps.length === 1 ? '' : 's'}</summary>
            <ul className="ai-steps" aria-label="What it looked at">
              {steps.map(u => (
                <li key={u.callId} className={'ai-step is-' + u.status} data-step={u.name}>
                  <Icon name={stepIcon(u.status)} size={14} />
                  <span className="ai-step-w"><b>{u.title}</b> — {u.says}</span>
                  <RefChips refs={u.refs} />
                </li>
              ))}
            </ul>
            {onShow && made.some(ref => ref.kind === 'chart') && made.filter(ref => ref.kind === 'result').map(ref => <button key={ref.id} type="button" className="linkish ai-beside" data-show-beside={'result:' + ref.id} onClick={() => onShow(ref)}>{ref.label || 'Open result'}</button>)}
          </details>
        )}
        {outs && made.map(r => {
          const [id, v] = r.id.split('@');
          /* beside the conversation, as the work (docs/LUNAR-ENVIRONMENT.md) — the chart, the result's table, the report as its document */
          const beside = onShow && <button key={`b-${r.kind}-${r.id}`} type="button" className="linkish ai-beside" data-show-beside={`${r.kind}:${r.id}`} onClick={() => onShow(r)}>Show beside the conversation ›</button>;
          if (r.kind === 'result' && made.some(ref => ref.kind === 'chart')) return null;
          if (r.kind === 'result') { const res = outs.results.get(id); return res ? <p key={r.id} className="sub ai-out-line" data-result-line={id}>Result {id} — {res.title}. {beside}</p> : null; }
          if (r.kind === 'chart') return null;
          const rep = outs.reports.find(x => x.id === id);
          const lastRef = [...made].reverse().find(x => x.kind === 'convreport' && x.id.startsWith(`${id}@`));
          const latestHere = (Number(v) || rep?.version) === rep?.version && lastRef?.id === r.id;
          return rep ? <div key={r.id}><ReportCard report={rep} version={Number(v) || rep.version} latest={latestHere} results={outs.results} charts={outs.charts} conversationId={conversationId} {...(outs.by ? { by: outs.by } : {})} {...(latestHere && onPresent ? { onPresent: () => onPresent(rep.id) } : {})} />{latestHere && beside}</div> : null;
        })}
        {!t.answering && (t.text || made.length > 0) && conversationId && <details className="ai-working" data-reply-faultline><summary>Use in Faultline</summary><CreateAction sources={[
          {kind:'conversation',id:conversationId,part:t.id,href:`/ai?c=${encodeURIComponent(conversationId)}`,label:'Luna conversation',how:'ai',excerpt:t.text?.slice(0,1200)},
          ...made.flatMap((r): ActionSource[] => r.id ? [{kind:r.kind === 'convreport' ? 'report' : r.kind === 'chart' ? 'chart' : 'result',id:r.id,href:r.href || `/ai?c=${encodeURIComponent(conversationId)}&work=${encodeURIComponent(`${r.kind}:${r.id}`)}`,label:r.label + (r.id.includes('@') ? ` · version ${r.id.split('@')[1]}` : ''),how:r.kind === 'convreport' ? 'ai' : 'record'}] : []),
        ]} context={actionContext} /><ActionsFromSource source={{kind:'conversation',id:conversationId,part:t.id,href:`/ai?c=${encodeURIComponent(conversationId)}`,label:'Luna conversation',how:'ai'}} /></details>}
        {/* RECEIPTS (W3): a write that went in without a card — said yes to before, or inside the agreed investigation — one line
            each, what landed and where; a card only for what was asked */}
        {cards.filter(u => u.auto && u.status === 'done').map(u => (
          <p key={u.callId} className="ai-receipt" data-receipt={u.name}><Icon name="check" size={13} /><span><b>{u.title}</b> — {u.says}</span><RefChips refs={u.refs} label="Where it landed" /></p>
        ))}
        {cards.filter(u => !(u.auto && u.status === 'done')).map(u => <WriteCard key={u.callId} u={u} live={live.has(u.callId)} hands={hands} onCard={onCard} />)}
        {/* EVERY FIGURE CHECKED (docs/LUNA-NEXT.md L1): the count looked for in Faultline's working, and those found nowhere marked in the
            words above and named here */}
        {!t.answering && (t as { byCode?: boolean }).byCode && <p className="ai-figs sub" data-ai-code="1">Done in the app — no AI used.</p>}
        {!t.answering && t.checked !== undefined && !t.unsure?.length && figuresSaid({ checked: t.checked, unsure: [] }) && (
          <p className="ai-figs is-ok sub" data-ai-figures="ok"><Icon name="check" size={13} /> {figuresSaid({ checked: t.checked, unsure: [] })}</p>
        )}
        {!t.answering && !!t.unsure?.length && (
          <p className="ai-unsure" data-ai-unsure>
            {t.checked !== undefined && <span className="ai-figs-k" data-ai-figures="check">{figuresSaid({ checked: Math.max(t.checked, t.unsure.length), unsure: t.unsure })}</span>}
            {t.unsure.map(x => <span key={x} className="ai-check">Check this: {x}</span>)}
            {t.checked === undefined && <span className="sub"> — not in what Faultline holds or what you said.</span>}
          </p>
        )}
        {!t.answering && !!t.suggestions?.length && (
          <div className="ai-sugs" role="group" aria-label="Say next">
            {t.suggestions.slice(0, 3).map(x => <button key={x} type="button" className="chip ai-sug" onClick={() => onSuggest(x)}>{x}</button>)}
          </div>
        )}
      </div>
    </li>
  );
}

/** A WRITE, ASKED — what it will do, the inputs that matter, Do it · Not now; then what happened. */
function WriteCard({ u, live, hands, onCard }: { u: Used; live: boolean; hands: boolean; onCard: (callId: string, yes: boolean) => void }) {
  const rows = cardRows(u.input);
  const batch = u.batch;
  const liveCard = live && (!batch || batch.callIds[0] === u.callId);
  if (u.status === 'refused') {
    return <p className="ai-step-refused sub" data-card-refused={u.name}><Icon name="warning" size={14} /> <b>{u.title}</b> — not offered: {u.says}</p>;
  }
  if (batch && batch.callIds[0] !== u.callId) return null;
  return (
    <div className={'ai-card is-' + u.status} data-card={u.name} data-card-status={u.status} {...(batch ? { 'data-job-batch': '1' } : {})}>
      <p className="ai-card-k">{u.status === 'waiting' ? 'Luna asks to' : u.status === 'done' ? 'Done' : u.status === 'declined' ? 'Not done' : 'Could not be done'}</p>
      <p className="ai-card-t">{u.title}</p>
      {batch && batch.items.length > 1 && (
        <ul className="ai-card-batch" data-job-batch-list>
          {batch.items.map(it => <li key={it.callId}><b>{it.title}</b> — {it.preview}</li>)}
        </ul>
      )}
      {u.preview && <p className="ai-card-p">{u.preview}</p>}
      {rows.length > 0 && <dl className="ai-card-rows">{rows.map(r => <div key={r.k}><dt>{r.k}</dt><dd>{r.v}</dd></div>)}</dl>}
      {u.said && <p className="ai-card-said" data-card-said>Said: {u.said}</p>}
      {u.status === 'waiting' && liveCard && (
        <div className="ai-card-acts">
          <button type="button" className="btn btn-primary" onClick={() => onCard(u.callId, true)}>Do it</button>
          <button type="button" className="btn" onClick={() => onCard(u.callId, false)}>Not now</button>
          {hands && <span className="sub ai-card-say">{SAY_TO_ANSWER}</span>}
        </div>
      )}
      {u.status === 'waiting' && !live && <p className="sub ai-card-s">This was waiting when the page closed — nothing was done. Ask again if it is still wanted.</p>}
      {u.status === 'done' && <p className="ai-card-s is-done"><Icon name="check" size={14} /><span className="ai-card-s-w">{u.says}</span><RefChips refs={u.refs} label="Open it" /></p>}
      {u.status === 'declined' && <p className="sub ai-card-s">You said not now — nothing was written.</p>}
      {u.status === 'failed' && <p className="ai-card-s is-off">{u.says}</p>}
    </div>
  );
}

/* ================================================================ the context */

type MakeFlow = {
  preview: (d: ColleagueDraft) => Promise<{ ok: true; title: string; says: string } | { ok: false; why: string }>;
  run: (d: ColleagueDraft) => Promise<{ ok: true; says: string } | { ok: false; why: string }>;
};

/* THE TASK (10 November, docs/AI-TASK.md — Rowland: "The user describes the work. Faultline works out how to support it."): the steps of
   the task kept on this subject, in the order the method takes them, each saying where it stands as the line's own records say it —
   done, done since the task began, old, not done — and the next one, which the person can start by saying so. Read live: a stop timed or
   a study made anywhere in the app moves it. */
const TASK_WORD: Record<TaskStep['status'], string> = { known: 'Done', old: 'Old', missing: 'Not done' };
function TaskCard({ task, onSay }: { task: NonNullable<Thread['task']>; onSay: (words: string) => void }) {
  const [steps, setSteps] = useState<TaskStep[] | null>(null);
  useEffect(() => {
    if (!task.lineId) { setSteps([]); return; }
    let live = true;
    const read = () => { void evidenceFor(task.lineId as string, routeOfTask(task), Date.now(), task.startedAt).then(ev => { if (live) setSteps(ev?.steps ?? []); }); };
    read();
    const off = onDataChange(read);
    return () => { live = false; off(); };
  }, [task]);
  const next = steps ? nextStep(steps) : undefined;
  const done = steps?.filter(x => x.status === 'known').length ?? 0;
  return (
    <div className="ai-task" data-ctx-task>
      <p className="ai-ctx-k">The task{steps ? ` · ${done} of ${steps.length} known` : ''}</p>
      {!task.lineId ? <p className="sub ai-ctx-none">Which line it is on is still to say.</p> : !steps ? <p className="sub ai-ctx-none">Reading the line…</p> : (
        <ol className="ai-task-steps">
          {steps.map(st => (
            <li key={st.key} className={'ai-task-step is-' + st.status + (st === next ? ' is-next' : '')} data-task-step={st.key} data-task-status={st.status}>
              <span className="ai-task-word">{st === next ? 'Next' : TASK_WORD[st.status]}{st.sinceTask ? ' · this task' : ''}</span>
              <span className="ai-task-body"><a href={`#${st.href}`}>{st.label}</a>{st.finding ? <span className="sub"> — {st.finding}</span> : null}</span>
            </li>
          ))}
        </ol>
      )}
      {next && <button type="button" className="btn ai-task-go" data-task-go onClick={() => onSay(`Let’s do the next step — ${next.label}.`)}>Next: {next.label}</button>}
    </div>
  );
}

function ContextPanel({ cur, parked, sources, nameOf, places = [], onBack, drafts, make, act, canMakeFactory, onSay, here, trail, room = [], agreed = [], onStop, onReadFile }: {
  /** A newer version of a SharePoint or OneDrive file, read as an upload is (X2). */
  onReadFile?: (f: File, o: FileOrigin, customer?: string) => void;
  here?: WalkStop; trail?: readonly WalkStop[]; places?:readonly LocationWorkspace[];
  /** Who is in the room with the person, as Luna last said it. */
  room?: readonly string[];
  /** Investigations agreed in this conversation (W3): captured into without a card, each with Stop. */
  agreed?: { id: string; name: string }[]; onStop?: (projectId: string) => void;
  cur?: Thread; parked: Thread[]; sources: CapRef[]; nameOf: (k: 'line' | 'project' | 'problem' | 'story', id: string) => string | undefined; onBack: (t: Thread) => void;
  drafts: ColleagueDraft[]; make: MakeFlow; act: (draftId: string, items: FactoryOp[]) => Promise<CapResult>; canMakeFactory: boolean; onSay: (words: string) => void;
}) {
  const place = (s: ThreadScope, refs: readonly CapRef[]): CapRef[] => [
    ...(s.lineId ? [(()=>{const w=places.find(w=>w.id===s.lineId);return {kind:w&&isAreaPlace(w)?'page' as const:'line' as const,id:s.lineId,label:nameOf('line',s.lineId)??'The location',href:w?workLocation(w).href:`/lines/${encodeURIComponent(s.lineId)}`};})()] : []),
    ...(s.projectId ? [{ kind: 'project' as const, id: s.projectId, label: nameOf('project', s.projectId) ?? refs.find(r => r.kind === 'project' && r.id === s.projectId)?.label ?? 'The project', href: `/project/${encodeURIComponent(s.projectId)}` }] : []),
    ...(s.problemId ? [{ kind: 'problem' as const, id: s.problemId, label: refs.find(r => r.kind === 'problem' && r.id === s.problemId)?.label ?? 'The problem', href: refs.find(r => r.kind === 'problem' && r.id === s.problemId)?.href ?? `/snags?open=${encodeURIComponent(s.problemId)}` }] : []),
    ...(s.storyId ? [{ kind: 'story' as const, id: s.storyId, label: 'The Story', href: '/' }] : []),
    ...refs.filter(r => r.kind === 'study' && r.id === s.studyId).slice(0, 1),
  ];
  return (
    <div className="ai-ctx-in">
      {/* WHERE YOU ARE (10 November, docs/FACTORY-WALK.md) — the place, not the subject; the walk's stops under it */}
      {here && (
        <section className="ai-ctx-s" aria-label="Where you are" data-ctx-here>
          <p className="ai-ctx-h">Where you are</p>
          <p className="ai-ctx-t">{placeSaid(here) || 'A place not named'}</p>
          <p className="sub">Since {hhmm(here.at)}{(trail?.length ?? 0) > 1 ? ` · the walk: ${(trail ?? []).slice(-5).map(x => x.machine || x.line || x.area || '').filter(Boolean).join(' → ')}` : ''}</p>
        </section>
      )}
      {room.length > 0 && (
        <section className="ai-ctx-s" aria-label="In the room" data-ctx-room>
          <p className="ai-ctx-h">In the room</p>
          {room.map(r => <p key={r} className="ai-ctx-t">{r}</p>)}
          <p className="sub">As you introduced them — for this conversation only.</p>
        </section>
      )}
      {agreed.length > 0 && (
        <section className="ai-ctx-s ai-agreed" aria-label="Agreed" data-ctx-agreed>
          {agreed.map(a => (
            <p key={a.id} className="ai-agreed-l" data-agreed={a.id}>
              <span><b>Working within {a.name}</b><span className="sub"> — capturing into it as we go; anything consequential still asks.</span></span>
              <button type="button" className="btn btn-sm" data-agreed-stop onClick={() => onStop?.(a.id)}>Stop</button>
            </p>
          ))}
        </section>
      )}
      <section className="ai-ctx-s" aria-label="Now on" data-ctx-current>
        <p className="ai-ctx-h">Now on</p>
        {cur ? (
          <>
            <p className="ai-ctx-t">{cur.title}</p>
            {cur.objective && <p className="ai-ctx-aim" data-ctx-aim><span className="ai-ctx-k">Aim</span>{cur.objective}</p>}
            {cur.task && <TaskCard task={cur.task} onSay={onSay} />}
            {cur.job && <JobList job={cur.job} />}
            {cur.awaiting && (
              <div className="ai-await" data-ctx-await={cur.awaiting.tool}>
                <p className="ai-ctx-k">Over to you</p>
                <p className="ai-await-do">{cur.awaiting.handover}</p>
                <p className="ai-await-why">I can’t do this part on the screen. Tell me when it’s done and I’ll read what it says.</p>
                <div className="ai-await-acts">
                  <button type="button" className="b ghost" data-await-open onClick={() => nav(cur.awaiting?.href ?? '/')}>Open the page</button>
                  <button type="button" className="b" data-await-done onClick={() => onSay('Done — I’ve finished that on the page.')}>I’ve done it</button>
                </div>
              </div>
            )}
            {/* what kind of work it is (9 November): just talk, standalone or in the project — said, so nobody wonders where it will go */}
            <p className={'ai-mode-chip' + (cur.mode ? ` is-${cur.mode}` : '')} data-ctx-mode={cur.mode ?? 'open'}>{cur.mode ? MODE_WORD[cur.mode] : 'Not settled — project or standalone'}</p>
            <RefChips refs={place(cur.scope, cur.refs)} label="Where it is" />
            {cur.scope.machine && <p className="ai-ctx-aim" data-ctx-machine><span className="ai-ctx-k">Machine</span>{cur.scope.machine}</p>}
            {(cur.points ?? []).length > 0 && (
              <ul className="ai-points" data-ctx-points>
                {(cur.points ?? []).map(p => (
                  <li key={p.id} data-point={p.kind}><span className="ai-ctx-k">{p.kind === 'decision' ? 'Decided' : p.kind === 'assumption' ? 'Assumed' : p.answered ? 'Answered' : 'To answer'}</span><span>{p.text}{p.answered ? ` — ${p.answered}` : ''}</span></li>
                ))}
              </ul>
            )}
            {cur.notes.length > 0 ? (
              <ul className="ai-notes">
                {cur.notes.map(n => (
                  <li key={n.id}><span className={'ai-how' + (n.how === 'verified' ? ' is-verified' : '')} data-how={n.how}>{HOW_WORD[n.how]}</span><span>{n.text}</span></li>
                ))}
              </ul>
            ) : <p className="sub ai-ctx-none">Nothing noted yet — what is seen, said or measured is kept here, each saying how it is known.</p>}
          </>
        ) : <p className="sub ai-ctx-none">Nothing yet — say what you are looking at, and it becomes the subject here.</p>}
      </section>
      <NotebookBox lineId={cur?.scope.lineId} />
      {drafts.length > 0 && (
        <section className="ai-ctx-s" aria-label="Being built" data-ctx-built>
          <p className="ai-ctx-h">Being built · {drafts.length}</p>
          {[...drafts].sort((a, b) => b.at - a.at).map(d => (d.kind === 'factory'
            ? <FactoryDraftBox key={d.id} d={d} make={make} act={items => act(d.id, items)} canMake={canMakeFactory} />
            : <DraftBox key={d.id} d={d} make={make} onSay={onSay} />))}
        </section>
      )}
      {/* what is parked and every record read or changed — one line each, one tap away (F2, docs/DESIGN.md) */}
      <div className="ai-ctx-s" data-ctx-parked>
        <Fold id="luna-parked" start={false} title="Parked" says={parked.length ? `${parked.length} waiting — ${parked.slice(0, 2).map(t => t.title).join(', ')}${parked.length > 2 ? '…' : ''}` : 'Nothing parked'}>
          {parked.length ? (
            <ul className="ai-parked">
              {parked.map(t => (
                <li key={t.id} data-parked={t.title}>
                  <span><b>{t.title}</b>{t.notes.length ? <span className="sub"> · {t.notes.length} note{t.notes.length === 1 ? '' : 's'}</span> : null}</span>
                  <button type="button" className="btn btn-sm" onClick={() => onBack(t)}>Back to this</button>
                </li>
              ))}
            </ul>
          ) : <p className="sub ai-ctx-none">Change the subject and the last one waits here.</p>}
        </Fold>
      </div>
      {/* THE FILES LUNA CAN READ (20 November, docs/CONNECTED-LUNA.md X2): where each came from, a newer version checked */}
      <LunaFiles onRead={onReadFile} />
      <div className="ai-ctx-s" data-ctx-sources>
        <Fold id="luna-sources" start={false} title="Sources" says={sources.length ? `${sources.length} record${sources.length === 1 ? '' : 's'} read or changed` : 'None read yet'}>
          {sources.length ? <RefChips refs={sources} label="Every record read or changed" /> : <p className="sub ai-ctx-none">Every record Faultline reads or changes in this conversation is listed here.</p>}
        </Fold>
      </div>
    </div>
  );
}

/* ================================================================ what their words mean */

/** WHAT LUNA KNOWS ABOUT THEIR WORDS (docs/LUNA-NEXT.md L3): the notebook of the subject's client and the person's own, each entry with
 *  Take off (struck, kept — the person's own hand, no card needed). Shown only when it holds something. */
function NotebookBox({ lineId }: { lineId?: string }) {
  const [nb, setNb] = useState<{ client: string; own?: Notebook; cl?: Notebook }>({ client: '' });
  useEffect(() => {
    let live = true;
    const load = async () => {
      const client = lineId ? (await getWorkspace(lineId))?.clientName?.trim() ?? '' : '';
      const r = await readNotebooks(client);
      if (live) setNb({ client, ...(r.own ? { own: r.own } : {}), ...(r.client ? { cl: r.client } : {}) });
    };
    void load();
    const off = onDataChange(() => void load());
    return () => { live = false; off(); };
  }, [lineId]);
  const rows = [...liveEntries(nb.cl).map(e => ({ e, nb: nb.cl as Notebook })), ...liveEntries(nb.own).map(e => ({ e, nb: nb.own as Notebook }))];
  if (!rows.length) return null;
  return (
    <div className="ai-ctx-s" data-ctx-notebook>
      <Fold id="luna-words" start={false} title={nb.cl ? `What words mean for ${nb.client}` : 'What your words mean'} says={`${rows.length} word${rows.length === 1 ? '' : 's'} Luna knows — ${rows.slice(0, 2).map(r => r.e.term).join(', ')}${rows.length > 2 ? '…' : ''}`}>
      <ul className="ai-points">
        {rows.map(({ e, nb: n }) => (
          <li key={e.id} data-meaning={e.term}>
            <span className="ai-ctx-k">{e.term}</span><span>{e.means}{n === nb.own && nb.cl ? <span className="sub"> · yours, everywhere</span> : null}</span>
            <button type="button" className="linkish" data-meaning-off onClick={() => void strikeMeaning(n.id, e.id, Date.now())}>Take off</button>
          </li>
        ))}
      </ul>
      </Fold>
    </div>
  );
}

/* ================================================================ being built */

const OWNER_CAN = canAt('owner');

/** A TOOL BEING FILLED FROM THE CONVERSATION — its fields as understood, each with how it is known (a correction shows what it
 *  replaced, struck), what is still missing as chips that start the sentence in the box, a custom sheet's metrics as Faultline
 *  works them, and Make it (the write card flow) — or Open it once it is a record. A client is offered no Make it. */
function DraftBox({ d, make, onSay }: { d: ColleagueDraft; make: MakeFlow; onSay: (words: string) => void }) {
  const jobCan = useAccess(d.scope.projectId ?? '');
  const can = d.scope.projectId ? jobCan : OWNER_CAN;
  const got = captured(d), need = missing(d), ms = metricsOf(d);
  const [ask, setAsk] = useState<{ says: string } | { why: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState<{ text: string; bad: boolean } | null>(null);
  const start = async () => { setSaid(null); const p = await make.preview(d); setAsk(p.ok ? { says: p.says } : { why: p.why }); };
  const doIt = async () => {
    setBusy(true);
    try { const r = await make.run(d); setSaid(r.ok ? { text: r.says, bad: false } : { text: r.why, bad: true }); setAsk(null); } finally { setBusy(false); }
  };
  const open = async () => { if (!d.studyId) return; const s = await getStudy(d.studyId); if (s && !s.deletedAt) nav(studyHref(s)); else setSaid({ text: 'That record is not on this device any more.', bad: true }); };
  return (
    <div className="ai-draft" data-draft={d.id} data-draft-kind={d.kind} data-draft-status={d.status}>
      <p className="ai-draft-t"><b>{d.title}</b><span className="sub">{toolTitle(d.kind, d.key, d.structure)} · {d.status === 'made' ? 'a record' : 'a draft — nothing kept as a record yet'}</span></p>
      {got.length > 0 ? (
        <ul className="ai-draft-f" aria-label="What it has understood">
          {got.map(c => (
            <li key={c.field.name} data-field={c.field.name}>
              <span className="ai-draft-k">{c.field.label}{c.field.added ? ' · added to this one' : ''}</span>
              <span className="ai-draft-v">{(c.entry.earlier ?? []).slice(-1).map((e, i) => <s key={i} data-earlier>{valueWords(c.field, e.value)}</s>)}{c.words}</span>
              <span className="ai-how" data-how={c.entry.how}>{HOW_WORD[c.entry.how]}</span>
            </li>
          ))}
        </ul>
      ) : <p className="sub ai-ctx-none">Nothing filled in yet — say it and it goes in here, with how it is known.</p>}
      {ms.length > 0 && (
        <ul className="ai-draft-m" aria-label="Worked out by Faultline" data-draft-metrics>
          {ms.map(m => <li key={m.metric.id} data-metric={m.metric.name}><span className="ai-draft-k">{m.metric.name} — worked out by Faultline</span><span className="ai-draft-v">{m.value !== undefined ? m.said : `waits on ${m.missing.join(', ')}`}</span></li>)}
        </ul>
      )}
      {need.length > 0 ? (
        <>
          <p className="ai-ctx-h">Still missing</p>
          <div className="ai-draft-miss" role="group" aria-label="Still missing">
            {need.map(f => <button key={f.name} type="button" className="chip" data-missing={f.name} onClick={() => onSay(`${f.label}: `)}>{f.label}</button>)}
          </div>
        </>
      ) : d.status === 'draft' && <p className="sub ai-ctx-none">Everything it needs is there.</p>}
      {ask && 'says' in ask && (
        <div className="ai-card is-waiting" data-draft-card>
          <p className="ai-card-k">Luna asks to</p>
          <p className="ai-card-p">{ask.says}</p>
          <div className="ai-card-acts">
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void doIt()}>Do it</button>
            <button type="button" className="btn" onClick={() => setAsk(null)}>Not now</button>
          </div>
        </div>
      )}
      {ask && 'why' in ask && <p className="sub ai-draft-ask is-off" role="status">{ask.why}</p>}
      {said && <p className={'ai-draft-ask' + (said.bad ? ' is-off' : '')} role="status">{said.text}</p>}
      <div className="ai-draft-acts">
        {can.edit && !ask && need.length === 0 && <button type="button" className={'btn' + (d.status === 'draft' ? ' btn-primary' : '')} data-make onClick={() => void start()}>{d.status === 'made' ? 'Update the record' : 'Make it'}</button>}
        {d.status === 'made' && d.studyId && <button type="button" className="btn" data-open-made onClick={() => void open()}>Open it ›</button>}
      </div>
      {!can.edit && <p className="sub ai-ctx-none" data-draft-readonly>You can read this here; the people doing the work on the project make it a record.</p>}
    </div>
  );
}

/* ================================================================ the work and the measurement */

/** THE WORK PANE (lib/pane; docs/AI-OPERATING.md) — the real page of what the conversation is working on: the tool's own page, its
 *  capture screen, its report made on arrival. The same app on the same data, redrawn as each write lands. At a desk beside the
 *  conversation; on a phone over it, with the way back to the conversation at its top. */
/** What the conversation made, drawn beside it — a chart, a result's table, a report as its document — from the conversation's own
 *  kept outputs (colleague/AiOutputs). A page is the app's own page in its frame. */
function workOutput(work: WorkRef, outs?: Outs, onPresent?: (reportId: string) => void, conversationId?: string): JSX.Element | null {
  if (!outs || (work.kind !== 'chart' && work.kind !== 'convreport' && work.kind !== 'result')) return null;
  const [id, v] = work.id.split('@');
  if (work.kind === 'result') { const r = outs.results.get(id); return r ? <ResultTable result={r} /> : <p className="sub">That result is not in this conversation any more.</p>; }
  if (work.kind === 'chart') { const c = outs.charts.get(id); return c ? <ChartCard chart={c} version={Number(v) || c.versions.length} results={outs.results} /> : <p className="sub">That chart is not in this conversation any more.</p>; }
  const rep = outs.reports.find(x => x.id === id);
  return rep ? <>{v && Number(v) !== rep.version && <p className="sub">This source was linked at version {v}. The report below is the current version, {rep.version}.</p>}<ReportDocument report={rep} results={outs.results} charts={outs.charts} conversationId={conversationId} {...(outs.by ? { by: outs.by } : {})} {...(onPresent ? { onPresent: () => onPresent(rep.id) } : {})} /></> : <p className="sub">That report is not in this conversation any more.</p>;
}

function WorkPane({ work, outs, conversationId, open, onClose, onGone, onPresent, extra, label }: { work: WorkRef; extra?: JSX.Element; label?: string; outs?: Outs; conversationId?: string; open: boolean; onClose: () => void; onGone: () => void; onPresent?: (reportId: string) => void }) {
  const made = extra ?? workOutput(work, outs, onPresent, conversationId);
  return (
    <aside className={'ai-work' + (open ? ' is-open' : '')} aria-label={`The work — ${work.label}`} data-work data-work-href={work.href} data-work-kind={work.kind}>
      <header className="ai-work-h">
        <button type="button" className="btn ai-work-back" onClick={onClose} aria-label="Back to the conversation"><Icon name="chevronLeft" size="1.05em" />Conversation</button>
        <b className="ai-work-t">{label ?? work.label}</b>
        {!made && <button type="button" className="btn ai-work-full" onClick={() => nav(work.href.replace(/([?&])save=1(&|$)/, (_m, a: string, b: string) => (b ? a : '')).replace(/[?&]$/, ''))}>Open the page</button>}
        <button type="button" className="btn ai-work-x" onClick={onGone} aria-label="Close the work"><Icon name="close" size="1.05em" /></button>
      </header>
      {made ? <div className="ai-work-made" data-work-made>{made}</div>
        : <iframe key={work.href} className="ai-work-f" name={WORK_PANE} title={work.label} src={paneSrc(work.href)} data-work-frame />}
    </aside>
  );
}

const hmOf = (t: number): string => new Date(t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
type MeasureLike = { label: string; startedAt: number; events: { id: string; at: number; says: string; struck?: boolean }[] };
/** The measurement running — what it is, how many are captured, the last one; Undo, Review and End are one press each. */
function MeasureStrip({ m, onUndo, onReview, onEnd, onShow }: { m: MeasureLike; onUndo: () => void; onReview: () => void; onEnd: () => void; onShow: () => void }) {
  const live = m.events.filter(e => !e.struck);
  const last = [...live].sort((a, b) => b.at - a.at)[0];
  return (
    <div className="ai-measure" role="status" data-measure>
      <span className="ai-measure-dot" aria-hidden />
      <span className="ai-measure-l"><b>{m.label}</b><span className="sub"> since {hmOf(m.startedAt)} · {live.length} captured{last ? ` · last: ${last.says}` : ' · say each event as it happens'}</span></span>
      <span className="ai-measure-acts">
        <button type="button" className="btn btn-sm" onClick={onShow}>Show</button>
        <button type="button" className="btn btn-sm" disabled={!live.length} onClick={onUndo} data-measure-undo>Undo</button>
        <button type="button" className="btn btn-sm" onClick={onReview} data-measure-review>Review</button>
        <button type="button" className="btn btn-sm" onClick={onEnd} data-measure-end>End</button>
      </span>
    </div>
  );
}
/** Every event captured, in order, each with its time — one taken back said so; any one can be taken back. */
function MeasureReview({ m, onUndo }: { m: MeasureLike; onUndo: (id: string) => void }) {
  if (!m.events.length) return <p className="sub">Nothing captured yet.</p>;
  return (
    <ol className="ai-measure-list" data-measure-list>
      {[...m.events].sort((a, b) => a.at - b.at).map(e => (
        <li key={e.id} className={e.struck ? 'is-struck' : ''} data-measure-event={e.id}>
          <span className="ai-measure-at">{hmOf(e.at)}</span>
          <span className="ai-measure-s">{e.says}{e.struck ? ' — taken back' : ''}</span>
          {!e.struck && <button type="button" className="btn btn-sm" onClick={() => onUndo(e.id)}>Take back</button>}
        </li>
      ))}
    </ol>
  );
}
