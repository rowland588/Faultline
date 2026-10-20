/* LINE TALK, ON THE PHONE — talk on the line, and every word is kept
 * (docs/LINE-TALK.md, slice 1: record and keep).
 *
 * Rowland, 20 October: "Consultant in a line speaking into his phone, the AI
 * listening to everything, allows pause, continue speaking, it remembers
 * everything like Claude chat." A talk is a conversation about one line:
 *   Talk      the phone writes down what is said as it is said, and records
 *             it beside the words; a long stretch is cut into pieces about a
 *             minute long, at a pause in what is said (lib/talk
 *             PIECE_SECONDS), each kept the moment it ends — the screen kept
 *             awake while it listens;
 *   Pause     ends the piece; Continue starts the next;
 *   Photo     a picture, where it was taken in the talk;
 *   Type      words, when talking will not do.
 * THE PHONE HEARS (Rowland, 20 October: "Use the phone's own speech
 * recognition instead of Gemini"): the browser's own speech recognition
 * (lib/hearing Ear), live, in British English — no key and no server. What it
 * wrote is kept as heard and corrected by the person, never over it. A piece
 * it could not write (no signal, a browser without it, refused) keeps its
 * recording and says why, and the words are typed over it with Correct — a
 * recording is never written down afterwards. A phone that will not record
 * and hear at once keeps the words and stops recording, and says so. The
 * recordings are kept for good (Rowland, 20 October).
 *
 * ASK IT (slice 2; Rowland, 20 October: "a simple, reliable, ChatGPT-style
 * manufacturing assistant … talk or type naturally, ask questions … upload
 * photographs, and ask the assistant to produce useful reports"):
 *   Send      words typed are added and Line Talk answers them;
 *   Reply     with nothing typed, it answers what was said and photographed
 *             since its last answer;
 *   a photo   taken or chosen from the phone, labelled P1, P2 … so a question
 *             or a document can name it.
 * It answers through the app's gateway (supabase/functions/assist, task
 * `talk`; lib/talkAsk) with the conversation, the newest photos and what
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
import { Ear, SILENCED_SAID, SILENT_PEAK, notHeardWhy, recognitionOf, recordingPeak, troubleSaid, type Cut, type Heard, type Trouble } from '../lib/hearing';
import { useFactoryLines } from '../lib/useFactoryLines';
import { useBlobUrl } from '../lib/useBlobUrl';
import { PIECE_SECONDS, askTurnsOf, isTheirs, notWritten, pendingReply, photoLabels, photosToSend, talkName, talkSaid, turnsOf, unanswered, wordsOf, type TalkTurn } from '../lib/talk';
import { DOC_KIND_WORD, TALK_LIMITS, type TalkAskImage } from '../lib/talkAssist';
import { NO_SIGNAL, askTalk } from '../lib/talkAsk';
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
/* this phone does not record while it writes down — learnt once, kept on the phone */
const HEAR_ONLY = 'fl-talk-hear-only';
const hearOnly = (): boolean => { try { return localStorage.getItem(HEAR_ONLY) === '1'; } catch { return false; } };
const recordNoMore = (): void => { try { localStorage.setItem(HEAR_ONLY, '1'); } catch { /* the words are kept either way */ } };
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
          <p className="pl-says">Talk or type on the line, add photos, ask questions and ask for reports — Line Talk answers from what you said and what Faultline holds about the line. Every word is kept with its recording, and a talk can be opened and carried on any day.</p>
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
  return <Talk s={s} can={can} />;
}

type Rec = { s: 'idle' } | { s: 'recording'; since: number };

function Talk({ s, can }: { s: ToolStudy; can: ReturnType<typeof canAt> }) {
  const { session } = useSession();
  const me = displayName(session?.user.email) || undefined;
  const lines = useFactoryLines();
  const line = lines.find(l => l.id === s.workspaceId);
  const turns = useMemo(() => turnsOf(s.facts), [s.facts]);
  const [rec, setRec] = useState<Rec>({ s: 'idle' });
  const [secs, setSecs] = useState(0);
  const [said, setSaid] = useState<{ text: string; bad?: boolean } | null>(null);
  const [typing, setTyping] = useState('');
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

  /* ---- the phone hears and records: the words written as they are said (lib/hearing), the recording kept beside them ---- */
  const stream = useRef<MediaStream | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const pieceStart = useRef(0);
  const going = useRef(false);
  const cutting = useRef(false);
  const wake = useRef<{ release: () => Promise<void> } | null>(null);
  const ear = useRef<Ear | null>(null);
  /* the words of the piece being ended — at once on a cut, a moment after a pause */
  const wordsFor = useRef<Cut | Promise<Cut> | null>(null);
  /* this phone would not record and hear at once: the recording stops after this piece */
  const dropRecording = useRef(false);
  const [heardNow, setHeardNow] = useState<Heard>({ final: '', interim: '' });
  const [writing, setWriting] = useState(false);

  const stopStream = () => {
    stream.current?.getTracks().forEach(tr => tr.stop());
    stream.current = null;
  };

  const keepPiece = async (blob: Blob | undefined, at: number, durationS: number, cut: Cut | Promise<Cut>) => {
    const c = await cut;
    const words = c.words.trim();
    /* a recording the phone silenced (it gave the microphone to the hearing) is not kept — the words are */
    const peak = blob && words ? await recordingPeak(blob) : null;
    const silenced = !!blob && !!words && peak !== null && peak < SILENT_PEAK;
    const recorded = !!blob && !silenced && blob.size >= 800 && durationS >= 0.6;
    if (silenced) { recordNoMore(); dropRecording.current = true; setSaid({ text: SILENCED_SAID }); }
    /* a tap, a breath, nothing written and nothing in the way: not a piece */
    if (!words && (!recorded || (!c.trouble && durationS < 4))) return;
    let media: TalkTurn['media'];
    if (recorded && blob) {
      const blobKey = `talk-${uid()}`;
      await putBlob(blobKey, blob);
      media = { blobKey, mime: blob.type || 'audio/webm', capturedAt: at, durationS: Math.round(durationS * 10) / 10 };
    }
    await addTurn({ id: uid(), at, ...(me ? { who: me } : {}), kind: 'said', ...(media ? { media } : {}),
      ...(words ? { heard: words } : { hearing: 'failed' as const, why: notHeardWhy(c.trouble) }) });
  };

  /* after a piece: the next one while the talk goes on and the microphone is still ours; else the talk stops */
  const carryOn = () => {
    if (going.current) {
      if (dropRecording.current) { dropRecording.current = false; stopStream(); ear.current?.start(); }
      if (!stream.current || stream.current.getAudioTracks().some(tr => tr.readyState === 'live')) {
        try { startPiece(); return; } catch { /* said below */ }
      }
      /* the phone took the microphone (a call, another app, the screen off): what was said is kept, and it says so */
      going.current = false;
      setSaid({ text: 'Recording stopped — the phone took the microphone or the screen went off. What was said up to then is kept. Press Continue to carry on.' });
    }
    void ear.current?.stop();
    stopStream();
    void wake.current?.release().catch(() => undefined);
    wake.current = null;
    setWriting(false);
    setRec({ s: 'idle' });
  };

  const NO_EAR: Cut = { words: '', trouble: 'unsupported' };
  const startPiece = () => {
    pieceStart.current = Date.now();
    const at = pieceStart.current;
    cutting.current = false;
    if (stream.current) {
      const r = new MediaRecorder(stream.current);
      chunks.current = [];
      r.ondataavailable = e => { if (e.data.size) chunks.current.push(e.data); };
      r.onstop = () => {
        const blob = new Blob(chunks.current, { type: r.mimeType || 'audio/webm' });
        const durationS = (Date.now() - at) / 1000;
        /* stopped by the phone, not by a cut or a pause: the microphone gone, or the recording ended under us */
        const lost = going.current && !wordsFor.current;
        const cut = wordsFor.current ?? (ear.current ? (lost && !stream.current?.getAudioTracks().some(tr => tr.readyState === 'live') ? ear.current.stop() : ear.current.cut()) : NO_EAR);
        wordsFor.current = null;
        carryOn();
        void keepPiece(blob, at, durationS, cut).then(() => setHeardNow(ear.current?.now() ?? { final: '', interim: '' }));
      };
      r.start(1000);
      recorder.current = r;
    } else recorder.current = null;
    setRec({ s: 'recording', since: at });
    setSecs(0);
  };

  /* a long stretch cut into pieces; the talk goes on */
  const cutPiece = () => {
    if (cutting.current) return;
    cutting.current = true;
    const at = pieceStart.current;
    wordsFor.current = ear.current ? ear.current.cut() : NO_EAR;
    const r = recorder.current;
    if (r && r.state !== 'inactive') { r.stop(); return; }
    const cut = wordsFor.current;
    wordsFor.current = null;
    carryOn();
    void keepPiece(undefined, at, (Date.now() - at) / 1000, cut).then(() => setHeardNow(ear.current?.now() ?? { final: '', interim: '' }));
  };

  /* WHAT GETS IN THE WAY, said as it happens — the phone that will not record and hear at once keeps the words */
  const onTrouble = useRef<(t: Trouble) => void>(() => undefined);
  onTrouble.current = t => {
    if (t === 'mic-busy' && recorder.current?.state === 'recording') {
      recordNoMore();
      dropRecording.current = true;
      setSaid({ text: troubleSaid('mic-busy', true) });
      cutPiece();
      return;
    }
    setSaid({ text: troubleSaid(t, !!recorder.current), bad: t !== 'network' });
  };

  const startTalking = async () => {
    setSaid(null);
    const Rec = recognitionOf(window);
    const canRecord = typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
    if (!Rec && !canRecord) { setSaid({ text: troubleSaid('unsupported', false), bad: true }); return; }
    if (canRecord && !hearOnly()) {
      try { stream.current = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch (e) {
        /* refused: neither can listen. Busy: the phone may still write down what is said */
        if (!Rec || (e as { name?: string } | null)?.name === 'NotAllowedError') {
          setSaid({ text: 'The microphone could not be opened — allow it for Faultline in the browser’s settings, then press Talk again.', bad: true });
          return;
        }
        stream.current = null;
      }
    }
    if (stream.current) {
      /* the phone ending the microphone ends the piece (it is kept), and carryOn says so */
      stream.current.getAudioTracks().forEach(tr => tr.addEventListener('ended', () => { if (recorder.current?.state === 'recording') recorder.current.stop(); }));
    }
    going.current = true;
    try { wake.current = await (navigator as unknown as { wakeLock?: { request: (k: 'screen') => Promise<{ release: () => Promise<void> }> } }).wakeLock?.request('screen') ?? null; } catch { wake.current = null; }
    setHeardNow({ final: '', interim: '' });
    if (Rec) {
      ear.current = new Ear(Rec, { onWords: setHeardNow, onTrouble: t => onTrouble.current(t) }, 'en-GB', /Android/i.test(navigator.userAgent),
        () => document.visibilityState === 'hidden');
      ear.current.start();
    } else {
      ear.current = null;
      setSaid({ text: troubleSaid('unsupported', true) });
    }
    setWriting(!!Rec);
    startPiece();
  };
  /* Pause runs this render's code — the person, the talk — however long ago the page was drawn */
  const pausing = useRef<() => void>(() => undefined);
  const pause = useCallback(() => pausing.current(), []);
  pausing.current = () => {
    if (!going.current) return;
    going.current = false;
    const at = pieceStart.current;
    const r = recorder.current;
    const cut: Promise<Cut> = ear.current ? ear.current.stop() : Promise.resolve(NO_EAR);
    if (r && r.state !== 'inactive') { if (!cutting.current) wordsFor.current = cut; r.stop(); }
    else if (!cutting.current) { carryOn(); void keepPiece(undefined, at, (Date.now() - at) / 1000, cut).then(() => setHeardNow({ final: '', interim: '' })); }
    setRec({ s: 'idle' });
  };

  /* the clock, and a long stretch cut into pieces — at a pause in what is said, unless it runs on */
  useEffect(() => {
    if (rec.s !== 'recording') return;
    const i = window.setInterval(() => {
      const sec = (Date.now() - pieceStart.current) / 1000;
      setSecs(sec);
      if (going.current && !cutting.current && sec >= PIECE_SECONDS && (!ear.current?.now().interim || sec >= PIECE_SECONDS + 15)) cutPiece();
    }, 250);
    return () => window.clearInterval(i);
  }, [rec.s]); // eslint-disable-line react-hooks/exhaustive-deps

  /* the phone stopped it (the screen went off, another app took the mic): what was said is kept, and it says so */
  const awayAt = useRef(0);
  useEffect(() => {
    const seen = () => {
      if (document.visibilityState === 'hidden') { awayAt.current = Date.now(); return; }
      if (!going.current) return;
      if (recorder.current && recorder.current.state !== 'recording') {
        pause();
        setSaid({ text: 'Recording stopped while the phone was away from Faultline — what was said up to then is kept. Press Continue to carry on.' });
        return;
      }
      /* back in sight: listening again at once; what was said meanwhile was not written down */
      ear.current?.start();
      if (Date.now() - awayAt.current < 1000) return;
      setSaid({ text: recorder.current
        ? 'Faultline was out of sight, so the phone did not write down what was said meanwhile — the recording has it. It is listening again.'
        : 'Faultline was out of sight, so the phone did not write down what was said meanwhile, and it was not recording. It is listening again.' });
    };
    document.addEventListener('visibilitychange', seen);
    return () => document.removeEventListener('visibilitychange', seen);
  }, [pause]);
  useEffect(() => () => { going.current = false; ear.current?.abort(); if (recorder.current?.state === 'recording') recorder.current.stop(); stopStream(); }, []);

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
    })().finally(() => { askingRef.current = false; setAsking(null); });
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
    const r = await askTalk({ task: 'talk', context: contextRef.current?.text ?? '', today: longDay(), turns: askTurnsOf(asked), images });
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

  const box = useRef<HTMLTextAreaElement>(null);
  const send = async () => {
    const text = typing.trim();
    if (text) { await addTurn({ id: uid(), at: Date.now(), ...(me ? { who: me } : {}), kind: 'typed', text }); setTyping(''); }
    await ask();
  };
  const strike = async (t: TalkTurn, struck: boolean) => {
    await patchTurn(t.id, struck ? { struck: true } : {}, struck ? [] : ['struck']);
    offerUndo(struck ? 'Struck — kept, and left out of the talk' : 'Brought back', async () => { await patchTurn(t.id, struck ? {} : { struck: true }, struck ? ['struck'] : []); });
  };

  const recording = rec.s === 'recording';
  const docTurn = docId ? turns.find(t => t.id === docId && t.kind === 'reply' && t.doc) : undefined;
  const photosByLabel = useMemo(() => new Map(turns.filter(t => t.kind === 'photo').map(t => [labels.get(t.id) ?? '', t])), [turns, labels]);
  if (docTurn?.doc) {
    return <TalkDocView s={s} t={docTurn} doc={docTurn.doc} can={can} lineName={line?.name} me={me} photos={photosByLabel}
      onSave={(doc, first) => patchTurn(docTurn.id, { doc, ...(first && !docTurn.docFirst ? { docFirst: first } : {}) })}
      onBack={() => nav(`/talk/${s.id}`)} />;
  }
  const canSend = live && !recording && !asking && (!!typing.trim() || theirs.length > 0);
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
        {turns.length === 0 && <li className="tk-empty sub">Nothing said yet. Press Talk and say what you see, or type a question below — add a photo whenever it helps, and ask for a report when you are done.</li>}
        {turns.map(t => t.kind === 'reply' ? (
          <ReplyRow key={t.id} t={t} live={live} answeringHere={asking === t.id}
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
        <div className={'tk-bar' + (recording ? ' is-on' : '')} role="group" aria-label="Talk">
          {said && <p className={'sub tk-said' + (said.bad ? ' is-r' : '')} role="status">{said.text}</p>}
          <div className="tk-acts">
            {recording ? (
              <button type="button" className="btn btn-primary tk-talk is-on" onClick={pause} aria-label="Pause">
                <Icon name="pause" size="1.2em" />Pause <span className="tk-clock" aria-live="off">{clock(secs)}</span>
              </button>
            ) : (
              <button type="button" className="btn btn-primary tk-talk" onClick={() => void startTalking()}>
                <Icon name="mic" size="1.2em" />{turns.some(t => t.kind === 'said') ? 'Continue' : 'Talk'}
              </button>
            )}
            <button type="button" className="btn tk-photo" onClick={() => photoIn.current?.click()}><Icon name="camera" size="1.1em" />Photo</button>
            {/* no `capture`: the phone offers its camera and its photos alike */}
            <input ref={photoIn} type="file" accept="image/*" multiple hidden aria-label="Add a photo" onChange={e => { void addPhotos([...(e.target.files ?? [])]); e.target.value = ''; }} />
          </div>
          {recording && (
            <p className="tk-live" aria-live="polite">
              {heardNow.final || heardNow.interim
                ? <>{heardNow.final}{heardNow.interim && <span className="tk-interim">{heardNow.final ? ' ' : ''}{heardNow.interim}</span>}</>
                : <span className="sub">{writing ? 'Listening — what you say is written here as you say it.' : 'Recording.'}</span>}
            </p>
          )}
          {recording && <p className="sub tk-hint">{writing ? 'The phone writes down what you say; a long stretch is kept about a minute at a time. Pause when you stop — the screen stays on while it listens — and Pause to ask Line Talk about it.' : 'Recording — a long stretch is kept a minute at a time. Pause when you stop; the screen stays on while it records.'}</p>}
          {!recording && !typing.trim() && turns.some(isTheirs) && (
            <div className="tk-chips" role="group" aria-label="Ask for a document">
              {ASKS.map(a => <button key={a.label} type="button" className="chip tk-chip" onClick={() => { setTyping(a.text); box.current?.focus(); }}>{a.label}</button>)}
            </div>
          )}
          <form className="tk-type" onSubmit={e => { e.preventDefault(); if (canSend) void send(); }}>
            <textarea ref={box} className="text-input tk-box" rows={typing.length > 70 || typing.includes('\n') ? 3 : 1} value={typing} maxLength={4000}
              placeholder="Type a question, or ask for a report…" aria-label="Type into the talk"
              onChange={e => setTyping(e.target.value)}
              onKeyDown={e => {
                /* Enter sends at a desk; on a phone it is a new line, as the phone's own keyboard says */
                if (e.key === 'Enter' && !e.shiftKey && window.matchMedia?.('(pointer: fine)').matches) { e.preventDefault(); if (canSend) void send(); }
              }} />
            <button type="submit" className="btn btn-primary tk-send" disabled={!canSend}>{typing.trim() ? 'Send' : 'Reply'}</button>
          </form>
          <p className="sub tk-hint">{asking ? 'Line Talk is answering — what you say and photograph meanwhile is kept for the next answer.' : typing.trim() ? 'Send adds your words and Line Talk answers.' : theirs.length ? 'Reply asks Line Talk about what you have said since its last answer.' : 'Talk, type or add a photo — then Reply or Send.'}</p>
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

function ReplyRow({ t, live, answeringHere, onAskAgain, onOpen, onStrike }: {
  t: TalkTurn; live: boolean; answeringHere: boolean; onAskAgain: () => void; onOpen: () => void; onStrike: (struck: boolean) => void;
}) {
  const d = t.doc;
  const pics = d ? new Set(d.sections.flatMap(x => x.photos.map(p => p.photo))).size : 0;
  return (
    <li className={`tk-turn is-reply${t.struck ? ' is-struck' : ''}`} data-turn={t.id} data-kind="reply">
      <span className="tk-meta">Line Talk · {hhmm(t.at)}{t.struck ? ' · struck' : ''}</span>
      {t.answering === 'waiting' && (answeringHere
        ? <p className="sub tk-wait">Line Talk is answering…</p>
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
