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
import { AI_TOOLS } from '../catalogue/aiTools';
import { PageHeader } from '../ui/parts';
import { EmptyState } from '../ui/EmptyState';
import { toolByKey } from '../catalogue/registry';
import { ToolCard } from '../ui/ToolCard';
import { useToolUse, usedSaid } from '../lib/useToolUse';
import { useMemo, useState } from 'react';
import { ENTRIES, PROBLEMS, disciplineName, entryById, searchEntries, searchProblems, subName } from '../catalogue';
import { FORM_WORDS, KINDS, STATUS_WORDS, type Entry, type Kind, type ProblemRoute, type Status } from '../catalogue/types';
import { nav, useRoute } from '../state/useRoute';
import { WORLDS, worldEntries, worldTools } from '../catalogue/worlds';
import { GALLERY_TOOLS, holdings, toolCounts, type ToolHolds } from '../catalogue/counts';
import { ToolPicture } from '../ui/ToolCard';
import { Fold, openFold } from '../ui/Fold';
import { useTemplates } from '../ui/MyTemplates';
import { KIND_WORDS } from '../lib/templates';

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
  const [open, setOpen] = useState<string | null>(null);
  const here = useRoute();
  /* a tool's page sends you to the problem routes it sits on (?route=) */
  const [route, setRoute] = useState<string | null>(() => {
    const r = here.query.get('route');
    if (!(r && PROBLEMS.some(p => p.id === r))) return null;
    openFold('tools-find');   /* a route sent from a tool's page lands with its way through open */
    return r;
  });
  /* a route's tool opened: its row in What we have and what we need to build — that fold opened (remounted on the stored choice), the
     row opened and scrolled to */
  const [hdKey, setHdKey] = useState(0);
  const pick = (id: string) => {
    setOpen(id);
    openFold('tools-holdings'); setHdKey(k => k + 1);
    setTimeout(() => { const row = document.querySelector<HTMLElement>(`.hd [data-id="${id}"]`); const d = row?.closest('details'); if (d) d.open = true; row?.scrollIntoView({ block: 'center' }); }, 60);
  };
  const [kind, setKind] = useState<Kind | ''>('');
  const use = useToolUse();

  const counts = useMemo(() => toolCounts(), []);
  const held = useMemo(() => holdings(), []);
  const holdsOf = useMemo(() => new Map(held.tools.map(h => [h.id, h])), [held]);
  const toBuildInside = held.tools.reduce((n, t) => n + t.toBuild.length, 0);
  const words = q.trim();
  const routes = useMemo(() => (words ? searchProblems(words).slice(0, 3) : []), [words]);
  const found = useMemo(() => (words ? searchEntries(words, ENTRIES) : []), [words]);
  const picked = route ? PROBLEMS.find(p => p.id === route) : undefined;
  const talk = toolByKey('talk');

  return (
    <div className="wrap et">
      {/* THE PAGE HEADER — one number, the tools (Rowland, 7 November: "you've split down every single functionality within its tool
          and then called each functionality a tool ... I can't tell what we have and what we need to build"; catalogue/counts) */}
      <PageHeader title="Tools" says={<span className="et-lede">
        {counts.tools} tools. Inside them, {plural(counts.inside, 'way of using them is', 'ways of using them are')} built and {toBuildInside} more{' '}
        {toBuildInside === 1 ? 'is' : 'are'} planned. {plural(held.newTools.length, 'new tool is', 'new tools are')} planned and not started — all of it listed under
        What we have and what we need to build.
      </span>} />

      {/* THE TWO DOORS — talk on the line, and the 6M */}
      <div className="et-doors">
        {talk && <button type="button" className="btn et-door" data-door="talk" onClick={() => nav(talk.to)}>Line Talk — talk or type on the line ›</button>}
      </div>

      {/* THE TOOLS, FIRST AND CALM (10 November, docs/DESIGN.md — Rowland: "Tools obvious"): one list of the tools a person can open,
          each a row — its picture small, its name, what it is for, what it holds — opening its page; Open › its list. The kind, the
          number and the status are on the tool's own page; the status shows here only when a tool is not built. */}
      <section className="et-now" aria-label="Use one now">
        {kind && (
          <p className="tc-kind-now">Showing {KIND_CHIP[kind].toLowerCase()} — {GALLERY_TOOLS.filter(t => t.kind === kind).length} of {GALLERY_TOOLS.length}{' '}
            <button type="button" className="linkish" onClick={() => setKind('')}>Show all</button></p>
        )}
        <div className="tc-gal is-list" role="list" aria-label="Every tool you can open">
          {GALLERY_TOOLS.filter(t => !kind || t.kind === kind).map(t => {
            const e = entryById(t.id), h = holdsOf.get(t.id);
            return (
              <div key={t.key} role="listitem" className="tc-cell">
                <ToolCard
                  row
                  tool={t}
                  statusWord={e ? STATUS_WORDS[e.status] : undefined}
                  statusTone={e ? TONE[e.status] : undefined}
                  said={use?.[t.key]?.n ? usedSaid(use[t.key]) : undefined /* used is said; not used yet is the quiet normal */}
                  holds={h ? holdsSaid(h) || undefined : undefined}
                  onOpen={() => nav(`/tools/${t.key}`)}
                  onList={() => nav(t.to)}
                />
              </div>
            );
          })}
        </div>
      </section>

      {/* EVERYTHING ELSE — kept, each in the one fold, shut until wanted (docs/DESIGN.md, progressive disclosure) */}
      {/* FIND ONE BY THE PROBLEM — the floor's words, the routes and what matches */}
      <Fold id="tools-find" title="Find one by the problem" says={`Say it in your words — or start from one of ${PROBLEMS.length} problems, each with its way through`} start={false}>
        <label className="et-search">
          <span className="field-label">What’s the problem?</span>
          <input className="text-input" type="search" value={q} placeholder="e.g. we’re rejecting too many, or FC-098" aria-label="What’s the problem?"
            onChange={e => { setQ(e.target.value); setRoute(null); }} />
        </label>
        {words ? (
          <>
            {routes.length > 0 && (
              <section className="et-routes" aria-label="Where to start">
                <h3 className="ln-h">Where to start</h3>
                {routes.map(p => <Route key={p.id} p={p} onOpen={pick} />)}
              </section>
            )}
            <section aria-label="What matches">
              <h3 className="ln-h">What matches — {found.length}</h3>
              {found.length
                ? <ul className="et-list">{found.map(e => <Row key={e.id} e={e} open={open === e.id} onToggle={() => setOpen(open === e.id ? null : e.id)} onOpen={setOpen} />)}</ul>
                : <EmptyState className="blank-list" title={`Nothing matches “${words}”`}>Try the problem in other words, or a number (FC-012).</EmptyState>}
            </section>
          </>
        ) : (
          <section className="et-routes" aria-label="Start from the problem">
            <div className="et-route-list">
              {PROBLEMS.map(p => (
                <button key={p.id} type="button" className={'et-route-b' + (route === p.id ? ' on' : '')} aria-expanded={route === p.id} onClick={() => setRoute(route === p.id ? null : p.id)}>{p.title}</button>
              ))}
            </div>
            {picked && <Route p={picked} onOpen={pick} />}
          </section>
        )}
      </Fold>

      {/* THE KINDS — the list narrowed to one kind of tool */}
      <Fold id="tools-kinds" title="By kind" says={KINDS.filter(k => GALLERY_TOOLS.some(t => t.kind === k)).map(k => `${KIND_CHIP[k]} ${GALLERY_TOOLS.filter(t => t.kind === k).length}`).join(' · ')} start={false}>
        <div className="chip-row" role="radiogroup" aria-label="Kind of tool">
          <button type="button" role="radio" aria-checked={!kind} className={'chip' + (!kind ? ' on' : '')} onClick={() => setKind('')}>All {GALLERY_TOOLS.length}</button>
          {KINDS.filter(k => GALLERY_TOOLS.some(t => t.kind === k)).map(k => (
            <button key={k} type="button" role="radio" aria-checked={kind === k} className={'chip' + (kind === k ? ' on' : '')} onClick={() => setKind(kind === k ? '' : k)}>{KIND_CHIP[k]} {GALLERY_TOOLS.filter(t => t.kind === k).length}</button>
          ))}
        </div>
      </Fold>

      {/* THE WORLDS (docs/TOOLS-WORLDS.md) — a doorway for each way of working, counted in tools */}
      <Fold id="tools-worlds" title="The worlds" says={WORLDS.map(w => w.name).join(', ')} start={false}>
        <section className="wd-row" aria-label="The worlds">
          <div className="wd-cards" role="list">
            {WORLDS.map(w => {
              const es = worldEntries(w), ts = worldTools(w), c = toolCounts(es);
              return (
                <button key={w.id} type="button" role="listitem" className="wd-card" data-world={w.id} onClick={() => nav(`/tools/world/${w.id}`)}>
                  <span className="wd-pics" aria-hidden>{ts.slice(0, 3).map(t => <ToolPicture key={t.key} tool={t} />)}</span>
                  <b className="wd-name">{w.name}</b>
                  <span className="wd-line">{w.line}</span>
                  <span className="wd-nums">{plural(c.tools, 'tool')} · {c.notBuilt} {c.notBuilt === 1 ? 'thing' : 'things'} to build</span>
                </button>
              );
            })}
          </div>
        </section>
      </Fold>

      {/* THE AI TOOLBOX (catalogue/aiTools; docs/AI-TOOLBOX.md — Rowland, 8 November: "should be in an AI tool box itself ... so we know
          that they use AI") — every place a model is used, what it does, what it sends and to whom, what it never does */}
      <Fold id="tools-ai" title="The AI toolbox" says={`${AI_TOOLS.length} places Faultline uses AI — what each sends and what it never does`} start={false}>
        <section className="ai-box" aria-label="The AI toolbox" data-ai-box>
          <p className="sub ai-box-sub">Everything in Faultline that uses AI, in one place. The AI listens, watches and writes — it never works out a figure: every number is a formula’s.</p>
          <div className="ai-cards" role="list">
            {AI_TOOLS.map(a => (
              <div key={a.id} role="listitem" className="ai-card" data-ai-tool={a.id}>
                <p className="ai-card-h"><span className="ai-mark">AI</span> <b>{a.name}</b></p>
                <p className="ai-does">{a.does}</p>
                <dl className="ai-dl">
                  <dt>Sends</dt><dd>{a.sends}</dd>
                  <dt>Never</dt><dd>{a.never}</dd>
                  {a.where && <><dt>Where</dt><dd>{a.where}</dd></>}
                </dl>
                {a.to && <button type="button" className="btn btn-sm" onClick={() => nav(a.to as string)}>{a.id === 'video-name' ? 'Video studies ›' : a.id === 'story-draft' ? 'Open the Story ›' : 'Open Line Talk ›'}</button>}
              </div>
            ))}
          </div>
          {/* HOW AI MODE IS USED (docs/AI-MODE.md §9): its cost, what it did, and what could be answered with no AI */}
          <p className="ai-box-foot"><a href="#/ai/usage" data-ai-usage-link>How AI Mode is used — what it costs and what could be answered with no AI ›</a></p>
        </section>
      </Fold>

      {/* WHAT WE HAVE AND WHAT WE NEED TO BUILD — tool by tool, then the new tools, then the rest; every entry in one place */}
      <Fold key={hdKey} id="tools-holdings" title="What we have and what we need to build" says={`${counts.inside} built inside the tools · ${toBuildInside} to build · ${plural(held.newTools.length, 'new tool', 'new tools')} planned`} start={false}>
        <section className="hd" aria-label="What we have and what we need to build">
          <p className="sub">Each tool and what is inside it — built, and still to build. Then the new tools planned and not started.</p>
          <ul className="hd-tools">
            {held.tools.map(h => {
              const e = entryById(h.id);
              if (!e) return null;
              return (
                <li key={h.id} className="hd-tool" data-tool-id={h.id}>
                  <details>
                    <summary><b>{shortName(e.name)}</b><span className="hd-n">{holdsSaid(h) || 'the tool itself'}</span></summary>
                    {h.built.length > 0 && <><h4>Built</h4><ul className="et-list">{h.built.map(x => <Row key={x.id} e={x} open={open === x.id} onToggle={() => setOpen(open === x.id ? null : x.id)} onOpen={setOpen} />)}</ul></>}
                    {h.toBuild.length > 0 && <><h4>To build</h4><ul className="et-list">{h.toBuild.map(x => <Row key={x.id} e={x} open={open === x.id} onToggle={() => setOpen(open === x.id ? null : x.id)} onOpen={setOpen} />)}</ul></>}
                    {!h.built.length && !h.toBuild.length && <p className="sub">The tool itself — nothing more planned inside it.</p>}
                  </details>
                </li>
              );
            })}
          </ul>
          <Group id="new" title="New tools — planned, not started" list={held.newTools} open={open} setOpen={setOpen} startOpen />
          <Group id="parts" title="Built into the app — not tools (Problems, Actions, reports, the stage gate…)" list={held.parts} open={open} setOpen={setOpen} />
          <Group id="research" title="Needs research first" list={ENTRIES.filter(e => e.status === 'research')} open={open} setOpen={setOpen} />
          <Group id="left-out" title="Left out on purpose" list={ENTRIES.filter(e => e.status === 'left-out')} open={open} setOpen={setOpen} />
        </section>
      </Fold>

      {/* MY TEMPLATES (11 November, docs/CONSULTANT-WORKSPACE.md C5) — your own documents, check lists and sheets, at any customer */}
      <MyTemplatesFold />
    </div>
  );
}

/** MY TEMPLATES, one fold: how many, their names, and the way to the page. */
function MyTemplatesFold() {
  const list = useTemplates() ?? [];
  return (
    <Fold id="tools-templates" title="My templates" says={list.length ? `${plural(list.length, 'template')} of your own — ready at any customer` : 'Your own documents, check lists and sheets — saved from any of them, ready at any customer'} start={false}>
      <section className="tpl-fold" aria-label="My templates">
        {list.length > 0
          ? <ul className="et-list">{list.map(t => <li key={t.id} data-template-fold={t.name}><b>{t.name}</b> <span className="sub">· {t.facts.template ? KIND_WORDS[t.facts.template.kind] : ''}</span></li>)}</ul>
          : <p className="sub">None yet — on a document, a check log or a custom sheet, More ▾ › Save as my template.</p>}
        <p><button type="button" className="btn btn-sm" data-templates-open onClick={() => nav('/templates')}>Open My templates ›</button></p>
      </section>
    </Fold>
  );
}

/** A tool's name as the floor says it: before the dash. */
const shortName = (name: string): string => name.split(' — ')[0];
/** What a tool holds, in words. */
const holdsSaid = (h: ToolHolds): string =>
  [h.built.length ? `${plural(h.built.length, 'way of using it', 'ways of using it')} built` : '', h.toBuild.length ? `${h.toBuild.length} to build` : ''].filter(Boolean).join(' · ');

/** One list of the catalogue, folded under its heading with its count. */
function Group({ id, title, list, open, setOpen, startOpen }: { id: string; title: string; list: Entry[]; open: string | null; setOpen: (id: string | null) => void; startOpen?: boolean }) {
  return (
    <details className="hd-group" data-group={id} open={startOpen}>
      <summary><b>{title}</b><span className="hd-n">{list.length}</span></summary>
      <ul className="et-list">{list.map(e => <Row key={e.id} e={e} open={open === e.id} onToggle={() => setOpen(open === e.id ? null : e.id)} onOpen={setOpen} />)}</ul>
    </details>
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
    <button type="button" className={`et-chip is-${TONE[e.status]}`} onClick={() => onOpen(e.id)}>
      <b>{e.id}</b> {e.name} · {STATUS_WORDS[e.status]}
    </button>
  );
}

function Row({ e, open, onToggle, onOpen }: { e: Entry; open: boolean; onToggle: () => void; onOpen: (id: string) => void }) {
  const to = opens(e);
  const parent = e.partOf ? entryById(e.partOf) : undefined;
  return (
    <li className={'et-row' + (open ? ' is-open' : '')} data-id={e.id} data-status={e.status}>
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
