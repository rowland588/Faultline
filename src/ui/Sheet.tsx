import { type ReactNode, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Icon, type IconName } from './Icon';

/** A bottom sheet — the switcher, menus, quick edits. Tap the scrim to close.
 *  Rendered via a PORTAL to <body>: a sheet opened from inside the sticky top
 *  bar would otherwise be trapped in that bar's stacking context (z 20) and
 *  sit BELOW the bottom tab bar (z 30) — leaving its lowest rows ("Sign out",
 *  "Delete this workspace") visible but untappable wherever they overlap. */
/** THE SAME WAY OUT OF EVERY SHEET, for the ones that draw their own panel
 *  (the lever tree's Fill from the board, Build the conditions, Add from the
 *  board, Type a list): Escape closes it, and so does a tap on the dimmed
 *  page around it — not a tap inside it, and not the tap that opened it.
 *  Spread the result onto the backdrop element. */
export function useDismiss(onClose: () => void, open = true): { onClick: (e: React.MouseEvent) => void } {
  const openedAt = useRef(Date.now());
  useEffect(() => { if (open) openedAt.current = Date.now(); }, [open]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, open]);
  return { onClick: e => { if (e.target === e.currentTarget && Date.now() - openedAt.current > 450) onClose(); } };
}

export function Sheet({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title?: string; children: ReactNode;
}) {
  /* A SHEET OPENED BY A TAP must not be shut by the same tap. On a phone the
     click that follows a touch lands where the finger was — and the sheet's
     scrim is now under it — so a shape drawn with a tap opened its naming
     sheet and closed it in the same instant. Taps in the first moment after
     opening are not taken as "close". */
  const openedAt = useRef(0);
  useEffect(() => { if (open) openedAt.current = Date.now(); }, [open]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; // lock the page behind the sheet
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prevOverflow; };
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className="sheet-scrim" onClick={() => { if (Date.now() - openedAt.current > 450) onClose(); }}>
      <div className="sheet" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="sheet-grip" />
        {title && <div className="sheet-title">{title}</div>}
        {children}
      </div>
    </div>,
    document.body,
  );
}

/** A tappable row inside a sheet. */
export function SheetRow({ label, hint, danger, icon, onClick }: {
  label: string; hint?: string; danger?: boolean; icon?: IconName; onClick: () => void;
}) {
  return (
    <button type="button" className={'sheet-row' + (danger ? ' danger' : '')} onClick={onClick}>
      <span>{icon && <><Icon name={icon} size="1.15em" /> </>}{label}</span>
      {hint && <span className="sheet-row-hint">{hint}</span>}
    </button>
  );
}
