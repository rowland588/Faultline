/* A DATE THAT ASKS WHY WHEN IT SLIPS — for the dates that are not a stage's:
 * the handover now expected, a machine due on site, a material due, a
 * program's test date.
 *
 * Rowland: "do 1 to 3" — the first, that these moved with no reason asked,
 * and the handover moving is the slip a client asks about first. Earlier: the
 * same; later: asked why (the plan draws it, the PDF prints it), or "Just
 * change the date — no reason". One Undo puts the date and the reason back.
 */
import { useState } from 'react';
import { movedLater } from '../lib/story';
import { niceDay } from '../lib/weeks';
import { WhyMoved, recordThingMove } from './WhyMoved';
import { offerUndo } from './Undo';

export function DateWhy({ value, onChange, projectId, storyKey, what, className, ariaLabel, min }: {
  value?: string;
  /** Write the date. Called with the old value again on Undo. */
  onChange: (v: string | undefined) => void | Promise<void>;
  projectId: string;
  /** Where its reasons are filed — lib/story keyOf. */
  storyKey: string;
  /** "Handover", "Wrapper due on site" — for the Undo line. */
  what: string;
  className?: string;
  ariaLabel?: string;
  min?: string;
}) {
  const [pending, setPending] = useState<string | null>(null);
  return (
    <>
      <input type="date" className={className} aria-label={ariaLabel} min={min}
        value={pending ?? value ?? ''}
        onChange={e => {
          const v = e.target.value || undefined;
          if (v && movedLater(value, v)) { setPending(v); return; }
          setPending(null);
          void onChange(v);
        }} />
      {pending && value && (
        <span className="date-why">
          <WhyMoved from={value} to={pending} allowFix={false}
            onCancel={() => setPending(null)}
            onSkip={() => { void onChange(pending); setPending(null); }}
            onSave={a => void (async () => {
              const was = value, to = pending;
              await onChange(to);
              const back = await recordThingMove(projectId, storyKey, was, to, a);
              setPending(null);
              offerUndo(`${what} moved to ${niceDay(to)} — reason kept`, async () => { await onChange(was); await back(); });
            })()} />
        </span>
      )}
    </>
  );
}
