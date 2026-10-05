/* THE FISHBONE PAGE'S PANELS — tap in, come out (docs/SIXM.md, "The fishbone
 * page — its own place"). Rowland, 5 October: "I can click, I go in, I come
 * out." The fish is the page; what you tap opens beside it on a laptop (the
 * fish stays where it is) and as a sheet from the bottom on a phone:
 *
 *   a cause      → CausePanel: that chain's WHY and FIX, in the problem card's
 *                  own words and controls (ui/ProblemCard ChainWhy, ChainFix);
 *   the problem  → ProblemPanel: the problem card itself, its chains left on
 *                  the fish — Problem with Is / Is not in full, Ask why, Fix,
 *                  Did it work with close / hold / reopen, Checked today, the
 *                  old whys to put on a bone, and Remove this problem;
 *   the Pareto   → ParetoDrawer: "Where the time goes" (ui/ParetoPane), pinned
 *                  on the left of a laptop, a sheet on a phone.
 *
 * WHICH RECORD: nothing new — the problem is a Case, a chain a Cause on it, a
 * fix an action on the board (pace_todos, causeRef). Every write goes through
 * the callbacks the page already had; the panels only decide where the words
 * sit. WHERE IT SHOWS: the fishbone page; the client report prints the same
 * four parts beside each fish (lib/report), unchanged. Access: a client reads
 * every panel and is offered no button (the parts check can.edit / can.agree
 * / can.remove themselves). */
import { useEffect, useId, type ReactNode } from 'react';
import type { Can } from '../lib/access';
import type { ProblemView } from '../lib/problems';
import type { PaceAction } from '../lib/tracker';
import type { Case } from '../types';
import { sixmLabel, type Cause } from '../lib/sixm';
import type { VoiceContext } from '../../api/voice';
import { ChainFix, ChainWhy, ProblemCard, type ProblemCardProps } from './ProblemCard';
import { ParetoPane } from './ParetoPane';
import { isRoot, STATUS_WORD } from './fishbone/layout';
import { Sheet } from './Sheet';

/* --------------------------------- the frame --------------------------------- */

/** A sheet of the house kind is open above the page (the cause sheet, the
 *  action editor, the hold sheet): Escape is theirs, not the panel's. */
const sheetAbove = (): boolean => !!document.querySelector('.sheet-scrim');

/** One panel's frame: beside the fish on a laptop, a bottom sheet on a phone.
 *  Escape and ✕ close it; on a phone a tap on the dimmed page does too. */
export function PanelFrame({ wide, kicker, title, onClose, children }: {
  wide: boolean; kicker: string; title: string; onClose: () => void; children: ReactNode;
}) {
  const id = useId();
  useEffect(() => {
    if (!wide) return;   // the house Sheet keeps its own Escape
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !sheetAbove()) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [wide, onClose]);
  const head = (
    <header className="frp-h">
      <div className="frp-h-main">
        <p className="frp-k">{kicker}</p>
        <h2 className="frp-t" id={id}>{title}</h2>
      </div>
      <button type="button" className="frp-x" aria-label="Close" onClick={onClose}>✕</button>
    </header>
  );
  if (!wide) {
    return (
      <Sheet open onClose={onClose}>
        <div className="frp is-sheet" aria-labelledby={id}>{head}<div className="frp-body">{children}</div></div>
      </Sheet>
    );
  }
  return (
    <aside className="frp" role="complementary" aria-labelledby={id}>
      {head}
      <div className="frp-body">{children}</div>
    </aside>
  );
}

/* --------------------------------- a cause --------------------------------- */

export interface CausePanelProps {
  wide: boolean;
  view: ProblemView;
  /** Undefined: the address names a cause that is not on this problem. */
  cause?: Cause;
  can: Can;
  voiceContext: () => VoiceContext;
  newId: () => string;
  /** The cause sheet — the one place a chain's whys are edited. */
  onEdit: (c: Cause) => void;
  onSaveCause: (c: Cause) => Promise<void>;
  onAddFix: (c: Cause) => void;
  onOpenFix: (a: PaceAction) => void;
  onClose: () => void;
}

/** A CAUSE, OPENED: its bone and how sure we are, then its WHY and its FIX. */
export function CausePanel(p: CausePanelProps) {
  const { wide, view: v, cause: c, can, onClose } = p;
  if (!c) {
    return (
      <PanelFrame wide={wide} kicker="A cause" title="Not on this problem" onClose={onClose}>
        <p className="sub frp-gone" role="status">That cause isn’t on “{v.problem.title}” any more — it was removed, or the link is from another problem.</p>
      </PanelFrame>
    );
  }
  const root = isRoot(c);
  const kicker = [sixmLabel(c.m), STATUS_WORD[c.status], root ? 'the root' : ''].filter(Boolean).join(' · ');
  const from = [c.source?.label, c.by ? `put on by ${c.by}` : ''].filter(Boolean).join(' · ');
  return (
    <PanelFrame wide={wide} kicker={kicker} title={c.text.trim() || 'A cause with no words yet'} onClose={onClose}>
      {from && <p className="frp-from">From {from}</p>}
      {/* No state colour on the frame: a root found is not "done" — the
          fixes' own states say what is late. */}
      <div className="frp-parts">
        <ChainWhy view={v} c={c} can={can} voiceContext={p.voiceContext} newId={p.newId}
          onOpenCause={() => p.onEdit(c)} onSaveCause={p.onSaveCause} />
        <ChainFix view={v} c={c} can={can} onAddFix={() => p.onAddFix(c)} onOpenFix={p.onOpenFix} />
      </div>
    </PanelFrame>
  );
}

/* -------------------------------- the problem -------------------------------- */

/** THE PROBLEM, OPENED — the problem card with its chains left on the fish. */
export function ProblemPanel({ wide, onPanelClose, ...card }: ProblemCardProps & { wide: boolean; onPanelClose: () => void }) {
  return (
    <PanelFrame wide={wide} kicker="The problem" title={card.view.problem.title.trim() || 'The problem'} onClose={onPanelClose}>
      <ProblemCard {...card} chainsOnFish />
    </PanelFrame>
  );
}

/* --------------------------------- the Pareto --------------------------------- */

/** "WHERE THE TIME GOES" — the Pareto on the left of a laptop, pinned open
 *  unless this device tucked it away; tucked, it is a thin edge tab that
 *  brings it back. On a phone it is a sheet, opened from the page's bar. */
export function ParetoDrawer({ wide, shown, projectId, lineId, selected, onOpen, onTuck, onShow, onClose }: {
  wide: boolean; shown: boolean; projectId: string; lineId?: string; selected?: Case;
  onOpen: (problemId: string) => void;
  /** Laptop: tuck it to its edge. */
  onTuck: () => void;
  /** Laptop: the edge tab pressed. */
  onShow: () => void;
  /** Phone: the sheet closed. */
  onClose: () => void;
}) {
  if (!wide) {
    if (!shown) return null;
    return (
      <Sheet open onClose={onClose}>
        <div className="frd is-sheet">
          <ParetoPane projectId={projectId} lineId={lineId} selected={selected} onOpen={id => { onClose(); onOpen(id); }} />
        </div>
      </Sheet>
    );
  }
  if (!shown) {
    return (
      <button type="button" className="frd-edge" onClick={onShow} aria-label="Where the time goes — show the Pareto">
        <span>Where the time goes</span>
      </button>
    );
  }
  return (
    <aside className="frd" aria-label="Where the time goes">
      <button type="button" className="frd-tuck" onClick={onTuck} aria-label="Tuck the Pareto away">‹ Tuck away</button>
      <ParetoPane projectId={projectId} lineId={lineId} selected={selected} onOpen={onOpen} />
    </aside>
  );
}
