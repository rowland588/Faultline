/* A METHOD BOARD'S STEP, FOLDED (11 November — docs/DESIGN.md, the method boards made calm). Each board (DMAIC's phases, the A3's
 * blocks, PDCA's quarters, the Kaizen event's days, the Kata's cells and experiments, the five focusing steps, the 8D's parts) opens
 * with the step in hand open and every other step one line in ui/Fold — its state in words — opening to everything it held.
 * Nothing is taken away. The fold is drawn afresh once the answers have been read (they arrive after the first draw), so the open
 * one is the step in hand, and never snaps shut under somebody writing in it after that. Ids `method-board-<method>-<part>`;
 * scripts open them as a person does (scripts/lib/methodFolds.mjs openBoardFolds). */
import type { ReactNode } from 'react';
import { Fold } from '../../../ui/Fold';

const slug = (w: string) => w.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const boardFoldId = (method: string, part: string): string => `method-board-${method}-${slug(part)}`;

export function BoardFold({ method, part, title, says, here, ready, children }: {
  method: string;
  /** The step's stable name — its id on the device. */
  part: string;
  title: ReactNode;
  /** Its state in one line, shown open or shut. */
  says?: ReactNode;
  /** The step in hand: open the first time, on a phone too. */
  here: boolean;
  /** The answers have been read — until then the step in hand is not known. */
  ready?: boolean | undefined;
  children: ReactNode;
}) {
  const id = boardFoldId(method, part);
  return (
    <Fold key={`${id}:${ready === false ? 'reading' : 'read'}`} id={id} start={here} need={here}
      title={<span className="mb-t">{title}</span>} {...(says != null ? { says } : {})}>
      {children}
    </Fold>
  );
}
