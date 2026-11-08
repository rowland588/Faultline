/* THE LOG AS A CALENDAR, DRAWN (calendar.ts says what) — four weeks, Monday first, a cell a day: grey with nothing done, green when the
 * day's checks all passed, red with the count that did not, a day before the log began faded and the days to come empty. Each cell says
 * itself in words on hover and to a screen reader; the sentence under it says the four weeks. */
import type { AgreedLog, LogResult } from '../../lib/study';
import { logCalendar } from './calendar';
import type { LogDef } from './def';

const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const dayWord = (t: number) => new Date(t).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

export function LogCalendar({ log, results, def, now }: { log: AgreedLog; results: readonly LogResult[] | undefined; def: Pick<LogDef, 'scale' | 'scoreRule'>; now: number }) {
  const cal = logCalendar(log, results, def, now);
  const missed = cal.daysWith - cal.daysDone;
  return (
    <section className="lg-cal" aria-label="The last four weeks" data-log-calendar>
      <h2 className="lg-h2">The last four weeks</h2>
      <div className="lg-cal-g" role="grid">
        <div className="lg-cal-r lg-cal-hd" role="row">{DOW.map((d, i) => <span key={i} role="columnheader">{d}</span>)}</div>
        {cal.weeks.map((w, i) => (
          <div key={i} className="lg-cal-r" role="row">
            {w.map(d => {
              const state = d.future ? 'is-future' : d.before ? 'is-before' : d.bad ? 'is-bad' : d.done ? 'is-ok' : 'is-none';
              const said = d.future ? `${dayWord(d.day)} — still to come` : d.before ? `${dayWord(d.day)} — before the log began`
                : d.done ? `${dayWord(d.day)} — ${d.done} done${d.bad ? `, ${d.bad} did not pass` : ', all passed'}` : `${dayWord(d.day)} — nothing done`;
              return (
                <span key={d.day} role="gridcell" className={'lg-cal-d ' + state} title={said} aria-label={said} data-cal-day={new Date(d.day).getDate()}>
                  <span className="lg-cal-n">{new Date(d.day).getDate()}</span>
                  {!d.future && !d.before && d.done > 0 && <span className="lg-cal-c">{d.bad ? `${d.bad}✕` : d.done}</span>}
                </span>
              );
            })}
          </div>
        ))}
      </div>
      <p className="sub lg-cal-say" data-cal-says>{cal.done} done on {cal.daysDone} of {cal.daysWith} {cal.daysWith === 1 ? 'day' : 'days'}{cal.bad ? `, ${cal.bad} did not pass` : ''}{missed > 0 ? `; ${missed} ${missed === 1 ? 'day' : 'days'} with nothing done` : ''}.</p>
      <p className="sub lg-cal-key"><span className="lg-cal-k is-ok" /> all passed · <span className="lg-cal-k is-bad" /> did not pass · <span className="lg-cal-k is-none" /> nothing done</p>
    </section>
  );
}
