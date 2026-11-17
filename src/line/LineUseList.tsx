import { useMemo, useState } from 'react';

export interface SavedLineUse {
  key: string; id: string; tool: string; toolKey: string; name?: string; place: string; product?: string;
  href?: string; at?: number; finding?: string; tone?: string; newHref?: string;
}

/** A saved use is the door, not an expandable preview of the tool definition. */
export function LineUseList({ uses, extra = [], searchable = false }: { uses: SavedLineUse[]; extra?: SavedLineUse[]; searchable?: boolean }) {
  const [query, setQuery] = useState('');
  const [tool, setTool] = useState('');
  const all = useMemo(() => [...uses, ...extra].sort((a, b) => (b.at ?? 0) - (a.at ?? 0)), [uses, extra]);
  const tools = [...new Map(all.map(s => [s.toolKey, s.tool])).entries()].sort((a, b) => a[1].localeCompare(b[1]));
  const matching = all.filter(s => (!tool || s.toolKey === tool) && [s.name, s.tool, s.place, s.product].join(' ').toLowerCase().includes(query.trim().toLowerCase()));
  return <div className="line-uses" data-line-uses>
    {searchable && all.length > 0 && <div className="line-uses-filters" role="search" aria-label="Saved tool uses">
      <input type="search" className="text-input" aria-label="Find a saved use" placeholder="Find by name, machine or tool" value={query} onChange={e => setQuery(e.target.value)} />
      <select className="text-input" aria-label="Filter saved uses by tool" value={tool} onChange={e => setTool(e.target.value)}><option value="">All tools</option>{tools.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
    </div>}
    {all.length === 0 ? <p className="sub">No saved tool uses yet. Start a tool on this line; each use will appear here.</p>
      : matching.length === 0 ? <p role="status" className="sub">No saved uses match. Try another name or machine.</p>
      : <ul className="line-use-rows">{matching.map(s => <li key={s.key} data-use={s.key}>
        <a className="line-use-open" href={`#${s.href}`}>
          <span className="line-use-kind">{s.tool}</span>
          <b>{s.name || 'Untitled use'}</b>
          <span className="line-use-meta">{[s.place, s.product, s.at ? new Date(s.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''].filter(Boolean).join(' · ')}</span>
          {s.finding && <span className={'line-use-finding ie-tone is-' + (s.tone || 'n')}>{s.finding}</span>}
          <span className="line-use-go" aria-hidden>›</span>
        </a>
      </li>)}</ul>}
  </div>;
}
