/* A TOOL'S CARD (docs/TOOLS-SHOWCASE.md, TG1) — its picture, its name, what it is for, and whether it
 * has been used. One component for the Tools page and, later, a line's and a project's Tools and
 * Home's "one to try" (CLAUDE.md rule 5: never four lookalikes). The picture is the real tool taken
 * from the real app (public/tools/<key>.png, scripts/tool-pictures.mjs); a tool whose picture is
 * not there yet draws its icon on a quiet tile, so the card is never broken. */
import { useState } from 'react';
import { Icon, type IconName } from './Icon';
import type { AppTool } from '../catalogue/registry';

export function ToolPicture({ tool, big }: { tool: Pick<AppTool, 'key' | 'label' | 'icon'>; big?: boolean }) {
  const [missing, setMissing] = useState(false);
  return (
    <span className={'tc-pic' + (big ? ' is-big' : '')}>
      {missing
        ? <span className="tc-pic-none" aria-hidden><Icon name={tool.icon as IconName} size={big ? 48 : 34} /></span>
        : <img src={`/tools/${tool.key}.png`} alt="" loading="lazy" decoding="async" onError={() => setMissing(true)} />}
    </span>
  );
}

export function ToolCard({ tool, said, onOpen, onList }: { tool: AppTool; said?: string; onOpen: () => void; onList?: () => void }) {
  return (
    <div className="tc-card" data-tool={tool.key}>
      <button type="button" className="tc-main" aria-label={`${tool.label} — what it is for`} onClick={onOpen}>
        <ToolPicture tool={tool} />
        <span className="tc-body">
          <b className="tc-name">{tool.label}</b>
          <span className="tc-says">{tool.says}</span>
          {said && <span className="tc-used">{said}</span>}
        </span>
      </button>
      {onList && <button type="button" className="tc-open" aria-label={`Open ${tool.label}`} onClick={onList}>Open ›</button>}
    </div>
  );
}
