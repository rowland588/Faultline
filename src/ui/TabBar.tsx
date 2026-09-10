import type { ID } from '../types';
import { nav } from '../state/useRoute';

const TABS = [
  { name: 'capture', label: 'Capture', icon: '✎', to: 'capture' },
  { name: 'analyse', label: 'Analyse', icon: '▤', to: 'analyse' },
  // Lands on the SNAGS, not on the films. Tapping a tab called Snags and
  // getting a list of videos is how you end up back inside a walk-through when
  // all you wanted was the thing you just wrote down.
  { name: 'snags',   label: 'Snags',   icon: '⚑', to: 'snaglist' },
  { name: 'meeting', label: 'Meeting', icon: '◨', to: 'meeting' },
] as const;

// The snag list is a walk → segments → assets → snags; any of those screens
// should keep the Snags tab lit, so the whole activity reads as one place.
const SNAG_FAMILY = new Set(['snags', 'segment', 'asset', 'snaglist', 'walk', 'line']);

/** The floor's modes. Capture logs losses; Analyse and Present read that data;
 *  Snags is the video-walk fault list — a peer activity, usable on its own.
 *  Fixed to the bottom, thumb-reachable. */
export function TabBar({ active, wsId }: { active: string; wsId: ID }) {
  // Present is the fullscreen mode of Analyse now; the tab slot belongs to the meeting.
  const activeTab = SNAG_FAMILY.has(active) ? 'snags' : active === 'present' ? 'meeting' : active;
  return (
    <nav className="tabbar">
      {TABS.map(t => (
        <button
          key={t.name}
          data-tour={`tab-${t.name}`}
          className={'tab' + (activeTab === t.name ? ' on' : '')}
          onClick={() => nav(`/w/${wsId}/${t.to}`)}
        >
          <span className="tab-ic" aria-hidden>{t.icon}</span>
          <span className="tab-lbl">{t.label}</span>
        </button>
      ))}
    </nav>
  );
}
