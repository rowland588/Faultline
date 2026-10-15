/* WHY THIS NUMBER — any figure opened to what it is made of (docs/upgrade-plan.md
 * F2; the brief: "every number in the UI can be drilled to its source"). The
 * sum in words, the period, how far it can be trusted, and every record behind
 * it, each opening where it lives. Nothing is computed here: the figure comes
 * from the function that made it (lib/intelligence figure). */
import type { Figure } from '../lib/intelligence';
import { nav } from '../state/useRoute';
import { Sheet } from './Sheet';

const day = (t: number) => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

export function WhyNumber({ fig, title, onClose }: { fig: Figure | null; title?: string; onClose: () => void }) {
  return (
    <Sheet open={!!fig} onClose={onClose} title={title ?? 'Why this number'}>
      {fig && (
        <div className="why">
          <p className="why-fig">{fig.text}</p>
          <p className="why-how">{fig.how}</p>
          <p className="sub why-meta">
            {fig.from != null && fig.to != null ? `${day(fig.from)} – ${day(fig.to)}` : ''}
            {fig.confidence ? `${fig.from != null ? ' · ' : ''}${fig.confidence.says}` : ''}
          </p>
          {fig.sources.length > 0 ? (
            <>
              <h3 className="why-h">Made of {fig.sources.length === 1 ? 'one record' : `${fig.sources.length.toLocaleString('en-GB')} records`}</h3>
              <ul className="why-list">
                {fig.sources.slice(0, 200).map(s => (
                  <li key={`${s.kind}:${s.id}`}>
                    {s.href ? <button type="button" className="why-src" onClick={() => { onClose(); setTimeout(() => nav(s.href as string), 60); }}>{s.label} <span aria-hidden>›</span></button> : <span className="why-src">{s.label}</span>}
                  </li>
                ))}
              </ul>
              {fig.sources.length > 200 && <p className="sub">and {(fig.sources.length - 200).toLocaleString('en-GB')} more</p>}
            </>
          ) : <p className="sub">Nothing logged behind it yet.</p>}
        </div>
      )}
    </Sheet>
  );
}

/** A figure with its confidence beside it, opening why. */
export function Metric({ label, fig, sub, onWhy, tone }: { label: string; fig?: Figure; sub?: string; onWhy?: (f: Figure) => void; tone?: 'limit' }) {
  const lvl = fig?.confidence?.level;
  return (
    <button type="button" className={'mx' + (tone === 'limit' ? ' is-limit' : '')} disabled={!fig || !onWhy} onClick={() => fig && onWhy?.(fig)}
      aria-label={`${label}: ${fig?.text ?? 'not known yet'}${fig?.confidence ? ` — ${fig.confidence.says}` : ''}. Why this number`}>
      <span className="mx-l">{label}</span>
      <span className="mx-v">{fig?.text ?? '—'}</span>
      {sub && <span className="mx-s">{sub}</span>}
      {lvl && lvl !== 'solid' && <span className={'mx-c is-' + lvl}>{lvl === 'none' ? 'nothing logged' : lvl === 'thin' ? 'thin data' : 'fair data'}</span>}
    </button>
  );
}
