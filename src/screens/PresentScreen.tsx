import type { Route } from '../state/useRoute';
import { nav } from '../state/useRoute';

// The calm boardroom view lands with the Pareto. Full-bleed, chrome-free.
export function PresentScreen({ route }: { route: Route }) {
  return (
    <div className="present present-empty">
      <button className="present-exit" onClick={() => nav(`/w/${route.wsId}/analyse`)} aria-label="Exit present">✕</button>
      <div className="present-center">
        <div className="mark">Present</div>
        <div className="sub">A calm, full-screen view for the senior team. Building this with the Pareto.</div>
      </div>
    </div>
  );
}
