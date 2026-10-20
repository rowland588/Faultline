/* LINE TALK, ON THE PHONE — talk on the line, and every word is kept
 * (docs/LINE-TALK.md, slice 1: record and keep).
 *
 * Rowland, 20 October: "Consultant in a line speaking into his phone, the AI
 * listening to everything, allows pause, continue speaking, it remembers
 * everything like Claude chat." A talk is a conversation about one line:
 *   Talk      records; a long stretch is cut into minute-long pieces as it is
 *             said (lib/talk PIECE_SECONDS), each kept on the phone the moment
 *             it ends — the screen kept awake while it records;
 *   Pause     ends the piece; Continue starts the next;
 *   Photo     a picture, where it was taken in the talk;
 *   Type      words, when talking will not do.
 * Each piece is heard by the voice service (api/voice, form 'talk') with the
 * line's machines and what was said before it, and what it heard is written
 * beside the recording — corrected by the person, never over what was heard.
 * A piece not heard yet waits and is heard when there is signal, here or
 * after a reload; one that could not be heard says why and can be tried again.
 * The recordings are kept for good (Rowland, 20 October).
 *
 * WHICH RECORD: a study of tool `talk` (lib/study, lib/talk) — on a line, or
 * a job's. WHERE IT SHOWS: Line Talk in Tools (#/talk, ?line= on one line),
 * a line's page among its tools, the talk itself (#/talk/:id). */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getBlob, getStudy, listAllStudies, onDataChange, patchStudy, putBlob, putStudy } from '../db';
import { useAccess } from '../cloud/access';
import { useSession } from '../cloud/session';
import { displayName } from '../cloud/team';
import { can as canAt } from '../lib/access';
import { now, uid } from '../lib/ids';
import { todayISO, niceDay } from '../lib/weeks';
import { nav, useRoute } from '../state/useRoute';
import { askVoice, toWavBase64, VoiceError } from '../lib/voice';
import { useMachinesOf } from '../lib/useLineRecords';
import { useFactoryLines } from '../lib/useFactoryLines';
import { useBlobUrl } from '../lib/useBlobUrl';
import { PIECE_SECONDS, earlierOf, talkName, talkSaid, toHear, turnsOf, wordsOf, type TalkTurn } from '../lib/talk';
import type { ToolStudy } from '../lib/study';
import { StudyName } from '../ui/StudyActs';
import { offerUndo } from '../ui/Undo';
import { Icon } from '../ui/Icon';

const OWNER = canAt('owner');
const hhmm = (ms: number) => new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

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
          <p className="pl-says">Talk on the line — pause, carry on, take a photo, type when you must. Every word is heard and kept with its recording, and the talk can be opened and carried on any day.</p>
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
  const machines = useMachinesOf(s.workspaceId, s.projectId);
  const turns = useMemo(() => turnsOf(s.facts), [s.facts]);
  const [rec, setRec] = useState<Rec>({ s: 'idle' });
  const [secs, setSecs] = useState(0);
  const [said, setSaid] = useState<{ text: string; bad?: boolean } | null>(null);
  const [typing, setTyping] = useState('');
  const [fixing, setFixing] = useState<{ id: string; text: string } | null>(null);
  const live = can.edit;

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

  /* ---- hearing: one piece at a time, in order, each with what came before ---- */
  const chain = useRef<Promise<void>>(Promise.resolve());
  const ctx = useRef({ line: line?.name, machines });
  ctx.current = { line: line?.name, machines };
  const hearOne = useCallback(async (turnId: string) => {
    const cur = await getStudy(s.id);
    const all = turnsOf(cur?.facts ?? {});
    const t = all.find(x => x.id === turnId);
    if (!t || t.kind !== 'said' || !t.media || t.hearing !== 'waiting') return;
    const blob = await getBlob(t.media.blobKey);
    /* recorded on another device: heard there */
    if (!blob) return;
    try {
      const audio = await toWavBase64(blob);
      const r = await askVoice('talk', audio, {
        today: todayISO(), ...(ctx.current.line ? { line: ctx.current.line } : {}),
        ...(ctx.current.machines.length ? { machines: ctx.current.machines } : {}),
        earlier: earlierOf(all, t.at),
      });
      const words = (typeof r.fields.said === 'string' ? r.fields.said : '').trim() || r.transcript.trim();
      await patchTurn(turnId, { heard: words || '(nothing said)', ...(r.transcript ? { transcript: r.transcript } : {}) }, ['hearing', 'why']);
    } catch (e) {
      const why = e instanceof VoiceError ? e.message : 'It could not be heard.';
      /* no signal: it waits, and is heard when there is some */
      if (!navigator.onLine) return;
      await patchTurn(turnId, { hearing: 'failed', why });
    }
  }, [s.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const hear = useCallback((turnId: string) => {
    chain.current = chain.current.then(() => hearOne(turnId)).catch(() => undefined);
  }, [hearOne]);

  /* waiting pieces are heard when the talk opens, and when the signal comes back */
  const asked = useRef(new Set<string>());
  useEffect(() => {
    if (!live) return;
    const go = () => { for (const t of toHear(turns)) if (!asked.current.has(t.id)) { asked.current.add(t.id); hear(t.id); } };
    go();
    const back = () => { asked.current.clear(); go(); };
    window.addEventListener('online', back);
    return () => window.removeEventListener('online', back);
  }, [turns, hear, live]);

  /* ---- recording: pieces cut as they are said, the screen kept awake ---- */
  const stream = useRef<MediaStream | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const pieceStart = useRef(0);
  const going = useRef(false);
  const wake = useRef<{ release: () => Promise<void> } | null>(null);

  const keepPiece = useCallback(async (blob: Blob, at: number, durationS: number) => {
    /* a tap and nothing said is not a piece */
    if (blob.size < 800 || durationS < 0.6) return;
    const blobKey = `talk-${uid()}`;
    await putBlob(blobKey, blob);
    const t: TalkTurn = { id: uid(), at, ...(me ? { who: me } : {}), kind: 'said', media: { blobKey, mime: blob.type || 'audio/webm', capturedAt: at, durationS: Math.round(durationS * 10) / 10 }, hearing: 'waiting' };
    await addTurn(t);
    asked.current.add(t.id);
    hear(t.id);
  }, [me, hear]); // eslint-disable-line react-hooks/exhaustive-deps

  const startPiece = useCallback(() => {
    if (!stream.current) return;
    const r = new MediaRecorder(stream.current);
    chunks.current = [];
    pieceStart.current = Date.now();
    const at = pieceStart.current;
    r.ondataavailable = e => { if (e.data.size) chunks.current.push(e.data); };
    r.onstop = () => {
      const blob = new Blob(chunks.current, { type: r.mimeType || 'audio/webm' });
      void keepPiece(blob, at, (Date.now() - at) / 1000);
      /* the next piece, while the microphone is still ours */
      if (going.current && stream.current?.getAudioTracks().some(tr => tr.readyState === 'live')) {
        try { startPiece(); return; } catch { /* said below */ }
      }
      /* the phone took the microphone (a call, another app, the screen off): what was said is kept, and it says so */
      if (going.current) {
        going.current = false;
        void wake.current?.release().catch(() => undefined);
        wake.current = null;
        setRec({ s: 'idle' });
        setSaid({ text: 'Recording stopped — the phone took the microphone or the screen went off. What was said up to then is kept. Press Continue to carry on.' });
      }
      stream.current?.getTracks().forEach(tr => tr.stop());
      stream.current = null;
    };
    r.start(1000);
    recorder.current = r;
    setRec({ s: 'recording', since: at });
    setSecs(0);
  }, [keepPiece]);

  const startTalking = async () => {
    setSaid(null);
    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) { setSaid({ text: 'This browser cannot record. Type instead, or open Faultline in the phone’s own browser.', bad: true }); return; }
    try { stream.current = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch {
      setSaid({ text: 'The microphone could not be opened — allow it for Faultline in the browser’s settings, then press Talk again.', bad: true });
      return;
    }
    /* the phone ending the microphone ends the piece (it is kept), and onstop says so */
    stream.current.getAudioTracks().forEach(tr => tr.addEventListener('ended', () => { if (recorder.current?.state === 'recording') recorder.current.stop(); }));
    going.current = true;
    try { wake.current = await (navigator as unknown as { wakeLock?: { request: (k: 'screen') => Promise<{ release: () => Promise<void> }> } }).wakeLock?.request('screen') ?? null; } catch { wake.current = null; }
    startPiece();
  };
  const pause = useCallback(() => {
    going.current = false;
    if (recorder.current && recorder.current.state !== 'inactive') recorder.current.stop();
    else { stream.current?.getTracks().forEach(tr => tr.stop()); stream.current = null; }
    void wake.current?.release().catch(() => undefined);
    wake.current = null;
    setRec({ s: 'idle' });
  }, []);

  /* the clock, and a long stretch cut into pieces as it is said */
  useEffect(() => {
    if (rec.s !== 'recording') return;
    const i = window.setInterval(() => {
      const sec = (Date.now() - pieceStart.current) / 1000;
      setSecs(sec);
      if (sec >= PIECE_SECONDS && recorder.current?.state === 'recording') recorder.current.stop();
    }, 250);
    return () => window.clearInterval(i);
  }, [rec.s]);

  /* the phone stopped it (the screen went off, another app took the mic): what was said is kept, and it says so */
  useEffect(() => {
    const seen = () => {
      if (document.visibilityState === 'visible' && going.current && recorder.current?.state !== 'recording') {
        pause();
        setSaid({ text: 'Recording stopped while the phone was away from Faultline — what was said up to then is kept. Press Continue to carry on.' });
      }
    };
    document.addEventListener('visibilitychange', seen);
    return () => document.removeEventListener('visibilitychange', seen);
  }, [pause]);
  useEffect(() => () => { going.current = false; if (recorder.current?.state === 'recording') recorder.current.stop(); }, []);

  /* ---- a photo, and words typed ---- */
  const photoIn = useRef<HTMLInputElement>(null);
  const addPhoto = async (f: File | undefined) => {
    if (!f) return;
    const at = Date.now(), blobKey = `talk-${uid()}`;
    await putBlob(blobKey, f);
    await addTurn({ id: uid(), at, ...(me ? { who: me } : {}), kind: 'photo', media: { blobKey, mime: f.type || 'image/jpeg', capturedAt: at } });
  };
  const send = async () => {
    const text = typing.trim();
    if (!text) return;
    await addTurn({ id: uid(), at: Date.now(), ...(me ? { who: me } : {}), kind: 'typed', text });
    setTyping('');
  };
  const strike = async (t: TalkTurn, struck: boolean) => {
    await patchTurn(t.id, struck ? { struck: true } : {}, struck ? [] : ['struck']);
    offerUndo(struck ? 'Struck — kept, and left out of the talk' : 'Brought back', async () => { await patchTurn(t.id, struck ? {} : { struck: true }, struck ? ['struck'] : []); });
  };

  const recording = rec.s === 'recording';
  return (
    <div className="wrap ie tk" data-talk={s.id}>
      <header className="pace-head">
        <div className="pace-head-main">
          <p className="pl-eyebrow">LINE TALK · {line ? <a href={`#/lines/${encodeURIComponent(line.id)}`} className="pl-fac">{line.name} ›</a> : 'not on a line'} · <a href={`#/talk${s.workspaceId ? `?line=${encodeURIComponent(s.workspaceId)}` : ''}`} className="pl-fac">Every Line Talk ›</a></p>
          <StudyName s={s} canEdit={can.edit} canRemove={can.remove} />
          <p className="pl-says tk-sum">{talkSaid(turns)}</p>
        </div>
      </header>

      <ol className="tk-turns" aria-label="The talk">
        {turns.length === 0 && <li className="tk-empty sub">Nothing said yet. Press Talk and say what you see — pause whenever you like, and carry on.</li>}
        {turns.map(t => (
          <TurnRow key={t.id} t={t} live={live}
            fixing={fixing?.id === t.id ? fixing.text : undefined}
            onFix={text => setFixing(text === undefined ? null : { id: t.id, text })}
            onSaveFix={async text => {
              const was = t.text;
              await patchTurn(t.id, text.trim() && text.trim() !== t.heard ? { text: text.trim() } : {}, text.trim() && text.trim() !== t.heard ? [] : ['text']);
              setFixing(null);
              offerUndo('Corrected — what was heard is kept beside it', async () => { await patchTurn(t.id, was ? { text: was } : {}, was ? [] : ['text']); });
            }}
            onHearAgain={async () => { await patchTurn(t.id, { hearing: 'waiting' }, ['why']); asked.current.add(t.id); hear(t.id); }}
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
            <input ref={photoIn} type="file" accept="image/*" capture="environment" hidden aria-label="Take a photo" onChange={e => { void addPhoto(e.target.files?.[0]); e.target.value = ''; }} />
          </div>
          {recording && <p className="sub tk-hint">Listening — a long stretch is kept a minute at a time. Pause when you stop; the screen stays on while it listens.</p>}
          <form className="tk-type" onSubmit={e => { e.preventDefault(); void send(); }}>
            <input className="text-input" value={typing} maxLength={4000} placeholder="Or type…" aria-label="Type into the talk" onChange={e => setTyping(e.target.value)} />
            <button type="submit" className="btn" disabled={!typing.trim()}>Add</button>
          </form>
        </div>
      )}
    </div>
  );
}

function TurnRow({ t, live, fixing, onFix, onSaveFix, onHearAgain, onStrike }: {
  t: TalkTurn; live: boolean; fixing?: string;
  onFix: (text: string | undefined) => void; onSaveFix: (text: string) => Promise<void>; onHearAgain: () => void; onStrike: (struck: boolean) => void;
}) {
  const url = useBlobUrl(t.media?.blobKey);
  const words = wordsOf(t);
  return (
    <li className={`tk-turn is-${t.kind}${t.struck ? ' is-struck' : ''}`} data-turn={t.id} data-kind={t.kind}>
      <span className="tk-meta">{t.who ?? 'Said'} · {hhmm(t.at)}{t.kind === 'said' && t.media?.durationS ? ` · ${clock(t.media.durationS)}` : ''}{t.struck ? ' · struck' : ''}</span>
      {t.kind === 'photo' && (url ? <img className="tk-photo-i" src={url} alt={t.text || 'A photo taken in the talk'} /> : <span className="sub">The photo is on another device — it comes here once that device has synced.</span>)}
      {t.kind === 'said' && (url ? <audio className="tk-audio" controls preload="none" src={url} aria-label="The recording" /> : <span className="sub">The recording is on another device — it comes here once that device has synced.</span>)}
      {fixing !== undefined ? (
        <form className="tk-fix" onSubmit={e => { e.preventDefault(); void onSaveFix(fixing); }}>
          <textarea className="text-input" rows={3} value={fixing} autoFocus aria-label="What was said" onChange={e => onFix(e.target.value)} />
          <span className="tk-fix-a"><button type="submit" className="btn btn-sm btn-primary">Save</button><button type="button" className="btn btn-sm btn-ghost" onClick={() => onFix(undefined)}>Cancel</button></span>
        </form>
      ) : (
        <>
          {t.kind === 'said' && t.hearing === 'waiting' && <p className="sub tk-wait">{url ? 'Being heard…' : 'Waiting to be heard on the phone it was said on.'}</p>}
          {t.kind === 'said' && t.hearing === 'failed' && (
            <p className="sub is-r tk-fail">Not heard yet — {t.why ?? 'it could not be heard.'} The recording is kept. {live && <button type="button" className="linkish" onClick={onHearAgain}>Hear it again</button>}</p>
          )}
          {words && <p className="tk-words">{words}</p>}
          {t.kind === 'said' && t.text && t.heard && <p className="sub tk-heard">As heard: {t.heard}</p>}
        </>
      )}
      {live && fixing === undefined && (
        <span className="tk-turn-a">
          {t.kind !== 'photo' && !t.struck && (t.kind === 'typed' || t.heard) && <button type="button" className="linkish" onClick={() => onFix(words)}>Correct</button>}
          <button type="button" className="linkish" onClick={() => onStrike(!t.struck)}>{t.struck ? 'Bring back' : 'Strike'}</button>
        </span>
      )}
    </li>
  );
}
