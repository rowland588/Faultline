import { useEffect } from 'react';

/** The just-logged confirmation slab, with one-tap Undo. Auto-dismisses. */
export function Toast({ message, onUndo, onDismiss }: {
  message: string; onUndo?: () => void; onDismiss: () => void;
}) {
  useEffect(() => {
    const id = setTimeout(onDismiss, 4500);
    return () => clearTimeout(id);
  }, [message, onDismiss]);

  return (
    <div className="toast" role="status">
      <span className="toast-tick" aria-hidden>✓</span>
      <span className="toast-msg">{message}</span>
      {onUndo && <button className="toast-undo" onClick={onUndo}>Undo</button>}
    </div>
  );
}
