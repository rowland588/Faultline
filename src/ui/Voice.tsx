/* THE MIC, AND WHAT IT HEARD — one pair, used on every form that takes voice.
 *
 * Rowland: "on every part of the app I can talk the information into it."
 *
 * VoiceNote records, converts and sends (lib/voice), and hands back what was
 * heard. VoiceReview shows it: each change as the field, what it says now and
 * what it would say, ticked by default, and nothing is written until "Put it
 * in". What was said stays on screen the whole time, and anything that did
 * not fit the form is offered as a note rather than dropped.
 */
import { useEffect, useRef, useState } from 'react';
import { askVoice, toWavBase64, VoiceError, type VoiceForm, type VoiceResult } from '../lib/voice';
import type { VoiceContext } from '../../api/voice';

const MAX_SECONDS = 120;

type State =
  | { s: 'idle' }
  | { s: 'recording'; started: number }
  | { s: 'reading'; attempt?: number; of?: number }
  | { s: 'error'; msg: string };

export function VoiceNote({ form, context, onHeard, label = 'Say it' }: {
  form: VoiceForm;
  /** Read when the recording is sent, so the names are current. */
  context: () => VoiceContext;
  onHeard: (r: VoiceResult) => void;
  label?: string;
}) {
  const [state, setState] = useState<State>({ s: 'idle' });
  const [secs, setSecs] = useState(0);
  const rec = useRef<MediaRecorder | null>(null);
  const kept = useRef<Blob | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => {
    window.clearInterval(timer.current);
    rec.current?.stream.getTracks().forEach(t => t.stop());
  }, []);

  const send = async (blob: Blob) => {
    setState({ s: 'reading' });
    try {
      const audio = await toWavBase64(blob);
      const r = await askVoice(form, audio, context(), (attempt, of) => setState({ s: 'reading', attempt, of }));
      kept.current = null;
      setState({ s: 'idle' });
      onHeard(r);
    } catch (e) {
      setState({ s: 'error', msg: e instanceof VoiceError ? e.message : 'That could not be read. Try again.' });
    }
  };

  const start = async () => {
    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setState({ s: 'error', msg: 'This browser cannot record. Use the keyboard’s own mic to dictate instead.' });
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setState({ s: 'error', msg: 'The microphone is blocked — allow it for this site in the browser’s settings.' });
      return;
    }
    const chunks: Blob[] = [];
    const r = new MediaRecorder(stream);
    r.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    r.onstop = () => {
      stream.getTracks().forEach(t => t.stop());
      window.clearInterval(timer.current);
      const blob = new Blob(chunks, { type: r.mimeType || 'audio/webm' });
      kept.current = blob;
      void send(blob);
    };
    rec.current = r;
    r.start();
    const started = Date.now();
    setSecs(0);
    setState({ s: 'recording', started });
    timer.current = window.setInterval(() => {
      const n = Math.floor((Date.now() - started) / 1000);
      setSecs(n);
      if (n >= MAX_SECONDS && r.state === 'recording') r.stop();
    }, 250);
  };

  const stop = () => { if (rec.current?.state === 'recording') rec.current.stop(); };

  if (state.s === 'recording') {
    return (
      <button type="button" className="vo-btn is-rec" onClick={stop} aria-label="Stop recording">
        <span className="vo-dot" aria-hidden /> Stop · {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, '0')}
      </button>
    );
  }
  if (state.s === 'reading') {
    return (
      <span className="vo-btn is-reading" role="status">
        <span className="vo-spin" aria-hidden />
        {state.attempt ? `Voice is busy — trying again (${state.attempt} of ${state.of})…` : 'Reading what you said…'}
      </span>
    );
  }
  return (
    <span className="vo-wrap">
      <button type="button" className="vo-btn" onClick={() => void start()}>
        <MicIcon /> {label}
      </button>
      {state.s === 'error' && (
        <span className="vo-err" role="alert">
          {state.msg}
          {kept.current && <button type="button" className="cw-link" onClick={() => kept.current && void send(kept.current)}>Try again</button>}
        </span>
      )}
    </span>
  );
}

function MicIcon() {
  return (
    <svg className="vo-mic" viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" />
      <path d="M6 11a6 6 0 0 0 12 0M12 17v4M8.5 21h7" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

/** One row of the review: a field and what it would become. `editable`: the
 *  words can be put right before they go in — "can edit the speech". */
export interface ReviewRow { key: string; label: string; before?: string; after: string; editable?: boolean }

export function VoiceReview({ heard, rows, onApply, onDiscard, applyLabel = 'Put it in', onLeftover }: {
  heard: VoiceResult;
  rows: ReviewRow[];
  /** The ticked rows, and the words of any editable row as the person left them. */
  onApply: (keys: string[], edits: Record<string, string>) => void;
  onDiscard: () => void;
  applyLabel?: string;
  /** Keep what did not fit, as a note — offered, never done for them. */
  onLeftover?: (text: string) => void;
}) {
  const [on, setOn] = useState<Set<string>>(() => new Set(rows.map(r => r.key)));
  const toggle = (k: string) => setOn(s => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const [kept, setKept] = useState(false);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const spare = heard.leftover || (rows.length === 0 ? heard.transcript : '');

  return (
    <section className="vo-review" aria-label="What was heard">
      <p className="vo-said"><span className="vo-said-l">You said</span> “{heard.transcript || '…'}”</p>
      {rows.length > 0 ? (
        <ul className="vo-rows">
          {rows.map(r => (
            <li key={r.key}>
              <label className="vo-row">
                <input type="checkbox" checked={on.has(r.key)} onChange={() => toggle(r.key)} />
                <span className="vo-row-m">
                  <span className="vo-row-l">{r.label}</span>
                  {r.before && !r.editable ? <span className="vo-before">{r.before}</span> : null}
                  {!r.editable && <span className="vo-after">{r.after}</span>}
                </span>
              </label>
              {/* The account, as words to put right before they go in — out
                  of the label, so typing in it does not tick and untick it. */}
              {r.editable && (
                <textarea className="vo-edit" aria-label={`${r.label} — as it will read`}
                  rows={Math.min(10, Math.max(3, Math.ceil((edits[r.key] ?? r.after).length / 60)))}
                  value={edits[r.key] ?? r.after}
                  onChange={e => { const v = e.target.value; setEdits(x => ({ ...x, [r.key]: v })); }} />
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="sub">Nothing in that fits these boxes.</p>
      )}
      {spare && onLeftover && (
        <p className="vo-spare">
          <span>{heard.leftover ? 'Did not fit here:' : 'Keep it anyway?'} “{spare}”</span>
          <button type="button" className="cw-link" disabled={kept} onClick={() => { onLeftover(spare); setKept(true); }}>
            {kept ? 'Kept as a note' : 'Keep it as a note'}
          </button>
        </p>
      )}
      <div className="vo-go">
        {rows.length > 0 && (
          <button type="button" className="btn btn-primary" disabled={on.size === 0} onClick={() => onApply([...on], edits)}>
            {applyLabel}{on.size < rows.length ? ` (${on.size})` : ''}
          </button>
        )}
        <button type="button" className="btn btn-ghost" onClick={onDiscard}>{rows.length ? 'Discard' : 'Close'}</button>
      </div>
    </section>
  );
}
