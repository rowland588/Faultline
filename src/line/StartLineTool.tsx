import { useState } from 'react';
import { APP_TOOLS } from '../catalogue/registry';
import { nav } from '../state/useRoute';
import { Sheet, SheetRow } from '../ui/Sheet';

export function StartLineTool({ line, open, onClose }: { line: string; open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const tools = APP_TOOLS.filter(t => t.onLine && [t.label, t.onLine].join(' ').toLowerCase().includes(query.trim().toLowerCase()));
  return <Sheet open={open} onClose={onClose} title="Start a tool">
    <div className="start-line-tool-search"><input className="text-input" type="search" value={query} onChange={e => setQuery(e.target.value)} aria-label="Find a tool to start" placeholder="Find a tool" /></div>
    {tools.map(t => <SheetRow key={t.key} label={t.label} hint={typeof t.onLine === 'string' ? t.onLine : undefined} onClick={() => { onClose(); nav(`${t.to}?line=${encodeURIComponent(line)}&add=1`); }} />)}
    {tools.length === 0 && <p className="sub app-update-message" role="status">No tools match that name.</p>}
  </Sheet>;
}
