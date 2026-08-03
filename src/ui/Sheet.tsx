import { type ReactNode, useEffect } from 'react';

/** A bottom sheet — the switcher, menus, quick edits. Tap the scrim to close. */
export function Sheet({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title?: string; children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="sheet-scrim" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div className="sheet-grip" />
        {title && <div className="sheet-title">{title}</div>}
        {children}
      </div>
    </div>
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
