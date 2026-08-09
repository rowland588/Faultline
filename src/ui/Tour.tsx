/* The first-run walkthrough — the instruction manual, played as a tour. A new
 * invitee signs in and gets walked through the two systems in working order
 * (log → Pareto → drill/actions, then film → pin → snag list) and where the
 * proof lives. Shows once per device (localStorage flag); replayable from the
 * home page. Every picture is the real product. */
import { useEffect, useState } from 'react';

const KEY = 'faultline_tour_v1';
export const tourSeen = (): boolean => { try { return !!localStorage.getItem(KEY); } catch { return true; } };
const markSeen = () => { try { localStorage.setItem(KEY, String(Date.now())); } catch { /* private mode */ } };

const STEPS: Array<{ img: string; title: string; dos: string[] }> = [
  {
    img: 'home', title: 'Welcome to Faultline',
    dos: [
      'You\'ve been invited into a team that logs problems where they happen — and proves they get fixed.',
      'Workspaces are rooms: you see the ones you own or were invited into. Everyone in a room works on the same data.',
      'This takes two minutes. Replay it any time from the home page.',
    ],
  },
  {
    img: 'capture', title: '1 · Log what you see',
    dos: [
      'Open a workspace — you land on Capture.',
      'Tap the machine, then what you saw (Jam, Changeover…).',
      'Put a time on it three ways: ⏱ stopwatch it live, type the minutes, or “Log now” for something that just happened.',
      'No signal on the floor? Log anyway — it syncs itself later.',
    ],
  },
  {
    img: 'pareto', title: '2 · Read the Pareto',
    dos: [
      'Analyse asks the only question that matters: where is the line losing time?',
      'Tallest bar = biggest loss, in hours and pounds.',
      'The dotted 80% line marks the vital few — attack those first.',
    ],
  },
  {
    img: 'drill', title: '3 · Drill in. Raise an action.',
    dos: [
      'Tap a bar to ask why — problem → kind of problem → machine.',
      'When the board shows where the fix goes, tap ⚑ Raise an action: what to do and who owns it.',
      'Actions join the snag list and age publicly until someone closes them.',
    ],
  },
  {
    img: 'asset', title: '4 · Film the walk. Pin the faults.',
    dos: [
      'Snags tab → film the line on your phone, infeed to outfeed.',
      'Scrub the footage and ＋ Mark asset to freeze a machine as a named still.',
      'Tap the still exactly where the fault is — that drops a pin. Give it an owner.',
    ],
  },
  {
    img: 'snaglist', title: '5 · Work the snag list',
    dos: [
      'The snag list is the live register — every pinned fault and every board action in one table.',
      'Tap “Mine” to see your plate. Change status and owner right in the row.',
      'Red rows are stale — open 30+ days. They don\'t hide, that\'s the point.',
    ],
  },
  {
    img: 'report', title: '6 · The proof writes itself',
    dos: [
      'Trend answers “is it getting better?” — a green flag marks the week each fix landed.',
      'Report turns it all into one page — print A4 or A3, or save as PDF for Monday\'s meeting.',
      'Nobody writes reports here. What the floor logged IS the report.',
    ],
  },
];

export function Tour({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [i, setI] = useState(0);
  const close = () => { markSeen(); setI(0); onClose(); };

  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') setI(x => Math.min(x + 1, STEPS.length - 1));
      if (e.key === 'ArrowLeft') setI(x => Math.max(x - 1, 0));
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;
  const s = STEPS[i];
  const last = i === STEPS.length - 1;

  return (
    <div className="tour-scrim" role="dialog" aria-label="How to use Faultline">
      <div className="tour-card">
        <div className="tour-img"><img src={`/guide/${s.img}.png`} alt={s.title} /></div>
        <div className="tour-body">
          <h2 className="tour-title">{s.title}</h2>
          <ul className="tour-list">{s.dos.map((d, k) => <li key={k}>{d}</li>)}</ul>
        </div>
        <div className="tour-foot">
          <button className="linkish tour-skip" onClick={close}>Skip the tour</button>
          <span className="tour-dots" aria-label={`Step ${i + 1} of ${STEPS.length}`}>
            {STEPS.map((_, k) => <i key={k} className={k === i ? 'on' : ''} />)}
          </span>
          <span className="tour-nav">
            {i > 0 && <button className="btn" onClick={() => setI(i - 1)}>‹ Back</button>}
            <button className="btn btn-primary" onClick={() => (last ? close() : setI(i + 1))}>
              {last ? 'Start walking ›' : 'Next ›'}
            </button>
          </span>
        </div>
      </div>
    </div>
  );
}
