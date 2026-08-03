import type { ReactNode } from 'react';

/** Honest empties — say what's missing and what to do, never a blank screen. */
export function EmptyState({ icon, title, children, action }: {
  icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode;
}) {
  return (
    <div className="empty">
      {icon && <div className="empty-ic" aria-hidden>{icon}</div>}
      <div className="empty-title">{title}</div>
      {children && <p className="empty-sub">{children}</p>}
      {action && <div className="empty-action">{action}</div>}
    </div>
  );
}
