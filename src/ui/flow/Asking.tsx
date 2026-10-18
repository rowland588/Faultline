/* A STEP ASKING FOR A TOOL'S STUDY (docs/PLATFORM-STATUS.md, next action 3):
 * a method's step done with one of the app's tools opens that tool's own New
 * on the job's line (ui/flow/RunParts ToolAnswer). The step is remembered for
 * this tab while the person is in the tool, said on the tool's New in words —
 * with a way to say it is not for that step — and the study made there is
 * attached to the step by the same operation "Use this" runs (recordStep),
 * under the person's own access to the project. Nothing is attached that the
 * New did not say it would be. */
import { useCallback, useState } from 'react';
import { useAccess } from '../../cloud/access';
import { recordStep, type StepRef } from '../../lib/flow/operations';
import { useOpContext } from '../../lib/flow/useFlow';
import { nav } from '../../state/useRoute';
import { offerUndo } from '../Undo';

export interface StepAsk {
  ref: StepRef;
  /** The app's tool the step is done with (lib/flow/components). */
  tool: string;
  /** Said on the tool's New: the step's title and its project's name. */
  step: string;
  project: string;
  at: number;
}

const KEY = 'fl.flow.asking';
/** Long enough to time a changeover in the tool; a tab left open overnight forgets it. */
const KEEP_MS = 4 * 60 * 60 * 1000;

export function askFor(a: Omit<StepAsk, 'at'>): void {
  try { sessionStorage.setItem(KEY, JSON.stringify({ ...a, at: Date.now() })); } catch { /* private window: the study is offered on the step instead */ }
}

export function askingFor(tool: string): StepAsk | undefined {
  try {
    const a = JSON.parse(sessionStorage.getItem(KEY) ?? 'null') as StepAsk | null;
    if (!a || a.tool !== tool) return undefined;
    if (Date.now() - a.at > KEEP_MS) { sessionStorage.removeItem(KEY); return undefined; }
    return a;
  } catch { return undefined; }
}

export function forgetAsk(): void {
  try { sessionStorage.removeItem(KEY); } catch { /* nothing kept */ }
}

export interface Asking {
  ask?: StepAsk;
  /** The step answered here, said until the person leaves. */
  answered?: StepAsk;
  attach: (studyId: string) => Promise<void>;
  notFor: () => void;
}

/** The step asking for this tool's study, if any — and attach(studyId) to answer it. */
export function useAsking(tool: string): Asking {
  const [ask, setAsk] = useState(() => askingFor(tool));
  const [answered, setAnswered] = useState<StepAsk>();
  const can = useAccess(ask?.ref.projectId ?? '');
  const ctx = useOpContext(can.level);
  const attach = useCallback(async (studyId: string) => {
    if (!ask) return;
    forgetAsk(); setAsk(undefined);
    const r = await recordStep(ctx, ask.ref, { studyId });
    if (!r.ok) { console.warn('the study was not attached to its step:', r.why); return; }
    setAnswered(ask);
    /* said wherever the person lands next — the study's own page, usually —
       and taken back off the step with one tap */
    offerUndo(`Attached to “${ask.step}” on ${ask.project}`, async () => { await recordStep(ctx, ask.ref, { studyId: undefined }); });
  }, [ask, ctx]);
  const notFor = useCallback(() => { forgetAsk(); setAsk(undefined); }, []);
  return { ask, answered, attach, notFor };
}

/** Said on the tool's New: which step this study answers, and a way out of
 *  it. On a study already made (`onUse`), it is attached only when asked. */
export function AskingNote({ asking, onUse }: { asking: Asking; onUse?: () => void }) {
  const { ask, answered } = asking;
  if (answered) {
    return (
      <div className="fw-asking is-done" role="status">
        <p>Attached to “{answered.step}” on <b>{answered.project}</b>.</p>
        <button type="button" className="btn btn-sm" onClick={() => nav(`/project/${answered.ref.projectId}`)}>Back to {answered.project} ›</button>
      </div>
    );
  }
  if (!ask) return null;
  return (
    <div className="fw-asking" role="note">
      <p>For “{ask.step}” on <b>{ask.project}</b>{onUse ? '.' : ' — it is attached to that step once it is made.'}</p>
      {onUse && <button type="button" className="btn btn-sm" onClick={onUse}>Use this one for that step</button>}
      <button type="button" className="btn btn-ghost btn-sm" onClick={asking.notFor}>Not for that step</button>
    </div>
  );
}
