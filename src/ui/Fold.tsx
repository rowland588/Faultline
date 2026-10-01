/* A CARD THAT FOLDS — its title and one line saying what is inside, always;
 * the rest when you want it.
 *
 * Rowland: "The project dashboard is very busy, hard to see, nothing
 * collapses." Every card on the Overview was open all the time, and the plan
 * alone ran to forty rows on a job with sixteen programs. Folded, a card is
 * still an answer — "2 at Commission · 1 at Install", "19 of 25 done" — so
 * closing it never hides what the job is doing, only the detail.
 *
 * Which cards are open is remembered on this device, per card rather than per
 * job: somebody who closes the plan wants it closed on every job. A
 * convenience, never something that has to survive — see CLAUDE.md on
 * browser storage. The client report is not affected: it prints everything. */
import { useState, type ReactNode } from 'react';

const KEY = 'faultline.fold.';

function read(id: string, start: boolean): boolean {
  try {
    const v = localStorage.getItem(KEY + id);
    return v == null ? start : v === '1';
  } catch { return start; }
}

export function Fold({ id, title, says, start = true, children }: {
  id: string;
  title: string;
  /** What the card would tell you if you opened it, in one line. */
  says?: ReactNode;
  /** Open the first time, before anybody has chosen. */
  start?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(() => read(id, start));
  const toggle = () => setOpen(o => {
    try { localStorage.setItem(KEY + id, o ? '0' : '1'); } catch { /* fine */ }
    return !o;
  });
  return (
    <section className={'fold' + (open ? ' is-open' : '')} data-fold={id}>
      <button type="button" className="fold-h" aria-expanded={open} onClick={toggle}>
        <span className="fold-t">{title}</span>
        {says != null && <span className="fold-s">{says}</span>}
        <span className="fold-chev" aria-hidden />
      </button>
      {open && <div className="fold-b">{children}</div>}
    </section>
  );
}
