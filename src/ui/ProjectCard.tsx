/* A project, as a card — and the fastest route to the line you actually want.
 *
 * The lines used to be decoration: chips rendered INSIDE the card's big "open"
 * button, so tapping Line 7 opened the project and left you to find Line 7
 * again. Three taps to reach a page you could see the name of. They are real
 * buttons now, so the chain he describes — that is the project, that is my
 * line, that is its film, that is the evidence — is one tap per step.
 *
 * (They could not have been buttons where they were: a button inside a button
 * is invalid HTML and browsers disagree about which one you pressed.)
 */
import { nav } from '../state/useRoute';
import type { Project } from '../types';
import type { PaceLineRow } from '../db';

export function ProjectCard({ p, lines, compact }: { p: Project; lines: PaceLineRow[]; compact?: boolean }) {
  const withOwner = lines.filter(l => l.owner).length;
  return (
    <article className={'proj-card' + (compact ? ' is-compact' : '')} style={{ ['--proj' as string]: p.color }}>
      <button className="proj-open" onClick={() => nav(`/project/${p.id}`)}>
        <h2 className="proj-name">{p.name}</h2>
        {p.description && !compact && <p className="proj-desc">{p.description}</p>}
        <p className="proj-lead">
          {p.lead ? <><span className="proj-lead-role">Lead</span> {p.lead}</> : <span className="sub">No lead set</span>}
        </p>
      </button>

      <div className="proj-lines">
        {lines.length === 0
          ? <button className="proj-chip is-add" onClick={() => nav(`/project/${p.id}/setup`)}>＋ Add a line</button>
          : lines.map(l => (
              <button key={l.id} className="proj-chip" onClick={() => nav(`/project/${p.id}/line/${l.id}`)}
                title={l.owner ? `${l.name} · ${l.owner}` : l.name}>
                <span className="proj-chip-k">{l.key}</span>
                {l.owner && <span className="proj-chip-o">{l.owner.split(' ')[0]}</span>}
              </button>
            ))}
      </div>

      <footer className="proj-foot">
        <span className="sub">
          {lines.length} line{lines.length === 1 ? '' : 's'}
          {lines.length > 0 && ` · ${withOwner} owned`}
        </span>
        <span className="proj-foot-actions">
          <button className="btn btn-ghost" onClick={() => nav(`/project/${p.id}/setup`)}>Lines &amp; people</button>
          <button className="btn btn-primary" onClick={() => nav(`/project/${p.id}`)}>Open</button>
        </span>
      </footer>
    </article>
  );
}
