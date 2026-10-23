/* EVERY TOOL — the directory (knowledge/README.md; the catalogue in
 * src/catalogue). Rowland, 22 October: "a directory ... searchable by problem,
 * discipline, method and scenario ... reflecting real status". A person on the
 * floor does not ask for "binomial capability"; they say "we're rejecting too
 * many". So the page starts from the problem in their own words: the routes
 * that start from it (lib PROBLEMS), then every tool that matches, each with
 * its true status from the catalogue — what is built opens; what is not says
 * so, and why it is not. Nothing here is worked out or stored: the catalogue
 * is the record, checked against the code by src/catalogue/__tests__.
 *
 * Read-only, for everyone. Loaded on its own (the router's lazy import), so
 * the catalogue's words never weigh on the rest of the app. */
import { PageHeader } from '../ui/parts';
import { APP_TOOLS } from '../catalogue/registry';
import { useMemo, useState } from 'react';
import { ENTRIES, PROBLEMS, disciplineName, entryById, searchEntries, searchProblems, statusCounts, subName } from '../catalogue';
import { DISCIPLINES, FORM_WORDS, STATUSES, STATUS_WORDS, type Entry, type ProblemRoute, type Status } from '../catalogue/types';
import { nav } from '../state/useRoute';

/** The state colours, one meaning each: built is done (a quiet green);
 *  partly built or specified is under way; not built, research and left out
 *  are not started — always with the word beside the colour. */
const TONE: Record<Status, 'g' | 'w' | 'n'> = { available: 'g', partial: 'w', specified: 'w', 'to-build': 'n', research: 'n', 'left-out': 'n' };
/** Where an entry opens in the app, when it is there to open. */
const opens = (e: Entry): string | undefined => ((e.status === 'available' || e.status === 'partial') ? e.built?.where[0] : undefined);
const plural = (n: number, one: string, more = `${one}s`) => `${n} ${n === 1 ? one : more}`;

export function ToolsScreen() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<Status | ''>('');
  const [disc, setDisc] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [route, setRoute] = useState<string | null>(null);

  const all = statusCounts();
  const words = q.trim();
  const routes = useMemo(() => (words ? searchProblems(words).slice(0, 3) : []), [words]);
  /* what the words and the discipline match; the status chips count it and filter it */
  const matched = useMemo(() => {
    const scope = disc ? ENTRIES.filter(e => e.discipline === disc) : ENTRIES;
    return words ? searchEntries(words, scope) : scope;
  }, [words, disc]);
  const shown = statusCounts(matched);
  const found = status ? matched.filter(e => e.status === status) : matched;
  const picked = route ? PROBLEMS.find(p => p.id === route) : undefined;

  return (
    <div className="wrap et">
      {/* THE PAGE HEADER (docs/STRUCTURE.md §5.4, B3) — the library has no paper and no one thing to do: its title
          and what it holds */}
      <PageHeader title="Tools" says={<span className="et-lede">
        Everything Faultline does, and what it could do, found by the problem in your words. What is built opens; what is not
        says so. {ENTRIES.length} tools in {DISCIPLINES.length} disciplines — {all.available} available, {all.partial} partly built,{' '}
        {all.specified} planned, {all['to-build']} not built yet, {all.research} needing research first, {all['left-out']} left out on purpose.
      </span>} />

      {/* USE ONE NOW — the tools a person can open, first (docs/STRUCTURE.md §5.1: the factory's Tools is
          the library; the eleven left every rail on 23 October). Each opens its list; started from there,
          one is on no line or project, or put on one. */}
      <section className="et-now" aria-label="Use one now">
        <h2 className="ln-h">Use one now</h2>
        <ul className="lt-rows">
          {APP_TOOLS.map(t => (
            <li key={t.key} className="lt-li">
              <button type="button" className="lt-row" onClick={() => nav(t.to)}>
                <b className="lt-what">{t.label}</b>
                <span className="lt-where">{t.says}</span>
              </button>
            </li>
          ))}
        </ul>
        <h2 className="ln-h et-all-h">Or find one by the problem</h2>
      </section>

      <label className="et-search">
        <span className="field-label">What’s the problem?</span>
        <input className="text-input" type="search" value={q} placeholder="e.g. we’re rejecting too many, or FC-098" aria-label="What’s the problem?"
          onChange={e => { setQ(e.target.value); setRoute(null); }} />
      </label>

      {/* THE COUNTS ARE THE FILTERS (simplicity, rule 1) */}
      <div className="chip-row et-status" role="radiogroup" aria-label="Status">
        <button type="button" role="radio" aria-checked={!status} className={'chip' + (!status ? ' on' : '')} onClick={() => setStatus('')}>
          All {STATUSES.reduce((n, s) => n + shown[s], 0)}
        </button>
        {STATUSES.map(s => (
          <button key={s} type="button" role="radio" aria-checked={status === s} data-status={s} className={'chip' + (status === s ? ' on' : '')} onClick={() => setStatus(status === s ? '' : s)}>
            {STATUS_WORDS[s]} {shown[s]}
          </button>
        ))}
      </div>
      <label className="et-disc">
        <span className="field-label">Discipline</span>
        <select className="text-input" value={disc} onChange={e => setDisc(e.target.value)} aria-label="Discipline">
          <option value="">Every discipline</option>
          {DISCIPLINES.map(d => <option key={d.id} value={d.id}>{d.name} ({ENTRIES.filter(e => e.discipline === d.id).length})</option>)}
        </select>
      </label>

      {/* WHERE TO START — the problem routes that meet the words, or every one
          when nothing is typed */}
      {words ? (
        routes.length > 0 && (
          <section className="et-routes" aria-label="Where to start">
            <h2 className="ln-h">Where to start</h2>
            {routes.map(p => <Route key={p.id} p={p} onOpen={id => setOpen(id)} />)}
          </section>
        )
      ) : (
        <section className="et-routes" aria-label="Start from the problem">
          <h2 className="ln-h">Start from the problem</h2>
          <div className="et-route-list">
            {PROBLEMS.map(p => (
              <button key={p.id} type="button" className={'et-route-b' + (route === p.id ? ' on' : '')} aria-expanded={route === p.id} onClick={() => setRoute(route === p.id ? null : p.id)}>{p.title}</button>
            ))}
          </div>
          {picked && <Route p={picked} onOpen={id => setOpen(id)} />}
        </section>
      )}

      <section aria-label="The tools">
        <h2 className="ln-h">{words ? `Tools that match — ${found.length}` : status || disc ? `${plural(found.length, 'tool')}` : 'The tools, by discipline'}</h2>
        {!found.length && <p className="sub">Nothing matches{words ? ` “${words}”` : ''}. Try the problem in other words, or a tool’s number (FC-012).</p>}
        {words || status || disc
          ? <ul className="et-list">{found.map(e => <Row key={e.id} e={e} open={open === e.id} onToggle={() => setOpen(open === e.id ? null : e.id)} onOpen={setOpen} />)}</ul>
          : DISCIPLINES.map(d => {
              const list = found.filter(e => e.discipline === d.id);
              return list.length ? (
                <div key={d.id} className="et-group">
                  <h3>{d.name} <span className="sub">{list.length}</span></h3>
                  <ul className="et-list">{list.map(e => <Row key={e.id} e={e} open={open === e.id} onToggle={() => setOpen(open === e.id ? null : e.id)} onOpen={setOpen} />)}</ul>
                </div>
              ) : null;
            })}
      </section>
    </div>
  );
}

/** One problem's way through: the questions in order, each with the tools
 *  that answer it and their status. */
function Route({ p, onOpen }: { p: ProblemRoute; onOpen: (id: string) => void }) {
  return (
    <div className="et-route" data-route={p.id}>
      <h3>{p.title}</h3>
      <ol>
        {p.steps.map((s, i) => (
          <li key={i}>
            <span>{s.ask}{s.when ? <span className="sub"> — {s.when}</span> : null}</span>
            <span className="et-route-ids">
              {s.ids.map(id => { const e = entryById(id); return e ? <Chip key={id} e={e} onOpen={onOpen} /> : null; })}
            </span>
          </li>
        ))}
      </ol>
      {p.caveat && <p className="sub et-caveat">{p.caveat}</p>}
    </div>
  );
}

function Chip({ e, onOpen }: { e: Entry; onOpen: (id: string) => void }) {
  return (
    <button type="button" className={`et-chip is-${TONE[e.status]}`} onClick={() => { onOpen(e.id); requestAnimationFrame(() => document.getElementById(`et-${e.id}`)?.scrollIntoView({ block: 'center' })); }}>
      <b>{e.id}</b> {e.name} · {STATUS_WORDS[e.status]}
    </button>
  );
}

function Row({ e, open, onToggle, onOpen }: { e: Entry; open: boolean; onToggle: () => void; onOpen: (id: string) => void }) {
  const to = opens(e);
  const parent = e.partOf ? entryById(e.partOf) : undefined;
  return (
    <li id={`et-${e.id}`} className={'et-row' + (open ? ' is-open' : '')} data-id={e.id} data-status={e.status}>
      <button type="button" className="et-row-h" aria-expanded={open} onClick={onToggle}>
        <span className="et-id">{e.id}</span>
        <span className="et-name">{e.name}</span>
        <span className={`et-st is-${TONE[e.status]}`}>{STATUS_WORDS[e.status]}</span>
      </button>
      {open && (
        <div className="et-body">
          <p className="et-problem">{e.problem}</p>
          <dl>
            <dt>What it answers</dt><dd><ul>{e.questions.map(x => <li key={x}>{x}</li>)}</ul></dd>
            <dt>How</dt><dd>{e.method}</dd>
            <dt>It needs</dt><dd>{e.inputs}</dd>
            <dt>It gives</dt><dd>{e.outputs}</dd>
            <dt>On a food line</dt><dd>{e.food}</dd>
            <dt>What it is</dt><dd>{FORM_WORDS[e.form]}{parent ? <> of <button type="button" className="linkish" onClick={() => onOpen(parent.id)}>{parent.id} {parent.name}</button></> : null} · {disciplineName(e.discipline)} — {subName(e.discipline, e.sub)} · worth {e.value}: {e.valueWhy}</dd>
            {e.depends.length > 0 && <><dt>Stands on</dt><dd className="et-route-ids">{e.depends.map(id => { const d = entryById(id); return d ? <Chip key={id} e={d} onOpen={onOpen} /> : null; })}</dd></>}
            {e.limits && e.limits.length > 0 && <><dt>{e.status === 'available' ? 'What it does not do yet' : 'Where it stands'}</dt><dd><ul>{e.limits.map(x => <li key={x}>{x}</li>)}</ul></dd></>}
            {e.decided && <><dt>Why it is left out</dt><dd>{e.decided}</dd></>}
          </dl>
          {to
            ? <button type="button" className="btn btn-primary" onClick={() => nav(to)}>Open it</button>
            : <p className="sub et-not">{e.status === 'specified' ? 'Planned — specified, not built yet.' : e.status === 'research' ? 'Needs research before it can be specified.' : e.status === 'left-out' ? 'Left out on purpose — see why above.' : 'Not built yet.'}</p>}
        </div>
      )}
    </li>
  );
}
