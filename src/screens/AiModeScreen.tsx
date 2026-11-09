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
 * Ask Faultline (src/colleague/AiDoor), never a line of the menu. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getStudy, listAllStudies, onDataChange, patchStudy, putBlob, putStudy } from '../db';
import { useSession } from '../cloud/session';
import { displayName } from '../cloud/team';
import { useAccess } from '../cloud/access';
import { uid } from '../lib/ids';
import { niceDay, todayISO } from '../lib/weeks';
import { nav, useRoute } from '../state/useRoute';
import { useFactoryLines } from '../lib/useFactoryLines';
import { useProjects } from '../lib/useProjects';
import { Icon, type IconName } from '../ui/Icon';
import { MoreMenu } from '../ui/parts';
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
import { captured, metricsOf, missing, toolTitle, valueWords } from '../capabilities/drafts';
import { studyHref } from '../lib/studyLinks';
import { can as canAt } from '../lib/access';
import {
  HOW_WORD, WHO, appendAction, appendTurn, changeThreads, changeTurn, conversationTitle, currentThread, factsOfConversation, focusText, gatewayTurns,
  isConversation, newConversation, parkedThreads, setCurrent, sourcesOf, turnsOfConversation, unansweredTurns, uniqueRefs, addRefs,
  type ColleagueTurn, type Thread, type ThreadScope, type Used,
} from '../colleague/conversation';
import { colleagueLoop, invokeColleague, type Prepared, type Step } from '../colleague/colleagueAsk';
import { setAiMode, useAiMode, useDeviceFlag } from '../colleague/aiMode';
import { CONVERSATION_KEY, CONVERSATION_SAID, SPEAK_KEY, canSpeak, isSpeaking, onSpeaking, speak, stopSpeaking } from '../colleague/voice';
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
import { FactoryDocSheet, FactoryDraftBox, type DocPicked } from '../colleague/AiFactory';

const hhmm = (ms: number) => new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
const longDay = () => new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const QUIET_MS = 6000;
const isDesk = () => { try { return window.matchMedia('(min-width: 1100px)').matches; } catch { return true; } };

/* ======================================================================== the page */

export function AiModeScreen() {
  const route = useRoute();
  const on = useAiMode();
  const lines = useFactoryLines();
  const { projects } = useProjects();
  const lineQ = route.query.get('line') ?? '';
  const projectQ = route.query.get('project') ?? '';
  const [all, setAll] = useState<ToolStudy[] | null>(null);
  const load = useCallback(async () => setAll((await listAllStudies()).filter(isConversation).sort((a, b) => b.updatedAt - a.updatedAt)), []);
  useEffect(() => { void load(); return onDataChange(() => void load()); }, [load]);
  /* WHICH CONVERSATION — the one the address names, else a new one; a session key keeps a conversation's working state
     while its first Send makes its record (the address is then quietly given its id, for a reload) */
  const [open, setOpen] = useState<{ key: string; id?: string }>(() => ({ key: uid(), ...(route.query.get('c') ? { id: route.query.get('c') as string } : {}) }));
  const [listSheet, setListSheet] = useState(false);
  const start = useMemo((): { title: string; scope: ThreadScope } | undefined => {
    if (lineQ) { const l = lines.find(x => x.id === lineQ); return l ? { title: l.name, scope: { lineId: l.id } } : undefined; }
    if (projectQ) { const p = projects.find(x => x.id === projectQ); return p ? { title: p.name, scope: { projectId: p.id } } : undefined; }
    return undefined;
  }, [lineQ, projectQ, lines, projects]);

  if (!on) {
    return (
      <div className="wrap ai-off" data-ai-off>
        <h1 className="pace-title">AI Mode is off</h1>
        <p className="pace-lede">Faultline works the same without it — every page, tool and paper is here in Manual Mode. Turned on, Ask Faultline sits in the top bar: a colleague who reads the lines, problems and tools for you, and changes nothing until you say so.</p>
        <button type="button" className="btn btn-primary" onClick={() => setAiMode(true)}><Icon name="spark" size="1.05em" />Turn AI Mode on</button>
      </div>
    );
  }

  const pick = (id?: string) => {
    setOpen({ key: uid(), ...(id ? { id } : {}) });
    setListSheet(false);
    try { history.replaceState(null, '', id ? `#/ai?c=${encodeURIComponent(id)}` : '#/ai'); } catch { /* the page still follows */ }
  };
  const list = <ConversationList all={all} openId={open.id} onPick={pick} />;
  return (
    <div className="ai" data-ai>
      <aside className="ai-list" aria-label="Conversations">{list}</aside>
      <Conversation key={open.key} id={open.id} start={open.id ? undefined : start} onMade={id => {
        setOpen(o => ({ ...o, id }));
        try { history.replaceState(null, '', `#/ai?c=${encodeURIComponent(id)}`); } catch { /* kept for this visit */ }
      }} onList={() => setListSheet(true)} onNew={() => pick()} />
      <Sheet open={listSheet} onClose={() => setListSheet(false)} title="Conversations">{list}</Sheet>
    </div>
  );
}

function ConversationList({ all, openId, onPick }: { all: ToolStudy[] | null; openId?: string; onPick: (id?: string) => void }) {
  return (
    <>
      <button type="button" className="btn ai-new" onClick={() => onPick()}><Icon name="plus" size="1.05em" />New conversation</button>
      <p className="ai-list-h">Earlier</p>
      {all === null ? <p className="sub ai-list-none">Reading…</p> : all.length === 0 ? <p className="sub ai-list-none">None yet — what you ask is kept here.</p> : (
        <ul className="ai-convs">
          {all.map(s => {
            const f = factsOfConversation(s);
            return (
              <li key={s.id}>
                <button type="button" className={'ai-conv' + (s.id === openId ? ' is-on' : '')} aria-current={s.id === openId ? 'true' : undefined} data-conv={s.id} onClick={() => onPick(s.id)}>
                  <b>{conversationTitle(f, s.name)}</b>
                  <span>{niceDay(todayISO(new Date(s.updatedAt)))} · {hhmm(s.updatedAt)}</span>
                </button>
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

function Conversation({ id, start, onMade, onList, onNew }: {
  id?: string; start?: { title: string; scope: ThreadScope }; onMade: (id: string) => void; onList: () => void; onNew: () => void;
}) {
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
  const ctx = useCallback((): CapCtx => ({
    now: Date.now(), ...(email ? { email } : {}), ...(me ? { me } : {}), ...(sid.current ? { conversationId: sid.current } : {}),
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
  onTrouble.current = (t, e) => { if (ear.current !== e) return; void stopListening(); setSaid({ text: troubleSaid(t), bad: t !== 'network' }); };
  const startListening = () => {
    stopSpeaking();
    setSaid(null);
    const Rec = recognitionOf(window);
    if (!Rec) { setSaid({ text: troubleSaid('unsupported') }); box.current?.focus(); return; }
    base.current = typingRef.current.trim();
    const e: Ear = new Ear(Rec, {
      onWords: h => {
        if (ear.current !== e) return;
        stopQuiet();
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
    ear.current = e;
    if (voiceRef.current.soundOn) earcon('start');
    setListening(true);
    e.start();
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
      setSaid({ text: 'Listening stopped when Faultline went out of sight — what you said is in the box. Tap the microphone to carry on.' });
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
  voiceRef.current = { speakOn, talkOn, soundOn };
  const [speaking, setSpeaking] = useState(false);
  useEffect(() => onSpeaking(setSpeaking), []);
  /** After something is said: the microphone again, if it was said to the end and Conversation is on. */
  const reopen = (finished: boolean) => {
    if (reopenAfterSpeech({ finished, talkOn: voiceRef.current.talkOn, visible: document.visibilityState === 'visible', listening: !!ear.current })) startRef.current();
  };

  /* ---- ON THE FLOOR (colleague/floor): while Conversation is on, the screen kept on and the headset's button taken ---- */
  const [keep, setKeep] = useState<KeepState>('off');
  const [button, setButton] = useState<ButtonState>('off');
  const pressRef = useRef<() => void>(() => undefined);
  useEffect(() => {
    if (!talkOn) return;
    const env = realEnv();
    const k = new ScreenKeeper(env, setKeep);
    const b = new HeadsetButton(env, () => pressRef.current(), setButton);
    void k.hold();
    void b.take();
    /* a phone that wanted a touch before the silent sound may play: the next touch wakes the button */
    const wake = () => { if (b.now === 'needs-tap') void b.wake(); };
    document.addEventListener('pointerdown', wake);
    return () => { document.removeEventListener('pointerdown', wake); k.letGo(); b.letGo(); };
  }, [talkOn]);
  const [checking, setChecking] = useState<CheckItem[] | 'running' | null>(null);
  const runCheck = async () => { setChecking('running'); setChecking(await floorCheck(realEnv())); };

  /* ---- photos: kept the moment they are picked, labelled P1, P2 … ---- */
  const photoIn = useRef<HTMLInputElement>(null);
  const addPhotos = async (files: File[]) => {
    const cid = await ensure();
    for (const f of files) {
      if (!f.type.startsWith('image/')) continue;
      const at = Date.now(), blobKey = `talk-${uid()}`;
      await putBlob(blobKey, f);
      await appendTurn(patchStudy, cid, { id: uid(), at, ...(me ? { who: me } : {}), kind: 'photo', media: { blobKey, mime: f.type || 'image/jpeg', capturedAt: at } });
    }
  };

  /* ---- A FACTORY DOCUMENT (docs/FACTORY-KNOWLEDGE.md F4): picked, read, kept as a factory source, its proposals on the draft ---- */
  const docIn = useRef<HTMLInputElement>(null);
  const [docPicked, setDocPicked] = useState<DocPicked | null>(null);
  const pickDoc = (file: File) => {
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
    /* a reply not given before is asked again in its place */
    const was = [...before].reverse().find(t => t.kind === 'reply' && !!t.answering && !t.struck);
    const rid = was?.id ?? replyId;
    if (was) await changeTurn(patchStudy, cid, rid, t => ({ ...t, answering: 'waiting', at, why: undefined, used: [] }));
    else await appendTurn(patchStudy, cid, { id: rid, at, who: WHO, kind: 'reply', answering: 'waiting', used: [] });
    setAsking(rid); setWords(''); spokenSoFar.current = '';
    try {
      const asked = before.filter(t => t.id !== rid);
      const named = photoLabels(asked);
      const images: { photo: string; data: string }[] = [];
      for (const t of asked.filter(x => x.kind === 'photo' && !x.struck && x.media).slice(-TALK_LIMITS.images)) {
        const photo = named.get(t.id);
        const data = t.media ? await pictureForAssistant(t.media.blobKey, TALK_LIMITS.imageBytes) : undefined;
        if (photo && data) images.push({ photo, data });
      }
      const photosKeys = asked.filter(x => x.kind === 'photo' && x.media).map(x => ({ label: named.get(x.id) ?? 'P0', key: x.media?.blobKey ?? '' }));
      const steps = new Map<string, Used>();
      const end = await colleagueLoop({
        turns: gatewayTurns(asked, named),
        ...(images.length ? { images } : {}),
        focus: async () => { const f = factsOfConversation((await getStudy(cid)) as ToolStudy); return focusText(f.threads ?? [], { names: nameOf, photos: photosKeys, drafts: f.drafts ?? [] }); },
        today: longDay(),
        conversationId: cid,
        preferences: preferencesText,
      }, {
        invoke: invokeColleague,
        describe: name => { const c = capabilityByName(name); return c ? { kind: c.kind, title: c.title } : undefined; },
        run: (call, confirmed) => runCall(ctx(), call, { confirmed }),
        prepare: async (call): Promise<Prepared> => {
          const c = capabilityByName(call.name);
          if (!c) return { ok: false, title: call.name, why: 'Faultline has no such step.' };
          const v = c.validate(call.input);
          if (!v.ok) return { ok: false, title: c.title, why: v.why };
          const a = await c.allowed(ctx(), v.input);
          if (!a.ok) return { ok: false, title: c.title, why: a.why };
          const preview = c.preview ? await c.preview(ctx(), v.input) : c.title;
          return { ok: true, title: c.title, preview, input: (v.input ?? {}) as Record<string, unknown> };
        },
        confirm: step => new Promise<boolean>(res => {
          waits.current.set(step.call.id, res); setWaitTick(n => n + 1);
          /* HANDS-FREE: with Conversation on, the card is said out loud, ending "Shall I do it?", and the microphone opens
             for the answer — matched in code on a strict list of whole phrases, never by the model */
          if (!voiceRef.current.talkOn) return;
          hearFor.current = step.call.id;
          const before = unspoken(wordsRef.current, spokenSoFar.current);
          spokenSoFar.current = wordsRef.current;
          if (voiceRef.current.speakOn && canSpeak()) speak(cardPrompt(before, { title: step.title, ...(step.preview ? { preview: step.preview } : {}) }), reopen);
          else reopen(true);
        }),
        onStep: async (step: Step) => {
          const by = saidFor.current.get(step.call.id);
          const u: Used = { callId: step.call.id, name: step.call.name, title: step.title, kind: step.kind, status: step.status, says: step.says, refs: step.refs,
            ...(step.preview ? { preview: step.preview } : {}), ...(step.input ? { input: step.input } : {}), ...(by ? { said: by } : {}), at: Date.now() };
          steps.set(u.callId, u);
          await changeTurn(patchStudy, cid, rid, t => ({ ...t, used: [...steps.values()] }));
          if (step.status === 'done' && step.refs.length) await changeThreads(patchStudy, cid, ts => addRefs(ts, step.refs));
          if (step.kind === 'write' && (step.status === 'done' || step.status === 'declined' || step.status === 'failed'))
            await appendAction(patchStudy, cid, { callId: u.callId, name: u.name, title: u.title, status: step.status, says: u.says, refs: u.refs, at: u.at });
        },
        onWords: setWords,
      });
      if (end.ok) {
        await changeTurn(patchStudy, cid, rid, t => {
          const { answering: _a, why: _w, ...rest } = t; void _a; void _w;
          return { ...rest, text: end.reply || 'Done.', ...(end.suggestions.length ? { suggestions: end.suggestions } : {}), ...(end.unsure.length ? { unsure: end.unsure } : {}), ...(end.model ? { model: end.model } : {}) };
        });
        /* the reply said out loud — what was not said already before a card — and, in Conversation, the microphone after */
        const rest = end.reply ? unspoken(end.reply, spokenSoFar.current) : '';
        if (voiceRef.current.speakOn && rest) speak(rest, reopen);
        else if (voiceRef.current.speakOn && end.reply) reopen(true);
      } else {
        await changeTurn(patchStudy, cid, rid, t => ({ ...t, ...(end.reply ? { text: end.reply } : {}), answering: end.offline ? 'waiting' : 'failed', why: end.why }));
      }
    } catch (e) {
      console.warn('AI Mode could not ask', e);
      await changeTurn(patchStudy, cid, rid, t => ({ ...t, answering: 'failed', why: 'Faultline could not answer just now — ask again. What you said is kept.' }));
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
      }
      await ask(cid);
    })().finally(() => { sending.current = false; });
  };

  /* THE HEADSET'S BUTTON — one press: listen; stop and send; stop the reply and listen; or nothing while it works */
  pressRef.current = () => {
    const phase = phaseOf({ talkOn: voiceRef.current.talkOn, listening: !!ear.current, speaking: isSpeaking(), asking: !!asking });
    const card = [...waits.current.keys()].pop();
    switch (pressAction(phase, ear.current ? typingRef.current : '', !!asking, !!card)) {
      case 'listen': if (card) hearFor.current = card; startRef.current(); break;
      case 'interrupt': stopSpeaking(); startRef.current(); break;
      case 'send': void send(); break;
      case 'stop': void stopListening(); break;
      case 'none': setSaid({ text: 'Faultline is working on it — press again once it has answered.' }); break;
    }
  };

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
  const timers = useTimers();
  const firstLine = lines[0]?.name;
  const examples = [
    'What’s late across the lines?',
    firstLine ? `Start an investigation into lost output on ${firstLine}` : 'Start an investigation into lost output on a line',
    'What does the Story say so far?',
  ];
  const canSend = !asking && (!!typing.trim() || (!!study && unansweredTurns(turns).length > 0));
  const waitingCard = turns.some(t => (t.used ?? []).some(u => u.status === 'waiting' && waits.current.has(u.callId)));
  const title = facts ? conversationTitle(facts, 'Ask Faultline') : start?.title ?? 'Ask Faultline';
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
      if (cid) await appendAction(patchStudy, cid, { callId, name: 'make_record', title: 'Make it a record', status: r.ok ? 'done' : 'failed', says: r.ok ? r.says : r.why, refs: r.ok ? r.refs : [], at: Date.now() });
      return r;
    },
  };
  const drafts = facts?.drafts ?? [];
  /* a factory draft's buttons (keep, leave out, pick) go through the same door as the colleague's add_to_factory_draft */
  const actOn = (draftId: string, items: FactoryOp[]): Promise<CapResult> => runCall(ctx(), { id: uid(), name: 'add_to_factory_draft', input: { draftId, items } }, { confirmed: false });
  const canMakeFactory = !projectHere || canAt(access.level).edit;
  const panel = <ContextPanel cur={cur} parked={parked} sources={sources} nameOf={nameOf} onBack={t => void backTo(t)}
    drafts={drafts} make={makeFromPanel} act={actOn} canMakeFactory={canMakeFactory} onSay={x => { setBox(x); setCtxSheet(false); window.setTimeout(() => box.current?.focus(), 0); }} />;

  return (
    <>
      <section className="ai-main" aria-label="The conversation">
        <header className="ai-head">
          <div className="ai-head-main">
            <p className="ai-eyebrow"><Icon name="spark" size={13} />AI MODE</p>
            <h1 className="ai-title" data-ai-title>{title}</h1>
          </div>
          <div className="ai-head-acts">
            {timers.running.slice(0, 1).map(t => (
              <span key={t.id} className="ai-timer" role="timer" aria-label={`${t.label} — ${leftSaid(t.endsAt - timers.now)} left`} data-timer><Icon name="time" size={14} />{leftSaid(t.endsAt - timers.now)}<span className="ai-timer-l">{t.label}</span></span>
            ))}
            <button type="button" className="btn ai-list-b" onClick={onList}><Icon name="list" size="1.05em" />Conversations</button>
            <MoreMenu items={[
              { label: 'New conversation', run: onNew },
              { label: 'How I work', hint: 'what Faultline always knows about how you work — sent with every question', run: () => setPrefsSheet(true) },
              ...(canSpeak() ? [{ label: `Speak replies — ${speakOn ? 'On' : 'Off'}`, hint: 'the colleague’s replies read out by this device’s own voice', run: () => { if (speakOn) stopSpeaking(); setSpeakOn(!speakOn); } }] : []),
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
              <p className="ai-empty-h">Ask Faultline about your lines, problems, projects and tools.</p>
              <p className="sub">It reads what Faultline holds, works figures out with the app’s own calculators, says how each thing is known, and changes nothing until you tap Do it.{noCaps ? ' (Its steps are not loaded on this copy yet.)' : ''}</p>
              <div className="ai-sugs" role="group" aria-label="Try one">
                {examples.map(x => <button key={x} type="button" className="chip ai-sug" onClick={() => { setBox(x); box.current?.focus(); }}>{x}</button>)}
              </div>
            </li>
          )}
          {turns.map(t => t.kind === 'reply'
            ? <ReplyTurn key={t.id} t={t} here={asking === t.id} words={asking === t.id ? words : ''} live={waits.current} hands={talkOn} onCard={(c, y) => answerCard(c, y)} onSuggest={x => { setBox(x); box.current?.focus(); }} onAgain={() => sid.current && void ask(sid.current)} />
            : <PersonTurn key={t.id} t={t} label={labels.get(t.id)} />)}
        </ol>

        <div className={'ai-compose' + (listening ? ' is-on' : '')} role="group" aria-label="Ask Faultline">
          {said && <p className={'sub ai-said' + (said.bad ? ' is-r' : '')} role="status">{said.text}</p>}
          {listening && <p className="ai-state is-listening" role="status" data-ai-listening><span className="ai-pulse" aria-hidden />Listening…<span className="sub"> what you say comes up in the box</span></p>}
          {!listening && speaking && (
            <p className="ai-state is-speaking" role="status" data-ai-speaking>
              <Icon name="spark" size={13} />Speaking…
              <button type="button" className="linkish" onClick={() => { stopSpeaking(); if (talkOn) startListening(); }}>{talkOn ? 'Stop and talk' : 'Stop'}</button>
            </p>
          )}
          <form className="ai-type" onSubmit={e => { e.preventDefault(); if (canSend) void send(); }}>
            <button type="button" className="btn ai-icon" aria-label="Add a photo" title="Add a photo" onClick={() => photoIn.current?.click()}><Icon name="camera" size="1.2em" /></button>
            <input ref={photoIn} type="file" accept="image/*" multiple hidden aria-label="Choose photos" onChange={e => { void addPhotos([...(e.target.files ?? [])]); e.target.value = ''; }} />
            <button type="button" className="btn ai-icon" aria-label="Add a factory document" title="Add a factory document — an equipment register, an asset list, a layout" onClick={() => docIn.current?.click()} data-add-doc><Icon name="document" size="1.2em" /></button>
            <input ref={docIn} type="file" accept=".csv,.pdf,.docx,.txt,.md,.xlsx,.xls,text/csv,application/pdf,image/*" hidden aria-label="Choose a factory document" onChange={e => { const f = e.target.files?.[0]; if (f) pickDoc(f); e.target.value = ''; }} />
            <textarea ref={box} className="text-input ai-box" rows={typing.length > 140 ? 4 : typing.length > 60 || typing.includes('\n') ? 2 : 1} value={typing} maxLength={4000}
              placeholder={listening ? 'Listening — talk…' : 'Ask Faultline, or tell it what you see…'} aria-label="Ask Faultline"
              onChange={e => { const er = ear.current; if (er) { ear.current = null; er.abort(); setListening(false); stopQuiet(); } stopSpeaking(); setBox(e.target.value); }}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && window.matchMedia?.('(pointer: fine)').matches) { e.preventDefault(); if (canSend) void send(); } }} />
            <button type="button" className={'btn ai-icon ai-mic' + (listening ? ' is-on' : '')} aria-pressed={listening}
              aria-label={listening ? 'Stop listening' : 'Talk into the box'} title={listening ? 'Stop listening' : 'Talk into the box'}
              onClick={() => { if (listening) void stopListening(); else startListening(); }}>
              <Icon name={listening ? 'stop' : 'mic'} size="1.25em" />
            </button>
            <button type="submit" className="btn btn-primary ai-send" disabled={!canSend}>Send</button>
          </form>
          <p className="sub ai-hint" aria-live="polite">{listening ? 'Listening — your words come up in the box. Put anything right, then Send.'
            : waitingCard ? `Faultline is waiting for your answer on the card above — Do it or Not now.${talkOn ? ' Or say “yes, do it” or “not now”.' : ''}`
            : asking ? 'Faultline is working on it…'
            : talkOn ? `Conversation is on: after each reply is spoken the microphone opens again.${button === 'ready' ? ' Press your headset’s button to talk, again to send.' : ''} ${FLOOR_LIMIT}`
            : 'Nothing is changed until you tap Do it on a card.'}</p>
        </div>
      </section>
      <aside className="ai-ctx" aria-label="What this conversation is on">{panel}</aside>
      <Sheet open={ctxSheet} onClose={() => setCtxSheet(false)} title="What this is on">{panel}</Sheet>
      {prefsSheet && <PreferencesSheet open={prefsSheet} onClose={() => setPrefsSheet(false)} />}
      <FactoryDocSheet picked={docPicked} onClose={() => setDocPicked(null)} read={readDoc} />
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
function Words({ text }: { text: string }) {
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
  const bold = (t: string) => t.split(/(\*\*[^*]+\*\*)/g).map((x, i) => (x.startsWith('**') && x.endsWith('**') && x.length > 4 ? <b key={i}>{x.slice(2, -2)}</b> : x));
  return (
    <div className="ai-words">
      {parts.filter(p => !('para' in p) || p.para).map((p, i) => ('list' in p
        ? (p.ordered ? <ol key={i}>{p.list.map((x, j) => <li key={j}>{bold(x)}</li>)}</ol> : <ul key={i}>{p.list.map((x, j) => <li key={j}>{bold(x)}</li>)}</ul>)
        : <p key={i}>{bold(p.para)}</p>))}
    </div>
  );
}

function PersonTurn({ t, label }: { t: ColleagueTurn; label?: string }) {
  const url = useBlobUrl(t.media?.blobKey);
  const w = (t.text ?? t.heard ?? '').trim();
  return (
    <li className={'ai-turn is-person' + (t.struck ? ' is-struck' : '')} data-turn={t.id} data-kind={t.kind}>
      <span className="ai-meta">{t.who ?? 'You'} · {hhmm(t.at)}{t.kind === 'said' ? ' · said' : ''}{label ? <> · <b>{label}</b></> : null}</span>
      <div className="ai-bubble">
        {t.kind === 'photo' && (url ? <img className="ai-photo" src={url} alt={t.text || `Photo ${label ?? ''}`} /> : <span className="sub">The photo is on another device.</span>)}
        {w && <p>{w}</p>}
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

function RefChips({ refs, label = 'Records' }: { refs: readonly CapRef[]; label?: string }) {
  if (!refs.length) return null;
  return (
    <span className="ai-refs" role="group" aria-label={label}>
      {uniqueRefs(refs).slice(0, 8).map(r => (
        <button key={`${r.kind}:${r.id}`} type="button" className="ai-ref" data-ref={`${r.kind}:${r.id}`} onClick={() => nav(r.href)} title={`Open ${r.label} in Manual Mode`}>
          <span className="ai-ref-k">{r.kind === 'page' ? 'Page' : r.kind[0].toUpperCase() + r.kind.slice(1)}</span><span className="ai-ref-l">{r.label}</span><Icon name="chevron" size={12} />
        </button>
      ))}
    </span>
  );
}

/** A step's mark: done ticked, failed or dropped a warning, the rest a look. */
const stepIcon = (st: Used['status']): IconName => (st === 'done' ? 'check' : st === 'failed' || st === 'dropped' ? 'warning' : 'search');

function ReplyTurn({ t, here, words, live, hands, onCard, onSuggest, onAgain }: {
  t: ColleagueTurn; here: boolean; words: string; live: ReadonlyMap<string, unknown>; hands: boolean; onCard: (callId: string, yes: boolean) => void; onSuggest: (x: string) => void; onAgain: () => void;
}) {
  const used = t.used ?? [];
  const steps = used.filter(u => u.kind !== 'write');
  const cards = used.filter(u => u.kind === 'write');
  return (
    <li className={'ai-turn is-colleague' + (t.struck ? ' is-struck' : '')} data-turn={t.id} data-kind="reply">
      <span className="ai-avatar" aria-hidden><Icon name="spark" size={15} /></span>
      <div className="ai-turn-b">
        <span className="ai-meta">{WHO} · {hhmm(t.at)}</span>
        {t.answering === 'waiting' && here && (words ? <Words text={words} /> : <p className="sub ai-thinking"><span className="ai-dots" aria-hidden><i /><i /><i /></span>Working on it…</p>)}
        {t.answering === 'waiting' && !here && <p className="sub ai-line">{t.why ?? 'Not answered yet.'} <button type="button" className="linkish" onClick={onAgain}>Ask again</button></p>}
        {t.answering === 'failed' && <p className="sub ai-line is-off" data-ai-failed>{t.why ?? 'Faultline could not answer.'} <button type="button" className="linkish" onClick={onAgain}>Ask again</button></p>}
        {!t.answering && t.text && <Words text={t.text} />}
        {steps.length > 0 && (
          <ul className="ai-steps" aria-label="What it looked at">
            {steps.map(u => (
              <li key={u.callId} className={'ai-step is-' + u.status} data-step={u.name}>
                <Icon name={stepIcon(u.status)} size={14} />
                <span className="ai-step-w"><b>{u.title}</b> — {u.says}</span>
                <RefChips refs={u.refs} />
              </li>
            ))}
          </ul>
        )}
        {cards.map(u => <WriteCard key={u.callId} u={u} live={live.has(u.callId)} hands={hands} onCard={onCard} />)}
        {!t.answering && !!t.unsure?.length && (
          <p className="ai-unsure" data-ai-unsure>{t.unsure.map(x => <span key={x} className="ai-check">Check this: {x}</span>)}<span className="sub"> — not in what Faultline holds or what you said.</span></p>
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
      <p className="ai-card-k">{u.status === 'waiting' ? 'Faultline asks to' : u.status === 'done' ? 'Done' : u.status === 'declined' ? 'Not done' : 'Could not be done'}</p>
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

function ContextPanel({ cur, parked, sources, nameOf, onBack, drafts, make, act, canMakeFactory, onSay }: {
  cur?: Thread; parked: Thread[]; sources: CapRef[]; nameOf: (k: 'line' | 'project' | 'problem' | 'story', id: string) => string | undefined; onBack: (t: Thread) => void;
  drafts: ColleagueDraft[]; make: MakeFlow; act: (draftId: string, items: FactoryOp[]) => Promise<CapResult>; canMakeFactory: boolean; onSay: (words: string) => void;
}) {
  const place = (s: ThreadScope, refs: readonly CapRef[]): CapRef[] => [
    ...(s.lineId ? [{ kind: 'line' as const, id: s.lineId, label: nameOf('line', s.lineId) ?? refs.find(r => r.kind === 'line' && r.id === s.lineId)?.label ?? 'The line', href: `/lines/${encodeURIComponent(s.lineId)}` }] : []),
    ...(s.projectId ? [{ kind: 'project' as const, id: s.projectId, label: nameOf('project', s.projectId) ?? refs.find(r => r.kind === 'project' && r.id === s.projectId)?.label ?? 'The project', href: `/project/${encodeURIComponent(s.projectId)}` }] : []),
    ...(s.problemId ? [{ kind: 'problem' as const, id: s.problemId, label: refs.find(r => r.kind === 'problem' && r.id === s.problemId)?.label ?? 'The problem', href: refs.find(r => r.kind === 'problem' && r.id === s.problemId)?.href ?? `/snags?open=${encodeURIComponent(s.problemId)}` }] : []),
    ...(s.storyId ? [{ kind: 'story' as const, id: s.storyId, label: 'The Story', href: '/' }] : []),
  ];
  return (
    <div className="ai-ctx-in">
      <section className="ai-ctx-s" aria-label="Now on" data-ctx-current>
        <p className="ai-ctx-h">Now on</p>
        {cur ? (
          <>
            <p className="ai-ctx-t">{cur.title}</p>
            <RefChips refs={place(cur.scope, cur.refs)} label="Where it is" />
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
      {drafts.length > 0 && (
        <section className="ai-ctx-s" aria-label="Being built" data-ctx-built>
          <p className="ai-ctx-h">Being built · {drafts.length}</p>
          {[...drafts].sort((a, b) => b.at - a.at).map(d => (d.kind === 'factory'
            ? <FactoryDraftBox key={d.id} d={d} make={make} act={items => act(d.id, items)} canMake={canMakeFactory} />
            : <DraftBox key={d.id} d={d} make={make} onSay={onSay} />))}
        </section>
      )}
      <section className="ai-ctx-s" aria-label="Parked" data-ctx-parked>
        <p className="ai-ctx-h">Parked{parked.length ? ` · ${parked.length}` : ''}</p>
        {parked.length ? (
          <ul className="ai-parked">
            {parked.map(t => (
              <li key={t.id} data-parked={t.title}>
                <span><b>{t.title}</b>{t.notes.length ? <span className="sub"> · {t.notes.length} note{t.notes.length === 1 ? '' : 's'}</span> : null}</span>
                <button type="button" className="btn btn-sm" onClick={() => onBack(t)}>Back to this</button>
              </li>
            ))}
          </ul>
        ) : <p className="sub ai-ctx-none">Nothing parked. Change the subject and the last one waits here.</p>}
      </section>
      <section className="ai-ctx-s" aria-label="Sources" data-ctx-sources>
        <p className="ai-ctx-h">Sources{sources.length ? ` · ${sources.length}` : ''}</p>
        {sources.length ? <RefChips refs={sources} label="Every record read or changed" /> : <p className="sub ai-ctx-none">Every record Faultline reads or changes in this conversation is listed here.</p>}
      </section>
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
          <p className="ai-card-k">Faultline asks to</p>
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
