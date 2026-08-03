import { EmptyState } from '../ui/EmptyState';

// Real capture (timed check sheet + evidence) lands in the next step.
export function CaptureScreen() {
  return (
    <div className="wrap">
      <EmptyState title="Capture" icon="✎">
        Tap what you see, put a time to it, snap the proof. Building this next.
      </EmptyState>
    </div>
  );
}
