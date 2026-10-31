/* A WORLD'S HOME — #/tools/world/:id (docs/TOOLS-WORLDS.md). Rowland, 30 October: "tool worlds, not just tools but their
 * own ecosystem"; 31 October: "stay on tools and make the statistical world". One way of working's doorway: the question it
 * answers, the questions people bring to it (the catalogue's problem routes), its tools as the gallery's cards, and what the
 * world holds — every catalogue entry in it with its real status, so a world never claims what is not built.
 *
 * Nothing here is typed per world but the world's name, its line and its disciplines (src/catalogue/worlds); the tools, the
 * routes, the counts and the "not built yet" list are all read from the catalogue. Read-only, for everyone. */
import { useMemo } from 'react';
import { PageHeader } from '../ui/parts';
import { ToolCard } from '../ui/ToolCard';
import { useToolUse, usedSaid } from '../lib/useToolUse';
import { DISCIPLINES, STATUS_WORDS, type Entry, type Status } from '../catalogue/types';
import { toolCounts } from '../catalogue/counts';
import { worldById, worldEntries, worldRoutes, worldTools, WORLDS } from '../catalogue/worlds';
import { nav } from '../state/useRoute';

const TONE: Record<Status, 'g' | 'w' | 'n'> = { available: 'g', partial: 'w', specified: 'w', 'to-build': 'n', research: 'n', 'left-out': 'n' };
const plural = (n: number, one: string, more = `${one}s`) => `${n} ${n === 1 ? one : more}`;

export function ToolWorldScreen({ worldId }: { worldId: string }) {
  const world = worldById(worldId);
  const use = useToolUse();
  const entries = useMemo(() => (world ? worldEntries(world) : []), [world]);
  const tools = useMemo(() => (world ? worldTools(world) : []), [world]);
  const routes = useMemo(() => (world ? worldRoutes(world) : []), [world]);
  const c = useMemo(() => toolCounts(entries), [entries]);

  if (!world) {
    return (
      <div className="wrap wd">
        <PageHeader title="World not found" says="No world has that name." />
        <p><button type="button" className="btn btn-primary" onClick={() => nav('/tools')}>All the tools ›</button></p>
      </div>
    );
  }

  const notYet = entries.filter(e => e.status !== 'available' && e.status !== 'partial' && e.status !== 'left-out');
  const byDiscipline = DISCIPLINES
    .map(d => ({ d, list: entries.filter(e => e.discipline === d.id) })).filter(g => g.list.length);

  return (
    <div className="wrap wd" data-world={world.id}>
      <PageHeader eyebrow="TOOLS · A WORLD" title={world.name} says={world.line}
        more={[{ label: 'All the tools', run: () => nav('/tools') }]} />

      <p className="wd-count" data-counts>
        {plural(c.tools, 'tool')} to open in this world. {plural(c.inside + c.parts, 'method')} built — {plural(c.inside, 'inside those tools', 'inside those tools')}
        {c.parts ? `, ${c.parts} built into the app but not tools` : ''}. {c.notBuilt} not built yet{c.research ? `, ${c.research} needing research first` : ''}. {plural(entries.length, 'entry', 'entries')} are catalogued here in all.
      </p>

      <section className="wd-sec" aria-label="The tools of this world">
        <h2 className="ln-h">The tools</h2>
        {!tools.length && <p className="sub" data-no-tools>No tool of its own opens in {world.name} yet — what it holds is below, with what each is and where it stands.</p>}
        <div className="tc-gal" role="list" aria-label={`The ${world.name} tools you can open`}>
          {tools.map(t => (
            <div key={t.key} role="listitem" className="tc-cell">
              <ToolCard tool={t} said={usedSaid(use?.[t.key])} onOpen={() => nav(`/tools/${t.key}`)} onList={() => nav(t.to)} />
            </div>
          ))}
        </div>
      </section>

      {routes.length > 0 && (
        <section className="wd-sec" aria-label="Start from a question">
          <h2 className="ln-h">Start from a question</h2>
          <p className="sub">{world.asks} Pick the one you have — each is a way through, step by step, with the tools that answer it.</p>
          <div className="et-route-list">
            {routes.map(r => <button key={r.id} type="button" className="et-route-b" onClick={() => nav(`/tools?route=${r.id}`)}>{r.title}</button>)}
          </div>
        </section>
      )}

      <section className="wd-sec" aria-label="What this world holds">
        <h2 className="ln-h">What it holds</h2>
        {byDiscipline.map(({ d, list }) => (
          <div key={d.id} className="et-group">
            <h3>{d.name} <span className="sub">{list.length}</span></h3>
            <ul className="wd-list">
              {list.map(e => <Held key={e.id} e={e} />)}
            </ul>
          </div>
        ))}
      </section>

      {notYet.length > 0 && (
        <section className="wd-sec" aria-label="What is not built yet">
          <h2 className="ln-h">Not built yet <span className="sub">{notYet.length}</span></h2>
          <p className="sub">Said plainly: {plural(notYet.length, 'thing')} in {world.name} that Faultline has catalogued but not built. Nothing here is claimed.</p>
        </section>
      )}

      <nav className="wd-others" aria-label="The other worlds">
        <span className="sub">The other worlds</span>
        {WORLDS.filter(w => w.id !== world.id).map(w => <button key={w.id} type="button" className="chip" onClick={() => nav(`/tools/world/${w.id}`)}>{w.name}</button>)}
      </nav>
    </div>
  );
}

function Held({ e }: { e: Entry }) {
  return (
    <li className="wd-item" data-id={e.id} data-status={e.status}>
      <button type="button" className="wd-item-b" onClick={() => nav(`/tools/${e.id}`)}>
        <span className="et-id">{e.id}</span> <span className="et-name">{e.name}</span>
        <span className={`et-st is-${TONE[e.status]}`}>{STATUS_WORDS[e.status]}</span>
      </button>
    </li>
  );
}
