import type { ID } from '../types';
import { nav } from '../state/useRoute';

const TABS = [
  { name: 'capture', label: 'Capture', icon: '✎' },
  { name: 'analyse', label: 'Analyse', icon: '▤' },
  { name: 'present', label: 'Present', icon: '◨' },
] as const;

/** The floor's three modes. Capture is home base; Analyse and Present read the
 *  same data. Fixed to the bottom, thumb-reachable. */
export function TabBar({ active, wsId }: { active: string; wsId: ID }) {
  return (
    <nav className="tabbar">
      {TABS.map(t => (
        <button
          key={t.name}
          className={'tab' + (active === t.name ? ' on' : '')}
          onClick={() => nav(`/w/${wsId}/${t.name}`)}
        >
          <span className="tab-ic" aria-hidden>{t.icon}</span>
          <span className="tab-lbl">{t.label}</span>
        </button>
      ))}
    </nav>
  );
}
