/* LINE TALK, ON THE PHONE — talk or type on the line, as in a chat
 * (docs/LINE-TALK.md).
 *
 * Rowland, 20 October: "Consultant in a line speaking into his phone, the AI
 * listening to everything, allows pause, continue speaking, it remembers
 * everything like Claude chat." And 21 October, of the recorder it was then:
 * "I expected how I am doing it right now with you. I see my words come up on
 * the interface. I simply press send … a version of ChatGPT or a version of
 * Claude." So a talk is a conversation about one line, and its box is a
 * chat's:
 *   the microphone   tap it and talk — the phone writes the words into the
 *                    box as they are said (lib/hearing Ear: the browser's own
 *                    speech recognition, British English, no key and no
 *                    server); tap it again to stop. The words are read and
 *                    put right in the box, then sent. Where the browser will
 *                    not listen, the keyboard's own microphone key writes
 *                    into the box the same way, and it says so;
 *   Send             the words go into the talk — as said, when the phone
 *                    wrote them — and Line Talk answers; with nothing in the
 *                    box, it answers what was added since its last answer;
 *   Photo            taken or chosen from the phone, kept the moment it is
 *                    picked, labelled P1, P2 … so a question or a document
 *                    can name it.
 * What is in the box is kept on the phone until it is sent (a reload, the
 * phone closing the page). Nothing is recorded: a talk from before 21 October
 * keeps its recordings, played where they were said.
 *
 * Line Talk answers through the app's gateway (supabase/functions/assist,
 * task `talk`; lib/talkAsk) with the conversation, the newest photos and what
 * Faultline holds about the line and the job (screens/useTalkContext) — and a
 * document when one is asked for, opened, edited and printed here
 * (screens/TalkDocView, lib/talkDocPdf). Its answer is a turn of the talk: the
 * question is kept before it is sent, an answer not given says why and is
 * asked again, and no signal waits for the signal. It writes no record.
 *
 * WHICH RECORD: a study of tool `talk` (lib/study, lib/talk) — on a line, or
 * a job's. WHERE IT SHOWS: Line Talk in Tools (#/talk, ?line= on one line),
 * a line's page among its tools, the talk itself (#/talk/:id). */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getStudy, listAllStudies, onDataChange, patchStudy, putBlob, putStudy } from '../db';
import { useAccess } from '../cloud/access';
import { useSession } from '../cloud/session';
import { displayName } from '../cloud/team';
import { can as canAt } from '../lib/access';
import { now, uid } from '../lib/ids';
import { todayISO, niceDay } from '../lib/weeks';
import { nav, useRoute } from '../state/useRoute';
import { Ear, NOTHING_HEARD, joinWords, notHeardWhy, recognitionOf, troubleSaid, type Trouble } from '../lib/hearing';
import { useFactoryLines } from '../lib/useFactoryLines';
import { useBlobUrl } from '../lib/useBlobUrl';
import { askTurnsOf, isTheirs, notWritten, pendingReply, photoLabels, photosToSend, talkName, talkSaid, turnsOf, unanswered, wordsOf, type TalkTurn } from '../lib/talk';
import { DOC_KIND_WORD, TALK_LIMITS, type TalkAskImage } from '../lib/talkAssist';
import { NO_SIGNAL, askTalk, type SoFar } from '../lib/talkAsk';
import { pictureForAssistant } from '../lib/talkPictures';
import { useTalkContext } from './useTalkContext';
import { TalkDocView } from './TalkDocView';
import type { ToolStudy } from '../lib/study';
import { StudyName } from '../ui/StudyActs';
import { offerUndo } from '../ui/Undo';
import { Icon } from '../ui/Icon';

const OWNER = canAt('owner');
const hhmm = (ms: number) => new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
/* WHAT IS IN THE BOX, kept on the phone until it is sent — and whether the phone wrote any of it */
interface Draft { text: string; said: boolean }
const draftKey = (id: string) => `fl-talk-draft-${id}`;
const readDraft = (id: string): Draft => {
  try {
    const d = JSON.parse(localStorage.getItem(draftKey(id)) ?? 'null') as Partial<Draft> | null;
    return typeof d?.text === 'string' ? { text: d.text, said: !!d.said } : { text: '', said: false };
  } catch { return { text: '', said: false }; }
};
const keepDraft = (id: string, d: Draft): void => {
  try { if (d.text.trim()) localStorage.setItem(draftKey(id), JSON.stringify(d)); else localStorage.removeItem(draftKey(id)); } catch { /* the box still holds it */ }
};
type WakeLock = { release: () => Promise<void> };
/* how long listening may hear nothing before the way round it is said */
const QUIET_MS = 6000;
const askWake = async (): Promise<WakeLock | null> => {
  try { return await (navigator as unknown as { wakeLock?: { request: (k: 'screen') => Promise<WakeLock> } }).wakeLock?.request('screen') ?? null; } catch { return null; }
};
/* today as the assistant is told it — "Wednesday 21 October 2026" */
const longDay = () => new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

/* SHORTCUTS TO TYPING (docs/LINE-TALK.md: "a few chips … only shortcuts to
   typing") — the words land in the box to be changed before they are sent */
const ASKS: { label: string; text: string }[] = [
  { label: 'Line-walk report', text: 'Write a line-walk report from this talk, with the photos beside what they show.' },
  { label: 'Summary for my manager', text: 'Write a one-page summary of this talk for my manager.' },
  { label: 'Punch list for the OEM', text: 'Make a punch list for the OEM from what I said — owners and dates only where I said them.' },
  { label: 'Engineering report', text: 'Write an engineering report on the main issue from my notes and the photos.' },
];

/* -------------------------------------------------------------- every talk */

export function TalksScreen() {
  const route = useRoute();
  const lineId = route.query.get('line') ?? '';
  const lines = useFactoryLines();
  const line = lines.find(l => l.id === lineId);
  const [talks, setTalks] = useState<ToolStudy[] | null>(null);
  const [pick, setPick] = useState(lineId);
  const { session } = useSession();
  const load = useCallback(async () => setTalks((await listAllStudies()).filter(s => s.tool === 'talk' && (!lineId || s.workspaceId === lineId)).sort((a, b) => b.updatedAt - a.updatedAt)), [lineId]);
  useEffect(() => { void load(); return onDataChange(() => void load()); }, [load]);

  const start = async (wsId: string) => {
    const name = lines.find(l => l.id === wsId)?.name;
    const t = now();
    const s: ToolStudy = {
      id: uid(), tool: 'talk', name: talkName(name, todayISO()), ...(wsId ? { workspaceId: wsId } : {}),
      ...(session?.user.id ? { ownerId: session.user.id } : {}),
      facts: { turns: [] }, uses: [], startedAt: t, createdAt: t, updatedAt: t,
    };
    await putStudy(s);
    nav(`/talk/${s.id}`);
  };

  return (
    <div className="wrap ie tk">
      <header className="pace-head">
        <div className="pace-head-main">
          <p className="pl-eyebrow">LINE TALK{line ? <> · <a href={`#/lines/${encodeURIComponent(line.id)}`} className="pl-fac">{line.name} ›</a></> : null}</p>
          <h1>Line Talk</h1>
          <p className="pl-says">Talk or type on the line, add photos, ask questions and ask for reports — Line Talk answers from what you said and what Faultline holds about the line. Tap the microphone and your words come up in the box as you speak; Send, and Line Talk answers. Everything is kept, and a talk can be opened and carried on any day.</p>
        </div>
      </header>
      <section className="tk-new" aria-label="Start a Line Talk">
        {line ? (
          <button type="button" className="btn btn-primary tk-start" onClick={() => void start(line.id)}><Icon name="mic" size="1.1em" />Start a Line Talk on {line.name}</button>
        ) : (
          <form className="tk-new-f" onSubmit={e => { e.preventDefault(); void start(pick); }}>
            <label className="field"><span className="field-label">Which line</span>
              <select className="text-input" value={pick} onChange={e => setPick(e.target.value)} aria-label="Which line">
                <option value="">Not on a line</option>
                {lines.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </label>
            <button type="submit" className="btn btn-primary tk-start"><Icon name="mic" size="1.1em" />Start a Line Talk</button>
          </form>
        )}
      </section>
      <section aria-label="Every Line Talk">
        <h2 className="ln-h">{line ? `Line Talks on ${line.name}` : 'Every Line Talk'}</h2>
        {talks === null ? <p className="sub">Reading…</p> : talks.length === 0 ? <p className="sub">None yet.</p> : (
          <ul className="lt-rows">
            {talks.map(s => {
              const turns = turnsOf(s.facts);
              const last = turns[turns.length - 1];
              return (
                <li key={s.id} className="lt-li" data-talk={s.id}>
                  <button type="button" className="lt-row" onClick={() => nav(`/talk/${s.id}`)}>
                    <b className="lt-what">{s.name}</b>
                    <span className="lt-says">{talkSaid(turns)}</span>
                    <span className="lt-where">{lines.find(l => l.id === s.workspaceId)?.name ?? 'Not on a line'} · {last ? `last ${niceDay(todayISO(new Date(last.at)))} ${hhmm(last.at)}` : `started ${niceDay(todayISO(new Date(s.startedAt)))}`}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

/* ---------------------------------------------------------------- one talk */

export function TalkScreen({ id }: { id: string }) {
  const [s, setS] = useState<ToolStudy | null | undefined>(undefined);
  const load = useCallback(async () => setS((await getStudy(id)) ?? null), [id]);
  useEffect(() => { void load(); return onDataChange(() => void load()); }, [load]);
  const jobCan = useAccess(s?.projectId ?? '');
  const can = s?.projectId ? jobCan : OWNER;
  if (s === undefined) return <div className="wrap ie"><p className="sub">Opening…</p></div>;
  if (s === null) return (
    <div className="wrap ie">
      <h1>This Line Talk isn’t on this device</h1>
      <p className="sub">It may have been deleted, or not synced here yet.</p>
      <button type="button" className="btn" onClick={() => nav('/talk')}>Every Line Talk</button>
    </div>
  );
  /* a talk of its own each time — its box and what is in it are that talk's */
  return <Talk key={s.id} s={s} can={can} />;
}

function Talk({ s, can }: { s: ToolStudy; can: ReturnType<typeof canAt> }) {
  const { session } = useSession();
  const me = displayName(session?.user.email) || undefined;
  const lines = useFactoryLines();
  const line = lines.find(l => l.id === s.workspaceId);
  const turns = useMemo(() => turnsOf(s.facts), [s.facts]);
  const [said, setSaid] = useState<{ text: string; bad?: boolean } | null>(null);
  /* Line Talk's answer as it is written — shown in its turn until the finished answer is kept */
  const [writing, setWriting] = useState<(SoFar & { id: string }) | null>(null);
  const [typing, setTyping] = useState(() => readDraft(s.id).text);
  const [fixing, setFixing] = useState<{ id: string; text: string } | null>(null);
  const live = can.edit;
  const docId = useRoute().query.get('doc');
  /* WHAT IT KNOWS — Faultline's records about the line and the job, read as their own pages read them */
  const context = useTalkContext(s);
  const contextRef = useRef(context);
  contextRef.current = context;
  const labels = useMemo(() => photoLabels(turns), [turns]);
  const theirs = useMemo(() => unanswered(turns), [turns]);
  const turnsRef = useRef(turns);
  turnsRef.current = turns;

  /* ---- writing a turn: read, change and write in one go (db patchStudy) ---- */
  const addTurn = (t: TalkTurn) => patchStudy(s.id, cur => ({ facts: { ...cur.facts, turns: [...(cur.facts.turns ?? []), t] } }));
  const patchTurn = (turnId: string, patch: Partial<TalkTurn>, drop: (keyof TalkTurn)[] = []) => patchStudy(s.id, cur => ({
    facts: {
      ...cur.facts,
      turns: (cur.facts.turns ?? []).map(t => {
        if (t.id !== turnId) return t;
        const next: TalkTurn = { ...t, ...patch };
        for (const k of drop) delete next[k];
        return next;
      }),
    },
  }));

  /* ---- THE BOX: typed into, or talked into — the phone writes the words in as they are said (lib/hearing) ---- */
  const box = useRef<HTMLTextAreaElement>(null);
  const typingRef = useRef(typing);
  /* some of what is in the box was said, not typed — it goes into the talk as said */
  const spoken = useRef(readDraft(s.id).said);
  const setBox = (text: string) => {
    typingRef.current = text;
    if (!text.trim()) spoken.current = false;
    setTyping(text);
    keepDraft(s.id, { text, said: spoken.current });
  };
  const ear = useRef<Ear | null>(null);
  const wake = useRef<WakeLock | null>(null);
  const [listening, setListening] = useState(false);
  /* the box as it stood when listening began — what is heard goes after it */
  const base = useRef('');
  /* the last words being written as listening stops — Send waits for them */
  const finishing = useRef<Promise<string> | null>(null);
  const edits = useRef(0);
  const letWake = () => { void wake.current?.release().catch(() => undefined); wake.current = null; };
  /* listening and nothing heard after a while: a phone whose browser will not hear says nothing at all — so it is said, with the way round it */
  const quiet = useRef<number | null>(null);
  const quietSaid = useRef(false);
  const stopQuiet = () => { if (quiet.current !== null) { window.clearTimeout(quiet.current); quiet.current = null; } };

  const stopListening = (): Promise<string> => {
    if (finishing.current) return finishing.current;
    const e = ear.current;
    if (!e) return Promise.resolve(typingRef.current);
    ear.current = null;
    setListening(false);
    letWake();
    stopQuiet();
    const at = edits.current;
    const p = e.stop().then(c => {
      /* typed over while the phone finished: the box as typed wins */
      if (edits.current !== at) return typingRef.current;
      const text = joinWords(base.current, c.words);
      setBox(text);
      return text;
    });
    finishing.current = p;
    void p.finally(() => { if (finishing.current === p) finishing.current = null; });
    return p;
  };
  const stopRef = useRef(stopListening);
  stopRef.current = stopListening;

  /* what gets in the way, said as it happens with the way round it: listening stops, what was said stays in the box */
  const onTrouble = useRef<(t: Trouble, e: Ear) => void>(() => undefined);
  onTrouble.current = (t, e) => {
    if (ear.current !== e) return;
    void stopListening();
    setSaid({ text: troubleSaid(t), bad: t !== 'network' });
  };

  const startListening = () => {
    setSaid(null);
    const Rec = recognitionOf(window);
    /* a browser that does not listen: the keyboard's own microphone writes into the box — the box opened for it */
    if (!Rec) { setSaid({ text: troubleSaid('unsupported') }); box.current?.focus(); return; }
    base.current = typingRef.current.trim();
    const e: Ear = new Ear(Rec, {
      onWords: h => {
        if (ear.current !== e) return;
        stopQuiet();
        if (quietSaid.current) { quietSaid.current = false; setSaid(null); }
        spoken.current = true;
        setBox(joinWords(base.current, h.final, h.interim));
      },
      onTrouble: t => onTrouble.current(t, e),
    }, 'en-GB', /Android/i.test(navigator.userAgent), () => document.visibilityState === 'hidden');
    ear.current = e;
    setListening(true);
    /* started in the tap itself — a phone listens only when asked by a touch */
    e.start();
    stopQuiet();
    quietSaid.current = false;
    quiet.current = window.setTimeout(() => { quiet.current = null; if (ear.current === e) { quietSaid.current = true; setSaid({ text: NOTHING_HEARD }); } }, QUIET_MS);
    void askWake().then(w => { if (ear.current === e) wake.current = w; else void w?.release().catch(() => undefined); });
  };

  /* out of sight the phone stops listening: what was said is in the box, and it says so */
  useEffect(() => {
    const seen = () => {
      if (document.visibilityState !== 'hidden' || !ear.current) return;
      void stopRef.current();
      setSaid({ text: 'Listening stopped when Faultline went out of sight — what you said is in the box. Tap the microphone to carry on.' });
    };
    document.addEventListener('visibilitychange', seen);
    return () => document.removeEventListener('visibilitychange', seen);
  }, []);
  useEffect(() => () => { ear.current?.abort(); ear.current = null; void wake.current?.release().catch(() => undefined); if (quiet.current !== null) window.clearTimeout(quiet.current); }, []);
  /* the newest words in sight as they come */
  useEffect(() => { if (listening && box.current) box.current.scrollTop = box.current.scrollHeight; }, [listening, typing]);
  /* the newest turn in sight above the box, as a chat keeps it — on opening, on a turn added, on an answer come */
  const lastTurn = turns[turns.length - 1];
  const newest = `${turns.length}:${lastTurn?.answering ?? ''}:${lastTurn?.text?.length ?? 0}:${writing?.reply.length ?? 0}`;
  useEffect(() => {
    const el = document.querySelector<HTMLElement>('.tk-turns > li:last-child');
    const top = document.querySelector('.tk-bar')?.getBoundingClientRect().top ?? window.innerHeight;
    const over = el ? el.getBoundingClientRect().bottom - top + 12 : 0;
    if (over > 0) window.scrollBy({ top: over });
  }, [newest]);

  /* ---- photos: taken there and then, or chosen from the phone — kept the moment they are picked ---- */
  const photoIn = useRef<HTMLInputElement>(null);
  const addPhotos = async (files: File[]) => {
    for (const f of files) {
      if (!f.type.startsWith('image/')) continue;
      const at = Date.now(), blobKey = `talk-${uid()}`;
      await putBlob(blobKey, f);
      await addTurn({ id: uid(), at, ...(me ? { who: me } : {}), kind: 'photo', media: { blobKey, mime: f.type || 'image/jpeg', capturedAt: at } });
    }
  };

  /* ---- ASKING LINE TALK — the question kept before it is sent; the answer a turn of its own ---- */
  const [asking, setAsking] = useState<string | null>(null);
  const askingRef = useRef(false);
  const ask = useCallback((): Promise<void> => {
    if (askingRef.current) return Promise.resolve();
    askingRef.current = true;
    /* one question at a time from this phone; the flag let go however it ends */
    return (async () => {
      const was = pendingReply(turnsOf((await getStudy(s.id))?.facts ?? {}));
      if (!was && !unanswered(turnsOf((await getStudy(s.id))?.facts ?? {})).length) return;
      /* the answer goes after everything said so far: one not given yet is asked again in its place */
      const replyId = was?.id ?? uid(), at = Date.now();
      if (was) await patchTurn(replyId, { answering: 'waiting', at }, ['why']);
      else await addTurn({ id: replyId, at, who: 'Line Talk', kind: 'reply', answering: 'waiting' });
      setAsking(replyId);
      try { await answer(replyId, at); } catch (e) {
        console.warn('Line Talk could not ask', e);
        await patchTurn(replyId, { answering: 'failed', why: 'Line Talk could not answer just now — ask again. What you said is kept.' });
      }
    })().finally(() => { askingRef.current = false; setAsking(null); setWriting(null); });
  }, [s.id]); // eslint-disable-line react-hooks/exhaustive-deps
  /* the answer to everything said before `at`, filled into its turn */
  const answer = async (replyId: string, at: number) => {
    const cur = turnsOf((await getStudy(s.id))?.facts ?? {});
    const asked = cur.filter(t => t.id !== replyId && t.at <= at);
    const named = photoLabels(cur);
    const images: TalkAskImage[] = [];
    for (const t of photosToSend(asked, TALK_LIMITS.images)) {
      const photo = named.get(t.id);
      const data = t.media ? await pictureForAssistant(t.media.blobKey, TALK_LIMITS.imageBytes) : undefined;
      if (photo && data) images.push({ photo, data });
    }
    const r = await askTalk({ task: 'talk', context: contextRef.current?.text ?? '', today: longDay(), turns: askTurnsOf(asked), images },
      p => setWriting({ id: replyId, ...p }));
    if (r.ok) {
      const d = r.answer.document;
      await patchTurn(replyId, {
        text: r.answer.reply || (d ? `Here is the ${DOC_KIND_WORD[d.kind].toLowerCase()}.` : ''),
        ...(d ? { doc: d } : {}), ...(r.unsure.length ? { unsure: r.unsure } : {}), ...(r.model ? { model: r.model } : {}),
      }, ['answering', 'why', 'docFirst', ...(d ? [] : ['doc' as const]), ...(r.unsure.length ? [] : ['unsure' as const])]);
    } else {
      /* nothing said is lost: the question stays, the answer says why it is not here, and is asked again */
      await patchTurn(replyId, r.offline ? { answering: 'waiting', why: r.why } : { answering: 'failed', why: r.why });
    }
  };
  /* asked with no signal: answered when the signal comes back */
  useEffect(() => {
    if (!live) return;
    const back = () => { if (pendingReply(turnsRef.current)?.why === NO_SIGNAL) void ask(); };
    window.addEventListener('online', back);
    return () => window.removeEventListener('online', back);
  }, [live, ask]);

  /* SEND: the box into the talk — as said where the phone wrote any of it — and Line Talk answers */
  const sending = useRef(false);
  const send = (): Promise<void> => {
    if (sending.current) return Promise.resolve();
    sending.current = true;
    /* one Send at a time; the flag let go however it ends */
    return (async () => {
      const text = (ear.current || finishing.current ? await stopListening() : typingRef.current).trim();
      if (text) {
        await addTurn({ id: uid(), at: Date.now(), ...(me ? { who: me } : {}), ...(spoken.current ? { kind: 'said' as const, heard: text } : { kind: 'typed' as const, text }) });
        setBox('');
        setSaid(null);
      }
      await ask();
    })().finally(() => { sending.current = false; });
  };
  const strike = async (t: TalkTurn, struck: boolean) => {
    await patchTurn(t.id, struck ? { struck: true } : {}, struck ? [] : ['struck']);
    offerUndo(struck ? 'Struck — kept, and left out of the talk' : 'Brought back', async () => { await patchTurn(t.id, struck ? {} : { struck: true }, struck ? ['struck'] : []); });
  };

  const docTurn = docId ? turns.find(t => t.id === docId && t.kind === 'reply' && t.doc) : undefined;
  const photosByLabel = useMemo(() => new Map(turns.filter(t => t.kind === 'photo').map(t => [labels.get(t.id) ?? '', t])), [turns, labels]);
  if (docTurn?.doc) {
    return <TalkDocView s={s} t={docTurn} doc={docTurn.doc} can={can} lineName={line?.name} me={me} photos={photosByLabel}
      onSave={(doc, first) => patchTurn(docTurn.id, { doc, ...(first && !docTurn.docFirst ? { docFirst: first } : {}) })}
      onBack={() => nav(`/talk/${s.id}`)} />;
  }
  const canSend = live && !asking && (!!typing.trim() || theirs.length > 0);
  return (
    <div className="wrap ie tk" data-talk={s.id}>
      <header className="pace-head">
        <div className="pace-head-main">
          <p className="pl-eyebrow">LINE TALK · {line ? <a href={`#/lines/${encodeURIComponent(line.id)}`} className="pl-fac">{line.name} ›</a> : 'not on a line'} · <a href={`#/talk${s.workspaceId ? `?line=${encodeURIComponent(s.workspaceId)}` : ''}`} className="pl-fac">Every Line Talk ›</a></p>
          <StudyName s={s} canEdit={can.edit} canRemove={can.remove} />
          <p className="pl-says tk-sum">{talkSaid(turns)}</p>
          {/* a talk on no line answers from the conversation alone — put on a line, it knows the line */}
          {!s.workspaceId && live && lines.length > 0 && (
            <label className="field tk-online"><span className="field-label">Put it on a line, so Line Talk knows the line</span>
              <select className="text-input" value="" aria-label="Put it on a line" onChange={e => { const v = e.target.value; if (v) void patchStudy(s.id, { workspaceId: v }); }}>
                <option value="">Choose a line…</option>
                {lines.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </label>
          )}
          {context && (
            <details className="tk-knows">
              <summary>What Line Talk knows — {context.said}</summary>
              <p className="sub">Faultline’s records, as their own pages say them, go with every question. Line Talk is told to keep what you said, what these records show and its own reading apart, to use no figure it was not given, and to work nothing out.</p>
              {context.text ? <pre className="tk-knows-t">{context.text}</pre> : null}
            </details>
          )}
        </div>
      </header>

      <ol className="tk-turns" aria-label="The talk">
        {turns.length === 0 && <li className="tk-empty sub">Nothing said yet. Tap the microphone and say what you see — your words come up in the box, then Send. Or type a question; add a photo whenever it helps, and ask for a report when you are done.</li>}
        {turns.map(t => t.kind === 'reply' ? (
          <ReplyRow key={t.id} t={t} live={live} answeringHere={asking === t.id} writing={writing?.id === t.id ? writing : undefined}
            onAskAgain={() => void ask()} onOpen={() => nav(`/talk/${s.id}?doc=${encodeURIComponent(t.id)}`)}
            onStrike={struck => void strike(t, struck)} />
        ) : (
          <TurnRow key={t.id} t={t} live={live} label={labels.get(t.id)}
            fixing={fixing?.id === t.id ? fixing.text : undefined}
            onFix={text => setFixing(text === undefined ? null : { id: t.id, text })}
            onSaveFix={async text => {
              const was = t.text;
              await patchTurn(t.id, text.trim() && text.trim() !== t.heard ? { text: text.trim() } : {}, text.trim() && text.trim() !== t.heard ? [] : ['text']);
              setFixing(null);
              offerUndo('Corrected — what was heard is kept beside it', async () => { await patchTurn(t.id, was ? { text: was } : {}, was ? [] : ['text']); });
            }}
            onStrike={struck => void strike(t, struck)} />
        ))}
      </ol>

      {live && (
        <div className={'tk-bar' + (listening ? ' is-on' : '')} role="group" aria-label="Talk or type">
          {said && <p className={'sub tk-said' + (said.bad ? ' is-r' : '')} role="status">{said.text}</p>}
          {!listening && !typing.trim() && turns.some(isTheirs) && (
            <div className="tk-chips" role="group" aria-label="Ask for a document">
              {ASKS.map(a => <button key={a.label} type="button" className="chip tk-chip" onClick={() => { setBox(a.text); box.current?.focus(); }}>{a.label}</button>)}
            </div>
          )}
          <form className="tk-type" onSubmit={e => { e.preventDefault(); if (canSend) void send(); }}>
            <button type="button" className="btn tk-photo" aria-label="Add a photo" title="Add a photo" onClick={() => photoIn.current?.click()}><Icon name="camera" size="1.2em" /></button>
            {/* no `capture`: the phone offers its camera and its photos alike */}
            <input ref={photoIn} type="file" accept="image/*" multiple hidden aria-label="Choose photos" onChange={e => { void addPhotos([...(e.target.files ?? [])]); e.target.value = ''; }} />
            <textarea ref={box} className="text-input tk-box" rows={typing.length > 160 ? 5 : typing.length > 60 || typing.includes('\n') ? 3 : 1} value={typing} maxLength={4000}
              placeholder={listening ? 'Listening — talk…' : 'Talk or type…'} aria-label="Talk or type into the talk"
              onChange={e => {
                /* typed into while listening: the listening stops, the box as typed */
                edits.current++;
                const er = ear.current;
                if (er) { ear.current = null; er.abort(); setListening(false); letWake(); stopQuiet(); }
                setBox(e.target.value);
              }}
              onKeyDown={e => {
                /* Enter sends at a desk; on a phone it is a new line, as the phone's own keyboard says */
                if (e.key === 'Enter' && !e.shiftKey && window.matchMedia?.('(pointer: fine)').matches) { e.preventDefault(); if (canSend) void send(); }
              }} />
            <button type="button" className={'btn tk-mic' + (listening ? ' is-on' : '')} aria-pressed={listening}
              aria-label={listening ? 'Stop listening' : 'Talk into the box'} title={listening ? 'Stop listening' : 'Talk into the box'}
              onClick={() => { if (listening) void stopListening(); else startListening(); }}>
              <Icon name={listening ? 'stop' : 'mic'} size="1.3em" />
            </button>
            <button type="submit" className="btn btn-primary tk-send" disabled={!canSend}>Send</button>
          </form>
          {/* what got in the way says what to do — said once, not twice */}
          {(listening || !said) && <p className="sub tk-hint" aria-live="polite">{listening ? 'Listening — your words come up in the box as you talk. Put anything right, then Send.'
            : asking ? 'Line Talk is answering — what you say and photograph meanwhile is kept for the next answer.'
            : typing.trim() ? 'Send, and Line Talk answers.'
            : theirs.length ? 'Send asks Line Talk about what you have added since its last answer.'
            : 'Tap the microphone and talk, or type — add a photo whenever it helps.'}</p>}
        </div>
      )}
    </div>
  );
}

/* AN ANSWER'S WORDS, AS WRITTEN — paragraphs, and lists of lines starting "- ";
   **bold** where it is used. Drawn by React, never as HTML. */
function Said({ text }: { text: string }) {
  const parts: ({ list: string[] } | { para: string })[] = [];
  for (const line of text.split('\n')) {
    const item = /^\s*(?:[-•*]|\d+[.)])\s+(.*)$/.exec(line);
    const last = parts[parts.length - 1];
    if (item) { if (last && 'list' in last) last.list.push(item[1]); else parts.push({ list: [item[1]] }); }
    else if (line.trim()) { if (last && 'para' in last) last.para += `\n${line}`; else parts.push({ para: line }); }
    else parts.push({ para: '' });
  }
  const bold = (t: string) => t.split(/(\*\*[^*]+\*\*)/g).map((x, i) => (x.startsWith('**') && x.endsWith('**') && x.length > 4 ? <b key={i}>{x.slice(2, -2)}</b> : x));
  return (
    <div className="tk-ans">
      {parts.filter(p => !('para' in p) || p.para).map((p, i) => ('list' in p ? <ul key={i}>{p.list.map((x, j) => <li key={j}>{bold(x)}</li>)}</ul> : <p key={i}>{bold(p.para)}</p>))}
    </div>
  );
}

function ReplyRow({ t, live, answeringHere, writing, onAskAgain, onOpen, onStrike }: {
  t: TalkTurn; live: boolean; answeringHere: boolean; writing?: SoFar; onAskAgain: () => void; onOpen: () => void; onStrike: (struck: boolean) => void;
}) {
  const d = t.doc;
  const pics = d ? new Set(d.sections.flatMap(x => x.photos.map(p => p.photo))).size : 0;
  return (
    <li className={`tk-turn is-reply${t.struck ? ' is-struck' : ''}`} data-turn={t.id} data-kind="reply">
      <span className="tk-meta">Line Talk · {hhmm(t.at)}{t.struck ? ' · struck' : ''}</span>
      {t.answering === 'waiting' && (answeringHere
        ? writing?.reply
          /* its words as they are written, the way a chat shows them */
          ? <div className="tk-writing" aria-live="polite"><Said text={writing.reply} /></div>
          : <p className="sub tk-wait">{writing?.document ? 'Line Talk is writing the document…' : 'Line Talk is answering…'}</p>
        : <p className="sub tk-wait">{t.why ?? 'Not answered yet.'} {live && <button type="button" className="linkish" onClick={onAskAgain}>Ask again</button>}</p>)}
      {t.answering === 'failed' && <p className="sub is-r tk-fail">Not answered — {t.why ?? 'Line Talk could not answer.'} {live && <button type="button" className="linkish" onClick={onAskAgain}>Ask again</button>}</p>}
      {!t.answering && t.text && <Said text={t.text} />}
      {d && (
        <div className="tk-doc">
          <span className="tk-doc-k">{DOC_KIND_WORD[d.kind]}</span>
          <b className="tk-doc-t">{d.title}</b>
          <span className="sub">{d.sections.length} section{d.sections.length === 1 ? '' : 's'}{pics ? ` · ${pics} photo${pics === 1 ? '' : 's'}` : ''}{t.docFirst ? ' · edited' : ''}</span>
          <button type="button" className="btn btn-sm btn-primary" onClick={onOpen}>Open — edit and print</button>
        </div>
      )}
      {!t.answering && !!t.unsure?.length && (
        <p className="sub is-a tk-unsure">Check before you use it: {t.unsure.join(', ')} {t.unsure.length === 1 ? 'is' : 'are'} not in what was said or in Faultline’s records.</p>
      )}
      {live && !t.answering && <span className="tk-turn-a"><button type="button" className="linkish" onClick={() => onStrike(!t.struck)}>{t.struck ? 'Bring back' : 'Strike'}</button></span>}
    </li>
  );
}

function TurnRow({ t, live, label, fixing, onFix, onSaveFix, onStrike }: {
  t: TalkTurn; live: boolean; label?: string; fixing?: string;
  onFix: (text: string | undefined) => void; onSaveFix: (text: string) => Promise<void>; onStrike: (struck: boolean) => void;
}) {
  const url = useBlobUrl(t.media?.blobKey);
  const words = wordsOf(t);
  return (
    <li className={`tk-turn is-${t.kind}${t.struck ? ' is-struck' : ''}`} data-turn={t.id} data-kind={t.kind}>
      <span className="tk-meta">{t.who ?? 'Said'} · {hhmm(t.at)}{t.kind === 'said' && t.media?.durationS ? ` · ${clock(t.media.durationS)}` : ''}{t.kind === 'photo' && label ? <> · <b className="tk-label">{label}</b></> : null}{t.struck ? ' · struck' : ''}</span>
      {t.kind === 'photo' && (url ? <img className="tk-photo-i" src={url} alt={t.text || 'A photo taken in the talk'} /> : <span className="sub">The photo is on another device — it comes here once that device has synced.</span>)}
      {t.kind === 'said' && t.media && (url ? <audio className="tk-audio" controls preload="none" src={url} aria-label="The recording" /> : <span className="sub">The recording is on another device — it comes here once that device has synced.</span>)}
      {fixing !== undefined ? (
        <form className="tk-fix" onSubmit={e => { e.preventDefault(); void onSaveFix(fixing); }}>
          <textarea className="text-input" rows={3} value={fixing} autoFocus aria-label="What was said" onChange={e => onFix(e.target.value)} />
          <span className="tk-fix-a"><button type="submit" className="btn btn-sm btn-primary">Save</button><button type="button" className="btn btn-sm btn-ghost" onClick={() => onFix(undefined)}>Cancel</button></span>
        </form>
      ) : (
        <>
          {/* not written down: waiting on the person to type it — the recording kept to play */}
          {notWritten(t) && <p className="sub is-a tk-fail">Not written down — {t.why ?? notHeardWhy(null)}</p>}
          {words && <p className="tk-words">{words}</p>}
          {t.kind === 'said' && t.text && t.heard && <p className="sub tk-heard">As heard: {t.heard}</p>}
        </>
      )}
      {live && fixing === undefined && (
        <span className="tk-turn-a">
          {t.kind !== 'photo' && !t.struck && <button type="button" className="linkish" onClick={() => onFix(words)}>Correct</button>}
          <button type="button" className="linkish" onClick={() => onStrike(!t.struck)}>{t.struck ? 'Bring back' : 'Strike'}</button>
        </span>
      )}
    </li>
  );
}
