/* A TOOL'S CARD (docs/TOOLS-SHOWCASE.md, TG1) — its picture, its name, what it is for, and whether it
 * has been used. One component for the Tools page and, later, a line's and a project's Tools and
 * Home's "one to try" (CLAUDE.md rule 5: never four lookalikes). The picture is the real tool taken
 * from the real app (public/tools/<key>.png, scripts/tool-pictures.mjs); a tool whose picture is
 * not there yet draws its icon on a quiet tile, so the card is never broken. */
import { useState } from 'react';
import { Icon, type IconName } from './Icon';
import type { AppTool } from '../catalogue/registry';
import type { Kind } from '../catalogue/types';

/** One word per kind — the head of the card, beside catalogue status (docs/STRUCTURE.md §5.7). */
const KIND_HEAD: Record<Kind, string> = { study: 'Study', standard: 'Standard', log: 'Log', register: 'Register', document: 'Document', board: 'Board' };

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

export function ToolCard({ tool, statusWord, statusTone, said, holds, onOpen, onList }: {
  tool: AppTool;
  /** Catalogue status in words — always beside the colour (CLAUDE.md). */
  statusWord?: string;
  /** Matches `.et-st.is-*` — g built, w partly / planned, n not built yet. */
  statusTone?: 'g' | 'w' | 'n';
  said?: string;
  /** What it holds — "26 ways of using it built · 1 to build" (catalogue/counts holdings). */
  holds?: string;
  onOpen: () => void;
  onList?: () => void;
}) {
  const tone = statusTone ?? 'n';
  return (
    <div className="tc-card" data-tool={tool.key} data-status-tone={tone}>
      <div className="tc-head">
        <span className="tc-kind-row">
          <span className="tc-kind">{KIND_HEAD[tool.kind]}</span>
          <span className="tc-catid">{tool.id}</span>
        </span>
        <div className="tc-head-mid">
          {statusWord && <span className={`et-st is-${tone}`}>{statusWord}</span>}
          {said && <span className="tc-used">{said}</span>}
        </div>
        {onList && <button type="button" className="tc-open" aria-label={`Open ${tool.label} list`} onClick={onList}>Open ›</button>}
      </div>
      <button type="button" className="tc-main" aria-label={`${tool.label} — what it is for`} onClick={onOpen}>
        <ToolPicture tool={tool} />
        <span className="tc-body">
          <b className="tc-name">{tool.label}</b>
          <span className="tc-says">{tool.says}</span>
          {holds && <span className="tc-holds">{holds}</span>}
        </span>
      </button>
    </div>
  );
}
