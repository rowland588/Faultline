import { useEffect } from 'react';

/** The just-logged confirmation slab, with one-tap Undo. Auto-dismisses. */
export function Toast({ message, onUndo, onDismiss, ms = 4500 }: {
  message: string; onUndo?: () => void; onDismiss: () => void;
  /** How long it stays. An undo for a delete gets longer than a logged stop:
   *  it takes a moment to realise the wrong thing went. */
  ms?: number;
}) {
  useEffect(() => {
    const id = setTimeout(onDismiss, ms);
    return () => clearTimeout(id);
  }, [message, onDismiss, ms]);

  return (
    <div className="toast" role="status">
      <span className="toast-tick" aria-hidden>✓</span>
      <span className="toast-msg">{message}</span>
      {onUndo && <button className="toast-undo" onClick={onUndo}>Undo</button>}
    </div>
  );
}
