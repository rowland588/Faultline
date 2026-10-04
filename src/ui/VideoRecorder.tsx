/* In-app rapid video capture. The old flow round-tripped to the OS camera app
 * for every single clip (tap, leave the app, film, return, wait, repeat) — slow,
 * and on some phones (notably iOS Safari once the app is installed to the home
 * screen) the browser never reliably regains control after the camera closes,
 * so the tap silently does nothing. Recording straight from a live getUserMedia
 * stream keeps you on this screen, so the next clip is one more tap away. */
import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';

export function videoCaptureSupported(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';
}

/* Ordered by how widely the RESULT plays back, not by quality. An H.264 MP4
 * opens on anything, including Safari and Windows' default player; a VP9 WebM
 * is Chrome/Firefox only, so a clip filmed on an Android phone would refuse to
 * play on a colleague's Mac. We only fall back to WebM when MP4 isn't offered. */
function pickMimeType(): string | undefined {
  return [
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4;codecs=avc1',
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ].find(m => MediaRecorder.isTypeSupported(m));
}

/* A CLIP HAS TO FIT IN THE CLOUD, or it never leaves this phone. The bucket
 * takes 50 MB a file (Supabase's global limit); a phone's back camera left to
 * itself records 1080p at whatever bitrate it likes — 30 to 60 MB a minute —
 * and a clip over the limit was refused on every pass while the laptop waited
 * for it for ever. So the camera is asked for 720p and the recorder for about
 * 1.5 Mbps of picture and 64 kbps of sound: some 12 MB a minute, still clear
 * enough to read a fault off. And a clip stops itself at four minutes (about
 * 47 MB) — longer than any one thing on a line takes to show, and the next
 * clip starts with one tap. */
const VIDEO = { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30, max: 30 } };
const BITS = { videoBitsPerSecond: 1_500_000, audioBitsPerSecond: 64_000 };
const MAX_CLIP_MS = 4 * 60 * 1000;

const fmtElapsed = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`;

/** Full-screen live camera; each Record→Stop produces one clip via onCapture,
 *  and the preview stays live so the next one starts immediately. */
export function VideoRecorder({ onCapture, onClose }: { onCapture: (blob: Blob) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [clips, setClips] = useState(0);
  const [error, setError] = useState('');
  const [capped, setCapped] = useState(false);

  useEffect(() => {
    let alive = true;
    navigator.mediaDevices.getUserMedia({ video: VIDEO, audio: true })
      .then(stream => {
        if (!alive) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(() => setError("Couldn't open the camera — check the camera permission for this site in your browser settings."));
    return () => {
      alive = false;
      if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  useEffect(() => {
    if (!recording) return;
    const t0 = Date.now();
    const id = window.setInterval(() => {
      setElapsed(Date.now() - t0);
      if (Date.now() - t0 >= MAX_CLIP_MS) { recorderRef.current?.stop(); setRecording(false); setCapped(true); }
    }, 200);
    return () => window.clearInterval(id);
  }, [recording]);

  const start = () => {
    const stream = streamRef.current;
    if (!stream || recording) return;
    chunksRef.current = [];
    const mime = pickMimeType();
    let rec: MediaRecorder;
    try { rec = new MediaRecorder(stream, { ...(mime ? { mimeType: mime } : {}), ...BITS }); }
    catch { rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined); }   // a browser that refuses the bitrates
    setCapped(false);
    rec.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    rec.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: rec.mimeType || mime || 'video/webm' });
      if (blob.size > 0) { onCapture(blob); setClips(c => c + 1); }
    };
    rec.start();
    recorderRef.current = rec;
    setElapsed(0);
    setRecording(true);
  };
  const stop = () => {
    recorderRef.current?.stop();
    setRecording(false);
  };

  return (
    <div className="rec-stage">
      <button className="rec-close" onClick={onClose} aria-label="Close camera"><Icon name="close" size="1.1em" /></button>

      {error ? (
        <div className="rec-error"><p>{error}</p></div>
      ) : (
        <video ref={videoRef} className="rec-preview" autoPlay muted playsInline />
      )}

      {recording && <div className="rec-badge"><span className="rec-dot" aria-hidden />REC {fmtElapsed(elapsed)}</div>}
      {!recording && clips > 0 && <div className="rec-tally">{clips} clip{clips === 1 ? '' : 's'} saved{capped ? ' — that one stopped at 4 minutes, the longest a clip can be' : ''} — keep filming or tap Done</div>}

      <div className="rec-controls">
        {!error && (
          recording
            ? <button className="rec-btn rec-btn-stop" onClick={stop} aria-label="Stop recording" />
            : <button className="rec-btn rec-btn-shutter" onClick={start} aria-label="Start recording" />
        )}
        <button className="btn btn-primary rec-done" onClick={onClose}>{clips > 0 ? `Done · ${clips} clip${clips === 1 ? '' : 's'}` : 'Cancel'}</button>
      </div>
    </div>
  );
}
