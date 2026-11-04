/* The card a phone sees first on Line capacity (capacityGlance — Rowland, 4 November: "it's a user interface which is confusing me"): how fast, against what, what holds
 * it, each station in words with the limit marked, the one thing to do, and one button for the workings (the set-up, the drawings, the sums). */
import type { Glance } from './capacityGlance';

export function CapacityGlance({ g, open, onToggle }: { g: Glance; open: boolean; onToggle: () => void }) {
  return (
    <section className={'cg is-' + g.state} aria-label="Line capacity at a glance" data-glance>
      <div className="cg-top">
        <div className="cg-fig"><span className="cg-k">THE LINE MAKES</span><b className="cg-v">{g.makes ?? '—'}</b></div>
        {g.target && <div className="cg-fig"><span className="cg-k">IT SHOULD MAKE</span><b className="cg-v">{g.target}</b></div>}
      </div>
      <p className={'cg-against' + (g.state === 'short' ? ' is-r' : '')}>{g.against}{g.heldBy ? <> · held by <b>{g.heldBy}</b></> : null}</p>
      {g.rows.length > 0 && (
        <ol className="cg-rows" aria-label="The stations in order">
          {g.rows.map(x => (
            <li key={x.name} className={x.holds ? 'is-limit' : ''}>
              <span className="cg-n">{x.name}{x.holds && <em className="cg-tag">holds the line</em>}</span>
              <span className="cg-s">{x.speed}</span>
              <span className="cg-c">can do {x.can}</span>
            </li>
          ))}
        </ol>
      )}
      {g.fix && <p className="cg-fix"><span className="cg-k">WHAT WOULD FIX IT</span>{g.fix}</p>}
      <button type="button" className="btn cg-btn" aria-expanded={open} onClick={onToggle}>{open ? 'Hide the workings' : 'Show the workings and set-up'}</button>
    </section>
  );
}
