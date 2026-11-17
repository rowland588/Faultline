/* Tool categories: working tools first, the complete catalogue/statuses in optional coverage.
 * Categories derive from catalogue disciplines; all technical references remain available. */
import { useMemo } from 'react';
import { PageHeader } from '../ui/parts';
import { Fold } from '../ui/Fold';
import { ToolCard } from '../ui/ToolCard';
import { useToolUse, usedSaid } from '../lib/useToolUse';
import { entryById } from '../catalogue';
import { DISCIPLINES, STATUS_WORDS, type Entry, type Status } from '../catalogue/types';
import { toolCounts } from '../catalogue/counts';
import { worldById, worldEntries, worldTools, toolCategories } from '../catalogue/worlds';
import { nav } from '../state/useRoute';

const TONE: Record<Status, 'g' | 'w' | 'n'> = { available: 'g', partial: 'w', specified: 'w', 'to-build': 'n', research: 'n', 'left-out': 'n' };
const plural = (n: number, one: string, more = `${one}s`) => `${n} ${n === 1 ? one : more}`;

export function ToolWorldScreen({ worldId }: { worldId: string }) {
  const world = worldById(worldId);
  const use = useToolUse();
  const entries = useMemo(() => (world ? worldEntries(world) : []), [world]);
  const tools = useMemo(() => (world ? worldTools(world) : []), [world]);
  const c = useMemo(() => toolCounts(entries), [entries]);

  if (!world) {
    return (
      <div className="wrap wd">
        <PageHeader title="Category not found" says="No tool category has that name." />
        <p><button type="button" className="btn btn-primary" onClick={() => nav('/tools')}>All the tools ›</button></p>
      </div>
    );
  }

  const notYet = entries.filter(e => e.status !== 'available' && e.status !== 'partial' && e.status !== 'left-out');
  const byDiscipline = DISCIPLINES
    .map(d => ({ d, list: entries.filter(e => e.discipline === d.id) })).filter(g => g.list.length);

  return (
    <div className="wrap wd" data-world={world.id}>
      <PageHeader eyebrow="TOOLS · CATEGORY" title={world.name} says={world.line} />

      <p className="sub">{tools.length ? `${plural(tools.length, 'tool')} to use. Choose one below.` : 'Explore the methods and their availability below.'}</p>

      <section className="wd-sec" aria-label="The tools of this world">
        <h2 className="ln-h">The tools</h2>
        {!tools.length && <p className="sub" data-no-tools>{world.id === 'projects' ? <>Project work opens from <a href="#/projects">Projects</a>. Method references remain below.</> : <>No working tool is listed here yet. Method references remain below.</>}</p>}
        <div className="tc-gal is-list" role="list" aria-label={`The ${world.name} tools you can open`}>
          {tools.map(t => {
            const e = entryById(t.id);
            return (
              <div key={t.key} role="listitem" className="tc-cell">
                <ToolCard
                  row
                  tool={t}
                  statusWord={e ? STATUS_WORDS[e.status] : undefined}
                  statusTone={e ? TONE[e.status] : undefined}
                  said={usedSaid(use?.[t.key])}
                  onOpen={() => nav(`/tools/${t.key}`)}
                  onList={() => nav(t.to)}
                />
              </div>
            );
          })}
        </div>
      </section>

      <Fold id="world-coverage" title="Methods and coverage" says="Every method, where to use it and what is still unavailable" start={false}>
      <p className="wd-count" data-counts>
        {plural(c.tools, 'tool')} to open in this world. {plural(c.inside + c.parts, 'method')} built — {plural(c.inside, 'inside those tools', 'inside those tools')}
        {c.parts ? `, ${c.parts} built into the app but not tools` : ''}. {c.notBuilt} not built yet{c.research ? `, ${c.research} needing research first` : ''}. {plural(entries.length, 'entry', 'entries')} are catalogued here in all.
      </p>
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

      </Fold>

      <nav className="wd-others" aria-label="Other tool categories">
        <span className="sub">Other categories</span>
        {toolCategories().filter(w => w.id !== world.id).map(w => <button key={w.id} type="button" className="chip" onClick={() => nav(`/tools/world/${w.id}`)}>{w.name}</button>)}
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
