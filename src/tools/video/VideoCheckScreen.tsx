/* CAN THIS PHONE FILM A LONG STUDY? — the phone check (docs/VIDEO-FEASIBILITY.md;
 * lib/video/phoneRun runs it, lib/video/phoneCheck says what it found).
 *
 * Rowland, 19 October: "If I was to leave a mobile phone on a production line
 * for 1 hour to gain insight ... what if we wanted 2 hours, 3 hours?" — and
 * "make sure that the technical abilities are possible". Before the long study
 * is built, this tries each thing it needs on the phone that would film it,
 * and says what it found a line an ability, with the figures to copy and send.
 * It is reached from Video studies; it reads no record and writes none. */
import { useEffect, useRef, useState } from 'react';
import { nav } from '../../state/useRoute';
import { pickMimeType } from './VideoRecorder';
import { clock, lasting, offersSay, phoneSays, phoneText, type PhoneOffers, type PhoneRun } from './phoneCheck';
import { PhoneTest, phoneOffers, type PhoneLive } from './phoneRun';
import type { VideoZone } from './record';

/** The picture in thirds, read as three stations are. */
const THIRDS: VideoZone[] = [0, 1, 2].map(i => ({ id: `s${i + 1}`, label: ['Left', 'Middle', 'Right'][i], track: '', x0: i / 3, x1: (i + 1) / 3, y0: 0, y1: 1 }));
const LENGTHS = [120, 600, 1800, 3600];
const WORD: Record<PhoneLive['word'], { text: string; tone: string }> = {
  looking: { text: 'Looking…', tone: 'n' },
  steady: { text: 'Steady', tone: 'g' },
  shaking: { text: 'Shaking', tone: 'r' },
  moved: { text: 'Moved', tone: 'a' },
  light: { text: 'The light changed', tone: 'n' },
};

export function VideoCheckScreen() {
  const [offers, setOffers] = useState<PhoneOffers | null>(null);
  const [seconds, setSeconds] = useState(120);
  const [phase, setPhase] = useState<'ready' | 'running' | 'done'>('ready');
  const [live, setLive] = useState<PhoneLive | null>(null);
  const [run, setRun] = useState<PhoneRun | null>(null);
  const [clipUrl, setClipUrl] = useState<string>();
  const [copied, setCopied] = useState<'' | 'yes' | 'show'>('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const testRef = useRef<PhoneTest | null>(null);

  useEffect(() => { void phoneOffers(pickMimeType()).then(setOffers); }, []);
  /* the clip let go of when the page is left or the test run again */
  useEffect(() => () => { if (clipUrl) URL.revokeObjectURL(clipUrl); }, [clipUrl]);

  /* started once the camera's picture is on the page; stopped if the page is left */
  useEffect(() => {
    if (phase !== 'running' || !videoRef.current) return;
    let alive = true;
    const test = new PhoneTest({
      seconds, mime: pickMimeType(), zones: THIRDS, video: videoRef.current,
      onLive: l => { if (alive) setLive(l); },
      onDone: (r, clip) => {
        if (!alive) return;
        setRun(r); setClipUrl(clip ? URL.createObjectURL(clip) : undefined); setPhase('done');
        /* what the browser gives the app, asked again: the test may have been granted keeping */
        void phoneOffers(pickMimeType()).then(o => { if (alive) setOffers(o); });
      },
    });
    testRef.current = test;
    void test.start();
    return () => { alive = false; void test.stop('stopped'); testRef.current = null; };
  }, [phase, seconds]);

  const says = offers && run ? phoneSays(offers, run) : null;
  const copy = async () => {
    if (!offers || !run) return;
    try { await navigator.clipboard.writeText(phoneText(offers, run)); setCopied('yes'); } catch { setCopied('show'); }
  };

  return (
    <div className="wrap vck">
      <header className="pace-head">
        <div className="pace-head-main">
          <h1>Can this phone film a long study?</h1>
          <p className="sub">Before a long study is built, each thing it needs is tried on this phone: the camera read as it films, short clips that play on their own, the camera kept steady, the screen kept on with the app in front, room to keep it, the battery, and the reading saved as it goes. Nothing is uploaded and nothing goes into your records — the results are for you to copy and send.</p>
        </div>
        <div className="pace-head-actions"><button type="button" className="btn" onClick={() => nav('/video')}>Video studies</button></div>
      </header>

      <section className="vid-panel vck-offers" aria-label="What this phone offers">
        <h2>What this phone offers</h2>
        {!offers ? <p className="muted">Asking the phone…</p> : (
          <ul className="vck-lines">
            {offersSay(offers).map(l => <li key={l.key} data-key={l.key} className={`vck-line is-${l.tone}`}><b>{l.what}</b><span>{l.says}</span></li>)}
          </ul>
        )}
      </section>

      {phase === 'ready' && (
        <section className="vid-panel vck-start" aria-label="The test">
          <h2>The test</h2>
          <p>Stand the phone where it would film the line — on a stand or a shelf, not in the hand — with the line in view, and leave the app open. Two minutes says whether it can; an hour says the battery, the heat and the screen over a long study.</p>
          <div className="vck-len" role="radiogroup" aria-label="How long">
            {LENGTHS.map(s => <button key={s} type="button" role="radio" aria-checked={seconds === s} className={`chip${seconds === s ? ' on' : ''}`} onClick={() => setSeconds(s)}>{lasting(s)}</button>)}
          </div>
          <button type="button" className="btn btn-primary" onClick={() => { setLive(null); setRun(null); setCopied(''); setPhase('running'); }}>Start the test</button>
        </section>
      )}

      {phase === 'running' && (
        <section className="vid-panel vck-run" aria-label="The test, running">
          <div className="vck-cam">
            <video ref={videoRef} muted playsInline autoPlay />
            <div className="vck-thirds" aria-hidden="true">{THIRDS.map((z, i) => <i key={z.id} style={{ left: `${z.x0 * 100}%`, width: `${(z.x1 - z.x0) * 100}%` }}><b style={{ height: `${Math.min(100, (live?.levels[i] ?? 0) * 2000)}%` }} /></i>)}</div>
          </div>
          <dl className="vck-live">
            <div><dt>Running</dt><dd data-live="time">{clock(live?.sec ?? 0)} of {clock(seconds)}</dd></div>
            <div><dt>Reading</dt><dd data-live="rate">{live ? `${live.rate.toFixed(1)} frames a second · ${Math.round(live.costMs)} ms each` : 'opening the camera…'}</dd></div>
            <div><dt>Clips</dt><dd data-live="clips">{!live?.clips ? 'the first is 30 seconds long' : live.clipsBad ? <span className="ie-tone is-r">{live.clips} written, {live.clipsBad} does not play on its own</span> : `${live.clips} written, ${live.clips === 1 ? 'it plays' : 'each plays'} on its own`}</dd></div>
            <div><dt>The camera</dt><dd data-live="steady"><span className={`ie-tone is-${WORD[live?.word ?? 'looking'].tone}`}>{WORD[live?.word ?? 'looking'].text}</span></dd></div>
            <div><dt>The screen</dt><dd data-live="screen">{live?.wake ? 'kept on' : offers?.wakeLock ? 'not kept on' : 'cannot be kept on by this browser'}{live?.hidden ? <span className="ie-tone is-r"> · out of sight {live.hidden === 1 ? 'once' : `${live.hidden} times`}</span> : null}</dd></div>
          </dl>
          <button type="button" className="btn" onClick={() => void testRef.current?.stop('stopped')}>Stop the test</button>
        </section>
      )}

      {phase === 'done' && says && run && (
        <section className="vid-panel vck-done" aria-label="What it found">
          <p className={`vck-head is-${says.tone}`} data-headline>{says.headline}</p>
          <p className="muted vck-ran">{says.ran}{run.camera?.width ? ` · the camera at ${run.camera.width}×${run.camera.height}${run.camera.frameRate ? `, ${run.camera.frameRate} a second` : ''}` : ''}</p>
          <ul className="vck-lines">
            {says.lines.map(l => <li key={l.key} data-key={l.key} className={`vck-line is-${l.tone}`}><b>{l.what}</b><span>{l.says}</span></li>)}
          </ul>
          {says.next && <p className="vck-next">{says.next}</p>}
          <div className="vck-acts">
            <button type="button" className="btn btn-primary" onClick={() => void copy()}>Copy results</button>
            <button type="button" className="btn" onClick={() => setPhase('ready')}>Run it again</button>
          </div>
          {copied === 'yes' && <p className="vck-copied" role="status">Copied — paste it into a message to whoever asked.</p>}
          {copied === 'show' && offers && (<>
            <p className="vck-copied" role="status">This browser would not copy it — select it here and copy it yourself.</p>
            <textarea className="text-input vck-text" readOnly value={phoneText(offers, run)} onFocus={e => e.currentTarget.select()} />
          </>)}
          {clipUrl && (
            <figure className="vck-clip">
              <video src={clipUrl} controls playsInline muted />
              <figcaption className="muted">The last clip, as this phone wrote it — kept only on this page.</figcaption>
            </figure>
          )}
          {run.minutes.length > 0 && (
            <table className="vid-table vck-minutes">
              <thead><tr><th>Minute</th><th>Frames read</th><th>Each</th><th>Battery</th><th>Out of sight</th></tr></thead>
              <tbody>{run.minutes.map(m => <tr key={m.minute}><td>{m.minute}</td><td>{m.samples}</td><td>{m.costMs} ms</td><td>{m.battery !== undefined ? `${m.battery}%` : '—'}</td><td>{m.hidden ? 'yes' : '—'}</td></tr>)}</tbody>
            </table>
          )}
        </section>
      )}
    </div>
  );
}
