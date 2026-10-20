/* A LINK ON THE SCREEN — picked from the earlier log's entries by their
 * words, said by them, and followed back (lib/flow/links; docs/VIEWS.md).
 * A struck entry is never offered for a new link; one already linked keeps
 * its place in the list and says it is struck, so nothing is silently lost. */
import type { Backlink, LinkChoice, LinkRead } from '../../lib/flow/links';
import { linksSaid } from '../../lib/flow/links';

/** Pick the entry a link names. */
export function LinkSelect({ choices, value, label, disabled, onChange }: {
  choices: readonly LinkChoice[]; value: unknown; label: string; disabled?: boolean; onChange: (id: string) => void;
}) {
  const v = typeof value === 'string' ? value : '';
  const live = choices.filter(c => !c.struck);
  const held = v ? choices.find(c => c.id === v) : undefined;
  return (
    <select className="text-input fw-in" aria-label={label} disabled={disabled} value={v} onChange={e => onChange(e.target.value)}>
      <option value="">{live.length ? '—' : 'Nothing logged to link to yet'}</option>
      {live.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
      {held?.struck && <option value={held.id}>{held.title} (struck)</option>}
      {v && !held && <option value={v}>An entry no longer on the log</option>}
    </select>
  );
}

/** A link in words, as the entry it names stands now. */
export function LinkWords({ read }: { read?: LinkRead }) {
  if (!read) return <>—</>;
  return (
    <span className={'fw-link' + (read.struck ? ' is-struck' : read.gone ? ' is-gone' : '')} data-link={read.gone ? 'gone' : read.struck ? 'struck' : 'live'}>
      {read.title}{read.struck ? ' (struck)' : ''}
    </span>
  );
}

/** What names an entry, log by log, each named. */
export function Backlinks({ links }: { links: readonly Backlink[] }) {
  if (!links.length) return <span className="sub">—</span>;
  return (
    <span className="fw-backlinks" title={links.map(l => l.title).join(' · ')}>
      <b>{linksSaid(links)}</b>
      <span className="sub"> — {links.map(l => `“${l.title}”`).join(', ')}</span>
    </span>
  );
}
