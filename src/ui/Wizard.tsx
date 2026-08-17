/* The interactive walkthrough — press here, tap that, save. A spotlight cuts a
 * hole in a dimmed overlay around the REAL control, a card says what to do,
 * and the wizard advances when you actually do it (tap the highlighted button,
 * land on the next screen) — Next is always there as a fallback. Runs once for
 * a new invitee; replayable from the home page. Targets are found by
 * [data-tour] attributes so a styling change can't silently break it. */
import { useEffect, useRef, useState } from 'react';

const KEY = 'faultline_wizard_v1';
export const wizardSeen = (): boolean => { try { return !!localStorage.getItem(KEY); } catch { return true; } };
const markSeen = () => { try { localStorage.setItem(KEY, String(Date.now())); } catch { /* private mode */ } };

/* module store, so Home can start it and it survives route changes */
let active = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(fn => { try { fn(); } catch { /* ignore */ } });

export interface WStep {
  target?: string;                       // [data-tour=…]; absent → centered card
  title: string;
  body: string;
  advance: 'next' | 'click' | { route: RegExp };
  cta?: string;                          // what the fallback button says
}

/* The engine runs SCRIPTS. The invitee walkthrough below is the default; the
 * guided demo (lib/demoTour) passes its own — same spotlights, same
 * do-it-on-screen advancing, different story. */
let steps: WStep[] = [];
export const startWizard = (script?: WStep[]): void => { steps = script ?? STEPS; active = true; emit(); };

const STEPS: WStep[] = [
  {
    target: 'new-ws', title: '1 · Your first workspace',
    body: 'A workspace is a room for one line or one project — its own data, its own team. Tap ＋ New workspace and name it after your line. (Been invited into one? Tap its card instead.)',
    advance: { route: /#\/w\// },
  },
  {
    target: 'cap-fields', title: '2 · Say what you saw',
    body: 'This is Capture — the two questions that matter: which machine, what happened. Tap a machine chip, then the problem. The chips are yours — put your real machines in later via Settings.',
    advance: 'next',
  },
  {
    target: 'log-now', title: '3 · Put a time on it',
    body: '⏱ times it live while you deal with it. ✎ types the minutes. Log now records something that just happened. Tap Log now — that\'s your first observation.',
    advance: 'click',
  },
  {
    target: 'tab-analyse', title: '4 · Open the board',
    body: 'Every log lands on the Pareto the moment you make it. Tap Analyse.',
    advance: { route: /\/analyse/ },
  },
  {
    target: 'board', title: '5 · Read it. Drill it. Act on it.',
    body: 'Tallest bar = biggest loss, in hours and pounds. Tap any bar to ask why — machine, kind of problem, shift. And when the board shows where the fix goes, ⚑ Raise an action puts a name and an age on it.',
    advance: 'next',
  },
  {
    target: 'tab-snags', title: '6 · The walk',
    body: 'The second system: film the line and pin faults to the exact spot on the machine. Tap Snags.',
    advance: { route: /\/(snags|segment|asset|snaglist|walk)/ },
  },
  {
    target: 'film', title: '7 · Film. Mark. Pin.',
    body: 'Film the walk on your phone (or upload videos). Scrub the footage and mark a machine to freeze it as a still, then tap the still exactly where the fault is. Every pin sits on the snag list, ageing, until someone closes it.',
    advance: 'next',
  },
  {
    title: 'You\'re set',
    body: 'That\'s the loop: log → Pareto → action → walk → pin → proof. Trend answers "is it getting better?", Report prints the week on one page — nobody writes anything. Replay this walkthrough any time from the home page.',
    advance: 'next', cta: 'Start walking ›',
  },
];

const PAD = 6;

export function Wizard() {
  const [, force] = useState(0);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const iRef = useRef(i);
  iRef.current = i;

  useEffect(() => {
    const on = () => { setI(0); force(x => x + 1); };
    listeners.add(on);
    return () => { listeners.delete(on); };
  }, []);

  const close = () => { active = false; markSeen(); setI(0); force(x => x + 1); };
  const next = () => { if (iRef.current >= steps.length - 1) close(); else setI(x => x + 1); };

  // track the highlighted control (it may render late, move, or disappear)
  useEffect(() => {
    if (!active) return;
    const step = steps[i];
    let scrolled = false;
    const find = () => {
      const el = step.target ? document.querySelector(`[data-tour="${step.target}"]`) : null;
      if (el && !scrolled) {
        scrolled = true;
        // a target taller than the screen scrolls to its TOP — centering a huge
        // element shows its middle, which reads as random content
        const tall = el.getBoundingClientRect().height > window.innerHeight * 0.6;
        el.scrollIntoView({ block: tall ? 'start' : 'center', behavior: 'smooth' });
      }
      setRect(el ? el.getBoundingClientRect() : null);
    };
    find();
    const iv = setInterval(find, 250);
    window.addEventListener('resize', find);
    return () => { clearInterval(iv); window.removeEventListener('resize', find); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, active ? 1 : 0]);

  // advance when the user actually does the thing — at most ONCE per step
  // (creating a workspace fires two hash changes back-to-back: /w/:id, then
  // the resume redirect; without the guard the wizard would skip a step)
  useEffect(() => {
    if (!active) return;
    const step = steps[i];
    let fired = false;
    const go = () => { if (!fired) { fired = true; setTimeout(next, 450); } };
    if (step.advance === 'click' && step.target) {
      const on = (e: MouseEvent) => {
        if ((e.target as Element | null)?.closest?.(`[data-tour="${step.target}"]`)) go();
      };
      document.addEventListener('click', on, true);
      return () => document.removeEventListener('click', on, true);
    }
    if (typeof step.advance === 'object') {
      const test = () => { if (step.advance instanceof Object && 'route' in step.advance && step.advance.route.test(location.hash)) go(); };
      window.addEventListener('hashchange', test);
      return () => window.removeEventListener('hashchange', test);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, active ? 1 : 0]);

  // keyboard: Escape skips, arrows navigate
  useEffect(() => {
    if (!active) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') setI(x => Math.max(0, x - 1));
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active ? 1 : 0]);

  if (!active || !steps[i]) return null;
  const step = steps[i];
  const last = i === steps.length - 1;
  const doIt = step.advance !== 'next';

  // tooltip placement: under the spotlight if it fits, above if THAT fits —
  // and when the target is taller than the screen (a whole board), pin the
  // card to the bottom of the viewport instead of computing it off-screen.
  const style: React.CSSProperties = {};
  if (rect) {
    const below = rect.bottom + PAD + 12;
    const fitsBelow = below + 220 < window.innerHeight;
    const fitsAbove = rect.top - PAD - 12 - 220 > 0;
    if (fitsBelow) style.top = below;
    else if (fitsAbove) style.bottom = window.innerHeight - rect.top + PAD + 12;
    else style.bottom = window.innerWidth <= 680 ? 88 : 16; // huge target — reachable, clear of the tab bar
    style.left = Math.max(10, Math.min(rect.left, window.innerWidth - 330));
  }

  return (
    <div className="wiz" role="dialog" aria-label="Guided walkthrough">
      {rect
        ? <div className="wiz-spot" style={{ top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 }} />
        : !step.target
          ? <div className="wiz-dim" />
          : null /* target mid-action (e.g. typing the name) — don't darken their work */}
      <div className={'wiz-card' + (rect ? '' : ' wiz-center')} style={rect ? style : undefined}>
        <div className="wiz-title">{step.title}</div>
        <p className="wiz-body">{step.body}</p>
        <div className="wiz-foot">
          <button className="linkish wiz-skip" onClick={close}>Skip the tour</button>
          <span className="wiz-count" aria-hidden>{i + 1}/{steps.length}</span>
          <span className="wiz-dots" aria-label={`Step ${i + 1} of ${steps.length}`}>
            {steps.map((_, k) => <i key={k} className={k === i ? 'on' : ''} />)}
          </span>
          <button className={'btn' + (doIt ? '' : ' btn-primary')} onClick={next}>
            {step.cta ?? (last ? 'Finish ›' : doIt ? 'Next ›' : 'Next ›')}
          </button>
        </div>
        {doIt && <div className="wiz-hint">↑ do it on screen — it moves on by itself</div>}
      </div>
    </div>
  );
}
