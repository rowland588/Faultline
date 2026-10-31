/* NEXT, UNDER THE ANSWER — the hand-over a tool's answer asks for (lib/handOvers; docs/TOOLS-WORLDS.md W2): one quiet line, the
 * reason, and one button that opens the same sheet as More ▾ › Use these readings in…, already on the right tool. Nothing here
 * starts a study by itself, and when no rule applies it draws nothing. */
import { useState } from 'react';
import { handOverFor } from '../lib/handOvers';
import { SHARE_WORDS } from '../lib/sharedReadings';
import type { ToolStudy } from '../lib/study';
import { ShareReadings } from './ShareReadings';

export function NextStep({ s, canEdit }: { s: ToolStudy; canEdit: boolean }) {
  const [open, setOpen] = useState(false);
  const h = canEdit ? handOverFor(s) : undefined;
  if (!h) return null;
  return (
    <div className="ns-row" data-next-step={h.target}>
      <p className="ns-says"><b>Next</b> · {h.says} <span className="sub">{h.because}</span></p>
      <button type="button" className="btn ns-go" onClick={() => setOpen(true)}>{SHARE_WORDS[h.target].action} ›</button>
      {open && <ShareReadings s={s} initial={h.target} onClose={() => setOpen(false)} />}
    </div>
  );
}
