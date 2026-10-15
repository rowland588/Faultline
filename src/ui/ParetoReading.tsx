/* THE PARETO, READ — under the chart, each of the biggest bars said for what it
 * is (docs/upgrade-plan.md, L): chronic or a one-off, and whether it is on the
 * constraint — the time that costs output — or, off it, the mirage: fixing it
 * makes no more on its own (Goldratt). Reads the bars' own stops and the
 * line's bottleneck (lib/lineLoss neckOf, from Line capacity). Writes nothing. */
import type { Observation } from '../types';
import type { Neck } from '../lib/lineLoss';
import { machineKey } from '../lib/lineRecords';
import { recurrence, stopMinutes, WHOLE_LINE } from '../lib/intelligence';
import { fmtDurationWords } from '../lib/format';

export function ParetoReading({ rows, now, neck }: { rows: { key: string; obs: Observation[] }[]; now: number; neck?: Neck }) {
  const necks = new Set((neck?.names ?? []).map(machineKey));
  /* a stop of the whole line stops the constraint with it */
  const onNeck = (o: Observation) => necks.has(machineKey(o.asset)) || WHOLE_LINE.test(o.asset.trim().toLowerCase());
  const top = rows.slice(0, 6).map(r => {
    const min = stopMinutes(r.obs);
    const onMin = stopMinutes(r.obs.filter(onNeck));
    return { ...r, min, onMin, rec: recurrence(r.obs, now) };
  }).filter(r => r.min > 0);
  if (!top.length) return null;
  const all = rows.flatMap(r => r.obs);
  const total = stopMinutes(all), onTotal = stopMinutes(all.filter(onNeck));
  const names = neck?.names.join(' and ') ?? '';
  return (
    <section className="prd" aria-label="The Pareto, read">
      <p className="prd-says">
        {!neck?.names.length
          ? <>Where the line is held is not known — work out its Line capacity to see which of these losses cost output.</>
          : onTotal <= 0
            ? <><b>None of this lost time is on the constraint</b> (the {names}): fixing any of it makes no more on its own, unless it starves or blocks the {names}. The prize is at the {names}.</>
          : <><b>{Math.round((onTotal / total) * 100)}% of this lost time is on the constraint</b> (the {names}) — {fmtDurationWords(onTotal * 60_000)}: that is the time that costs output. The other {fmtDurationWords((total - onTotal) * 60_000)} makes no more when fixed, unless it starves or blocks the {names}.</>}
      </p>
      <ul className="prd-rows">
        {top.map(r => {
          const share = r.min > 0 ? r.onMin / r.min : 0;
          const on = neck?.names.length ? share >= 0.5 : undefined;
          return (
            <li key={r.key} className={'prd-row' + (on ? ' is-on' : on === false ? ' is-off' : '')}>
              <b className="prd-k">{r.key}</b>
              <span className={'prd-rec is-' + r.rec.kind}>{r.rec.says}</span>
              <span className="prd-c">{on == null ? '' : on ? `on the constraint${share < 0.99 ? ` (${Math.round(share * 100)}%)` : ''}` : 'not the constraint — fixing it makes no more'}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
