import type { DrillPath } from '../types';
import { DIM_LABEL } from '../engine/types';

/** All ▸ Brillopack ▸ Changeover — the path is the back mechanism; tap a crumb
 *  to jump back up to that depth. */
export function DrillBreadcrumb({ path, onJump }: {
  path: DrillPath; onJump: (depth: number) => void;
}) {
  return (
    <div className="crumbs">
      <button className={'crumb' + (path.length === 0 ? ' on' : '')} data-tour="crumb-all" onClick={() => onJump(0)}>All</button>
      {path.map((s, i) => (
        <span key={i} className="crumb-wrap">
          <span className="crumb-sep" aria-hidden>▸</span>
          <button className={'crumb' + (i === path.length - 1 ? ' on' : '')} onClick={() => onJump(i + 1)}
            title={DIM_LABEL[s.dimension]}>
            {s.value}
          </button>
        </span>
      ))}
    </div>
  );
}
