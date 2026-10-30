/* A TOOL'S OWN PAGE — #/tools/:key (docs/TOOLS-SHOWCASE.md, TG2). Rowland, 30 October: "view it on a
 * full page, tells me what the tool can be used for". Every word is the catalogue's (src/catalogue):
 * the problem in the floor's words, the questions it answers, what it needs and gives, an example
 * on a food line, the modes inside it, where it stands and what it does not do yet. Nothing here is
 * worked out or typed twice; a tool added to the catalogue has its page by being catalogued.
 *
 * The key is an app tool's ("capability") or any entry's number ("FC-098"): a mode shows its parent
 * tool's page with itself marked, a planned entry its own page saying so, with no Start. */
import { useEffect, useMemo } from 'react';
import { PageHeader } from '../ui/parts';
import { ToolPicture } from '../ui/ToolCard';
import { APP_TOOLS, toolByKey, type AppTool } from '../catalogue/registry';
import { ENTRIES, PROBLEMS, disciplineName, entryById, subName } from '../catalogue';
import { FORM_WORDS, KIND_PLACE, STATUS_WORDS, type Entry, type Status } from '../catalogue/types';
import { useToolUse, usedSaid } from '../lib/useToolUse';
import { nav } from '../state/useRoute';

const TONE: Record<Status, 'g' | 'w' | 'n'> = { available: 'g', partial: 'w', specified: 'w', 'to-build': 'n', research: 'n', 'left-out': 'n' };
const KIND_WORDS = { study: 'A study', standard: 'A standard', log: 'A log', register: 'A register', document: 'A document', board: 'A board' } as const;

/** Where a key points: the app tool and its entry, or just an entry. */
function resolve(key: string): { tool?: AppTool; entry?: Entry; mark?: Entry } {
  const tool = toolByKey(key);
  if (tool) return { tool, entry: entryById(tool.id) };
  const e = entryById(key);
  if (!e) return {};
  const parent = e.partOf ? entryById(e.partOf) : undefined;
  const up = parent ?? e;
  const t = APP_TOOLS.find(x => x.id === up.id);
  return t ? { tool: t, entry: up, mark: e.id === up.id ? undefined : e } : { entry: e };
}

export function ToolPageScreen({ toolKey }: { toolKey: string }) {
  const { tool, entry, mark } = resolve(toolKey);
  const use = useToolUse();
  const modes = useMemo(() => (entry ? ENTRIES.filter(e => e.partOf === entry.id && e.status !== 'left-out') : []), [entry]);
  const routes = useMemo(() => (entry ? PROBLEMS.filter(p => p.steps.some(s => s.ids.includes(entry.id))) : []), [entry]);
  const i = tool ? APP_TOOLS.findIndex(t => t.key === tool.key) : -1;
  const prev = i > 0 ? APP_TOOLS[i - 1] : i === 0 ? APP_TOOLS[APP_TOOLS.length - 1] : undefined;
  const next = i >= 0 ? APP_TOOLS[(i + 1) % APP_TOOLS.length] : undefined;

  /* the scroll through the tools: ← and → move between them */
  useEffect(() => {
    if (!tool) return;
    const onKey = (ev: KeyboardEvent) => {
      const t = ev.target as HTMLElement | null;
      if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
      if (ev.key === 'ArrowLeft' && prev) nav(`/tools/${prev.key}`);
      if (ev.key === 'ArrowRight' && next) nav(`/tools/${next.key}`);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tool, prev, next]);

  if (!entry) {
    return (
      <div className="wrap tp">
        <PageHeader title="Tool not found" says="No tool has that name or number." />
        <p><button type="button" className="btn btn-primary" onClick={() => nav('/tools')}>All the tools ›</button></p>
      </div>
    );
  }

  const used = tool ? use?.[tool.key] : undefined;
  const said = usedSaid(used);
  const open = (entry.status === 'available' || entry.status === 'partial') ? entry.built?.where[0] : undefined;
  const nameOf = tool?.label ?? entry.name;

  return (
    <div className="wrap tp" data-tool={tool?.key ?? entry.id}>
      <PageHeader
        eyebrow={tool ? 'TOOLS · ' + (KIND_WORDS[tool.kind] ?? 'A tool').toUpperCase() : `TOOLS · ${entry.id}`}
        title={nameOf}
        says={tool?.says ?? entry.problem}
        primary={tool && open ? { label: `Start one`, run: () => nav(tool.key === 'talk' ? tool.to : `${tool.to}?add=1`) } : undefined}
        more={tool ? [{ label: `See mine`, run: () => nav(tool.to) }, { label: 'All the tools', run: () => nav('/tools') }] : [{ label: 'All the tools', run: () => nav('/tools') }]}
      />

      <section className="tp-hero" aria-label="What it looks like">
        {tool ? <ToolPicture tool={tool} big /> : <span className="tc-pic is-big"><span className="tc-pic-none">{entry.id}</span></span>}
        <div className="tp-hero-side">
          <p className="tp-status"><span className={`et-st is-${TONE[entry.status]}`}>{STATUS_WORDS[entry.status]}</span>{said && <span className="tc-used">{said}{used?.latest ? ` · latest: ${used.latest}` : ''}</span>}</p>
          <p className="tp-problem">{entry.problem}</p>
          {mark && <p className="sub">You came by <b>{mark.id} {mark.name}</b> — a mode of this tool, listed below.</p>}
          {!tool && <p className="sub">{entry.status === 'specified' ? 'Planned — specified, not built yet.' : entry.status === 'research' ? 'Needs research before it can be specified.' : entry.status === 'left-out' ? 'Left out on purpose — see why below.' : 'Not built yet — it has no Start. The nearest built tools are on its routes below.'}</p>}
        </div>
      </section>

      <section className="tp-sec" aria-label="What you can use it for">
        <h2 className="ln-h">What you can use it for</h2>
        <p className="tp-lede">{entry.problem}</p>
        <ul className="tp-qs">{entry.questions.map(q => <li key={q}>{q}</li>)}</ul>
        <p className="sub"><b>On a food line:</b> {entry.food}</p>
      </section>

      <section className="tp-sec tp-io" aria-label="What you give it and what you get">
        <div><h2 className="ln-h">What you give it</h2><p>{entry.inputs}</p><p className="sub">Counted, timed, tapped, photographed or filmed by a person — nothing reads a machine.</p></div>
        <div><h2 className="ln-h">What you get</h2><p>{entry.outputs}</p><p className="sub">How: {entry.method}</p></div>
      </section>

      {modes.length > 0 && (
        <section className="tp-sec" aria-label="Inside it">
          <h2 className="ln-h">Inside it <span className="sub">{modes.length}</span></h2>
          <ul className="tp-modes">
            {modes.map(m => (
              <li key={m.id} className={mark?.id === m.id ? 'is-here' : undefined}>
                <button type="button" className="tp-mode" onClick={() => nav(`/tools/${m.id}`)}>
                  <span className="et-id">{m.id}</span> <b>{m.name}</b>
                  <span className={`et-st is-${TONE[m.status]}`}>{STATUS_WORDS[m.status]}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="tp-sec" aria-label="Where it stands">
        <h2 className="ln-h">Where it stands</h2>
        <p>{FORM_WORDS[entry.form]} · {disciplineName(entry.discipline)} — {subName(entry.discipline, entry.sub)}{tool ? ` · its records are listed under ${KIND_PLACE[tool.kind]}` : ''}</p>
        <p className="sub">Worth {entry.value}: {entry.valueWhy}</p>
        {entry.decided && <p><b>Why it is left out:</b> {entry.decided}</p>}
        {entry.limits && entry.limits.length > 0 && (<><h3 className="tp-h3">{entry.status === 'available' ? 'What it does not do yet' : 'Where it stands'}</h3><ul>{entry.limits.map(x => <li key={x}>{x}</li>)}</ul></>)}
      </section>

      {routes.length > 0 && (
        <section className="tp-sec" aria-label="Problems it is a way through">
          <h2 className="ln-h">Where it comes in</h2>
          <ul className="tp-routes">{routes.map(r => <li key={r.id}><button type="button" className="linkish" onClick={() => nav(`/tools?route=${r.id}`)}>{r.title}</button></li>)}</ul>
        </section>
      )}

      {tool && prev && next && (
        <nav className="tp-pn" aria-label="The other tools">
          <button type="button" className="btn btn-ghost" onClick={() => nav(`/tools/${prev.key}`)}>‹ {prev.label}</button>
          <span className="sub">{i + 1} of {APP_TOOLS.length} · ← → move between tools</span>
          <button type="button" className="btn btn-ghost" onClick={() => nav(`/tools/${next.key}`)}>{next.label} ›</button>
        </nav>
      )}
    </div>
  );
}
