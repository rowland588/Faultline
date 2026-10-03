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

/* ON A PHONE EVERY CARD STARTS SHUT. Rowland: "on the laptop it's fine …
   on the phone it's too much information, I can't see anything." Shut, the
   Overview is the verdict and one line per card — the whole job on one
   screen — and a tap opens the one you want. Once somebody has opened or
   shut a card, that choice wins, on that device. */
const phone = (): boolean => {
  try { return window.matchMedia('(max-width: 640px)').matches; } catch { return false; }
};

function read(id: string, start: boolean): boolean {
  try {
    const v = localStorage.getItem(KEY + id);
    return v == null ? start : v === '1';
  } catch { return start; }
}

/** Open a card before arriving at it — the same stored choice a tap makes.
 *  For a door that lands on one card of another page. */
export function openFold(id: string): void {
  try { localStorage.setItem(KEY + id, '1'); } catch { /* fine */ }
}

export function Fold({ id, title, says, start = true, need = false, children }: {
  id: string;
  title: string;
  /** What the card would tell you if you opened it, in one line. */
  says?: ReactNode;
  /** Open the first time, before anybody has chosen. */
  start?: boolean;
  /** The next thing to do is inside — open even on a phone, until somebody
   *  chooses. A new project's Lines card, the one its Create button sent you
   *  to, was shut on a phone with "none yet" on it. */
  need?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(() => read(id, need || (start && !phone())));
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
