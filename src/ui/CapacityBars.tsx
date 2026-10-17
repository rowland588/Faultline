/* WHAT EACH STATION CAN DO — in the line's unit a minute, the plain way round
 * (Rowland, 16 October: "the graphs make no sense"). A bar a station, longest
 * the one with most to spare; the line drawn through them at what the line
 * actually makes, so the one it stops at is the bottleneck; the target dashed
 * beside it — red only when the line cannot reach it (visual rule 1). One
 * group a line when several feed in (one for every line when they are alike),
 * then where they merge, its first bar what the lines send. Colours are the
 * V's (lib/capacity shareColours): the bottleneck graphite, the rest lighter the
 * more they have to spare — every figure in words beside its bar. A tap
 * opens the station. Reads lib/capacityFlow. */
import { shareColours } from '../lib/capacity';
import { barGroups, perMinWords, type FlowModel } from '../lib/capacityFlow';

export function CapacityBars({ m, onPick }: { m: FlowModel; onPick?: (index: number) => void }) {
  const groups = barGroups(m);
  if (!groups.some(g => g.rows.length)) return null;
  return (
    <div className="cxb">
      {groups.map(g => {
        const vals = [...g.rows.map(x => x.perMin ?? 0), g.ref ?? 0, g.target ?? 0];
        const scale = Math.max(1, ...vals) * 1.06;
        const at = (v: number) => `${Math.min(100, (v / scale) * 100)}%`;
        const short = g.target != null && g.ref != null && g.ref < g.target - 1e-9;
        return (
          <section key={g.key} className="cxb-g" aria-label={g.title}>
            <div className="cxb-h">
              <b>{g.title}</b>
              <span className="cxb-hs">
                {g.refSays && <span className="cxb-ref-l">{g.refSays} {m.unit}/min</span>}
                {g.target != null && <span className={'cxb-tg-l' + (short ? ' is-short' : '')}>target {perMinWords(g.target)}{g.ref != null ? (short ? ` — ${perMinWords(g.target - g.ref)} short` : ' — met') : ''}</span>}
              </span>
            </div>
            <div className="cxb-rows">
              {g.rows.map(x => {
                const v = x.perMin;
                const pct = v != null && g.ref ? (v / g.ref) * 100 : 100;
                const [deep, light] = x.isInflow ? ['#8a999e', '#c4cdd0'] : shareColours(pct, x.isLimit, false);
                const words = v == null ? 'no speed yet'
                  : x.isInflow ? `${perMinWords(v)} arrive`
                    : x.isLimit ? `${perMinWords(v)} — the bottleneck`
                      : x.isOwnLimit ? `${perMinWords(v)} — sets this line’s pace`
                        : g.ref != null && v - g.ref > 0.05 ? `${perMinWords(v)} — ${perMinWords(v - g.ref)} to spare` : perMinWords(v);
                const open = onPick && x.index >= 0;
                const Row = open ? 'button' : 'div';
                return (
                  <Row key={x.id} {...(open ? { type: 'button' as const, onClick: () => onPick(x.index) } : {})}
                    className={'cxb-row' + (x.isLimit ? ' is-limit' : '') + (x.isInflow ? ' is-inflow' : '') + (v == null ? ' is-none' : '')}
                    aria-label={`${x.name}: ${words}`}>
                    <span className="cxb-n" title={x.name}>{x.name}</span>
                    <span className="cxb-track">
                      {v != null && <i className="cxb-bar" style={{ width: at(v), background: `linear-gradient(90deg, ${deep}, ${light})` }} />}
                      {g.ref != null && <span className="cxb-ref" style={{ left: at(g.ref) }} aria-hidden />}
                      {g.target != null && <span className={'cxb-tg' + (short ? ' is-short' : '')} style={{ left: at(g.target) }} aria-hidden />}
                    </span>
                    <span className="cxb-v">{words}</span>
                  </Row>
                );
              })}
            </div>
          </section>
        );
      })}
      <p className="cxb-key"><span className="cxb-k-ref" aria-hidden /> what the line actually makes — the bar that ends on it is the bottleneck <span className="cxb-k-tg" aria-hidden /> the target</p>
    </div>
  );
}
