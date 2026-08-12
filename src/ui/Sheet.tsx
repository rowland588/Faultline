import { type ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';

/** A bottom sheet — the switcher, menus, quick edits. Tap the scrim to close.
 *  Rendered via a PORTAL to <body>: a sheet opened from inside the sticky top
 *  bar would otherwise be trapped in that bar's stacking context (z 20) and
 *  sit BELOW the bottom tab bar (z 30) — leaving its lowest rows ("Sign out",
 *  "Delete this workspace") visible but untappable wherever they overlap. */
export function Sheet({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title?: string; children: ReactNode;
}) {
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
    <div className="sheet-scrim" onClick={onClose}>
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
export function SheetRow({ label, hint, danger, onClick }: {
  label: string; hint?: string; danger?: boolean; onClick: () => void;
}) {
  return (
    <button type="button" className={'sheet-row' + (danger ? ' danger' : '')} onClick={onClick}>
      <span>{label}</span>
      {hint && <span className="sheet-row-hint">{hint}</span>}
    </button>
  );
}
