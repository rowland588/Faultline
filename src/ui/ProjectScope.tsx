import type { ProjectScope } from '../lib/inProject';
/** WHOSE, INSIDE A PROJECT (docs/PROJECTS.md, P2) — the project's own first;
 *  everything on its lines (the line's own work, other projects') and every
 *  line one tap away. Shared by every tool's list. */
export function ProjectScopeChips({ name, lines, scope, onScope }: { name?: string; lines: number; scope: ProjectScope; onScope: (s: ProjectScope) => void }) {
  const chip = (s: ProjectScope, label: string) => (
    <button type="button" className={'chip' + (scope === s ? ' on' : '')} aria-pressed={scope === s} onClick={() => onScope(s)}>{label}</button>
  );
  return (
    <div className="chip-row qsl-f ip-scope" role="group" aria-label="Whose">
      {chip('project', name ?? 'This project')}
      {lines > 0 && chip('lines', lines === 1 ? 'Everything on its line' : 'Everything on its lines')}
      {chip('all', 'All lines')}
    </div>
  );
}
