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
import { ToolCard } from '../ui/ToolCard';
import { useToolUse, usedSaid } from '../lib/useToolUse';
import { useMemo, useState } from 'react';
import { ENTRIES, PROBLEMS, disciplineName, entryById, searchEntries, searchProblems, statusCounts, subName } from '../catalogue';
import { DISCIPLINES, FORM_WORDS, KINDS, STATUSES, STATUS_WORDS, type Entry, type Kind, type ProblemRoute, type Status } from '../catalogue/types';
import { nav, useRoute } from '../state/useRoute';
import { WORLDS, worldEntries, worldTools } from '../catalogue/worlds';
import { insideByTool, toolCounts } from '../catalogue/counts';
import { ToolPicture } from '../ui/ToolCard';

/** The state colours, one meaning each: built is done (a quiet green);
 *  partly built or specified is under way; not built, research and left out
 *  are not started — always with the word beside the colour. */
const TONE: Record<Status, 'g' | 'w' | 'n'> = { available: 'g', partial: 'w', specified: 'w', 'to-build': 'n', research: 'n', 'left-out': 'n' };
/** Where an entry opens in the app, when it is there to open. */
const opens = (e: Entry): string | undefined => ((e.status === 'available' || e.status === 'partial') ? e.built?.where[0] : undefined);
/** The kind chips' words — the floor's, not the model's. */
const KIND_CHIP: Record<Kind, string> = { study: 'Studies', standard: 'Standards', log: 'Logs', register: 'Registers', document: 'Documents', board: 'Boards' };
const plural = (n: number, one: string, more = `${one}s`) => `${n} ${n === 1 ? one : more}`;

export function ToolsScreen() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<Status | ''>('');
  const [disc, setDisc] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const here = useRoute();
  /* a tool's page sends you to the problem routes it sits on (?route=) */
  const [route, setRoute] = useState<string | null>(() => { const r = here.query.get('route'); return r && PROBLEMS.some(p => p.id === r) ? r : null; });
  const [kind, setKind] = useState<Kind | ''>('');
  const use = useToolUse();

  const counts = useMemo(() => toolCounts(), []);
  const byTool = useMemo(() => { const by = insideByTool(); return APP_TOOLS.filter(t => by[t.id] > 0).sort((a, b) => by[b.id] - by[a.id]).slice(0, 3).map(t => `${t.label} holds ${by[t.id]}`).join(', ').replace(/, ([^,]*)$/, ' and $1'); }, []);
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
        {counts.tools} tools you can open. Inside them, {counts.inside} methods are built — {byTool}. {counts.parts} more things are built into the
        app but are not tools (Problems, Actions, reports, the stage gate). {counts.notBuilt} methods are planned or not built yet,{' '}
        {counts.research} need research first, {counts.leftOut} are left out on purpose. The list lower down is every method and part the
        catalogue knows — {counts.entries} entries — not a count of tools.
      </span>} />

      {/* THE WORLDS (docs/TOOLS-WORLDS.md — Rowland, 30 October: "tool worlds, not just tools but their own ecosystem"): a doorway
          for each way of working, read from the catalogue's disciplines, one tap to its home */}
      <section className="wd-row" aria-label="The worlds">
        <h2 className="ln-h">The worlds</h2>
        <div className="wd-cards" role="list">
          {WORLDS.map(w => {
            const es = worldEntries(w), ts = worldTools(w), c = toolCounts(es);
            return (
              <button key={w.id} type="button" role="listitem" className="wd-card" data-world={w.id} onClick={() => nav(`/tools/world/${w.id}`)}>
                <span className="wd-pics" aria-hidden>{ts.slice(0, 3).map(t => <ToolPicture key={t.key} tool={t} />)}</span>
                <b className="wd-name">{w.name}</b>
                <span className="wd-line">{w.line}</span>
                <span className="wd-nums">{plural(c.tools, 'tool')} · {plural(c.inside + c.parts, 'method')} built · {c.notBuilt} not built</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="et-now" aria-label="Use one now">
        <div className="tc-gal-h">
          <h2 className="ln-h">The tools</h2>
          <div className="chip-row" role="radiogroup" aria-label="Kind of tool">
            <button type="button" role="radio" aria-checked={!kind} className={'chip' + (!kind ? ' on' : '')} onClick={() => setKind('')}>All {APP_TOOLS.length}</button>
            {KINDS.filter(k => APP_TOOLS.some(t => t.kind === k)).map(k => (
              <button key={k} type="button" role="radio" aria-checked={kind === k} className={'chip' + (kind === k ? ' on' : '')} onClick={() => setKind(kind === k ? '' : k)}>{KIND_CHIP[k]} {APP_TOOLS.filter(t => t.kind === k).length}</button>
            ))}
          </div>
        </div>
        <div className="tc-gal" role="list" aria-label="Every tool you can open">
          {APP_TOOLS.filter(t => !kind || t.kind === kind).map(t => (
            <div key={t.key} role="listitem" className="tc-cell">
              <ToolCard tool={t} said={usedSaid(use?.[t.key])} onOpen={() => nav(`/tools/${t.key}`)} onList={() => nav(t.to)} />
            </div>
          ))}
        </div>
        <h2 className="ln-h et-all-h">Or find one by the problem</h2>
      </section>

      <label className="et-search">
        <span className="field-label">What’s the problem?</span>
        <input className="text-input" type="search" value={q} placeholder="e.g. we’re rejecting too many, or FC-098" aria-label="What’s the problem?"
          onChange={e => { setQ(e.target.value); setRoute(null); }} />
      </label>

      {/* THE COUNTS ARE THE FILTERS (simplicity, rule 1) */}
      <h2 className="ln-h et-all-h">The catalogue — every method and part, by status <span className="sub">(not a count of tools)</span></h2>
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
        <h2 className="ln-h">{words ? `Catalogued entries that match — ${found.length}` : status || disc ? plural(found.length, 'catalogued entry', 'catalogued entries') : 'Every catalogued method and part, by discipline'}</h2>
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
