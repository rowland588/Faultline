/* Shared chrome for stage-gate gate pages (STAGEGATE-AESTHETIC D2) — Plan switcher once, then the page body. */
import type { ReactNode } from 'react';
import type { GateKey } from './rail';
import { PlanTabs } from './PlanTabs';

export function GatePageShell({ projectId, on, children }: { projectId: string; on: GateKey; children?: ReactNode }) {
  return (
    <>
      <PlanTabs projectId={projectId} on={on} />
      {children}
    </>
  );
}
