/* THE VOICE CONVERSATION — AI Mode's own conversation, spoken (9 November; docs/VOICE.md).
 *
 * Rowland: "a dedicated immersive voice screen … a distinctive central animated visual that communicates the assistant's state …
 * Keep the experience simple." One screen over the conversation, never a second assistant: what is heard goes into the same
 * conversation through the same Send, the reply comes from the same gateway with the same capabilities and is written in the chat
 * as ever; here it is also said. The orb is the state — its colour and movement set by the state the screen holds
 * (colleague/speech voiceStep) and moved by real events only: each piece of words the recogniser gives, each word the phone's voice
 * says (onPulse). Light, as every Faultline screen: no words on a dark fill.
 *
 * Controls: the orb (tap — talk, or interrupt while it speaks), Mute, Interrupt, Chat (back to the text, the conversation kept),
 * End, and the voice settings in a sheet. What the phone cannot do (pick the speaker, listen with the screen off) is said, not
 * offered. */
import { useEffect, useRef, useState } from 'react';
import { Icon } from '../ui/Icon';
import { Sheet } from '../ui/Sheet';
import { onPulse } from './voice';
import { VOICE_SAID, type VoiceState } from './speech';
import { ON_DEVICE_SAID, installOnDevice, onDeviceStatus, useDeviceVoices, type AudioRoute, type OnDevice, type VoicePrefs } from './voicePrefs';

export interface VoiceModeProps {
  state: VoiceState;
  title: string;
  /** What is being heard now (the person's words), or '' */
  heard: string;
  /** What Faultline is saying or last said. */
  saying: string;
  /** A line about something that went wrong or changed (a headset gone, the microphone refused) — '' when none. */
  note: string;
  route: AudioRoute;
  prefs: VoicePrefs;
  setPrefs: (p: Partial<VoicePrefs>) => void;
  /** Bumped by the screen each time the recogniser gives words — the orb moves with the person's voice. */
  heardTick: number;
  /** Whether a card waits for a yes — said, with the words that answer it. */
  cardWaiting: boolean;
  onTap: () => void;
  onInterrupt: () => void;
  onMute: () => void;
  onChat: () => void;
  onEnd: () => void;
}

const BARS = 28;

export function VoiceMode(p: VoiceModeProps) {
  const orb = useRef<HTMLDivElement>(null);
  const bars = useRef<HTMLDivElement>(null);
  const level = useRef(0);
  const history = useRef<number[]>(Array(BARS).fill(0));
  const [settings, setSettings] = useState(false);

  /* the level is raised by events — a word heard, a word said — and falls away between them; the frame only draws it */
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
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape' && !settings) p.onEnd(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [p, settings]);

  const speaking = p.state === 'speaking' || p.state === 'preparing';
  const live = p.state === 'listening' || p.state === 'transcribing' || p.state === 'interrupted';
  const said = p.cardWaiting && !speaking ? 'Waiting for your word — say “yes, do it” or “not now”' : VOICE_SAID[p.state];
  const words = live ? p.heard : p.saying;
  const muted = p.state === 'idle';
  const muteIcon = muted ? 'mic' : 'stop';
  return (
    <div className="vm" data-voice-mode data-voice-state={p.state} role="dialog" aria-modal="true" aria-label="Voice conversation with Luna">
      <header className="vm-top">
        <div className="vm-top-main">
          <p className="vm-eyebrow"><Icon name="spark" size={13} />VOICE</p>
          <p className="vm-title">{p.title}</p>
        </div>
        <button type="button" className="vm-icon" aria-label="Voice settings" title="Voice settings" onClick={() => setSettings(true)}><Icon name="pencil" size="1.15em" /></button>
      </header>

      <div className="vm-stage">
        <button type="button" className="vm-orb-b" onClick={speaking ? p.onInterrupt : p.onTap} aria-label={speaking ? 'Interrupt Luna' : p.state === 'idle' ? 'Talk' : 'Luna is listening'} data-voice-orb>
          <div className={`vm-orb is-${p.state}`} ref={orb} aria-hidden>
            <span className="vm-ring r1" /><span className="vm-ring r2" /><span className="vm-ring r3" />
            <span className="vm-core" />
          </div>
        </button>
        <p className="vm-state" role="status" aria-live="polite" data-voice-said>{said}</p>
        <div className={'vm-wave' + (live ? ' is-in' : speaking ? ' is-out' : '')} ref={bars} aria-hidden>
          {Array.from({ length: BARS }, (_, i) => <span key={i} />)}
        </div>
        <p className={'vm-words' + (live ? ' is-heard' : '')} data-voice-words>{words || (live ? 'Say what you need — pause and Luna answers.' : '')}</p>
        {p.note && <p className="vm-note" role="alert" data-voice-note>{p.note}</p>}
      </div>

      <footer className="vm-acts">
        <button type="button" className={'vm-act' + (p.state === 'idle' ? ' is-on' : '')} onClick={p.onMute} aria-pressed={p.state === 'idle'} data-voice-mute>
          <Icon name={muteIcon} size="1.25em" /><span>{p.state === 'idle' ? 'Unmute' : 'Mute'}</span>
        </button>
        <button type="button" className="vm-act is-main" onClick={speaking ? p.onInterrupt : p.onTap} disabled={p.state === 'processing'} data-voice-main>
          <Icon name={speaking ? 'stop' : 'mic'} size="1.35em" /><span>{speaking ? 'Interrupt' : p.state === 'processing' ? 'Thinking…' : live && p.heard.trim() ? 'Done — answer' : live ? 'Listening' : 'Talk'}</span>
        </button>
        <button type="button" className="vm-act" onClick={p.onChat} data-voice-chat><Icon name="list" size="1.25em" /><span>Chat</span></button>
        <button type="button" className="vm-act is-end" onClick={p.onEnd} data-voice-end><Icon name="close" size="1.25em" /><span>End</span></button>
      </footer>

      <Sheet open={settings} onClose={() => setSettings(false)} title="Voice settings">
        <VoiceSettings prefs={p.prefs} setPrefs={p.setPrefs} route={p.route} />
      </Sheet>
    </div>
  );
}

/** The few settings that matter, each saying what this phone offers. */
export function VoiceSettings({ prefs, setPrefs, route }: { prefs: VoicePrefs; setPrefs: (p: Partial<VoicePrefs>) => void; route: AudioRoute }) {
  const voices = useDeviceVoices();
  const [local, setLocal] = useState<OnDevice>('unknown');
  useEffect(() => { void onDeviceStatus().then(setLocal); }, []);
  const english = voices.filter(v => /^en/i.test(v.lang));
  const shown = english.length ? english : voices;
  return (
    <div className="vm-set" data-voice-settings>
      <label className="vm-set-row">
        <span className="vm-set-k">Luna’s voice</span>
        {shown.length ? (
          <select className="input" value={prefs.voiceURI ?? ''} onChange={e => setPrefs({ voiceURI: e.target.value || undefined })} data-voice-pick>
            <option value="">British English, the phone’s own</option>
            {shown.map(v => <option key={v.uri} value={v.uri}>{v.name} — {v.lang}{v.local ? '' : ' (needs signal)'}</option>)}
          </select>
        ) : <span className="sub">This phone lists no voices yet — Luna uses its default voice.</span>}
      </label>
      <label className="vm-set-row">
        <span className="vm-set-k">How fast it speaks — {prefs.rate.toFixed(2)}×</span>
        <input type="range" min={0.8} max={1.3} step={0.05} value={prefs.rate} onChange={e => setPrefs({ rate: Number(e.target.value) })} data-voice-rate />
      </label>
      <div className="vm-set-row" role="group" aria-label="How long it waits when you pause">
        <span className="vm-set-k">When you pause to think, it waits</span>
        <div className="vm-chips">
          {(['short', 'normal', 'long'] as const).map(k => <button key={k} type="button" className={'chip' + (prefs.pause === k ? ' is-on' : '')} aria-pressed={prefs.pause === k} onClick={() => setPrefs({ pause: k })} data-voice-pause={k}>{k === 'short' ? 'A moment' : k === 'normal' ? 'Two seconds' : 'Longer'}</button>)}
        </div>
      </div>
      <div className="vm-set-row" role="group" aria-label="Talk over Luna">
        <span className="vm-set-k">Talk over Luna while she speaks</span>
        <div className="vm-chips">
          {(['auto', 'on', 'off'] as const).map(k => <button key={k} type="button" className={'chip' + (prefs.talkOver === k ? ' is-on' : '')} aria-pressed={prefs.talkOver === k} onClick={() => setPrefs({ talkOver: k })} data-voice-talkover={k}>{k === 'auto' ? 'With a headset' : k === 'on' ? 'Always' : 'Never — tap to interrupt'}</button>)}
        </div>
        <span className="sub">On the phone’s speaker Luna can hear herself, so tapping is safer; with a headset you can just talk.</span>
      </div>
      <div className="vm-set-row">
        <span className="vm-set-k">Where your words are written down</span>
        <span className="sub" data-voice-ondevice={local}>{ON_DEVICE_SAID[local]}</span>
        {local === 'available' && <label className="vm-tick"><input type="checkbox" checked={prefs.onDevice} onChange={e => setPrefs({ onDevice: e.target.checked })} /> Write them down on the phone itself</label>}
        {local === 'downloadable' && <button type="button" className="btn" onClick={() => void installOnDevice().then(ok => { if (ok) { setLocal('available'); setPrefs({ onDevice: true }); } })}>Fetch the phone’s model</button>}
      </div>
      <div className="vm-set-row">
        <span className="vm-set-k">Where you hear Luna</span>
        <span className="sub" data-voice-route>{route.headset ? `Through ${route.name ?? 'your headset'} — the phone sends Luna’s voice to it.` : route.known ? 'Through the phone — connect a Bluetooth headset and the phone sends Luna’s voice to it.' : 'Through whatever the phone is playing to — a Bluetooth headset when one is connected.'} A web page cannot pick the speaker; the phone decides, as it does for music.</span>
      </div>
      <p className="sub vm-set-limit">Luna listens only while this screen is on and in front. Nothing of your voice is recorded or kept — only the words, in the conversation.</p>
    </div>
  );
}
