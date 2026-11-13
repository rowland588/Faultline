/* THE LINE, MACHINE BY MACHINE — a tour a senior stakeholder reads in
 * seconds (docs/upgrade-plan.md, P; the brief: "this is your line, these are
 * your assets, these are the things wrong with them"). The factory's machines
 * in flow order, each a card: its picture (its newest problem's photo), the
 * problems open on it by priority with whose they are, what its stops cost a
 * week (idle labour; and at the constraint, output too), and the constraint
 * said where it is. One sentence over all of it. Every card opens the
 * machine's own page (line/LineMachineScreen) — its problems there, each one
 * tap to the register, with its programs, studies and stops (Rowland, 27
 * October: "I don't see your machine page"); until then a card opened its
 * problems alone, as a machine not on the line's list still does. Reads only;
 * writes nothing. */
import { useMemo } from 'react';
import type { Observation, Workspace } from '../types';
import type { Snag } from '../snag/types';
import type { Standard } from '../tools/linestandard/standard';
import type { SnagRow } from '../lib/snagsReport';
import type { Asset } from '../lib/testing';
import { MachineImg } from './MachinePicture';
import { hasLabour, labourPerMs, fmtGBP } from '../lib/cost';
import { lineConstraint, onConstraint, stopMinutes, between, WEEK } from '../lib/intelligence';
import { machineKey } from '../lib/lineRecords';
import { nav } from '../state/useRoute';

const WEEKS = 4;
const PRIO: Record<string, number> = { critical: 0, high: 1, low: 2 };
const PRIO_WORD: Record<string, string> = { critical: 'Critical', high: 'High', low: 'Low' };
/* the register's own RAG tag (Rowland, 12 October: priority is RAG, always with its word) */
const PRIO_CLASS: Record<string, string> = { critical: 'is-r', high: 'is-a', low: 'is-g' };

export function LineTour({ line, machines, records, rows, obs, standards }: {
  line: Workspace; machines: string[];
  /** The machines' records, in the same order — a machine's own picture is on its record (lib/machinePicture). */
  records?: (Asset | undefined)[]; rows: SnagRow[]; snags?: Snag[]; obs: Observation[]; standards: Standard[];
}) {
  const now = Date.now();
  const constraint = useMemo(() => lineConstraint(standards.filter(s => !s.deletedAt).map(s => ({ product: s.product, capacity: s.capacity }))), [standards]);
  const perMin = hasLabour(line) ? labourPerMs(line) * 60_000 : 0;
  /* THE LINE'S MACHINES, AND ONLY THEM — its list in the factory's flow order (lib/lineRecords machinesOnLine).
     Until 27 October the tour added every name a capacity station, a stop or a problem used, and Line 2a's two
     machines read as six — its Line capacity's p60, wrapper, bagger and packer counted as machines (Rowland: "it
     says line 2A actually has six machines on it. It doesn't."). A station stays Line capacity's; a problem or a
     stop on a name that is not one of its machines is said as on no machine. */
  const names = useMemo(() => {
    const out: string[] = [], seen = new Set<string>();
    for (const n of machines) { const t = n.trim(); const k = machineKey(t); if (t && !/^(whole line|the line|line|no machine named)$/i.test(t) && !seen.has(k)) { seen.add(k); out.push(t); } }
    return out;
  }, [machines]);
  const cards = useMemo(() => {
    const recent = between(obs, now - WEEKS * WEEK, now);
    return names.map(name => {
      const k = machineKey(name);
      const mine = rows.filter(r => r.machine && machineKey(r.machine) === k).sort((a, b) => PRIO[a.priority] - PRIO[b.priority]);
      const record = machines.map((n, i) => (machineKey(n) === k ? records?.[i] : undefined)).find(Boolean);
      const minWeek = stopMinutes(recent.filter(o => machineKey(o.asset) === k)) / WEEKS;
      const on = onConstraint(name, constraint).on;
      return { name, mine, record, minWeek, on };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `now` by the render
  }, [names, machines, records, rows, obs, constraint]);
  /* a machine on the line's list has a page of its own; one only a stop, a station or a problem names opens its problems */
  const listed = new Set(machines.map(machineKey));
  /* where a card's name and its Open machine go: the machine's page, or — for a name only a problem or a stop uses — its problems */
  const way = (c: { name: string; mine: SnagRow[] }) => (listed.has(machineKey(c.name))
    ? `/lines/${encodeURIComponent(line.id)}/machine/${encodeURIComponent(c.name)}`
    : `/snags?line=${encodeURIComponent(line.id)}${c.mine[0] ? `&open=${encodeURIComponent(c.mine[0].id)}` : ''}`);
  const open = rows.length, crit = rows.filter(r => r.priority === 'critical').length, late = rows.filter(r => r.late).length;
  const worst = [...cards].sort((a, b) => b.mine.length - a.mine.length || b.minWeek - a.minWeek)[0];
  const placed = new Set(cards.flatMap(c => c.mine.map(r => r.id)));
  const loose = rows.filter(r => !placed.has(r.id)).length;
  const stoppy = [...cards].sort((a, b) => b.minWeek - a.minWeek)[0];
  /* a line with no machines named says so, and where they are named — never a station or a stop standing in for one */
  if (!names.length) {
    return (
      <section className="pl-sec tour" aria-label="The line, machine by machine">
        <div className="pl-sec-h"><h2>The line, machine by machine</h2></div>
        <div className="empty blank-list">
          <div className="tour-says empty-title">{`${line.name}: no machines named yet, ${open ? `${open} problem${open === 1 ? '' : 's'} open${crit ? ` (${crit} critical)` : ''}${late ? `, ${late} late` : ''}` : 'nothing open'}.`}</div>
          <div className="empty-action">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => nav(`/lines/${encodeURIComponent(line.id)}?view=machines`)}>Name its machines ›</button>
          </div>
        </div>
      </section>
    );
  }
  const says = [
    `${line.name}: ${names.length} machine${names.length === 1 ? '' : 's'}, ${open ? `${open} problem${open === 1 ? '' : 's'} open${crit ? ` (${crit} critical)` : ''}${late ? `, ${late} late` : ''}` : 'nothing open'}.`,
    worst && worst.mine.length > 1 ? `${worst.mine.length * 2 > open ? 'Most are' : `${worst.mine.length} are`} on the ${worst.name}.` : '',
    loose ? `${loose} ${loose === 1 ? 'is' : 'are'} on no machine.` : '',
    stoppy && stoppy.minWeek >= 1 ? `The ${stoppy.name} stops the most — about ${Math.round(stoppy.minWeek)} min a week.` : '',
    constraint ? `The line is held at the ${constraint.name}.` : '',
  ].filter(Boolean).join(' ');
  return (
    <section className="pl-sec tour" aria-label="The line, machine by machine">
      <div className="pl-sec-h"><h2>The line, machine by machine</h2></div>
      <p className="tour-says">{says}</p>
      <ol className="tour-strip">
        {cards.map((c, i) => (
          <li key={c.name} data-listed={listed.has(machineKey(c.name)) ? '1' : undefined} className={'tour-card' + (c.on ? ' is-on' : '') + (c.mine.some(r => r.priority === 'critical' || r.late) ? ' is-r' : '')}>
            <div className="tour-box">
              <button type="button" className="tour-b" onClick={() => nav(way(c))}
                aria-label={`${i + 1}. ${c.name}${c.on ? ', the constraint' : ''}: ${c.mine.length} problem${c.mine.length === 1 ? '' : 's'} open${listed.has(machineKey(c.name)) ? ' — open its page' : ''}`}>
                {/* THE MACHINE'S OWN PICTURE (3 November — Rowland: "the picture of the machines to go in on the lines"); a problem's photo is the problem's, on its row */}
                <MachineImg record={c.record} alt={`The ${c.name}`} className="tour-img" />
                <span className="tour-n"><b>{i + 1}</b> {c.name}{c.on && <em className="lch-tag">constraint</em>}</span>
              </button>
              {/* each problem opens itself, straight from the machine (Rowland: "get access to the problems directly to that machine") */}
              <span className="tour-p">
                {/* A COUNT AND A SEVERITY, never the problem's words again (13 November, the line-page brief — "the same long problem
                    text appears twice: once under Problems and again inside the machine card … it takes most of a screen of scrolling
                    to get past"): the words are said once, under Problems; here one press says how many and how serious, and opens the
                    problem itself — the worst first when there are several */}
                {c.mine.length === 0 ? <span className="sub">Nothing open</span>
                  : (() => {
                    const order = ['critical', 'high', 'low'];
                    const worst = [...c.mine].sort((a, b) => order.indexOf(a.priority) - order.indexOf(b.priority) || Number(!!b.late) - Number(!!a.late))[0];
                    const late = c.mine.filter(r => r.late).length;
                    return (
                      <button type="button" className="tour-pr" data-tour-problems={c.mine.length}
                        aria-label={`${c.mine.length} problem${c.mine.length === 1 ? '' : 's'} open on ${c.name} — ${order.filter(p => c.mine.some(r => r.priority === p)).map(p => `${c.mine.filter(r => r.priority === p).length} ${PRIO_WORD[p]}`).join(', ')}${late ? `, ${late} late` : ''}. Open ${c.mine.length === 1 ? 'it' : 'the worst'}`}
                        onClick={() => nav(`/snags?line=${encodeURIComponent(line.id)}&open=${encodeURIComponent(worst.id)}`)}>
                        <span className="tour-pn"><b>{c.mine.length}</b> open</span>
                        {order.filter(p => c.mine.some(r => r.priority === p)).map(p => <span key={p} className={'qsl-prio ' + PRIO_CLASS[p]}>{c.mine.filter(r => r.priority === p).length} {PRIO_WORD[p]}</span>)}
                        {late > 0 && <span className="tour-late">{late} late</span>}
                        <span aria-hidden>›</span>
                      </button>
                    );
                  })()}
              </span>
              <span className="tour-m">
                {c.minWeek >= 1
                  ? <>{Math.round(c.minWeek)} min a week stopped{perMin ? ` · ${fmtGBP(c.minWeek * perMin)} idle labour` : ''}{c.on ? ' — and output, at the constraint' : ''}</>
                  : <span className="sub">no stops logged lately</span>}
              </span>
              {/* the way in, said as the Factory board's cards say it (docs/ENTERPRISE-UI.md E2) */}
              <button type="button" className="tour-go" onClick={() => nav(way(c))}>{listed.has(machineKey(c.name)) ? 'Open machine ›' : 'Its problems ›'}</button>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
