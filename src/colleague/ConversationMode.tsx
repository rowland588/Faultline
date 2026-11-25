import { LunaGlobe } from './LunaGlobe';
/* CONVERSATION MODE — Luna Hall, voice-first, nearly blank (23 November; docs/LUNA-ROOM.md §5 C1; docs/VOICE.md §4).
 *
 * Rowland: whole screen nearly blank, futuristic, minimal chrome — speak only on TV. The same engine as AI Mode and VoiceMode:
 * what is heard goes through the same send(); cards appear as glass overlays, confirmed by voice. Chat reveals the full thread. */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Icon } from '../ui/Icon';
import { Sheet } from '../ui/Sheet';
import { onPulse } from './voice';
import { VOICE_SAID, type VoiceState } from './speech';
import { VoiceSettings } from './VoiceMode';
import type { AudioRoute, VoicePrefs } from './voicePrefs';

export interface ConversationModeProps {
  state: VoiceState;
  title: string;
  heard: string;
  saying: string;
  /** Latest reply for the glass panel — the finished turn's words or what is being said now. */
  reply: string;
  note: string;
  route: AudioRoute;
  prefs: VoicePrefs;
  setPrefs: (p: Partial<VoicePrefs>) => void;
  heardTick: number;
  cardWaiting: boolean;
  card?: ReactNode;
  thread?: ReactNode;
  onTap: () => void;
  onInterrupt: () => void;
  onMute: () => void;
  onChat: () => void;
  onEnd: () => void;
}

const BARS = 24;

export function ConversationMode(p: ConversationModeProps) {
  const orb = useRef<HTMLSpanElement>(null);
  const bars = useRef<HTMLDivElement>(null);
  const level = useRef(0);
  const history = useRef<number[]>(Array(BARS).fill(0));
  const [settings, setSettings] = useState(false);
  const [threadOpen, setThreadOpen] = useState(false);

  const bump = (n: number) => { level.current = Math.min(1, level.current + n); };
  useEffect(() => onPulse(() => bump(0.55)), []);
  useEffect(() => { if (p.heardTick) bump(0.5); }, [p.heardTick]);
  useEffect(() => {
    let raf = 0, last = performance.now(), acc = 0;
    const frame = (t: number) => {
      const dt = Math.min(64, t - last); last = t;
      level.current = Math.max(0, level.current - dt / 520);
      acc += dt;
      if (acc >= 50) { acc = 0; history.current = [...history.current.slice(1), level.current]; }
      const el = orb.current;
      if (el) el.style.setProperty('--lvl', level.current.toFixed(3));
      const b = bars.current;
      if (b) history.current.forEach((v, i) => (b.children[i] as HTMLElement | undefined)?.style.setProperty('--h', Math.max(0.06, v).toFixed(3)));
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || settings) return;
      if (threadOpen) setThreadOpen(false);
      else p.onEnd();
    };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [p, settings, threadOpen]);

  const speaking = p.state === 'speaking' || p.state === 'preparing';
  const live = p.state === 'listening' || p.state === 'transcribing' || p.state === 'interrupted';
  const thinking = p.state === 'processing' || p.state === 'preparing' || p.state === 'initialising' || p.state === 'recovering';
  const said = p.cardWaiting && !speaking
    ? 'Waiting for your word — say “yes, do it” or “not now”'
    : VOICE_SAID[p.state];
  const glassText = (p.reply.trim() || p.saying.trim());
  const showGlass = glassText.length > 0 || !!p.card;
  const words = live ? p.heard : (p.saying.trim() ? p.saying : p.reply);
  const muted = p.state === 'idle';
  const muteIcon = muted ? 'mic' : 'stop';

  const openChat = () => {
    if (p.thread) setThreadOpen(true);
    else p.onChat();
  };

  return (
    <div className="lc" data-luna-conversation data-voice-mode data-voice-state={p.state} role="application" aria-label="Conversation with Luna">
      <header className="lc-top">
        <p className="lc-k"><Icon name="spark" size={14} /> Conversation</p>
        <div className="lc-top-acts">
          <button type="button" className="lc-icon" aria-label="Voice settings" title="Voice settings" onClick={() => setSettings(true)}><Icon name="pencil" size="1.1em" /></button>
          <button type="button" className="lc-icon" onClick={p.onEnd} aria-label="Leave conversation mode" data-conversation-exit><Icon name="close" size="1.15em" /></button>
        </div>
      </header>

      <div className="lc-bg" aria-hidden />

      <div className={`lc-stage${thinking ? ' is-thinking' : ''}`}>
        <button type="button" className="lc-orb-b" onClick={speaking ? p.onInterrupt : p.onTap} aria-label={speaking ? 'Interrupt Luna' : p.state === 'idle' ? 'Talk' : 'Luna is listening'} data-voice-orb>
          <LunaGlobe className="lc-orb vm-orb" size="stage" state={p.state} globeRef={orb} />
        </button>

        <p className="lc-state" role="status" aria-live="polite" data-voice-said>{said}</p>

        <div className={'lc-wave' + (live ? ' is-in' : speaking ? ' is-out' : '')} ref={bars} aria-hidden>
          {Array.from({ length: BARS }, (_, i) => <span key={i} />)}
        </div>

        {live && (
          <p className="lc-heard" data-voice-words>{words || 'Say what you need — pause and Luna answers.'}</p>
        )}

        {showGlass && (
          <div className={'lc-glass' + (glassText ? ' is-in' : '')} data-conversation-glass aria-live="polite">
            {glassText && <p className="lc-glass-words" data-voice-words>{glassText}</p>}
            {p.card}
          </div>
        )}

        {p.note && <p className="lc-note" role="alert" data-voice-note>{p.note}</p>}
      </div>

      <footer className="lc-acts">
        <button type="button" className={'lc-act' + (muted ? ' is-on' : '')} onClick={p.onMute} aria-pressed={muted} data-voice-mute>
          <Icon name={muteIcon} size="1.25em" /><span>{muted ? 'Unmute' : 'Mute'}</span>
        </button>
        <button type="button" className="lc-act is-main" onClick={speaking ? p.onInterrupt : p.onTap} disabled={p.state === 'processing'} data-voice-main>
          <Icon name={speaking ? 'stop' : 'mic'} size="1.35em" /><span>{speaking ? 'Interrupt' : p.state === 'processing' ? 'Thinking…' : live && p.heard.trim() ? 'Done' : live ? 'Listening' : 'Talk'}</span>
        </button>
        <button type="button" className="lc-act" onClick={openChat} data-conversation-chat data-voice-chat><Icon name="list" size="1.25em" /><span>Chat</span></button>
        <button type="button" className="lc-act is-end" onClick={p.onEnd} data-voice-end><Icon name="close" size="1.25em" /><span>End</span></button>
      </footer>

      <p className="lc-cast sub" data-conversation-cast>On a TV: cast or open this address in the room browser — HDMI or Chrome Cast.</p>

      <Sheet open={settings} onClose={() => setSettings(false)} title="Voice settings">
        <VoiceSettings prefs={p.prefs} setPrefs={p.setPrefs} route={p.route} />
      </Sheet>
      {p.thread && (
        <Sheet open={threadOpen} onClose={() => setThreadOpen(false)} title="The conversation">
          <div className="lc-thread">{p.thread}</div>
        </Sheet>
      )}
    </div>
  );
}