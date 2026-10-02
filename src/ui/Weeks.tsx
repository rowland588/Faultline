/* THE WEEKS, ON THE ROW. Materials and Programs each drew their records twice:
 * a week grid to look at ("Are we covered?") and a list to edit ("What is
 * holding us up"). Lean: one thing, one place. The list keeps the grid's
 * picture — every row carries its own strip of weeks, under one head of month
 * and week labels, in the same columns — and the A3 report still prints the
 * grid it always has. */
import type { CSSProperties, ReactNode } from 'react';

export interface WeekCol { start: string; label: string }

const cols = (n: number): CSSProperties => ({ ['--wk' as string]: n });

/** Month and week labels, once, above the list. */
export function WeekHead({ weeks, months, title }: { weeks: WeekCol[]; months: { month: string; span: number }[]; title?: string }) {
  if (!weeks.length) return null;
  return (
    <div className="mt-weeks" style={cols(weeks.length)} aria-hidden>
      {title && <span className="mt-weeks-t">{title}</span>}
      <div className="mt-weeks-months">
        {months.map(m => <span key={m.month} style={{ gridColumn: `span ${m.span}` }}>{m.month}</span>)}
      </div>
      <div className="mt-weeks-wks">
        {weeks.map(w => <span key={w.start}>{w.label}</span>)}
      </div>
    </div>
  );
}

/** One row's strip: the caller draws a cell per week. */
export function WeekStrip({ n, label, children }: { n: number; label: string; children: ReactNode }) {
  return <div className="mt-strip" style={cols(n)} role="img" aria-label={label}>{children}</div>;
}
