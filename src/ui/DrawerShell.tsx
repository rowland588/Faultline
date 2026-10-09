/* THE ONE PANEL (docs/STAGEGATE.md, the backbone rule 2). Every record
 * opens in it — a stage, a test, a fix, a problem — and so do a machine and
 * the stage list on a gate: a panel from the right on a laptop, a sheet from
 * the bottom on a phone (styles.css, "THE DRAWER"). Its × is top right; ×,
 * Escape and the dimmed page around it close it. Moved here from
 * ui/RecordDrawer so the gates' own panels (ui/InstallGrid) can wear it
 * without the two files reading each other.
 *
 * `back`: a panel that is not carried on the URL (a machine, the stage list)
 * answers the back button itself (ui/backCloses); a record is carried on the
 * URL (?open=), and the route closes it. */
import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';
import { useDismiss } from './Sheet';
import { useBackCloses } from './backCloses';

/** The frame every record wears: a panel from the right on a laptop, a sheet
 *  from the bottom on a phone (styles.css, "THE DRAWER"). Escape and × close
 *  it, and so does the dimmed page around it — not the tap that opened it. */
export function DrawerShell({ label, onClose, children, back = false }: { label: string; onClose: () => void; children: ReactNode; back?: boolean }) {
  const dismiss = useDismiss(onClose);
  useBackCloses(back, onClose);
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    /* The keyboard follows the eye into the drawer, and goes back to what
       opened it when it shuts. */
    const opener = document.activeElement as HTMLElement | null;
    panel.current?.focus({ preventScroll: true });
    return () => { document.body.style.overflow = prev; opener?.focus?.({ preventScroll: true }); };
  }, []);
  return createPortal(
    <div className="rd-scrim" {...dismiss}>
      <aside ref={panel} tabIndex={-1} className="rd" role="dialog" aria-modal="true" aria-label={label}>
        <button type="button" className="rd-x" onClick={onClose} aria-label="Close"><Icon name="close" size="1.1em" /></button>
        {children}
      </aside>
    </div>,
    document.body,
  );
}

