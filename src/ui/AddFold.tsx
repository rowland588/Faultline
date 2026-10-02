/* AN ADD FORM, FOLDED TO ONE ROW. Materials, Programs, Numbers and Notes each
 * opened with their add form at the top, pushing the list down the page on
 * every visit. Lean: the tools come out where the work is. The form is one
 * "+ Add …" row until it is wanted — and open from the start when the list is
 * empty, because then adding is the work. */
import { useState, type ReactNode } from 'react';

export function AddFold({ label, start = false, children }: { label: string; start?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(start);
  if (!open) {
    return (
      <button type="button" className="cw-add add-fold-b" onClick={() => setOpen(true)}>
        <span className="cw-add-p" aria-hidden>+</span> {label}
      </button>
    );
  }
  return (
    <div className="add-fold">
      {children}
      <button type="button" className="cw-link add-fold-x" onClick={() => setOpen(false)}>Close</button>
    </div>
  );
}
