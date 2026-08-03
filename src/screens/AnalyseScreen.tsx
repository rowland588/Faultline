import type { Route } from '../state/useRoute';
import { EmptyState } from '../ui/EmptyState';

// The question-first, drillable Pareto lands after Capture.
export function AnalyseScreen({ route: _route }: { route: Route }) {
  return (
    <div className="wrap">
      <EmptyState title="Analyse" icon="▤">
        The Pareto you can walk into — count vs time, symptom to proof. Building this after capture.
      </EmptyState>
    </div>
  );
}
