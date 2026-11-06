import type { ReactNode } from 'react';

/** Honest empties — say what's missing and what to do, never a blank screen. */
export function EmptyState({ icon, title, children, action, className }: {
  icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode;
  /** Extra classes on the splash. `blank-list` is a high-traffic list with nothing in it. */
  className?: string;
}) {
  return (
    <div className={'empty' + (className ? ' ' + className : '')}>
      {icon && <div className="empty-ic" aria-hidden>{icon}</div>}
      <div className="empty-title">{title}</div>
      {children && <p className="empty-sub">{children}</p>}
      {action && <div className="empty-action">{action}</div>}
    </div>
  );
}
