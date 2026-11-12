/* AI MODE — the conversation with the colleague (8 November; the shared contract §3; src/colleague).
 *
 * Rowland, 8 November: two modes over ONE application. Manual Mode is the app as built and needs no AI; AI Mode is a
 * conversation in which Claude works Faultline only through the approved capabilities (src/capabilities) — the same
 * readers, tool modules and writers the pages use. So this page is a working conversation, not a chat toy:
 *   centre   the conversation — the person's words, photos and talk; the colleague's answer with, under it, every step it
 *            took ("Problems on the register — 4 open on Line 3", the records as chips that open Manual Mode), a figure
 *            it was not sure of as Check this, and up to three follow-ups; a WRITE as a card — what it will do, Do it ·
 *            Not now — and nothing writes without the tap;
 *   left     (a desk) the conversations, newest first, and New conversation;
 *   right    (a desk; a sheet on a phone) the CONTEXT: what it is on now (the thread, its place as chips, its notes each
 *            saying how it is known), what is parked (Back to this), and the Sources — every record read or changed.
 * The composer is Line Talk's (tools/talk/hearing — the phone's own speech recognition — and talkPictures for photos).
 * Opened from a line or a project (#/ai?line= / ?project=) a new conversation starts there. Off (the account menu's
 * switch), it says so with the way to turn it on.
 *
 * WHICH RECORD: a study of tool `talk`, facts.colleague (no new table). WHERE IT SHOWS: here; the door is the top bar's
 * Ask Luna (src/colleague/AiDoor), never a line of the menu. */
import { greetName } from '../lib/greetName';
import { createContext, useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from 'react';
import { deskWide, OPEN_EVENT, peekPendingOpen, setLunaPanel, takePendingOpen, SAY_EVENT, takePendingSay, VOICE_EVENT, takePendingVoice } from '../colleague/lunaPanel';
import { scopeOf } from '../lib/scope';
import { conversationFocus, noteConfirmed, prepareCall, recordStep } from '../colleague/turnRules';
import { createPortal } from 'react-dom';
import { deleteStudy, getStudy, listAllStudies, onDataChange, patchStudy, putBlob, putStudy } from '../db';
import { offerUndo } from '../ui/Undo';
import { useSession } from '../cloud/session';
import { displayName } from '../cloud/team';
import { useAccess } from '../cloud/access';
import { uid } from '../lib/ids';
import { niceDay, todayISO } from '../lib/weeks';
import { nav, useRoute, type Route } from '../state/useRoute';
import { useFactoryLines } from '../lib/useFactoryLines';
import { useProjects } from '../lib/useProjects';
import { Icon, type IconName } from '../ui/Icon';
import { MoreMenu } from '../ui/parts';
import { Fold } from '../ui/Fold';
import { Sheet } from '../ui/Sheet';
import { PreferencesSheet } from '../ui/PreferencesSheet';
import { preferencesText } from '../lib/preferences';
import { Ear, NOTHING_HEARD, joinWords, recognitionOf, troubleSaid, type Trouble } from '../tools/talk/hearing';
import { pictureForAssistant } from '../tools/talk/talkPictures';
import { photoLabels } from '../tools/talk/talk';
import { TALK_LIMITS } from '../tools/talk/talkAssist';
import { useBlobUrl } from '../lib/useBlobUrl';
import { CAPABILITIES, capabilityByName, previewCall, runCall } from '../capabilities/registry';
import type { CapCall, CapCtx, CapRef, ColleagueDraft } from '../capabilities/types';
import { runningMeasure } from '../capabilities/operate';
import { fastCall } from '../colleague/fastPath';
import { usedOf } from '../colleague/turnRules';
import { evidenceFor, nextStep, routeOfTask, type TaskStep } from '../capabilities/task';
import { WORK_PANE, paneSrc } from '../lib/pane';
import { WorkContext, EnvStart } from '../colleague/WorkContext';
import { onShowInEnvironment } from '../colleague/environment';
import { captured, metricsOf, missing, toolTitle, valueWords } from '../capabilities/drafts';
import { studyHref } from '../lib/studyLinks';
import { can as canAt } from '../lib/access';
import {
  HOW_WORD, MODE_WORD, WHO, appendAction, appendTurn, changeThreads, changeTurn, conversationTitle, currentThread, factsOfConversation, gatewayTurns,
  isConversation, newConversation, parkedThreads, setCurrent, sourcesOf, turnsOfConversation, unansweredTurns, uniqueRefs,
  type ColleagueTurn, type Thread, type ThreadScope, type Used,
} from '../colleague/conversation';
import { colleagueLoop, invokeColleague, type Prepared, type Step } from '../colleague/colleagueAsk';
import { setAiMode, useAiMode, useDeviceFlag } from '../colleague/aiMode';
import { CONVERSATION_KEY, CONVERSATION_SAID, SPEAK_KEY, canSpeak, inEchoWindow, isSpeaking, onSpeaking, saidLately, queueActive, queueClose, queuePush, queueStart, speak, stopSpeaking } from '../colleague/voice';
import { VoiceMode } from '../colleague/VoiceMode';
import { forSpeech, isEcho, isEchoTail, nextChunks, turnEnd, turnWait, voiceCommand, voiceStep } from '../colleague/speech';
import { listenWhileSpeaking, useAudioRoute, useVoicePrefs } from '../colleague/voicePrefs';
import {
  EARCON_KEY, FLOOR_LIMIT, HeadsetButton, SAY_TO_ANSWER, ScreenKeeper, buttonSaid, cardPrompt, earcon, floorCheck, keepSaid, phaseOf, pressAction,
  realEnv, reopenAfterSpeech, shouldBargeIn, spokenAnswer, unspoken, type ButtonState, type CheckItem, type KeepState,
} from '../colleague/floor';
import { leftSaid, useTimers } from '../colleague/timers';
import type { ToolStudy } from '../lib/study';
import type { CapResult } from '../capabilities/types';
import { factoryDraftFor, takeDocument } from '../capabilities/factoryBuild';
import type { FactoryOp } from '../capabilities/factoryDraft';
import { readFactoryDocument } from '../colleague/factorySource';
import { readXlsx } from '../lib/xlsxRead';
import { csvRows, downtimeTable } from '../capabilities/intel/pareto';
import { keepImport } from '../capabilities/intel/caps';
import { noteWorkbook, settleWorkbooks } from '../capabilities/workbook';
import { workbooks, workbookId, type Progress } from '../lib/workbook/client';
import type { ColleagueWorkbook } from '../capabilities/types';
import { FactoryDocSheet, FactoryDraftBox, type DocPicked } from '../colleague/AiFactory';
import { photoSaid, placeSaid, type WalkFacts, type WalkStop, type WalkTurn } from '../lib/walk';
import { VideoRecorder, videoCaptureSupported } from '../tools/video/VideoRecorder';
import { outputsOfConversation, registerFile } from '../capabilities/data';
import type { Chart, ConvReport, DataResult } from '../lib/data/outputs';
import { ChartCard, ReportCard, ReportDocument, ResultTable } from '../colleague/AiOutputs';
import { figuresSaid, markFigures } from '../colleague/figureCheck';
import { liveEntries, readNotebooks, strikeMeaning, type Notebook } from '../colleague/notebook';
import { getWorkspace } from '../db/workspaces';
import { activeClientNow } from '../lib/activeClient';
import { chartWorth } from '../colleague/autoChart';

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
export function AiModeScreen({ route: given, shown = true, slot = 'page', page }: { route?: Route; shown?: boolean; slot?: 'page' | 'panel'; page?: Route } = {}) {
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
  const load = useCallback(async () => setAll((await listAllStudies()).filter(isConversation).sort((a, b) => b.updatedAt - a.updatedAt)), []);
  useEffect(() => { void load(); return onDataChange(() => void load()); }, [load]);
  /* WHICH CONVERSATION — the one the address names, else a new one; a session key keeps a conversation's working state
     while its first Send makes its record (the address is then quietly given its id, for a reload) */
  const [open, setOpen] = useState<{ key: string; id?: string }>(() => { const asked = route.query.get('c') ?? peekPendingOpen(); return { key: uid(), ...(asked ? { id: asked } : {}) }; });
  const [listSheet, setListSheet] = useState(false);
  /* AI MODE CALM (11 November, F2 — docs/DESIGN.md: "AI Mode is the simplest place in the app"): at a desk the conversations are one tap
     away (Conversations), shut until asked for, the choice kept on this device */
  const [listOn, setListOn] = useState(() => { try { return localStorage.getItem('fl-ai-list') === '1'; } catch { return false; } });
  const showList = (busy: boolean) => {
    if (busy || slot !== 'page' || !deskWide()) { setListSheet(true); return; }
    setListOn(v => { try { localStorage.setItem('fl-ai-list', v ? '0' : '1'); } catch { /* this visit only */ } return !v; });
  };
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
        <p className="pace-lede">LUNAR works the same without it — every page, tool and paper is here in Manual Mode. Turned on, Luna — LUNAR’s AI colleague — sits in the top bar as Ask Luna: she reads the lines, problems and tools for you, and changes nothing until you say so.</p>
        <button type="button" className="btn btn-primary" onClick={() => setAiMode(true)}><Icon name="spark" size="1.05em" />Turn AI Mode on</button>
      </div>
    );
  }

  const pick = (id?: string) => {
    setOpen({ key: uid(), ...(id ? { id } : {}) });
    setListSheet(false);
    if (shownRef.current && slotRef.current === 'page') try { history.replaceState(null, '', id ? `#/ai?c=${encodeURIComponent(id)}` : '#/ai'); } catch { /* the page still follows */ }
  };
  const list = <ConversationList all={all} openId={open.id} onPick={pick} onGone={id => { if (id === open.id) pick(); }} />;
  const pageName = pageScope?.kind === 'line' ? lines.find(x => x.id === pageScope.wsId)?.name : pageScope?.kind === 'project' ? projects.find(x => x.id === pageScope.projectId)?.name : undefined;
  const screen = slot === 'panel' && page ? `${pageName ? `${pageName} — ` : ''}the page at ${typeof window !== 'undefined' ? window.location.hash : ''}${pageScope?.kind === 'line' ? ` [line ${pageScope.wsId}]` : pageScope?.kind === 'project' ? ` [project ${pageScope.projectId}]` : ''}` : undefined;
  const full = () => { setLunaPanel('closed'); nav(open.id ? `/ai?c=${encodeURIComponent(open.id)}` : panelLine ? `/ai?line=${encodeURIComponent(panelLine)}` : panelProject ? `/ai?project=${encodeURIComponent(panelProject)}` : '/ai'); };
  return (
    <LunaPlace.Provider value={slot}>
    <div className={'ai' + (slot === 'panel' ? ' is-panel' : '') + (listOn && slot === 'page' ? ' is-list' : '')} data-ai data-ai-slot={slot}>
      <aside className="ai-list" aria-label="Conversations">{list}</aside>
      <Conversation key={open.key} id={open.id} start={open.id ? undefined : start} screen={screen} shown={shown} dock={slot === 'panel' ? { onFull: full, onClose: () => setLunaPanel('closed') } : undefined} onMade={id => {
        setOpen(o => ({ ...o, id }));
        /* the address is the conversation's only while it is the page on screen — never another page's address rewritten */
        if (shownRef.current && slotRef.current === 'page' && /^#\/ai(\?|$)/.test(window.location.hash)) try { history.replaceState(null, '', `#/ai?c=${encodeURIComponent(id)}`); } catch { /* kept for this visit */ }
      }} onList={showList} listOn={listOn && slot === 'page'} onNew={() => pick()} />
      <Sheet open={listSheet} onClose={() => setListSheet(false)} title="Conversations">{list}</Sheet>
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

/* EARLIER CONVERSATIONS, EACH WITH ITS OPTIONS (10 November — Rowland: "earlier conversations can't delete them, need options"):
   ⋯ on a row opens Rename (typed over in its place; the person's name wins over the subject's) and Delete (asked first, then
   offered back with Undo — the conversation whole, its turns and threads; the records it made stay where they are). */
function ConversationList({ all, openId, onPick, onGone }: { all: ToolStudy[] | null; openId?: string; onPick: (id?: string) => void; onGone: (id: string) => void }) {
  const [menu, setMenu] = useState<string | null>(null);
  const [naming, setNaming] = useState<{ id: string; text: string } | null>(null);
  const rename = async (id: string, text: string) => {
    setNaming(null);
    const name = text.trim().slice(0, 80);
    await patchStudy(id, cur => ({ name: name || cur.name, facts: { ...cur.facts, named: name || undefined } as ToolStudy['facts'] }));
  };
  const remove = async (s: ToolStudy, title: string) => {
    setMenu(null);
    if (!window.confirm(`Delete the conversation “${title}”? What was said in it goes with it — anything it made (problems, studies, reports) stays where it is.`)) return;
    const undo = await deleteStudy(s.id);
    onGone(s.id);
    offerUndo(`Conversation “${title}” deleted`, undo);
  };
  return (
    <>
      <button type="button" className="btn ai-new" onClick={() => onPick()}><Icon name="plus" size="1.05em" />New conversation</button>
      <p className="ai-list-h">Earlier</p>
      {all === null ? <p className="sub ai-list-none">Reading…</p> : all.length === 0 ? <p className="sub ai-list-none">None yet — what you ask is kept here.</p> : (
        <ul className="ai-convs">
          {all.map(s => {
            const f = factsOfConversation(s);
            const title = conversationTitle(f, s.name);
            if (naming?.id === s.id) {
              return (
                <li key={s.id} className="ai-conv-row">
                  <form className="ai-conv-name" onSubmit={e => { e.preventDefault(); void rename(s.id, naming.text); }}>
                    <input autoFocus aria-label="The conversation's name" value={naming.text} maxLength={80} onChange={e => setNaming({ id: s.id, text: e.target.value })} onKeyDown={e => { if (e.key === 'Escape') setNaming(null); }} />
                    <button type="submit" className="btn btn-primary">Save</button>
                    <button type="button" className="btn" onClick={() => setNaming(null)}>Cancel</button>
                  </form>
                </li>
              );
            }
            return (
              <li key={s.id} className="ai-conv-row">
                <button type="button" className={'ai-conv' + (s.id === openId ? ' is-on' : '')} aria-current={s.id === openId ? 'true' : undefined} data-conv={s.id} onClick={() => onPick(s.id)}>
                  <b>{title}</b>
                  <span>{niceDay(todayISO(new Date(s.updatedAt)))} · {hhmm(s.updatedAt)}</span>
                </button>
                <button type="button" className="ai-conv-more" aria-label={`Options for “${title}”`} aria-haspopup="menu" aria-expanded={menu === s.id} data-conv-more={s.id} onClick={() => setMenu(m => (m === s.id ? null : s.id))}>⋯</button>
                {menu === s.id && (
                  <div className="ai-conv-menu" role="menu" aria-label={`Options for “${title}”`} onKeyDown={e => { if (e.key === 'Escape') setMenu(null); }}>
                    <button type="button" role="menuitem" onClick={() => { setMenu(null); onPick(s.id); }}>Open</button>
                    <button type="button" role="menuitem" onClick={() => { setMenu(null); setNaming({ id: s.id, text: title }); }}>Rename</button>
                    <button type="button" role="menuitem" className="is-danger" data-conv-delete={s.id} onClick={() => void remove(s, title)}>Delete</button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

/* ================================================================ one conversation */

type Said = { text: string; bad?: boolean } | null;

function Conversation({ id, start, onMade, onList, listOn = false, onNew, screen, dock, shown = true }: {
  id?: string; start?: { title: string; scope: ThreadScope }; onMade: (id: string) => void; onList: (busy: boolean) => void; onNew: () => void;
  /** The conversations shown beside it at a desk (F2) — the button says so. */
  listOn?: boolean;
  /** Beside a page: what is on the screen beside the conversation, said to Luna with each turn. */
  screen?: string;
  /** Drawn as the panel beside a page: its way to full screen and to close. */
  dock?: { onFull: () => void; onClose: () => void };
  /** On screen now (a page or a panel), else parked while the person works elsewhere. */
  shown?: boolean;
}) {
  const screenRef = useRef(screen); screenRef.current = screen;
  const { session } = useSession();
  const email = session?.user.email ?? undefined;
  const me = displayName(email) || undefined;
  const lines = useFactoryLines();
  const { projects } = useProjects();
  const [study, setStudy] = useState<ToolStudy | null | undefined>(id ? undefined : null);
  const sid = useRef<string | undefined>(id);
  const reload = useCallback(async () => { if (sid.current) setStudy((await getStudy(sid.current)) ?? null); }, []);
  useEffect(() => { void reload(); return onDataChange(() => void reload()); }, [reload]);

  const facts = study ? factsOfConversation(study) : undefined;
  const turns = useMemo(() => (facts ? turnsOfConversation(facts) : []), [facts]);
  const threads: Thread[] = useMemo(() => facts?.threads ?? (start ? [{ id: 'start', title: start.title, status: 'current', scope: start.scope, notes: [], refs: [], at: 0 }] : []), [facts, start]);
  const actions = useMemo(() => facts?.actions ?? [], [facts]);
  const cur = currentThread(threads);
  const parked = parkedThreads(threads);
  const sources = useMemo(() => sourcesOf(turns, actions), [turns, actions]);
  const labels = useMemo(() => photoLabels(turns), [turns]);
  /* a project the conversation is on: the person's level there, as the screens know it — a client writes nothing */
  const projectHere = cur?.scope.projectId ?? '';
  const access = useAccess(projectHere);
  /* when the person's newest words were heard — a live measurement stamps its event then (docs/AI-OPERATING.md §4) */
  const saidAt = useRef<number | undefined>(undefined);
  /* THE WORK PANE (lib/pane): the real page the conversation is working on, beside it */
  const [work, setWork] = useState<CapRef | null>(null);
  const [workOpen, setWorkOpen] = useState(false);
  const panelRef = useRef(!!dock); panelRef.current = !!dock;
  /* beside a page on a desk, the page itself is the work — never a framed copy (W2); on #/ai and on a phone, the work pane as before */
  const showWork = useCallback((r: CapRef | undefined) => { if (!r) return; if (panelRef.current && deskWide()) { nav(r.href); return; } setWork(r); setWorkOpen(true); }, []);
  /* THE ENVIRONMENT (docs/LUNAR-ENVIRONMENT.md): a page asked for from Everything or the work in context comes into view beside Luna — the
     real page in the work pane — while this conversation is the page on screen */
  const shownNow = useRef(shown); shownNow.current = shown;
  useEffect(() => onShowInEnvironment(w => { if (shownNow.current && !panelRef.current) showWork({ kind: 'page', id: w.href, label: w.label, href: w.href }); }), [showWork]);
  const ctx = useCallback((): CapCtx => ({
    now: Date.now(), ...(saidAt.current ? { saidAt: saidAt.current } : {}), ...(email ? { email } : {}), ...(me ? { me } : {}), ...(sid.current ? { conversationId: sid.current } : {}),
    ...(session?.user.id ? { userId: session.user.id } : {}), ...(projectHere ? { level: access.level } : {}),
  }), [email, me, session?.user.id, projectHere, access.level]);

  const nameOf = useCallback((kind: 'line' | 'project' | 'problem' | 'story', x: string) =>
    kind === 'line' ? lines.find(l => l.id === x)?.name : kind === 'project' ? projects.find(p => p.id === x)?.name : undefined, [lines, projects]);

  /* ---- the record: made on the first Send ---- */
  const making = useRef<Promise<string> | null>(null);
  const ensure = (): Promise<string> => {
    if (sid.current) return Promise.resolve(sid.current);
    making.current ??= make();
    return making.current;
  };
  const make = async (): Promise<string> => {
    const t = Date.now();
    const s = newConversation({ id: uid(), at: t, name: `AI Mode — ${niceDay(todayISO())}`, ...(session?.user.id ? { ownerId: session.user.id } : {}), ...(start ? { thread: { id: uid(), ...start } } : {}) });
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
  const sayingRef = useRef('');
  /* the microphone waiting to open again after Luna stops (reopen) — cancelled by anything the person does first */
  const reopenTimer = useRef<number | null>(null);
  /* her own words heard back lately — so their end, finished by the recogniser a moment after, is known as hers too */
  const echoSeen = useRef<{ text: string; at: number } | null>(null);
  const cancelReopen = () => { if (reopenTimer.current !== null) { window.clearTimeout(reopenTimer.current); reopenTimer.current = null; } };
  const lastHeard = useRef(0);
  const turnTimer = useRef<number | null>(null);
  const clearTurn = () => { if (turnTimer.current !== null) { window.clearTimeout(turnTimer.current); turnTimer.current = null; } };
  const endTurnRef = useRef<() => void>(() => undefined);

  /* ---- THE BOX: typed into, or talked into (Line Talk's hearing) ---- */
  const [typing, setTyping] = useState('');
  const typingRef = useRef('');
  const spoken = useRef(false);
  const setBox = (text: string) => { typingRef.current = text; if (!text.trim()) spoken.current = false; setTyping(text); };
  const box = useRef<HTMLTextAreaElement>(null);
  const [said, setSaid] = useState<Said>(null);
  const ear = useRef<Ear | null>(null);
  const [listening, setListening] = useState(false);
  const base = useRef('');
  const quiet = useRef<number | null>(null);
  const stopQuiet = () => { if (quiet.current !== null) { window.clearTimeout(quiet.current); quiet.current = null; } };
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
    setSaid(null);
    const Rec = recognitionOf(window);
    if (!Rec) {
      setSaid({ text: troubleSaid('unsupported') });
      if (voiceOn.current) { vMove({ type: 'trouble', fatal: true }); setVNote(troubleSaid('unsupported')); } else box.current?.focus();
      return;
    }
    base.current = typingRef.current.trim();
    const e: Ear = new Ear(Rec, {
      onWords: h => {
        if (ear.current !== e) return;
        /* LUNA'S OWN VOICE coming back through the microphone — while she speaks, or a moment after, its words late from the
           recogniser — is not the person: ignored, in the voice screen and in Conversation alike (colleague/voice saidLately) */
        {
          const heardNow = joinWords(h.final, h.interim), hers = `${saidLately()} ${sayingRef.current}`;
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
          if (isSpeaking() && shouldBargeIn(true, h)) { stopSpeaking(); vMove({ type: 'interrupt' }); }
          vMove({ type: 'recovered' });
          vMove({ type: 'heard', words: joinWords(h.final, h.interim) });
          setHeardTick(n => n + 1);
          lastHeard.current = Date.now();
          /* a pause or the end of what was said — looked at again once the pause could be long enough (colleague/speech turnEnd) */
          clearTurn();
          const look = () => {
            turnTimer.current = null;
            const now = ear.current?.now() ?? h;
            const quiet = Date.now() - lastHeard.current;
            if (turnEnd(now, quiet, vPrefsRef.current.pause) === 'end') endTurnRef.current();
            else turnTimer.current = window.setTimeout(look, turnWait(now, quiet, vPrefsRef.current.pause));
          };
          turnTimer.current = window.setTimeout(look, turnWait(h, 0, vPrefsRef.current.pause));
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
          if (h.final.trim()) setSaid({ text: `Heard “${h.final.trim()}” — to answer the card say “yes, do it” or “not now”, or tap Do it or Not now.` });
        }
        spoken.current = true;
        setBox(joinWords(base.current, h.final, h.interim));
      },
      onTrouble: t => onTrouble.current(t, e),
    }, 'en-GB', /Android/i.test(navigator.userAgent), () => document.visibilityState === 'hidden');
    e.local = vPrefsRef.current.onDevice;
    ear.current = e;
    if (voiceRef.current.soundOn) earcon('start');
    setListening(true);
    e.start();
    if (voiceOn.current) vMove({ type: 'ready' });
    stopQuiet();
    quiet.current = window.setTimeout(() => { quiet.current = null; if (ear.current === e) setSaid({ text: NOTHING_HEARD }); }, QUIET_MS);
  };
  const startRef = useRef(startListening);
  startRef.current = startListening;
  useEffect(() => {
    const seen = () => {
      if (document.visibilityState !== 'hidden') return;
      stopSpeaking();
      if (!ear.current) return;
      void stopListening();
      setSaid({ text: 'Listening stopped when LUNAR went out of sight — what you said is in the box. Tap the microphone to carry on.' });
      if (voiceOn.current) { clearTurn(); vMove({ type: 'mute' }); setVNote('Paused — LUNAR went out of sight (the screen locked or another app came in front). Tap Talk to carry on.'); }
    };
    document.addEventListener('visibilitychange', seen);
    return () => document.removeEventListener('visibilitychange', seen);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { ear.current?.abort(); ear.current = null; stopSpeaking(); stopQuiet(); }, []);

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
    if (!on || !voiceOn.current) return;
    vMove({ type: 'speak-start' });
    /* talk over it: with a headset (or when the person said always) the microphone stays open while Faultline speaks */
    if (listenWhileSpeaking(vPrefsRef.current, routeRef.current) && !ear.current) startRef.current({ keepSpeaking: true });
  }), []);
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
    if (!talkOn && !voice) return;
    const env = realEnv();
    const k = new ScreenKeeper(env, setKeep);
    const b = new HeadsetButton(env, () => pressRef.current(), setButton);
    void k.hold();
    void b.take();
    /* a phone that wanted a touch before the silent sound may play: the next touch wakes the button */
    const wake = () => { if (b.now === 'needs-tap') void b.wake(); };
    document.addEventListener('pointerdown', wake);
    return () => { document.removeEventListener('pointerdown', wake); k.letGo(); b.letGo(); };
  }, [talkOn, voice]);
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
  const tryDowntime = async (file: File): Promise<boolean> => {
    if (!/\.(csv|xlsx|xls|tsv|txt)$/i.test(file.name)) return false;
    const sheets = /\.xlsx?$/i.test(file.name) ? readXlsx(await file.arrayBuffer()).map(x => x.rows) : [csvRows(await file.text())];
    const table = sheets.map(rows => downtimeTable(rows)).find(t => t && t.rows.length);
    if (!table) return false;
    const cid = await ensure();
    const k = await keepImport({ ...ctx(), conversationId: cid }, { name: file.name, ...(cur?.scope.lineId ? { lineId: cur.scope.lineId } : {}), ...table });
    if (!k.ok) { setImported(k.why); return true; }
    /* ONE IDENTITY A FILE: an Excel file is in the register as its workbook (readWorkbookFile); only a CSV or text table is registered here */
    if (!/\.(xlsx|xlsm|xls)$/i.test(file.name)) await registerFile({ ...ctx(), conversationId: cid }, { fileId: k.id, fileName: file.name, kind: 'table', bytes: file.size, status: 'ready', sheets: [{ name: file.name, rows: table.rows.length, columns: [{ name: 'reason', type: 'text' }, { name: 'minutes', type: 'number' }, { name: 'events', type: 'number' }, { name: 'line', type: 'text' }, { name: 'date', type: 'date' }] }], ...(cur?.scope.lineId ? { lineId: cur.scope.lineId } : {}) });
    await appendAction(patchStudy, cid, { callId: uid(), name: 'import_table', title: 'Read a downtime file', status: 'done', says: k.says, refs: [], at: Date.now() });
    setImported(k.says);
    return true;
  };
  /* A WORKBOOK (docs/WORKBOOKS.md): an .xlsx of any size is read on this device in a background worker — never uploaded, never sent to
     the model — its progress shown here with a Stop; the colleague then asks it with workbook_profile, query_workbook and workbook_rows.
     A small one that is a downtime table is also kept as imported downtime, as before. */
  const [wb, setWb] = useState<{ id: string; name: string; p?: Progress; said?: string; bad?: boolean } | null>(null);
  const wbRunning = useRef(new Set<string>());
  const wbList: ColleagueWorkbook[] = useMemo(() => ((facts as { workbooks?: ColleagueWorkbook[] } | undefined)?.workbooks ?? []), [facts]);
  useEffect(() => { if (sid.current && wbList.some(w => w.status === 'reading' && !wbRunning.current.has(w.id))) void settleWorkbooks(ctx(), wbRunning.current); }, [wbList, ctx]);
  const readWorkbookFile = async (file: File) => {
    const id = workbookId(file);
    const cid = await ensure();
    const c = { ...ctx(), conversationId: cid };
    const had = wbList.find(w => w.id === id && (w.status === 'ready' || w.status === 'partial'));
    if (had) {
      try { await workbooks().profile(id); setWb({ id, name: file.name, said: `“${file.name}” is already read here — ask about it.` }); return; } catch { /* not on this device: read it again */ }
    }
    const base: ColleagueWorkbook = { id, name: file.name, bytes: file.size, at: Date.now(), status: 'reading' };
    wbRunning.current.add(id);
    await noteWorkbook(c, base);
    setWb({ id, name: file.name, p: { stage: 'opening it', done: 0, total: 1 } });
    try {
      const p = await workbooks().read(id, file.name, file, prog => setWb(x => (x && x.id === id ? { ...x, p: prog } : x)));
      const sheets = p.sheets.map(x => ({ name: x.name, state: x.state, rows: x.rows, columns: x.columns.length }));
      /* the receipt: every sheet when there are a few; a workbook of thirty names its largest and counts the rest (12 November — the
         receipt of a 30-sheet workbook filled the screen and said nothing) */
      const big = [...sheets].sort((a, b) => b.rows - a.rows).slice(0, 3);
      const held = sheets.length <= 4 ? sheets.map(x => `${x.name} ${x.rows.toLocaleString('en-GB')} rows`).join(', ') : `${sheets.length} sheets — the largest ${big.map(x => `${x.name} ${x.rows.toLocaleString('en-GB')} rows`).join(', ')}, and ${sheets.length - big.length} more`;
      const said = `Read “${file.name}” on this device in ${p.seconds.toLocaleString('en-GB')} s: ${held}${p.status === 'partial' ? ' — only PART of it was read' : ''}. It stays on this device; ask about it.`;
      await noteWorkbook(c, { ...base, status: p.status, sheets, seconds: p.seconds, ...(p.status === 'partial' ? { why: p.sheets.filter(x => x.why).map(x => `${x.name}: ${x.why}`).join(' ') } : {}) });
      /* THE REGISTER (docs/CONVERSATIONAL-DATA.md): the file kept as a record of its own — its identity, its original name, what it holds —
         so it can be named, described and asked for by name in any later conversation; its cells stay on this device */
      const src = await registerFile(c, { fileId: id, fileName: file.name, kind: 'workbook', bytes: file.size, status: p.status, sheets: p.sheets.filter(x => x.read).map(x => ({ name: x.name, rows: x.rows, columns: x.columns.map(cl => ({ name: cl.name, type: cl.type })) })), notRead: p.notRead.map(x => x.what), ...(cur?.scope.lineId ? { lineId: cur.scope.lineId } : {}), ...(cur?.scope.projectId ? { projectId: cur.scope.projectId } : {}) });
      const named = src ? ` It is in the register as “${src.facts.name}” — name it as you like.` : '';
      await appendAction(patchStudy, cid, { callId: uid(), name: 'workbook_read', title: 'Read a workbook', status: 'done', says: said + named, refs: [], at: Date.now() });
      setWb({ id, name: file.name, said: said + named });
      /* THE FIRST LOOK (12 November, lib/workbook/firstLook): what the workbook holds, worked in code the moment it is read — the table
         worth analysing, the months, what stands out, what moved, the gaps — as Luna's turn, marked as done in the app; no AI asked.
         NEVER SILENCE (12 November — a 137 MB workbook was read and Luna said nothing): a workbook with no table she can lead with, or
         a look that fails, is said in a sentence with its biggest sheets and the question of where to start. What the person has
         already said the business is managed by (the notebook of meanings, the client in hand's and their own) leads. */
      const sayInCode = (text: string, suggestions: string[] = []) => appendTurn(patchStudy, cid, { id: uid(), at: Date.now(), who: WHO, kind: 'reply', text, byCode: true, ...(suggestions.length ? { suggestions } : {}) } as ColleagueTurn);
      const { firstLook, noLook } = await import('../lib/workbook/firstLook');
      try {
        const line = cur?.scope.lineId ? await getWorkspace(cur.scope.lineId) : undefined;
        const nb = await readNotebooks(line?.clientName?.trim() ?? (await activeClientNow()).client).catch(() => ({} as Awaited<ReturnType<typeof readNotebooks>>));
        const told = [...liveEntries(nb.client), ...liveEntries(nb.own)].flatMap(e => [e.term, e.means]);
        const look = await firstLook(p, q => workbooks().query(id, q), { told });
        await (look ? sayInCode(look.says.join('\n\n'), look.suggestions) : sayInCode(noLook(p)));
      } catch (e) {
        console.warn('the first look could not be worked', e);
        await sayInCode(noLook(p, e instanceof Error ? e.message : String(e))).catch(() => undefined);
      }
    } catch (e) {
      const why = e instanceof Error ? e.message : String(e);
      await noteWorkbook(c, { ...base, status: 'failed', why });
      setWb({ id, name: file.name, said: `“${file.name}” could not be read: ${why}`, bad: true });
    } finally { wbRunning.current.delete(id); }
  };
  const stopWorkbook = () => { if (wb) workbooks().stop(wb.id); };
  const pickDoc = (file: File) => {
    if (/\.(xls|xlsb)$/i.test(file.name)) { setImported(`“${file.name}” is an older Excel format (${/xlsb$/i.test(file.name) ? '.xlsb' : '.xls'}) — open it in Excel, save it as .xlsx and attach that.`); return; }
    if (/\.(xlsx|xlsm)$/i.test(file.name)) {
      void readWorkbookFile(file);
      if (file.size <= 8 * 1024 * 1024) void tryDowntime(file).catch(() => false);
      return;
    }
    void tryDowntime(file).then(took => { if (!took) pickFactoryDoc(file); }).catch(() => pickFactoryDoc(file));
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

  /* ---- ASKING — the client loop (colleague/colleagueAsk) ---- */
  const [asking, setAsking] = useState<string | null>(null);
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

  const ask = async (cid: string) => {
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
    /* THE VOICE CONVERSATION: the reply said sentence by sentence as each round's words come — the first heard while the rest is
       still being worked out; when all of it is said the microphone opens again (reopen). `vUpTo` is how far into the reply's
       spoken words the voice has been handed. */
    const spokenNow = voiceOn.current;
    let vUpTo = 0;
    const vDone = (finished: boolean) => { if (finished) reopen(true, () => vMove({ type: 'speak-end' })); else vMove({ type: 'speak-end' }); };
    const vFeed = (w: string, done: boolean) => {
      if (!spokenNow || !voiceOn.current) return;
      const n = nextChunks(w, vUpTo, done);
      if (!n.chunks.length) return;
      if (!queueActive()) { queueStart(vDone); vMove({ type: 'reply-words' }); }
      for (const c of n.chunks) { queuePush(c); sayingRef.current = c; setSaying(c); }
      vUpTo = n.upTo;
      spokenSoFar.current = w;
    };
    try {
      const asked = before.filter(t => t.id !== rid);
      const named = photoLabels(asked);
      const images: { photo: string; data: string }[] = [];
      for (const t of asked.filter(x => x.kind === 'photo' && !x.struck && x.media).slice(-TALK_LIMITS.images)) {
        const photo = named.get(t.id);
        const data = t.media ? await pictureForAssistant(t.media.blobKey, TALK_LIMITS.imageBytes) : undefined;
        if (photo && data) images.push({ photo, data });
      }
      const photosKeys = asked.filter(x => x.kind === 'photo' && x.media).map(x => ({ label: named.get(x.id) ?? 'P0', key: x.media?.blobKey ?? '', said: photoSaid(named.get(x.id) ?? 'P0', x as WalkTurn) }));
      const steps = new Map<string, Used>();
      const end = await colleagueLoop({
        turns: gatewayTurns(asked, named),
        ...(images.length ? { images } : {}),
        focus: () => conversationFocus(cid, { ...(screenRef.current ? { screen: screenRef.current } : {}), names: nameOf, photos: photosKeys }),
        today: longDay(),
        conversationId: cid,
        preferences: preferencesText,
        ...(spokenNow ? { spoken: true } : {}),
      }, {
        invoke: invokeColleague,
        describe: name => { const c = capabilityByName(name); return c ? { kind: c.kind, title: c.title } : undefined; },
        run: async (call, confirmed) => {
          const r = await runCall(ctx(), call, { confirmed });
          if (r.ok && r.show) showWork(r.show); else if (r.ok && call.name === 'make_record') showWork(r.refs.find(x => x.kind === 'study'));
          /* the record a confirmed write made or wrote into is now said yes to — later fills of it go straight in (colleague/turnRules) */
          if (r.ok && confirmed) await noteConfirmed(cid, call, r);
          return r;
        },
        /* validated, allowed, its preview — and whether it goes in without a card (confirm once; Work within) — colleague/turnRules */
        prepare: (call): Promise<Prepared> => prepareCall(ctx(), cid, call),
        confirm: step => new Promise<boolean>(res => {
          waits.current.set(step.call.id, res); setWaitTick(n => n + 1);
          /* HANDS-FREE: with Conversation on, the card is said out loud, ending "Shall I do it?", and the microphone opens
             for the answer — matched in code on a strict list of whole phrases, never by the model */
          if (!voiceRef.current.talkOn) return;
          hearFor.current = step.call.id;
          const before = spokenNow ? forSpeech(wordsRef.current).slice(vUpTo) : unspoken(wordsRef.current, spokenSoFar.current);
          spokenSoFar.current = wordsRef.current;
          vUpTo = forSpeech(wordsRef.current).length;
          if (voiceRef.current.speakOn && canSpeak()) speak(cardPrompt(before, { title: step.title, ...(step.preview ? { preview: step.preview } : {}) }), reopen);
          else reopen(true);
        }),
        onStep: async (step: Step) => {
          const by = saidFor.current.get(step.call.id);
          await recordStep(cid, rid, steps, step, by);
        },
        onWords: w => { setWords(w); vFeed(w, false); },
      });
      if (end.ok) {
        /* A TREND IS A PICTURE (colleague/autoChart): the turn worked out a series over time, or a graph was asked for, and Luna drew
           nothing — the app draws it from that result through make_chart itself, shown on this turn; no second answer is asked for */
        try {
          const o = outputsOfConversation((await getStudy(cid)) as ToolStudy);
          const want = chartWorth(unansweredTurns(before).map(t => t.text ?? '').join(' '), [...steps.values()], new Map(o.results.map(r => [r.id, r])));
          if (want) {
            const call: CapCall = { id: uid(), name: 'make_chart', input: want };
            const r = await runCall(ctx(), call, { confirmed: false });
            if (r.ok) await recordStep(cid, rid, steps, { call, title: 'Make a chart', kind: 'local', status: 'done', says: r.says, refs: r.refs, input: want as unknown as Record<string, unknown> });
          }
        } catch (e) { console.warn('the chart could not be drawn by itself', e); }
        await changeTurn(patchStudy, cid, rid, t => {
          const { answering: _a, why: _w, ...rest } = t; void _a; void _w;
          return { ...rest, text: end.reply || 'Done.', ...(end.suggestions.length ? { suggestions: end.suggestions } : {}), ...(end.unsure.length ? { unsure: end.unsure } : {}), ...(end.checked ? { checked: end.checked } : {}), ...(end.model ? { model: end.model } : {}), timing: end.timing };
        });
        /* the reply said out loud — what was not said already before a card — and, in Conversation, the microphone after */
        if (spokenNow && voiceOn.current) {
          const n = nextChunks(end.reply ?? '', vUpTo, true);
          if (queueActive()) { for (const c of n.chunks) { queuePush(c); sayingRef.current = c; setSaying(c); } queueClose(); }
          else if (n.chunks.length) { vMove({ type: 'reply-words' }); const all = n.chunks.join(' '); sayingRef.current = all; setSaying(all); speak(all, vDone); }
          else { vMove({ type: 'answered-silently' }); reopen(true); }
        } else {
          const rest = end.reply ? unspoken(end.reply, spokenSoFar.current) : '';
          if (voiceRef.current.speakOn && rest) speak(rest, reopen);
          else if (voiceRef.current.speakOn && end.reply) reopen(true);
        }
      } else {
        await changeTurn(patchStudy, cid, rid, t => ({ ...t, ...(end.reply ? { text: end.reply } : {}), answering: end.offline ? 'waiting' : 'failed', why: end.why, timing: end.timing }));
        if (spokenNow && voiceOn.current) { vMove({ type: 'trouble', fatal: false }); setVNote(end.why); speak(end.offline ? 'No signal — I will answer when it is back.' : 'I could not answer that just now — say it again when you are ready.', () => { vMove({ type: 'recovered' }); reopen(true); }); }
      }
    } catch (e) {
      console.warn('AI Mode could not ask', e);
      await changeTurn(patchStudy, cid, rid, t => ({ ...t, answering: 'failed', why: 'Luna could not answer just now — ask again. What you said is kept.' }));
    } finally {
      for (const [, res] of waits.current) res(false);
      waits.current.clear();
      hearFor.current = null;
      setAsking(null); setWords('');
    }
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
  const answeredInCode = async (cid: string, text: string): Promise<boolean> => {
    if (waits.current.size) return false;
    const conv = (await getStudy(cid)) as ToolStudy | undefined;
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
    if (spoken.current && voiceOn.current) {
      vMove({ type: 'reply-words' }); sayingRef.current = r.says; setSaying(r.says);
      speak(r.says, finished => { if (finished) reopen(true, () => vMove({ type: 'speak-end' })); else vMove({ type: 'speak-end' }); });
    } else if (voiceRef.current.speakOn) speak(r.says, reopen);
    return true;
  };

  const sending = useRef(false);
  const send = (words?: string): Promise<void> => {
    if (sending.current || asking) return Promise.resolve();
    sending.current = true;
    /* one Send at a time; the flag let go however it ends */
    return (async () => {
      stopSpeaking();
      const text = (words ?? (ear.current ? await stopListening() : typingRef.current)).trim();
      const cid = await ensure();
      if (text) {
        await appendTurn(patchStudy, cid, { id: uid(), at: Date.now(), ...(me ? { who: me } : {}), ...(spoken.current && !words ? { kind: 'said' as const, heard: text } : { kind: 'typed' as const, text }) });
        setBox(''); setSaid(null);
        /* a tap said out loud while a measurement runs is answered in code — no AI asked (colleague/fastPath) */
        if (await answeredInCode(cid, text)) return;
      }
      await ask(cid);
    })().finally(() => { sending.current = false; });
  };

  /* WORDS FROM ANOTHER PAGE (Today's box, W7): sent through this same Send once the conversation is here — never twice */
  const sendRef = useRef(send); sendRef.current = send;
  useEffect(() => {
    const take = () => { const w = takePendingSay(); if (w) void sendRef.current(w); };
    const t = window.setTimeout(take, 0);
    window.addEventListener(SAY_EVENT, take);
    return () => { window.clearTimeout(t); window.removeEventListener(SAY_EVENT, take); };
  }, []);

  /* THE HEADSET'S BUTTON — one press: listen; stop and send; stop the reply and listen; or nothing while it works */
  pressRef.current = () => {
    const phase = phaseOf({ talkOn: voiceRef.current.talkOn, listening: !!ear.current, speaking: isSpeaking(), asking: !!asking });
    const card = [...waits.current.keys()].pop();
    switch (pressAction(phase, ear.current ? typingRef.current : '', !!asking, !!card)) {
      case 'listen': if (card) hearFor.current = card; startRef.current(); break;
      case 'interrupt': stopSpeaking(); startRef.current(); break;
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
    if (cmd === 'stop') { setBox(''); return; }
    if (!words || hearFor.current) return;   /* a card waits: only its phrases answer it */
    vMove({ type: 'turn-end' });
    void send();
  };
  const openVoice = () => {
    voiceOn.current = true;
    setVoice(true); setVNote(''); setSaying(''); sayingRef.current = '';
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
  const closeVoice = async () => {
    cancelReopen();
    clearTurn();
    stopSpeaking();
    voiceOn.current = false;
    if (ear.current) await stopListening();
    setVoice(false);
    vMove({ type: 'close' });
  };
  const voiceTap = () => {
    if (vState === 'listening' || vState === 'transcribing') { if (typingRef.current.trim()) endTurnRef.current(); return; }
    if (vState === 'processing' || vState === 'preparing') return;
    setVNote('');
    if (vState === 'idle') vMove({ type: 'unmute' });
    startListening();
  };
  const voiceInterrupt = () => { clearTurn(); stopSpeaking(); vMove({ type: 'interrupt' }); startListening(); };
  const voiceMute = () => {
    if (vState === 'idle') { setVNote(''); vMove({ type: 'unmute' }); startListening(); return; }
    cancelReopen();
    clearTurn();
    stopSpeaking();
    if (ear.current) void stopListening();
    vMove({ type: 'mute' });
  };
  /* a headset paired or dropped while talking — said, as the phone moves the sound itself */
  const hadHeadset = useRef(route.headset);
  useEffect(() => {
    if (route.headset === hadHeadset.current) return;
    hadHeadset.current = route.headset;
    if (voiceOn.current) setVNote(route.headset ? `${route.name ?? 'A headset'} connected — the phone sends LUNAR’s voice to it.` : 'The headset went — LUNAR is on the phone’s speaker now.');
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
  /* THE BOX, as a chat's (9 November — Rowland: "a user interface much like I have with you … wide open text screen … add a picture,
     add a document at the bottom … much like WhatsApp"): the words over a row of presses — ＋ (a photo taken, photos, a factory
     document), the microphone and Send; the box grows with what is typed; at a desk the context can be put away for a wide page */
  const camIn = useRef<HTMLInputElement>(null);
  const [attach, setAttach] = useState(false);
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
  const [chosen, setChosen] = useState<boolean | null>(() => { try { const v = localStorage.getItem('fl-ai-wide'); return v === null ? null : v !== '0'; } catch { return null; } });
  const hour = new Date().getHours();
  const who = greetName(email);
  const hello = `${hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'}${who ? `, ${who}` : ''}`;
  const timers = useTimers();
  const firstLine = lines[0]?.name;
  const examples = [
    'What’s late across the lines?',
    firstLine ? `Start an investigation into lost output on ${firstLine}` : 'Start an investigation into lost output on a line',
    'What does the Story say so far?',
  ];
  const canSend = !asking && (!!typing.trim() || (!!study && unansweredTurns(turns).length > 0));
  const waitingCard = turns.some(t => (t.used ?? []).some(u => u.status === 'waiting' && waits.current.has(u.callId)));
  const title = facts ? conversationTitle(facts, 'Luna') : start?.title ?? 'Luna';
  const manualHref = cur?.scope.lineId ? `/lines/${encodeURIComponent(cur.scope.lineId)}` : cur?.scope.projectId ? `/project/${encodeURIComponent(cur.scope.projectId)}` : '/';
  const noCaps = CAPABILITIES.length === 0;

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
  const outs: Outs = useMemo(() => { const o = outputsOfConversation({ facts: (facts ?? {}) } as ToolStudy); return { results: new Map(o.results.map(r => [r.id, r])), charts: new Map(o.charts.map(c => [c.id, c])), reports: o.reports, ...(me ? { by: me } : {}) }; }, [facts, me]);
  /* the investigations agreed in this conversation (work_within, W3) — each with Stop */
  const agreedIds = (facts as { agreed?: string[] } | undefined)?.agreed ?? [];
  const agreed = projects.filter(p => agreedIds.includes(p.id)).map(p => ({ id: p.id, name: p.name }));
  /* the work in context (docs/LUNAR-ENVIRONMENT.md): once the conversation has begun on a line or a project, it comes into view beside her */
  const placed = !!(cur && (cur.scope?.lineId || cur.scope?.projectId || cur.scope?.problemId)) && turns.length > 0;
  const hasWork = placed || drafts.some(d => d.status === 'draft') || agreed.length > 0 || !!(cur && ((cur.points ?? []).length > 0 || (cur.notes ?? []).length > 0));
  const wide = chosen ?? !hasWork;
  const toggleWide = () => { const next = !wide; setChosen(next); try { localStorage.setItem('fl-ai-wide', next ? '1' : '0'); } catch { /* this visit only */ } };
  /* Stop: the agreement withdrawn — the project, and every record inside it said yes to through it, ask again */
  const stopAgreed = async (pid: string) => {
    if (!study) return;
    const had = ((factsOfConversation((await getStudy(study.id)) as ToolStudy) as { authorised?: string[] }).authorised ?? []);
    const inside = new Set<string>([pid]);
    for (const x of had) if (x !== pid && (await getStudy(x))?.projectId === pid) inside.add(x);
    await patchStudy(study.id, c => ({ facts: { ...c.facts, agreed: ((c.facts as { agreed?: string[] }).agreed ?? []).filter(x => x !== pid), authorised: ((c.facts as { authorised?: string[] }).authorised ?? []).filter(x => !inside.has(x)) } as ToolStudy['facts'] }));
  };
  const workCtx = placed ? <WorkContext lineId={cur?.scope?.lineId} projectId={cur?.scope?.projectId} {...(cur?.scope?.machine ? { machine: cur.scope.machine } : {})} {...(cur?.scope?.problemId ? { problemId: cur.scope.problemId } : {})} open={href => { setCtxSheet(false); showWork({ kind: 'page', id: href, label: 'The work', href }); }} /> : null;
  const panel = <ContextPanel agreed={agreed} onStop={id => void stopAgreed(id)} cur={cur} parked={parked} sources={sources} nameOf={nameOf} onBack={t => void backTo(t)} {...(walkF?.position ? { here: walkF.position } : {})} trail={walkF?.walk ?? []}
    drafts={drafts} make={makeFromPanel} act={actOn} canMakeFactory={canMakeFactory} onSay={x => { setBox(x); setCtxSheet(false); window.setTimeout(() => box.current?.focus(), 0); }} />;

  return (
    <>
      <section className={'ai-main' + (wide ? ' is-wide' : '')} aria-label="The conversation">
        <header className="ai-head">
          <span className={'ai-head-av ai-orb' + (asking ? ' is-thinking' : '')} aria-hidden><i className="ai-orb-r r1" /><i className="ai-orb-r r2" /><span className="ai-orb-core"><Icon name="spark" size={16} /></span></span>
          <div className="ai-head-main">
            {/* "LUNA" over a conversation's own title says whose it is; over the title "Luna" it said her name twice (12 November) */}
            {title !== 'Luna' && <p className="ai-eyebrow"><Icon name="spark" size={13} />LUNA</p>}
            <h1 className="ai-title" data-ai-title>{title}</h1>
          </div>
          <div className="ai-head-acts">
            {timers.running.slice(0, 1).map(t => (
              <span key={t.id} className="ai-timer" role="timer" aria-label={`${t.label} — ${leftSaid(t.endsAt - timers.now)} left`} data-timer><Icon name="time" size={14} />{leftSaid(t.endsAt - timers.now)}<span className="ai-timer-l">{t.label}</span></span>
            ))}
            {work && !workOpen && <button type="button" className="btn ai-work-b" data-work-show onClick={() => setWorkOpen(true)}><Icon name="board" size="1.05em" />Show the work</button>}
            {dock && <button type="button" className="btn ai-full-b" data-luna-full onClick={dock.onFull} title="Luna full width, the conversations beside"><Icon name="arrowUp" size="1.05em" />Full screen</button>}
            {dock && <button type="button" className="btn ai-close-b" data-luna-close onClick={dock.onClose} aria-label="Put Luna away"><Icon name="close" size="1.05em" /></button>}
            <button type="button" className="btn ai-list-b" aria-pressed={listOn} onClick={() => onList(!!(work && workOpen))} title="Earlier conversations — open, rename or delete" data-ai-list-b><Icon name="list" size="1.05em" />Conversations</button>
            <button type="button" className="btn ai-new-b" onClick={onNew}><Icon name="plus" size="1.05em" />New conversation</button>
            <button type="button" className="btn ai-ctx-b" aria-pressed={!wide} onClick={toggleWide} title={wide ? 'Show what this conversation is on, what is parked and the sources' : 'Put the context away for a wider conversation'} data-ai-ctx-b>
              <Icon name="board" size="1.05em" />{wide ? 'Show context' : 'Hide context'}
            </button>
            <MoreMenu items={[
              { label: 'New conversation', run: onNew },
              { label: 'How I work', hint: 'what Luna always knows about how you work — sent with every question', run: () => setPrefsSheet(true) },
              ...(canSpeak() ? [{ label: `Speak replies — ${speakOn ? 'On' : 'Off'}`, hint: 'Luna’s replies read out by this device’s own voice', run: () => { if (speakOn) stopSpeaking(); setSpeakOn(!speakOn); } }] : []),
              { label: `Conversation — ${talkOn ? 'On' : 'Off'}`, hint: CONVERSATION_SAID, run: () => { setTalkOn(!talkOn); if (!talkOn && !speakOn && canSpeak()) setSpeakOn(true); } },
              { label: 'How AI Mode is used', hint: 'what it cost, what it did, what could be answered with no AI', run: () => nav('/ai/usage') },
              { label: `Sounds — ${soundOn ? 'On' : 'Off'}`, hint: 'a short, quiet tone when listening starts and stops', run: () => setSoundOn(!soundOn) },
              { label: 'Before you walk the floor', hint: 'check the microphone, speech recognition, a British voice, the screen kept on and the headset button', run: () => void runCheck() },
              { label: 'Back to Manual Mode', hint: 'the page this is about', run: () => nav(manualHref) },
              { label: 'Turn AI Mode off', hint: 'on this device — Manual Mode is unchanged', run: () => setAiMode(false) },
            ]} />
          </div>
        </header>
        {talkOn && (
          <p className="ai-floor" data-ai-floor aria-live="polite">
            {keepSaid(keep) && <span className={'ai-floor-i' + (keep === 'held' || keep === 'away' ? '' : ' is-a')} data-keep={keep}><Icon name={keepOk ? 'check' : 'warning'} size={13} />{keepSaid(keep)}</span>}
            {buttonSaid(button) && <span className={'ai-floor-i' + (button === 'ready' ? '' : ' is-a')} data-button={button}><Icon name={buttonOk ? 'check' : 'warning'} size={13} />{buttonSaid(button)}</span>}
          </p>
        )}
        {measure && <MeasureStrip m={measure} onUndo={() => void undoEvent()} onReview={() => setReviewing(true)} onEnd={() => void endMeasure()} onShow={() => setWorkOpen(true)} />}
        {timers.ended.map(t => (
          <p key={t.id} className="ai-rung" role="alert" data-timer-ended>The timer for “{t.label}” has ended. <button type="button" className="linkish" onClick={() => timers.dismiss(t.id)}>Dismiss</button></p>
        ))}
        {/* THE PHONE'S STRIP: what it is on now, and what is parked — the context panel in a sheet */}
        <button type="button" className="ai-strip" onClick={() => setCtxSheet(true)} aria-label="What this conversation is on, and what is parked">
          <span className="ai-strip-l">Now on</span>
          <b className="ai-strip-t">{cur?.title ?? 'Nothing yet'}</b>
          {parked.length > 0 && <span className="ai-strip-p">{parked.length} parked</span>}
          <Icon name="chevronDown" size={14} />
        </button>

        <ol className="ai-turns" ref={scroller} aria-label="The conversation" aria-live="polite">
          {turns.length === 0 && (
            <li className="ai-empty">
              <span className="ai-empty-av ai-orb is-big" aria-hidden><i className="ai-orb-r r1" /><i className="ai-orb-r r2" /><i className="ai-orb-r r3" /><span className="ai-orb-core"><Icon name="spark" size={30} /></span></span>
              <p className="ai-empty-g">{hello} — I’m Luna.</p>
              <p className="ai-empty-h" data-luna>Ask Luna about {cur?.title ?? 'your lines'} — its problems, projects and tools.</p>
              <p className="sub">I’m LUNAR’s AI colleague. I read what LUNAR holds, work figures out with the app’s own calculators, say how each thing is known, and change nothing until you tap Do it.{noCaps ? ' (Its steps are not loaded on this copy yet.)' : ''}</p>
              <div className="ai-sugs" role="group" aria-label="Try one">
                {examples.map(x => <button key={x} type="button" className="chip ai-sug is-start" onClick={() => { setBox(x); box.current?.focus(); }}>{x}</button>)}
              </div>
              {!dock && <EnvStart onAsk={x => { setBox(x); box.current?.focus(); }} onOpen={(href, label) => showWork({ kind: 'page', id: href, label, href })} />}
            </li>
          )}
          {turns.map(t => t.kind === 'reply'
            ? <ReplyTurn key={t.id} outs={outs} onShow={r => { setCtxSheet(false); showWork(r); }} t={t} here={asking === t.id} words={asking === t.id ? words : ''} live={waits.current} hands={talkOn} onCard={(c, y) => answerCard(c, y)} onSuggest={x => { setBox(x); box.current?.focus(); }} onAgain={() => sid.current && void ask(sid.current)} />
            : <PersonTurn key={t.id} t={t} label={labels.get(t.id)} />)}
        </ol>

        <div className={'ai-compose' + (listening ? ' is-on' : '')} role="group" aria-label="Ask Luna">
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
            <input ref={docIn} type="file" accept=".csv,.pdf,.docx,.txt,.md,.xlsx,.xlsm,.xls,text/csv,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel.sheet.macroEnabled.12,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*" hidden aria-label="Choose a factory document" onChange={e => { const f = e.target.files?.[0]; if (f) pickDoc(f); e.target.value = ''; }} />
            {wb && (
              <div className="ai-imported ai-wb" data-workbook={wb.p ? 'reading' : wb.bad ? 'failed' : 'read'} role="status">
                {wb.p
                  ? <><span>Reading “{wb.name}” on this device — {wb.p.stage}, <b data-workbook-pct>{Math.min(99, Math.floor((wb.p.done / Math.max(1, wb.p.total)) * 100))}%</b></span> <button type="button" className="b ghost" data-workbook-stop onClick={stopWorkbook}>Stop</button></>
                  : <><span data-workbook-said>{wb.said}</span> <button type="button" className="b ghost" aria-label="Close" onClick={() => setWb(null)}>×</button></>}
              </div>
            )}
            {imported && <p className="ai-imported" data-imported role="status">{imported} <button type="button" className="b ghost" aria-label="Close" onClick={() => setImported(null)}>×</button></p>}
            <textarea ref={box} className="ai-box" rows={1} value={typing} maxLength={4000}
              placeholder={listening ? 'Listening — talk…' : 'Ask Luna, or tell her what you see…'} aria-label="Ask Luna"
              onChange={e => { const er = ear.current; if (er) { ear.current = null; er.abort(); setListening(false); stopQuiet(); } stopSpeaking(); setBox(e.target.value); }}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && window.matchMedia?.('(pointer: fine)').matches) { e.preventDefault(); if (canSend) void send(); } }} />
            <div className="ai-tools">
              <div className="ai-attach" ref={attachRef}>
                <button type="button" className={'ai-tb ai-plus' + (attach ? ' is-on' : '')} aria-haspopup="menu" aria-expanded={attach}
                  aria-label="Add — a photo or a factory document" title="Add a photo or a factory document" onClick={() => setAttach(a => !a)}>
                  <Icon name="plus" size="1.3em" />
                </button>
                {attach && (
                  <div className="ai-attach-m" role="menu" aria-label="Add to the conversation" data-attach-menu>
                    <button type="button" role="menuitem" className="ai-attach-i" data-take-photo onClick={takePhoto}>
                      <span className="ai-attach-ic"><Icon name="camera" size="1.15em" /></span><span><b>Take a photo</b><span className="sub">with this device’s camera</span></span>
                    </button>
                    <button type="button" role="menuitem" className="ai-attach-i" onClick={() => pickFrom(photoIn.current)}>
                      <span className="ai-attach-ic"><Icon name="photo" size="1.15em" /></span><span><b>Photos</b><span className="sub">one or several from your pictures</span></span>
                    </button>
                    <button type="button" role="menuitem" className="ai-attach-i" data-add-doc onClick={() => pickFrom(docIn.current)}>
                      <span className="ai-attach-ic"><Icon name="document" size="1.15em" /></span><span><b>A file or spreadsheet</b><span className="sub">Excel or CSV figures to ask about, or a factory document (PDF, Word)</span></span>
                    </button>
                  </div>
                )}
              </div>
              <button type="button" className="ai-tb" data-camera aria-label="Take a photo" title="Take a photo" onClick={takePhoto}><Icon name="camera" size="1.2em" /></button>
              <span className="ai-tools-gap" />
              <button type="button" className={'ai-tb ai-mic' + (listening ? ' is-on' : '')} aria-pressed={listening}
                aria-label={listening ? 'Stop listening' : 'Talk into the box'} title={listening ? 'Stop listening' : 'Talk into the box'}
                onClick={() => { if (listening) void stopListening(); else startListening(); }}>
                <Icon name={listening ? 'stop' : 'mic'} size="1.25em" />
              </button>
              <button type="button" className="ai-tb ai-voice" aria-label="Voice conversation" title="Talk with Luna — she listens, answers out loud and listens again" onClick={openVoice} data-voice-open><Icon name="wave" size="1.25em" /></button>
              <button type="submit" className="ai-send" aria-label="Send" title="Send" disabled={!canSend}><Icon name="arrowUp" size="1.25em" /></button>
            </div>
          </form>
          <p className="sub ai-hint" aria-live="polite">{listening ? 'Listening — your words come up in the box. Put anything right, then Send.'
            : waitingCard ? `LUNAR is waiting for your answer on the card above — Do it or Not now.${talkOn ? ' Or say “yes, do it” or “not now”.' : ''}`
            : asking ? 'Luna is working on it…'
            : talkOn ? `Conversation is on: after each reply is spoken the microphone opens again.${button === 'ready' ? ' Press your headset’s button to talk, again to send.' : ''} ${FLOOR_LIMIT}`
            : 'Nothing is changed until you tap Do it on a card.'}</p>
        </div>
      </section>
      <aside className={`ai-ctx${drafts.length > 0 || agreed.length > 0 ? ' is-building' : ''}`} aria-label="What this conversation is on">{workCtx}{panel}</aside>
      {work && <WorkPane work={work} outs={outs} open={workOpen} onClose={() => setWorkOpen(false)} onGone={() => { setWork(null); setWorkOpen(false); }} />}
      <Sheet open={reviewing} onClose={() => setReviewing(false)} title={measure ? `${measure.label} — what has been captured` : 'What has been captured'}>
        {measure && <MeasureReview m={measure} onUndo={id => void undoEvent(id)} />}
      </Sheet>
      <Sheet open={ctxSheet} onClose={() => setCtxSheet(false)} title="What this is on">{workCtx}{panel}</Sheet>
      {prefsSheet && <PreferencesSheet open={prefsSheet} onClose={() => setPrefsSheet(false)} />}
      <FactoryDocSheet picked={docPicked} onClose={() => setDocPicked(null)} read={readDoc} />
      {camera && createPortal(<VideoRecorder start="photo" photoOnly onPhoto={b => void addPhotos([b])} onCapture={() => undefined} onClose={() => setCamera(false)} />, document.body)}
      {voice && (
        <VoiceMode state={vState} title={title} heard={listening ? typing : ''} saying={saying} note={vNote} route={route} prefs={vPrefs} setPrefs={setVPrefs}
          heardTick={heardTick} cardWaiting={waitingCard} onTap={voiceTap} onInterrupt={voiceInterrupt} onMute={voiceMute}
          onChat={() => void closeVoice()} onEnd={() => void closeVoice()} bar={!!dock || !shown} />
      )}
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
  const marked = (t: string, k: string | number) => (check?.length ? markFigures(t, check).map((x, j) => (x.check ? <mark key={`${k}-${j}`} className="ai-fig-check" data-ai-fig-check title="Not in LUNAR’s working or what you said — check this">{x.text}</mark> : x.text)) : t);
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

interface Outs { results: ReadonlyMap<string, DataResult>; charts: ReadonlyMap<string, Chart>; reports: readonly ConvReport[]; by?: string }
function ReplyTurn({ t, here, words, live, hands, onCard, onSuggest, onAgain, outs, onShow }: {
  t: ColleagueTurn; here: boolean; words: string; live: ReadonlyMap<string, unknown>; hands: boolean; onCard: (callId: string, yes: boolean) => void; onSuggest: (x: string) => void; onAgain: () => void; outs?: Outs; onShow?: (r: CapRef) => void;
}) {
  const used = t.used ?? [];
  /* what this turn made — a chart as the version it made, a report as its newest (docs/CONVERSATIONAL-DATA.md) */
  const made = used.flatMap(u => u.refs).filter(r => r.kind === 'chart' || r.kind === 'convreport' || r.kind === 'result').filter((r, i, all) => all.findIndex(x => x.kind === r.kind && x.id === r.id) === i);
  const steps = used.filter(u => u.kind !== 'write');
  const cards = used.filter(u => u.kind === 'write');
  return (
    <li className={'ai-turn is-colleague' + (t.struck ? ' is-struck' : '')} data-turn={t.id} data-kind="reply">
      <span className={'ai-avatar ai-orb' + (t.answering === 'waiting' && here ? ' is-thinking' : '')} aria-hidden><i className="ai-orb-r r1" /><i className="ai-orb-r r2" /><span className="ai-orb-core"><Icon name="spark" size={15} /></span></span>
      <div className="ai-turn-b">
        <span className="ai-meta">Luna · {hhmm(t.at)}</span>
        {t.answering === 'waiting' && here && (words ? <Words text={words} growing /> : <p className="sub ai-thinking" data-ai-working><span className="ai-dots" aria-hidden><i /><i /><i /></span>Luna is working on it…{steps.length > 0 && <span className="ai-working-now"> {steps[steps.length - 1].title}</span>}</p>)}
        {t.answering === 'waiting' && !here && <p className="sub ai-line">{t.why ?? 'Not answered yet.'} <button type="button" className="linkish" onClick={onAgain}>Ask again</button></p>}
        {t.answering === 'failed' && <p className="sub ai-line is-off" data-ai-failed>{t.why ?? 'Luna could not answer.'} <button type="button" className="linkish" onClick={onAgain}>Ask again</button></p>}
        {!t.answering && t.text && <Words text={t.text} check={t.unsure} />}
        {/* HER WORKING, PUT AWAY (10 November — Rowland: "All I want to see basically is Luna working, and then what? … I see everything that she
            asks to look for … It's all a bit messy"): while she works, one line of what she is doing; once she has answered, her answer first
            and every step folded under one line, open to anyone who wants to check how she got there */}
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
          </details>
        )}
        {outs && made.map(r => {
          const [id, v] = r.id.split('@');
          /* beside the conversation, as the work (docs/LUNAR-ENVIRONMENT.md) — the chart, the result's table, the report as its document */
          const beside = onShow && <button key={`b-${r.kind}-${r.id}`} type="button" className="linkish ai-beside" data-show-beside={`${r.kind}:${r.id}`} onClick={() => onShow(r)}>Show beside the conversation ›</button>;
          if (r.kind === 'result') { const res = outs.results.get(id); return res ? <p key={r.id} className="sub ai-out-line" data-result-line={id}>Result {id} — {res.title}. {beside}</p> : null; }
          if (r.kind === 'chart') { const c = outs.charts.get(id); return c ? <div key={r.id}><ChartCard chart={c} version={Number(v) || c.versions.length} results={outs.results} />{beside}</div> : null; }
          const rep = outs.reports.find(x => x.id === id);
          const lastRef = [...made].reverse().find(x => x.kind === 'convreport' && x.id.startsWith(`${id}@`));
          const latestHere = (Number(v) || rep?.version) === rep?.version && lastRef?.id === r.id;
          return rep ? <div key={r.id}><ReportCard report={rep} version={Number(v) || rep.version} latest={latestHere} results={outs.results} charts={outs.charts} {...(outs.by ? { by: outs.by } : {})} />{latestHere && beside}</div> : null;
        })}
        {/* RECEIPTS (W3): a write that went in without a card — said yes to before, or inside the agreed investigation — one line
            each, what landed and where; a card only for what was asked */}
        {cards.filter(u => u.auto && u.status === 'done').map(u => (
          <p key={u.callId} className="ai-receipt" data-receipt={u.name}><Icon name="check" size={13} /><span><b>{u.title}</b> — {u.says}</span><RefChips refs={u.refs} label="Where it landed" /></p>
        ))}
        {cards.filter(u => !(u.auto && u.status === 'done')).map(u => <WriteCard key={u.callId} u={u} live={live.has(u.callId)} hands={hands} onCard={onCard} />)}
        {/* EVERY FIGURE CHECKED (docs/LUNA-NEXT.md L1): the count looked for in LUNAR's working, and those found nowhere marked in the
            words above and named here */}
        {!t.answering && (t as { byCode?: boolean }).byCode && <p className="ai-figs sub" data-ai-code="1">Done in the app — no AI used.</p>}
        {!t.answering && t.checked !== undefined && !t.unsure?.length && figuresSaid({ checked: t.checked, unsure: [] }) && (
          <p className="ai-figs is-ok sub" data-ai-figures="ok"><Icon name="check" size={13} /> {figuresSaid({ checked: t.checked, unsure: [] })}</p>
        )}
        {!t.answering && !!t.unsure?.length && (
          <p className="ai-unsure" data-ai-unsure>
            {t.checked !== undefined && <span className="ai-figs-k" data-ai-figures="check">{figuresSaid({ checked: Math.max(t.checked, t.unsure.length), unsure: t.unsure })}</span>}
            {t.unsure.map(x => <span key={x} className="ai-check">Check this: {x}</span>)}
            {t.checked === undefined && <span className="sub"> — not in what LUNAR holds or what you said.</span>}
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
  if (u.status === 'refused') {
    return <p className="ai-step-refused sub" data-card-refused={u.name}><Icon name="warning" size={14} /> <b>{u.title}</b> — not offered: {u.says}</p>;
  }
  return (
    <div className={'ai-card is-' + u.status} data-card={u.name} data-card-status={u.status}>
      <p className="ai-card-k">{u.status === 'waiting' ? 'Luna asks to' : u.status === 'done' ? 'Done' : u.status === 'declined' ? 'Not done' : 'Could not be done'}</p>
      <p className="ai-card-t">{u.title}</p>
      {u.preview && <p className="ai-card-p">{u.preview}</p>}
      {rows.length > 0 && <dl className="ai-card-rows">{rows.map(r => <div key={r.k}><dt>{r.k}</dt><dd>{r.v}</dd></div>)}</dl>}
      {u.said && <p className="ai-card-said" data-card-said>Said: {u.said}</p>}
      {u.status === 'waiting' && live && (
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

function ContextPanel({ cur, parked, sources, nameOf, onBack, drafts, make, act, canMakeFactory, onSay, here, trail, agreed = [], onStop }: {
  here?: WalkStop; trail?: readonly WalkStop[];
  /** Investigations agreed in this conversation (W3): captured into without a card, each with Stop. */
  agreed?: { id: string; name: string }[]; onStop?: (projectId: string) => void;
  cur?: Thread; parked: Thread[]; sources: CapRef[]; nameOf: (k: 'line' | 'project' | 'problem' | 'story', id: string) => string | undefined; onBack: (t: Thread) => void;
  drafts: ColleagueDraft[]; make: MakeFlow; act: (draftId: string, items: FactoryOp[]) => Promise<CapResult>; canMakeFactory: boolean; onSay: (words: string) => void;
}) {
  const place = (s: ThreadScope, refs: readonly CapRef[]): CapRef[] => [
    ...(s.lineId ? [{ kind: 'line' as const, id: s.lineId, label: nameOf('line', s.lineId) ?? refs.find(r => r.kind === 'line' && r.id === s.lineId)?.label ?? 'The line', href: `/lines/${encodeURIComponent(s.lineId)}` }] : []),
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
      <div className="ai-ctx-s" data-ctx-sources>
        <Fold id="luna-sources" start={false} title="Sources" says={sources.length ? `${sources.length} record${sources.length === 1 ? '' : 's'} read or changed` : 'None read yet'}>
          {sources.length ? <RefChips refs={sources} label="Every record read or changed" /> : <p className="sub ai-ctx-none">Every record LUNAR reads or changes in this conversation is listed here.</p>}
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
        <ul className="ai-draft-m" aria-label="Worked out by LUNAR" data-draft-metrics>
          {ms.map(m => <li key={m.metric.id} data-metric={m.metric.name}><span className="ai-draft-k">{m.metric.name} — worked out by LUNAR</span><span className="ai-draft-v">{m.value !== undefined ? m.said : `waits on ${m.missing.join(', ')}`}</span></li>)}
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
function workOutput(work: CapRef, outs?: Outs): JSX.Element | null {
  if (!outs || (work.kind !== 'chart' && work.kind !== 'convreport' && work.kind !== 'result')) return null;
  const [id, v] = work.id.split('@');
  if (work.kind === 'result') { const r = outs.results.get(id); return r ? <ResultTable result={r} /> : <p className="sub">That result is not in this conversation any more.</p>; }
  if (work.kind === 'chart') { const c = outs.charts.get(id); return c ? <ChartCard chart={c} version={Number(v) || c.versions.length} results={outs.results} /> : <p className="sub">That chart is not in this conversation any more.</p>; }
  const rep = outs.reports.find(x => x.id === id);
  return rep ? <ReportDocument report={rep} results={outs.results} charts={outs.charts} {...(outs.by ? { by: outs.by } : {})} /> : <p className="sub">That report is not in this conversation any more.</p>;
}

function WorkPane({ work, outs, open, onClose, onGone }: { work: CapRef; outs?: Outs; open: boolean; onClose: () => void; onGone: () => void }) {
  const made = workOutput(work, outs);
  return (
    <aside className={'ai-work' + (open ? ' is-open' : '')} aria-label={`The work — ${work.label}`} data-work data-work-href={work.href} data-work-kind={work.kind}>
      <header className="ai-work-h">
        <button type="button" className="btn ai-work-back" onClick={onClose} aria-label="Back to the conversation"><Icon name="chevronLeft" size="1.05em" />Conversation</button>
        <b className="ai-work-t">{work.label}</b>
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
